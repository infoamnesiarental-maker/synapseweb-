'use client'

import { useState, useMemo } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useEvents } from '@/lib/hooks/useEvents'
import { useAnalytics, AnalyticsFilters } from '@/lib/hooks/useAnalytics'
import { Calendar, BarChart3, DollarSign, Ticket, Eye, TrendingUp, Users, Download, List, X, ChevronDown, Check } from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale/es'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

export default function AnalyticsPage() {
  const { producer } = useAuth()
  const { events } = useEvents(producer?.id || null)
  
  // Filtros
  const [dateFrom, setDateFrom] = useState<Date | null>(startOfMonth(subDays(new Date(), 30)))
  const [dateTo, setDateTo] = useState<Date | null>(endOfMonth(new Date()))
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([])
  const [showEventSelector, setShowEventSelector] = useState(false)

  const filters: AnalyticsFilters = useMemo(() => ({
    dateFrom,
    dateTo,
    eventIds: selectedEventIds,
  }), [dateFrom, dateTo, selectedEventIds])

  const { analytics, loading, error } = useAnalytics(producer?.id || null, filters)

  // Toggle selección de evento
  const toggleEvent = (eventId: string) => {
    setSelectedEventIds(prev => 
      prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    )
  }

  // Seleccionar todos los eventos
  const selectAllEvents = () => {
    setSelectedEventIds(events.map(e => e.id))
  }

  // Deseleccionar todos
  const deselectAllEvents = () => {
    setSelectedEventIds([])
  }

  // Preparar datos para gráfico de evolución
  const evolutionChartData = analytics?.evolutionByDay.map(day => ({
    fecha: format(new Date(day.date), 'dd/MM', { locale: es }),
    tickets: day.tickets,
    vistas: day.views,
  })) || []

  // Preparar datos para heatmap
  const heatmapData = useMemo(() => {
    if (!analytics) return []
    
    const heatmap = new Map<string, number>()
    
    // Inicializar todos los valores en 0
    DAYS_OF_WEEK.forEach((_, dayIndex) => {
      HOURS.forEach(hour => {
        heatmap.set(`${dayIndex}-${hour}`, 0)
      })
    })
    
    // Llenar con datos reales
    analytics.salesHeatmap.forEach(({ dayOfWeek, hour, sales }) => {
      heatmap.set(`${dayOfWeek}-${hour}`, sales)
    })
    
    return Array.from(heatmap.entries()).map(([key, sales]) => {
      const [dayOfWeek, hour] = key.split('-').map(Number)
      return { dayOfWeek, hour, sales }
    })
  }, [analytics])

  // Calcular máximo de ventas para el heatmap
  const maxSales = useMemo(() => {
    if (!analytics || analytics.salesHeatmap.length === 0) return 1
    return Math.max(...analytics.salesHeatmap.map(h => h.sales), 1)
  }, [analytics])

  // Función para obtener color del heatmap
  const getHeatmapColor = (sales: number) => {
    if (sales === 0) return '#1F1F1F'
    const intensity = sales / maxSales
    if (intensity < 0.2) return '#1e3a8a' // Azul muy oscuro
    if (intensity < 0.4) return '#1e40af' // Azul oscuro
    if (intensity < 0.6) return '#2563eb' // Azul medio
    if (intensity < 0.8) return '#3b82f6' // Azul claro
    return '#60a5fa' // Azul muy claro
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black-deep flex items-center justify-center">
        <div className="text-white text-xl">Cargando analytics...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black-deep text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-3 h-3 bg-purple-vibrant rounded-full"></div>
            <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-wide">
              Panel de Analytics
            </h1>
          </div>
          <p className="text-lightGray text-lg">
            Analiza el rendimiento de tus eventos y ventas en el período seleccionado
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-mediumGray rounded-2xl p-6 border border-[#2F2F2F] mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            {/* Filtro de Período */}
            <div>
              <label className="block text-sm font-semibold text-lightGray mb-2">
                Período:
              </label>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-purple-vibrant" />
                <div className="flex items-center gap-2">
                  <DatePicker
                    selected={dateFrom}
                    onChange={(date: Date | null) => setDateFrom(date)}
                    selectsStart
                    startDate={dateFrom}
                    endDate={dateTo}
                    dateFormat="dd MMM, yyyy"
                    className="bg-[#2F2F2F] border border-[#3F3F3F] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-vibrant"
                    locale={es}
                  />
                  <span className="text-lightGray">-</span>
                  <DatePicker
                    selected={dateTo}
                    onChange={(date: Date | null) => setDateTo(date)}
                    selectsEnd
                    startDate={dateFrom}
                    endDate={dateTo}
                    minDate={dateFrom || undefined}
                    dateFormat="dd MMM, yyyy"
                    className="bg-[#2F2F2F] border border-[#3F3F3F] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-vibrant"
                    locale={es}
                  />
                </div>
              </div>
            </div>

            {/* Filtro de Eventos */}
            <div className="event-selector-container">
              <label className="block text-sm font-semibold text-lightGray mb-2">
                Eventos:
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowEventSelector(!showEventSelector)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-2 bg-[#2F2F2F] border border-[#3F3F3F] rounded-lg hover:border-purple-vibrant/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Calendar className="w-5 h-5 text-purple-vibrant flex-shrink-0" />
                    <div className="flex items-center gap-2 flex-wrap flex-1 min-h-[24px]">
                      {selectedEventIds.length === 0 ? (
                        <span className="text-lightGray italic">Todos los eventos ({events.length})</span>
                      ) : selectedEventIds.length === events.length ? (
                        <span className="text-white">Todos los eventos ({events.length})</span>
                      ) : (
                        <>
                          {selectedEventIds.slice(0, 2).map(eventId => {
                            const event = events.find(e => e.id === eventId)
                            return event ? (
                              <span
                                key={eventId}
                                className="inline-flex items-center gap-2 px-2 py-1 bg-purple-vibrant/20 text-purple-vibrant rounded text-xs border border-purple-vibrant/50"
                              >
                                {event.name}
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleEvent(eventId)
                                  }}
                                  className="hover:text-white transition-colors cursor-pointer"
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      toggleEvent(eventId)
                                    }
                                  }}
                                >
                                  <X className="w-3 h-3" />
                                </span>
                              </span>
                            ) : null
                          })}
                          {selectedEventIds.length > 2 && (
                            <span className="text-lightGray text-xs">
                              +{selectedEventIds.length - 2} más
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronDown 
                    className={`w-5 h-5 text-lightGray transition-transform ${showEventSelector ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Dropdown de eventos */}
                {showEventSelector && events.length > 0 && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowEventSelector(false)}
                    />
                    <div className="absolute z-50 w-full mt-2 bg-[#1F1F1F] border border-[#2F2F2F] rounded-lg shadow-xl max-h-64 overflow-y-auto">
                    <div className="p-2 border-b border-[#2F2F2F]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-white">Seleccionar eventos</span>
                        <div className="flex gap-2">
                          <button
                            onClick={selectAllEvents}
                            className="text-xs text-purple-vibrant hover:text-white transition-colors px-2 py-1 hover:bg-purple-vibrant/10 rounded"
                          >
                            Todos
                          </button>
                          {selectedEventIds.length > 0 && (
                            <button
                              onClick={deselectAllEvents}
                              className="text-xs text-lightGray hover:text-white transition-colors px-2 py-1 hover:bg-red-500/10 rounded"
                            >
                              Limpiar
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-lightGray">
                        {selectedEventIds.length === 0 
                          ? `Todos los eventos seleccionados (${events.length})`
                          : `${selectedEventIds.length} de ${events.length} eventos seleccionados`
                        }
                      </div>
                    </div>
                    <div className="p-2">
                      {events.map(event => {
                        const isSelected = selectedEventIds.includes(event.id)
                        return (
                          <label
                            key={event.id}
                            className="flex items-center gap-3 p-2 hover:bg-[#2F2F2F] rounded-lg cursor-pointer transition-colors"
                          >
                            <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                              isSelected 
                                ? 'bg-purple-vibrant border-purple-vibrant' 
                                : 'border-[#3F3F3F]'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm text-white font-medium">{event.name}</div>
                              <div className="text-xs text-lightGray">
                                {format(new Date(event.start_date), "dd MMM, yyyy", { locale: es })}
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleEvent(event.id)}
                              className="hidden"
                            />
                          </label>
                        )
                      })}
                    </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#2F2F2F]">
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg border border-blue-500/50 transition-colors text-blue-400">
              <List className="w-4 h-4" />
              <span>Lista de Asistentes</span>
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-green/20 hover:bg-green/30 rounded-lg border border-green/50 transition-colors text-green">
              <Download className="w-4 h-4" />
              <span>Descargar Reporte</span>
            </button>
          </div>
        </div>

        {/* Banner de eventos analizados */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
          <p className="text-blue-400 font-semibold">
            {analytics?.eventsAnalyzed || 0} {analytics?.eventsAnalyzed === 1 ? 'Evento' : 'Eventos'} analizados en el período seleccionado
          </p>
        </div>

        {/* Métricas Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Facturación Total */}
          <div className="bg-gradient-to-br from-green/10 to-green/5 rounded-2xl p-6 border-2 border-green/30">
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="w-6 h-6 text-green" />
              <h3 className="text-lg font-bold uppercase tracking-wide">Facturación Total</h3>
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              ${analytics?.totalRevenue.toLocaleString('es-AR') || '0'}
            </p>
            <p className="text-xs text-green/80">Total</p>
          </div>

          {/* Tickets */}
          <div className="bg-gradient-to-br from-purple-vibrant/10 to-purple-vibrant/5 rounded-2xl p-6 border-2 border-purple-vibrant/30">
            <div className="flex items-center gap-3 mb-4">
              <Ticket className="w-6 h-6 text-purple-vibrant" />
              <h3 className="text-lg font-bold uppercase tracking-wide">Tickets</h3>
            </div>
            <p className="text-2xl font-bold text-white mb-1">
              {analytics?.totalTicketsSold || 0}
            </p>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-lightGray">
                ${analytics?.totalRevenue.toLocaleString('es-AR') || '0'}
              </span>
              <span className="text-purple-vibrant font-semibold">
                {analytics?.totalTicketsOriginal && analytics.totalTicketsOriginal > 0
                  ? `${Math.round((analytics.totalTicketsSold / analytics.totalTicketsOriginal) * 100)}%`
                  : '0%'}
              </span>
            </div>
          </div>

          {/* Ticket Promedio */}
          <div className="bg-gradient-to-br from-yellow/10 to-yellow/5 rounded-2xl p-6 border-2 border-yellow/30">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-yellow" />
              <h3 className="text-lg font-bold uppercase tracking-wide">Ticket Promedio</h3>
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              ${analytics?.averageTicketPrice.toLocaleString('es-AR', { maximumFractionDigits: 0 }) || '0'}
            </p>
            <p className="text-xs text-yellow/80">${analytics?.averageTicketPrice.toLocaleString('es-AR', { maximumFractionDigits: 0 }) || '0'}</p>
          </div>

          {/* Vistas */}
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-2xl p-6 border-2 border-blue-500/30">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-6 h-6 text-blue-400" />
              <h3 className="text-lg font-bold uppercase tracking-wide">Vistas</h3>
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              {analytics?.totalViews.toLocaleString('es-AR') || '0'}
            </p>
          </div>
        </div>

        {/* Gráfico de Evolución */}
        <div className="bg-mediumGray rounded-2xl p-8 border border-[#2F2F2F] mb-8">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="w-6 h-6 text-purple-vibrant" />
            <h2 className="text-2xl font-bold uppercase tracking-wide">Evolución de Ventas y Visitas</h2>
          </div>
          {evolutionChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={evolutionChartData} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2F2F2F" opacity={0.2} />
                <XAxis
                  dataKey="fecha"
                  stroke="#FFFFFF"
                  style={{ fontSize: '16px', fontWeight: '600' }}
                  tick={{ fill: '#FFFFFF' }}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#A855F7"
                  style={{ fontSize: '14px', fontWeight: '600' }}
                  tick={{ fill: '#A855F7' }}
                  width={50}
                  domain={[0, 50]}
                  ticks={[0, 10, 20, 30, 40, 50]}
                  tickFormatter={(value) => Math.floor(value).toString()}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#3B82F6"
                  style={{ fontSize: '14px', fontWeight: '600' }}
                  tick={{ fill: '#3B82F6' }}
                  width={50}
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
                />
                <Legend
                  wrapperStyle={{ color: '#FFFFFF', fontSize: '14px', fontWeight: '600', paddingTop: '20px' }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="tickets"
                  stroke="#A855F7"
                  strokeWidth={3}
                  name="Tickets Vendidos"
                  dot={{ fill: '#A855F7', r: 5, strokeWidth: 2, stroke: '#1F1F1F' }}
                  activeDot={{ r: 7, stroke: '#A855F7', strokeWidth: 2 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="vistas"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  name="Vistas"
                  dot={{ fill: '#3B82F6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-lightGray">
              <div className="text-center">
                <X className="w-16 h-16 mx-auto mb-4 text-purple-vibrant/30" />
                <p className="text-lg">No hay datos disponibles</p>
                <p className="text-sm mt-2">No se encontraron datos para mostrar en el gráfico</p>
              </div>
            </div>
          )}
        </div>

        {/* Mapa de Calor */}
        <div className="bg-mediumGray rounded-2xl p-8 border border-[#2F2F2F] mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold uppercase tracking-wide mb-2">Mapa de Calor de Ventas</h2>
              <p className="text-lightGray text-sm">
                Análisis de patrones de compra por día de la semana y hora del día
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-lightGray">Menos ventas</span>
              <div className="flex gap-1">
                {[0.2, 0.4, 0.6, 0.8, 1.0].map((intensity) => (
                  <div
                    key={intensity}
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: getHeatmapColor(maxSales * intensity) }}
                  />
                ))}
              </div>
              <span className="text-xs text-lightGray">Más ventas</span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-2 text-sm font-semibold text-lightGray">Día / Hora</th>
                  {HOURS.map(hour => (
                    <th key={hour} className="text-center p-2 text-xs text-lightGray min-w-[40px]">
                      {hour}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS_OF_WEEK.map((day, dayIndex) => {
                  const dayData = heatmapData.filter(d => d.dayOfWeek === dayIndex)
                  const dayTotal = dayData.reduce((sum, d) => sum + d.sales, 0)
                  
                  return (
                    <tr key={dayIndex}>
                      <td className="p-3 text-sm font-semibold text-white border-r border-[#2F2F2F]">
                        <div>{day}</div>
                        <div className="text-xs text-lightGray mt-1">{dayTotal}</div>
                      </td>
                      {HOURS.map(hour => {
                        const cellData = dayData.find(d => d.hour === hour)
                        const sales = cellData?.sales || 0
                        return (
                          <td
                            key={hour}
                            className="p-2 text-center border border-[#2F2F2F]"
                            style={{ backgroundColor: getHeatmapColor(sales) }}
                          >
                            {sales > 0 && (
                              <span className="text-xs text-white font-semibold">{sales}</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reporte Detallado (Colapsable) */}
        <div className="bg-mediumGray rounded-2xl p-6 border border-[#2F2F2F]">
          <h3 className="text-xl font-bold uppercase tracking-wide mb-4">Reporte Detallado de Tickets</h3>
          <div className="text-center py-8 text-lightGray">
            <p className="text-lg mb-2">Venta de Tickets</p>
            <p>No hay datos disponibles</p>
            <p className="text-sm mt-2">No hay información para mostrar en este momento.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
