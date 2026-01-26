import Link from 'next/link'
import RegisterForm from '@/components/auth/RegisterForm'

// Marcar como dinámica para evitar pre-render durante build
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Registrarse - Synapse',
  description: 'Crea tu cuenta en Synapse',
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#A855F7]/5 via-transparent to-[#14B8A6]/5 pointer-events-none"></div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo y título */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-block mb-6 group">
            <h1 className="text-5xl font-black text-white uppercase tracking-tight group-hover:scale-105 transition-transform duration-300">
              SYNAPSE
            </h1>
          </Link>
          <h2 className="text-3xl font-bold text-white mb-3 uppercase tracking-wide">Crear Cuenta</h2>
          <p className="text-white/70 text-lg">Únete a Synapse y compra tus tickets</p>
        </div>

        {/* Formulario */}
        <div className="bg-[#0F0F0F]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-10 shadow-[0_8px_48px_rgba(0,0,0,0.6)] hover:border-white/20 transition-all duration-300">
          <RegisterForm />
        </div>

        {/* Volver al inicio */}
        <div className="text-center mt-8">
          <Link
            href="/"
            className="text-sm text-white/60 hover:text-white/90 transition-colors duration-300 inline-flex items-center gap-2 group"
          >
            <span className="group-hover:-translate-x-1 transition-transform duration-300">←</span>
            <span>Volver al inicio</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
