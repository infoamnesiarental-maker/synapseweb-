'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { useCheckout, CheckoutTicket } from '@/lib/hooks/useCheckout'
import { calculateTotalPrice, formatPriceBreakdown } from '@/lib/utils/pricing'
import { formatPrice } from '@/lib/utils/format'
import { Ticket, ArrowLeft, User, Mail, Phone } from 'lucide-react'
import Link from 'next/link'

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated } = useAuth()
  const { createPurchase, loading, error } = useCheckout()

  const [tickets, setTickets] = useState<CheckoutTicket[]>([])
  const [eventId, setEventId] = useState<string | null>(null)
  const [eventName, setEventName] = useState<string>('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    // Obtener datos del query string
    const ticketsParam = searchParams.get('tickets')
    const eventIdParam = searchParams.get('eventId')
    const eventNameParam = searchParams.get('eventName')

    if (!ticketsParam || !eventIdParam) {
      router.push('/eventos')
      return
    }

    try {
      const parsedTickets = JSON.parse(decodeURIComponent(ticketsParam)) as CheckoutTicket[]
      setTickets(parsedTickets)
      setEventId(eventIdParam)
      setEventName(eventNameParam || 'Evento')
    } catch (err) {
      console.error('Error parseando tickets:', err)
      router.push('/eventos')
    }
  }, [searchParams, router])

  const breakdown = tickets.length > 0 ? calculateTotalPrice(tickets) : null
  const formattedBreakdown = breakdown ? formatPriceBreakdown(breakdown) : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!eventId || tickets.length === 0) return

    // Validar datos
    if (!isAuthenticated) {
      if (!guestEmail || !guestName) {
        alert('Por favor completa todos los campos requeridos')
        return
      }
    }

    setSubmitted(true)

    const result = await createPurchase({
      tickets,
      eventId,
      userId: user?.id,
      guestEmail: !isAuthenticated ? guestEmail : undefined,
      guestName: !isAuthenticated ? guestName : undefined,
      guestPhone: !isAuthenticated ? guestPhone : undefined,
    })

    if (result.success) {
      // Si hay una URL de pago de Mercado Pago, redirigir allí
      if (result.paymentUrl) {
        window.location.href = result.paymentUrl
      } else {
        // Si no hay URL (modo desarrollo/simulado), redirigir a success
        router.push(`/checkout/success?purchaseId=${result.purchaseId}`)
      }
    } else {
      setSubmitted(false)
    }
  }

  if (!breakdown || tickets.length === 0) {
    return (
      <div className="min-h-screen bg-black-deep flex items-center justify-center">
        <div className="text-white/60">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black-deep relative overflow-hidden">
      {/* Background gradient */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-black-deep via-gray-dark to-black-deep" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-vibrant/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/eventos/${eventId}`}
            className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver al evento</span>
          </Link>
          <h1 className="text-4xl font-black uppercase tracking-wider text-white mb-2">
            Checkout
          </h1>
          <p className="text-white/60">{eventName}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulario */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Datos del comprador */}
              <div className="bg-gray-medium/80 backdrop-blur-sm rounded-2xl p-6 space-y-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)] border border-white/5">
                <div className="flex items-center gap-3 mb-6">
                  <User className="w-5 h-5 text-purple-vibrant" />
                  <h2 className="text-xl font-black uppercase tracking-wider text-white">
                    Datos del Comprador
                  </h2>
                </div>

                {isAuthenticated ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-white/60 text-xs uppercase tracking-wider font-semibold mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="w-full px-4 py-3 bg-gray-dark border border-white/10 rounded-xl text-white/60"
                      />
                    </div>
                    <div>
                      <label className="block text-white/60 text-xs uppercase tracking-wider font-semibold mb-2">
                        Nombre
                      </label>
                      <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="Tu nombre completo"
                        className="w-full px-4 py-3 bg-gray-dark border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-vibrant/50"
                      />
                    </div>
                    <div>
                      <label className="block text-white/60 text-xs uppercase tracking-wider font-semibold mb-2">
                        Teléfono (opcional)
                      </label>
                      <input
                        type="tel"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        placeholder="+54 9 11 1234-5678"
                        className="w-full px-4 py-3 bg-gray-dark border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-vibrant/50"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-white/60 text-xs uppercase tracking-wider font-semibold mb-2">
                        Email <span className="text-red">*</span>
                      </label>
                      <input
                        type="email"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        required
                        placeholder="tu@email.com"
                        className="w-full px-4 py-3 bg-gray-dark border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-vibrant/50"
                      />
                    </div>
                    <div>
                      <label className="block text-white/60 text-xs uppercase tracking-wider font-semibold mb-2">
                        Nombre Completo <span className="text-red">*</span>
                      </label>
                      <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        required
                        placeholder="Tu nombre completo"
                        className="w-full px-4 py-3 bg-gray-dark border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-vibrant/50"
                      />
                    </div>
                    <div>
                      <label className="block text-white/60 text-xs uppercase tracking-wider font-semibold mb-2">
                        Teléfono (opcional)
                      </label>
                      <input
                        type="tel"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        placeholder="+54 9 11 1234-5678"
                        className="w-full px-4 py-3 bg-gray-dark border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-vibrant/50"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Resumen de tickets */}
              <div className="bg-gray-medium/80 backdrop-blur-sm rounded-2xl p-6 space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.4)] border border-white/5">
                <h3 className="text-lg font-black uppercase tracking-wider text-white mb-4">
                  Resumen de Entradas
                </h3>
                {tickets.map((ticket, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-3 border-b border-white/10 last:border-0"
                  >
                    <div>
                      <p className="text-white font-semibold">{ticket.ticketTypeName}</p>
                      <p className="text-white/60 text-sm">
                        {ticket.quantity} x ${formatPrice(ticket.basePrice)}
                      </p>
                    </div>
                    <p className="text-white font-bold">
                      ${formatPrice(ticket.basePrice * ticket.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red/20 border border-red/50 rounded-xl p-4 text-red text-sm">
                  {error}
                </div>
              )}

              {/* Botón de compra */}
              <button
                type="submit"
                disabled={loading || submitted}
                className="w-full py-4 px-8 rounded-full bg-gradient-to-r from-purple-vibrant via-purple-600 to-purple-vibrant text-white font-bold text-base uppercase tracking-wider hover:scale-105 transition-all duration-300 shadow-lg shadow-purple-vibrant/50 hover:shadow-purple-vibrant/70 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <Ticket className="w-5 h-5" />
                    <span>Confirmar Compra</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Resumen de pago */}
          <div className="lg:col-span-1">
            <div className="bg-gray-medium/80 backdrop-blur-sm rounded-2xl p-6 space-y-6 shadow-[0_4px_24px_rgba(0,0,0,0.4)] border border-white/5 sticky top-24">
              <h3 className="text-lg font-black uppercase tracking-wider text-white mb-4">
                Resumen de Pago
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between text-white/60 text-sm">
                  <span>Subtotal</span>
                  <span>${formattedBreakdown?.basePrice} ARS</span>
                </div>
                <div className="flex justify-between text-white/60 text-sm">
                  <span>Comisión Synapse (15%)</span>
                  <span>${formattedBreakdown?.commission} ARS</span>
                </div>
                <div className="h-px bg-white/10 my-4" />
                <div className="flex justify-between">
                  <span className="text-white font-bold text-lg">Total</span>
                  <span className="text-white font-black text-2xl">
                    ${formattedBreakdown?.totalPrice} ARS
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <p className="text-white/40 text-xs leading-relaxed">
                  Al confirmar, recibirás tus entradas por email. El pago se procesará
                  mediante Mercado Pago.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black-deep flex items-center justify-center">
        <div className="text-white/60">Cargando...</div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
