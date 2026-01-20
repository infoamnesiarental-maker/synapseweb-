'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface PublicEvent {
  id: string
  name: string
  slug: string
  description: string | null
  category: string | null
  start_date: string
  end_date: string
  venue_name: string
  venue_address: string | null
  venue_city: string | null
  flyer_url: string | null
  status: 'draft' | 'published' | 'finished' | 'cancelled'
  published_at: string | null
  created_at: string
  updated_at: string
  min_price?: number
  total_tickets_available?: number
}

interface UsePublicEventsOptions {
  category?: string | null
  searchQuery?: string
  dateFrom?: Date | null
  dateTo?: Date | null
}

export function usePublicEvents(options: UsePublicEventsOptions = {}) {
  const [events, setEvents] = useState<PublicEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true)
        setError(null)

        let query = supabase
          .from('events')
          .select(
            `
            *,
            ticket_types (
              id,
              price,
              quantity_available,
              quantity_sold,
              sale_start_date,
              sale_end_date
            )
          `
          )
          .eq('status', 'published')
          .not('published_at', 'is', null)
          .order('start_date', { ascending: true })

        // Filtro por categoría
        if (options.category) {
          query = query.eq('category', options.category)
        }

        // Filtro por búsqueda (nombre o descripción)
        if (options.searchQuery) {
          query = query.or(
            `name.ilike.%${options.searchQuery}%,description.ilike.%${options.searchQuery}%`
          )
        }

        // Filtro por fecha desde
        if (options.dateFrom) {
          query = query.gte('start_date', options.dateFrom.toISOString())
        }

        // Filtro por fecha hasta
        if (options.dateTo) {
          query = query.lte('start_date', options.dateTo.toISOString())
        }

        const { data, error: fetchError } = await query

        if (fetchError) {
          console.error('Error obteniendo eventos públicos:', fetchError)
          setError(fetchError.message)
          return
        }

        // Procesar eventos para calcular min_price y total_tickets_available
        const processedEvents = (data || []).map((event: any) => {
          const now = new Date()
          
          // Filtrar tickets disponibles - lógica más flexible
          const availableTickets = (event.ticket_types || []).filter((tt: any) => {
            // Verificar que hay tickets disponibles
            const available = (tt.quantity_available || 0) - (tt.quantity_sold || 0) > 0
            
            // Si no hay fecha de inicio de venta, considerar que la venta ya comenzó
            const saleStarted = !tt.sale_start_date || new Date(tt.sale_start_date) <= now
            
            // Si no hay fecha de fin de venta, considerar que la venta no ha terminado
            const saleNotEnded = !tt.sale_end_date || new Date(tt.sale_end_date) >= now
            
            return available && saleStarted && saleNotEnded
          })

          const minPrice =
            availableTickets.length > 0
              ? Math.min(...availableTickets.map((tt: any) => Number(tt.price)))
              : 0

          // Calcular total de tickets disponibles (suma de todos los tickets disponibles)
          const totalAvailable = availableTickets.reduce(
            (sum: number, tt: any) => {
              const available = (tt.quantity_available || 0) - (tt.quantity_sold || 0)
              return sum + Math.max(0, available)
            },
            0
          )

          return {
            ...event,
            min_price: minPrice,
            total_tickets_available: totalAvailable > 0 ? totalAvailable : undefined,
          }
        })

        setEvents(processedEvents)
      } catch (err) {
        console.error('Error inesperado obteniendo eventos públicos:', err)
        setError('Error al cargar los eventos')
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [options.category, options.searchQuery, options.dateFrom, options.dateTo, supabase])

  return { events, loading, error }
}
