'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay, startOfWeek, endOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'

interface DateTimePickerProps {
  value: { date: string; time: string }
  onChange: (date: string, time: string) => void
  label: string
  required?: boolean
  minDate?: Date
}

export default function DateTimePicker({
  value,
  onChange,
  label,
  required = false,
  minDate,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value.date) {
      return new Date(value.date)
    }
    return new Date()
  })
  const [selectedHour, setSelectedHour] = useState(() => {
    if (value.time) {
      const [hour] = value.time.split(':')
      return parseInt(hour) || 20
    }
    return 20
  })
  const [selectedMinute, setSelectedMinute] = useState(() => {
    if (value.time) {
      const [, minute] = value.time.split(':')
      return parseInt(minute) || 0
    }
    return 0
  })
  const pickerRef = useRef<HTMLDivElement>(null)

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleDateSelect = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    onChange(dateStr, value.time || '20:00')
    setIsOpen(false)
  }

  const handleTimeApply = () => {
    const selectedDateStr = value.date || format(new Date(), 'yyyy-MM-dd')
    const selectedDateObj = new Date(selectedDateStr)
    const now = new Date()
    const isToday = selectedDateObj.toDateString() === now.toDateString()
    
    // Si es hoy, validar que la hora no sea pasada
    if (isToday) {
      const selectedTime = new Date(`${selectedDateStr}T${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`)
      if (selectedTime < now) {
        // Si la hora seleccionada es pasada, usar la hora actual + 5 minutos
        const currentHour = now.getHours()
        const currentMinute = now.getMinutes()
        const nextMinute = Math.ceil(currentMinute / 5) * 5
        const finalHour = nextMinute >= 60 ? currentHour + 1 : currentHour
        const finalMinute = nextMinute >= 60 ? 0 : nextMinute
        
        const timeStr = `${String(finalHour % 24).padStart(2, '0')}:${String(finalMinute).padStart(2, '0')}`
        onChange(selectedDateStr, timeStr)
      } else {
        const timeStr = `${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`
        onChange(selectedDateStr, timeStr)
      }
    } else {
      const timeStr = `${String(selectedHour).padStart(2, '0')}:${String(selectedMinute).padStart(2, '0')}`
      onChange(selectedDateStr, timeStr)
    }
    setIsOpen(false)
  }

  const handleCancel = () => {
    setIsOpen(false)
  }

  // Generar días del mes
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const selectedDate = value.date ? new Date(value.date) : null
  const today = new Date()
  // Normalizar minDate para comparación (solo fecha, sin hora)
  const minDateNormalized = minDate ? new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()) : null
  const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  
  // Verificar si la fecha seleccionada es hoy (para validar horas)
  const isSelectedDateToday = selectedDate && selectedDate.toDateString() === today.toDateString()
  const currentHour = today.getHours()
  const currentMinute = today.getMinutes()

  // Generar horas (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i)
  // Generar minutos (0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55)
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5)

  const displayValue = value.date && value.time
    ? `${format(new Date(`${value.date}T${value.time}`), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}`
    : 'Seleccionar fecha y hora'

  return (
    <div className="relative" ref={pickerRef}>
      <label className="block text-sm font-semibold mb-2 uppercase tracking-wide text-lightGray">
        {label} {required && '*'}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-left focus:outline-none focus:border-[#A855F7]/50 focus:ring-2 focus:ring-[#A855F7]/20 transition-all duration-300 hover:border-[#A855F7]/30"
      >
        {displayValue}
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 bg-[#1F1F1F] border-2 border-[#2F2F2F] rounded-2xl shadow-2xl overflow-hidden w-[700px]">
          <div className="flex">
            {/* Calendario */}
            <div className="p-8 border-r border-white/10 flex-1 bg-[#1F1F1F]">
              {/* Header del calendario */}
              <div className="flex items-center justify-between mb-8">
                <button
                  type="button"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors duration-300"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <div className="text-center">
                  <h3 className="text-2xl font-bold uppercase tracking-wide text-white">
                    {format(currentMonth, 'MMMM', { locale: es })}
                  </h3>
                  <p className="text-lg text-white mt-1">
                    {format(currentMonth, 'yyyy', { locale: es })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors duration-300"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
              </div>

              {/* Días de la semana */}
              <div className="grid grid-cols-7 gap-3 mb-6">
                {['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'].map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-semibold text-lightGray py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Días del mes */}
              <div className="grid grid-cols-7 gap-3">
                {days.map((day, index) => {
                  const isCurrentMonth = isSameMonth(day, currentMonth)
                  const isSelected = selectedDate && isSameDay(day, selectedDate)
                  const isToday = isSameDay(day, today)
                  const dayNormalized = new Date(day.getFullYear(), day.getMonth(), day.getDate())
                  const isDisabled = minDateNormalized && dayNormalized < minDateNormalized

                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => !isDisabled && handleDateSelect(day)}
                      disabled={isDisabled ?? undefined}
                      className={`
                        aspect-square rounded-xl text-lg font-semibold transition-all duration-300 flex items-center justify-center
                        ${
                          !isCurrentMonth
                            ? 'text-white/20'
                            : isSelected
                              ? 'bg-[#A855F7] text-white shadow-lg shadow-[#A855F7]/30'
                              : isToday
                                ? 'bg-white/10 text-white'
                                : 'text-white hover:bg-white/10'
                        }
                        ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      {format(day, 'd')}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Selector de hora */}
            <div className="p-8 flex-1 border-l border-white/10 bg-[#1F1F1F]">
              <h4 className="text-base font-bold uppercase tracking-wide mb-6 text-lightGray">
                Hora
              </h4>
              <div className="flex gap-6">
                {/* Horas */}
                <div className="flex-1">
                  <div className="h-64 overflow-y-auto">
                    {hours.map((hour) => {
                      const isHourDisabled = isSelectedDateToday && hour < currentHour
                      return (
                        <button
                          key={hour}
                          type="button"
                          onClick={() => !isHourDisabled && setSelectedHour(hour)}
                          disabled={isHourDisabled ?? undefined}
                          className={`
                            w-full py-3 text-center text-base font-semibold rounded-lg transition-all duration-300
                            ${
                              isHourDisabled
                                ? 'opacity-30 cursor-not-allowed text-white/20'
                                : selectedHour === hour
                                  ? 'bg-[#A855F7] text-white'
                                  : 'text-lightGray hover:bg-white/10 hover:text-white'
                            }
                          `}
                        >
                          {String(hour).padStart(2, '0')}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Minutos */}
                <div className="flex-1 border-l border-white/10 pl-6">
                  <div className="h-64 overflow-y-auto">
                    {minutes.map((minute) => {
                      const isMinuteDisabled = isSelectedDateToday && selectedHour === currentHour && minute < currentMinute
                      return (
                        <button
                          key={minute}
                          type="button"
                          onClick={() => !isMinuteDisabled && setSelectedMinute(minute)}
                          disabled={isMinuteDisabled ?? undefined}
                          className={`
                            w-full py-3 text-center text-base font-semibold rounded-lg transition-all duration-300
                            ${
                              isMinuteDisabled
                                ? 'opacity-30 cursor-not-allowed text-white/20'
                                : selectedMinute === minute
                                  ? 'bg-[#A855F7] text-white'
                                  : 'text-lightGray hover:bg-white/10 hover:text-white'
                            }
                          `}
                        >
                          {String(minute).padStart(2, '0')}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3 mt-6 pt-6 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-white font-semibold text-base transition-all duration-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleTimeApply}
                  className="flex-1 px-6 py-3 bg-[#A855F7] hover:bg-[#9333EA] rounded-lg text-white font-semibold text-base transition-all duration-300"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
