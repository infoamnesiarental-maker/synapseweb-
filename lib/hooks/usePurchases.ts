'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface PurchaseWithDetails {
  id: string
  user_id: string | null
  guest_email: string | null
  guest_name: string | null
  guest_phone: string | null
  event_id: string
  total_amount: number
  base_amount: number
  commission_amount: number
  payment_method: string
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded'
  created_at: string
  event: {
    id: string
    name: string
    slug: string
    start_date: string
    end_date: string
    venue_name: string
    venue_address: string | null
    flyer_url: string | null
  }
  tickets: Array<{
    id: string
    ticket_number: string
    qr_code: string
    qr_hash: string
    status: 'valid' | 'used' | 'cancelled' | 'refunded'
    ticket_type: {
      id: string
      name: string
      price: number
    }
  }>
}

export function usePurchases(userId?: string | null) {
  const [purchases, setPurchases] = useState<PurchaseWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    async function fetchPurchases() {
      try {
        setLoading(true)
        setError(null)

        // Obtener compras del usuario
        // IMPORTANTE: Solo seleccionar campos públicos (sin datos financieros sensibles)
        const { data: purchasesData, error: purchasesError } = await supabase
          .from('purchases')
          .select(`
            id,
            user_id,
            guest_email,
            guest_name,
            guest_phone,
            event_id,
            total_amount,
            base_amount,
            commission_amount,
            payment_method,
            payment_status,
            created_at,
            updated_at,
            event:events(
              id,
              name,
              slug,
              start_date,
              end_date,
              venue_name,
              venue_address,
              flyer_url
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (purchasesError) {
          throw new Error(`Error obteniendo compras: ${purchasesError.message}`)
        }

        if (!purchasesData || purchasesData.length === 0) {
          setPurchases([])
          setLoading(false)
          return
        }

        // Para cada compra, obtener sus tickets con información del ticket_type
        // Los tickets solo existen si payment_status === 'completed', así que no necesitamos filtrar
        const purchasesWithTickets = await Promise.all(
          purchasesData.map(async (purchase) => {
            const { data: ticketsData, error: ticketsError } = await supabase
              .from('tickets')
              .select(`
                id,
                ticket_number,
                qr_code,
                qr_hash,
                status,
                ticket_type:ticket_types(
                  id,
                  name,
                  price
                )
              `)
              .eq('purchase_id', purchase.id)
              .order('created_at', { ascending: true })

            if (ticketsError) {
              console.warn(`Error obteniendo tickets para compra ${purchase.id}:`, ticketsError)
            }

            // Supabase puede devolver event como objeto o array
            const eventData = Array.isArray(purchase.event) 
              ? purchase.event[0]
              : purchase.event

            return {
              ...purchase,
              event: {
                id: eventData?.id || '',
                name: eventData?.name || '',
                slug: eventData?.slug || '',
                start_date: eventData?.start_date || '',
                end_date: eventData?.end_date || '',
                venue_name: eventData?.venue_name || '',
                venue_address: eventData?.venue_address || null,
                flyer_url: eventData?.flyer_url || null,
              } as PurchaseWithDetails['event'],
              tickets: (ticketsData || []).map((ticket: any) => {
                // Supabase puede devolver ticket_type como objeto o array
                const ticketType = Array.isArray(ticket.ticket_type) 
                  ? ticket.ticket_type[0]
                  : ticket.ticket_type
                
                return {
                  id: ticket.id,
                  ticket_number: ticket.ticket_number,
                  qr_code: ticket.qr_code,
                  qr_hash: ticket.qr_hash,
                  status: ticket.status,
                  ticket_type: {
                    id: ticketType?.id || '',
                    name: ticketType?.name || '',
                    price: ticketType?.price || 0,
                  } as PurchaseWithDetails['tickets'][0]['ticket_type'],
                }
              }),
            } as PurchaseWithDetails
          })
        )

        setPurchases(purchasesWithTickets)
      } catch (err: any) {
        setError(err.message || 'Error obteniendo compras')
        console.error('Error en usePurchases:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPurchases()
  }, [userId])

  return {
    purchases,
    loading,
    error,
  }
}
