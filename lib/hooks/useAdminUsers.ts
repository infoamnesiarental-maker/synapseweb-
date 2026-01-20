'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface AdminUser {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  role: 'user' | 'producer' | 'admin'
  created_at: string
  purchases_count: number
  total_spent: number
  is_producer: boolean
  producer_name: string | null
}

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true)
        setError(null)

        // Obtener todos los usuarios
        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select('id, email, full_name, phone, role, created_at')
          .order('created_at', { ascending: false })

        if (usersError) {
          throw new Error(`Error obteniendo usuarios: ${usersError.message}`)
        }

        // Para cada usuario, obtener estadísticas
        const usersWithStats = await Promise.all(
          (usersData || []).map(async (user) => {
            // Contar compras
            const { count: purchasesCount, data: purchases } = await supabase
              .from('purchases')
              .select('total_amount', { count: 'exact' })
              .eq('user_id', user.id)
              .eq('payment_status', 'completed')

            const totalSpent = purchases?.reduce((sum, p) => sum + Number(p.total_amount || 0), 0) || 0

            // Verificar si es productora
            const { data: producer } = await supabase
              .from('producers')
              .select('name')
              .eq('user_id', user.id)
              .single()

            return {
              id: user.id,
              email: user.email,
              full_name: user.full_name,
              phone: user.phone,
              role: user.role,
              created_at: user.created_at,
              purchases_count: purchasesCount || 0,
              total_spent: totalSpent,
              is_producer: !!producer,
              producer_name: producer?.name || null,
            }
          })
        )

        setUsers(usersWithStats)
      } catch (err: any) {
        console.error('Error obteniendo usuarios:', err)
        setError(err.message || 'Error obteniendo usuarios')
        setUsers([])
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [supabase, refreshKey])

  const updateUserRole = async (userId: string, newRole: 'user' | 'producer' | 'admin') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) {
        throw new Error(error.message)
      }

      // Refrescar lista
      setRefreshKey(prev => prev + 1)
      return true
    } catch (err: any) {
      console.error('Error actualizando rol de usuario:', err)
      throw err
    }
  }

  return { users, loading, error, updateUserRole }
}
