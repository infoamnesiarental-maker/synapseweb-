'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Event {
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
}

export function useEvents(producerId: string | null) {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!producerId) {
      setLoading(false)
      return
    }

    async function fetchEvents() {
      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await supabase
          .from('events')
          .select('*')
          .eq('producer_id', producerId)
          .order('created_at', { ascending: false })

        if (fetchError) {
          console.error('Error obteniendo eventos:', fetchError)
          setError(fetchError.message)
          return
        }

        setEvents(data || [])
      } catch (err) {
        console.error('Error inesperado obteniendo eventos:', err)
        setError('Error al cargar los eventos')
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [producerId, supabase])

  async function deleteEvent(eventId: string, flyerUrl: string | null) {
    try {
      // 1. Eliminar la imagen del flyer del storage si existe
      if (flyerUrl) {
        try {
          const urlObj = new URL(flyerUrl)
          const pathname = urlObj.pathname
          const publicIndex = pathname.indexOf('/public/')
          
          if (publicIndex !== -1) {
            const pathAfterPublic = pathname.substring(publicIndex + '/public/'.length)
            let oldFilePath = pathAfterPublic
            
            // Si empieza con "event-flyers/event-flyers/", quitar el primer "event-flyers/"
            if (pathAfterPublic.startsWith('event-flyers/event-flyers/')) {
              oldFilePath = pathAfterPublic.substring('event-flyers/'.length)
            }
            
            const { error: deleteImageError } = await supabase.storage
              .from('event-flyers')
              .remove([oldFilePath])
            
            if (deleteImageError) {
              console.warn('⚠️ No se pudo eliminar la imagen del flyer:', deleteImageError.message)
            } else {
              console.log('✅ Imagen del flyer eliminada correctamente')
            }
          }
        } catch (err) {
          console.warn('⚠️ Error al intentar eliminar imagen del flyer:', err)
        }
      }

      // 2. Eliminar el evento de la base de datos (esto eliminará en cascada los ticket_types y tickets relacionados)
      console.log('🗑️ Intentando eliminar evento:', eventId)
      
      const { data, error: deleteError } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)
        .select()

      if (deleteError) {
        console.error('❌ Error eliminando evento:', deleteError)
        console.error('❌ Código de error:', deleteError.code)
        console.error('❌ Mensaje:', deleteError.message)
        console.error('❌ Detalles:', deleteError.details)
        throw new Error(deleteError.message || 'No se pudo eliminar el evento. Verifica las políticas RLS.')
      }

      console.log('✅ Evento eliminado correctamente:', data)

      // 3. Actualizar la lista local
      setEvents((prevEvents) => prevEvents.filter((e) => e.id !== eventId))
      
      return { success: true }
    } catch (err) {
      console.error('Error inesperado eliminando evento:', err)
      throw err
    }
  }

  return { events, loading, error, deleteEvent, refetch: () => {
    if (producerId) {
      // Trigger re-fetch
      setLoading(true)
    }
  } }
}
