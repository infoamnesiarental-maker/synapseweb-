'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface RefundRequest {
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
    payment_status: string
    event: {
      id: string
      name: string
      start_date: string
    }
    user: {
      email: string
      full_name: string | null
    } | null
  }
  ticket: {
    ticket_number: string
    ticket_type: {
      name: string
    }
  } | null
}

export function useRefunds(producerId: string | null, status?: 'pending' | 'approved' | 'rejected' | null) {
  const [refunds, setRefunds] = useState<RefundRequest[]>([])
  const [allRefunds, setAllRefunds] = useState<RefundRequest[]>([]) // Todas las devoluciones para estadísticas
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (!producerId) {
      setLoading(false)
      return
    }

    async function fetchRefunds() {
      try {
        setLoading(true)
        setError(null)

        // Obtener eventos de la productora
        const { data: events, error: eventsError } = await supabase
          .from('events')
          .select('id')
          .eq('producer_id', producerId)

        if (eventsError || !events || events.length === 0) {
          setRefunds([])
          setLoading(false)
          return
        }

        const eventIds = events.map(e => e.id)

        // Obtener compras de los eventos de la productora
        const { data: purchases, error: purchasesError } = await supabase
          .from('purchases')
          .select('id')
          .in('event_id', eventIds)

        if (purchasesError || !purchases || purchases.length === 0) {
          setRefunds([])
          setLoading(false)
          return
        }

        const purchaseIds = purchases.map(p => p.id)

        // Query base para obtener devoluciones
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
              payment_status,
              event:events(
                id,
                name,
                start_date
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
          .in('purchase_id', purchaseIds)
          .order('created_at', { ascending: false })

        // Primero obtener TODAS las devoluciones para estadísticas (sin filtro)
        const { data: allRefundsData, error: allRefundsError } = await baseQuery

        if (allRefundsError) {
          throw new Error(`Error obteniendo devoluciones: ${allRefundsError.message}`)
        }

        // Luego obtener devoluciones filtradas por estado (para la lista)
        let refundsQueryFiltered = supabase
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
              payment_status,
              event:events(
                id,
                name,
                start_date
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
          .in('purchase_id', purchaseIds)
          .order('created_at', { ascending: false })

        if (status) {
          refundsQueryFiltered = refundsQueryFiltered.eq('status', status)
        }

        const { data: refundsData, error: refundsError } = await refundsQueryFiltered

        if (refundsError) {
          throw new Error(`Error obteniendo devoluciones: ${refundsError.message}`)
        }

        // Interface para type safety
        interface RefundDataFromDB {
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
            payment_status: string
            event: {
              id: string
              name: string
              start_date: string
            }
            user: {
              email: string
              full_name: string | null
            } | null
          }
          ticket: {
            ticket_number: string
            ticket_type: {
              name: string
            }
          } | null
        }

        // Transformar datos
        const refundsList: RefundRequest[] = (refundsData || []).map((refund: any) => {
          // Supabase puede devolver relaciones como arrays, necesitamos extraer el objeto
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
            payment_status: purchaseData?.payment_status || '',
            event: {
              id: (Array.isArray(purchaseData?.event) ? purchaseData?.event[0] : purchaseData?.event)?.id || '',
              name: (Array.isArray(purchaseData?.event) ? purchaseData?.event[0] : purchaseData?.event)?.name || '',
              start_date: (Array.isArray(purchaseData?.event) ? purchaseData?.event[0] : purchaseData?.event)?.start_date || '',
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
        })

        // Transformar también todas las devoluciones para estadísticas
        const allRefundsList: RefundRequest[] = (allRefundsData || []).map((refund: any) => {
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
            payment_status: purchaseData?.payment_status || '',
            event: {
              id: (Array.isArray(purchaseData?.event) ? purchaseData?.event[0] : purchaseData?.event)?.id || '',
              name: (Array.isArray(purchaseData?.event) ? purchaseData?.event[0] : purchaseData?.event)?.name || '',
              start_date: (Array.isArray(purchaseData?.event) ? purchaseData?.event[0] : purchaseData?.event)?.start_date || '',
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
        })

        setRefunds(refundsList)
        setAllRefunds(allRefundsList) // Guardar todas para estadísticas
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
  }, [producerId, status, refreshKey, supabase])

  const refetch = () => {
    setRefreshKey(prev => prev + 1)
  }

  return { refunds, allRefunds, loading, error, refetch }
}
