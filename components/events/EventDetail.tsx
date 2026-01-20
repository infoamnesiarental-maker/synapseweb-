'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import {
  Calendar,
  MapPin,
  Clock,
  Ticket,
  ArrowLeft,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale/es'
import { formatPrice } from '@/lib/utils/format'
import { useEventBySlug, TicketType } from '@/lib/hooks/useEventBySlug'
import { useEventView } from '@/lib/hooks/useEventView'
import CheckoutWizard from '@/components/checkout/CheckoutWizard'
import { CheckoutTicket } from '@/lib/hooks/useCheckout'

interface EventDetailProps {
  slug: string
}

export default function EventDetail({ slug }: EventDetailProps) {
  const { event, loading, error } = useEventBySlug(slug)
  useEventView(event?.id || null)

  // Todos los hooks deben estar al principio, antes de cualquier retorno condicional
  const [selectedTicketType, setSelectedTicketType] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [showCheckout, setShowCheckout] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen bg-black-deep flex items-center justify-center">
        <div className="text-white/60">Cargando evento...</div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-black-deep flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 text-lg mb-4">
            {error || 'Evento no encontrado'}
          </p>
          <Link
            href="/eventos"
            className="px-6 py-3 bg-purple-vibrant text-white rounded-xl hover:bg-purple-600 transition-colors inline-block"
          >
            Volver a eventos
          </Link>
        </div>
      </div>
    )
  }

  const startDate = new Date(event.start_date)
  const endDate = new Date(event.end_date)
  const isSameDay = format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd')

  // Calcular precio mínimo
  const minPrice =
    event.ticket_types.length > 0
      ? Math.min(...event.ticket_types.map((tt) => Number(tt.price)))
      : 0

  // Filtrar tickets disponibles (que no estén agotados y estén en fecha de venta)
  const now = new Date()
  const availableTickets = event.ticket_types.filter((tt) => {
    const available = tt.quantity_available - tt.quantity_sold > 0
    
    // Si no hay fechas de venta configuradas, el ticket está disponible
    if (!tt.sale_start_date && !tt.sale_end_date) {
      return available
    }
    
    // Verificar si la venta ya comenzó
    const saleStarted = !tt.sale_start_date || new Date(tt.sale_start_date) <= now
    
    // Verificar si la venta no ha terminado
    const saleNotEnded = !tt.sale_end_date || new Date(tt.sale_end_date) >= now
    
    return available && saleStarted && saleNotEnded
  })

  const selectedTicket = availableTickets.find((tt) => tt.id === selectedTicketType)

  function handleBuyTickets() {
    if (!selectedTicket) return
    setShowCheckout(true)
  }

  return (
    <div className="min-h-screen bg-black-deep relative overflow-hidden">
      {/* Background gradient effect */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-black-deep via-gray-dark to-black-deep" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-vibrant/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal/5 rounded-full blur-3xl" />
      </div>

      {/* Header con botón volver */}
      <div className="sticky top-0 z-50 bg-black-deep/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/eventos"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver a eventos</span>
          </Link>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Columna izquierda: Flyer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="lg:sticky lg:top-24 h-fit"
          >
            {event.flyer_url && (
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gray-medium shadow-[0_8px_48px_rgba(0,0,0,0.6)] border border-white/5 group">
                <Image
                  src={event.flyer_url}
                  alt={event.name}
                  fill
                  className="object-contain transition-transform duration-300 group-hover:scale-105"
                  priority
                  unoptimized={event.flyer_url.includes('supabase.co')}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black-deep/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            )}
          </motion.div>

          {/* Columna derecha: Detalles y Tickets */}
          <div className="space-y-6">
            {/* Información del evento */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className="bg-gray-medium/80 backdrop-blur-sm rounded-2xl p-6 space-y-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)] border border-white/5"
            >
              {/* Título y categoría */}
              <div className="space-y-4">
                {event.category && (
                  <span className="inline-block px-4 py-2 bg-purple-vibrant/20 text-purple-vibrant text-xs font-bold uppercase tracking-wider rounded-full border border-purple-vibrant/30">
                    {event.category}
                  </span>
                )}
                <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-wider text-white leading-tight">
                  {event.name}
                </h1>
              </div>

              {/* Divider */}
              <div className="h-px bg-white/10" />

              {/* Fecha y Horario */}
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-vibrant/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-vibrant" />
                </div>
                <div>
                  <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Fecha y Horario</p>
                  <p className="text-white font-bold text-base uppercase tracking-wide">
                    {format(startDate, 'EEE d', { locale: es }).toUpperCase()} DE{' '}
                    {format(startDate, 'MMM', { locale: es }).toUpperCase()} {format(startDate, 'yyyy', { locale: es })} |{' '}
                    {format(startDate, 'HH:mm', { locale: es })} - {format(endDate, 'HH:mm', { locale: es })}
                  </p>
                </div>
              </div>

              {/* Ubicación */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-teal/20 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-teal" />
                </div>
                <div>
                  <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Ubicación</p>
                  <p className="text-white font-bold">{event.venue_name}</p>
                  {event.venue_address && (
                    <p className="text-sm text-white/60 mt-1">{event.venue_address}</p>
                  )}
                  {event.venue_city && (
                    <p className="text-sm text-white/60">{event.venue_city}</p>
                  )}
                </div>
              </div>

              {/* Descripción */}
              {event.description && (
                <>
                  <div className="h-px bg-white/10" />
                  <div>
                    <p className="text-white/60 text-xs uppercase tracking-wider mb-2">Descripción</p>
                    <p className="text-white/80 leading-relaxed whitespace-pre-line">
                      {event.description}
                    </p>
                  </div>
                </>
              )}
            </motion.div>

            {/* Sección de Tickets */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className="bg-gray-medium/80 backdrop-blur-sm rounded-2xl p-6 space-y-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)] border border-white/5"
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-vibrant/20 flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-purple-vibrant" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-wider text-white">
                  Entradas
                </h2>
              </div>
              {minPrice > 0 && (
                <p className="text-white/60 text-sm uppercase tracking-wide">
                  Desde <span className="text-purple-vibrant font-bold">${formatPrice(minPrice)} ARS</span>
                </p>
              )}

              {availableTickets.length === 0 ? (
                <div className="text-center py-8">
                  <Ticket className="w-12 h-12 text-white/30 mx-auto mb-4" />
                  <p className="text-white/60 mb-2">No hay entradas disponibles</p>
                  {event.ticket_types.length > 0 && (
                    <div className="mt-4 space-y-2 text-left">
                      <p className="text-white/40 text-xs mb-2">Tickets en la base de datos:</p>
                      {event.ticket_types.map((tt) => {
                        const available = tt.quantity_available - tt.quantity_sold
                        const now = new Date()
                        const saleStarted = !tt.sale_start_date || new Date(tt.sale_start_date) <= now
                        const saleNotEnded = !tt.sale_end_date || new Date(tt.sale_end_date) >= now
                        
                        return (
                          <div key={tt.id} className="text-xs text-white/50 bg-white/5 p-2 rounded">
                            <p><strong>{tt.name}:</strong> {available} disponibles</p>
                            {!saleStarted && tt.sale_start_date && (
                              <p className="text-yellow-400">⏳ Venta inicia: {format(new Date(tt.sale_start_date), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                            )}
                            {!saleNotEnded && tt.sale_end_date && (
                              <p className="text-red-400">⏰ Venta terminó: {format(new Date(tt.sale_end_date), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                            )}
                            {available <= 0 && (
                              <p className="text-red-400">❌ Agotado</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Lista de tipos de tickets */}
                  <div className="space-y-4">
                    {event.ticket_types.map((ticket) => {
                      const isAvailable = availableTickets.some((tt) => tt.id === ticket.id)
                      const isSoldOut = ticket.quantity_available - ticket.quantity_sold <= 0
                      const priceARS = Number(ticket.price)
                      // Conversión aproximada USD (puedes ajustar el tipo de cambio)
                      const priceUSD = Math.round(priceARS / 1500) // Aproximado 1 USD = 1500 ARS
                      const isSelected = selectedTicketType === ticket.id
                      
                      return (
                        <motion.div
                          key={ticket.id}
                          whileHover={isAvailable && !isSoldOut ? { scale: 1.02, y: -2 } : {}}
                          className={`relative bg-gradient-to-br from-gray-dark via-gray-dark to-gray-medium/50 rounded-xl p-5 border-2 transition-all duration-300 overflow-hidden ${
                            isAvailable && !isSoldOut
                              ? isSelected
                                ? 'border-purple-vibrant bg-purple-vibrant/10 shadow-[0_0_32px_rgba(168,85,247,0.4)]'
                                : 'border-white/10 hover:border-purple-vibrant/40 cursor-pointer hover:shadow-[0_8px_32px_rgba(168,85,247,0.2)]'
                              : 'border-white/5 opacity-60'
                          } ${!isAvailable || isSoldOut ? 'cursor-not-allowed' : ''}`}
                          onClick={() => {
                            if (isAvailable && !isSoldOut) {
                              setSelectedTicketType(ticket.id)
                            }
                          }}
                        >
                          {/* Glow effect cuando está seleccionado */}
                          {isSelected && (
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-vibrant/10 via-purple-vibrant/5 to-transparent pointer-events-none" />
                          )}
                          
                          <div className="relative flex items-start justify-between gap-6">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  isAvailable && !isSoldOut 
                                    ? isSelected 
                                      ? 'bg-purple-vibrant shadow-[0_0_8px_rgba(168,85,247,0.8)]' 
                                      : 'bg-white/20'
                                    : 'bg-white/10'
                                }`} />
                                <h3 className="text-white font-black text-lg uppercase tracking-wider">
                                  {ticket.name}
                                </h3>
                              </div>
                              {ticket.description && (
                                <p className="text-white/60 text-sm leading-relaxed ml-5">
                                  {ticket.description}
                                </p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="bg-white/5 rounded-lg px-4 py-2 border border-white/10">
                                <p className="text-white font-black text-2xl mb-1">
                                  {priceUSD} USD
                                </p>
                                <p className="text-white/70 text-sm font-semibold">
                                  ARS ${formatPrice(priceARS)}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="relative flex items-center justify-between mt-5 pt-4 border-t border-white/10">
                            {isSoldOut ? (
                              <span className="px-4 py-2 bg-red/20 text-red text-xs font-bold uppercase tracking-wider rounded-full border border-red/40 shadow-[0_0_12px_rgba(239,68,68,0.3)]">
                                Agotado
                              </span>
                            ) : !isAvailable ? (
                              <span className="text-white/40 text-xs uppercase tracking-wide">
                                No disponible
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green animate-pulse" />
                                <span className="text-white/70 text-xs uppercase tracking-wide font-semibold">
                                  {ticket.quantity_available - ticket.quantity_sold} disponibles
                                </span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>

                  {/* Selector de cantidad */}
                  {selectedTicket && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                      className="space-y-6 pt-6 border-t border-white/10"
                    >
                      <div>
                        <label className="block text-white/80 text-xs uppercase tracking-wider font-semibold mb-4">
                          Cantidad
                        </label>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="w-12 h-12 rounded-xl bg-gray-dark text-white hover:bg-gray-medium transition-all duration-300 font-bold text-lg flex items-center justify-center hover:scale-105"
                          >
                            −
                          </button>
                          <span className="text-white font-black text-xl w-16 text-center">
                            {quantity}
                          </span>
                          <button
                            onClick={() =>
                              setQuantity(
                                Math.min(
                                  selectedTicket.quantity_available -
                                    selectedTicket.quantity_sold,
                                  quantity + 1
                                )
                              )
                            }
                            className="w-12 h-12 rounded-xl bg-gray-dark text-white hover:bg-gray-medium transition-all duration-300 font-bold text-lg flex items-center justify-center hover:scale-105"
                          >
                            +
                          </button>
                          <span className="text-white/60 text-xs uppercase tracking-wide ml-auto">
                            Máx: {selectedTicket.quantity_available - selectedTicket.quantity_sold}
                          </span>
                        </div>
                      </div>

                      {/* Total */}
                      <div className="pt-6 border-t border-white/10">
                        <div className="flex items-center justify-between mb-6">
                          <span className="text-white/60 text-sm uppercase tracking-wide">Total</span>
                          <span className="text-white font-black text-3xl">
                            ${formatPrice(Number(selectedTicket.price) * quantity)}
                          </span>
                        </div>

                        <button
                          onClick={handleBuyTickets}
                          className="w-full py-4 px-8 rounded-full bg-gradient-to-r from-purple-vibrant via-purple-600 to-purple-vibrant text-white font-bold text-base uppercase tracking-wider hover:scale-105 transition-all duration-300 shadow-lg shadow-purple-vibrant/50 hover:shadow-purple-vibrant/70 flex items-center justify-center gap-2"
                        >
                          <Ticket className="w-5 h-5" />
                          <span>Comprar Entradas</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Checkout Wizard Modal */}
      {showCheckout && selectedTicket && (
        <CheckoutWizard
          tickets={[
            {
              ticketTypeId: selectedTicket.id,
              ticketTypeName: selectedTicket.name,
              quantity: quantity,
              basePrice: Number(selectedTicket.price),
              eventId: event.id,
            },
          ]}
          eventId={event.id}
          eventName={event.name}
          onClose={() => setShowCheckout(false)}
        />
      )}
    </div>
  )
}
