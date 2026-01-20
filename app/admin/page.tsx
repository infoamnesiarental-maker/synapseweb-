'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAdminStats } from '@/lib/hooks/useAdminStats'
import { useAdminProducers } from '@/lib/hooks/useAdminProducers'
import { useAdminUsers } from '@/lib/hooks/useAdminUsers'
import { 
  Users, 
  Building2, 
  Calendar, 
  DollarSign, 
  Ticket, 
  TrendingUp,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  X,
  Eye,
  Settings,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale/es'

export default function AdminPage() {
  const { user, profile, loading: authLoading, isAdmin } = useAuth()
  const router = useRouter()
  const { stats, loading: statsLoading } = useAdminStats()
  const { producers, loading: producersLoading, toggleProducerStatus } = useAdminProducers()
  const { users, loading: usersLoading, updateUserRole } = useAdminUsers()

  const [activeTab, setActiveTab] = useState<'overview' | 'producers' | 'users'>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [processingProducer, setProcessingProducer] = useState<string | null>(null)
  const [processingUser, setProcessingUser] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/')
    }
  }, [authLoading, isAdmin, router])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black-deep flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  const handleToggleProducer = async (producerId: string, currentStatus: boolean) => {
    setProcessingProducer(producerId)
    setErrorMessage(null)

    try {
      await toggleProducerStatus(producerId, currentStatus)
    } catch (err: any) {
      console.error('Error actualizando productora:', err)
      setErrorMessage(err.message || 'Error al actualizar productora')
    } finally {
      setProcessingProducer(null)
    }
  }

  const handleUpdateUserRole = async (userId: string, newRole: 'user' | 'producer' | 'admin') => {
    setProcessingUser(userId)
    setErrorMessage(null)

    try {
      await updateUserRole(userId, newRole)
    } catch (err: any) {
      console.error('Error actualizando rol:', err)
      setErrorMessage(err.message || 'Error al actualizar rol')
    } finally {
      setProcessingUser(null)
    }
  }

  // Filtrar productoras
  const filteredProducers = producers.filter(p => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      p.name.toLowerCase().includes(query) ||
      p.user?.email.toLowerCase().includes(query) ||
      p.email_contact?.toLowerCase().includes(query)
    )
  })

  // Filtrar usuarios
  const filteredUsers = users.filter(u => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      u.email.toLowerCase().includes(query) ||
      u.full_name?.toLowerCase().includes(query) ||
      u.role.toLowerCase().includes(query)
    )
  })

  return (
    <div className="min-h-screen bg-black-deep text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-wide">
              Panel de Administración
            </h1>
          </div>
          <p className="text-lightGray text-lg">
            Gestión del sistema y usuarios
          </p>
          <div className="mt-4">
            <span className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/50 rounded-full text-xs font-bold uppercase">
              Rol: Administrador
            </span>
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-400 flex-1">{errorMessage}</p>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[#2F2F2F]">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-semibold transition-all duration-200 border-b-2 ${
              activeTab === 'overview'
                ? 'border-purple-vibrant text-purple-vibrant'
                : 'border-transparent text-lightGray hover:text-white'
            }`}
          >
            Resumen
          </button>
          <button
            onClick={() => setActiveTab('producers')}
            className={`px-6 py-3 font-semibold transition-all duration-200 border-b-2 ${
              activeTab === 'producers'
                ? 'border-purple-vibrant text-purple-vibrant'
                : 'border-transparent text-lightGray hover:text-white'
            }`}
          >
            Productoras ({producers.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 font-semibold transition-all duration-200 border-b-2 ${
              activeTab === 'users'
                ? 'border-purple-vibrant text-purple-vibrant'
                : 'border-transparent text-lightGray hover:text-white'
            }`}
          >
            Usuarios ({users.length})
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {statsLoading ? (
              <div className="text-center py-12">
                <div className="text-lightGray">Cargando estadísticas...</div>
              </div>
            ) : stats ? (
              <>
                {/* Métricas Principales */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-mediumGray rounded-xl p-6 border border-[#2F2F2F]">
                    <div className="flex items-center gap-3 mb-2">
                      <Users className="w-5 h-5 text-blue-400" />
                      <p className="text-lightGray text-sm">Usuarios</p>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
                  </div>
                  <div className="bg-mediumGray rounded-xl p-6 border border-[#2F2F2F]">
                    <div className="flex items-center gap-3 mb-2">
                      <Building2 className="w-5 h-5 text-purple-400" />
                      <p className="text-lightGray text-sm">Productoras</p>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.totalProducers}</p>
                    <p className="text-xs text-lightGray mt-1">
                      {stats.activeProducers} activas / {stats.inactiveProducers} inactivas
                    </p>
                  </div>
                  <div className="bg-mediumGray rounded-xl p-6 border border-[#2F2F2F]">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="w-5 h-5 text-green-400" />
                      <p className="text-lightGray text-sm">Eventos</p>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.totalEvents}</p>
                    <p className="text-xs text-lightGray mt-1">
                      {stats.publishedEvents} publicados
                    </p>
                  </div>
                  <div className="bg-mediumGray rounded-xl p-6 border border-[#2F2F2F]">
                    <div className="flex items-center gap-3 mb-2">
                      <DollarSign className="w-5 h-5 text-green-400" />
                      <p className="text-lightGray text-sm">Revenue Total</p>
                    </div>
                    <p className="text-3xl font-bold text-white">
                      ${stats.totalRevenue.toLocaleString('es-AR')}
                    </p>
                  </div>
                </div>

                {/* Métricas Secundarias */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-mediumGray rounded-xl p-6 border border-[#2F2F2F]">
                    <div className="flex items-center gap-3 mb-2">
                      <Ticket className="w-5 h-5 text-purple-400" />
                      <p className="text-lightGray text-sm">Tickets Vendidos</p>
                    </div>
                    <p className="text-2xl font-bold text-white">{stats.totalTickets}</p>
                  </div>
                  <div className="bg-mediumGray rounded-xl p-6 border border-[#2F2F2F]">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <p className="text-lightGray text-sm">Compras Completadas</p>
                    </div>
                    <p className="text-2xl font-bold text-white">{stats.completedPurchases}</p>
                  </div>
                  <div className="bg-mediumGray rounded-xl p-6 border border-[#2F2F2F]">
                    <div className="flex items-center gap-3 mb-2">
                      <RefreshCw className="w-5 h-5 text-yellow-400" />
                      <p className="text-lightGray text-sm">Compras Pendientes</p>
                    </div>
                    <p className="text-2xl font-bold text-white">{stats.pendingPurchases}</p>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Producers Tab */}
        {activeTab === 'producers' && (
          <div className="space-y-6">
            {/* Búsqueda */}
            <div className="bg-mediumGray rounded-2xl p-6 border border-[#2F2F2F]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-lightGray" />
                <input
                  type="text"
                  placeholder="Buscar productoras por nombre, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#2F2F2F] border border-[#3F3F3F] rounded-lg text-white placeholder-lightGray focus:outline-none focus:border-purple-vibrant transition-colors"
                />
              </div>
            </div>

            {/* Loading */}
            {producersLoading && (
              <div className="text-center py-12">
                <div className="text-lightGray">Cargando productoras...</div>
              </div>
            )}

            {/* Lista de Productoras */}
            {!producersLoading && filteredProducers.length > 0 && (
              <div className="space-y-4">
                {filteredProducers.map((producer) => (
                  <div
                    key={producer.id}
                    className="bg-mediumGray rounded-2xl border border-[#2F2F2F] p-6 hover:border-purple-500/50 transition-all duration-200"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-white">{producer.name}</h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                              producer.is_active
                                ? 'bg-green-500/20 text-green-400 border-green-500/50'
                                : 'bg-red-500/20 text-red-400 border-red-500/50'
                            }`}
                          >
                            {producer.is_active ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>
                        {producer.description && (
                          <p className="text-lightGray text-sm mb-3">{producer.description}</p>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-lightGray mb-1">Email Usuario:</p>
                            <p className="text-white">{producer.user?.email || 'N/A'}</p>
                          </div>
                          {producer.email_contact && (
                            <div>
                              <p className="text-lightGray mb-1">Email Contacto:</p>
                              <p className="text-white">{producer.email_contact}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-lightGray mb-1">Eventos:</p>
                            <p className="text-white font-semibold">{producer.events_count}</p>
                          </div>
                          <div>
                            <p className="text-lightGray mb-1">Revenue Total:</p>
                            <p className="text-green-400 font-semibold">
                              ${producer.total_revenue.toLocaleString('es-AR')}
                            </p>
                          </div>
                          <div>
                            <p className="text-lightGray mb-1">Creada:</p>
                            <p className="text-white">
                              {format(new Date(producer.created_at), "dd 'de' MMM, yyyy", { locale: es })}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleToggleProducer(producer.id, producer.is_active)}
                          disabled={processingProducer === producer.id}
                          className={`px-6 py-3 rounded-lg border transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${
                            producer.is_active
                              ? 'bg-red-500/20 hover:bg-red-500/30 border-red-500/50 text-red-400 hover:text-red-300'
                              : 'bg-green-500/20 hover:bg-green-500/30 border-green-500/50 text-green-400 hover:text-green-300'
                          }`}
                        >
                          {processingProducer === producer.id ? (
                            <span className="flex items-center gap-2">
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Procesando...
                            </span>
                          ) : producer.is_active ? (
                            'Desactivar'
                          ) : (
                            'Activar'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!producersLoading && filteredProducers.length === 0 && (
              <div className="bg-mediumGray rounded-2xl p-12 border border-[#2F2F2F] text-center">
                <Building2 className="w-16 h-16 mx-auto text-purple-400 mb-4" />
                <h2 className="text-2xl font-bold mb-4 uppercase tracking-wide">
                  No hay productoras
                </h2>
                <p className="text-lightGray max-w-md mx-auto">
                  {searchQuery
                    ? 'No se encontraron productoras con la búsqueda'
                    : 'Aún no hay productoras registradas'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Búsqueda */}
            <div className="bg-mediumGray rounded-2xl p-6 border border-[#2F2F2F]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-lightGray" />
                <input
                  type="text"
                  placeholder="Buscar usuarios por email, nombre, rol..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#2F2F2F] border border-[#3F3F3F] rounded-lg text-white placeholder-lightGray focus:outline-none focus:border-purple-vibrant transition-colors"
                />
              </div>
            </div>

            {/* Loading */}
            {usersLoading && (
              <div className="text-center py-12">
                <div className="text-lightGray">Cargando usuarios...</div>
              </div>
            )}

            {/* Lista de Usuarios */}
            {!usersLoading && filteredUsers.length > 0 && (
              <div className="space-y-4">
                {filteredUsers.map((adminUser) => {
                  const getRoleBadge = (role: string) => {
                    const badges = {
                      admin: {
                        label: 'Admin',
                        className: 'bg-red-500/20 text-red-400 border-red-500/50',
                      },
                      producer: {
                        label: 'Productora',
                        className: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
                      },
                      user: {
                        label: 'Usuario',
                        className: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
                      },
                    }
                    return badges[role as keyof typeof badges] || badges.user
                  }

                  const roleBadge = getRoleBadge(adminUser.role)

                  return (
                    <div
                      key={adminUser.id}
                      className="bg-mediumGray rounded-2xl border border-[#2F2F2F] p-6 hover:border-purple-500/50 transition-all duration-200"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-white">
                              {adminUser.full_name || 'Sin nombre'}
                            </h3>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold border ${roleBadge.className}`}
                            >
                              {roleBadge.label}
                            </span>
                            {adminUser.is_producer && adminUser.producer_name && (
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/50">
                                {adminUser.producer_name}
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-lightGray mb-1">Email:</p>
                              <p className="text-white">{adminUser.email}</p>
                            </div>
                            {adminUser.phone && (
                              <div>
                                <p className="text-lightGray mb-1">Teléfono:</p>
                                <p className="text-white">{adminUser.phone}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-lightGray mb-1">Compras:</p>
                              <p className="text-white font-semibold">{adminUser.purchases_count}</p>
                            </div>
                            <div>
                              <p className="text-lightGray mb-1">Total Gastado:</p>
                              <p className="text-green-400 font-semibold">
                                ${adminUser.total_spent.toLocaleString('es-AR')}
                              </p>
                            </div>
                            <div>
                              <p className="text-lightGray mb-1">Registrado:</p>
                              <p className="text-white">
                                {format(new Date(adminUser.created_at), "dd 'de' MMM, yyyy", { locale: es })}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="relative">
                            <select
                              value={adminUser.role}
                              onChange={(e) => handleUpdateUserRole(adminUser.id, e.target.value as 'user' | 'producer' | 'admin')}
                              disabled={processingUser === adminUser.id || adminUser.id === user?.id}
                              className="px-4 py-2 bg-[#2F2F2F] border border-[#3F3F3F] rounded-lg text-white focus:outline-none focus:border-purple-vibrant transition-colors disabled:opacity-50 disabled:cursor-not-allowed appearance-none pr-8"
                            >
                              <option value="user">Usuario</option>
                              <option value="producer">Productora</option>
                              <option value="admin">Admin</option>
                            </select>
                            {processingUser === adminUser.id && (
                              <RefreshCw className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-purple-400" />
                            )}
                          </div>
                          {adminUser.id === user?.id && (
                            <p className="text-xs text-lightGray text-center">(Tú)</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Empty State */}
            {!usersLoading && filteredUsers.length === 0 && (
              <div className="bg-mediumGray rounded-2xl p-12 border border-[#2F2F2F] text-center">
                <Users className="w-16 h-16 mx-auto text-purple-400 mb-4" />
                <h2 className="text-2xl font-bold mb-4 uppercase tracking-wide">
                  No hay usuarios
                </h2>
                <p className="text-lightGray max-w-md mx-auto">
                  {searchQuery
                    ? 'No se encontraron usuarios con la búsqueda'
                    : 'Aún no hay usuarios registrados'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
