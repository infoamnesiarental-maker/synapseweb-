'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface AdminProducer {
  id: string
  user_id: string
  name: string
  description: string | null
  email_contact: string | null
  is_active: boolean
  created_at: string
  user: {
    email: string
    full_name: string | null
  } | null
  events_count: number
  total_revenue: number
}

export function useAdminProducers() {
  const [producers, setProducers] = useState<AdminProducer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function fetchProducers() {
      try {
        setLoading(true)
        setError(null)

        // Obtener todas las productoras con información del usuario
        const { data: producersData, error: producersError } = await supabase
          .from('producers')
          .select(`
            id,
            user_id,
            name,
            description,
            email_contact,
            is_active,
            created_at,
            user:profiles(
              email,
              full_name
            )
          `)
          .order('created_at', { ascending: false })

        if (producersError) {
          throw new Error(`Error obteniendo productoras: ${producersError.message}`)
        }

        // Para cada productora, obtener estadísticas
        const producersWithStats = await Promise.all(
          (producersData || []).map(async (producer: any) => {
            // Contar eventos
            const { count: eventsCount } = await supabase
              .from('events')
              .select('*', { count: 'exact', head: true })
              .eq('producer_id', producer.id)

            // Obtener eventos de la productora
            const { data: events } = await supabase
              .from('events')
              .select('id')
              .eq('producer_id', producer.id)

            const eventIds = events?.map(e => e.id) || []

            // Obtener revenue total
            let totalRevenue = 0
            if (eventIds.length > 0) {
              const { data: purchases } = await supabase
                .from('purchases')
                .select('total_amount')
                .eq('payment_status', 'completed')
                .in('event_id', eventIds)

              totalRevenue = purchases?.reduce((sum, p) => sum + Number(p.total_amount || 0), 0) || 0
            }

            return {
              id: producer.id,
              user_id: producer.user_id,
              name: producer.name,
              description: producer.description,
              email_contact: producer.email_contact,
              is_active: producer.is_active,
              created_at: producer.created_at,
              user: Array.isArray(producer.user) ? producer.user[0] : producer.user,
              events_count: eventsCount || 0,
              total_revenue: totalRevenue,
            }
          })
        )

        setProducers(producersWithStats)
      } catch (err: any) {
        console.error('Error obteniendo productoras:', err)
        setError(err.message || 'Error obteniendo productoras')
        setProducers([])
      } finally {
        setLoading(false)
      }
    }

    fetchProducers()
  }, [supabase, refreshKey])

  const toggleProducerStatus = async (producerId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('producers')
        .update({ is_active: !currentStatus })
        .eq('id', producerId)

      if (error) {
        throw new Error(error.message)
      }

      // Refrescar lista
      setRefreshKey(prev => prev + 1)
      return true
    } catch (err: any) {
      console.error('Error actualizando productora:', err)
      throw err
    }
  }

  return { producers, loading, error, toggleProducerStatus }
}
