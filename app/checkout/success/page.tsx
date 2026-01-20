'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Ticket, Mail, Download } from 'lucide-react'
import Link from 'next/link'

function CheckoutSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const purchaseId = searchParams.get('purchaseId')
  const [purchase, setPurchase] = useState<any>(null)
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!purchaseId) {
      router.push('/eventos')
      return
    }

    async function fetchPurchaseData() {
      const supabase = createClient()
      
      // Obtener compra
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('purchases')
        .select('*')
        .eq('id', purchaseId)
        .single()

      if (purchaseError || !purchaseData) {
        console.error('Error obteniendo compra:', purchaseError)
        setLoading(false)
        return
      }

      setPurchase(purchaseData)

      // Obtener tickets
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('tickets')
        .select('*, ticket_types(name), events(name, slug)')
        .eq('purchase_id', purchaseId)

      if (ticketsError) {
        console.error('Error obteniendo tickets:', ticketsError)
      } else {
        setTickets(ticketsData || [])
      }

      setLoading(false)
    }

    fetchPurchaseData()
  }, [purchaseId, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-black-deep flex items-center justify-center">
        <div className="text-white/60">Cargando...</div>
      </div>
    )
  }

  if (!purchase) {
    return (
      <div className="min-h-screen bg-black-deep flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 text-lg mb-4">Compra no encontrada</p>
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

  return (
    <div className="min-h-screen bg-black-deep relative overflow-hidden">
      {/* Background gradient */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-black-deep via-gray-dark to-black-deep" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-green/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-gray-medium/80 backdrop-blur-sm rounded-2xl p-8 space-y-8 shadow-[0_4px_24px_rgba(0,0,0,0.4)] border border-white/5 text-center">
          {/* Icono de éxito */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-green/20 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green" />
            </div>
          </div>

          {/* Título */}
          <div>
            <h1 className="text-3xl font-black uppercase tracking-wider text-white mb-2">
              ¡Compra Exitosa!
            </h1>
            <p className="text-white/60">
              Tu compra ha sido procesada correctamente
            </p>
          </div>

          {/* Información de la compra */}
          <div className="bg-gray-dark rounded-xl p-6 space-y-4 text-left">
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-sm">Número de compra</span>
              <span className="text-white font-mono text-sm">
                {purchase.id.substring(0, 8).toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-sm">Total pagado</span>
              <span className="text-white font-bold text-lg">
                ${purchase.total_amount?.toLocaleString('es-AR')} ARS
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-sm">Entradas</span>
              <span className="text-white font-semibold">{tickets.length}</span>
            </div>
          </div>

          {/* Tickets */}
          {tickets.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-black uppercase tracking-wider text-white text-left">
                Tus Entradas
              </h3>
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="bg-gray-dark rounded-xl p-4 border border-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">
                          {ticket.ticket_types?.name || 'Entrada'}
                        </p>
                        <p className="text-white/60 text-sm font-mono">
                          {ticket.ticket_number}
                        </p>
                      </div>
                      <Ticket className="w-8 h-8 text-purple-vibrant" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mensaje de email */}
          <div className="bg-purple-vibrant/10 border border-purple-vibrant/30 rounded-xl p-4 flex items-start gap-3">
            <Mail className="w-5 h-5 text-purple-vibrant flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="text-white font-semibold text-sm mb-1">
                Entradas enviadas por email
              </p>
              <p className="text-white/60 text-xs">
                Hemos enviado tus entradas a{' '}
                <span className="text-white font-semibold">
                  {purchase.guest_email || purchase.user_id}
                </span>
                . También puedes descargarlas desde "Mis Compras".
              </p>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/mis-compras"
              className="flex-1 px-6 py-3 bg-purple-vibrant text-white rounded-xl hover:bg-purple-600 transition-colors font-semibold text-center"
            >
              Ver Mis Compras
            </Link>
            <Link
              href="/eventos"
              className="flex-1 px-6 py-3 bg-gray-dark text-white rounded-xl hover:bg-gray-medium transition-colors font-semibold text-center border border-white/10"
            >
              Ver Más Eventos
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black-deep flex items-center justify-center">
        <div className="text-white/60">Cargando...</div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  )
}
