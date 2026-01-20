'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface EventAnalytics {
  // Métricas generales
  totalRevenue: number
  ticketsSold: number
  ticketsAvailable: number // Tickets disponibles ahora (quantity_available - quantity_sold)
  totalTicketsOriginal: number // Total original de tickets (quantity_available)
  totalViews: number
  conversionRate: number
  averageTicketPrice: number
  
  // Ventas por día (para gráfico)
  salesByDay: Array<{
    date: string
    tickets: number
    revenue: number
  }>
  
  // Tickets por tipo
  ticketsByType: Array<{
    typeName: string
    sold: number
    available: number // Tickets disponibles ahora
    total: number // Total original (sold + available)
    revenue: number
  }>
  
  // Vistas por día (para gráfico)
  viewsByDay: Array<{
    date: string
    views: number
  }>
}

export function useEventAnalytics(eventId: string | null) {
  const [analytics, setAnalytics] = useState<EventAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (!eventId) {
      setLoading(false)
      return
    }

    async function fetchAnalytics() {
      try {
        setLoading(true)
        setError(null)

        // Obtener evento y tipos de tickets
        const { data: event, error: eventError } = await supabase
          .from('events')
          .select(`
            id,
            name,
            ticket_types(
              id,
              name,
              price,
              quantity_available,
              quantity_sold
            )
          `)
          .eq('id', eventId)
          .single()

        if (eventError || !event) {
          throw new Error(`Error obteniendo evento: ${eventError?.message}`)
        }

        // Obtener compras del evento
        const { data: purchases, error: purchasesError } = await supabase
          .from('purchases')
          .select('id, base_amount, created_at, total_amount')
          .eq('event_id', eventId)
          .eq('payment_status', 'completed')
          .order('created_at', { ascending: true })

        if (purchasesError) {
          console.warn('Error obteniendo compras:', purchasesError)
        }

        // Obtener tickets del evento con purchase_id
        const { data: tickets, error: ticketsError } = await supabase
          .from('tickets')
          .select(`
            id,
            purchase_id,
            ticket_type_id,
            created_at,
            ticket_type:ticket_types(name, price)
          `)
          .eq('event_id', eventId)
          .order('created_at', { ascending: true })

        if (ticketsError) {
          console.warn('Error obteniendo tickets:', ticketsError)
        }

        // Obtener vistas del evento
        const { data: views, error: viewsError } = await supabase
          .from('event_views')
          .select('id, viewed_at')
          .eq('event_id', eventId)
          .order('viewed_at', { ascending: true })

        if (viewsError) {
          console.warn('Error obteniendo vistas:', viewsError)
        }

        // Calcular métricas generales
        const totalRevenue = purchases?.reduce((sum, p) => sum + Number(p.base_amount || 0), 0) || 0
        const ticketsSold = tickets?.length || 0
        // Calcular tickets disponibles: quantity_available - quantity_sold
        const totalTicketsAvailable = event.ticket_types?.reduce(
          (sum, tt: any) => {
            const available = (tt.quantity_available || 0) - (tt.quantity_sold || 0)
            return sum + Math.max(0, available) // Asegurar que no sea negativo
          },
          0
        ) || 0
        // Calcular total original de tickets (quantity_available total)
        const totalTicketsOriginal = event.ticket_types?.reduce(
          (sum, tt: any) => sum + (tt.quantity_available || 0),
          0
        ) || 0
        const totalViews = views?.length || 0
        const conversionRate = totalViews > 0 ? (ticketsSold / totalViews) * 100 : 0
        const averageTicketPrice = ticketsSold > 0 ? totalRevenue / ticketsSold : 0

        // Calcular ventas por día usando tickets con purchase_id
        const salesByDayMap = new Map<string, { tickets: number; revenue: number }>()
        
        purchases?.forEach((purchase) => {
          const date = new Date(purchase.created_at).toISOString().split('T')[0]
          const existing = salesByDayMap.get(date) || { tickets: 0, revenue: 0 }
          
          // Contar tickets de esta compra
          const purchaseTickets = tickets?.filter(
            (t: any) => t.purchase_id === purchase.id
          ).length || 0
          
          salesByDayMap.set(date, {
            tickets: existing.tickets + purchaseTickets,
            revenue: existing.revenue + Number(purchase.base_amount || 0),
          })
        })

        // Convertir a array y ordenar por fecha
        const salesByDay = Array.from(salesByDayMap.entries())
          .map(([date, data]) => ({
            date,
            tickets: data.tickets,
            revenue: data.revenue,
          }))
          .sort((a, b) => a.date.localeCompare(b.date))

        // Calcular tickets por tipo
        const ticketsByTypeMap = new Map<string, { sold: number; available: number; total: number; revenue: number }>()
        
        event.ticket_types?.forEach((tt: any) => {
          const typeTickets = tickets?.filter((t: any) => t.ticket_type_id === tt.id) || []
          
          // Obtener compras que tienen tickets de este tipo
          const typePurchaseIds = new Set(
            typeTickets.map((t: any) => t.purchase_id).filter(Boolean)
          )
          const typePurchases = purchases?.filter((p) => typePurchaseIds.has(p.id)) || []
          
          // Calcular revenue: precio del ticket type × cantidad vendida
          const typeRevenue = typeTickets.length * Number(tt.price || 0)
          
          // Calcular tickets disponibles: quantity_available - quantity_sold
          const typeAvailable = Math.max(0, (tt.quantity_available || 0) - (tt.quantity_sold || 0))
          
          // Total original: quantity_available
          const typeTotal = tt.quantity_available || 0
          
          ticketsByTypeMap.set(tt.name, {
            sold: typeTickets.length,
            available: typeAvailable, // Tickets realmente disponibles
            total: typeTotal, // Total original
            revenue: typeRevenue,
          })
        })

        const ticketsByType = Array.from(ticketsByTypeMap.entries()).map(([typeName, data]) => ({
          typeName,
          ...data,
        }))

        // Calcular vistas por día
        const viewsByDayMap = new Map<string, number>()
        
        views?.forEach((view) => {
          const date = new Date(view.viewed_at).toISOString().split('T')[0]
          viewsByDayMap.set(date, (viewsByDayMap.get(date) || 0) + 1)
        })

        const viewsByDay = Array.from(viewsByDayMap.entries())
          .map(([date, views]) => ({
            date,
            views,
          }))
          .sort((a, b) => a.date.localeCompare(b.date))

        setAnalytics({
          totalRevenue,
          ticketsSold,
          ticketsAvailable: totalTicketsAvailable, // Tickets realmente disponibles (quantity_available - quantity_sold)
          totalTicketsOriginal: totalTicketsOriginal, // Total original de tickets
          totalViews,
          conversionRate,
          averageTicketPrice,
          salesByDay,
          ticketsByType,
          viewsByDay,
        })
      } catch (err: any) {
        setError(err.message || 'Error obteniendo analytics')
        console.error('Error en useEventAnalytics:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [eventId])

  return {
    analytics,
    loading,
    error,
  }
}
