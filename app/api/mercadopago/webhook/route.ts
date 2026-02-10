import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateFinancialBreakdown } from '@/lib/utils/pricing'

/**
 * Webhook handler para recibir notificaciones de Mercado Pago
 * 
 * Mercado Pago enviará notificaciones cuando:
 * - Se crea un pago
 * - Se actualiza el estado de un pago
 * - Se procesa un reembolso
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Mercado Pago puede enviar diferentes tipos de notificaciones
    const { type, data } = body

    console.log('📥 Webhook recibido de Mercado Pago:', { type, data })

    // Si es una notificación de pago
    if (type === 'payment') {
      const paymentId = data?.id
      
      if (!paymentId) {
        return NextResponse.json({ error: 'Payment ID no encontrado' }, { status: 400 })
      }

      // Obtener información del pago desde Mercado Pago
      // Nota: En producción, deberías validar la firma del webhook para seguridad
      const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
      
      if (!mpAccessToken) {
        console.error('⚠️ MERCADOPAGO_ACCESS_TOKEN no configurado')
        return NextResponse.json({ error: 'Configuración faltante' }, { status: 500 })
      }

      // Consultar el pago en Mercado Pago
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!paymentResponse.ok) {
        console.error('Error consultando pago en Mercado Pago:', await paymentResponse.text())
        return NextResponse.json({ error: 'Error consultando pago' }, { status: 500 })
      }

      const payment = await paymentResponse.json()
      
      // Obtener external_reference (que es nuestro purchase_id)
      const purchaseId = payment.external_reference

      if (!purchaseId) {
        console.error('⚠️ External reference no encontrado en el pago')
        return NextResponse.json({ error: 'Purchase ID no encontrado' }, { status: 400 })
      }

      // Actualizar estado de la compra en nuestra base de datos
      const supabase = await createClient()
      
      // Mapear estados de Mercado Pago a nuestros estados
      let paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded' = 'pending'
      
      if (payment.status === 'approved') {
        paymentStatus = 'completed'
      } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
        paymentStatus = 'failed'
      } else if (payment.status === 'refunded' || payment.status === 'charged_back') {
        paymentStatus = 'refunded'
      }

      // Obtener la compra actual para calcular gastos operativos y preservar tickets_data
      const { data: currentPurchase, error: fetchError } = await supabase
        .from('purchases')
        .select('base_amount, created_at, payment_provider_data')
        .eq('id', purchaseId)
        .single()

      if (fetchError || !currentPurchase) {
        console.error('Error obteniendo compra:', fetchError)
        return NextResponse.json({ error: 'Error obteniendo compra' }, { status: 500 })
      }

      // Preservar tickets_data antes de actualizar payment_provider_data
      const ticketsData = (currentPurchase.payment_provider_data as any)?.tickets_data

      // Calcular desglose financiero completo según Manual V1
      const purchaseDate = new Date(currentPurchase.created_at)
      const financialBreakdown = calculateFinancialBreakdown(
        Number(currentPurchase.base_amount),
        purchaseDate
      )

      // Extraer información adicional del pago de Mercado Pago
      // Nota: En producción, estos campos pueden variar según la configuración de MP
      const mpNetAmount = payment.transaction_details?.net_received_amount || financialBreakdown.netAmount
      const mpFee = payment.fee_details?.reduce((sum: number, fee: any) => sum + (fee.amount || 0), 0) || 0

      // Preparar actualización de la compra
      // Preservar tickets_data cuando actualizamos payment_provider_data con datos de MP
      const updateData: any = {
        payment_status: paymentStatus,
        payment_provider_id: paymentId.toString(),
        payment_provider_data: {
          ...payment,
          tickets_data: ticketsData, // Preservar tickets_data
        },
        updated_at: new Date().toISOString(),
      }

      // Si el pago fue aprobado, actualizar campos financieros y settlement_status
      if (paymentStatus === 'completed') {
        updateData.settlement_status = 'ready' // Listo para transferir después de 240 horas
        updateData.net_amount = financialBreakdown.netAmount
        updateData.operating_costs = financialBreakdown.operatingCosts.total
        updateData.mercadopago_commission = financialBreakdown.operatingCosts.mercadopagoCommission
        updateData.iva_commission = financialBreakdown.operatingCosts.ivaCommission
        updateData.iibb_retention = financialBreakdown.operatingCosts.iibbRetention
        updateData.net_margin = financialBreakdown.netMargin
        updateData.money_release_date = financialBreakdown.moneyReleaseDate.toISOString()
        
        // Si Mercado Pago proporciona información adicional, la guardamos
        if (mpNetAmount && mpNetAmount !== financialBreakdown.netAmount) {
          console.log(`⚠️ Diferencia en net_amount: Calculado: ${financialBreakdown.netAmount}, MP: ${mpNetAmount}`)
        }
      }

      // Actualizar la compra
      const { error: updateError } = await supabase
        .from('purchases')
        .update(updateData)
        .eq('id', purchaseId)

      if (updateError) {
        console.error('Error actualizando compra:', updateError)
        return NextResponse.json({ error: 'Error actualizando compra' }, { status: 500 })
      }

      console.log(`✅ Compra ${purchaseId} actualizada a estado: ${paymentStatus}`)
      if (paymentStatus === 'completed') {
        console.log(`💰 Gastos operativos: $${financialBreakdown.operatingCosts.total.toFixed(2)}`)
        console.log(`💵 Margen neto: $${financialBreakdown.netMargin.toFixed(2)}`)
        console.log(`📅 Fecha de liberación: ${financialBreakdown.moneyReleaseDate.toISOString()}`)
      }

      // Actualizar estado de la transferencia asociada según el resultado del pago
      // Buscar la transferencia asociada a esta compra
      const { data: transfer, error: transferFetchError } = await supabase
        .from('transfers')
        .select('id, status')
        .eq('purchase_id', purchaseId)
        .maybeSingle()

      if (transferFetchError) {
        console.warn('⚠️ Error obteniendo transferencia (no crítico):', transferFetchError)
      } else if (transfer) {
        // Actualizar estado de la transferencia según el resultado del pago
        let transferStatus: 'pending' | 'completed' | 'failed' | 'cancelled' = transfer.status

        if (paymentStatus === 'completed') {
          // Si el pago se completó, la transferencia sigue en 'pending'
          // hasta que se procese manualmente después de 240 horas
          // No cambiamos el estado aquí, solo nos aseguramos de que esté en 'pending'
          if (transfer.status !== 'pending' && transfer.status !== 'completed') {
            transferStatus = 'pending'
          }
        } else if (paymentStatus === 'failed') {
          // Si el pago falló, marcar la transferencia como 'failed'
          transferStatus = 'failed'
        } else if (paymentStatus === 'refunded') {
          // Si el pago fue reembolsado, marcar la transferencia como 'cancelled'
          transferStatus = 'cancelled'
        }

        // Solo actualizar si el estado cambió
        if (transferStatus !== transfer.status) {
          const { error: transferUpdateError } = await supabase
            .from('transfers')
            .update({
              status: transferStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('id', transfer.id)

          if (transferUpdateError) {
            console.warn('⚠️ Error actualizando transferencia (no crítico):', transferUpdateError)
          } else {
            console.log(`✅ Transferencia ${transfer.id} actualizada a estado: ${transferStatus}`)
          }
        }
      } else {
        console.log(`ℹ️ No se encontró transferencia para la compra ${purchaseId} (puede ser normal si la transferencia aún no se creó)`)
      }

      // Si el pago fue aprobado, crear los tickets y enviar email
      if (paymentStatus === 'completed') {
        // Verificar si ya existen tickets (para evitar duplicados)
        const { data: existingTickets } = await supabase
          .from('tickets')
          .select('id')
          .eq('purchase_id', purchaseId)
          .limit(1)

        // Solo crear tickets si no existen
        if (!existingTickets || existingTickets.length === 0) {
          // Obtener información de la compra para crear tickets
          const { data: purchaseData, error: purchaseDataError } = await supabase
            .from('purchases')
            .select(`
              id,
              event_id,
              user_id,
              guest_email,
              guest_name,
              event:events(
                id,
                producer_id
              )
            `)
            .eq('id', purchaseId)
            .single()

          if (purchaseDataError || !purchaseData) {
            console.error('Error obteniendo datos de compra para crear tickets:', purchaseDataError)
          } else {
            // Obtener información de tickets comprados desde payment_provider_data
            // ticketsData ya está disponible desde arriba (línea 89)
            if (!ticketsData || !Array.isArray(ticketsData) || ticketsData.length === 0) {
              console.error('No se encontraron datos de tickets en la compra')
            } else {
              const ticketsToInsert = []

              // Crear tickets según los datos guardados
              for (const ticketData of ticketsData) {
                // Obtener información del ticket type
                const { data: ticketType, error: ticketTypeError } = await supabase
                  .from('ticket_types')
                  .select('*')
                  .eq('id', ticketData.ticketTypeId)
                  .single()

                if (ticketTypeError || !ticketType) {
                  console.error(`Error obteniendo tipo de ticket ${ticketData.ticketTypeId}:`, ticketTypeError)
                  continue
                }

                // Verificar disponibilidad
                const available = ticketType.quantity_available - ticketType.quantity_sold
                if (available < ticketData.quantity) {
                  console.error(`No hay suficientes tickets disponibles para ${ticketType.name}`)
                  continue
                }

                // Crear un ticket por cada cantidad
                for (let i = 0; i < ticketData.quantity; i++) {
                  const ticketId = crypto.randomUUID()
                  
                  // Generar ticket_number
                  const eventPrefix = purchaseData.event_id.substring(0, 8).toUpperCase()
                  const ticketNumber = `EVT-${eventPrefix}-${String(Date.now()).slice(-6)}-${String(i + 1).padStart(3, '0')}`
                  
                  // Generar QR code
                  const qrCode = `SYN-${ticketId.substring(0, 8).toUpperCase()}-${crypto.randomUUID().substring(0, 8).toUpperCase()}`
                  
                  // Generar QR hash
                  const qrHashBuffer = await crypto.subtle.digest(
                    'SHA-256',
                    new TextEncoder().encode(`${ticketId}${qrCode}${Date.now()}`)
                  )
                  const qrHashArray = Array.from(new Uint8Array(qrHashBuffer))
                  const qrHash = qrHashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

                  ticketsToInsert.push({
                    purchase_id: purchaseId,
                    ticket_type_id: ticketData.ticketTypeId,
                    event_id: purchaseData.event_id,
                    ticket_number: ticketNumber,
                    qr_code: qrCode,
                    qr_hash: qrHash,
                    status: 'valid',
                  })
                }

                // Actualizar cantidad vendida del ticket type
                await supabase
                  .from('ticket_types')
                  .update({ quantity_sold: ticketType.quantity_sold + ticketData.quantity })
                  .eq('id', ticketType.id)
              }

              // Insertar todos los tickets
              if (ticketsToInsert.length > 0) {
                const { error: ticketsInsertError } = await supabase
                  .from('tickets')
                  .insert(ticketsToInsert)

                if (ticketsInsertError) {
                  console.error('Error creando tickets:', ticketsInsertError)
                } else {
                  console.log(`✅ ${ticketsToInsert.length} tickets creados para compra ${purchaseId}`)
                }
              }
            }
          }
        }

        // Verificar si ya se envió el email (esto se puede mejorar con un flag)
        const { data: purchase } = await supabase
          .from('purchases')
          .select('user_id, guest_email, guest_name')
          .eq('id', purchaseId)
          .single()

        if (purchase) {
          // Enviar email de forma asíncrona (no bloquea la respuesta)
          fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-tickets-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              purchaseId,
              email: purchase.guest_email || undefined,
              userName: purchase.guest_name || undefined,
            }),
          }).catch((err) => {
            console.warn('Error enviando email (no crítico):', err)
          })
        }
      } else if (paymentStatus === 'failed') {
        // Si el pago falló, NO deberían existir tickets (se crean solo cuando paymentStatus === 'completed')
        // Esta verificación es solo para limpiar tickets legacy de compras anteriores al fix
        const { data: existingTickets } = await supabase
          .from('tickets')
          .select('id, ticket_type_id')
          .eq('purchase_id', purchaseId)
          .limit(1)

        if (existingTickets && existingTickets.length > 0) {
          console.warn(`⚠️ Se encontraron tickets para compra fallida ${purchaseId} (legacy - limpiando)`)
          // Eliminar tickets legacy (no deberían existir con el nuevo flujo)
          await supabase
            .from('tickets')
            .delete()
            .eq('purchase_id', purchaseId)
        }
      }

      return NextResponse.json({ success: true, purchaseId, status: paymentStatus })
    }

    // Si es otro tipo de notificación, solo confirmamos recepción
    return NextResponse.json({ success: true, message: 'Notificación recibida' })
  } catch (error: any) {
    console.error('Error procesando webhook de Mercado Pago:', error)
    return NextResponse.json(
      { error: error.message || 'Error procesando webhook' },
      { status: 500 }
    )
  }
}

// GET para verificación de webhook (Mercado Pago puede hacer GET requests)
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Webhook de Mercado Pago activo',
    timestamp: new Date().toISOString(),
  })
}
