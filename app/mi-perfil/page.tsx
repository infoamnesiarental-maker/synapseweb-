'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function MiPerfilPage() {
  const { user, profile, producer, loading, isAuthenticated, isProducer, isAdmin, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
    }
  }, [loading, isAuthenticated, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-black-deep flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const getRoleBadgeColor = (role: string | undefined) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500/20 text-red-400 border-red-500/50'
      case 'producer':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/50'
      case 'user':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    }
  }

  const getRoleLabel = (role: string | undefined) => {
    switch (role) {
      case 'admin':
        return 'Administrador'
      case 'producer':
        return 'Productora'
      case 'user':
        return 'Usuario'
      default:
        return 'Sin rol'
    }
  }

  return (
    <div className="min-h-screen bg-black-deep text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold uppercase tracking-wide mb-4">
            Mi Perfil
          </h1>
          <p className="text-lightGray text-lg mb-8">
            Información de tu cuenta y rol
          </p>

          <div className="bg-mediumGray rounded-2xl p-8 border border-[#2F2F2F] space-y-6">
            {/* Información del Usuario */}
            <div>
              <h2 className="text-xl font-bold mb-4 uppercase tracking-wide">Información del Usuario</h2>
              <div className="space-y-3">
                <div>
                  <span className="text-lightGray text-sm">Email:</span>
                  <p className="text-white font-semibold">{user?.email || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-lightGray text-sm">ID de Usuario:</span>
                  <p className="text-white font-mono text-xs break-all">{user?.id || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Rol */}
            <div>
              <h2 className="text-xl font-bold mb-4 uppercase tracking-wide">Rol Actual</h2>
              <div className="flex items-center gap-4">
                <span
                  className={`px-4 py-2 rounded-full border font-bold uppercase tracking-wide ${getRoleBadgeColor(profile?.role)}`}
                >
                  {getRoleLabel(profile?.role)}
                </span>
                <span className="text-lightGray text-sm">
                  ({profile?.role || 'sin rol'})
                </span>
              </div>
            </div>

            {/* Información de Productora (si aplica) */}
            {isProducer && producer && (
              <div>
                <h2 className="text-xl font-bold mb-4 uppercase tracking-wide">Información de Productora</h2>
                <div className="space-y-3">
                  <div>
                    <span className="text-lightGray text-sm">Estado:</span>
                    <span
                      className={`ml-2 px-3 py-1 rounded-full text-xs font-bold ${
                        producer.is_active
                          ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                          : 'bg-red-500/20 text-red-400 border border-red-500/50'
                      }`}
                    >
                      {producer.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <div>
                    <span className="text-lightGray text-sm">ID de Productora:</span>
                    <p className="text-white font-mono text-xs break-all">{producer.id}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Accesos Disponibles */}
            <div>
              <h2 className="text-xl font-bold mb-4 uppercase tracking-wide">Accesos Disponibles</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={isAuthenticated ? 'text-green-400' : 'text-red-400'}>
                    {isAuthenticated ? '✅' : '❌'}
                  </span>
                  <span>Usuario Autenticado</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={isProducer ? 'text-green-400' : 'text-red-400'}>
                    {isProducer ? '✅' : '❌'}
                  </span>
                  <span>Acceso a Dashboard de Productora</span>
                  {isProducer && (
                    <a
                      href="/dashboard"
                      className="ml-2 text-purple-400 hover:text-purple-300 underline text-sm"
                    >
                      Ir al Dashboard →
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={isAdmin ? 'text-green-400' : 'text-red-400'}>
                    {isAdmin ? '✅' : '❌'}
                  </span>
                  <span>Acceso a Panel de Administración</span>
                  {isAdmin && (
                    <a
                      href="/admin"
                      className="ml-2 text-red-400 hover:text-red-300 underline text-sm"
                    >
                      Ir al Admin →
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={isAuthenticated ? 'text-green-400' : 'text-red-400'}>
                    {isAuthenticated ? '✅' : '❌'}
                  </span>
                  <span>Acceso a Mis Compras</span>
                  {isAuthenticated && (
                    <a
                      href="/mis-compras"
                      className="ml-2 text-blue-400 hover:text-blue-300 underline text-sm"
                    >
                      Ver Mis Compras →
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="pt-6 border-t border-[#2F2F2F]">
              <div className="flex gap-4">
                <button
                  onClick={() => router.push('/')}
                  className="px-6 py-3 bg-mediumGray border border-white/20 text-white font-bold rounded-full transition-all duration-300 hover:bg-white/10 uppercase tracking-wide"
                >
                  Volver al inicio
                </button>
                <button
                  onClick={signOut}
                  className="px-6 py-3 bg-red-500/20 border border-red-500/50 text-red-400 font-bold rounded-full transition-all duration-300 hover:bg-red-500/30 uppercase tracking-wide"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
