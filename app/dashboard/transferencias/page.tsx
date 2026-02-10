'use client'

import { useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useTransfers } from '@/lib/hooks/useTransfers'
import { formatPrice } from '@/lib/utils/format'
import { Wallet, Clock, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'

export default function TransferenciasPage() {
  const { isProducer, isProducerActive, producer, loading: authLoading } = useAuth()
  const {
    transfers,
    loading: transfersLoading,
    error,
    totals,
    processTransfer,
    refetch,
  } = useTransfers(producer?.id || undefined)

  // En esta página confiamos en el layout/middleware para la protección,
  // solo hacemos chequeos mínimos para evitar parpadeos raros.
  useEffect(() => {
    // Si no hay productora todavía, no hacemos nada especial aquí.
  }, [producer?.id])

  if (authLoading || !isProducer) {
    return null
  }

  if (isProducerActive === false) {
    return null
  }

  const hasTransfers = transfers.length > 0

  const handleProcess = async (transferId: string) => {
    const result = await processTransfer(transferId)

    if (!result.success && result.error) {
      // En MVP usamos alert simple para mostrar el mensaje de error de reglas (240hs, settlement, etc.)
      alert(result.error)
    }
  }

  return (
    <div className="min-h-screen bg-black-deep text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-wide mb-2">
              Transferencias
            </h1>
            <p className="text-lightGray">
              Acá podés ver todas las transferencias asociadas a tus eventos y tickets.
            </p>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={transfersLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${transfersLoading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-mediumGray rounded-2xl p-6 border border-[#2F2F2F]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
            <h3 className="text-lightGray text-sm uppercase tracking-wide mb-1">
              Pendientes de Transferir
            </h3>
            <p className="text-3xl font-bold text-white">
              ${formatPrice(totals.pending)}
            </p>
          </div>

          <div className="bg-mediumGray rounded-2xl p-6 border border-[#2F2F2F]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <h3 className="text-lightGray text-sm uppercase tracking-wide mb-1">
              Transferido
            </h3>
            <p className="text-3xl font-bold text-white">
              ${formatPrice(totals.completed)}
            </p>
          </div>

          <div className="bg-mediumGray rounded-2xl p-6 border border-[#2F2F2F]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Wallet className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <h3 className="text-lightGray text-sm uppercase tracking-wide mb-1">
              Total de Transferencias
            </h3>
            <p className="text-3xl font-bold text-white">
              ${formatPrice(totals.total)}
            </p>
          </div>
        </div>

        {/* Estado de carga / error */}
        {error && (
          <div className="mb-4 flex items-center gap-2 text-sm text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {!hasTransfers && !transfersLoading && (
          <div className="bg-mediumGray rounded-2xl p-6 border border-[#2F2F2F] text-center text-lightGray">
            <p className="font-semibold mb-1">Todavía no tenés transferencias.</p>
            <p className="text-sm">
              Cuando empieces a vender tickets y se cumplan las condiciones de transferencia,
              vas a ver todas tus transferencias acá.
            </p>
          </div>
        )}

        {/* Listado de transferencias */}
        {hasTransfers && (
          <div className="bg-mediumGray rounded-2xl p-6 border border-[#2F2F2F]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold uppercase tracking-wide">
                Todas las transferencias
              </h2>
            </div>

            <div className="space-y-3">
              {transfers
                .filter((transfer) => {
                  // Filtrar basándose en mp_status (estado de Mercado Pago)
                  // Solo mostrar si Mercado Pago dice: approved, pending, refunded, charged_back
                  // NO mostrar si Mercado Pago dice: rejected, cancelled
                  const mpStatus = transfer.mp_status
                  
                  if (!mpStatus) {
                    // Si no hay mp_status, usar nuestro estado interno como fallback
                    return transfer.status !== 'failed'
                  }
                  
                  // Mostrar según estado de Mercado Pago
                  return mpStatus === 'approved' || 
                         mpStatus === 'pending' || 
                         mpStatus === 'refunded' || 
                         mpStatus === 'charged_back'
                })
                .map((transfer) => {
                  const createdAt = new Date(transfer.created_at)
                  const purchaseDate =
                    transfer.purchase && 'created_at' in transfer.purchase
                      ? new Date(transfer.purchase.created_at)
                      : null

                  // Usar mp_status para mostrar, pero mantener transfer.status para lógica
                  const displayStatus = transfer.mp_status || transfer.status
                  
                  const statusLabel =
                    displayStatus === 'approved' || displayStatus === 'completed'
                      ? 'Completada'
                      : displayStatus === 'pending'
                      ? 'Pendiente'
                      : displayStatus === 'refunded' || displayStatus === 'charged_back'
                      ? 'Reembolsada'
                      : displayStatus === 'rejected' || displayStatus === 'failed'
                      ? 'Fallida'
                      : displayStatus === 'cancelled'
                      ? 'Cancelada'
                      : 'Pendiente'

                  const statusColor =
                    displayStatus === 'approved' || displayStatus === 'completed'
                      ? 'text-green-400'
                      : displayStatus === 'pending'
                      ? 'text-yellow-400'
                      : displayStatus === 'refunded' || displayStatus === 'charged_back'
                      ? 'text-purple-400'
                      : displayStatus === 'rejected' || displayStatus === 'failed'
                      ? 'text-red-400'
                      : displayStatus === 'cancelled'
                      ? 'text-gray-400'
                      : 'text-yellow-400'

                return (
                  <div
                    key={transfer.id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white/5 rounded-lg border border-white/10"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">
                        {transfer.event?.name || 'Evento'}
                      </p>
                      <p className="text-lightGray text-sm">
                        {purchaseDate
                          ? `Compra: ${purchaseDate.toLocaleDateString('es-AR')} ${purchaseDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`
                          : `Creada: ${createdAt.toLocaleDateString('es-AR')} ${createdAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`}
                      </p>
                    </div>

                    <div className="flex flex-col md:items-end gap-2">
                      <div className="text-right">
                        <p className="text-white font-bold text-lg">
                          ${formatPrice(Number(transfer.amount))}
                        </p>
                        <span
                          className={`text-xs font-semibold uppercase ${statusColor}`}
                        >
                          {statusLabel}
                        </span>
                      </div>

                      {transfer.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => handleProcess(transfer.id)}
                          disabled={transfersLoading}
                          className="inline-flex items-center justify-center px-4 py-2 rounded-full text-xs font-semibold bg-purple-600 hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          Procesar transferencia
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

