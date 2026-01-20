'use client'

import { useState, useMemo } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRefunds } from '@/lib/hooks/useRefunds'
import { createClient } from '@/lib/supabase/client'
import { RefreshCw, Search, Filter, X, CheckCircle, XCircle, Clock, Calendar, DollarSign, User, Mail, FileText, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale/es'

function getStatusBadge(status: string) {
  const badges = {
    pending: {
      label: 'Pendiente',
      className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      icon: Clock,
    },
    approved: {
      label: 'Aprobada',
      className: 'bg-green-500/20 text-green-400 border-green-500/50',
      icon: CheckCircle,
    },
    rejected: {
      label: 'Rechazada',
      className: 'bg-red-500/20 text-red-400 border-red-500/50',
      icon: XCircle,
    },
  }
  return badges[status as keyof typeof badges] || badges.pending
}

export default function DevolucionesPage() {
  const { producer, user, loading: authLoading } = useAuth()
  const [selectedStatus, setSelectedStatus] = useState<'pending' | 'approved' | 'rejected' | null>('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [processingRefund, setProcessingRefund] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { refunds, allRefunds, loading, error, refetch } = useRefunds(producer?.id || null, selectedStatus)

  // Filtrar por búsqueda
  const filteredRefunds = useMemo(() => {
    if (!searchQuery.trim()) return refunds

    const query = searchQuery.toLowerCase()
    return refunds.filter((refund) => {
      const eventName = refund.purchase?.event?.name?.toLowerCase() || ''
      const userEmail = refund.purchase?.user?.email?.toLowerCase() || refund.guest_email?.toLowerCase() || ''
      const userName = refund.purchase?.user?.full_name?.toLowerCase() || ''
      const ticketNumber = refund.ticket?.ticket_number?.toLowerCase() || ''
      const reason = refund.reason?.toLowerCase() || ''

      return (
        eventName.includes(query) ||
        userEmail.includes(query) ||
        userName.includes(query) ||
        ticketNumber.includes(query) ||
        reason.includes(query)
      )
    })
  }, [refunds, searchQuery])

  // Estadísticas - usar allRefunds que contiene TODAS las devoluciones sin filtrar
  const stats = useMemo(() => {
    return {
      pending: allRefunds.filter((r) => r.status === 'pending').length,
      approved: allRefunds.filter((r) => r.status === 'approved').length,
      rejected: allRefunds.filter((r) => r.status === 'rejected').length,
      total: allRefunds.length,
    }
  }, [allRefunds])

  async function handleApproveRefund(refundId: string) {
    setProcessingRefund(refundId)
    setErrorMessage(null)

    try {
      const supabase = createClient()
      
      // Primero obtener la devolución para saber qué tickets actualizar
      const { data: refund, error: refundError } = await supabase
        .from('refunds')
        .select('purchase_id, ticket_id')
        .eq('id', refundId)
        .single()

      if (refundError || !refund) {
        throw new Error(refundError?.message || 'Error obteniendo devolución')
      }

      // Actualizar el status de la devolución
      const { error: updateError } = await supabase
        .from('refunds')
        .update({
          status: 'approved',
          processed_at: new Date().toISOString(),
          processed_by: user?.id || null, // user.id es el ID de profiles, que es lo que necesita processed_by
        })
        .eq('id', refundId)

      if (updateError) {
        throw new Error(updateError.message)
      }

      // Actualizar el status de los tickets relacionados
      // Si hay un ticket_id específico, actualizar solo ese ticket
      // Si no, actualizar todos los tickets de la compra
      if (refund.ticket_id) {
        // Actualizar solo el ticket específico
        const { error: ticketError } = await supabase
          .from('tickets')
          .update({ status: 'refunded' })
          .eq('id', refund.ticket_id)

        if (ticketError) {
          console.error('Error actualizando ticket:', ticketError)
          // No lanzar error aquí, solo loggear, porque la devolución ya se aprobó
        }
      } else {
        // Actualizar todos los tickets de la compra
        const { error: ticketsError } = await supabase
          .from('tickets')
          .update({ status: 'refunded' })
          .eq('purchase_id', refund.purchase_id)

        if (ticketsError) {
          console.error('Error actualizando tickets:', ticketsError)
          // No lanzar error aquí, solo loggear, porque la devolución ya se aprobó
        }
      }

      // Refrescar lista
      refetch()
    } catch (err: any) {
      console.error('Error aprobando devolución:', err)
      setErrorMessage(err.message || 'Error al aprobar la devolución')
    } finally {
      setProcessingRefund(null)
    }
  }

  async function handleRejectRefund(refundId: string) {
    setProcessingRefund(refundId)
    setErrorMessage(null)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('refunds')
        .update({
          status: 'rejected',
          processed_at: new Date().toISOString(),
          processed_by: user?.id || null, // user.id es el ID de profiles, que es lo que necesita processed_by
        })
        .eq('id', refundId)

      if (updateError) {
        throw new Error(updateError.message)
      }

      // Refrescar lista
      refetch()
    } catch (err: any) {
      console.error('Error rechazando devolución:', err)
      setErrorMessage(err.message || 'Error al rechazar la devolución')
    } finally {
      setProcessingRefund(null)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black-deep text-white flex items-center justify-center">
        <div className="text-xl">Cargando...</div>
      </div>
    )
  }

  if (!producer) {
    return null
  }

  return (
    <div className="min-h-screen bg-black-deep text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-3 h-3 bg-purple-vibrant rounded-full"></div>
            <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-wide">
              Devoluciones
            </h1>
          </div>
          <p className="text-lightGray text-lg">
            Gestiona las solicitudes de devolución de tickets
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-mediumGray rounded-xl p-4 border border-[#2F2F2F]">
            <p className="text-lightGray text-sm mb-1">Total</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/30">
            <p className="text-yellow-400 text-sm mb-1">Pendientes</p>
            <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
          </div>
          <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
            <p className="text-green-400 text-sm mb-1">Aprobadas</p>
            <p className="text-2xl font-bold text-green-400">{stats.approved}</p>
          </div>
          <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
            <p className="text-red-400 text-sm mb-1">Rechazadas</p>
            <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-mediumGray rounded-2xl p-6 border border-[#2F2F2F] mb-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            {/* Búsqueda */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-lightGray" />
                <input
                  type="text"
                  placeholder="Buscar por evento, email, nombre o número de ticket..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#2F2F2F] border border-[#3F3F3F] rounded-lg text-white placeholder-lightGray focus:outline-none focus:border-purple-vibrant transition-colors"
                />
              </div>
            </div>

            {/* Botón Filtros */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-4 py-3 rounded-lg border transition-all duration-200 ${
                showFilters || selectedStatus
                  ? 'bg-purple-vibrant/20 border-purple-vibrant/50 text-purple-vibrant'
                  : 'bg-[#2F2F2F] border-[#3F3F3F] text-lightGray hover:border-purple-vibrant/50'
              }`}
            >
              <Filter className="w-5 h-5" />
              <span>Filtros</span>
              {selectedStatus && (
                <span className="bg-purple-vibrant text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  1
                </span>
              )}
            </button>
          </div>

          {/* Panel de Filtros Expandible */}
          {showFilters && (
            <div className="pt-4 border-t border-[#2F2F2F] space-y-4">
              {/* Filtro por Estado */}
              <div>
                <label className="block text-sm font-semibold text-lightGray mb-2">
                  Estado:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['pending', 'approved', 'rejected'] as const).map((status) => {
                    const badge = getStatusBadge(status)
                    const isSelected = selectedStatus === status
                    return (
                      <button
                        key={status}
                        onClick={() => setSelectedStatus(isSelected ? null : status)}
                        className={`px-4 py-2 rounded-lg border transition-all duration-200 text-sm font-semibold ${
                          isSelected
                            ? badge.className + ' border-opacity-100'
                            : 'bg-[#2F2F2F] border-[#3F3F3F] text-lightGray hover:border-purple-vibrant/50'
                        }`}
                      >
                        {badge.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Limpiar Filtros */}
              {(selectedStatus || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedStatus(null)
                    setSearchQuery('')
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm text-lightGray hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Limpiar filtros</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-400 flex-1">{errorMessage}</p>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-mediumGray rounded-2xl p-12 border border-[#2F2F2F] text-center">
            <div className="text-lightGray">Cargando devoluciones...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-6 mb-6">
            <p className="text-red-400">Error: {error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredRefunds.length === 0 && (
          <div className="bg-mediumGray rounded-2xl p-12 border border-[#2F2F2F] text-center">
            <RefreshCw className="w-16 h-16 mx-auto text-purple-400 mb-4" />
            <h2 className="text-2xl font-bold mb-4 uppercase tracking-wide">
              No hay devoluciones
            </h2>
            <p className="text-lightGray max-w-md mx-auto">
              {searchQuery || selectedStatus
                ? 'No se encontraron devoluciones con los filtros seleccionados'
                : 'Aún no hay solicitudes de devolución para tus eventos'}
            </p>
          </div>
        )}

        {/* Lista de Devoluciones */}
        {!loading && !error && filteredRefunds.length > 0 && (
          <div className="space-y-4">
            {filteredRefunds.map((refund) => {
              const statusBadge = getStatusBadge(refund.status)
              const StatusIcon = statusBadge.icon
              const eventDate = refund.purchase?.event?.start_date
                ? format(new Date(refund.purchase.event.start_date), "dd 'de' MMM, yyyy", { locale: es })
                : 'Fecha no disponible'

              return (
                <div
                  key={refund.id}
                  className="bg-mediumGray rounded-2xl border border-[#2F2F2F] p-6 hover:border-purple-500/50 transition-all duration-200"
                >
                  <div className="flex flex-col gap-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-white">
                            {refund.purchase?.event?.name || 'Evento desconocido'}
                          </h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 ${statusBadge.className}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusBadge.label}
                          </span>
                        </div>
                        <p className="text-lightGray text-sm">
                          {eventDate}
                        </p>
                      </div>

                      {/* Monto */}
                      <div className="text-right">
                        <p className="text-lightGray text-sm mb-1">Monto</p>
                        <p className="text-2xl font-bold text-green-400">
                          ${refund.purchase?.total_amount.toLocaleString('es-AR') || '0'}
                        </p>
                      </div>
                    </div>

                    {/* Información del Usuario */}
                    <div className="bg-[#2F2F2F] rounded-lg p-4 border border-[#3F3F3F]">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-lightGray" />
                          <span className="text-lightGray">Usuario:</span>
                          <span className="text-white font-semibold">
                            {refund.purchase?.user?.full_name || refund.guest_email || 'Sin nombre'}
                          </span>
                        </div>
                        {refund.purchase?.user?.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-lightGray" />
                            <span className="text-lightGray">Email:</span>
                            <span className="text-white">{refund.purchase.user.email}</span>
                          </div>
                        )}
                        {refund.guest_email && !refund.purchase?.user?.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-lightGray" />
                            <span className="text-lightGray">Email:</span>
                            <span className="text-white">{refund.guest_email}</span>
                          </div>
                        )}
                        {refund.ticket?.ticket_number && (
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-lightGray" />
                            <span className="text-lightGray">Ticket:</span>
                            <span className="text-white font-mono">{refund.ticket.ticket_number}</span>
                          </div>
                        )}
                        {refund.ticket?.ticket_type?.name && (
                          <div className="flex items-center gap-2">
                            <span className="text-lightGray">Tipo:</span>
                            <span className="text-white">{refund.ticket.ticket_type.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Motivo de Devolución */}
                    <div className="bg-[#2F2F2F] rounded-lg p-4 border border-[#3F3F3F]">
                      <p className="text-lightGray text-sm mb-2">Motivo de la solicitud:</p>
                      <p className="text-white">{refund.reason || 'Sin motivo especificado'}</p>
                    </div>

                    {/* Fechas */}
                    <div className="flex flex-wrap gap-4 text-sm text-lightGray">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Solicitada: {format(new Date(refund.created_at), "dd 'de' MMM, yyyy 'a las' HH:mm", { locale: es })}
                        </span>
                      </div>
                      {refund.processed_at && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>
                            Procesada: {format(new Date(refund.processed_at), "dd 'de' MMM, yyyy 'a las' HH:mm", { locale: es })}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Acciones (solo para pendientes) */}
                    {refund.status === 'pending' && (
                      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#2F2F2F]">
                        <button
                          onClick={() => handleApproveRefund(refund.id)}
                          disabled={processingRefund === refund.id}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-500/20 hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg border border-green-500/50 transition-all duration-200 text-green-400 hover:text-green-300 font-semibold"
                        >
                          {processingRefund === refund.id ? (
                            <>
                              <RefreshCw className="w-5 h-5 animate-spin" />
                              <span>Procesando...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-5 h-5" />
                              <span>Aprobar Devolución</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleRejectRefund(refund.id)}
                          disabled={processingRefund === refund.id}
                          className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-500/20 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg border border-red-500/50 transition-all duration-200 text-red-400 hover:text-red-300 font-semibold"
                        >
                          {processingRefund === refund.id ? (
                            <>
                              <RefreshCw className="w-5 h-5 animate-spin" />
                              <span>Procesando...</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-5 h-5" />
                              <span>Rechazar Devolución</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Mensaje para aprobadas/rechazadas */}
                    {refund.status !== 'pending' && (
                      <div className={`pt-4 border-t border-[#2F2F2F] ${
                        refund.status === 'approved' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        <p className="text-sm font-semibold">
                          {refund.status === 'approved'
                            ? '✅ Esta devolución ha sido aprobada'
                            : '❌ Esta devolución ha sido rechazada'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Resumen */}
        {!loading && !error && filteredRefunds.length > 0 && (
          <div className="mt-6 bg-mediumGray rounded-2xl p-4 border border-[#2F2F2F] text-center">
            <p className="text-lightGray text-sm">
              Mostrando <span className="text-white font-semibold">{filteredRefunds.length}</span> devolución{filteredRefunds.length !== 1 ? 'es' : ''}
              {selectedStatus && ` con estado "${getStatusBadge(selectedStatus).label}"`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
