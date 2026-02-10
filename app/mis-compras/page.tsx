'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { usePurchases } from '@/lib/hooks/usePurchases'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale/es'
import { 
  Ticket, 
  Download, 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  CheckCircle, 
  Clock, 
  XCircle,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  User,
  Building2,
  LogOut,
  AlertCircle,
  Ban
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Footer from '@/components/Footer'

export default function MisComprasPage() {
  const { user, loading: authLoading, isAuthenticated, profile, signOut, isProducer } = useAuth()
  const { purchases, loading: purchasesLoading, error } = usePurchases(user?.id)
  const router = useRouter()
  const [requestingRefund, setRequestingRefund] = useState<string | null>(null)
  const [refundReason, setRefundReason] = useState('')
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<string | null>(null)
  const [expandedPurchase, setExpandedPurchase] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [refundsByPurchase, setRefundsByPurchase] = useState<Record<string, any>>({})

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  // Verificar estado de pagos pendientes con Mercado Pago
  useEffect(() => {
    if (!user?.id || purchases.length === 0) return

    async function checkPendingPayments() {
      // Buscar TODAS las compras pendientes (incluso sin payment_provider_id)
      // Si el usuario fue a Mercado Pago, puede haber un pago aunque no tengamos el ID
      const pendingPurchases = purchases.filter(
        p => p.payment_status === 'pending'
      )

      if (pendingPurchases.length === 0) return

      // Verificar cada compra pendiente
      for (const purchase of pendingPurchases) {
        try {
          const response = await fetch('/api/mercadopago/check-payment-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              purchaseId: purchase.id,
            }),
          })

          if (response.ok) {
            const data = await response.json()
            // Si el estado cambió, recargar las compras
            if (data.updated && data.paymentStatus !== 'pending') {
              // Forzar recarga de compras
              window.location.reload()
            }
          }
        } catch (error) {
          console.warn(`Error verificando estado de pago para compra ${purchase.id}:`, error)
        }
      }
    }

    // Verificar después de 3 segundos (dar tiempo al webhook)
    // Y también verificar periódicamente (cada 30 segundos) por si el webhook tarda
    const timeout1 = setTimeout(checkPendingPayments, 3000)
    const interval = setInterval(checkPendingPayments, 30000) // Cada 30 segundos
    
    return () => {
      clearTimeout(timeout1)
      clearInterval(interval)
    }
  }, [user?.id, purchases])

  // Obtener información de devoluciones aprobadas
  useEffect(() => {
    if (!user?.id || purchases.length === 0) return

    async function fetchRefunds() {
      const supabase = createClient()
      const purchaseIds = purchases.map(p => p.id)

      if (purchaseIds.length === 0) return

      const { data: refunds, error } = await supabase
        .from('refunds')
        .select('id, purchase_id, ticket_id, status, processed_at, reason')
        .in('purchase_id', purchaseIds)
        .eq('status', 'approved')

      if (error) {
        console.error('Error obteniendo devoluciones:', error)
        return
      }

      // Crear un mapa de purchase_id -> refunds
      const refundsMap: Record<string, any> = {}
      refunds?.forEach(refund => {
        if (!refundsMap[refund.purchase_id]) {
          refundsMap[refund.purchase_id] = []
        }
        refundsMap[refund.purchase_id].push(refund)
      })

      setRefundsByPurchase(refundsMap)
    }

    fetchRefunds()
  }, [user?.id, purchases])

  const generateQRCodeImage = async (qrCode: string): Promise<string> => {
    // Usar una API simple de QR code o generar directamente
    // Por ahora, usaremos una URL de API de QR code
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`
    
    // Convertir la imagen a base64
    const response = await fetch(qrUrl)
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  const handleDownloadPDF = async (purchase: any) => {
    try {
      // Generar imágenes de QR codes primero
      const qrImages = await Promise.all(
        purchase.tickets.map((ticket: any) => generateQRCodeImage(ticket.qr_code))
      )

      // Crear un elemento temporal para renderizar el PDF
      const pdfContainer = document.createElement('div')
      pdfContainer.style.position = 'absolute'
      pdfContainer.style.left = '-9999px'
      pdfContainer.style.width = '800px'
      pdfContainer.style.backgroundColor = '#000000'
      pdfContainer.style.padding = '40px'
      pdfContainer.style.color = '#FFFFFF'
      document.body.appendChild(pdfContainer)

      // Generar contenido del PDF con QR codes reales
      pdfContainer.innerHTML = `
        <div style="font-family: Arial, sans-serif; color: #FFFFFF;">
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="font-size: 32px; font-weight: bold; margin-bottom: 10px; color: #7C3AED;">SYNAPSE</h1>
            <p style="font-size: 18px; color: #A3A3A3;">Comprobante de Compra</p>
          </div>
          
          <div style="background: #1F1F1F; padding: 30px; border-radius: 16px; margin-bottom: 30px;">
            <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 20px; color: #FFFFFF;">${purchase.event.name}</h2>
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
              <span style="color: #A3A3A3;">Número de Compra:</span>
              <span style="color: #FFFFFF; font-weight: bold;">${purchase.id.substring(0, 8).toUpperCase()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
              <span style="color: #A3A3A3;">Fecha de Compra:</span>
              <span style="color: #FFFFFF;">${format(new Date(purchase.created_at), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
              <span style="color: #A3A3A3;">Total Pagado:</span>
              <span style="color: #7C3AED; font-size: 20px; font-weight: bold;">$${purchase.total_amount.toLocaleString('es-AR')} ARS</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
              <span style="color: #A3A3A3;">Estado:</span>
              <span style="color: ${purchase.payment_status === 'completed' ? '#10B981' : '#EF4444'}; font-weight: bold;">
                ${purchase.payment_status === 'completed' ? 'Completado' : purchase.payment_status}
              </span>
            </div>
          </div>

          <div style="margin-bottom: 30px;">
            <h3 style="font-size: 20px; font-weight: bold; margin-bottom: 20px; color: #FFFFFF;">Tus Entradas</h3>
            ${purchase.tickets.map((ticket: any, index: number) => `
              <div style="background: #1F1F1F; padding: 25px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #2F2F2F;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                  <div>
                    <p style="font-size: 18px; font-weight: bold; color: #FFFFFF; margin-bottom: 5px;">${ticket.ticket_type.name}</p>
                    <p style="font-size: 14px; color: #A3A3A3; font-family: monospace;">${ticket.ticket_number}</p>
                  </div>
                  <div style="background: #FFFFFF; padding: 15px; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                    <img src="${qrImages[index]}" alt="QR Code" style="width: 120px; height: 120px;" />
                  </div>
                </div>
                <div style="border-top: 1px solid #2F2F2F; padding-top: 15px; margin-top: 15px;">
                  <p style="font-size: 12px; color: #A3A3A3; margin-bottom: 5px;">Código QR:</p>
                  <p style="font-size: 14px; color: #FFFFFF; font-family: monospace; word-break: break-all;">${ticket.qr_code}</p>
                </div>
              </div>
            `).join('')}
          </div>

          <div style="text-align: center; color: #A3A3A3; font-size: 12px; margin-top: 40px;">
            <p>Este es un comprobante digital. Presenta este documento o tus tickets en el evento.</p>
            <p style="margin-top: 10px;">Synapse - Plataforma de Tickets</p>
          </div>
        </div>
      `

      // Esperar a que las imágenes se carguen
      await new Promise(resolve => setTimeout(resolve, 500))

      // Convertir a canvas y luego a PDF
      const canvas = await html2canvas(pdfContainer, {
        backgroundColor: '#000000',
        scale: 2,
        logging: false,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 210
      const pageHeight = 297
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      // Descargar PDF
      pdf.save(`synapse-compra-${purchase.id.substring(0, 8)}.pdf`)

      // Limpiar
      document.body.removeChild(pdfContainer)
    } catch (error) {
      console.error('Error generando PDF:', error)
      alert('Error al generar el PDF. Por favor, intenta nuevamente.')
    }
  }

  const handleRequestRefund = async () => {
    if (!selectedPurchase || !refundReason.trim()) {
      alert('Por favor, ingresa un motivo para la devolución.')
      return
    }

    setRequestingRefund(selectedPurchase)

    try {
      const supabase = createClient()
      const { error: refundError } = await supabase
        .from('refunds')
        .insert({
          purchase_id: selectedPurchase,
          user_id: user?.id || null,
          reason: refundReason.trim(),
          status: 'pending',
          refund_amount: purchases.find((p) => p.id === selectedPurchase)?.total_amount || null,
        })

      if (refundError) {
        throw new Error(refundError.message)
      }

      alert('Solicitud de devolución enviada. Te contactaremos pronto.')
      setShowRefundModal(false)
      setRefundReason('')
      setSelectedPurchase(null)
    } catch (error: any) {
      console.error('Error solicitando devolución:', error)
      alert(`Error al solicitar devolución: ${error.message}`)
    } finally {
      setRequestingRefund(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-4 py-1.5 bg-green/20 text-green border border-green/40 rounded-full text-xs font-semibold uppercase flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5" />
            Completado
          </span>
        )
      case 'pending':
        return (
          <span className="px-4 py-1.5 bg-yellow/20 text-yellow border border-yellow/40 rounded-full text-xs font-semibold uppercase flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            Pendiente
          </span>
        )
      case 'failed':
        return (
          <span className="px-4 py-1.5 bg-red-500/20 text-red-400 border-2 border-red-500/50 rounded-full text-xs font-bold uppercase flex items-center gap-2 shadow-[0_0_8px_rgba(239,68,68,0.3)]">
            <XCircle className="w-4 h-4 text-red-400" />
            Fallido
          </span>
        )
      case 'refunded':
        return (
          <span className="px-4 py-1.5 bg-purple-vibrant/20 text-purple-vibrant border border-purple-vibrant/40 rounded-full text-xs font-semibold uppercase flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            Reembolsado
          </span>
        )
      default:
        return null
    }
  }

  if (authLoading || purchasesLoading) {
    return (
      <div className="min-h-screen bg-black-deep flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-dark via-[#0A0A0A] to-gray-dark text-white">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 w-full bg-black-deep/80 backdrop-blur-md border-b border-[#2F2F2F]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo - Lado Izquierdo */}
            <Link href="/home" className="z-30">
              <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
                SYNAPSE
              </h1>
            </Link>

            {/* Desktop Menu - Centrado */}
            <nav className="hidden md:flex items-center gap-5 lg:gap-7 px-8 py-4 rounded-full bg-black/40 backdrop-blur-md border border-white/10 absolute left-1/2 transform -translate-x-1/2">
              <Link
                href="/eventos"
                className="text-white font-semibold text-base uppercase tracking-wide transition-colors duration-300 hover:text-white/80 px-3 py-1.5 rounded-lg border border-transparent hover:border-white/30 flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                Eventos
              </Link>
              <Link
                href="/mis-compras"
                className="text-white font-semibold text-base uppercase tracking-wide transition-colors duration-300 hover:text-white/80 px-3 py-1.5 rounded-lg border border-transparent hover:border-white/30 flex items-center gap-2"
              >
                <Ticket className="w-4 h-4" />
                Mis Tickets
              </Link>
              <Link
                href="/mi-perfil"
                className="text-white font-semibold text-base uppercase tracking-wide transition-colors duration-300 hover:text-white/80 px-3 py-1.5 rounded-lg border border-transparent hover:border-white/30 flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                Mi Perfil
              </Link>
              
              {/* Separador */}
              <div className="h-6 w-px bg-white/20 mx-2" />
              
              {!isProducer && (
                <Link
                  href="/register-producer"
                  className="text-white font-semibold text-base uppercase tracking-wide transition-colors duration-300 hover:text-white/80 px-3 py-1.5 rounded-lg border border-transparent hover:border-white/30 flex items-center gap-2"
                >
                  <Building2 className="w-4 h-4" />
                  Ser Productora
                </Link>
              )}
              {isProducer && (
                <Link
                  href="/dashboard"
                  className="text-white font-semibold text-base uppercase tracking-wide transition-colors duration-300 hover:text-white/80 px-3 py-1.5 rounded-lg border border-transparent hover:border-white/30 flex items-center gap-2"
                >
                  <Building2 className="w-4 h-4" />
                  Dashboard
                </Link>
              )}
            </nav>

            {/* Right Side - User Actions */}
            <div className="hidden md:flex items-center gap-4 ml-auto">
              <div className="flex items-center gap-2 text-white/90 text-sm">
                <User className="w-4 h-4" />
                <span className="max-w-[150px] truncate">
                  {(profile as any)?.full_name || user?.email}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-red/20 border border-red/50 text-red font-semibold rounded-full transition-all duration-300 hover:bg-red/30 uppercase tracking-wide text-sm flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Salir
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-white hover:text-white/80 transition-colors"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-white/10 pt-4">
              <div className="flex flex-col gap-3">
                <Link
                  href="/eventos"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-white font-semibold text-base uppercase tracking-wide transition-colors duration-300 hover:text-white/80 px-3 py-2 rounded-lg border border-transparent hover:border-white/30 flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Eventos
                </Link>
                <Link
                  href="/mis-compras"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-white font-semibold text-base uppercase tracking-wide transition-colors duration-300 hover:text-white/80 px-3 py-2 rounded-lg border border-transparent hover:border-white/30 flex items-center gap-2"
                >
                  <Ticket className="w-4 h-4" />
                  Mis Tickets
                </Link>
                <Link
                  href="/mi-perfil"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-white font-semibold text-base uppercase tracking-wide transition-colors duration-300 hover:text-white/80 px-3 py-2 rounded-lg border border-transparent hover:border-white/30 flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Mi Perfil
                </Link>
                {!isProducer && (
                  <Link
                    href="/register-producer"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-white font-semibold text-base uppercase tracking-wide transition-colors duration-300 hover:text-white/80 px-3 py-2 rounded-lg border border-transparent hover:border-white/30 flex items-center gap-2"
                  >
                    <Building2 className="w-4 h-4" />
                    Ser Productora
                  </Link>
                )}
                {isProducer && (
                  <Link
                    href="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-white font-semibold text-base uppercase tracking-wide transition-colors duration-300 hover:text-white/80 px-3 py-2 rounded-lg border border-transparent hover:border-white/30 flex items-center gap-2"
                  >
                    <Building2 className="w-4 h-4" />
                    Dashboard
                  </Link>
                )}
                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 text-white/70 text-sm mb-4">
                    <User className="w-4 h-4" />
                    <span className="truncate">
                      {(profile as any)?.full_name || user?.email}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      handleSignOut()
                      setIsMobileMenuOpen(false)
                    }}
                    className="w-full px-4 py-2 bg-red/20 border border-red/50 text-red font-semibold rounded-full transition-all duration-300 hover:bg-red/30 uppercase tracking-wide text-sm flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Salir
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-8 lg:py-12">
        {/* Header Simple y Limpio */}
        <div className="mb-12">
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2 text-lightGray hover:text-white transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-base font-medium">Volver</span>
          </button>
          <h1 className="text-5xl lg:text-6xl font-black uppercase tracking-tight text-white mb-2">
            Mis Compras
          </h1>
          <p className="text-lightGray text-lg">
            Gestiona tus tickets y compras
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red/10 border border-red/30 rounded-2xl p-6 mb-8">
            <p className="text-red font-medium">{error}</p>
          </div>
        )}

        {/* Empty State - Estilo FlashPass */}
        {!purchasesLoading && purchases.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 lg:py-32 text-center">
            <div className="relative mb-8">
              <div className="w-32 h-32 bg-purple-vibrant/20 rounded-3xl flex items-center justify-center">
                <Ticket className="w-16 h-16 text-purple-vibrant" />
              </div>
            </div>
            <h2 className="text-3xl lg:text-4xl font-black text-white mb-4">
              No tenés compras aún
            </h2>
            <p className="text-lightGray text-lg mb-10 max-w-lg leading-relaxed">
              Descubrí eventos increíbles cerca tuyo y comprá tus entradas en segundos.
            </p>
            <button
              onClick={() => router.push('/eventos')}
              className="px-10 py-4 bg-purple-vibrant hover:bg-[#9333EA] text-white font-bold rounded-[32px] transition-all duration-200 uppercase tracking-wider text-base shadow-[0_4px_24px_rgba(168,85,247,0.3)] hover:shadow-[0_8px_32px_rgba(168,85,247,0.5)]"
            >
              Explorar eventos
            </button>
          </div>
        )}

        {/* Purchases List - Diseño Limpio */}
        {purchases.length > 0 && (
          <div className="space-y-6">
            {purchases
              .filter((purchase) => {
                // Ocultar completamente los pagos fallidos de la lista principal
                // No tienen tickets y no aportan valor al usuario
                // Los datos se mantienen en BD para el panel de productora
                return purchase.payment_status !== 'failed'
              })
              .map((purchase) => (
              <div
                key={purchase.id}
                className={`rounded-2xl border overflow-hidden transition-all duration-200 ${
                  purchase.payment_status === 'failed'
                    ? 'bg-red/5 border-red/40 hover:border-red/60'
                    : purchase.payment_status === 'completed'
                    ? 'bg-mediumGray border-[#2F2F2F] hover:border-green/30'
                    : 'bg-mediumGray border-[#2F2F2F] hover:border-purple-vibrant/30'
                }`}
              >
                {/* Purchase Header - Simple y Limpio */}
                <div className={`p-6 lg:p-8 border-b ${
                  purchase.payment_status === 'failed'
                    ? 'border-red/30'
                    : 'border-[#2F2F2F]'
                }`}>
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    {/* Left Section */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4 flex-wrap">
                        <h3 className="text-2xl lg:text-3xl font-black uppercase tracking-tight text-white">
                          {purchase.event.name}
                        </h3>
                        {getStatusBadge(purchase.payment_status)}
                      </div>
                      <div className="flex flex-wrap gap-6 text-base text-lightGray">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-5 h-5" />
                          <span>
                            {format(new Date(purchase.event.start_date), "dd 'de' MMMM", { locale: es })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-5 h-5" />
                          <span>{purchase.event.venue_name}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Section */}
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-lightGray text-sm mb-1">Total</p>
                        <p className={`text-3xl lg:text-4xl font-black ${
                          purchase.payment_status === 'failed'
                            ? 'text-red-400'
                            : 'text-purple-vibrant'
                        }`}>
                          ${purchase.total_amount.toLocaleString('es-AR')}
                        </p>
                      </div>
                      <button
                        onClick={() => setExpandedPurchase(expandedPurchase === purchase.id ? null : purchase.id)}
                        className="px-8 py-3.5 text-white rounded-[32px] transition-all duration-300 font-bold text-sm uppercase tracking-wider flex items-center gap-2 shadow-[0_4px_16px_rgba(76,29,149,0.4)] hover:shadow-[0_8px_24px_rgba(76,29,149,0.6)] hover:scale-105 active:scale-95"
                        style={{ 
                          backgroundColor: '#4C1D95',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5B21B6'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4C1D95'}
                      >
                        {expandedPurchase === purchase.id ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            Ocultar
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            Ver Detalles
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Content - Simple y Limpio */}
                {expandedPurchase === purchase.id && (
                  <div className="p-6 lg:p-8 space-y-8 bg-[#1A1A1A]">
                    {/* Purchase Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-[#2F2F2F] rounded-xl p-5 border border-[#3F3F3F]">
                        <p className="text-lightGray text-xs uppercase tracking-wider mb-2 font-semibold">Número de Compra</p>
                        <p className="text-white font-mono font-black text-xl">
                          {purchase.id.substring(0, 8).toUpperCase()}
                        </p>
                      </div>
                      <div className="bg-[#2F2F2F] rounded-xl p-5 border border-[#3F3F3F]">
                        <p className="text-lightGray text-xs uppercase tracking-wider mb-2 font-semibold">Fecha de Compra</p>
                        <p className="text-white font-black text-lg">
                          {format(new Date(purchase.created_at), "dd/MM/yyyy", { locale: es })}
                        </p>
                        <p className="text-lightGray text-sm mt-1">
                          {format(new Date(purchase.created_at), "HH:mm", { locale: es })} hs
                        </p>
                      </div>
                      <div className="bg-[#2F2F2F] rounded-xl p-5 border border-[#3F3F3F]">
                        <p className="text-lightGray text-xs uppercase tracking-wider mb-2 font-semibold">Entradas</p>
                        <p className="text-white font-black text-3xl text-purple-vibrant">
                          {purchase.tickets.length}
                        </p>
                      </div>
                    </div>

                    {/* Tickets Section */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between pb-4 border-b border-[#2F2F2F]">
                        <h4 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                          <Ticket className="w-6 h-6 text-purple-vibrant" />
                          Tus Entradas
                        </h4>
                        <button
                          onClick={() => handleDownloadPDF(purchase)}
                          className="px-6 py-3 bg-teal hover:bg-teal/90 text-white rounded-[32px] transition-all duration-200 flex items-center gap-2 text-sm font-bold uppercase tracking-wider shadow-[0_4px_16px_rgba(20,184,166,0.3)]"
                        >
                          <Download className="w-4 h-4" />
                          Descargar PDF
                        </button>
                      </div>

                      {/* Tickets Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Los tickets solo existen si el pago está completado, así que los mostramos directamente */}
                        {purchase.tickets && purchase.tickets.length > 0 ? purchase.tickets.map((ticket) => {
                          const isRefunded = ticket.status === 'refunded'
                          const refundInfo = refundsByPurchase[purchase.id]?.find((r: any) => 
                            !r.ticket_id || r.ticket_id === ticket.id
                          )

                          return (
                            <div
                              key={ticket.id}
                              className={`bg-[#2F2F2F] rounded-2xl p-6 border transition-all duration-200 ${
                                isRefunded 
                                  ? 'border-red-500/50 opacity-75' 
                                  : 'border-[#3F3F3F] hover:border-purple-vibrant/30'
                              }`}
                            >
                              {/* Badge de Estado del Ticket */}
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <p className="text-white font-black text-lg uppercase tracking-tight">
                                      {ticket.ticket_type.name}
                                    </p>
                                    {isRefunded && (
                                      <span className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/50 rounded-full text-xs font-semibold uppercase flex items-center gap-1">
                                        <Ban className="w-3 h-3" />
                                        Reembolsado
                                      </span>
                                    )}
                                    {ticket.status === 'used' && (
                                      <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/50 rounded-full text-xs font-semibold uppercase flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" />
                                        Usado
                                      </span>
                                    )}
                                    {ticket.status === 'cancelled' && (
                                      <span className="px-3 py-1 bg-gray-500/20 text-gray-400 border border-gray-500/50 rounded-full text-xs font-semibold uppercase flex items-center gap-1">
                                        <XCircle className="w-3 h-3" />
                                        Cancelado
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-lightGray text-sm font-mono">
                                    {ticket.ticket_number}
                                  </p>
                                </div>
                                <Ticket className={`w-6 h-6 ${isRefunded ? 'text-red-400' : 'text-purple-vibrant'}`} />
                              </div>

                              {/* Banner de Devolución Aprobada */}
                              {isRefunded && refundInfo && (
                                <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                                  <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                      <p className="text-red-400 font-semibold text-sm mb-1">
                                        ✅ Devolución Aprobada
                                      </p>
                                      <p className="text-red-300/80 text-xs mb-2">
                                        Tu solicitud de devolución ha sido aprobada. Este ticket ya no es válido.
                                      </p>
                                      {refundInfo.processed_at && (
                                        <p className="text-red-300/60 text-xs">
                                          Procesada el {format(new Date(refundInfo.processed_at), "dd 'de' MMM, yyyy 'a las' HH:mm", { locale: es })}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* QR Code con overlay si está reembolsado */}
                              <div className="relative bg-white rounded-xl p-6 flex items-center justify-center mb-4">
                                {isRefunded && (
                                  <div className="absolute inset-0 bg-black/70 rounded-xl flex items-center justify-center z-10">
                                    <div className="text-center">
                                      <Ban className="w-12 h-12 text-red-400 mx-auto mb-2" />
                                      <p className="text-white font-bold text-sm uppercase">Ticket Reembolsado</p>
                                      <p className="text-white/80 text-xs mt-1">Este QR ya no es válido</p>
                                    </div>
                                  </div>
                                )}
                                <QRCodeSVG
                                  value={ticket.qr_code}
                                  size={160}
                                  level="H"
                                  includeMargin={true}
                                  className={isRefunded ? 'opacity-30' : ''}
                                />
                              </div>
                              <div className="border-t border-[#3F3F3F] pt-4">
                                <p className="text-lightGray text-xs mb-2 font-semibold">Código QR:</p>
                                <p className={`text-sm font-mono break-all bg-[#1F1F1F] p-3 rounded-lg ${
                                  isRefunded ? 'text-red-400/60 line-through' : 'text-white'
                                }`}>
                                  {ticket.qr_code}
                                </p>
                              </div>
                            </div>
                          )
                        }) : (
                          <div className="col-span-2 text-center py-8">
                            {purchase.payment_status === 'pending' && (
                              <p className="text-white/60">El pago está pendiente. Los tickets se generarán cuando se confirme el pago.</p>
                            )}
                            {purchase.payment_status === 'failed' && (
                              <div className="bg-red/10 border border-red/30 rounded-xl p-6">
                                <div className="flex items-center justify-center gap-3 mb-2">
                                  <XCircle className="w-6 h-6 text-red-400" />
                                  <p className="text-red-400 font-semibold text-lg">Pago Rechazado</p>
                                </div>
                                <p className="text-red-300/80 text-sm">El pago fue rechazado. No se generaron tickets.</p>
                              </div>
                            )}
                            {purchase.payment_status === 'refunded' && (
                              <p className="text-white/60">Esta compra fue reembolsada.</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {purchase.payment_status === 'completed' && (
                      <div className="flex gap-4 pt-4 border-t border-[#2F2F2F]">
                        <button
                          onClick={() => {
                            setSelectedPurchase(purchase.id)
                            setShowRefundModal(true)
                          }}
                          className="px-6 py-3 bg-red hover:bg-red/90 text-white rounded-[32px] transition-all duration-200 flex items-center gap-2 font-bold uppercase tracking-wider text-sm shadow-[0_4px_16px_rgba(239,68,68,0.3)]"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Solicitar Devolución
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Refund Modal - Simple y Limpio */}
      {showRefundModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            setShowRefundModal(false)
            setRefundReason('')
            setSelectedPurchase(null)
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-mediumGray rounded-2xl p-8 max-w-lg w-full border border-[#2F2F2F] shadow-[0_8px_48px_rgba(0,0,0,0.6)]"
          >
            <h3 className="text-2xl font-black uppercase tracking-tight mb-4">
              Solicitar Devolución
            </h3>
            <p className="text-lightGray mb-6 leading-relaxed">
              Por favor, indica el motivo de tu solicitud de devolución. Revisaremos tu solicitud y te contactaremos pronto.
            </p>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Ej: No puedo asistir al evento, cambio de planes, etc."
              className="w-full bg-[#2F2F2F] border border-[#3F3F3F] rounded-xl p-4 text-white placeholder-lightGray resize-none h-32 mb-6 focus:outline-none focus:border-purple-vibrant transition-all duration-200 text-base"
            />
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowRefundModal(false)
                  setRefundReason('')
                  setSelectedPurchase(null)
                }}
                className="flex-1 px-6 py-3 bg-[#2F2F2F] hover:bg-[#3F3F3F] border border-[#3F3F3F] text-white rounded-[32px] transition-all duration-200 font-semibold text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleRequestRefund}
                disabled={requestingRefund !== null || !refundReason.trim()}
                className="flex-1 px-6 py-3 bg-purple-vibrant hover:bg-[#9333EA] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-[32px] transition-all duration-200 font-bold uppercase tracking-wider text-sm shadow-[0_4px_16px_rgba(168,85,247,0.3)]"
              >
                {requestingRefund ? 'Enviando...' : 'Enviar Solicitud'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Footer */}
      <Footer />
    </div>
  )
}
