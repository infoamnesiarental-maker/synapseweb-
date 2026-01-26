import { NextRequest, NextResponse } from 'next/server'
import { createPaymentPreference } from '@/lib/mercadopago'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  console.log('🚀 POST /api/mercadopago/create-preference recibido')
  
  try {
    // Validar que el request tenga body
    let body
    try {
      body = await request.json()
      console.log('✅ Body parseado correctamente')
    } catch (parseError) {
      console.error('❌ Error parseando JSON del request:', parseError)
      return NextResponse.json(
        { error: 'Error en el formato de la solicitud' },
        { status: 400 }
      )
    }

    const { tickets, eventId, buyerEmail, buyerName, buyerPhone, purchaseId } = body

    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return NextResponse.json(
        { error: 'Tickets requeridos' },
        { status: 400 }
      )
    }

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID requerido' },
        { status: 400 }
      )
    }

    if (!purchaseId) {
      return NextResponse.json(
        { error: 'Purchase ID requerido' },
        { status: 400 }
      )
    }

    // Obtener información del evento
    const supabase = await createClient()
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('name, slug')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Evento no encontrado' },
        { status: 404 }
      )
    }

    // Construir items para Mercado Pago
    const items = tickets.map((ticket: any, index: number) => ({
      id: `${ticket.ticketTypeId}-${index}`, // ID único para cada item
      title: `${ticket.ticketTypeName} - ${event.name}`,
      quantity: ticket.quantity,
      unit_price: ticket.basePrice + (ticket.basePrice * 0.15), // Precio con comisión incluida
    }))

    // Calcular total
    const totalAmount = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0)

    // Validar Access Token antes de continuar
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      console.error('❌ MERCADOPAGO_ACCESS_TOKEN no está configurado')
      return NextResponse.json(
        { error: 'Mercado Pago no está configurado. Contacta al administrador.' },
        { status: 500 }
      )
    }

    // Crear preferencia de pago
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    console.log('📦 Creando preferencia de Mercado Pago:', {
      itemsCount: items.length,
      totalAmount,
      buyerEmail,
      purchaseId,
      appUrl,
      accessTokenPrefix: process.env.MERCADOPAGO_ACCESS_TOKEN?.substring(0, 20) + '...', // Solo primeros caracteres por seguridad
    })
    
    const preference = await createPaymentPreference({
      items,
      payer: {
        email: buyerEmail,
        name: buyerName?.split(' ')[0] || undefined,
        surname: buyerName?.split(' ').slice(1).join(' ') || undefined,
        phone: buyerPhone ? {
          area_code: buyerPhone.replace(/\D/g, '').substring(0, 2) || undefined,
          number: buyerPhone.replace(/\D/g, '').substring(2) || undefined,
        } : undefined,
      },
      back_urls: {
        success: `${appUrl}/checkout/success?purchaseId=${purchaseId}`,
        failure: `${appUrl}/checkout?error=payment_failed&purchaseId=${purchaseId}`,
        pending: `${appUrl}/checkout/success?purchaseId=${purchaseId}&status=pending`,
      },
      auto_return: 'approved',
      external_reference: purchaseId, // ID de la compra en nuestra BD
      notification_url: `${appUrl}/api/mercadopago/webhook`,
    })

    // En modo prueba, usar sandbox_init_point; en producción, usar init_point
    const paymentUrl = preference.sandbox_init_point || preference.init_point

    console.log('🔗 URLs de pago disponibles:', {
      hasSandboxInitPoint: !!preference.sandbox_init_point,
      hasInitPoint: !!preference.init_point,
      sandboxUrl: preference.sandbox_init_point?.substring(0, 50) + '...',
      initUrl: preference.init_point?.substring(0, 50) + '...',
      usingUrl: paymentUrl?.substring(0, 50) + '...',
    })

    return NextResponse.json({
      success: true,
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
      paymentUrl, // URL correcta según el modo (prueba o producción)
    })
  } catch (error: any) {
    console.error('❌ Error creando preferencia de Mercado Pago:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      status: error?.status,
      statusCode: error?.statusCode,
      response: error?.response,
    })
    
    // Asegurar que siempre devolvemos JSON, nunca HTML
    const errorMessage = error?.message || 'Error creando preferencia de pago'
    const errorStatus = error?.status || error?.statusCode || 500
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: errorStatus >= 400 && errorStatus < 600 ? errorStatus : 500 }
    )
  }
}
