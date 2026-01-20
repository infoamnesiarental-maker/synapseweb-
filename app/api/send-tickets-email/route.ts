import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { es } from 'date-fns/locale/es'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendTicketsEmailParams {
  purchaseId: string
  email: string
  userName?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: SendTicketsEmailParams = await request.json()
    const { purchaseId, email, userName } = body

    if (!purchaseId || !email) {
      return NextResponse.json(
        { error: 'purchaseId y email son requeridos' },
        { status: 400 }
      )
    }

    // Obtener datos de la compra desde Supabase
    const supabase = await createClient()
    
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .select(`
        *,
        event:events(
          id,
          name,
          slug,
          start_date,
          end_date,
          venue_name,
          venue_address
        )
      `)
      .eq('id', purchaseId)
      .single()

    if (purchaseError || !purchase) {
      return NextResponse.json(
        { error: 'Compra no encontrada' },
        { status: 404 }
      )
    }

    // Obtener tickets de la compra
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select(`
        id,
        ticket_number,
        qr_code,
        ticket_type:ticket_types(
          id,
          name,
          price
        )
      `)
      .eq('purchase_id', purchaseId)
      .order('created_at', { ascending: true })

    if (ticketsError || !tickets || tickets.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron tickets para esta compra' },
        { status: 404 }
      )
    }

    const event = purchase.event as any
    const eventDate = new Date(event.start_date)
    const formattedDate = eventDate.toLocaleDateString('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    // Crear template de email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Tus Entradas - Synapse</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #000000; color: #FFFFFF;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #0F0F0F; padding: 40px;">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 40px;">
              <h1 style="color: #7C3AED; font-size: 32px; font-weight: bold; margin: 0;">SYNAPSE</h1>
              <p style="color: #A3A3A3; font-size: 18px; margin-top: 10px;">Tus Entradas</p>
            </div>

            <!-- Mensaje de bienvenida -->
            <div style="background-color: #1F1F1F; padding: 30px; border-radius: 16px; margin-bottom: 30px;">
              <h2 style="color: #FFFFFF; font-size: 24px; margin: 0 0 15px 0;">¡Compra Exitosa!</h2>
              <p style="color: #A3A3A3; font-size: 16px; line-height: 1.6; margin: 0;">
                Hola ${userName || 'Usuario'},<br><br>
                Tu compra ha sido procesada correctamente. Aquí tienes toda la información de tus entradas.
              </p>
            </div>

            <!-- Información del Evento -->
            <div style="background-color: #1F1F1F; padding: 30px; border-radius: 16px; margin-bottom: 30px;">
              <h3 style="color: #FFFFFF; font-size: 20px; margin: 0 0 20px 0;">${event.name}</h3>
              <div style="color: #A3A3A3; font-size: 14px; line-height: 1.8;">
                <p style="margin: 5px 0;"><strong style="color: #FFFFFF;">Fecha:</strong> ${formattedDate}</p>
                <p style="margin: 5px 0;"><strong style="color: #FFFFFF;">Lugar:</strong> ${event.venue_name}</p>
                ${event.venue_address ? `<p style="margin: 5px 0;"><strong style="color: #FFFFFF;">Dirección:</strong> ${event.venue_address}</p>` : ''}
                <p style="margin: 5px 0;"><strong style="color: #FFFFFF;">Total Pagado:</strong> <span style="color: #7C3AED; font-size: 18px; font-weight: bold;">$${purchase.total_amount.toLocaleString('es-AR')} ARS</span></p>
              </div>
            </div>

            <!-- Tickets -->
            <div style="margin-bottom: 30px;">
              <h3 style="color: #FFFFFF; font-size: 20px; margin: 0 0 20px 0;">Tus Entradas (${tickets.length})</h3>
              ${tickets.map((ticket: any, index: number) => {
                // Generar URL de QR code como imagen
                const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(ticket.qr_code)}`
                return `
                <div style="background-color: #1F1F1F; padding: 25px; border-radius: 12px; margin-bottom: 15px; border: 1px solid #2F2F2F;">
                  <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                    <div style="flex: 1;">
                      <p style="color: #FFFFFF; font-size: 18px; font-weight: bold; margin: 0 0 5px 0;">${ticket.ticket_type.name}</p>
                      <p style="color: #A3A3A3; font-size: 14px; font-family: monospace; margin: 0;">${ticket.ticket_number}</p>
                    </div>
                    <div style="background-color: #FFFFFF; padding: 10px; border-radius: 8px; margin-left: 20px;">
                      <img src="${qrImageUrl}" alt="QR Code" style="width: 120px; height: 120px; display: block;" />
                    </div>
                  </div>
                  <div style="border-top: 1px solid #2F2F2F; padding-top: 15px; margin-top: 15px;">
                    <p style="color: #A3A3A3; font-size: 12px; margin: 0 0 5px 0;">Código QR:</p>
                    <p style="color: #FFFFFF; font-size: 14px; font-family: monospace; word-break: break-all; margin: 0;">${ticket.qr_code}</p>
                  </div>
                </div>
              `}).join('')}
            </div>

            <!-- Instrucciones -->
            <div style="background-color: #7C3AED; padding: 20px; border-radius: 12px; margin-bottom: 30px; text-align: center;">
              <p style="color: #FFFFFF; font-size: 16px; font-weight: bold; margin: 0 0 10px 0;">
                Presenta este email o descarga el PDF desde "Mis Compras"
              </p>
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/mis-compras" style="color: #FFFFFF; text-decoration: underline; font-size: 14px;">
                Descargar PDF de Tickets
              </a>
            </div>

            <!-- Footer -->
            <div style="text-align: center; color: #A3A3A3; font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #2F2F2F;">
              <p style="margin: 5px 0;">Este es un email automático. Por favor, no respondas a este mensaje.</p>
              <p style="margin: 5px 0;">Synapse - Plataforma de Tickets</p>
              <p style="margin: 5px 0;">
                <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/mis-compras" style="color: #7C3AED; text-decoration: none;">Ver Mis Compras</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `

    // Determinar email destinatario
    // En desarrollo/testing, Resend solo permite enviar a tu email verificado
    const isDevelopment = process.env.NODE_ENV === 'development'
    const testingEmail = process.env.RESEND_TESTING_EMAIL || 'infoamnesiarental@gmail.com'
    const recipientEmail = isDevelopment ? testingEmail : email

    // Agregar nota de desarrollo al email si estamos en modo desarrollo
    const finalEmailHtml = isDevelopment
      ? emailHtml.replace(
          '<!-- Mensaje de bienvenida -->',
          `<!-- Mensaje de bienvenida -->
            <div style="background-color: #F59E0B; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 2px solid #D97706;">
              <p style="color: #000000; font-size: 14px; font-weight: bold; margin: 0;">
                ⚠️ MODO DESARROLLO: Este email fue enviado a ${testingEmail} para testing.
                <br>Email original del destinatario: <strong>${email}</strong>
              </p>
            </div>`
        )
      : emailHtml

    // Enviar email (sin PDF adjunto - el usuario puede descargarlo desde Mis Compras)
    const { data, error } = await resend.emails.send({
      from: 'Synapse <onboarding@resend.dev>', // Para desarrollo. Cambiar por tu dominio en producción
      to: recipientEmail,
      subject: `Tus Entradas - ${event.name}${isDevelopment ? ' [TESTING]' : ''}`,
      html: finalEmailHtml,
    })

    if (error) {
      console.error('Error enviando email:', error)
      return NextResponse.json(
        { error: 'Error al enviar el email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      messageId: data?.id,
    })
  } catch (error: any) {
    console.error('Error en send-tickets-email:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
