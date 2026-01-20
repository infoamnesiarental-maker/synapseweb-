'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Calendar, Edit, BarChart3, MapPin, Clock, Trash2, X, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useEvents } from '@/lib/hooks/useEvents'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Función helper para formatear fechas
function formatDate(dateString: string) {
  try {
    return format(new Date(dateString), "d 'de' MMMM, yyyy", { locale: es })
  } catch {
    return dateString
  }
}

function formatTime(dateString: string) {
  try {
    return format(new Date(dateString), 'HH:mm', { locale: es })
  } catch {
    return ''
  }
}

// Función helper para obtener el badge de estado
function getStatusBadge(status: string) {
  const badges = {
    draft: {
      label: 'Borrador',
      className: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
    },
    published: {
      label: 'Publicado',
      className: 'bg-green-500/20 text-green-400 border-green-500/50',
    },
    finished: {
      label: 'Finalizado',
      className: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    },
    cancelled: {
      label: 'Cancelado',
      className: 'bg-red-500/20 text-red-400 border-red-500/50',
    },
  }
  return badges[status as keyof typeof badges] || badges.draft
}

export default function EventosPage() {
  const { producer, loading: authLoading } = useAuth()
  const { events, loading: eventsLoading, error, deleteEvent } = useEvents(producer?.id || null)
  const [eventToDelete, setEventToDelete] = useState<{ id: string; name: string; flyerUrl: string | null } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Mostrar loading mientras carga la autenticación
  if (authLoading) {
    return (
      <div className="min-h-screen bg-black-deep text-white flex items-center justify-center">
        <div className="text-xl">Cargando...</div>
      </div>
    )
  }

  // Si no hay productora, no debería llegar aquí (el layout lo bloquea)
  if (!producer) {
    return null
  }

  async function handleDeleteEvent() {
    if (!eventToDelete || !deleteEvent) return

    setIsDeleting(true)
    setDeleteError(null)

    try {
      await deleteEvent(eventToDelete.id, eventToDelete.flyerUrl)
      setEventToDelete(null)
    } catch (err: any) {
      console.error('Error eliminando evento:', err)
      setDeleteError(err.message || 'Error al eliminar el evento')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-black-deep text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-wide mb-2">
              Mis Eventos
            </h1>
            <p className="text-lightGray">
              Gestiona todos tus eventos
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

        {/* Loading State */}
        {eventsLoading && (
          <div className="bg-mediumGray rounded-2xl p-12 border border-[#2F2F2F] text-center">
            <div className="text-lightGray">Cargando eventos...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-6 mb-6">
            <p className="text-red-400">Error: {error}</p>
          </div>
        )}

        {/* Empty State */}
        {!eventsLoading && !error && events.length === 0 && (
          <div className="bg-mediumGray rounded-2xl p-12 border border-[#2F2F2F] text-center">
            <Calendar className="w-16 h-16 mx-auto text-purple-400 mb-4" />
            <h2 className="text-2xl font-bold mb-4 uppercase tracking-wide">
              No hay eventos aún
            </h2>
            <p className="text-lightGray mb-6 max-w-md mx-auto">
              Crea tu primer evento para comenzar a vender tickets
            </p>
            <Link
              href="/dashboard/eventos/nuevo"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#9333EA] via-[#A855F7] to-[#9333EA] text-white font-bold rounded-full transition-all duration-300 shadow-lg hover:shadow-[0_0_32px_rgba(168,85,247,0.6)] hover:scale-[1.02] uppercase tracking-wide"
              style={{
                background:
                  'linear-gradient(135deg, #7C3AED 0%, #A855F7 50%, #9333EA 100%)',
                boxShadow:
                  '0 4px 24px rgba(168, 85, 247, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              }}
            >
              <Plus className="w-5 h-5" />
              <span>Crear Primer Evento</span>
            </Link>
          </div>
        )}

        {/* Events List */}
        {!eventsLoading && !error && events.length > 0 && (
          <div className="grid grid-cols-1 gap-6">
            {events.map((event) => {
              const statusBadge = getStatusBadge(event.status)
              return (
                <div
                  key={event.id}
                  className="bg-mediumGray rounded-2xl border border-[#2F2F2F] overflow-hidden hover:border-purple-500/50 transition-all duration-200"
                >
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      {/* Left: Event Info */}
                      <div className="flex-1">
                        <div className="flex items-start gap-4 mb-4">
                          {/* Flyer Image */}
                          {event.flyer_url ? (
                            <img
                              src={event.flyer_url}
                              alt={event.name}
                              className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-24 h-24 md:w-32 md:h-32 bg-white/5 rounded-lg flex items-center justify-center">
                              <Calendar className="w-8 h-8 text-purple-400" />
                            </div>
                          )}

                          {/* Event Details */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl md:text-2xl font-bold uppercase tracking-wide">
                                {event.name}
                              </h3>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusBadge.className}`}
                              >
                                {statusBadge.label}
                              </span>
                            </div>

                            {event.description && (
                              <p className="text-lightGray text-sm mb-3 line-clamp-2">
                                {event.description}
                              </p>
                            )}

                            <div className="flex flex-wrap gap-4 text-sm text-lightGray">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>
                                  {formatDate(event.start_date)} a las {formatTime(event.start_date)}
                                </span>
                              </div>
                              {event.venue_name && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  <span>
                                    {event.venue_name}
                                    {event.venue_city && `, ${event.venue_city}`}
                                  </span>
                                </div>
                              )}
                              {event.category && (
                                <div className="text-purple-400 font-semibold">
                                  {event.category}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Link
                          href={`/dashboard/eventos/${event.id}`}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg border border-green-500/50 transition-all duration-200 text-sm font-semibold text-green-400 hover:text-green-300 shadow-lg shadow-green-500/20 hover:shadow-green-500/30"
                        >
                          <Edit className="w-4 h-4" />
                          <span>Editar</span>
                        </Link>
                        <Link
                          href={`/dashboard/eventos/${event.id}/analytics`}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#A855F7]/20 hover:bg-[#A855F7]/30 rounded-lg border border-[#A855F7]/50 transition-all duration-200 text-sm font-semibold text-[#A855F7] hover:text-[#C084FC] shadow-lg shadow-[#A855F7]/20 hover:shadow-[#A855F7]/30"
                        >
                          <BarChart3 className="w-4 h-4" />
                          <span>Analytics</span>
                        </Link>
                        <button
                          onClick={() => setEventToDelete({ id: event.id, name: event.name, flyerUrl: event.flyer_url })}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg border border-red-500/50 transition-all duration-200 text-sm font-semibold text-red-400 hover:text-red-300 shadow-lg shadow-red-500/20 hover:shadow-red-500/30"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de Confirmación de Eliminación */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-mediumGray rounded-2xl border border-[#2F2F2F] p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">
                  ¿Eliminar Evento?
                </h3>
                <p className="text-lightGray text-sm">
                  Esta acción no se puede deshacer. Se eliminará el evento{' '}
                  <span className="text-white font-semibold">"{eventToDelete.name}"</span> y todos
                  sus datos asociados (tickets, imágenes, etc.).
                </p>
              </div>
              <button
                onClick={() => {
                  setEventToDelete(null)
                  setDeleteError(null)
                }}
                className="text-white/60 hover:text-white transition-colors"
                disabled={isDeleting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{deleteError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEventToDelete(null)
                  setDeleteError(null)
                }}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-white font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteEvent}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg border border-red-500/30 text-red-400 font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
