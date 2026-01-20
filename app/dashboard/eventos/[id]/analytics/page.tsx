'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEventAnalytics } from '@/lib/hooks/useEventAnalytics'
import { useEvents } from '@/lib/hooks/useEvents'
import { useAuth } from '@/lib/hooks/useAuth'
import { ArrowLeft, TrendingUp, Eye, Ticket, DollarSign, Users, BarChart3 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale/es'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export default function EventAnalyticsPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string
  const { producer } = useAuth()
  const { events } = useEvents(producer?.id || null)
  const { analytics, loading, error } = useEventAnalytics(eventId)

  const event = events.find((e) => e.id === eventId)

  if (loading) {
    return (
      <div className="min-h-screen bg-black-deep flex items-center justify-center">
        <div className="text-white text-xl">Cargando analytics...</div>
      </div>
    )
  }

  if (error || !analytics || !event) {
    return (
      <div className="min-h-screen bg-black-deep text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-6">
            <p className="text-red-400">
              {error || 'Error cargando analytics del evento'}
            </p>
            <button
              onClick={() => router.back()}
              className="mt-4 px-8 py-3 bg-purple-vibrant hover:bg-[#9333EA] text-white rounded-[32px] transition-all duration-300 font-bold uppercase tracking-wider text-sm shadow-[0_0_24px_rgba(168,85,247,0.4)] hover:shadow-[0_0_32px_rgba(168,85,247,0.6)] hover:scale-105 active:scale-95"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Preparar datos para gráficos
  const salesChartData = analytics.salesByDay.map((day) => ({
    fecha: format(new Date(day.date), 'dd/MM', { locale: es }),
    tickets: day.tickets,
    facturación: day.revenue,
  }))

  const viewsChartData = analytics.viewsByDay.map((day) => ({
    fecha: format(new Date(day.date), 'dd/MM', { locale: es }),
    vistas: day.views,
  }))

  return (
    <div className="min-h-screen bg-black-deep text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver</span>
          </button>
          <div className="flex items-center gap-4 mb-3">
            <div className="w-4 h-4 bg-purple-vibrant rounded-full shadow-[0_0_16px_rgba(168,85,247,0.5)]"></div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-wider leading-tight">
              Analytics - {event.name}
            </h1>
          </div>
          <p className="text-lightGray text-lg md:text-xl ml-8">
            Métricas y estadísticas detalladas del evento
          </p>
        </div>

        {/* Métricas Principales - Ordenadas por Importancia */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* 1. Facturación Total - MÁS IMPORTANTE */}
          <div className="bg-gradient-to-br from-green/10 to-green/5 rounded-3xl p-8 border-2 border-green/30 shadow-[0_4px_24px_rgba(16,185,129,0.2)] hover:shadow-[0_8px_48px_rgba(16,185,129,0.3)] transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-6">
              <div className="w-16 h-16 bg-green/20 rounded-2xl flex items-center justify-center shadow-[0_0_16px_rgba(16,185,129,0.3)]">
                <DollarSign className="w-8 h-8 text-green" />
              </div>
            </div>
            <p className="text-lightGray text-xs uppercase tracking-wider mb-3 font-semibold">Facturación Total</p>
            <p className="text-4xl font-black text-white mb-2">
              ${analytics.totalRevenue.toLocaleString('es-AR')}
            </p>
            <p className="text-sm text-green/90 font-medium">
              Ticket promedio: ${analytics.averageTicketPrice.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
            </p>
          </div>

          {/* 2. Tickets Vendidos - CRÍTICO */}
          <div className="bg-gradient-to-br from-purple-vibrant/10 to-purple-vibrant/5 rounded-3xl p-8 border-2 border-purple-vibrant/30 shadow-[0_4px_24px_rgba(168,85,247,0.2)] hover:shadow-[0_8px_48px_rgba(168,85,247,0.3)] transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-6">
              <div className="w-16 h-16 bg-purple-vibrant/20 rounded-2xl flex items-center justify-center shadow-[0_0_16px_rgba(168,85,247,0.3)]">
                <Ticket className="w-8 h-8 text-purple-vibrant" />
              </div>
            </div>
            <p className="text-lightGray text-xs uppercase tracking-wider mb-3 font-semibold">Tickets Vendidos</p>
            <p className="text-4xl font-black text-white mb-2">
              {analytics.ticketsSold} / {analytics.totalTicketsOriginal}
            </p>
            <div className="flex items-center gap-4 mt-3">
              <p className="text-sm text-lightGray font-medium">
                {analytics.totalTicketsOriginal > 0
                  ? `${Math.round((analytics.ticketsSold / analytics.totalTicketsOriginal) * 100)}% vendido`
                  : 'Sin límite'}
              </p>
              <p className="text-sm text-green font-bold">
                {analytics.ticketsAvailable} disponibles
              </p>
            </div>
          </div>

          {/* 3. Tasa de Conversión - IMPORTANTE */}
          <div className="bg-gradient-to-br from-yellow/10 to-yellow/5 rounded-3xl p-8 border-2 border-yellow/30 shadow-[0_4px_24px_rgba(250,204,21,0.2)] hover:shadow-[0_8px_48px_rgba(250,204,21,0.3)] transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-6">
              <div className="w-16 h-16 bg-yellow/20 rounded-2xl flex items-center justify-center shadow-[0_0_16px_rgba(250,204,21,0.3)]">
                <TrendingUp className="w-8 h-8 text-yellow" />
              </div>
            </div>
            <p className="text-lightGray text-xs uppercase tracking-wider mb-3 font-semibold">Tasa de Conversión</p>
            <p className="text-4xl font-black text-white mb-2">
              {analytics.conversionRate.toFixed(1)}%
            </p>
            <p className="text-sm text-lightGray mt-2 font-medium">
              {analytics.totalViews > 0
                ? `${analytics.ticketsSold} tickets de ${analytics.totalViews.toLocaleString('es-AR')} vistas`
                : 'Sin datos'}
            </p>
          </div>
        </div>

        {/* Métricas Secundarias */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Vistas del Evento */}
          <div className="bg-mediumGray rounded-3xl p-8 border-2 border-[#2F2F2F] shadow-card hover:shadow-elevated transition-all duration-300 hover:scale-[1.01]">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-electric/20 flex items-center justify-center">
                <Eye className="w-6 h-6 text-blue-electric" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-wider">Vistas del Evento</h3>
            </div>
            <p className="text-3xl font-black text-white mb-2">
              {analytics.totalViews.toLocaleString('es-AR')}
            </p>
            <p className="text-sm text-lightGray font-medium">Total de visualizaciones</p>
          </div>

          {/* Ticket Promedio */}
          <div className="bg-mediumGray rounded-3xl p-8 border-2 border-[#2F2F2F] shadow-card hover:shadow-elevated transition-all duration-300 hover:scale-[1.01]">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-vibrant/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-vibrant" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-wider">Ticket Promedio</h3>
            </div>
            <p className="text-3xl font-black text-purple-vibrant mb-2">
              ${analytics.averageTicketPrice.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-sm text-lightGray font-medium">Precio promedio por ticket</p>
          </div>
        </div>

        {/* Gráfico Principal: Tickets Vendidos por Día */}
        <div className="bg-mediumGray rounded-3xl p-10 border-2 border-[#2F2F2F] mb-8 shadow-card">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl bg-purple-vibrant/20 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-purple-vibrant" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-wider">Tickets Vendidos por Día</h2>
          </div>
          {salesChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                data={salesChartData}
                margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                barCategoryGap="30%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2F2F2F" opacity={0.2} />
                <XAxis
                  dataKey="fecha"
                  stroke="#FFFFFF"
                  style={{ fontSize: '18px', fontWeight: '600' }}
                  tick={{ fill: '#FFFFFF' }}
                  tickLine={{ stroke: '#A3A3A3' }}
                />
                <YAxis 
                  stroke="#A855F7"
                  style={{ fontSize: '16px', fontWeight: '600' }}
                  tick={{ fill: '#A855F7' }}
                  tickLine={{ stroke: '#A855F7' }}
                  width={50}
                  domain={[0, 50]}
                  ticks={[0, 10, 20, 30, 40, 50]}
                  tickFormatter={(value) => {
                    // Solo valores enteros
                    return Math.floor(value).toString()
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F1F1F',
                    border: '2px solid #A855F7',
                    borderRadius: '16px',
                    color: '#FFFFFF',
                    padding: '16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    boxShadow: '0 0 24px rgba(168, 85, 247, 0.3)',
                  }}
                  formatter={(value: any) => [`${Math.floor(value)} tickets`, 'Tickets Vendidos']}
                />
                <Bar 
                  dataKey="tickets" 
                  fill="#A855F7" 
                  name="Tickets Vendidos" 
                  radius={[12, 12, 0, 0]}
                  stroke="#9333EA"
                  strokeWidth={2}
                  maxBarSize={100}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-lightGray">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 text-purple-vibrant/30" />
                <p className="text-lg">No hay datos de ventas aún</p>
                <p className="text-sm mt-2">Las ventas aparecerán aquí cuando se realicen compras</p>
              </div>
            </div>
          )}
        </div>

        {/* Gráfico Secundario: Vistas por Día */}
        <div className="bg-mediumGray rounded-3xl p-10 border-2 border-[#2F2F2F] mb-8 shadow-card">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl bg-blue-electric/20 flex items-center justify-center">
              <Eye className="w-6 h-6 text-blue-electric" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-wider">Vistas por Día</h2>
          </div>
          {viewsChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart 
                data={viewsChartData}
                margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2F2F2F" opacity={0.2} />
                <XAxis
                  dataKey="fecha"
                  stroke="#A3A3A3"
                  style={{ fontSize: '16px', fontWeight: '600' }}
                  tick={{ fill: '#FFFFFF' }}
                  tickLine={{ stroke: '#A3A3A3' }}
                />
                <YAxis 
                  stroke="#3B82F6"
                  style={{ fontSize: '14px', fontWeight: '600' }}
                  tick={{ fill: '#3B82F6' }}
                  tickLine={{ stroke: '#3B82F6' }}
                  width={60}
                  tickFormatter={(value) => {
                    // Mostrar solo valores importantes
                    if (value === 0) return '0'
                    const max = Math.max(...viewsChartData.map(d => d.vistas))
                    if (max <= 10) return value.toString()
                    // Si hay muchos valores, mostrar solo algunos
                    const step = Math.ceil(max / 4)
                    if (value % step === 0 || value === max) return value.toString()
                    return ''
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F1F1F',
                    border: '2px solid #3B82F6',
                    borderRadius: '16px',
                    color: '#FFFFFF',
                    padding: '16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    boxShadow: '0 0 24px rgba(59, 130, 246, 0.3)',
                  }}
                  formatter={(value: any) => [`${value} vistas`, 'Vistas']}
                />
                <Legend
                  wrapperStyle={{ color: '#FFFFFF', fontSize: '14px', fontWeight: '600', paddingTop: '20px' }}
                />
                <Line
                  type="monotone"
                  dataKey="vistas"
                  stroke="#3B82F6"
                  strokeWidth={4}
                  name="Vistas"
                  dot={{ fill: '#3B82F6', r: 6, strokeWidth: 2, stroke: '#1F1F1F' }}
                  activeDot={{ r: 8, stroke: '#3B82F6', strokeWidth: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-lightGray">
              <div className="text-center">
                <Eye className="w-16 h-16 mx-auto mb-4 text-blue-400/30" />
                <p className="text-lg">No hay datos de vistas aún</p>
                <p className="text-sm mt-2">Las vistas aparecerán aquí cuando usuarios visiten el evento</p>
              </div>
            </div>
          )}
        </div>

        {/* Tickets por Tipo */}
        <div className="bg-mediumGray rounded-3xl p-8 border-2 border-[#2F2F2F] mb-8 shadow-card">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl bg-purple-vibrant/20 flex items-center justify-center">
              <Ticket className="w-6 h-6 text-purple-vibrant" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-wider">Tickets por Tipo</h2>
          </div>
          {analytics.ticketsByType.length > 0 ? (
            <div className="space-y-6">
              {analytics.ticketsByType.map((type, index) => (
                <div
                  key={index}
                  className="bg-[#2F2F2F] rounded-2xl p-6 border-2 border-[#3F3F3F] hover:border-purple-vibrant/50 transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-white">{type.typeName}</h3>
                    <span className="text-purple-vibrant font-semibold">
                      ${type.revenue.toLocaleString('es-AR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-lightGray">
                    <span>
                      Vendidos: <span className="text-white font-semibold">{type.sold}</span>
                    </span>
                    <span>
                      Disponibles: <span className="text-white font-semibold">{type.available}</span>
                    </span>
                    {type.total > 0 && (
                      <span>
                        Progreso:{' '}
                        <span className="text-white font-semibold">
                          {Math.round((type.sold / type.total) * 100)}%
                        </span>
                      </span>
                    )}
                  </div>
                  {type.total > 0 && (
                    <div className="mt-3 h-2 bg-[#1F1F1F] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-vibrant transition-all duration-300"
                        style={{ width: `${Math.min((type.sold / type.total) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-lightGray">
              <p>No hay tipos de tickets configurados</p>
            </div>
          )}
        </div>

        {/* Información del Evento */}
        <div className="bg-mediumGray rounded-3xl p-8 border-2 border-[#2F2F2F] shadow-card">
          <h2 className="text-2xl font-black uppercase tracking-wider mb-6">Información del Evento</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-lightGray mb-1">Fecha de Inicio</p>
              <p className="text-white font-semibold">
                {format(new Date(event.start_date), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", {
                  locale: es,
                })}
              </p>
            </div>
            <div>
              <p className="text-lightGray mb-1">Fecha de Fin</p>
              <p className="text-white font-semibold">
                {format(new Date(event.end_date), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", {
                  locale: es,
                })}
              </p>
            </div>
            <div>
              <p className="text-lightGray mb-1">Lugar</p>
              <p className="text-white font-semibold">{event.venue_name}</p>
            </div>
            <div>
              <p className="text-lightGray mb-1">Estado</p>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  event.status === 'published'
                    ? 'bg-green/20 text-green border border-green/50'
                    : event.status === 'draft'
                    ? 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                    : event.status === 'finished'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                    : 'bg-red-500/20 text-red-400 border border-red-500/50'
                }`}
              >
                {event.status === 'published'
                  ? 'Publicado'
                  : event.status === 'draft'
                  ? 'Borrador'
                  : event.status === 'finished'
                  ? 'Finalizado'
                  : 'Cancelado'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
