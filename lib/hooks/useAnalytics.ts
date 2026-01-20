'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface AnalyticsData {
  // Métricas generales
  totalRevenue: number
  totalTicketsSold: number
  totalTicketsAvailable: number
  totalTicketsOriginal: number
  averageTicketPrice: number
  totalViews: number
  conversionRate: number
  
  // Evolución por día
  evolutionByDay: Array<{
    date: string
    tickets: number
    revenue: number
    views: number
  }>
  
  // Heatmap de ventas (día de semana x hora)
  salesHeatmap: Array<{
    dayOfWeek: number // 0 = Lunes, 6 = Domingo
    hour: number // 0-23
    sales: number
  }>
  
  // Eventos analizados
  eventsAnalyzed: number
}

export interface AnalyticsFilters {
  dateFrom: Date | null
  dateTo: Date | null
  eventIds: string[] // Array vacío = todos los eventos
}

export function useAnalytics(producerId: string | null, filters: AnalyticsFilters) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (!producerId) {
      setLoading(false)
      return
    }

    async function fetchAnalytics() {
      try {
        setLoading(true)
        setError(null)

        // Obtener eventos de la productora
        let eventsQuery = supabase
          .from('events')
          .select('id, name, start_date')
          .eq('producer_id', producerId)

        const { data: allEvents, error: eventsError } = await eventsQuery

        if (eventsError || !allEvents || allEvents.length === 0) {
          setAnalytics({
            totalRevenue: 0,
            totalTicketsSold: 0,
            totalTicketsAvailable: 0,
            totalTicketsOriginal: 0,
            averageTicketPrice: 0,
            totalViews: 0,
            conversionRate: 0,
            evolutionByDay: [],
            salesHeatmap: [],
            eventsAnalyzed: 0,
          })
          setLoading(false)
          return
        }

        // Filtrar eventos si hay selección
        const eventIds = filters.eventIds.length > 0 
          ? filters.eventIds 
          : allEvents.map(e => e.id)

        const eventsAnalyzed = eventIds.length

        // Obtener compras filtradas
        let purchasesQuery = supabase
          .from('purchases')
          .select('id, base_amount, total_amount, created_at, event_id')
          .eq('payment_status', 'completed')
          .in('event_id', eventIds)

        if (filters.dateFrom) {
          purchasesQuery = purchasesQuery.gte('created_at', filters.dateFrom.toISOString())
        }
        if (filters.dateTo) {
          // Agregar 23:59:59 al final del día
          const endDate = new Date(filters.dateTo)
          endDate.setHours(23, 59, 59, 999)
          purchasesQuery = purchasesQuery.lte('created_at', endDate.toISOString())
        }

        const { data: purchases, error: purchasesError } = await purchasesQuery

        if (purchasesError) {
          console.warn('Error obteniendo compras:', purchasesError)
        }

        // Obtener tickets
        const { data: tickets, error: ticketsError } = await supabase
          .from('tickets')
          .select('id, purchase_id, created_at')
          .in('event_id', eventIds)

        if (ticketsError) {
          console.warn('Error obteniendo tickets:', ticketsError)
        }

        // Obtener vistas
        let viewsQuery = supabase
          .from('event_views')
          .select('id, viewed_at, event_id')
          .in('event_id', eventIds)

        if (filters.dateFrom) {
          viewsQuery = viewsQuery.gte('viewed_at', filters.dateFrom.toISOString())
        }
        if (filters.dateTo) {
          const endDate = new Date(filters.dateTo)
          endDate.setHours(23, 59, 59, 999)
          viewsQuery = viewsQuery.lte('viewed_at', endDate.toISOString())
        }

        const { data: views, error: viewsError } = await viewsQuery

        if (viewsError) {
          console.warn('Error obteniendo vistas:', viewsError)
        }

        // Obtener tipos de tickets para calcular disponibles
        const { data: ticketTypes, error: ticketTypesError } = await supabase
          .from('ticket_types')
          .select('quantity_available, quantity_sold')
          .in('event_id', eventIds)

        // Calcular métricas generales
        const totalRevenue = purchases?.reduce((sum, p) => sum + Number(p.base_amount || 0), 0) || 0
        const totalTicketsSold = tickets?.length || 0
        const totalTicketsOriginal = ticketTypes?.reduce((sum, tt) => sum + (tt.quantity_available || 0), 0) || 0
        const totalTicketsAvailable = ticketTypes?.reduce(
          (sum, tt) => sum + Math.max(0, (tt.quantity_available || 0) - (tt.quantity_sold || 0)),
          0
        ) || 0
        const totalViews = views?.length || 0
        const conversionRate = totalViews > 0 ? (totalTicketsSold / totalViews) * 100 : 0
        const averageTicketPrice = totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0

        // Calcular evolución por día
        const evolutionMap = new Map<string, { tickets: number; revenue: number; views: number }>()

        purchases?.forEach((purchase) => {
          const date = new Date(purchase.created_at).toISOString().split('T')[0]
          const existing = evolutionMap.get(date) || { tickets: 0, revenue: 0, views: 0 }
          const purchaseTickets = tickets?.filter(t => t.purchase_id === purchase.id).length || 0
          evolutionMap.set(date, {
            tickets: existing.tickets + purchaseTickets,
            revenue: existing.revenue + Number(purchase.base_amount || 0),
            views: existing.views,
          })
        })

        views?.forEach((view) => {
          const date = new Date(view.viewed_at).toISOString().split('T')[0]
          const existing = evolutionMap.get(date) || { tickets: 0, revenue: 0, views: 0 }
          evolutionMap.set(date, {
            ...existing,
            views: existing.views + 1,
          })
        })

        const evolutionByDay = Array.from(evolutionMap.entries())
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => a.date.localeCompare(b.date))

        // Calcular heatmap de ventas (día de semana x hora)
        const heatmapMap = new Map<string, number>()

        purchases?.forEach((purchase) => {
          const purchaseDate = new Date(purchase.created_at)
          const dayOfWeek = (purchaseDate.getDay() + 6) % 7 // Convertir a Lunes=0, Domingo=6
          const hour = purchaseDate.getHours()
          const key = `${dayOfWeek}-${hour}`
          const purchaseTickets = tickets?.filter(t => t.purchase_id === purchase.id).length || 0
          heatmapMap.set(key, (heatmapMap.get(key) || 0) + purchaseTickets)
        })

        const salesHeatmap = Array.from(heatmapMap.entries()).map(([key, sales]) => {
          const [dayOfWeek, hour] = key.split('-').map(Number)
          return { dayOfWeek, hour, sales }
        })

        setAnalytics({
          totalRevenue,
          totalTicketsSold,
          totalTicketsAvailable,
          totalTicketsOriginal,
          averageTicketPrice,
          totalViews,
          conversionRate,
          evolutionByDay,
          salesHeatmap,
          eventsAnalyzed,
        })
      } catch (err: any) {
        setError(err.message || 'Error obteniendo analytics')
        console.error('Error en useAnalytics:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [producerId, filters.dateFrom, filters.dateTo, JSON.stringify(filters.eventIds), supabase])

  return {
    analytics,
    loading,
    error,
  }
}
