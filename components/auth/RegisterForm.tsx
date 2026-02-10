'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterForm() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validaciones
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      setLoading(false)
      return
    }

    try {
      // Obtener URL de la app para redirección después de confirmar email
      const appUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      
      // Crear usuario en Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${appUrl}/auth/callback`,
          data: {
            full_name: fullName,
            phone: phone,
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      if (authData.user) {
        // Esperar un momento para que el trigger cree el perfil
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Intentar actualizar el perfil (puede fallar si aún no existe, pero no es crítico)
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: fullName,
            phone: phone || null,
          })
          .eq('id', authData.user.id)

        // Si hay error, intentamos insertar directamente (por si el trigger falló)
        if (profileError) {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              email: email,
              full_name: fullName,
              phone: phone || null,
              role: 'user'
            })
          
          if (insertError) {
            console.error('Error creando perfil:', insertError)
          }
        }

        setSuccess(true)
        // Redirigir después de 2 segundos
        setTimeout(() => {
          router.push('/login?registered=true')
        }, 2000)
      }
    } catch (err) {
      setError('Ocurrió un error inesperado')
      setLoading(false)
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
          <h3 className="text-2xl font-bold text-white mb-3 uppercase tracking-wide">¡Registro exitoso!</h3>
          <p className="text-white/70 mb-2 text-lg">
            Te hemos enviado un email de confirmación.
          </p>
          <p className="text-white/50 mb-6">
            Por favor verifica tu correo para activar tu cuenta.
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
    <form onSubmit={handleSubmit} className="space-y-7">
      {error && (
        <div className="bg-[#EF4444]/10 border border-[#EF4444]/50 text-[#EF4444] px-6 py-4 rounded-2xl text-sm font-medium backdrop-blur-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="fullName" className="block text-base font-semibold text-white/90 uppercase tracking-wide">
          Nombre Completo
        </label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full px-6 py-5 bg-[#0F0F0F] border border-white/10 rounded-2xl text-white text-base placeholder-white/40 focus:outline-none focus:border-[#A855F7] focus:ring-2 focus:ring-[#A855F7]/30 transition-all duration-300 hover:border-white/20"
          placeholder="Juan Pérez"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="block text-base font-semibold text-white/90 uppercase tracking-wide">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-6 py-5 bg-[#0F0F0F] border border-white/10 rounded-2xl text-white text-base placeholder-white/40 focus:outline-none focus:border-[#A855F7] focus:ring-2 focus:ring-[#A855F7]/30 transition-all duration-300 hover:border-white/20"
          placeholder="tu@email.com"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="phone" className="block text-base font-semibold text-white/90 uppercase tracking-wide">
          Teléfono <span className="text-white/40 text-sm normal-case font-normal">(opcional)</span>
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full px-6 py-5 bg-[#0F0F0F] border border-white/10 rounded-2xl text-white text-base placeholder-white/40 focus:outline-none focus:border-[#A855F7] focus:ring-2 focus:ring-[#A855F7]/30 transition-all duration-300 hover:border-white/20"
          placeholder="+54 11 1234-5678"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-base font-semibold text-white/90 uppercase tracking-wide">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full px-6 py-5 bg-[#0F0F0F] border border-white/10 rounded-2xl text-white text-base placeholder-white/40 focus:outline-none focus:border-[#A855F7] focus:ring-2 focus:ring-[#A855F7]/30 transition-all duration-300 hover:border-white/20"
          placeholder="Mínimo 8 caracteres"
        />
        <p className="text-sm text-white/40 mt-1">Mínimo 8 caracteres</p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="confirmPassword"
          className="block text-base font-semibold text-white/90 uppercase tracking-wide"
        >
          Confirmar Contraseña
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          className="w-full px-6 py-5 bg-[#0F0F0F] border border-white/10 rounded-2xl text-white text-base placeholder-white/40 focus:outline-none focus:border-[#A855F7] focus:ring-2 focus:ring-[#A855F7]/30 transition-all duration-300 hover:border-white/20"
          placeholder="Repite tu contraseña"
        />
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
        <span className="relative z-10">{loading ? 'Creando cuenta...' : 'Crear Cuenta'}</span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
      </button>

      <div className="pt-4 border-t border-white/10">
        <div className="text-center text-base text-white/60 mb-3">
          ¿Ya tienes cuenta?{' '}
          <Link 
            href="/login" 
            className="text-[#9333EA] hover:text-[#A855F7] font-bold transition-colors duration-300 hover:underline"
          >
            Inicia sesión aquí
          </Link>
        </div>
        <div className="text-center text-base text-white/60">
          ¿Eres productora?{' '}
          <Link
            href="/register-producer"
            className="text-[#9333EA] hover:text-[#A855F7] font-bold transition-colors duration-300 hover:underline"
          >
            Regístrate como productora
          </Link>
        </div>
      </div>
    </form>
  )
}
