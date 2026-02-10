'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { canTransfer, getRemainingHoursUntilTransfer } from '@/lib/utils/pricing'

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
    payment_status?: 'pending' | 'completed' | 'failed' | 'refunded'
    payment_provider_data?: any // Para acceder a mp_status
  }
  event?: {
    id: string
    name: string
    start_date: string
    end_date: string
  }
  // Estado de Mercado Pago (extraído de payment_provider_data)
  mp_status?: string | null
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
          purchase:purchases(id, total_amount, base_amount, commission_amount, created_at, payment_status, payment_provider_data),
          event:events(id, name, start_date, end_date)
        `)
        .eq('producer_id', producerId)
        .order('created_at', { ascending: false })

      if (fetchError) {
        throw new Error(`Error obteniendo transferencias: ${fetchError.message}`)
      }

      // Las transferencias ahora solo se crean cuando el pago se completa
      // No necesitamos sincronización porque no se crean para pagos fallidos
      // Extraer mp_status de payment_provider_data para mostrar en dashboard
      const transfersWithMpStatus = (data || []).map((transfer: any) => {
        const purchase = transfer.purchase
        let mpStatus: string | null = null
        
        if (purchase?.payment_provider_data) {
          // payment_provider_data puede ser un objeto o un string JSON
          let providerData = purchase.payment_provider_data
          if (typeof providerData === 'string') {
            try {
              providerData = JSON.parse(providerData)
            } catch (e) {
              // Si no se puede parsear, usar null
            }
          }
          
          if (providerData && typeof providerData === 'object') {
            mpStatus = providerData.status || null
          }
        }

        return {
          ...transfer,
          mp_status: mpStatus,
        }
      })

      setTransfers(transfersWithMpStatus)
    } catch (err: any) {
      setError(err.message || 'Error obteniendo transferencias')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Simula una transferencia (en producción esto se haría con Mercado Pago)
   * Valida que haya pasado el plazo mínimo de 240 horas según Manual V1
   */
  async function processTransfer(transferId: string) {
    setLoading(true)
    setError(null)

    try {
      // Obtener la transferencia con la información de la compra
      const { data: transfer, error: fetchError } = await supabase
        .from('transfers')
        .select(`
          *,
          purchase:purchases(id, created_at, settlement_status, money_release_date)
        `)
        .eq('id', transferId)
        .single()

      if (fetchError || !transfer) {
        throw new Error(`Error obteniendo transferencia: ${fetchError?.message}`)
      }

      // Validar plazo mínimo (240 horas = 10 días)
      if (transfer.purchase && typeof transfer.purchase === 'object' && 'created_at' in transfer.purchase) {
        const purchaseCreatedAt = transfer.purchase.created_at as string
        
        if (!canTransfer(purchaseCreatedAt)) {
          const remainingHours = getRemainingHoursUntilTransfer(purchaseCreatedAt)
          const remainingDays = Math.ceil(remainingHours / 24)
          throw new Error(
            `No se puede transferir aún. Faltan ${remainingHours} horas (${remainingDays} días) para cumplir el plazo mínimo de 240 horas desde la compra.`
          )
        }

        // Verificar que el pago esté completado
        const { data: purchase } = await supabase
          .from('purchases')
          .select('payment_status, settlement_status')
          .eq('id', transfer.purchase_id)
          .single()

        if (purchase?.payment_status !== 'completed') {
          throw new Error('No se puede transferir: el pago aún no está completado.')
        }

        if (purchase?.settlement_status !== 'ready') {
          throw new Error('No se puede transferir: el pago aún no está listo para liquidar.')
        }
      }

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

      // Actualizar settlement_status de la compra
      if (transfer.purchase_id) {
        await supabase
          .from('purchases')
          .update({ settlement_status: 'transferred' })
          .eq('id', transfer.purchase_id)
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
