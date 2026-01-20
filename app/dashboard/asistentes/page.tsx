'use client'

import { useState, useMemo } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useEvents } from '@/lib/hooks/useEvents'
import { useAttendees, AttendeesFilters } from '@/lib/hooks/useAttendees'
import { Users, Search, Download, Filter, X, Calendar, CheckCircle, XCircle, Clock, User, Mail, Phone, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale/es'

function getStatusBadge(status: string) {
  const badges = {
    valid: {
      label: 'Válido',
      className: 'bg-green-500/20 text-green-400 border-green-500/50',
      icon: CheckCircle,
    },
    used: {
      label: 'Usado',
      className: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      icon: CheckCircle,
    },
    cancelled: {
      label: 'Cancelado',
      className: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
      icon: XCircle,
    },
    refunded: {
      label: 'Reembolsado',
      className: 'bg-red-500/20 text-red-400 border-red-500/50',
      icon: XCircle,
    },
  }
  return badges[status as keyof typeof badges] || badges.valid
}

function exportToCSV(attendees: any[], eventName?: string) {
  const headers = [
    'Número de Ticket',
    'Nombre',
    'DNI',
    'Email',
    'Teléfono',
    'Tipo de Ticket',
    'Precio',
    'Estado',
    'Fecha de Compra',
    'Es Invitado',
  ]

  const rows = attendees.map((attendee) => [
    attendee.ticket_number,
    attendee.attendee_name || 'Sin nombre',
    attendee.attendee_dni || '',
    attendee.email || '',
    attendee.phone || '',
    attendee.ticket_type_name,
    `$${attendee.ticket_type_price.toLocaleString('es-AR')}`,
    getStatusBadge(attendee.status).label,
    format(new Date(attendee.purchase_date), 'dd/MM/yyyy HH:mm', { locale: es }),
    attendee.is_guest ? 'Sí' : 'No',
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n')

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `asistentes${eventName ? `-${eventName.replace(/[^a-z0-9]/gi, '-')}` : ''}-${format(new Date(), 'yyyy-MM-dd')}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export default function AsistentesPage() {
  const { producer, loading: authLoading } = useAuth()
  const { events, loading: eventsLoading } = useEvents(producer?.id || null)
  
  // Filtros
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<'valid' | 'used' | 'cancelled' | 'refunded' | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [excludeRefunded, setExcludeRefunded] = useState(true) // Por defecto excluir reembolsados

  const filters: AttendeesFilters = useMemo(() => ({
    eventId: selectedEventId,
    status: selectedStatus,
    search: searchQuery || undefined,
    excludeRefunded: excludeRefunded && !selectedStatus, // Solo excluir si no hay filtro de estado específico
  }), [selectedEventId, selectedStatus, searchQuery, excludeRefunded])

  const { attendees, allAttendees, loading, error } = useAttendees(producer?.id || null, filters)

  // Estadísticas - usar allAttendees que contiene TODOS los asistentes sin filtrar
  const stats = useMemo(() => {
    const total = allAttendees.length
    const byStatus = {
      valid: allAttendees.filter(a => a.status === 'valid').length,
      used: allAttendees.filter(a => a.status === 'used').length,
      cancelled: allAttendees.filter(a => a.status === 'cancelled').length,
      refunded: allAttendees.filter(a => a.status === 'refunded').length,
    }
    return { total, ...byStatus }
  }, [allAttendees])

  const selectedEvent = events.find(e => e.id === selectedEventId)

  if (authLoading || eventsLoading) {
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
              Asistentes
            </h1>
          </div>
          <p className="text-lightGray text-lg">
            Lista de asistentes a tus eventos
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-mediumGray rounded-xl p-4 border border-[#2F2F2F]">
            <p className="text-lightGray text-sm mb-1">Total</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
            <p className="text-green-400 text-sm mb-1">Válidos</p>
            <p className="text-2xl font-bold text-green-400">{stats.valid}</p>
          </div>
          <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/30">
            <p className="text-blue-400 text-sm mb-1">Usados</p>
            <p className="text-2xl font-bold text-blue-400">{stats.used}</p>
          </div>
          <div className="bg-gray-500/10 rounded-xl p-4 border border-gray-500/30">
            <p className="text-gray-400 text-sm mb-1">Cancelados</p>
            <p className="text-2xl font-bold text-gray-400">{stats.cancelled}</p>
          </div>
          <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
            <p className="text-red-400 text-sm mb-1">Reembolsados</p>
            <p className="text-2xl font-bold text-red-400">{stats.refunded}</p>
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
                  placeholder="Buscar por nombre, email, DNI o número de ticket..."
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
                showFilters || selectedEventId || selectedStatus
                  ? 'bg-purple-vibrant/20 border-purple-vibrant/50 text-purple-vibrant'
                  : 'bg-[#2F2F2F] border-[#3F3F3F] text-lightGray hover:border-purple-vibrant/50'
              }`}
            >
              <Filter className="w-5 h-5" />
              <span>Filtros</span>
              {(selectedEventId || selectedStatus) && (
                <span className="bg-purple-vibrant text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                  {(selectedEventId ? 1 : 0) + (selectedStatus ? 1 : 0)}
                </span>
              )}
            </button>

            {/* Exportar CSV */}
            <button
              onClick={() => exportToCSV(attendees, selectedEvent?.name)}
              disabled={attendees.length === 0}
              className="inline-flex items-center gap-2 px-4 py-3 bg-green-500/20 hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg border border-green-500/50 transition-all duration-200 text-green-400 hover:text-green-300"
            >
              <Download className="w-5 h-5" />
              <span>Exportar CSV</span>
            </button>
          </div>

          {/* Panel de Filtros Expandible */}
          {showFilters && (
            <div className="pt-4 border-t border-[#2F2F2F] space-y-4">
              {/* Filtro por Evento */}
              <div>
                <label className="block text-sm font-semibold text-lightGray mb-2">
                  Evento:
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-vibrant" />
                  <select
                    value={selectedEventId || ''}
                    onChange={(e) => setSelectedEventId(e.target.value || null)}
                    className="w-full pl-10 pr-4 py-3 bg-[#2F2F2F] border border-[#3F3F3F] rounded-lg text-white focus:outline-none focus:border-purple-vibrant transition-colors appearance-none"
                  >
                    <option value="">Todos los eventos</option>
                    {events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Filtro por Estado */}
              <div>
                <label className="block text-sm font-semibold text-lightGray mb-2">
                  Estado:
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {(['valid', 'used', 'cancelled', 'refunded'] as const).map((status) => {
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

              {/* Opción para excluir reembolsados */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="excludeRefunded"
                  checked={excludeRefunded}
                  onChange={(e) => setExcludeRefunded(e.target.checked)}
                  className="w-4 h-4 rounded border-[#3F3F3F] bg-[#2F2F2F] text-purple-vibrant focus:ring-purple-vibrant focus:ring-2"
                />
                <label htmlFor="excludeRefunded" className="text-sm text-lightGray cursor-pointer">
                  Excluir tickets reembolsados
                </label>
              </div>

              {/* Limpiar Filtros */}
              {(selectedEventId || selectedStatus || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedEventId(null)
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

        {/* Loading State */}
        {loading && (
          <div className="bg-mediumGray rounded-2xl p-12 border border-[#2F2F2F] text-center">
            <div className="text-lightGray">Cargando asistentes...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-6 mb-6">
            <p className="text-red-400">Error: {error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && attendees.length === 0 && (
          <div className="bg-mediumGray rounded-2xl p-12 border border-[#2F2F2F] text-center">
            <Users className="w-16 h-16 mx-auto text-purple-400 mb-4" />
            <h2 className="text-2xl font-bold mb-4 uppercase tracking-wide">
              No hay asistentes
            </h2>
            <p className="text-lightGray max-w-md mx-auto">
              {searchQuery || selectedEventId || selectedStatus
                ? 'No se encontraron asistentes con los filtros seleccionados'
                : 'Aún no hay asistentes registrados para tus eventos'}
            </p>
          </div>
        )}

        {/* Lista de Asistentes */}
        {!loading && !error && attendees.length > 0 && (
          <div className="space-y-4">
            {attendees.map((attendee) => {
              const statusBadge = getStatusBadge(attendee.status)
              const StatusIcon = statusBadge.icon
              return (
                <div
                  key={attendee.id}
                  className="bg-mediumGray rounded-2xl border border-[#2F2F2F] p-6 hover:border-purple-500/50 transition-all duration-200"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Información Principal */}
                    <div className="flex-1">
                      <div className="flex items-start gap-4 mb-4">
                        {/* Avatar/Icono */}
                        <div className="w-12 h-12 bg-purple-vibrant/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 text-purple-vibrant" />
                        </div>

                        {/* Datos */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-white">
                              {attendee.attendee_name || 'Sin nombre'}
                            </h3>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 ${statusBadge.className}`}
                            >
                              <StatusIcon className="w-3 h-3" />
                              {statusBadge.label}
                            </span>
                            {attendee.is_guest && (
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/50">
                                Invitado
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-lightGray">
                            {attendee.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                <span>{attendee.email}</span>
                              </div>
                            )}
                            {attendee.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                <span>{attendee.phone}</span>
                              </div>
                            )}
                            {attendee.attendee_dni && (
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                <span>DNI: {attendee.attendee_dni}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {format(new Date(attendee.purchase_date), "dd 'de' MMM, yyyy 'a las' HH:mm", { locale: es })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Información del Ticket */}
                      <div className="bg-[#2F2F2F] rounded-lg p-4 border border-[#3F3F3F]">
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <div>
                            <span className="text-lightGray">Ticket:</span>
                            <span className="text-white font-mono ml-2">{attendee.ticket_number}</span>
                          </div>
                          <div>
                            <span className="text-lightGray">Tipo:</span>
                            <span className="text-white font-semibold ml-2">{attendee.ticket_type_name}</span>
                          </div>
                          <div>
                            <span className="text-lightGray">Precio:</span>
                            <span className="text-green-400 font-semibold ml-2">
                              ${attendee.ticket_type_price.toLocaleString('es-AR')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Resumen */}
        {!loading && !error && attendees.length > 0 && (
          <div className="mt-6 bg-mediumGray rounded-2xl p-4 border border-[#2F2F2F] text-center">
            <p className="text-lightGray text-sm">
              Mostrando <span className="text-white font-semibold">{attendees.length}</span> asistente{attendees.length !== 1 ? 's' : ''}
              {selectedEvent && ` de "${selectedEvent.name}"`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
