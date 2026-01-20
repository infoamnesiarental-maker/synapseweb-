'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calculatePrice, calculateTotalPrice, PriceBreakdown } from '@/lib/utils/pricing'

export interface CheckoutTicket {
  ticketTypeId: string
  ticketTypeName: string
  quantity: number
  basePrice: number
  eventId: string
}

export interface CheckoutData {
  tickets: CheckoutTicket[]
  eventId: string
  eventName: string
  breakdown: PriceBreakdown
}

interface CreatePurchaseParams {
  tickets: CheckoutTicket[]
  eventId: string
  userId?: string
  guestEmail?: string
  guestName?: string
  guestPhone?: string
}

export function useCheckout() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  /**
   * Crea una compra y genera los tickets
   */
  async function createPurchase(params: CreatePurchaseParams) {
    setLoading(true)
    setError(null)

    try {
      // Calcular precios
      const totalBreakdown = calculateTotalPrice(
        params.tickets.map((t) => ({
          ticketTypeId: t.ticketTypeId,
          quantity: t.quantity,
          basePrice: t.basePrice,
        }))
      )

      // Crear la compra
      const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          user_id: params.userId || null,
          guest_email: params.guestEmail || null,
          guest_name: params.guestName || null,
          guest_phone: params.guestPhone || null,
          event_id: params.eventId,
          total_amount: totalBreakdown.totalPrice,
          base_amount: totalBreakdown.basePrice,
          commission_amount: totalBreakdown.commission,
          payment_method: 'mercadopago', // Por ahora siempre mercadopago
          payment_status: 'pending', // En MVP, marcamos como pending (simulado)
        })
        .select()
        .single()

      if (purchaseError) {
        throw new Error(`Error creando compra: ${purchaseError.message}`)
      }

      // Crear los tickets
      const ticketsToInsert = []
      
      for (const ticket of params.tickets) {
        // Obtener información del ticket type
        const { data: ticketType, error: ticketTypeError } = await supabase
          .from('ticket_types')
          .select('*')
          .eq('id', ticket.ticketTypeId)
          .single()

        if (ticketTypeError || !ticketType) {
          throw new Error(`Error obteniendo tipo de ticket: ${ticketTypeError?.message}`)
        }

        // Verificar disponibilidad
        const available = ticketType.quantity_available - ticketType.quantity_sold
        if (available < ticket.quantity) {
          throw new Error(`No hay suficientes tickets disponibles para ${ticketType.name}`)
        }

        // Crear un ticket por cada cantidad
        for (let i = 0; i < ticket.quantity; i++) {
          const ticketId = crypto.randomUUID()
          
          // Generar ticket_number
          const eventPrefix = params.eventId.substring(0, 8).toUpperCase()
          const ticketNumber = `EVT-${eventPrefix}-${String(Date.now()).slice(-6)}-${String(i + 1).padStart(3, '0')}`
          
          // Generar QR code
          const qrCode = `SYN-${ticketId.substring(0, 8).toUpperCase()}-${crypto.randomUUID().substring(0, 8).toUpperCase()}`
          
          // Generar QR hash (simplificado)
          const qrHash = await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(`${ticketId}${qrCode}${Date.now()}`)
          ).then((hashBuffer) => {
            const hashArray = Array.from(new Uint8Array(hashBuffer))
            return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
          })

          ticketsToInsert.push({
            purchase_id: purchase.id,
            ticket_type_id: ticket.ticketTypeId,
            event_id: params.eventId,
            ticket_number: ticketNumber,
            qr_code: qrCode,
            qr_hash: qrHash,
            status: 'valid',
          })
        }
      }

      // Insertar todos los tickets
      const { error: ticketsError } = await supabase
        .from('tickets')
        .insert(ticketsToInsert)

      if (ticketsError) {
        throw new Error(`Error creando tickets: ${ticketsError.message}`)
      }

      // Crear registro de transferencia pendiente
      // Primero obtener el producer_id del evento
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('producer_id')
        .eq('id', params.eventId)
        .single()

      if (eventError || !eventData) {
        throw new Error(`Error obteniendo evento: ${eventError?.message}`)
      }

      // Calcular cuándo transferir (24-48hs después del evento)
      const { data: eventDates } = await supabase
        .from('events')
        .select('end_date')
        .eq('id', params.eventId)
        .single()

      const endDate = eventDates?.end_date ? new Date(eventDates.end_date) : new Date()
      const scheduledAt = new Date(endDate.getTime() + 48 * 60 * 60 * 1000) // 48 horas después

      // Crear transferencia pendiente
      const { error: transferError } = await supabase
        .from('transfers')
        .insert({
          purchase_id: purchase.id,
          event_id: params.eventId,
          producer_id: eventData.producer_id,
          amount: totalBreakdown.basePrice, // Solo el precio base de la productora
          status: 'pending',
          scheduled_at: scheduledAt.toISOString(),
        })

      if (transferError) {
        console.warn('Error creando transferencia:', transferError)
        // No lanzamos error, solo logueamos (la transferencia se puede crear después)
      }

      // En MVP, marcamos el pago como completado (simulado)
      // En producción, esto se actualizaría cuando Mercado Pago confirme el pago
      const { error: updateError } = await supabase
        .from('purchases')
        .update({ payment_status: 'completed' })
        .eq('id', purchase.id)

      if (updateError) {
        console.warn('Error actualizando estado de pago:', updateError)
      }

      // Enviar email con tickets (no bloqueante)
      const emailToSend = params.userId 
        ? undefined // Si es usuario registrado, obtendremos el email del perfil
        : params.guestEmail

      if (emailToSend) {
        // Enviar email de forma asíncrona (no bloquea la respuesta)
        fetch('/api/send-tickets-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            purchaseId: purchase.id,
            email: emailToSend,
            userName: params.guestName || undefined,
          }),
        }).catch((err) => {
          console.warn('Error enviando email (no crítico):', err)
          // No lanzamos error, el email se puede enviar después
        })
      } else if (params.userId) {
        // Si es usuario registrado, obtener email del perfil
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', params.userId)
          .single()

        if (profile?.email) {
          fetch('/api/send-tickets-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              purchaseId: purchase.id,
              email: profile.email,
              userName: profile.full_name || undefined,
            }),
          }).catch((err) => {
            console.warn('Error enviando email (no crítico):', err)
          })
        }
      }

      return {
        success: true,
        purchaseId: purchase.id,
        purchase,
      }
    } catch (err: any) {
      setError(err.message || 'Error procesando compra')
      return {
        success: false,
        error: err.message || 'Error procesando compra',
      }
    } finally {
      setLoading(false)
    }
  }

  return {
    createPurchase,
    loading,
    error,
  }
}
