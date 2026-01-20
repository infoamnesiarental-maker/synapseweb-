'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import RegisterProducerStage1, { Stage1Data } from './RegisterProducerStage1'
import RegisterProducerStage2, { Stage2Data } from './RegisterProducerStage2'
import RegisterProducerStage3, { Stage3Data } from './RegisterProducerStage3'

type Stage = 'profile' | 'account' | 'bank' | 'complete'

export default function ProducerRegistrationFlow() {
  const [currentStage, setCurrentStage] = useState<Stage>('profile')
  const [stage1Data, setStage1Data] = useState<Partial<Stage1Data>>({})
  const [stage2Data, setStage2Data] = useState<Partial<Stage2Data>>({})
  const [stage3Data, setStage3Data] = useState<Partial<Stage3Data> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  const handleStage1Complete = async (data: Stage1Data) => {
    // Verificar que el usuario esté autenticado
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setError('Debes estar autenticado para continuar. Por favor, inicia sesión.')
      return
    }

    // Actualizar el perfil del usuario a 'producer' si aún no lo es
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error obteniendo perfil:', profileError)
    }

    if (profile && profile.role !== 'producer') {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'producer' })
        .eq('id', user.id)
      
      if (updateError) {
        console.error('Error actualizando rol a producer:', updateError)
        // Continuamos de todas formas, la política puede permitir el INSERT
      }
    }

    setStage1Data(data)
    setCurrentStage('account')
  }

  const handleStage2Complete = (data: Stage2Data) => {
    setStage2Data(data)
    setCurrentStage('bank')
  }

  const handleStage3Complete = async (data: Stage3Data | null) => {
    setStage3Data(data)
    setLoading(true)
    setError(null)

    try {
      // Obtener el usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setError('No se encontró el usuario. Por favor, inicia sesión nuevamente.')
        setLoading(false)
        return
      }

      // Obtener el producer_id si ya existe
      const { data: existingProducer } = await supabase
        .from('producers')
        .select('id, cuit')
        .eq('user_id', user.id)
        .single()

      const producerData = {
        user_id: user.id,
        name: stage1Data.producerName,
        description: stage1Data.description || null,
        email_contact: stage1Data.emailContact || user.email || null,
        whatsapp: stage1Data.whatsapp || null,
        instagram: stage1Data.instagram || null,
        business_name: stage2Data.businessName,
        cuit: stage2Data.cuit,
        admin_email: stage2Data.adminEmail,
        admin_phone: stage2Data.adminPhone,
        bank_name: data?.bankName || null,
        bank_account_type: data?.bankAccountType || null,
        cbu: data?.cbu || null,
        registration_stage: 'complete' as const,
        is_active: false, // Requiere aprobación del admin
      }

      if (existingProducer) {
        // Actualizar producer existente
        const { error: updateError } = await supabase
          .from('producers')
          .update(producerData)
          .eq('id', existingProducer.id)

        if (updateError) {
          // Si el error es por CUIT duplicado y ya tiene CUIT, es porque intentó cambiarlo
          if (updateError.code === '23505' && existingProducer.cuit) {
            setError('El CUIT no puede ser modificado. Contacta a soporte si necesitas cambiarlo.')
          } else {
            setError('Error al actualizar los datos: ' + updateError.message)
          }
          setLoading(false)
          return
        }
      } else {
        // Crear nuevo producer
        const { error: insertError } = await supabase
          .from('producers')
          .insert(producerData)

        if (insertError) {
          if (insertError.code === '23505') {
            setError('El CUIT ingresado ya está registrado en el sistema.')
          } else {
            setError('Error al crear el registro: ' + insertError.message)
          }
          setLoading(false)
          return
        }
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/login?registered=producer')
      }, 3000)
    } catch (err) {
      setError('Ocurrió un error inesperado')
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (currentStage === 'account') {
      setCurrentStage('profile')
    } else if (currentStage === 'bank') {
      setCurrentStage('account')
    }
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="mb-4">
          <div className="w-20 h-20 bg-gradient-to-br from-[#10B981] to-[#14B8A6] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_24px_rgba(16,185,129,0.4)]">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-3 uppercase tracking-wide">¡Registro completado!</h3>
          <p className="text-white/70 mb-2 text-lg">
            Tu cuenta de productora ha sido creada exitosamente.
          </p>
          <p className="text-white/50 mb-4">
            Tu cuenta está pendiente de aprobación. Te notificaremos por email cuando sea activada.
          </p>
          <div className="inline-flex items-center gap-2 text-sm text-white/40">
            <div className="w-2 h-2 bg-[#A855F7] rounded-full animate-pulse"></div>
            <span>Redirigiendo al login...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Indicador de progreso */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <div className={`flex items-center gap-2 ${currentStage === 'profile' ? 'text-[#A855F7]' : currentStage === 'account' || currentStage === 'bank' ? 'text-[#10B981]' : 'text-white/40'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStage === 'profile' ? 'border-[#A855F7] bg-[#A855F7]/20' : 'border-[#10B981] bg-[#10B981]/20'}`}>
            {currentStage !== 'profile' ? '✓' : '1'}
          </div>
          <span className="text-sm font-semibold uppercase">Perfil</span>
        </div>
        <div className={`w-12 h-0.5 ${currentStage === 'account' || currentStage === 'bank' ? 'bg-[#10B981]' : 'bg-white/20'}`}></div>
        <div className={`flex items-center gap-2 ${currentStage === 'account' ? 'text-[#A855F7]' : currentStage === 'bank' ? 'text-[#10B981]' : 'text-white/40'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStage === 'account' ? 'border-[#A855F7] bg-[#A855F7]/20' : currentStage === 'bank' ? 'border-[#10B981] bg-[#10B981]/20' : 'border-white/20'}`}>
            {currentStage === 'bank' ? '✓' : '2'}
          </div>
          <span className="text-sm font-semibold uppercase">Cuenta</span>
        </div>
        <div className={`w-12 h-0.5 ${currentStage === 'bank' ? 'bg-[#10B981]' : 'bg-white/20'}`}></div>
        <div className={`flex items-center gap-2 ${currentStage === 'bank' ? 'text-[#A855F7]' : 'text-white/40'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStage === 'bank' ? 'border-[#A855F7] bg-[#A855F7]/20' : 'border-white/20'}`}>
            3
          </div>
          <span className="text-sm font-semibold uppercase">Banco</span>
        </div>
      </div>

      {error && (
        <div className="bg-[#EF4444]/10 border border-[#EF4444]/50 text-[#EF4444] px-6 py-4 rounded-2xl text-sm font-medium backdrop-blur-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block w-12 h-12 border-4 border-[#A855F7] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-white/60">Guardando información...</p>
        </div>
      )}

      {!loading && currentStage === 'profile' && (
        <RegisterProducerStage1
          onComplete={handleStage1Complete}
          initialData={stage1Data}
        />
      )}

      {!loading && currentStage === 'account' && (
        <RegisterProducerStage2
          onComplete={handleStage2Complete}
          onBack={handleBack}
          initialData={stage2Data}
          cuitLocked={!!stage2Data.cuit}
        />
      )}

      {!loading && currentStage === 'bank' && (
        <RegisterProducerStage3
          onComplete={handleStage3Complete}
          onBack={handleBack}
          onSkip={() => handleStage3Complete(null)}
          initialData={stage3Data || undefined}
        />
      )}
    </div>
  )
}
