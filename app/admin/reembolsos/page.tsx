'use client'

import { useState, useMemo } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAdminRefunds, RefundType, calculateRefundableAmount } from '@/lib/hooks/useAdminRefunds'
import { 
  RefreshCw,
  Search,
  Filter,
  X,
  CheckCircle,
  XCircle,
  DollarSign,
  Calendar,
  User,
  Mail,
  FileText,
  AlertCircle,
  Info,
  Clock,
  CreditCard
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function AdminRefundsPage() {
  const { user, profile, loading: authLoading, isAdmin } = useAuth()
  const router = useRouter()
  const [selectedStatus, setSelectedStatus] = useState<'pending' | 'approved' | 'rejected' | null>('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [processingRefund, setProcessingRefund] = useState<string | null>(null)
  const [selectedRefundType, setSelectedRefundType] = useState<RefundType | null>(null)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [selectedRefund, setSelectedRefund] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { refunds, allRefunds, loading, error, refetch } = useAdminRefunds(selectedStatus)

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/')
    }
  }, [authLoading, isAdmin, router])

  // Filtrar por búsqueda
  const filteredRefunds = useMemo(() => {
    if (!searchQuery.trim()) return refunds

    const query = searchQuery.toLowerCase()
    return refunds.filter((refund) => {
      const eventName = refund.purchase?.event?.name?.toLowerCase() || ''
      const userEmail = refund.purchase?.user?.email?.toLowerCase() || refund.guest_email?.toLowerCase() || ''
      const userName = refund.purchase?.user?.full_name?.toLowerCase() || refund.purchase?.guest_name?.toLowerCase() || ''
      const ticketNumber = refund.ticket?.ticket_number?.toLowerCase() || ''
      const reason = refund.reason?.toLowerCase() || ''
      const purchaseId = refund.purchase_id?.toLowerCase() || ''

      return (
        eventName.includes(query) ||
        userEmail.includes(query) ||
        userName.includes(query) ||
        ticketNumber.includes(query) ||
        reason.includes(query) ||
        purchaseId.includes(query)
      )
    })
  }, [refunds, searchQuery])

  // Estadísticas
  const stats = useMemo(() => {
    return {
      pending: allRefunds.filter((r) => r.status === 'pending').length,
      approved: allRefunds.filter((r) => r.status === 'approved').length,
      rejected: allRefunds.filter((r) => r.status === 'rejected').length,
      total: allRefunds.length,
      totalRefunded: allRefunds
        .filter((r) => r.status === 'approved')
        .reduce((sum, r) => sum + (r.refund_amount || 0), 0),
    }
  }, [allRefunds])

  const handleProcessRefund = async (refund: any, refundType: RefundType) => {
    if (!user?.id) return

    setProcessingRefund(refund.id)
    setErrorMessage(null)

    try {
      // Calcular monto reembolsable
      const eventStartDate = new Date(refund.purchase.event.start_date)
      const calculation = calculateRefundableAmount(refund.purchase, refundType, eventStartDate)

      if (calculation.refundableAmount === 0) {
        setErrorMessage(calculation.reason)
        setProcessingRefund(null)
        return
      }

      // Actualizar monto en la devolución
      const supabase = (await import('@/lib/supabase/client')).createClient()
      await supabase
        .from('refunds')
        .update({ refund_amount: calculation.refundableAmount })
        .eq('id', refund.id)

      // Procesar reembolso en Mercado Pago
      const response = await fetch('/api/admin/process-refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refundId: refund.id,
          refundType,
          adminId: user.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error procesando reembolso')
      }

      // Actualizar estado local
      refetch()
      setShowRefundModal(false)
      setSelectedRefund(null)
      setSelectedRefundType(null)
    } catch (err: any) {
      console.error('Error procesando reembolso:', err)
      setErrorMessage(err.message || 'Error procesando reembolso')
    } finally {
      setProcessingRefund(null)
    }
  }

  const handleRejectRefund = async (refundId: string, reason: string) => {
    if (!user?.id) return

    setProcessingRefund(refundId)
    setErrorMessage(null)

    try {
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const { error } = await supabase
        .from('refunds')
        .update({
          status: 'rejected',
          processed_at: new Date().toISOString(),
          processed_by: user.id,
        })
        .eq('id', refundId)

      if (error) throw error

      refetch()
      setShowRefundModal(false)
      setSelectedRefund(null)
    } catch (err: any) {
      console.error('Error rechazando devolución:', err)
      setErrorMessage(err.message || 'Error rechazando devolución')
    } finally {
      setProcessingRefund(null)
    }
  }

  const openRefundModal = (refund: any) => {
    setSelectedRefund(refund)
    setShowRefundModal(true)
    setSelectedRefundType(null)
    setErrorMessage(null)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black-deep flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    )
  }

  if (!isAdmin) {
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
              Gestión de Reembolsos
            </h1>
          </div>
          <p className="text-lightGray text-lg">
            Administra todas las solicitudes de reembolso del sistema
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-medium/80 backdrop-blur-sm rounded-2xl p-6 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm uppercase">Pendientes</span>
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <p className="text-3xl font-black text-white">{stats.pending}</p>
          </div>
          <div className="bg-gray-medium/80 backdrop-blur-sm rounded-2xl p-6 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm uppercase">Aprobadas</span>
              <CheckCircle className="w-5 h-5 text-green" />
            </div>
            <p className="text-3xl font-black text-white">{stats.approved}</p>
          </div>
          <div className="bg-gray-medium/80 backdrop-blur-sm rounded-2xl p-6 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm uppercase">Rechazadas</span>
              <XCircle className="w-5 h-5 text-red" />
            </div>
            <p className="text-3xl font-black text-white">{stats.rejected}</p>
          </div>
          <div className="bg-gray-medium/80 backdrop-blur-sm rounded-2xl p-6 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm uppercase">Total Reembolsado</span>
              <DollarSign className="w-5 h-5 text-purple-vibrant" />
            </div>
            <p className="text-3xl font-black text-white">
              ${stats.totalRefunded.toLocaleString('es-AR')}
            </p>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Buscar por evento, email, nombre, ticket..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-medium/80 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-purple-vibrant/50"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedStatus(null)}
              className={`px-4 py-3 rounded-xl font-semibold transition-colors ${
                selectedStatus === null
                  ? 'bg-purple-vibrant text-white'
                  : 'bg-gray-medium/80 text-white/60 hover:text-white'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setSelectedStatus('pending')}
              className={`px-4 py-3 rounded-xl font-semibold transition-colors ${
                selectedStatus === 'pending'
                  ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/50'
                  : 'bg-gray-medium/80 text-white/60 hover:text-white'
              }`}
            >
              Pendientes
            </button>
            <button
              onClick={() => setSelectedStatus('approved')}
              className={`px-4 py-3 rounded-xl font-semibold transition-colors ${
                selectedStatus === 'approved'
                  ? 'bg-green/20 text-green border border-green/50'
                  : 'bg-gray-medium/80 text-white/60 hover:text-white'
              }`}
            >
              Aprobadas
            </button>
            <button
              onClick={() => setSelectedStatus('rejected')}
              className={`px-4 py-3 rounded-xl font-semibold transition-colors ${
                selectedStatus === 'rejected'
                  ? 'bg-red/20 text-red border border-red/50'
                  : 'bg-gray-medium/80 text-white/60 hover:text-white'
              }`}
            >
              Rechazadas
            </button>
          </div>
        </div>

        {/* Lista de reembolsos */}
        {loading ? (
          <div className="text-center py-12 text-white/60">Cargando...</div>
        ) : filteredRefunds.length === 0 ? (
          <div className="text-center py-12 text-white/60">
            No hay reembolsos {selectedStatus ? `con estado "${selectedStatus}"` : ''}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRefunds.map((refund) => {
              const eventStartDate = new Date(refund.purchase.event.start_date)
              const purchaseDate = new Date(refund.purchase.created_at)
              const daysSincePurchase = Math.floor((Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24))
              const hoursUntilEvent = Math.floor((eventStartDate.getTime() - Date.now()) / (1000 * 60 * 60))
              const isWithinWithdrawalPeriod = daysSincePurchase <= 10 && hoursUntilEvent >= 24

              return (
                <div
                  key={refund.id}
                  className="bg-gray-medium/80 backdrop-blur-sm rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-all"
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Información principal */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-1">
                            {refund.purchase.event.name}
                          </h3>
                          <p className="text-white/60 text-sm">
                            {refund.purchase.user?.email || refund.guest_email || 'Email no disponible'}
                          </p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          refund.status === 'pending' ? 'bg-yellow-400/20 text-yellow-400' :
                          refund.status === 'approved' ? 'bg-green/20 text-green' :
                          'bg-red/20 text-red'
                        }`}>
                          {refund.status === 'pending' ? 'Pendiente' :
                           refund.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-white/60 mb-1">Compra</p>
                          <p className="text-white font-mono text-xs">
                            {refund.purchase_id.substring(0, 8).toUpperCase()}
                          </p>
                        </div>
                        <div>
                          <p className="text-white/60 mb-1">Monto Total</p>
                          <p className="text-white font-bold">
                            ${refund.purchase.total_amount.toLocaleString('es-AR')}
                          </p>
                        </div>
                        <div>
                          <p className="text-white/60 mb-1">Fecha Evento</p>
                          <p className="text-white">
                            {format(eventStartDate, 'dd/MM/yyyy HH:mm', { locale: es })}
                          </p>
                        </div>
                        <div>
                          <p className="text-white/60 mb-1">Motivo</p>
                          <p className="text-white line-clamp-1">{refund.reason}</p>
                        </div>
                      </div>

                      {refund.status === 'pending' && (
                        <div className="pt-4 border-t border-white/10">
                          <div className="flex flex-wrap gap-2 items-center text-xs">
                            <span className="text-white/60">Días desde compra:</span>
                            <span className={`font-bold ${daysSincePurchase <= 10 ? 'text-green' : 'text-red'}`}>
                              {daysSincePurchase}
                            </span>
                            <span className="text-white/60">•</span>
                            <span className="text-white/60">Horas hasta evento:</span>
                            <span className={`font-bold ${hoursUntilEvent >= 24 ? 'text-green' : 'text-red'}`}>
                              {hoursUntilEvent}
                            </span>
                            {isWithinWithdrawalPeriod && (
                              <>
                                <span className="text-white/60">•</span>
                                <span className="bg-green/20 text-green px-2 py-1 rounded-full">
                                  Aplica derecho de arrepentimiento
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Acciones */}
                    {refund.status === 'pending' && (
                      <div className="flex flex-col gap-2 lg:min-w-[200px]">
                        <button
                          onClick={() => openRefundModal(refund)}
                          className="px-4 py-2 bg-purple-vibrant hover:bg-purple-600 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          Procesar
                        </button>
                        <button
                          onClick={() => handleRejectRefund(refund.id, 'Rechazado por admin')}
                          disabled={processingRefund === refund.id}
                          className="px-4 py-2 bg-red/20 hover:bg-red/30 text-red border border-red/50 rounded-xl font-semibold transition-colors disabled:opacity-50"
                        >
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Modal de procesamiento */}
        {showRefundModal && selectedRefund && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-gray-medium rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Procesar Reembolso</h2>
                <button
                  onClick={() => {
                    setShowRefundModal(false)
                    setSelectedRefund(null)
                    setSelectedRefundType(null)
                    setErrorMessage(null)
                  }}
                  className="text-white/60 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Información de la compra */}
              <div className="space-y-4 mb-6">
                <div className="bg-gray-dark rounded-xl p-4 space-y-2">
                  <p className="text-white/60 text-sm">Evento</p>
                  <p className="text-white font-bold">{selectedRefund.purchase.event.name}</p>
                </div>
                <div className="bg-gray-dark rounded-xl p-4 space-y-2">
                  <p className="text-white/60 text-sm">Comprador</p>
                  <p className="text-white">
                    {selectedRefund.purchase.user?.full_name || selectedRefund.purchase.guest_name || 'N/A'}
                  </p>
                  <p className="text-white/60 text-sm">
                    {selectedRefund.purchase.user?.email || selectedRefund.guest_email}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-dark rounded-xl p-4">
                    <p className="text-white/60 text-sm mb-1">Monto Total</p>
                    <p className="text-white font-bold">
                      ${selectedRefund.purchase.total_amount.toLocaleString('es-AR')}
                    </p>
                  </div>
                  <div className="bg-gray-dark rounded-xl p-4">
                    <p className="text-white/60 text-sm mb-1">Cargo por Servicio</p>
                    <p className="text-white font-bold">
                      ${selectedRefund.purchase.commission_amount.toLocaleString('es-AR')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Selección de tipo de reembolso */}
              {!selectedRefundType ? (
                <div className="space-y-3 mb-6">
                  <p className="text-white font-semibold mb-3">Selecciona el tipo de reembolso:</p>
                  <button
                    onClick={() => setSelectedRefundType('right_of_withdrawal')}
                    className="w-full text-left p-4 bg-gray-dark hover:bg-gray-medium rounded-xl border border-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">Derecho de Arrepentimiento</p>
                        <p className="text-white/60 text-sm mt-1">
                          Reembolso total (incluye cargo por servicio) - 10 días + 24hs antes del evento
                        </p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-purple-vibrant" />
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedRefundType('event_cancellation')}
                    className="w-full text-left p-4 bg-gray-dark hover:bg-gray-medium rounded-xl border border-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">Cancelación Total del Evento</p>
                        <p className="text-white/60 text-sm mt-1">
                          Reembolso total (incluye cargo por servicio)
                        </p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-purple-vibrant" />
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedRefundType('date_change')}
                    className="w-full text-left p-4 bg-gray-dark hover:bg-gray-medium rounded-xl border border-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">Cambio de Fecha/Horario</p>
                        <p className="text-white/60 text-sm mt-1">
                          Reembolso parcial (sin cargo por servicio)
                        </p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-purple-vibrant" />
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedRefundType('venue_change')}
                    className="w-full text-left p-4 bg-gray-dark hover:bg-gray-medium rounded-xl border border-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">Cambio de Lugar</p>
                        <p className="text-white/60 text-sm mt-1">
                          Reembolso parcial (sin cargo por servicio)
                        </p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-purple-vibrant" />
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedRefundType('substantial_change')}
                    className="w-full text-left p-4 bg-gray-dark hover:bg-gray-medium rounded-xl border border-white/10 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">Modificación Sustancial</p>
                        <p className="text-white/60 text-sm mt-1">
                          Reembolso total (incluye cargo por servicio)
                        </p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-purple-vibrant" />
                    </div>
                  </button>
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  {/* Cálculo del reembolso */}
                  {(() => {
                    const eventStartDate = new Date(selectedRefund.purchase.event.start_date)
                    const calculation = calculateRefundableAmount(
                      selectedRefund.purchase,
                      selectedRefundType,
                      eventStartDate
                    )

                    return (
                      <div className="bg-purple-vibrant/10 border border-purple-vibrant/30 rounded-xl p-4">
                        <div className="flex items-start gap-3 mb-4">
                          <Info className="w-5 h-5 text-purple-vibrant flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-white font-semibold mb-1">Cálculo del Reembolso</p>
                            <p className="text-white/60 text-sm">{calculation.reason}</p>
                          </div>
                        </div>
                        <div className="pt-4 border-t border-purple-vibrant/20">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white/60">Monto a reembolsar:</span>
                            <span className="text-white font-black text-2xl">
                              ${calculation.refundableAmount.toLocaleString('es-AR')}
                            </span>
                          </div>
                          {calculation.serviceFeeRefundable ? (
                            <p className="text-green text-sm">✓ Incluye cargo por servicio</p>
                          ) : (
                            <p className="text-white/60 text-sm">
                              El cargo por servicio ({selectedRefund.purchase.commission_amount.toLocaleString('es-AR')} ARS) no es reembolsable
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })()}

                  {errorMessage && (
                    <div className="bg-red/20 border border-red/50 rounded-xl p-4 text-red text-sm">
                      {errorMessage}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleProcessRefund(selectedRefund, selectedRefundType)}
                      disabled={processingRefund === selectedRefund.id}
                      className="flex-1 px-6 py-3 bg-purple-vibrant hover:bg-purple-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {processingRefund === selectedRefund.id ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5" />
                          Procesar Reembolso
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRefundType(null)
                        setErrorMessage(null)
                      }}
                      className="px-6 py-3 bg-gray-dark hover:bg-gray-medium text-white rounded-xl font-semibold transition-colors"
                    >
                      Volver
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
