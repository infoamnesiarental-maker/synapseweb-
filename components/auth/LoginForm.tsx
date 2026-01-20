'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      if (data.user) {
        // Obtener el rol del usuario
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single()

        // Redirigir según el rol
        if (profile?.role === 'admin') {
          router.push('/admin')
        } else if (profile?.role === 'producer') {
          router.push('/dashboard')
        } else {
          router.push('/home')
        }
        router.refresh()
      }
    } catch (err) {
      setError('Ocurrió un error inesperado')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      {error && (
        <div className="bg-[#EF4444]/10 border border-[#EF4444]/50 text-[#EF4444] px-6 py-4 rounded-2xl text-sm font-medium backdrop-blur-sm">
          {error}
        </div>
      )}

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
        <label htmlFor="password" className="block text-base font-semibold text-white/90 uppercase tracking-wide">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-6 py-5 bg-[#0F0F0F] border border-white/10 rounded-2xl text-white text-base placeholder-white/40 focus:outline-none focus:border-[#A855F7] focus:ring-2 focus:ring-[#A855F7]/30 transition-all duration-300 hover:border-white/20"
          placeholder="••••••••"
        />
      </div>

      <div className="flex items-center justify-end">
        <Link
          href="/auth/forgot-password"
          className="text-base text-[#9333EA] hover:text-[#A855F7] transition-colors duration-300 font-bold hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </Link>
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
        <span className="relative z-10">{loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}</span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
      </button>

      <div className="pt-4 border-t border-white/10">
        <div className="text-center text-base text-white/60 mb-3">
          ¿No tienes cuenta?{' '}
          <Link 
            href="/register" 
            className="text-[#9333EA] hover:text-[#A855F7] font-bold transition-colors duration-300 hover:underline"
          >
            Regístrate aquí
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
