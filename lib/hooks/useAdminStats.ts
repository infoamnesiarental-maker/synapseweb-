'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface AdminStats {
  totalUsers: number
  totalProducers: number
  activeProducers: number
  inactiveProducers: number
  totalEvents: number
  publishedEvents: number
  totalPurchases: number
  totalRevenue: number
  totalTickets: number
  completedPurchases: number
  pendingPurchases: number
}

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true)
        setError(null)

        // Obtener todas las estadísticas en paralelo
        const [
          { count: totalUsers },
          { count: totalProducers },
          { count: activeProducers },
          { count: inactiveProducers },
          { count: totalEvents },
          { count: publishedEvents },
          { count: totalPurchases },
          { count: completedPurchases },
          { count: pendingPurchases },
          { data: revenueData },
          { count: totalTickets },
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('producers').select('*', { count: 'exact', head: true }),
          supabase.from('producers').select('*', { count: 'exact', head: true }).eq('is_active', true),
          supabase.from('producers').select('*', { count: 'exact', head: true }).eq('is_active', false),
          supabase.from('events').select('*', { count: 'exact', head: true }),
          supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'published'),
          supabase.from('purchases').select('*', { count: 'exact', head: true }),
          supabase.from('purchases').select('*', { count: 'exact', head: true }).eq('payment_status', 'completed'),
          supabase.from('purchases').select('*', { count: 'exact', head: true }).eq('payment_status', 'pending'),
          supabase.from('purchases').select('total_amount').eq('payment_status', 'completed'),
          supabase.from('tickets').select('*', { count: 'exact', head: true }),
        ])

        const totalRevenue = revenueData?.reduce((sum, p) => sum + Number(p.total_amount || 0), 0) || 0

        setStats({
          totalUsers: totalUsers || 0,
          totalProducers: totalProducers || 0,
          activeProducers: activeProducers || 0,
          inactiveProducers: inactiveProducers || 0,
          totalEvents: totalEvents || 0,
          publishedEvents: publishedEvents || 0,
          totalPurchases: totalPurchases || 0,
          totalRevenue,
          totalTickets: totalTickets || 0,
          completedPurchases: completedPurchases || 0,
          pendingPurchases: pendingPurchases || 0,
        })
      } catch (err: any) {
        console.error('Error obteniendo estadísticas admin:', err)
        setError(err.message || 'Error obteniendo estadísticas')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [supabase])

  return { stats, loading, error }
}
