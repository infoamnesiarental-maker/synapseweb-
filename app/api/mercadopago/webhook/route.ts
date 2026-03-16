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
    // Mercado Pago puede enviar webhooks de dos formas:
    // 1. Como JSON en el body: { type: 'payment', data: { id: '...' } }
    // 2. Como query parameters: ?data.id=...&type=payment
    let type: string | undefined
    let data: any | undefined
    let paymentId: string | undefined
    
    // Leer el body como texto primero (solo se puede leer una vez)
    const bodyText = await request.text()
    
    // Intentar parsear como JSON
    try {
      const body = JSON.parse(bodyText)
      type = body?.type
      data = body?.data
      paymentId = data?.id?.toString() || body?.id?.toString() || body?.payment_id?.toString()
    } catch (error) {
      // Si no es JSON válido, el body puede estar vacío o en otro formato
      console.log('⚠️ Body no es JSON válido, intentando leer de query params')
    }
    
    // Si no tenemos payment_id del body, intentar de query params
    if (!paymentId) {
      const { searchParams } = new URL(request.url)
      type = type || searchParams.get('type') || undefined
      paymentId = searchParams.get('data.id') || searchParams.get('id') || undefined
      if (paymentId && !data) {
        data = { id: paymentId }
      }
    }

    console.log('📥 Webhook recibido de Mercado Pago:', { type, data, paymentId, bodyText: bodyText.substring(0, 200) })
    
    if (!paymentId) {
      console.error('⚠️ Payment ID no encontrado en webhook. Body:', bodyText.substring(0, 500))
      // Retornar 200 para que Mercado Pago no reintente indefinidamente
      return NextResponse.json({ error: 'Payment ID no encontrado' }, { status: 200 })
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

      // ============================================
      // IDEMPOTENCIA: Verificar si este webhook ya se procesó
      // ============================================
      const { data: existingWebhookLog } = await supabase
        .from('webhook_logs')
        .select('id, payment_status, processed_at')
        .eq('payment_id', paymentId.toString())
        .maybeSingle()

      if (existingWebhookLog) {
        console.log(`ℹ️ Webhook ya procesado para payment_id ${paymentId} (procesado el ${existingWebhookLog.processed_at})`)
        // Retornar éxito sin procesar (idempotencia)
        return NextResponse.json({ 
          success: true, 
          purchaseId, 
          status: existingWebhookLog.payment_status,
          message: 'Webhook ya procesado anteriormente',
          alreadyProcessed: true
        })
      }
      
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
        .select('base_amount, created_at, payment_provider_data, payment_status')
        .eq('id', purchaseId)
        .single()

      if (fetchError || !currentPurchase) {
        // Mejorar logging para debugging
        console.error('❌ Error obteniendo compra en webhook:', {
          purchaseId,
          external_reference: payment.external_reference,
          payment_id: payment.id,
          error: fetchError,
          error_code: fetchError?.code,
          error_message: fetchError?.message,
        })
        
        // Si la compra no existe, puede ser que el webhook llegó antes de que se creara la compra
        // o que el external_reference no coincide. En este caso, retornar 200 para que MP no reintente
        // pero loguear el error para debugging
        return NextResponse.json({ 
          error: 'Compra no encontrada',
          purchaseId,
          external_reference: payment.external_reference,
          message: 'La compra no existe en la base de datos. Puede ser que el webhook llegó antes de que se creara la compra, o que el external_reference no coincide con el purchase_id.'
        }, { status: 200 }) // Retornar 200 para que MP no reintente indefinidamente
      }

      // Guardar estado anterior para auditoría
      const oldPaymentStatus = currentPurchase.payment_status

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

      // ============================================
      // AUDITORÍA: Registrar cambio de estado
      // ============================================
      if (oldPaymentStatus !== paymentStatus) {
        const { error: auditError } = await supabase
          .from('audit_logs')
          .insert({
            entity_type: 'purchase',
            entity_id: purchaseId,
            action: 'status_changed',
            old_value: { payment_status: oldPaymentStatus },
            new_value: { payment_status: paymentStatus },
            changed_field: 'payment_status',
            triggered_by: 'mercadopago_webhook',
            metadata: {
              payment_id: paymentId.toString(),
              mp_status: payment.status,
            },
          })

        if (auditError) {
          // No fallar si no se puede registrar auditoría (no crítico)
          console.warn('⚠️ Error registrando auditoría (no crítico):', auditError)
        }
      }

      // ============================================
      // IDEMPOTENCIA: Intentar registrar que este webhook se procesó
      // Si falla por duplicate key, significa que otra llamada ya lo procesó
      // ============================================
      const { data: newWebhookLog, error: webhookLogError } = await supabase
        .from('webhook_logs')
        .insert({
          payment_id: paymentId.toString(),
          purchase_id: purchaseId,
          webhook_type: type,
          payment_status: paymentStatus,
          webhook_data: payment,
        })
        .select()
        .single()

      if (webhookLogError) {
        // Si falla por duplicate key (código 23505), significa que otra llamada ya procesó este webhook
        if (webhookLogError.code === '23505') {
          console.log(`ℹ️ Webhook ya procesado por otra llamada (race condition detectada) para payment_id ${paymentId}`)
          // Retornar éxito sin procesar más (idempotencia)
          return NextResponse.json({ 
            success: true, 
            purchaseId, 
            status: paymentStatus,
            message: 'Webhook ya procesado por otra llamada',
            alreadyProcessed: true
          })
        }
        // Otros errores no son críticos pero los registramos
        console.warn('⚠️ Error registrando webhook log (no crítico):', webhookLogError)
      }

      console.log(`✅ Compra ${purchaseId} actualizada a estado: ${paymentStatus}`)
      if (paymentStatus === 'completed') {
        console.log(`💰 Gastos operativos: $${financialBreakdown.operatingCosts.total.toFixed(2)}`)
        console.log(`💵 Margen neto: $${financialBreakdown.netMargin.toFixed(2)}`)
        console.log(`📅 Fecha de liberación: ${financialBreakdown.moneyReleaseDate.toISOString()}`)
      }

      // Si el pago fue aprobado, crear los tickets, transferencia y enviar email
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

        // Crear transferencia solo cuando el pago se complete
        // Verificar si ya existe una transferencia (idempotencia)
        const { data: existingTransfer } = await supabase
          .from('transfers')
          .select('id')
          .eq('purchase_id', purchaseId)
          .maybeSingle()

        if (!existingTransfer) {
          // Obtener información del evento para crear la transferencia
          const { data: purchaseForTransfer } = await supabase
            .from('purchases')
            .select(`
              id,
              base_amount,
              created_at,
              event:events(
                id,
                producer_id
              )
            `)
            .eq('id', purchaseId)
            .single()

          if (purchaseForTransfer) {
            const eventData = Array.isArray(purchaseForTransfer.event) 
              ? purchaseForTransfer.event[0]
              : purchaseForTransfer.event

            if (eventData && eventData.producer_id) {
              // Calcular cuándo transferir (240 horas = 10 días después de la compra)
              const purchaseDate = new Date(purchaseForTransfer.created_at)
              const scheduledAt = new Date(
                purchaseDate.getTime() + 240 * 60 * 60 * 1000 // 240 horas
              )

              const { error: transferError } = await supabase
                .from('transfers')
                .insert({
                  purchase_id: purchaseId,
                  event_id: eventData.id,
                  producer_id: eventData.producer_id,
                  amount: Number(purchaseForTransfer.base_amount), // Solo el precio base de la productora
                  status: 'pending',
                  scheduled_at: scheduledAt.toISOString(),
                })

              if (transferError) {
                console.error('Error creando transferencia:', transferError)
              } else {
                console.log(`✅ Transferencia creada para compra ${purchaseId}`)
              }
            }
          }
        } else {
          console.log(`ℹ️ Transferencia ya existe para compra ${purchaseId}`)
        }

        // Verificar si ya se envió el email
        // Estrategia robusta: Si ya existen tickets, significa que el webhook ya se procesó y el email ya se envió
        // Esto es más confiable que depender de webhook_logs (que puede fallar por RLS)
        const { data: existingTicketsForEmail } = await supabase
          .from('tickets')
          .select('id')
          .eq('purchase_id', purchaseId)
          .limit(1)
        
        // Solo enviar email si NO existen tickets (significa que es la primera vez que se procesa)
        if (!existingTicketsForEmail || existingTicketsForEmail.length === 0) {
          const { data: purchase } = await supabase
            .from('purchases')
            .select('user_id, guest_email, guest_name')
            .eq('id', purchaseId)
            .single()

          if (purchase) {
            // Construir URL del endpoint de email
            // Priorizar NEXT_PUBLIC_APP_URL (debe estar configurado en producción)
            // Solo usar VERCEL_URL si NEXT_PUBLIC_APP_URL no está configurado Y no es una URL de preview
            let appUrl = process.env.NEXT_PUBLIC_APP_URL
            
            if (!appUrl) {
              // Solo usar VERCEL_URL si no es una URL de preview (las preview URLs contienen el ID del deployment)
              if (process.env.VERCEL_URL && !process.env.VERCEL_URL.includes('-p3o3tco01-')) {
                appUrl = `https://${process.env.VERCEL_URL}`
              } else {
                appUrl = 'http://localhost:3000'
                console.warn('⚠️ NEXT_PUBLIC_APP_URL no configurado, usando localhost. Configura NEXT_PUBLIC_APP_URL en Vercel.')
              }
            }
            
            const emailEndpoint = `${appUrl}/api/send-tickets-email`
            
            console.log(`📧 [WEBHOOK] Intentando enviar email para compra ${purchaseId} a ${purchase.guest_email} usando endpoint: ${emailEndpoint}`)
            
            // Crear AbortController para timeout
            const controller = new AbortController()
            const timeoutId = setTimeout(() => {
              controller.abort()
            }, 30000) // 30 segundos de timeout
            
            // Enviar email de forma asíncrona (no bloquea la respuesta)
            fetch(emailEndpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                purchaseId,
                email: purchase.guest_email || undefined,
                userName: purchase.guest_name || undefined,
              }),
              signal: controller.signal,
            })
            .then(async (response) => {
              clearTimeout(timeoutId)
              
              if (!response.ok) {
                const errorText = await response.text()
                console.error(`❌ [WEBHOOK] Error enviando email: ${response.status} ${response.statusText} - ${errorText}`)
              } else {
                const data = await response.json()
                console.log(`✅ [WEBHOOK] Email de tickets enviado exitosamente para compra ${purchaseId}:`, data)
              }
            })
            .catch((err) => {
              clearTimeout(timeoutId)
              
              if (err.name === 'AbortError') {
                console.error(`❌ [WEBHOOK] Timeout enviando email (30s) para compra ${purchaseId}`)
              } else {
                console.error(`❌ [WEBHOOK] Error de red/enviando email para compra ${purchaseId}:`, {
                  error: err.message || err,
                  name: err.name,
                  stack: err.stack,
                })
              }
            })
          }
        } else {
          console.log(`ℹ️ Email ya enviado para compra ${purchaseId} (webhook ya procesado)`)
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
      } else if (paymentStatus === 'refunded') {
        // Si el pago fue reembolsado, marcar transferencia como 'cancelled' si existe
        const { data: transfer, error: transferFetchError } = await supabase
          .from('transfers')
          .select('id, status')
          .eq('purchase_id', purchaseId)
          .maybeSingle()

        if (transferFetchError) {
          console.warn('⚠️ Error obteniendo transferencia (no crítico):', transferFetchError)
        } else if (transfer && transfer.status !== 'cancelled') {
          // Si el pago fue reembolsado, marcar la transferencia como 'cancelled'
          const { error: transferUpdateError } = await supabase
            .from('transfers')
            .update({
              status: 'cancelled',
              updated_at: new Date().toISOString(),
            })
            .eq('id', transfer.id)

          if (transferUpdateError) {
            console.warn('⚠️ Error actualizando transferencia (no crítico):', transferUpdateError)
          } else {
            console.log(`✅ Transferencia ${transfer.id} marcada como 'cancelled' debido a reembolso`)
          }
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
