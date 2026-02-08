'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calculatePrice, calculateTotalPrice, calculateFinancialBreakdown, MIN_SETTLEMENT_HOURS, PriceBreakdown } from '@/lib/utils/pricing'

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

      // Calcular desglose financiero completo según Manual V1
      const purchaseDate = new Date() // Fecha actual (cuando se crea la compra)
      const financialBreakdown = calculateFinancialBreakdown(totalBreakdown.basePrice, purchaseDate)

      // Crear la compra con todos los campos financieros
      const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          user_id: params.userId || null,
          guest_email: params.guestEmail || null,
          guest_name: params.guestName || null,
          guest_phone: params.guestPhone || null,
          event_id: params.eventId,
          total_amount: financialBreakdown.totalAmount,
          base_amount: financialBreakdown.baseAmount,
          commission_amount: financialBreakdown.commissionAmount,
          // Gastos operativos (7.73% del total cobrado)
          operating_costs: financialBreakdown.operatingCosts.total,
          mercadopago_commission: financialBreakdown.operatingCosts.mercadopagoCommission,
          iva_commission: financialBreakdown.operatingCosts.ivaCommission,
          iibb_retention: financialBreakdown.operatingCosts.iibbRetention,
          // Resultados financieros
          net_amount: financialBreakdown.netAmount,
          net_margin: financialBreakdown.netMargin,
          money_release_date: financialBreakdown.moneyReleaseDate.toISOString(),
          settlement_status: 'pending',
          payment_method: 'mercadopago',
          payment_status: 'pending',
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

      // Calcular cuándo transferir (240 horas = 10 días después de la compra)
      // Según Manual V1: No transferir antes de 240 horas desde purchase.created_at
      const scheduledAt = new Date(
        purchaseDate.getTime() + MIN_SETTLEMENT_HOURS * 60 * 60 * 1000
      ) // 240 horas después de la compra

      // Crear transferencia pendiente (opcional - no bloquea el flujo si falla)
      try {
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
          console.warn('⚠️ Error creando transferencia (no crítico):', transferError)
          // No lanzamos error - la transferencia se puede crear después manualmente o por un proceso batch
        }
      } catch (transferErr: any) {
        console.warn('⚠️ Excepción al crear transferencia (no crítico):', transferErr)
        // Continuar con el flujo aunque falle la transferencia
      }

      // Crear preferencia de pago en Mercado Pago
      // Obtener email del comprador
      let buyerEmail = params.guestEmail
      let buyerName = params.guestName
      
      if (params.userId && !buyerEmail) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', params.userId)
          .single()
        
        if (profile) {
          buyerEmail = profile.email || undefined
          buyerName = profile.full_name || undefined
        }
      }

      if (!buyerEmail) {
        throw new Error('Email del comprador requerido')
      }

      // Llamar a la API para crear la preferencia de Mercado Pago
      console.log('📞 Llamando a /api/mercadopago/create-preference con:', {
        ticketsCount: params.tickets.length,
        eventId: params.eventId,
        purchaseId: purchase.id,
        buyerEmail,
      })
      
      const preferenceResponse = await fetch('/api/mercadopago/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tickets: params.tickets,
          eventId: params.eventId,
          purchaseId: purchase.id,
          buyerEmail,
          buyerName,
          buyerPhone: params.guestPhone,
        }),
      })

      console.log('📥 Respuesta recibida:', {
        status: preferenceResponse.status,
        statusText: preferenceResponse.statusText,
        contentType: preferenceResponse.headers.get('content-type'),
        ok: preferenceResponse.ok,
      })

      // Verificar el Content-Type antes de parsear JSON
      const contentType = preferenceResponse.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await preferenceResponse.text()
        console.error('❌ Respuesta no JSON recibida. Status:', preferenceResponse.status)
        console.error('❌ Content-Type:', contentType)
        console.error('❌ Primeros 500 caracteres de la respuesta:', textResponse.substring(0, 500))
        throw new Error(`Error del servidor: La respuesta no es JSON. Status: ${preferenceResponse.status}. Ver consola para más detalles.`)
      }

      if (!preferenceResponse.ok) {
        try {
          const errorData = await preferenceResponse.json()
          throw new Error(errorData.error || `Error creando preferencia de pago (${preferenceResponse.status})`)
        } catch (jsonError) {
          const textResponse = await preferenceResponse.text()
          throw new Error(`Error del servidor (${preferenceResponse.status}): ${textResponse.substring(0, 200)}`)
        }
      }

      const preferenceData = await preferenceResponse.json()

      if (!preferenceData.success) {
        throw new Error(preferenceData.error || 'Error creando preferencia de pago')
      }

      // Retornar la URL de pago para redirigir al usuario
      // IMPORTANTE: Según la documentación de Mercado Pago y casos reales, cuando usas
      // credenciales de prueba del vendedor de prueba, debes usar initPoint (producción),
      // NO sandboxInitPoint. Esto es porque las cuentas de prueba funcionan con producción.
      // 
      // El servidor ya seleccionó la URL correcta en paymentUrl, así que la usamos directamente
      const paymentUrl = preferenceData.paymentUrl || preferenceData.initPoint || preferenceData.sandboxInitPoint
      
      console.log('🔗 URL de pago seleccionada:', {
        hasSandboxInitPoint: !!preferenceData.sandboxInitPoint,
        hasInitPoint: !!preferenceData.initPoint,
        sandboxUrl: preferenceData.sandboxInitPoint?.substring(0, 50) + '...',
        productionUrl: preferenceData.initPoint?.substring(0, 50) + '...',
        selectedUrl: paymentUrl?.substring(0, 50) + '...',
        isUsingSandbox: paymentUrl === preferenceData.sandboxInitPoint,
        recommendation: preferenceData.paymentUrl 
          ? 'Usando URL seleccionada por el servidor' 
          : preferenceData.initPoint 
          ? 'Usando URL de producción (recomendado para credenciales de prueba)' 
          : 'Usando URL de sandbox (si está disponible)',
      })
      
      if (!paymentUrl) {
        console.error('❌ ERROR: No hay URL de pago disponible')
        throw new Error('No se pudo obtener la URL de pago de Mercado Pago')
      } else {
        console.log('✅ URL de pago obtenida correctamente')
      }

      return {
        success: true,
        purchaseId: purchase.id,
        purchase,
        paymentUrl, // URL correcta según el modo (prueba o producción)
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
