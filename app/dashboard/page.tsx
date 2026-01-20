'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useTransfers } from '@/lib/hooks/useTransfers'
import { useEvents } from '@/lib/hooks/useEvents'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Calendar, DollarSign, Ticket, TrendingUp, Plus, Settings, Wallet } from 'lucide-react'
import { formatPrice } from '@/lib/utils/format'

export default function DashboardPage() {
  const { user, loading, isProducer, isProducerActive, producer } = useAuth()
  const router = useRouter()
  const { transfers, totals: transferTotals, loading: transfersLoading } = useTransfers(producer?.id || undefined)
  const { events, loading: eventsLoading } = useEvents(producer?.id || null)
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalTickets: 0,
    averageTicket: 0,
    activeEvents: 0,
    pendingTransfers: 0,
    completedTransfers: 0,
  })

  useEffect(() => {
    if (!producer?.id || events.length === 0) return

    async function fetchStats() {
      const supabase = createClient()
      const eventIds = events.map(e => e.id)

      if (eventIds.length === 0) {
        setStats({
          totalRevenue: 0,
          totalTickets: 0,
          averageTicket: 0,
          activeEvents: events.filter(e => e.status === 'published').length,
          pendingTransfers: transferTotals.pending,
          completedTransfers: transferTotals.completed,
        })
        return
      }

      // Obtener todas las compras de eventos de esta productora
      const { data: purchases } = await supabase
        .from('purchases')
        .select(`
          base_amount,
          tickets:tickets(id)
        `)
        .eq('payment_status', 'completed')
        .in('event_id', eventIds)

      // Obtener tickets directamente para contar
      const { data: ticketsData } = await supabase
        .from('tickets')
        .select('id')
        .in('event_id', eventIds)

      // Calcular estadísticas
      const totalRevenue = purchases?.reduce((sum, p) => sum + Number(p.base_amount || 0), 0) || 0
      const totalTickets = ticketsData?.length || 0
      const averageTicket = totalTickets > 0 ? totalRevenue / totalTickets : 0
      const activeEvents = events.filter(e => e.status === 'published').length

      setStats({
        totalRevenue,
        totalTickets,
        averageTicket,
        activeEvents,
        pendingTransfers: transferTotals.pending,
        completedTransfers: transferTotals.completed,
      })
    }

    fetchStats()
  }, [producer?.id, events, transferTotals])

  // El layout ya maneja la protección, pero mantenemos esto por seguridad
  if (loading || !isProducer) {
    return null
  }

  // Solo bloquear si sabemos explícitamente que está inactiva
  if (isProducerActive === false) {
    return null
  }

  return (
    <div className="min-h-screen bg-black-deep text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-wide mb-2">
                Dashboard
              </h1>
              <p className="text-lightGray">
                Bienvenido a tu panel de control
              </p>
            </div>
            <Link
              href="/dashboard/eventos/nuevo"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#9333EA] via-[#A855F7] to-[#9333EA] text-white font-bold rounded-full transition-all duration-300 shadow-lg hover:shadow-[0_0_32px_rgba(168,85,247,0.6)] hover:scale-[1.02] uppercase tracking-wide text-sm"
              style={{
                background:
                  'linear-gradient(135deg, #7C3AED 0%, #A855F7 50%, #9333EA 100%)',
                boxShadow:
                  '0 4px 24px rgba(168, 85, 247, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              }}
            >
              <Plus className="w-5 h-5" />
              <span>Nuevo Evento</span>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Facturación Total */}
          <div className="bg-mediumGray rounded-2xl p-6 border border-[#2F2F2F]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <h3 className="text-lightGray text-sm uppercase tracking-wide mb-1">
              Facturación Total
            </h3>
            <p className="text-3xl font-bold text-white">
              ${formatPrice(stats.totalRevenue)}
            </p>
          </div>

          {/* Tickets Vendidos */}
          <div className="bg-mediumGray rounded-2xl p-6 border border-[#2F2F2F]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Ticket className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <h3 className="text-lightGray text-sm uppercase tracking-wide mb-1">
              Tickets Vendidos
            </h3>
            <p className="text-3xl font-bold text-white">{stats.totalTickets}</p>
          </div>

          {/* Transferencias Pendientes */}
          <div className="bg-mediumGray rounded-2xl p-6 border border-[#2F2F2F]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <Wallet className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
            <h3 className="text-lightGray text-sm uppercase tracking-wide mb-1">
              Pendientes de Transferir
            </h3>
            <p className="text-3xl font-bold text-white">
              ${formatPrice(stats.pendingTransfers)}
            </p>
          </div>

          {/* Eventos Activos */}
          <div className="bg-mediumGray rounded-2xl p-6 border border-[#2F2F2F]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-pink-500/20 rounded-lg">
                <Calendar className="w-6 h-6 text-pink-400" />
              </div>
            </div>
            <h3 className="text-lightGray text-sm uppercase tracking-wide mb-1">
              Eventos Activos
            </h3>
            <p className="text-3xl font-bold text-white">{stats.activeEvents}</p>
          </div>
        </div>

        {/* Transferencias Recientes */}
        {transfers.length > 0 && (
          <div className="bg-mediumGray rounded-2xl p-6 border border-[#2F2F2F] mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold uppercase tracking-wide">
                Transferencias Recientes
              </h2>
              <Link
                href="/dashboard/transferencias"
                className="text-purple-400 hover:text-purple-300 text-sm font-semibold"
              >
                Ver todas →
              </Link>
            </div>
            <div className="space-y-3">
              {transfers.slice(0, 5).map((transfer) => (
                <div
                  key={transfer.id}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10"
                >
                  <div>
                    <p className="text-white font-semibold">
                      {transfer.event?.name || 'Evento'}
                    </p>
                    <p className="text-lightGray text-sm">
                      {transfer.status === 'pending' ? 'Pendiente' : 'Completada'} •{' '}
                      {new Date(transfer.created_at).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-lg">
                      ${formatPrice(Number(transfer.amount))}
                    </p>
                    <span
                      className={`text-xs font-semibold uppercase ${
                        transfer.status === 'pending'
                          ? 'text-yellow-400'
                          : transfer.status === 'completed'
                          ? 'text-green-400'
                          : 'text-red-400'
                      }`}
                    >
                      {transfer.status === 'pending'
                        ? 'Pendiente'
                        : transfer.status === 'completed'
                        ? 'Completada'
                        : transfer.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-mediumGray rounded-2xl p-6 border border-[#2F2F2F]">
          <h2 className="text-xl font-bold uppercase tracking-wide mb-4">
            Acciones Rápidas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/dashboard/eventos/nuevo"
              className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all duration-200"
            >
              <Plus className="w-5 h-5 text-purple-400" />
              <span className="font-semibold">Crear Nuevo Evento</span>
            </Link>
            <Link
              href="/dashboard/eventos"
              className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all duration-200"
            >
              <Calendar className="w-5 h-5 text-blue-400" />
              <span className="font-semibold">Ver Todos los Eventos</span>
            </Link>
            <Link
              href="/dashboard/perfil"
              className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all duration-200"
            >
              <Settings className="w-5 h-5 text-teal-400" />
              <span className="font-semibold">Configurar Perfil</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
