'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Transfer {
  id: string
  purchase_id: string
  event_id: string
  producer_id: string
  amount: number
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  transfer_method: string | null
  transfer_reference: string | null
  scheduled_at: string | null
  transferred_at: string | null
  created_at: string
  updated_at: string
  // Relaciones
  purchase?: {
    id: string
    total_amount: number
    base_amount: number
    commission_amount: number
    created_at: string
  }
  event?: {
    id: string
    name: string
    start_date: string
    end_date: string
  }
}

export function useTransfers(producerId?: string) {
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (producerId) {
      fetchTransfers()
    }
  }, [producerId])

  async function fetchTransfers() {
    if (!producerId) return

    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('transfers')
        .select(`
          *,
          purchase:purchases(id, total_amount, base_amount, commission_amount, created_at),
          event:events(id, name, start_date, end_date)
        `)
        .eq('producer_id', producerId)
        .order('created_at', { ascending: false })

      if (fetchError) {
        throw new Error(`Error obteniendo transferencias: ${fetchError.message}`)
      }

      setTransfers(data || [])
    } catch (err: any) {
      setError(err.message || 'Error obteniendo transferencias')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Simula una transferencia (en producción esto se haría con Mercado Pago)
   */
  async function processTransfer(transferId: string) {
    setLoading(true)
    setError(null)

    try {
      // En MVP, solo marcamos como completada
      // En producción, aquí se haría la transferencia real con Mercado Pago
      const { error: updateError } = await supabase
        .from('transfers')
        .update({
          status: 'completed',
          transferred_at: new Date().toISOString(),
          transfer_method: 'manual', // En producción sería 'mercadopago'
        })
        .eq('id', transferId)

      if (updateError) {
        throw new Error(`Error procesando transferencia: ${updateError.message}`)
      }

      // Refrescar lista
      await fetchTransfers()

      return { success: true }
    } catch (err: any) {
      setError(err.message || 'Error procesando transferencia')
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }

  // Calcular totales
  const totals = {
    pending: transfers
      .filter((t) => t.status === 'pending')
      .reduce((sum, t) => sum + Number(t.amount), 0),
    completed: transfers
      .filter((t) => t.status === 'completed')
      .reduce((sum, t) => sum + Number(t.amount), 0),
    total: transfers.reduce((sum, t) => sum + Number(t.amount), 0),
  }

  return {
    transfers,
    loading,
    error,
    totals,
    processTransfer,
    refetch: fetchTransfers,
  }
}
