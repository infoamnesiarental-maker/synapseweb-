'use client'

import { useState } from 'react'

interface Stage2Props {
  onComplete: (data: Stage2Data) => void
  onBack: () => void
  initialData?: Partial<Stage2Data>
  cuitLocked?: boolean // Si el CUIT ya está establecido
}

export interface Stage2Data {
  businessName: string
  cuit: string
  adminEmail: string
  adminPhone: string
}

export default function RegisterProducerStage2({ onComplete, onBack, initialData, cuitLocked = false }: Stage2Props) {
  const [businessName, setBusinessName] = useState(initialData?.businessName || '')
  const [cuit, setCuit] = useState(initialData?.cuit || '')
  const [adminEmail, setAdminEmail] = useState(initialData?.adminEmail || '')
  const [adminPhone, setAdminPhone] = useState(initialData?.adminPhone || '')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validaciones
    if (!businessName.trim()) {
      setError('La razón social es obligatoria')
      return
    }

    if (!cuit.trim()) {
      setError('El CUIT es obligatorio')
      return
    }

    // Validar formato básico de CUIT (20-XXXXXXXX-X o 27-XXXXXXXX-X)
    const cuitRegex = /^\d{2}-\d{8}-\d{1}$/
    if (!cuitRegex.test(cuit)) {
      setError('El CUIT debe tener el formato: XX-XXXXXXXX-X')
      return
    }

    if (!adminEmail.trim()) {
      setError('El email administrativo es obligatorio')
      return
    }

    if (!adminPhone.trim()) {
      setError('El teléfono es obligatorio')
      return
    }

    onComplete({
      businessName: businessName.trim(),
      cuit: cuit.trim(),
      adminEmail: adminEmail.trim(),
      adminPhone: adminPhone.trim(),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-[#EF4444]/10 border border-[#EF4444]/50 text-[#EF4444] px-6 py-4 rounded-2xl text-sm font-medium backdrop-blur-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white uppercase tracking-wide mb-4">
          Información de cuenta
        </h3>

        <div className="space-y-2">
          <label htmlFor="businessName" className="block text-sm font-semibold text-white/90 uppercase tracking-wide">
            Razón Social / Nombre <span className="text-[#EF4444]">*</span>
          </label>
          <input
            id="businessName"
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
            className="w-full px-6 py-4 bg-[#0F0F0F] border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:border-[#A855F7] focus:ring-2 focus:ring-[#A855F7]/30 transition-all duration-300 hover:border-white/20"
            placeholder="Mi Empresa S.A."
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="cuit" className="block text-sm font-semibold text-white/90 uppercase tracking-wide">
            CUIT <span className="text-[#EF4444]">*</span>
          </label>
          <input
            id="cuit"
            type="text"
            value={cuit}
            onChange={(e) => setCuit(e.target.value)}
            required
            disabled={cuitLocked}
            className="w-full px-6 py-4 bg-[#0F0F0F] border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:border-[#A855F7] focus:ring-2 focus:ring-[#A855F7]/30 transition-all duration-300 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="20123456789"
            maxLength={13}
          />
          {cuitLocked && (
            <p className="text-xs text-[#EF4444] mt-1">
              El CUIT no puede ser modificado. Contacta a soporte si necesitas cambiarlo.
            </p>
          )}
          {!cuitLocked && (
            <p className="text-xs text-white/40 mt-1">
              Formato: XX-XXXXXXXX-X (sin guiones también aceptado)
            </p>
          )}
        </div>

        <div className="bg-[#FACC15]/10 border border-[#FACC15]/30 rounded-2xl p-4">
          <p className="text-sm text-[#FACC15] font-medium">
            ⚠️ Información importante sobre el CUIT
          </p>
          <p className="text-xs text-white/70 mt-2">
            Una vez configurado el CUIT, solo podrá ser modificado contactando a soporte. 
            Por favor, verifica que sea correcto antes de continuar.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="adminEmail" className="block text-sm font-semibold text-white/90 uppercase tracking-wide">
            Email administrativo interno <span className="text-[#EF4444]">*</span>
          </label>
          <input
            id="adminEmail"
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            required
            className="w-full px-6 py-4 bg-[#0F0F0F] border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:border-[#A855F7] focus:ring-2 focus:ring-[#A855F7]/30 transition-all duration-300 hover:border-white/20"
            placeholder="admin@miempresa.com"
          />
          <p className="text-xs text-white/40 mt-1">
            Este email es para uso interno y notificaciones del sistema
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="adminPhone" className="block text-sm font-semibold text-white/90 uppercase tracking-wide">
            Teléfono <span className="text-[#EF4444]">*</span>
          </label>
          <input
            id="adminPhone"
            type="tel"
            value={adminPhone}
            onChange={(e) => setAdminPhone(e.target.value)}
            required
            className="w-full px-6 py-4 bg-[#0F0F0F] border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:border-[#A855F7] focus:ring-2 focus:ring-[#A855F7]/30 transition-all duration-300 hover:border-white/20"
            placeholder="1144445555"
          />
        </div>
      </div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-4 px-8 bg-[#1F1F1F] border border-white/10 text-white font-bold text-lg rounded-full transition-all duration-300 hover:border-white/20 hover:bg-[#2A2A2A] uppercase tracking-wide"
        >
          Anterior
        </button>
        <button
          type="submit"
          className="flex-1 py-4 px-8 bg-gradient-to-r from-[#9333EA] via-[#A855F7] to-[#9333EA] text-white font-bold text-lg rounded-full transition-all duration-300 shadow-lg hover:shadow-[0_0_32px_rgba(168,85,247,0.6)] hover:scale-[1.02] active:scale-[0.98] uppercase tracking-wide relative overflow-hidden group"
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
          <span className="relative z-10">Continuar</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        </button>
      </div>
    </form>
  )
}
