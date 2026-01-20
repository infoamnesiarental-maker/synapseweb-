'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Stage1Props {
  onComplete: (data: Stage1Data) => void
  initialData?: Partial<Stage1Data>
}

export interface Stage1Data {
  // Datos de productora (siempre)
  producerName: string
  description?: string
  emailContact?: string
  whatsapp?: string
  instagram?: string
}

export default function RegisterProducerStage1({ onComplete, initialData }: Stage1Props) {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const supabase = createClient()
  const router = useRouter()
  
  const [error, setError] = useState<string | null>(null)
  
  // Datos de productora
  const [producerName, setProducerName] = useState(initialData?.producerName || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [emailContact, setEmailContact] = useState(initialData?.emailContact || '')
  const [whatsapp, setWhatsapp] = useState(initialData?.whatsapp || '')
  const [instagram, setInstagram] = useState(initialData?.instagram || '')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      // Pre-llenar email de contacto con el email del usuario
      if (!emailContact && user.email) {
        setEmailContact(user.email)
      }
    }
  }, [authLoading, isAuthenticated, user, emailContact])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Validaciones
    if (!producerName.trim()) {
      setError('El nombre de fantasía es obligatorio')
      setLoading(false)
      return
    }

    // Usuario ya debe estar autenticado (validado en el componente padre)
    if (!isAuthenticated || !user) {
      setError('Debes estar registrado para crear una productora')
      setLoading(false)
      return
    }

    // Solo datos de productora
    onComplete({
      producerName,
      description,
      emailContact: emailContact || user.email || '',
      whatsapp,
      instagram,
    })
  }

  // Si no está autenticado, mostrar mensaje
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="text-center py-12">
        <div className="mb-6">
          <div className="w-20 h-20 bg-[#A855F7]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-[#A855F7]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-3 uppercase tracking-wide">
            Debes estar registrado
          </h3>
          <p className="text-white/70 mb-2 text-lg">
            Para crear una cuenta de productora, primero necesitas tener una cuenta de usuario.
          </p>
          <p className="text-white/50 mb-8">
            Si ya tienes cuenta, inicia sesión. Si no, regístrate primero.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/register"
            className="inline-flex items-center justify-center py-4 px-8 bg-gradient-to-r from-[#9333EA] via-[#A855F7] to-[#9333EA] text-white font-bold text-lg rounded-full transition-all duration-300 shadow-lg hover:shadow-[0_0_32px_rgba(168,85,247,0.6)] hover:scale-[1.02] uppercase tracking-wide relative overflow-hidden group"
            style={{
              background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 50%, #9333EA 100%)',
              boxShadow: '0 4px 24px rgba(168, 85, 247, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(168, 85, 247, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 24px rgba(168, 85, 247, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
            }}
          >
            <span className="relative z-10">Registrarse</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          </Link>
          
          <Link
            href="/login"
            className="inline-flex items-center justify-center py-4 px-8 bg-[#1F1F1F] border border-white/10 text-white font-bold text-lg rounded-full transition-all duration-300 hover:border-white/20 hover:bg-[#2A2A2A] uppercase tracking-wide"
          >
            Iniciar Sesión
          </Link>
        </div>
      </div>
    )
  }

  // Si está cargando la autenticación
  if (authLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-12 h-12 border-4 border-[#A855F7] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-white/60">Verificando autenticación...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-[#EF4444]/10 border border-[#EF4444]/50 text-[#EF4444] px-6 py-4 rounded-2xl text-sm font-medium backdrop-blur-sm">
          {error}
        </div>
      )}

      {/* Información del usuario actual */}
      {isAuthenticated && user && (
        <div className="bg-[#14B8A6]/10 border border-[#14B8A6]/30 rounded-2xl p-4 mb-6">
          <p className="text-sm text-[#14B8A6] font-medium mb-1">
            Registrado como: {user.email}
          </p>
          <p className="text-xs text-white/60">
            Estás creando una cuenta de productora con tu usuario actual
          </p>
        </div>
      )}

      {/* Datos de productora */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white uppercase tracking-wide mb-4">
          Información de tu marca
        </h3>

        <div className="space-y-2">
          <label htmlFor="producerName" className="block text-sm font-semibold text-white/90 uppercase tracking-wide">
            Nombre de fantasía <span className="text-[#EF4444]">*</span>
          </label>
          <input
            id="producerName"
            type="text"
            value={producerName}
            onChange={(e) => setProducerName(e.target.value)}
            required
            className="w-full px-6 py-4 bg-[#0F0F0F] border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:border-[#A855F7] focus:ring-2 focus:ring-[#A855F7]/30 transition-all duration-300 hover:border-white/20"
            placeholder="Ej: Mi Marca Eventos"
          />
          <p className="text-xs text-white/40">El nombre público de tu marca</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-semibold text-white/90 uppercase tracking-wide">
            Descripción <span className="text-white/40 text-xs normal-case font-normal">(opcional)</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-6 py-4 bg-[#0F0F0F] border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:border-[#A855F7] focus:ring-2 focus:ring-[#A855F7]/30 transition-all duration-300 hover:border-white/20 resize-none"
            placeholder="Cuéntanos sobre tu marca o negocio..."
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="emailContact" className="block text-sm font-semibold text-white/90 uppercase tracking-wide">
            Email de contacto público <span className="text-white/40 text-xs normal-case font-normal">(opcional)</span>
          </label>
          <input
            id="emailContact"
            type="email"
            value={emailContact}
            onChange={(e) => setEmailContact(e.target.value)}
            className="w-full px-6 py-4 bg-[#0F0F0F] border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:border-[#A855F7] focus:ring-2 focus:ring-[#A855F7]/30 transition-all duration-300 hover:border-white/20"
            placeholder="contacto@tumarca.com"
          />
          <p className="text-xs text-white/40">Este email será visible en tu perfil público</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="whatsapp" className="block text-sm font-semibold text-white/90 uppercase tracking-wide">
              WhatsApp
            </label>
            <input
              id="whatsapp"
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full px-6 py-4 bg-[#0F0F0F] border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:border-[#A855F7] focus:ring-2 focus:ring-[#A855F7]/30 transition-all duration-300 hover:border-white/20"
              placeholder="+54 9 11 1234-5678"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="instagram" className="block text-sm font-semibold text-white/90 uppercase tracking-wide">
              Instagram
            </label>
            <input
              id="instagram"
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className="w-full px-6 py-4 bg-[#0F0F0F] border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:border-[#A855F7] focus:ring-2 focus:ring-[#A855F7]/30 transition-all duration-300 hover:border-white/20"
              placeholder="@tuproductora"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 px-8 bg-gradient-to-r from-[#9333EA] via-[#A855F7] to-[#9333EA] text-white font-bold text-lg rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-[0_0_32px_rgba(168,85,247,0.6)] hover:scale-[1.02] active:scale-[0.98] uppercase tracking-wide relative overflow-hidden group"
        style={{
          background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 50%, #9333EA 100%)',
          boxShadow: '0 4px 24px rgba(168, 85, 247, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(168, 85, 247, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 24px rgba(168, 85, 247, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
        }}
      >
        <span className="relative z-10">{loading ? 'Guardando...' : 'Continuar'}</span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
      </button>
    </form>
  )
}
