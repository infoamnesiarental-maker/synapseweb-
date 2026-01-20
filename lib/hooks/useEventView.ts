'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Hook para registrar una vista de evento
 * Evita duplicados usando sessionStorage
 */
export function useEventView(eventId: string | null) {
  const supabase = createClient()
  const hasRecordedView = useRef(false)

  useEffect(() => {
    if (!eventId || hasRecordedView.current) return

    async function recordView() {
      try {
        // Verificar si ya se registró esta vista en esta sesión
        const viewKey = `event_view_${eventId}`
        const hasViewed = sessionStorage.getItem(viewKey)
        
        if (hasViewed) {
          hasRecordedView.current = true
          return
        }

        // Obtener el usuario actual (si está autenticado)
        const {
          data: { user },
        } = await supabase.auth.getUser()

        // Registrar la vista
        const { error } = await supabase.from('event_views').insert({
          event_id: eventId,
          user_id: user?.id || null,
          // ip_address se puede obtener del servidor si es necesario
        })

        if (error) {
          console.error('Error registrando vista:', error)
          return
        }

        // Marcar como vista en sessionStorage
        sessionStorage.setItem(viewKey, 'true')
        hasRecordedView.current = true
      } catch (err) {
        console.error('Error inesperado registrando vista:', err)
      }
    }

    // Esperar un poco antes de registrar (para evitar registros de bots)
    const timer = setTimeout(() => {
      recordView()
    }, 1000)

    return () => clearTimeout(timer)
  }, [eventId, supabase])
}
