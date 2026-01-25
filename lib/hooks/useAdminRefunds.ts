'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface AdminRefundRequest {
  id: string
  purchase_id: string
  ticket_id: string | null
  user_id: string | null
  guest_email: string | null
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  refund_amount: number | null
  created_at: string
  processed_at: string | null
  processed_by: string | null
  purchase: {
    id: string
    total_amount: number
    base_amount: number
    commission_amount: number
    payment_status: string
    payment_provider_id: string | null
    created_at: string
    event: {
      id: string
      name: string
      start_date: string
      end_date: string
      status: string
    }
    user: {
      email: string
      full_name: string | null
    } | null
    guest_email: string | null
    guest_name: string | null
  }
  ticket: {
    ticket_number: string
    ticket_type: {
      name: string
    }
  } | null
}

export type RefundType = 
  | 'right_of_withdrawal' // Derecho de arrepentimiento (10 días + 24hs antes)
  | 'event_cancellation' // Cancelación total del evento
  | 'date_change' // Cambio de fecha/horario
  | 'venue_change' // Cambio de lugar
  | 'substantial_change' // Otras modificaciones sustanciales
  | 'other' // Otros motivos

export interface RefundCalculation {
  refundableAmount: number
  serviceFeeRefundable: boolean
  reason: string
  type: RefundType
}

/**
 * Calcula el monto reembolsable según las políticas
 */
export function calculateRefundableAmount(
  purchase: AdminRefundRequest['purchase'],
  refundType: RefundType,
  eventStartDate: Date
): RefundCalculation {
  const now = new Date()
  const purchaseDate = new Date(purchase.created_at)
  const daysSincePurchase = Math.floor((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24))
  const hoursUntilEvent = Math.floor((eventStartDate.getTime() - now.getTime()) / (1000 * 60 * 60))

  // Derecho de arrepentimiento: 10 días + 24hs antes del evento
  const isWithinWithdrawalPeriod = daysSincePurchase <= 10 && hoursUntilEvent >= 24

  switch (refundType) {
    case 'right_of_withdrawal':
      if (isWithinWithdrawalPeriod) {
        return {
          refundableAmount: purchase.total_amount, // Incluye cargo por servicio
          serviceFeeRefundable: true,
          reason: 'Derecho de arrepentimiento (Art. 34 Ley 24.240)',
          type: 'right_of_withdrawal',
        }
      } else {
        return {
          refundableAmount: 0,
          serviceFeeRefundable: false,
          reason: 'Fuera del plazo de derecho de arrepentimiento (10 días + 24hs antes del evento)',
          type: 'right_of_withdrawal',
        }
      }

    case 'event_cancellation':
      return {
        refundableAmount: purchase.total_amount, // Incluye cargo por servicio
        serviceFeeRefundable: true,
        reason: 'Cancelación total del evento',
        type: 'event_cancellation',
      }

    case 'date_change':
      return {
        refundableAmount: purchase.base_amount, // Solo precio base, sin cargo por servicio
        serviceFeeRefundable: false,
        reason: 'Cambio de fecha/horario - El cargo por servicio no es reembolsable',
        type: 'date_change',
      }

    case 'venue_change':
      return {
        refundableAmount: purchase.base_amount, // Solo precio base, sin cargo por servicio
        serviceFeeRefundable: false,
        reason: 'Cambio de lugar - El cargo por servicio no es reembolsable',
        type: 'venue_change',
      }

    case 'substantial_change':
      return {
        refundableAmount: purchase.total_amount, // Incluye cargo por servicio
        serviceFeeRefundable: true,
        reason: 'Modificación sustancial del evento',
        type: 'substantial_change',
      }

    default:
      return {
        refundableAmount: 0,
        serviceFeeRefundable: false,
        reason: 'Reembolso no autorizado según políticas',
        type: 'other',
      }
  }
}

export function useAdminRefunds(status?: 'pending' | 'approved' | 'rejected' | null) {
  const [refunds, setRefunds] = useState<AdminRefundRequest[]>([])
  const [allRefunds, setAllRefunds] = useState<AdminRefundRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function fetchRefunds() {
      try {
        setLoading(true)
        setError(null)

        // Query base para obtener todas las devoluciones (admin puede ver todas)
        const baseQuery = supabase
          .from('refunds')
          .select(`
            id,
            purchase_id,
            ticket_id,
            user_id,
            guest_email,
            reason,
            status,
            refund_amount,
            created_at,
            processed_at,
            processed_by,
            purchase:purchases(
              id,
              total_amount,
              base_amount,
              commission_amount,
              payment_status,
              payment_provider_id,
              created_at,
              guest_email,
              guest_name,
              event:events(
                id,
                name,
                start_date,
                end_date,
                status
              ),
              user:profiles(
                email,
                full_name
              )
            ),
            ticket:tickets(
              ticket_number,
              ticket_type:ticket_types(
                name
              )
            )
          `)
          .order('created_at', { ascending: false })

        // Obtener TODAS las devoluciones para estadísticas
        const { data: allRefundsData, error: allRefundsError } = await baseQuery

        if (allRefundsError) {
          throw new Error(`Error obteniendo devoluciones: ${allRefundsError.message}`)
        }

        // Obtener devoluciones filtradas por estado
        let filteredQuery = baseQuery
        if (status) {
          filteredQuery = filteredQuery.eq('status', status) as any
        }

        const { data: refundsData, error: refundsError } = await filteredQuery

        if (refundsError) {
          throw new Error(`Error obteniendo devoluciones: ${refundsError.message}`)
        }

        // Transformar datos
        const transformRefund = (refund: any): AdminRefundRequest => {
          const purchaseData = Array.isArray(refund.purchase) ? refund.purchase[0] : refund.purchase
          const ticketData = Array.isArray(refund.ticket) ? refund.ticket[0] : refund.ticket

          return {
            id: refund.id,
            purchase_id: refund.purchase_id,
            ticket_id: refund.ticket_id,
            user_id: refund.user_id,
            guest_email: refund.guest_email,
            reason: refund.reason,
            status: refund.status,
            refund_amount: refund.refund_amount,
            created_at: refund.created_at,
            processed_at: refund.processed_at,
            processed_by: refund.processed_by,
            purchase: {
              id: purchaseData?.id || '',
              total_amount: purchaseData?.total_amount || 0,
              base_amount: purchaseData?.base_amount || 0,
              commission_amount: purchaseData?.commission_amount || 0,
              payment_status: purchaseData?.payment_status || '',
              payment_provider_id: purchaseData?.payment_provider_id || null,
              created_at: purchaseData?.created_at || '',
              guest_email: purchaseData?.guest_email || null,
              guest_name: purchaseData?.guest_name || null,
              event: {
                id: (Array.isArray(purchaseData?.event) ? purchaseData?.event[0] : purchaseData?.event)?.id || '',
                name: (Array.isArray(purchaseData?.event) ? purchaseData?.event[0] : purchaseData?.event)?.name || '',
                start_date: (Array.isArray(purchaseData?.event) ? purchaseData?.event[0] : purchaseData?.event)?.start_date || '',
                end_date: (Array.isArray(purchaseData?.event) ? purchaseData?.event[0] : purchaseData?.event)?.end_date || '',
                status: (Array.isArray(purchaseData?.event) ? purchaseData?.event[0] : purchaseData?.event)?.status || '',
              },
              user: (Array.isArray(purchaseData?.user) ? purchaseData?.user[0] : purchaseData?.user) ? {
                email: (Array.isArray(purchaseData?.user) ? purchaseData?.user[0] : purchaseData?.user)?.email || '',
                full_name: (Array.isArray(purchaseData?.user) ? purchaseData?.user[0] : purchaseData?.user)?.full_name || null,
              } : null,
            },
            ticket: ticketData ? {
              ticket_number: ticketData.ticket_number || '',
              ticket_type: {
                name: (Array.isArray(ticketData.ticket_type) ? ticketData.ticket_type[0] : ticketData.ticket_type)?.name || '',
              },
            } : null,
          }
        }

        const refundsList = (refundsData || []).map(transformRefund)
        const allRefundsList = (allRefundsData || []).map(transformRefund)

        setRefunds(refundsList)
        setAllRefunds(allRefundsList)
      } catch (err: any) {
        console.error('Error obteniendo devoluciones:', err)
        setError(err.message || 'Error obteniendo devoluciones')
        setRefunds([])
        setAllRefunds([])
      } finally {
        setLoading(false)
      }
    }

    fetchRefunds()
  }, [status, refreshKey, supabase])

  const refetch = () => {
    setRefreshKey(prev => prev + 1)
  }

  return { refunds, allRefunds, loading, error, refetch }
}
