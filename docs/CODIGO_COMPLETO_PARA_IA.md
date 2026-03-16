# 📦 Código Completo para Análisis de IA

## 📋 Contexto del Problema

**Sistema:** Plataforma de venta de entradas (Next.js + Supabase + Mercado Pago)  
**Problema:** Webhook de Mercado Pago falla en producción con errores:
- Error 500: "Payment not found" cuando recibe UUIDs en lugar de payment_id numéricos
- Error RLS 42501: No puede insertar en `webhook_logs` debido a políticas de seguridad
- Webhook funcionaba antes (actualizaba pagos) pero no enviaba emails. Ahora está completamente roto.

**Logs de Error:**
```
POST 500 /api/mercadopago/webhook
Error consultando pago en Mercado Pago: {
  "message":"Payment not found",
  "error":"not_found",
  "status":404,
  "cause":[{
    "code":2000,
    "description":"Payment not found",
    "data":"16-03-2026T02:23:10UTC;459633e8-1403-40fa-a3e8-b0f8ac02db4b"
  }]
}

POST 200 /api/mercadopago/webhook
⚠️ Error registrando webhook log (no crítico): {
  code: '42501',
  details: null,
  hint: null,
  message: 'new row violates row-level security policy for table "webhook_logs"'
}
```

---

## 📁 Archivo 1: `app/api/mercadopago/webhook/route.ts`

**Descripción:** Handler principal del webhook de Mercado Pago. Recibe notificaciones cuando cambia el estado de un pago, actualiza la compra en la BD, crea tickets y envía emails con QR codes.

**Problemas identificados:**
1. Líneas 85-158: Lógica compleja de detección de UUIDs que falla
2. Líneas 100, 218: Usa `createClient()` que usa `anon` key (no tiene permisos RLS)
3. Líneas 223-239: Verificación de idempotencia con `webhook_logs` que falla por RLS
4. Líneas 369-396: Intento de insertar en `webhook_logs` que falla por RLS

```typescript
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
    
    // Log completo del request para debugging
    const requestUrl = request.url
    const headers = Object.fromEntries(request.headers.entries())
    
    console.log('🔍 [WEBHOOK DEBUG] Request completo:', {
      url: requestUrl,
      method: request.method,
      headers: {
        'content-type': headers['content-type'],
        'user-agent': headers['user-agent'],
        'x-request-id': headers['x-request-id'],
      },
      bodyLength: bodyText.length,
      bodyPreview: bodyText.substring(0, 500)
    })
    
    // Intentar parsear como JSON
    try {
      const body = JSON.parse(bodyText)
      type = body?.type
      data = body?.data
      paymentId = data?.id?.toString() || body?.id?.toString() || body?.payment_id?.toString()
      
      console.log('✅ [WEBHOOK DEBUG] Body parseado como JSON:', {
        type,
        data,
        paymentId,
        bodyKeys: Object.keys(body)
      })
    } catch (error) {
      // Si no es JSON válido, el body puede estar vacío o en otro formato
      console.log('⚠️ Body no es JSON válido, intentando leer de query params. Error:', error)
    }
    
    // Si no tenemos payment_id del body, intentar de query params
    if (!paymentId) {
      const { searchParams } = new URL(request.url)
      type = type || searchParams.get('type') || undefined
      paymentId = searchParams.get('data.id') || searchParams.get('id') || undefined
      
      console.log('🔍 [WEBHOOK DEBUG] Query params:', {
        type: searchParams.get('type'),
        dataId: searchParams.get('data.id'),
        id: searchParams.get('id'),
        allParams: Object.fromEntries(searchParams.entries())
      })
      
      if (paymentId && !data) {
        data = { id: paymentId }
      }
    }

    console.log('📥 Webhook recibido de Mercado Pago:', { type, data, paymentId, bodyText: bodyText.substring(0, 200) })
    
    if (!paymentId) {
      console.error('⚠️ Payment ID no encontrado en webhook. Body completo:', bodyText)
      // Retornar 200 para que Mercado Pago no reintente indefinidamente
      return NextResponse.json({ error: 'Payment ID no encontrado' }, { status: 200 })
    }

    // VALIDACIÓN CRÍTICA: Mercado Pago siempre envía payment_id numéricos (ej: "145137944075")
    // Si recibimos un UUID, es probable que sea un purchase_id y debemos rechazarlo
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentId)
    const isNumeric = /^\d+$/.test(paymentId)
    
    if (isUUID) {
      console.error('❌ ERROR CRÍTICO: Webhook recibió UUID en lugar de payment_id numérico:', {
        received: paymentId,
        type: 'UUID (probablemente purchase_id)',
        bodyText: bodyText,
        url: request.url,
        headers: Object.fromEntries(request.headers.entries())
      })
      
      // SOLUCIÓN TEMPORAL: Si recibimos un UUID, intentar buscar la compra y obtener el payment_provider_id real
      const supabase = await createClient()
      const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .select('id, payment_provider_id, payment_status')
        .eq('id', paymentId)
        .maybeSingle()
      
      if (purchase && purchase.payment_provider_id) {
        console.log('✅ Encontrada compra con UUID, usando payment_provider_id real:', purchase.payment_provider_id)
        paymentId = purchase.payment_provider_id.toString()
      } else {
        // Si no encontramos la compra, puede ser que Mercado Pago esté enviando el external_reference
        // Intentar buscar pagos recientes con ese external_reference
        console.log('⚠️ No se encontró compra con UUID, intentando buscar pago en Mercado Pago por external_reference:', paymentId)
        
        const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
        if (mpAccessToken) {
          try {
            // Buscar pagos recientes con ese external_reference
            const searchResponse = await fetch(
              `https://api.mercadopago.com/v1/payments/search?external_reference=${paymentId}&sort=date_created&criteria=desc&limit=1`,
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
                const foundPayment = searchData.results[0]
                paymentId = foundPayment.id.toString()
                console.log('✅ Pago encontrado por external_reference, usando payment_id:', paymentId)
              } else {
                console.error('❌ No se encontró pago en Mercado Pago con ese external_reference')
                return NextResponse.json({ 
                  error: 'Payment ID inválido (UUID recibido y no se encontró pago asociado)',
                  received: paymentId
                }, { status: 200 })
              }
            }
          } catch (searchError) {
            console.error('❌ Error buscando pago por external_reference:', searchError)
            return NextResponse.json({ 
              error: 'Error buscando pago en Mercado Pago',
              received: paymentId
            }, { status: 200 })
          }
        } else {
          console.error('❌ MERCADOPAGO_ACCESS_TOKEN no configurado, no se puede buscar pago')
          return NextResponse.json({ 
            error: 'Payment ID inválido (UUID recibido y no se encontró compra asociada)',
            received: paymentId
          }, { status: 200 })
        }
      }
    }
    
    if (!isNumeric) {
      console.error('❌ ERROR: Payment ID no es numérico:', {
        received: paymentId,
        bodyText: bodyText,
        url: request.url
      })
      return NextResponse.json({ 
        error: 'Payment ID debe ser numérico',
        received: paymentId
      }, { status: 200 })
    }

    console.log('✅ Payment ID válido (numérico):', paymentId)

    // Verificación final: asegurar que paymentId esté definido
    if (!paymentId) {
      console.error('❌ ERROR CRÍTICO: paymentId es undefined después de todas las validaciones')
      return NextResponse.json({ 
        error: 'Payment ID no disponible después de validaciones',
      }, { status: 200 })
    }

    // TypeScript: paymentId está garantizado como string en este punto
    const finalPaymentId: string = paymentId

    // Obtener información del pago desde Mercado Pago
    // Nota: En producción, deberías validar la firma del webhook para seguridad
    const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    
    if (!mpAccessToken) {
      console.error('⚠️ MERCADOPAGO_ACCESS_TOKEN no configurado')
      return NextResponse.json({ error: 'Configuración faltante' }, { status: 500 })
    }

    // Consultar el pago en Mercado Pago
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${finalPaymentId}`, {
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
        .eq('payment_id', finalPaymentId)
        .maybeSingle()

      if (existingWebhookLog) {
        console.log(`ℹ️ Webhook ya procesado para payment_id ${finalPaymentId} (procesado el ${existingWebhookLog.processed_at})`)
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
        payment_provider_id: finalPaymentId,
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
              payment_id: finalPaymentId,
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
          payment_id: finalPaymentId,
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
          console.log(`ℹ️ Webhook ya procesado por otra llamada (race condition detectada) para payment_id ${finalPaymentId}`)
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
```

---

## 📁 Archivo 2: `lib/supabase/server.ts`

**Descripción:** Función helper para crear cliente de Supabase en el servidor. Usa `anon` key y maneja cookies para autenticación.

**Problema identificado:**
- Línea 8: Usa `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon key)
- El webhook necesita `SUPABASE_SERVICE_ROLE_KEY` para bypass RLS
- Este cliente no tiene permisos para insertar en `webhook_logs`

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file'
    )
  }

  // Validar que la URL sea válida
  try {
    new URL(supabaseUrl)
  } catch {
    throw new Error(
      'Invalid NEXT_PUBLIC_SUPABASE_URL. Must be a valid HTTP or HTTPS URL (e.g., https://your-project.supabase.co)'
    )
  }

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
```

---

## 📁 Archivo 3: `supabase/migrations/add_webhook_logs_and_audit_logs.sql`

**Descripción:** Migración SQL que crea las tablas `webhook_logs` y `audit_logs` con políticas RLS para idempotencia y auditoría.

**Problema identificado:**
- Línea 77: Política RLS dice `WITH CHECK (true)` (debería permitir todo)
- Pero el cliente de Supabase usa `anon` key que no tiene permisos
- La política requiere que el cliente tenga permisos adecuados

```sql
-- ============================================
-- MIGRACIÓN: Webhook Logs y Audit Logs
-- ============================================
-- Agrega tablas para idempotencia de webhooks y auditoría de cambios
-- 
-- Fecha: 2025
-- Versión: 1.0
-- ============================================

-- ============================================
-- 1. Tabla: webhook_logs (Idempotencia)
-- ============================================
-- Registra qué webhooks ya se procesaron para evitar duplicados

CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id TEXT NOT NULL UNIQUE, -- ID del pago de Mercado Pago (único para idempotencia)
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  webhook_type TEXT NOT NULL, -- 'payment', 'refund', etc.
  payment_status TEXT NOT NULL, -- Estado del pago cuando se procesó
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  webhook_data JSONB, -- Datos completos del webhook (para debugging)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para webhook_logs
CREATE INDEX IF NOT EXISTS idx_webhook_logs_payment_id ON webhook_logs(payment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_purchase_id ON webhook_logs(purchase_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed_at ON webhook_logs(processed_at);

-- ============================================
-- 2. Tabla: audit_logs (Auditoría)
-- ============================================
-- Registra todos los cambios importantes en el sistema

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'purchase', 'transfer', 'ticket', etc.
  entity_id UUID NOT NULL, -- ID de la entidad que cambió
  action TEXT NOT NULL, -- 'status_changed', 'created', 'updated', 'deleted'
  old_value JSONB, -- Valor anterior (opcional)
  new_value JSONB, -- Valor nuevo (opcional)
  changed_field TEXT, -- Campo específico que cambió (ej: 'payment_status')
  triggered_by TEXT NOT NULL, -- 'mercadopago_webhook', 'admin', 'user', 'system'
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Usuario que causó el cambio (si aplica)
  metadata JSONB, -- Información adicional (opcional)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_triggered_by ON audit_logs(triggered_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;

-- ============================================
-- 3. Políticas RLS para webhook_logs
-- ============================================

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver logs de webhooks (datos sensibles)
DROP POLICY IF EXISTS "Admins can view webhook logs" ON webhook_logs;
CREATE POLICY "Admins can view webhook logs"
  ON webhook_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- El webhook puede insertar logs (sin autenticación, pero validado por el código)
DROP POLICY IF EXISTS "Webhook can insert logs" ON webhook_logs;
CREATE POLICY "Webhook can insert logs"
  ON webhook_logs FOR INSERT
  WITH CHECK (true);

-- Solo admins pueden actualizar logs
DROP POLICY IF EXISTS "Admins can update webhook logs" ON webhook_logs;
CREATE POLICY "Admins can update webhook logs"
  ON webhook_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 4. Políticas RLS para audit_logs
-- ============================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver logs de auditoría (datos sensibles)
DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- El sistema puede insertar logs (webhook, procesos internos)
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- Solo admins pueden actualizar logs (por si hay que corregir algo)
DROP POLICY IF EXISTS "Admins can update audit logs" ON audit_logs;
CREATE POLICY "Admins can update audit logs"
  ON audit_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
--
-- 1. webhook_logs tiene UNIQUE constraint en payment_id para garantizar idempotencia
-- 2. Ambas tablas tienen RLS habilitado, solo admins pueden ver
-- 3. El webhook puede insertar en ambas tablas (WITH CHECK (true))
-- 4. Los índices mejoran el rendimiento de consultas
-- 5. Las tablas se relacionan con purchases para mantener integridad
--
-- ============================================
```

---

## 🎯 Resumen de Problemas

1. **Webhook recibe UUIDs** en lugar de payment_id numéricos → Error 404 "Payment not found"
2. **Cliente de Supabase usa `anon` key** → No tiene permisos para insertar en `webhook_logs` → Error RLS 42501
3. **Idempotencia falla** porque no puede leer/insertar en `webhook_logs`
4. **Lógica compleja de UUIDs** (líneas 85-158) que no funciona correctamente

---

## 💡 Soluciones Propuestas

1. **Usar `SUPABASE_SERVICE_ROLE_KEY`** en el webhook (bypass RLS)
2. **Simplificar parsing** del webhook (remover lógica compleja de UUIDs)
3. **Idempotencia simple** verificando en `purchases` en lugar de `webhook_logs`
4. **Mantener funcionalidad** que funcionaba antes (actualizar pagos, crear tickets)

---

**Fecha:** 15 de marzo de 2026  
**Prioridad:** 🔴 CRÍTICA - Sistema completamente roto en producción
