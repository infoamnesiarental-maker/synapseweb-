'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Calendar, Filter, X } from 'lucide-react'
import { usePublicEvents, PublicEvent } from '@/lib/hooks/usePublicEvents'
import EventCard from '@/components/EventCard'
import { format } from 'date-fns'
import { es } from 'date-fns/locale/es'

interface EventListProps {
  initialCategory?: string | null
}

export default function EventList({ initialCategory }: EventListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory || null)
  const [dateFrom, setDateFrom] = useState<Date | null>(null)
  const [dateTo, setDateTo] = useState<Date | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const { events, loading, error } = usePublicEvents({
    category: selectedCategory,
    searchQuery: searchQuery || undefined,
    dateFrom,
    dateTo,
  })

  // Categorías disponibles (basadas en CategorySelector)
  const categories = [
    { value: null, label: 'Todas' },
    { value: 'after', label: 'After' },
    { value: 'fiesta', label: 'Fiesta' },
    { value: 'evento', label: 'Evento' },
    { value: 'cumpleaños', label: 'Cumpleaños' },
    { value: 'gala', label: 'Gala XV' },
    { value: 'techno', label: 'Techno' },
    { value: 'house', label: 'House' },
    { value: 'trance', label: 'Trance' },
    { value: 'drum-and-bass', label: 'Drum & Bass' },
  ]

  // Transformar eventos para EventCard
  const transformedEvents = events.map((event) => ({
    id: event.id,
    slug: event.slug,
    name: event.name,
    date: format(new Date(event.start_date), 'dd MMM yyyy', { locale: es }),
    time: format(new Date(event.start_date), 'HH:mm', { locale: es }),
    venue: event.venue_name,
    city: event.venue_city || undefined,
    image: event.flyer_url || '',
    price: event.min_price || 0,
    category: event.category || 'Evento',
    ticketsLeft:
      event.total_tickets_available && event.total_tickets_available > 0
        ? event.total_tickets_available
        : undefined,
  }))

  function clearFilters() {
    setSearchQuery('')
    setSelectedCategory(null)
    setDateFrom(null)
    setDateTo(null)
  }

  const hasActiveFilters = selectedCategory || searchQuery || dateFrom || dateTo

  return (
    <div className="min-h-screen bg-black-deep py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-wider text-white mb-4">
            Eventos
          </h1>
          <p className="text-white/60 text-lg">
            Descubre los mejores eventos y compra tus entradas
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Buscar eventos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-gray-medium rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-vibrant transition-all"
            />
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-6 py-3 bg-gray-medium rounded-xl text-white hover:bg-gray-dark transition-all"
            >
              <Filter className="w-5 h-5" />
              <span>Filtros</span>
              {hasActiveFilters && (
                <span className="px-2 py-0.5 bg-purple-vibrant rounded-full text-xs font-bold">
                  {[selectedCategory, searchQuery, dateFrom, dateTo].filter(Boolean).length}
                </span>
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
                <span className="text-sm">Limpiar filtros</span>
              </button>
            )}
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gray-medium rounded-2xl p-6 space-y-4"
            >
              {/* Category Filter */}
              <div>
                <label className="block text-white/80 text-sm font-semibold mb-2">
                  Categoría
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.value || 'all'}
                      onClick={() => setSelectedCategory(cat.value)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        selectedCategory === cat.value
                          ? 'bg-purple-vibrant text-white'
                          : 'bg-gray-dark text-white/70 hover:bg-gray-medium'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/80 text-sm font-semibold mb-2">
                    Desde
                  </label>
                  <input
                    type="date"
                    value={dateFrom ? format(dateFrom, 'yyyy-MM-dd') : ''}
                    onChange={(e) =>
                      setDateFrom(e.target.value ? new Date(e.target.value) : null)
                    }
                    className="w-full px-4 py-3 bg-gray-dark rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-vibrant"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm font-semibold mb-2">
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={dateTo ? format(dateTo, 'yyyy-MM-dd') : ''}
                    onChange={(e) =>
                      setDateTo(e.target.value ? new Date(e.target.value) : null)
                    }
                    className="w-full px-4 py-3 bg-gray-dark rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-vibrant"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Results */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-white/60">Cargando eventos...</div>
          </div>
        )}

        {error && (
          <div className="bg-red/20 border border-red rounded-2xl p-6 text-red">
            Error: {error}
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="text-center py-20">
            <p className="text-white/60 text-lg mb-4">No se encontraron eventos</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-6 py-3 bg-purple-vibrant text-white rounded-xl hover:bg-purple-600 transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}

        {!loading && !error && events.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {transformedEvents.map((event, index) => (
              <EventCard key={event.id} event={event} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
