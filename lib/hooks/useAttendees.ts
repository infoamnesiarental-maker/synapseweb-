'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Attendee {
  id: string
  ticket_number: string
  attendee_name: string | null
  attendee_dni: string | null
  email: string | null
  phone: string | null
  ticket_type_name: string
  ticket_type_price: number
  status: 'valid' | 'used' | 'cancelled' | 'refunded'
  purchase_date: string
  purchase_id: string
  is_guest: boolean
}

export interface AttendeesFilters {
  eventId?: string | null
  status?: 'valid' | 'used' | 'cancelled' | 'refunded' | null
  search?: string
  excludeRefunded?: boolean
}

export function useAttendees(producerId: string | null, filters: AttendeesFilters = {}) {
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [allAttendees, setAllAttendees] = useState<Attendee[]>([]) // Todos los asistentes para estadísticas
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (!producerId) {
      setLoading(false)
      return
    }

    async function fetchAttendees() {
      try {
        setLoading(true)
        setError(null)

        // Primero obtener los eventos de la productora
        let eventsQuery = supabase
          .from('events')
          .select('id')
          .eq('producer_id', producerId)

        if (filters.eventId) {
          eventsQuery = eventsQuery.eq('id', filters.eventId)
        }

        const { data: events, error: eventsError } = await eventsQuery

        if (eventsError || !events || events.length === 0) {
          setAttendees([])
          setLoading(false)
          return
        }

        const eventIds = events.map(e => e.id)

        // Obtener tickets con información relacionada
        // NOTA: attendee_name y attendee_dni no existen en tickets, se obtienen de purchases
        let ticketsQuery = supabase
          .from('tickets')
          .select(`
            id,
            ticket_number,
            status,
            created_at,
            purchase_id,
            ticket_type:ticket_types(
              name,
              price
            ),
            purchase:purchases(
              id,
              user_id,
              guest_email,
              guest_name,
              guest_phone,
              created_at,
              user:profiles(
                email,
                full_name
              )
            )
          `)
          .in('event_id', eventIds)
          .order('created_at', { ascending: false })

        // Primero obtener TODOS los tickets para estadísticas (sin filtros de estado)
        const { data: allTickets, error: allTicketsError } = await ticketsQuery

        if (allTicketsError) {
          throw new Error(`Error obteniendo tickets: ${allTicketsError.message}`)
        }

        // Luego aplicar filtros para la lista
        let ticketsQueryFiltered = ticketsQuery
        if (filters.status) {
          ticketsQueryFiltered = ticketsQueryFiltered.eq('status', filters.status)
        } else if (filters.excludeRefunded) {
          // Si no hay filtro específico pero se quiere excluir reembolsados
          ticketsQueryFiltered = ticketsQueryFiltered.neq('status', 'refunded')
        }

        const { data: tickets, error: ticketsError } = await ticketsQueryFiltered

        if (ticketsError) {
          throw new Error(`Error obteniendo tickets: ${ticketsError.message}`)
        }

        // Transformar TODOS los tickets para estadísticas
        const allAttendeesData: Attendee[] = (allTickets || []).map((ticket: any) => {
          const purchase = ticket.purchase
          const isGuest = !purchase?.user_id
          
          // Determinar email y nombre
          let email: string | null = null
          let name: string | null = null
          let phone: string | null = null

          if (isGuest) {
            email = purchase?.guest_email || null
            name = purchase?.guest_name || null
            phone = purchase?.guest_phone || null
          } else {
            email = purchase?.user?.email || null
            name = purchase?.user?.full_name || null
          }

          // Obtener nombre del asistente
          const attendeeName = purchase?.guest_name || name || 'Sin nombre'
          const attendeeDni = null

          return {
            id: ticket.id,
            ticket_number: ticket.ticket_number,
            attendee_name: attendeeName,
            attendee_dni: attendeeDni,
            email,
            phone,
            ticket_type_name: ticket.ticket_type?.name || 'Desconocido',
            ticket_type_price: ticket.ticket_type?.price || 0,
            status: ticket.status,
            purchase_date: purchase?.created_at || ticket.created_at,
            purchase_id: ticket.purchase_id,
            is_guest: isGuest,
          }
        })

        // Transformar datos a formato Attendee (solo los filtrados para la lista)
        const attendeesData: Attendee[] = (tickets || []).map((ticket: any) => {
          const purchase = ticket.purchase
          const isGuest = !purchase?.user_id
          
          // Determinar email y nombre
          let email: string | null = null
          let name: string | null = null
          let phone: string | null = null

          if (isGuest) {
            email = purchase?.guest_email || null
            name = purchase?.guest_name || null
            phone = purchase?.guest_phone || null
          } else {
            email = purchase?.user?.email || null
            name = purchase?.user?.full_name || null
          }

          // Obtener nombre del asistente
          // Los datos del asistente están en purchases.guest_name (si es invitado) o en profiles.full_name (si es usuario)
          // El DNI no está almacenado actualmente en la BD, por lo que será null
          const attendeeName = purchase?.guest_name || name || 'Sin nombre'
          const attendeeDni = null // No hay campo DNI en purchases actualmente

          return {
            id: ticket.id,
            ticket_number: ticket.ticket_number,
            attendee_name: attendeeName,
            attendee_dni: attendeeDni,
            email,
            phone,
            ticket_type_name: ticket.ticket_type?.name || 'Desconocido',
            ticket_type_price: ticket.ticket_type?.price || 0,
            status: ticket.status,
            purchase_date: purchase?.created_at || ticket.created_at,
            purchase_id: ticket.purchase_id,
            is_guest: isGuest,
          }
        })

        // Aplicar filtro de búsqueda si existe
        let filteredAttendees = attendeesData
        if (filters.search && filters.search.trim()) {
          const searchLower = filters.search.toLowerCase()
          filteredAttendees = attendeesData.filter(attendee =>
            attendee.attendee_name?.toLowerCase().includes(searchLower) ||
            attendee.email?.toLowerCase().includes(searchLower) ||
            attendee.ticket_number.toLowerCase().includes(searchLower) ||
            attendee.attendee_dni?.toLowerCase().includes(searchLower)
          )
        }

        setAttendees(filteredAttendees)
        setAllAttendees(allAttendeesData) // Guardar todos para estadísticas
      } catch (err: any) {
        console.error('Error obteniendo asistentes:', err)
        setError(err.message || 'Error obteniendo asistentes')
        setAttendees([])
        setAllAttendees([])
      } finally {
        setLoading(false)
      }
    }

    fetchAttendees()
  }, [producerId, filters.eventId, filters.status, filters.search, filters.excludeRefunded, supabase])

  return { attendees, allAttendees, loading, error }
}
