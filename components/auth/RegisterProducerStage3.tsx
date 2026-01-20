'use client'

import { useState } from 'react'

interface Stage3Props {
  onComplete: (data: Stage3Data | null) => void
  onBack: () => void
  onSkip: () => void
  initialData?: Partial<Stage3Data>
}

export interface Stage3Data {
  bankName: string
  bankAccountType: 'corriente' | 'ahorro'
  cbu: string
}

export default function RegisterProducerStage3({ onComplete, onBack, onSkip, initialData }: Stage3Props) {
  const [bankName, setBankName] = useState(initialData?.bankName || '')
  const [bankAccountType, setBankAccountType] = useState<'corriente' | 'ahorro' | ''>(initialData?.bankAccountType || '')
  const [cbu, setCbu] = useState(initialData?.cbu || '')
  const [error, setError] = useState<string | null>(null)
  const [skipBank, setSkipBank] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (skipBank) {
      onComplete(null)
      return
    }

    // Validaciones si decide agregar datos bancarios
    if (!bankName.trim()) {
      setError('El nombre del banco es obligatorio')
      return
    }

    if (!bankAccountType) {
      setError('Debes seleccionar el tipo de cuenta')
      return
    }

    if (!cbu.trim()) {
      setError('El CBU es obligatorio')
      return
    }

    // Validar formato de CBU (22 dígitos)
    if (cbu.replace(/\D/g, '').length !== 22) {
      setError('El CBU debe tener 22 dígitos')
      return
    }

    onComplete({
      bankName: bankName.trim(),
      bankAccountType: bankAccountType as 'corriente' | 'ahorro',
      cbu: cbu.replace(/\D/g, ''),
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
          Información bancaria
        </h3>
        <p className="text-white/60 text-sm mb-6">
          Agrega una cuenta para recibir pagos automáticos semanales sin comisiones
        </p>

        <div className="bg-[#14B8A6]/10 border border-[#14B8A6]/30 rounded-2xl p-4 mb-6">
          <p className="text-sm text-[#14B8A6] font-medium mb-2">
            💡 Puedes agregar tu cuenta bancaria después desde la configuración
          </p>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={skipBank}
              onChange={(e) => setSkipBank(e.target.checked)}
              className="w-5 h-5 rounded border-white/20 bg-[#0F0F0F] text-[#A855F7] focus:ring-2 focus:ring-[#A855F7]/30"
            />
            <span className="text-white/80 text-sm">Agregar después</span>
          </label>
        </div>

        {!skipBank && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="bankAccountType" className="block text-sm font-semibold text-white/90 uppercase tracking-wide">
                Tipo de cuenta
              </label>
              <select
                id="bankAccountType"
                value={bankAccountType}
                onChange={(e) => setBankAccountType(e.target.value as 'corriente' | 'ahorro')}
                required={!skipBank}
                className="w-full px-6 py-4 bg-[#0F0F0F] border border-white/10 rounded-2xl text-white focus:outline-none focus:border-[#A855F7] focus:ring-2 focus:ring-[#A855F7]/30 transition-all duration-300 hover:border-white/20"
              >
                <option value="">Selecciona un tipo</option>
                <option value="corriente">Cuenta Corriente</option>
                <option value="ahorro">Caja de Ahorro</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="bankName" className="block text-sm font-semibold text-white/90 uppercase tracking-wide">
                Nombre del banco
              </label>
              <input
                id="bankName"
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                required={!skipBank}
                className="w-full px-6 py-4 bg-[#0F0F0F] border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:border-[#A855F7] focus:ring-2 focus:ring-[#A855F7]/30 transition-all duration-300 hover:border-white/20"
                placeholder="Ej: Banco Galicia"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="cbu" className="block text-sm font-semibold text-white/90 uppercase tracking-wide">
                CBU
              </label>
              <input
                id="cbu"
                type="text"
                value={cbu}
                onChange={(e) => setCbu(e.target.value.replace(/\D/g, ''))}
                required={!skipBank}
                maxLength={22}
                className="w-full px-6 py-4 bg-[#0F0F0F] border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:border-[#A855F7] focus:ring-2 focus:ring-[#A855F7]/30 transition-all duration-300 hover:border-white/20"
                placeholder="0000000000000000000000"
              />
              <p className="text-xs text-white/40 mt-1">22 dígitos sin espacios ni guiones</p>
            </div>
          </div>
        )}
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
          <span className="relative z-10">{skipBank ? 'Finalizar sin banco' : 'Finalizar Registro'}</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        </button>
      </div>
    </form>
  )
}
