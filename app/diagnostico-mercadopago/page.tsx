'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react'

interface DiagnosticCheck {
  name: string
  status: 'ok' | 'error' | 'warning'
  message: string
  details?: any
}

interface DiagnosticResult {
  timestamp: string
  environment: string
  checks: DiagnosticCheck[]
  summary: {
    allOk: boolean
    hasErrors: boolean
    totalChecks: number
    passedChecks: number
    failedChecks: number
    warnings: number
  }
}

export default function DiagnosticoMercadoPagoPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DiagnosticResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runDiagnostics = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/mercadopago/diagnose')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error ejecutando diagnóstico')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message || 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: DiagnosticCheck['status']) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="w-5 h-5 text-green" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
    }
  }

  const getStatusColor = (status: DiagnosticCheck['status']) => {
    switch (status) {
      case 'ok':
        return 'border-green/50 bg-green/5'
      case 'error':
        return 'border-red/50 bg-red/5'
      case 'warning':
        return 'border-yellow-500/50 bg-yellow-500/5'
    }
  }

  return (
    <div className="min-h-screen bg-black-deep py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-medium/80 backdrop-blur-sm rounded-2xl p-8 shadow-[0_4px_24px_rgba(0,0,0,0.4)] border border-white/5">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-wider text-white mb-2">
                🔍 Diagnóstico Mercado Pago
              </h1>
              <p className="text-white/60">
                Verifica la configuración de tu integración con Mercado Pago
              </p>
            </div>
            <button
              onClick={runDiagnostics}
              disabled={loading}
              className="px-6 py-3 bg-purple-vibrant text-white rounded-xl hover:bg-purple-600 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Ejecutando...' : 'Ejecutar Diagnóstico'}
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red/20 border border-red/50 rounded-xl text-red">
              <p className="font-semibold">Error:</p>
              <p>{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              {/* Resumen */}
              <div className="bg-gray-dark rounded-xl p-6 border border-white/10">
                <h2 className="text-xl font-bold text-white mb-4">Resumen</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-black text-white mb-1">
                      {result.summary.totalChecks}
                    </div>
                    <div className="text-white/60 text-sm">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-black text-green mb-1">
                      {result.summary.passedChecks}
                    </div>
                    <div className="text-white/60 text-sm">Exitosos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-black text-red mb-1">
                      {result.summary.failedChecks}
                    </div>
                    <div className="text-white/60 text-sm">Errores</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-black text-yellow-500 mb-1">
                      {result.summary.warnings}
                    </div>
                    <div className="text-white/60 text-sm">Advertencias</div>
                  </div>
                </div>
                {result.summary.allOk && (
                  <div className="mt-4 p-4 bg-green/20 border border-green/50 rounded-xl text-green text-center font-semibold">
                    ✅ ¡Todo está configurado correctamente!
                  </div>
                )}
                {result.summary.hasErrors && (
                  <div className="mt-4 p-4 bg-red/20 border border-red/50 rounded-xl text-red text-center font-semibold">
                    ❌ Hay errores que deben corregirse
                  </div>
                )}
              </div>

              {/* Checks individuales */}
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-white">Verificaciones</h2>
                {result.checks.map((check, index) => (
                  <div
                    key={index}
                    className={`border rounded-xl p-5 ${getStatusColor(check.status)}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-0.5">
                        {getStatusIcon(check.status)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-bold mb-1">{check.name}</h3>
                        <p className="text-white/80 mb-2">{check.message}</p>
                        {check.details && (
                          <div className="mt-3 p-3 bg-black/30 rounded-lg border border-white/10">
                            <pre className="text-white/60 text-xs whitespace-pre-wrap font-mono">
                              {JSON.stringify(check.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Información adicional */}
              <div className="bg-gray-dark rounded-xl p-6 border border-white/10">
                <h2 className="text-xl font-bold text-white mb-4">Información del Sistema</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Entorno:</span>
                    <span className="text-white font-mono">{result.environment}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Timestamp:</span>
                    <span className="text-white font-mono">
                      {new Date(result.timestamp).toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!result && !loading && (
            <div className="text-center py-12">
              <p className="text-white/60 mb-4">
                Haz clic en "Ejecutar Diagnóstico" para comenzar
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
