import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

      // Actualizar la compra
      const { error: updateError } = await supabase
        .from('purchases')
        .update({
          payment_status: paymentStatus,
          payment_provider_id: paymentId.toString(),
          payment_provider_data: payment,
          updated_at: new Date().toISOString(),
        })
        .eq('id', purchaseId)

      if (updateError) {
        console.error('Error actualizando compra:', updateError)
        return NextResponse.json({ error: 'Error actualizando compra' }, { status: 500 })
      }

      console.log(`✅ Compra ${purchaseId} actualizada a estado: ${paymentStatus}`)

      // Si el pago fue aprobado, podemos enviar el email de tickets si aún no se envió
      if (paymentStatus === 'completed') {
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
