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

      // Guardar información de los tickets comprados para crearlos después en el webhook
      const ticketsData = params.tickets.map(t => ({
        ticketTypeId: t.ticketTypeId,
        ticketTypeName: t.ticketTypeName,
        quantity: t.quantity,
        basePrice: t.basePrice,
      }))

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
          // Guardar información de tickets en payment_provider_data para crearlos después
          payment_provider_data: {
            tickets_data: ticketsData,
          },
        })
        .select()
        .single()

      if (purchaseError) {
        throw new Error(`Error creando compra: ${purchaseError.message}`)
      }

      // ⚠️ IMPORTANTE: NO crear tickets aquí
      // Los tickets se crearán SOLO cuando el webhook confirme que el pago fue completado
      // Esto previene que se generen tickets para pagos rechazados

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

      // PRODUCCIÓN: Usar paymentUrl del servidor (siempre es init_point de producción)
      const paymentUrl = preferenceData.paymentUrl || preferenceData.initPoint
      
      if (!paymentUrl) {
        console.error('❌ ERROR: No hay URL de pago disponible')
        throw new Error('No se pudo obtener la URL de pago de Mercado Pago. Verifica que el token sea de producción (APP_USR-).')
      }
      
      console.log('✅ URL de pago de PRODUCCIÓN obtenida:', {
        paymentUrl: paymentUrl.substring(0, 50) + '...',
        preferenceId: preferenceData.preferenceId,
      })

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
