import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * API Route para verificar el estado de un pago en Mercado Pago
 * 
 * Se usa cuando el usuario vuelve de Mercado Pago y el webhook aún no llegó
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { purchaseId } = body

    if (!purchaseId) {
      return NextResponse.json(
        { error: 'purchaseId es requerido' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Obtener la compra (incluyendo payment_provider_data para preservar tickets_data)
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .select('payment_provider_id, payment_status, payment_provider_data')
      .eq('id', purchaseId)
      .single()

    if (purchaseError || !purchase) {
      return NextResponse.json(
        { error: 'Compra no encontrada' },
        { status: 404 }
      )
    }

    // Preservar tickets_data antes de actualizar payment_provider_data
    // Esto es crítico: si el webhook aún no llegó, tickets_data debe preservarse
    const ticketsData = (purchase.payment_provider_data as any)?.tickets_data

    const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN

    if (!mpAccessToken) {
      return NextResponse.json(
        { error: 'Mercado Pago no está configurado' },
        { status: 500 }
      )
    }

    let payment: any = null

    // Si ya tiene payment_provider_id, consultar directamente
    if (purchase.payment_provider_id) {
      const paymentResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${purchase.payment_provider_id}`,
        {
          headers: {
            'Authorization': `Bearer ${mpAccessToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (paymentResponse.ok) {
        payment = await paymentResponse.json()
      }
    } else {
      // Si no tiene payment_provider_id, buscar pagos recientes con este external_reference
      // Mercado Pago puede crear un pago incluso si fue rechazado
      const searchResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/search?external_reference=${purchaseId}&sort=date_created&criteria=desc&limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${mpAccessToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (searchResponse.ok) {
        const searchData = await searchResponse.json()
        if (searchData.results && searchData.results.length > 0) {
          payment = searchData.results[0]
        }
      }
    }

    // Si encontramos un pago, verificar que corresponde a esta compra
    if (payment) {
      // Verificación de seguridad: el external_reference debe coincidir con purchaseId
      // Esto previene que alguien use un payment_provider_id de otra compra
      if (payment.external_reference && payment.external_reference !== purchaseId) {
        console.error(`⚠️ Security: external_reference (${payment.external_reference}) no coincide con purchaseId (${purchaseId})`)
        return NextResponse.json(
          { error: 'El pago no corresponde a esta compra' },
          { status: 400 }
        )
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

      // Si el estado cambió, actualizar en la base de datos
      if (paymentStatus !== purchase.payment_status) {
        // Preservar tickets_data al actualizar payment_provider_data
        // Esto evita que se pierda la información necesaria para crear tickets cuando llegue el webhook
        const updatedPaymentProviderData: any = {
          ...payment,
        }
        
        // Solo preservar tickets_data si existe (puede ser null si el webhook ya lo procesó)
        if (ticketsData) {
          updatedPaymentProviderData.tickets_data = ticketsData
        }

        await supabase
          .from('purchases')
          .update({
            payment_status: paymentStatus,
            payment_provider_id: payment.id?.toString() || purchase.payment_provider_id,
            payment_provider_data: updatedPaymentProviderData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', purchaseId)

        // Si el pago fue completado, crear tickets y transferencia si no existen
        // Esto es un fallback si el webhook no llegó o falló
        if (paymentStatus === 'completed') {
          // Verificar si ya existen tickets (para evitar duplicados)
          const { data: existingTickets } = await supabase
            .from('tickets')
            .select('id')
            .eq('purchase_id', purchaseId)
            .limit(1)

          // Solo crear tickets si no existen y tenemos tickets_data
          if ((!existingTickets || existingTickets.length === 0) && ticketsData && Array.isArray(ticketsData) && ticketsData.length > 0) {
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

            if (!purchaseDataError && purchaseData) {
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
                  console.error('Error creando tickets desde check-payment-status:', ticketsInsertError)
                } else {
                  console.log(`✅ ${ticketsToInsert.length} tickets creados para compra ${purchaseId} (desde check-payment-status)`)
                }
              }

              // Crear transferencia si no existe
              const { data: existingTransfer } = await supabase
                .from('transfers')
                .select('id')
                .eq('purchase_id', purchaseId)
                .maybeSingle()

              if (!existingTransfer) {
                const eventData = Array.isArray(purchaseData.event) 
                  ? purchaseData.event[0]
                  : purchaseData.event

                if (eventData && eventData.producer_id) {
                  // Obtener base_amount y created_at de la compra
                  const { data: purchaseForTransfer } = await supabase
                    .from('purchases')
                    .select('base_amount, created_at')
                    .eq('id', purchaseId)
                    .single()

                  if (purchaseForTransfer) {
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
                        amount: Number(purchaseForTransfer.base_amount),
                        status: 'pending',
                        scheduled_at: scheduledAt.toISOString(),
                      })

                    if (transferError) {
                      console.error('Error creando transferencia desde check-payment-status:', transferError)
                    } else {
                      console.log(`✅ Transferencia creada para compra ${purchaseId} (desde check-payment-status)`)
                    }
                  }
                }
              }
            }
          }
        }

        return NextResponse.json({
          success: true,
          paymentStatus,
          updated: true,
          payment,
        })
      }

      // Si el pago ya está completado pero no hay tickets, crearlos (fallback si webhook falló)
      if (paymentStatus === 'completed' && purchase.payment_status === 'completed') {
        // Verificar si ya existen tickets
        const { data: existingTickets } = await supabase
          .from('tickets')
          .select('id')
          .eq('purchase_id', purchaseId)
          .limit(1)

        // Solo crear tickets si no existen y tenemos tickets_data
        if ((!existingTickets || existingTickets.length === 0) && ticketsData && Array.isArray(ticketsData) && ticketsData.length > 0) {
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

          if (!purchaseDataError && purchaseData) {
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
                console.error('Error creando tickets desde check-payment-status (pago ya completado):', ticketsInsertError)
              } else {
                console.log(`✅ ${ticketsToInsert.length} tickets creados para compra ${purchaseId} (desde check-payment-status, pago ya completado)`)
              }
            }

            // Crear transferencia si no existe
            const { data: existingTransfer } = await supabase
              .from('transfers')
              .select('id')
              .eq('purchase_id', purchaseId)
              .maybeSingle()

            if (!existingTransfer) {
              const eventData = Array.isArray(purchaseData.event) 
                ? purchaseData.event[0]
                : purchaseData.event

              if (eventData && eventData.producer_id) {
                // Obtener base_amount y created_at de la compra
                const { data: purchaseForTransfer } = await supabase
                  .from('purchases')
                  .select('base_amount, created_at')
                  .eq('id', purchaseId)
                  .single()

                if (purchaseForTransfer) {
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
                      amount: Number(purchaseForTransfer.base_amount),
                      status: 'pending',
                      scheduled_at: scheduledAt.toISOString(),
                    })

                  if (transferError) {
                    console.error('Error creando transferencia desde check-payment-status (pago ya completado):', transferError)
                  } else {
                    console.log(`✅ Transferencia creada para compra ${purchaseId} (desde check-payment-status, pago ya completado)`)
                  }
                }
              }
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        paymentStatus,
        updated: false,
      })
    }

    // Si no encontramos pago, el estado actual es correcto
    return NextResponse.json({
      success: true,
      paymentStatus: purchase.payment_status,
      updated: false,
    })
  } catch (error: any) {
    console.error('Error verificando estado de pago:', error)
    return NextResponse.json(
      { error: error.message || 'Error verificando estado de pago' },
      { status: 500 }
    )
  }
}
