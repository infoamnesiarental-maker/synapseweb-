import { NextRequest, NextResponse } from 'next/server'
import { createPaymentPreference } from '@/lib/mercadopago'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
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

    // Crear preferencia de pago
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
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

    return NextResponse.json({
      success: true,
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
    })
  } catch (error: any) {
    console.error('Error creando preferencia de Mercado Pago:', error)
    return NextResponse.json(
      { error: error.message || 'Error creando preferencia de pago' },
      { status: 500 }
    )
  }
}
