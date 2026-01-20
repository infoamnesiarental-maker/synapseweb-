'use client'

import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard,
  Calendar,
  BarChart3,
  Users,
  RefreshCw,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Eventos', href: '/dashboard/eventos', icon: Calendar },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Asistentes', href: '/dashboard/asistentes', icon: Users },
  { name: 'Devoluciones', href: '/dashboard/devoluciones', icon: RefreshCw },
  { name: 'Perfil', href: '/dashboard/perfil', icon: Settings },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading, isProducer, isProducerActive, producer, profile, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    // El middleware ya verifica esto, solo hacer verificaciones mínimas aquí
    if (loading || !user || !profile) {
      return
    }

    // Solo redirigir si sabemos con certeza que no es productora o está inactiva
    if (!loading && user && profile && !isProducer) {
      router.push('/')
      return
    }

    if (!loading && isProducer && isProducerActive === false) {
      router.push('/')
      return
    }
  }, [loading, isProducer, isProducerActive, router, user, profile])

  // Mostrar loading solo si realmente está cargando (reducir tiempo de espera)
  // El middleware ya verifica todo, confiar en él
  if (loading) {
    return (
      <div className="min-h-screen bg-black-deep flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    )
  }

  // Solo bloquear si sabemos con certeza que no es productora
  if (!loading && user && profile && !isProducer) {
    return null
  }

  // Solo bloquear si sabemos explícitamente que está inactiva
  // Si es undefined, el middleware ya verificó, permitir acceso
  if (!loading && isProducer && isProducerActive === false) {
    return null
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-black-deep">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-mediumGray border-r border-[#2F2F2F] transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          backdrop-blur-md
        `}
        style={{
          backgroundColor: '#1F1F1F', // mediumGray sólido
        }}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#2F2F2F]">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-[#9333EA] to-[#A855F7] rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-lg">S</span>
              </div>
              <span className="text-white font-bold text-xl">SYNAPSE</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white/60 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                    ${
                      isActive
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-semibold">{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-[#2F2F2F]">
            <div className="mb-3 px-4">
              <p className="text-white/60 text-xs uppercase tracking-wide mb-1">
                Usuario
              </p>
              <p className="text-white text-sm font-semibold truncate">
                {user?.email}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-semibold">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar (mobile) */}
        <div className="lg:hidden sticky top-0 z-30 bg-mediumGray border-b border-[#2F2F2F] px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white/70 hover:text-white"
          >
            <Menu size={24} />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-r from-[#9333EA] to-[#A855F7] rounded flex items-center justify-center">
              <span className="text-white font-black text-sm">S</span>
            </div>
            <span className="text-white font-bold">SYNAPSE</span>
          </Link>
          <div className="w-6" /> {/* Spacer */}
        </div>

        {/* Page content */}
        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  )
}
