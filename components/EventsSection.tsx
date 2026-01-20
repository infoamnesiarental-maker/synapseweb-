'use client'

import { useState, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale/es'
import EventCard from './EventCard'
import { usePublicEvents } from '@/lib/hooks/usePublicEvents'

// Mapeo de categorías para mostrar nombres amigables
const categoryLabels: Record<string, string> = {
  after: 'MÚSICA',
  fiesta: 'MÚSICA',
  evento: 'MÚSICA',
  techno: 'MÚSICA',
  house: 'MÚSICA',
  trance: 'MÚSICA',
  'drum-and-bass': 'MÚSICA',
  cumpleaños: 'TEATRO',
  gala: 'TEATRO',
  // Agregar más mapeos según necesites
}

export default function EventsSection() {
  const [selectedCategoryGroup, setSelectedCategoryGroup] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Obtener todos los eventos publicados
  const { events, loading, error } = usePublicEvents({})

  // Agrupar eventos por categoría principal
  const eventsByCategory = useMemo(() => {
    const grouped: Record<string, typeof events> = {
      MÚSICA: [],
      TEATRO: [],
      DEPORTES: [],
    }

    events.forEach((event) => {
      const categoryGroup = categoryLabels[event.category || ''] || 'MÚSICA'
      if (grouped[categoryGroup]) {
        grouped[categoryGroup].push(event)
      }
    })

    return grouped
  }, [events])

  // Obtener eventos a mostrar (filtrados por categoría seleccionada o todos)
  const eventsToShow = useMemo(() => {
    if (selectedCategoryGroup) {
      return eventsByCategory[selectedCategoryGroup] || []
    }
    // Si no hay categoría seleccionada, mostrar todos los eventos
    return events
  }, [selectedCategoryGroup, eventsByCategory, events])

  // Transformar eventos para EventCard
  const transformedEvents = useMemo(() => {
    return eventsToShow.map((event) => ({
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
      ticketsLeft: event.total_tickets_available && event.total_tickets_available > 0
        ? event.total_tickets_available
        : undefined,
    }))
  }, [eventsToShow])

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 350
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  return (
    <section id="eventos" className="pt-24 pb-12 bg-black-deep">
      <div className="max-w-container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-wide mb-4 text-white">
            EVENTOS DESTACADOS
          </h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Descubre los mejores eventos y compra tus tickets de forma segura
          </p>
        </motion.div>

        {/* Categorías con contadores */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
          {Object.entries(eventsByCategory).map(([category, categoryEvents]) => {
            const count = categoryEvents.length
            if (count === 0) return null
            
            return (
              <button
                key={category}
                onClick={() =>
                  setSelectedCategoryGroup(
                    selectedCategoryGroup === category ? null : category
                  )
                }
                className={`px-6 py-3 rounded-full font-bold text-sm uppercase tracking-wide transition-all duration-300 ${
                  selectedCategoryGroup === category
                    ? 'bg-purple-vibrant text-white shadow-lg shadow-purple-vibrant/50'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
                }`}
              >
                <span className="font-black">{category}</span>
                {count > 0 && (
                  <span className="ml-2 text-xs opacity-80">
                    {count} DISPONIBLES
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-20">
            <div className="text-white/60 text-lg">Cargando eventos...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-20">
            <p className="text-red-400 text-lg mb-2">Error al cargar eventos</p>
            <p className="text-white/40 text-sm">{error}</p>
            <p className="text-white/40 text-xs mt-4">
              Revisa la consola del navegador para más detalles
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && transformedEvents.length === 0 && (
          <div className="text-center py-20">
            <p className="text-white/60 text-lg">
              No hay eventos disponibles en este momento
            </p>
            <p className="text-white/40 text-sm mt-2">
              Verifica que los eventos tengan status='published' y published_at no sea null
            </p>
          </div>
        )}

        {/* Carousel Container */}
        {!loading && transformedEvents.length > 0 && (
          <div className="relative">
            {/* Left Arrow */}
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white hover:scale-110 transition-all duration-300 shadow-lg"
              style={{
                background: 'linear-gradient(to bottom, #2A2A2A 0%, #1F1F1F 50%, #2A2A2A 100%)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(to bottom, #1F1F1F 0%, #2A2A2A 50%, #1F1F1F 100%)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(to bottom, #2A2A2A 0%, #1F1F1F 50%, #2A2A2A 100%)'
              }}
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Events Carousel */}
            <div
              ref={scrollRef}
              className="flex gap-6 overflow-x-auto overflow-y-hidden scrollbar-hide pb-4 px-12"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {transformedEvents.map((event, index) => (
                <EventCard key={event.id} event={event} index={index} />
              ))}
            </div>

            {/* Right Arrow */}
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white hover:scale-110 transition-all duration-300 shadow-lg"
              style={{
                background: 'linear-gradient(to bottom, #2A2A2A 0%, #1F1F1F 50%, #2A2A2A 100%)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(to bottom, #1F1F1F 0%, #2A2A2A 50%, #1F1F1F 100%)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(to bottom, #2A2A2A 0%, #1F1F1F 50%, #2A2A2A 100%)'
              }}
              aria-label="Scroll right"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center mt-12"
        >
          <a
            href="/eventos"
            className="inline-block px-10 py-4 rounded-full border border-white/20 text-white font-bold text-lg hover:scale-110 transition-all duration-300 shadow-lg"
            style={{
              background: 'linear-gradient(to bottom, #2A2A2A 0%, #1F1F1F 50%, #2A2A2A 100%)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(to bottom, #1F1F1F 0%, #2A2A2A 50%, #1F1F1F 100%)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(to bottom, #2A2A2A 0%, #1F1F1F 50%, #2A2A2A 100%)'
            }}
          >
            Ver Todos los Eventos
          </a>
        </motion.div>
      </div>
    </section>
  )
}

