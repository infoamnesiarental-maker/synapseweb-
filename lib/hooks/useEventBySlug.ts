'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PublicEvent } from './usePublicEvents'

export interface TicketType {
  id: string
  event_id: string
  name: string
  description: string | null
  price: number
  quantity_available: number
  quantity_sold: number
  sale_start_date: string | null
  sale_end_date: string | null
  created_at: string
  updated_at: string
}

export interface EventWithTickets extends PublicEvent {
  ticket_types: TicketType[]
}

export function useEventBySlug(slug: string | null) {
  const [event, setEvent] = useState<EventWithTickets | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!slug) {
      setLoading(false)
      return
    }

    async function fetchEvent() {
      try {
        setLoading(true)
        setError(null)

        // Obtener el evento
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('slug', slug)
          .eq('status', 'published')
          .not('published_at', 'is', null)
          .single()

        if (eventError) {
          console.error('Error obteniendo evento:', eventError)
          setError(eventError.message)
          return
        }

        if (!eventData) {
          setError('Evento no encontrado')
          return
        }

        // Obtener los tipos de tickets
        const { data: ticketTypesData, error: ticketsError } = await supabase
          .from('ticket_types')
          .select('*')
          .eq('event_id', eventData.id)
          .order('price', { ascending: true })

        if (ticketsError) {
          console.error('Error obteniendo tipos de tickets:', ticketsError)
          // No fallar si no hay tickets, solo loguear
        }

        setEvent({
          ...eventData,
          ticket_types: ticketTypesData || [],
        })
      } catch (err) {
        console.error('Error inesperado obteniendo evento:', err)
        setError('Error al cargar el evento')
      } finally {
        setLoading(false)
      }
    }

    fetchEvent()
  }, [slug, supabase])

  return { event, loading, error }
}
