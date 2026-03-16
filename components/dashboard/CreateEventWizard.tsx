'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { generateSlug, generateUniqueSlug } from '@/lib/utils/slug'
import { ArrowLeft, ArrowRight, Check, Calendar, MapPin, Ticket, Eye } from 'lucide-react'
import Link from 'next/link'
import ImageUpload, { ImageUploadRef } from './ImageUpload'
import DateTimePicker from './DateTimePicker'
import CategorySelector from './CategorySelector'

interface TicketType {
  id?: string // ID del ticket existente (para edición)
  name: string
  description: string
  price: string
  quantity_available: string
  sale_start_date: string
  sale_start_time: string
  sale_end_date: string
  sale_end_time: string
}

interface CreateEventWizardProps {
  eventId?: string // Si se proporciona, es modo edición
}

export default function CreateEventWizard({ eventId }: CreateEventWizardProps = {} as CreateEventWizardProps) {
  const router = useRouter()
  const { producer, loading: authLoading } = useAuth()
  const supabase = createClient()
  const isEditMode = !!eventId

  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 4
  const [loadingData, setLoadingData] = useState(isEditMode)

  // Paso 1: Información Básica
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [flyerUrl, setFlyerUrl] = useState('')

  // Paso 2: Ubicación
  const [venueName, setVenueName] = useState('')
  const [venueAddress, setVenueAddress] = useState('')
  const [venueCity, setVenueCity] = useState('')

  // Paso 3: Tickets
  const [tickets, setTickets] = useState<TicketType[]>([
    {
      name: '',
      description: '',
      price: '',
      quantity_available: '',
      sale_start_date: '',
      sale_start_time: '',
      sale_end_date: '',
      sale_end_time: '',
    },
  ])

  // Paso 4: Publicar
  const [status, setStatus] = useState<'draft' | 'published'>('draft')


  // Estados de UI
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openPriceSuggestions, setOpenPriceSuggestions] = useState<number | null>(null)
  const [openQuantitySuggestions, setOpenQuantitySuggestions] = useState<number | null>(null)
  const imageUploadRef = useRef<ImageUploadRef>(null)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null) // Guardar archivo seleccionado en el padre

  // Cargar datos del evento si es modo edición
  useEffect(() => {
    async function loadEventData() {
      if (!eventId || !producer) return

      setLoadingData(true)
      try {
        // Cargar evento
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .eq('producer_id', producer.id)
          .single()

        if (eventError || !eventData) {
          setError('Evento no encontrado o no tienes permisos para editarlo')
          setLoadingData(false)
          return
        }

        // Cargar tickets
        const { data: ticketTypesData, error: ticketsError } = await supabase
          .from('ticket_types')
          .select('*')
          .eq('event_id', eventId)
          .order('created_at', { ascending: true })

        if (ticketsError) {
          console.error('Error cargando tickets:', ticketsError)
        }

        // Llenar formulario con datos del evento
        setName(eventData.name || '')
        setDescription(eventData.description || '')
        setCategory(eventData.category || '')
        
        // Parsear fechas
        const startDateObj = new Date(eventData.start_date)
        const endDateObj = new Date(eventData.end_date)
        setStartDate(startDateObj.toISOString().split('T')[0])
        setStartTime(startDateObj.toTimeString().slice(0, 5))
        setEndDate(endDateObj.toISOString().split('T')[0])
        setEndTime(endDateObj.toTimeString().slice(0, 5))
        
        setVenueName(eventData.venue_name || '')
        setVenueAddress(eventData.venue_address || '')
        setVenueCity(eventData.venue_city || '')
        setFlyerUrl(eventData.flyer_url || '')
        setStatus(eventData.status as 'draft' | 'published')

        // Llenar tickets
        if (ticketTypesData && ticketTypesData.length > 0) {
          const formattedTickets: TicketType[] = ticketTypesData.map((ticket) => {
            const saleStart = ticket.sale_start_date ? new Date(ticket.sale_start_date) : null
            const saleEnd = ticket.sale_end_date ? new Date(ticket.sale_end_date) : null
            
            return {
              id: ticket.id,
              name: ticket.name || '',
              description: ticket.description || '',
              price: ticket.price.toString(),
              quantity_available: ticket.quantity_available.toString(),
              sale_start_date: saleStart ? saleStart.toISOString().split('T')[0] : '',
              sale_start_time: saleStart ? saleStart.toTimeString().slice(0, 5) : '',
              sale_end_date: saleEnd ? saleEnd.toISOString().split('T')[0] : '',
              sale_end_time: saleEnd ? saleEnd.toTimeString().slice(0, 5) : '',
            }
          })
          setTickets(formattedTickets)
        }
      } catch (err) {
        console.error('Error cargando evento:', err)
        setError('Error al cargar el evento')
      } finally {
        setLoadingData(false)
      }
    }

    if (isEditMode && producer) {
      void loadEventData()
    }
  }, [eventId, producer, supabase, isEditMode])

  // Cerrar sugerencias al hacer click fuera o en otro input
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement
      // Si el click no es en un input de precio/cantidad ni en sus sugerencias
      if (
        !target.closest('.price-input-container') &&
        !target.closest('.quantity-input-container') &&
        !target.closest('.suggestions-dropdown')
      ) {
        setOpenPriceSuggestions(null)
        setOpenQuantitySuggestions(null)
      }
    }
    if (openPriceSuggestions !== null || openQuantitySuggestions !== null) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openPriceSuggestions, openQuantitySuggestions])

  if (authLoading || loadingData) {
    return (
      <div className="min-h-screen bg-black-deep text-white flex items-center justify-center">
        <div className="text-xl">{isEditMode ? 'Cargando evento...' : 'Cargando...'}</div>
      </div>
    )
  }

  if (!producer) {
    return null
  }

  // Helper: Verificar si el evento está finalizado
  // Regla: Solo se basa en la fecha de fin del evento ACTUAL (no historial)
  // Si fecha_fin_evento > fecha_actual → permitir editar
  // Si fecha_fin_evento < fecha_actual → bloquear edición
  const isEventFinished = (): boolean => {
    // Si no hay fecha de fin configurada, considerar como no finalizado
    if (!endDate || !endTime) {
      return false
    }
    
    const now = new Date()
    const eventEndDateTime = new Date(`${endDate}T${endTime}`)
    
    // Solo validar basándose en la fecha actual del formulario
    return eventEndDateTime < now
  }

  const validateStep1 = (): boolean => {
    if (!name.trim()) {
      setError('El nombre del evento es obligatorio')
      return false
    }
    if (!startDate || !startTime) {
      setError('La fecha y hora de inicio son obligatorias')
      return false
    }
    if (!endDate || !endTime) {
      setError('La fecha y hora de fin son obligatorias')
      return false
    }
    const startDateTime = new Date(`${startDate}T${startTime}`)
    const endDateTime = new Date(`${endDate}T${endTime}`)
    if (endDateTime <= startDateTime) {
      setError('La fecha de fin debe ser posterior a la fecha de inicio')
      return false
    }
    
    return true
  }

  const validateStep2 = (): boolean => {
    if (!venueName.trim()) {
      setError('El nombre del lugar es obligatorio')
      return false
    }
    return true
  }

  const validateStep3 = (): boolean => {
    const now = new Date()
    const eventFinished = isEventFinished()
    
    // Validación principal: Si la fecha de fin del evento ya pasó, no permitir habilitar venta
    if (eventFinished) {
      setError('No se puede habilitar la venta de entradas para un evento que ya finalizó')
      return false
    }
    
    // Validar datos básicos de tickets
    for (const ticket of tickets) {
      if (!ticket.name.trim()) {
        setError('Todos los tickets deben tener un nombre')
        return false
      }
      if (!ticket.price || parseFloat(ticket.price) <= 0) {
        setError('Todos los tickets deben tener un precio válido mayor a 0')
        return false
      }
      if (!ticket.quantity_available || parseInt(ticket.quantity_available) <= 0) {
        setError('Todos los tickets deben tener una cantidad disponible mayor a 0')
        return false
      }
      if (!ticket.sale_start_date || !ticket.sale_start_time) {
        setError('Todos los tickets deben tener fecha y hora de inicio de venta')
        return false
      }
      if (!ticket.sale_end_date || !ticket.sale_end_time) {
        setError('Todos los tickets deben tener fecha y hora de fin de venta')
        return false
      }
      
      // Validación 3: La fecha de apertura de venta no puede ser posterior a la fecha del evento
      const saleStartDateTime = new Date(`${ticket.sale_start_date}T${ticket.sale_start_time}`)
      const saleEndDateTime = new Date(`${ticket.sale_end_date}T${ticket.sale_end_time}`)
      
      if (endDate && endTime) {
        const eventEndDateTime = new Date(`${endDate}T${endTime}`)
        
        if (saleStartDateTime > eventEndDateTime) {
          setError(`La fecha de apertura de venta del ticket "${ticket.name}" no puede ser posterior a la fecha de fin del evento`)
          return false
        }
        
        // Validación 4: La fecha de cierre de venta no puede ser posterior a la fecha del evento
        if (saleEndDateTime > eventEndDateTime) {
          setError(`La fecha de cierre de venta del ticket "${ticket.name}" no puede ser posterior a la fecha de fin del evento`)
          return false
        }
      }
      
      // Validación 5: No se puede abrir una ventana de venta si la fecha de cierre ya pasó
      if (saleEndDateTime < now) {
        setError(`No se puede abrir una ventana de venta para el ticket "${ticket.name}" si la fecha de cierre ya pasó`)
        return false
      }
      
      // Validación 6: La fecha de fin de venta debe ser posterior a la fecha de inicio de venta
      if (saleEndDateTime <= saleStartDateTime) {
        setError(`La fecha de fin de venta del ticket "${ticket.name}" debe ser posterior a la fecha de inicio de venta`)
        return false
      }
    }
    return true
  }

  const handleNext = () => {
    setError(null)
    if (currentStep === 1 && !validateStep1()) return
    if (currentStep === 2 && !validateStep2()) return
    if (currentStep === 3 && !validateStep3()) return
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    setError(null)
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const addTicket = () => {
    setTickets([
      ...tickets,
      {
        name: '',
        description: '',
        price: '',
        quantity_available: '',
        sale_start_date: '',
        sale_start_time: '',
        sale_end_date: '',
        sale_end_time: '',
      },
    ])
  }

  const removeTicket = (index: number) => {
    if (tickets.length > 1) {
      setTickets(tickets.filter((_, i) => i !== index))
    }
  }

  const updateTicket = (index: number, field: keyof TicketType, value: string) => {
    const updated = [...tickets]
    updated[index] = { ...updated[index], [field]: value }
    setTickets(updated)
  }

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)

    try {
      // Validar todos los pasos
      if (!validateStep1() || !validateStep2() || !validateStep3()) {
        setLoading(false)
        return
      }
      
      // Validaciones adicionales antes de guardar (reglas de negocio críticas)
      const now = new Date()
      const eventFinished = isEventFinished()
      
      // Validación crítica: Si la fecha de fin del evento ya pasó, bloquear cualquier cambio en fechas de venta
      if (eventFinished) {
        setError('No se pueden modificar las fechas de venta de entradas para un evento que ya finalizó')
        setLoading(false)
        return
      }
      
      // Verificar que las fechas de venta no sean posteriores a la fecha de fin del evento
      const eventEndDateTime = new Date(`${endDate}T${endTime}`)
      
      for (const ticket of tickets) {
        const saleStartDateTime = new Date(`${ticket.sale_start_date}T${ticket.sale_start_time}`)
        const saleEndDateTime = new Date(`${ticket.sale_end_date}T${ticket.sale_end_time}`)
        
        // Si la fecha de fin del evento ya pasó, no permitir ninguna venta
        if (eventEndDateTime < now) {
          setError('No se puede habilitar la venta de entradas porque la fecha de fin del evento ya pasó')
          setLoading(false)
          return
        }
        
        // Verificar que las fechas de venta no sean posteriores a la fecha del evento
        if (saleStartDateTime > eventEndDateTime) {
          setError(`La fecha de apertura de venta del ticket "${ticket.name}" no puede ser posterior a la fecha de fin del evento`)
          setLoading(false)
          return
        }
        
        if (saleEndDateTime > eventEndDateTime) {
          setError(`La fecha de cierre de venta del ticket "${ticket.name}" no puede ser posterior a la fecha de fin del evento`)
          setLoading(false)
          return
        }
        
        // Verificar que no se esté abriendo una ventana de venta con fecha de cierre pasada
        if (saleEndDateTime < now) {
          setError(`No se puede abrir una ventana de venta para el ticket "${ticket.name}" si la fecha de cierre ya pasó`)
          setLoading(false)
          return
        }
      }

      // Subir imagen solo si hay una seleccionada (y no está ya subida)
      let finalFlyerUrl = flyerUrl
      
      // Usar el archivo guardado en el estado del padre si existe
      if (selectedImageFile) {
        console.log('📤 Subiendo nueva imagen desde estado del padre...', selectedImageFile.name)
        
        // Si hay una imagen vieja, eliminarla primero para mantener el storage limpio
        if (flyerUrl) {
          try {
            // Extraer el path del archivo de la URL de Supabase Storage
            // Formato: https://[project].supabase.co/storage/v1/object/public/event-flyers/event-flyers/[filename]
            // Cuando subimos usamos: filePath = "event-flyers/${fileName}"
            // Entonces la URL tiene: .../public/event-flyers/event-flyers/[filename]
            // Para eliminar necesitamos: "event-flyers/[filename]" (sin el bucket duplicado)
            
            const urlObj = new URL(flyerUrl)
            const pathname = urlObj.pathname
            
            // Buscar la parte después de "/public/"
            const publicIndex = pathname.indexOf('/public/')
            if (publicIndex !== -1) {
              // Extraer todo después de "/public/"
              // Ejemplo: "/public/event-flyers/event-flyers/filename.jpg" -> "event-flyers/event-flyers/filename.jpg"
              const pathAfterPublic = pathname.substring(publicIndex + '/public/'.length)
              
              // Si empieza con "event-flyers/event-flyers/", quitar el primer "event-flyers/"
              // porque cuando subimos usamos "event-flyers/filename", el bucket ya está en .from('event-flyers')
              let oldFilePath = pathAfterPublic
              if (pathAfterPublic.startsWith('event-flyers/event-flyers/')) {
                oldFilePath = pathAfterPublic.substring('event-flyers/'.length)
              }
              
              console.log('🗑️ Eliminando imagen vieja')
              console.log('🗑️ URL original:', flyerUrl)
              console.log('🗑️ Path después de /public/:', pathAfterPublic)
              console.log('🗑️ Ruta para eliminar:', oldFilePath)
              
              const { error: deleteError } = await supabase.storage
                .from('event-flyers')
                .remove([oldFilePath])
              
              if (deleteError) {
                // No es crítico si no se puede eliminar (puede que ya no exista o no tenga permisos)
                console.warn('⚠️ No se pudo eliminar la imagen vieja:', deleteError.message)
                console.warn('⚠️ Código de error:', (deleteError as any).statusCode || deleteError.message)
                console.warn('⚠️ Ruta intentada:', oldFilePath)
              } else {
                console.log('✅ Imagen vieja eliminada correctamente:', oldFilePath)
              }
            } else {
              console.warn('⚠️ No se pudo extraer el path de la URL:', flyerUrl)
            }
          } catch (err) {
            // No es crítico, continuar con la subida
            console.warn('⚠️ Error al intentar eliminar imagen vieja:', err)
          }
        }
        
        try {
          // Generar nombre único para el archivo
          const fileExt = selectedImageFile.name.split('.').pop()
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
          const filePath = `event-flyers/${fileName}`

          // Subir a Supabase Storage
          const { data, error: uploadError } = await supabase.storage
            .from('event-flyers')
            .upload(filePath, selectedImageFile, {
              cacheControl: '3600',
              upsert: false,
            })

          if (uploadError) {
            console.error('Error subiendo imagen:', uploadError)
            setError(uploadError.message || 'Error al subir la imagen')
            setLoading(false)
            return
          }

          // Obtener URL pública
          const {
            data: { publicUrl },
          } = supabase.storage.from('event-flyers').getPublicUrl(filePath)

          console.log('✅ Imagen subida correctamente:', publicUrl)
          finalFlyerUrl = publicUrl
        } catch (err) {
          console.error('Error inesperado subiendo imagen:', err)
          setError('Error inesperado al subir la imagen')
          setLoading(false)
          return
        }
      } else {
        console.log('ℹ️ No hay nueva imagen, manteniendo URL existente:', finalFlyerUrl)
      }

      // Combinar fechas y horas (reutilizar eventEndDateTime de las validaciones anteriores)
      const startDateTime = new Date(`${startDate}T${startTime}`).toISOString()
      const endDateTime = eventEndDateTime.toISOString()

      if (isEditMode && eventId) {
        // MODO EDICIÓN: Actualizar evento existente
        const updateData: any = {
          name: name.trim(),
          description: description.trim() || null,
          category: category.trim() || null,
          start_date: startDateTime,
          end_date: endDateTime,
          venue_name: venueName.trim(),
          venue_address: venueAddress.trim() || null,
          venue_city: venueCity.trim() || null,
          flyer_url: finalFlyerUrl || null,
          status,
        }

        // Solo actualizar published_at si cambió a published y no tenía fecha
        if (status === 'published') {
          const { data: currentEvent } = await supabase
            .from('events')
            .select('published_at')
            .eq('id', eventId)
            .single()
          
          if (!currentEvent?.published_at) {
            updateData.published_at = new Date().toISOString()
          }
        }

        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .update(updateData)
          .eq('id', eventId)
          .eq('producer_id', producer.id)
          .select()
          .single()

        if (eventError) {
          console.error('Error actualizando evento:', eventError)
          setError(eventError.message || 'Error al actualizar el evento')
          setLoading(false)
          return
        }

        // Gestionar tickets: actualizar existentes, crear nuevos, eliminar removidos
        // 1. Obtener tickets actuales
        const { data: existingTickets } = await supabase
          .from('ticket_types')
          .select('id')
          .eq('event_id', eventId)

        const existingTicketIds = new Set(existingTickets?.map(t => t.id) || [])
        const currentTicketIds = new Set(tickets.filter(t => t.id).map(t => t.id!))
        
        // 2. Eliminar tickets que ya no están
        const ticketsToDelete = Array.from(existingTicketIds).filter(id => !currentTicketIds.has(id))
        if (ticketsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('ticket_types')
            .delete()
            .in('id', ticketsToDelete)
          
          if (deleteError) {
            console.error('Error eliminando tickets:', deleteError)
          }
        }

        // 3. Actualizar o crear tickets
        for (const ticket of tickets) {
          const ticketData = {
            name: ticket.name.trim(),
            description: ticket.description.trim() || null,
            price: parseFloat(ticket.price),
            quantity_available: parseInt(ticket.quantity_available),
            sale_start_date: new Date(`${ticket.sale_start_date}T${ticket.sale_start_time}`).toISOString(),
            sale_end_date: new Date(`${ticket.sale_end_date}T${ticket.sale_end_time}`).toISOString(),
          }

          if (ticket.id) {
            // Actualizar ticket existente
            const { error: updateError } = await supabase
              .from('ticket_types')
              .update(ticketData)
              .eq('id', ticket.id)
            
            if (updateError) {
              console.error('Error actualizando ticket:', updateError)
              setError('Error al actualizar los tickets')
              setLoading(false)
              return
            }
          } else {
            // Crear nuevo ticket
            const { error: insertError } = await supabase
              .from('ticket_types')
              .insert({
                ...ticketData,
                event_id: eventId,
              })
            
            if (insertError) {
              console.error('Error creando ticket:', insertError)
              setError('Error al crear los tickets')
              setLoading(false)
              return
            }
          }
        }
      } else {
        // MODO CREACIÓN: Crear nuevo evento
        // Generar slug único
        const baseSlug = generateSlug(name)
        const checkSlugUnique = async (slug: string): Promise<boolean> => {
          const { data, error } = await supabase
            .from('events')
            .select('id')
            .eq('slug', slug)
            .single()
          if (error && error.code !== 'PGRST116') throw error
          return !data
        }
        const uniqueSlug = await generateUniqueSlug(baseSlug, checkSlugUnique)

        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .insert({
            producer_id: producer.id,
            name: name.trim(),
            slug: uniqueSlug,
            description: description.trim() || null,
            category: category.trim() || null,
            start_date: startDateTime,
            end_date: endDateTime,
            venue_name: venueName.trim(),
            venue_address: venueAddress.trim() || null,
            venue_city: venueCity.trim() || null,
            flyer_url: finalFlyerUrl || null,
            status,
            published_at: status === 'published' ? new Date().toISOString() : null,
          })
          .select()
          .single()

        if (eventError) {
          console.error('Error creando evento:', eventError)
          setError(eventError.message || 'Error al crear el evento')
          setLoading(false)
          return
        }

        // Crear tipos de tickets
        const ticketTypesData = tickets.map((ticket) => ({
          event_id: eventData.id,
          name: ticket.name.trim(),
          description: ticket.description.trim() || null,
          price: parseFloat(ticket.price),
          quantity_available: parseInt(ticket.quantity_available),
          sale_start_date: new Date(`${ticket.sale_start_date}T${ticket.sale_start_time}`).toISOString(),
          sale_end_date: new Date(`${ticket.sale_end_date}T${ticket.sale_end_time}`).toISOString(),
        }))

        const { error: ticketsError } = await supabase.from('ticket_types').insert(ticketTypesData)

        if (ticketsError) {
          console.error('Error creando tickets:', ticketsError)
          setError(ticketsError.message || 'Error al crear los tickets')
          setLoading(false)
          return
        }
      }

      // Redirigir a la lista de eventos
      router.push('/dashboard/eventos')
      router.refresh()
    } catch (err) {
      console.error('Error inesperado:', err)
      setError(`Error inesperado al ${isEditMode ? 'actualizar' : 'crear'} el evento`)
      setLoading(false)
    }
  }

  const steps = [
    { number: 1, title: 'Información Básica', icon: Calendar },
    { number: 2, title: 'Ubicación', icon: MapPin },
    { number: 3, title: 'Tickets', icon: Ticket },
    { number: 4, title: 'Publicar', icon: Eye },
  ]

  return (
    <div className="min-h-screen bg-black-deep text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/eventos"
            className="inline-flex items-center gap-2 text-lightGray hover:text-[#A855F7] mb-4 transition-colors duration-300 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
            <span className="font-semibold uppercase tracking-wide">Volver a Eventos</span>
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-wide mb-2">
            {isEditMode ? 'Editar Evento' : 'Nuevo Evento'}
          </h1>
          <p className="text-lightGray">
            {isEditMode ? 'Modifica la información del evento' : 'Completa la información paso a paso'}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.number
              const isCompleted = currentStep > step.number
              const isLast = index === steps.length - 1

              return (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`
                      w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300
                      ${
                        isCompleted
                          ? 'bg-[#A855F7] border-[#A855F7]'
                          : isActive
                            ? 'bg-[#A855F7]/20 border-[#A855F7]'
                            : 'bg-white/5 border-white/20'
                      }
                    `}
                    >
                      {isCompleted ? (
                        <Check className="w-6 h-6 text-white" />
                      ) : (
                        <Icon
                          className={`w-6 h-6 ${
                            isActive ? 'text-[#A855F7]' : 'text-lightGray'
                          }`}
                        />
                      )}
                    </div>
                    <span
                      className={`mt-2 text-xs font-semibold uppercase tracking-wide ${
                        isActive ? 'text-[#A855F7]' : 'text-lightGray'
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  {!isLast && (
                    <div
                      className={`h-0.5 flex-1 mx-2 transition-all duration-300 ${
                        isCompleted ? 'bg-[#A855F7]' : 'bg-white/10'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-mediumGray rounded-2xl p-8 border border-[#2F2F2F]">
          {/* Paso 1: Información Básica */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold uppercase tracking-wide mb-6">
                Información Básica
              </h2>

              <div>
                <label className="block text-sm font-semibold mb-2 uppercase tracking-wide text-lightGray">
                  Nombre del Evento *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-lightGray focus:outline-none focus:border-[#A855F7]/50 focus:ring-2 focus:ring-[#A855F7]/20 transition-all duration-300"
                  placeholder="Ej: Festival de Música Electrónica"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 uppercase tracking-wide text-lightGray">
                  Descripción
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-lightGray focus:outline-none focus:border-[#A855F7]/50 focus:ring-2 focus:ring-[#A855F7]/20 transition-all duration-300 resize-none"
                  placeholder="Describe tu evento..."
                />
                <p className="mt-2 text-xs text-lightGray">
                  {description.length} / 2000 caracteres
                </p>
              </div>

              <div>
                <CategorySelector
                  value={category}
                  onChange={setCategory}
                  label="Categoría / Género"
                />
              </div>

              <div>
                <h3 className="text-lg font-bold uppercase tracking-wide mb-4">
                  Fecha y Hora
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DateTimePicker
                    value={{ date: startDate, time: startTime }}
                    onChange={(date, time) => {
                      setStartDate(date)
                      setStartTime(time)
                    }}
                    label="Fecha y Hora de Inicio"
                    required
                  />
                  <DateTimePicker
                    value={{ date: endDate, time: endTime }}
                    onChange={(date, time) => {
                      setEndDate(date)
                      setEndTime(time)
                    }}
                    label="Fecha y Hora de Fin"
                    required
                    minDate={startDate ? new Date(`${startDate}T${startTime}`) : undefined}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold uppercase tracking-wide mb-4">
                  Imagen Principal del Evento
                </h3>
                <p className="text-sm text-lightGray mb-4">
                  Esta imagen se mostrará en la página de inicio y en la página del evento.
                </p>
                <ImageUpload
                  ref={imageUploadRef}
                  onFileSelect={(file) => {
                    // Guardar archivo en el estado del padre para que esté disponible al guardar
                    setSelectedImageFile(file)
                    console.log('💾 Archivo guardado en estado del padre:', file ? file.name : 'null')
                  }}
                  onRemove={() => {
                    setFlyerUrl('')
                    setSelectedImageFile(null) // Limpiar también el archivo del estado
                  }}
                  currentImageUrl={flyerUrl}
                  folder="event-flyers"
                  maxSizeMB={1}
                  uploadImmediately={false}
                />
              </div>
            </div>
          )}

          {/* Paso 2: Ubicación */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold uppercase tracking-wide mb-6">
                Ubicación del Evento
              </h2>
              <p className="text-lightGray mb-6">
                Define dónde se realizará tu evento para que los asistentes puedan encontrarlo fácilmente.
              </p>

              <div>
                <label className="block text-sm font-semibold mb-2 uppercase tracking-wide text-lightGray">
                  Nombre del Lugar *
                </label>
                <input
                  type="text"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-lightGray focus:outline-none focus:border-[#A855F7]/50 focus:ring-2 focus:ring-[#A855F7]/20 transition-all duration-300"
                  placeholder="Ej: Estadio Central"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 uppercase tracking-wide text-lightGray">
                  Dirección
                </label>
                <input
                  type="text"
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-lightGray focus:outline-none focus:border-[#A855F7]/50 focus:ring-2 focus:ring-[#A855F7]/20 transition-all duration-300"
                  placeholder="Ej: Av. Corrientes 1234"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 uppercase tracking-wide text-lightGray">
                  Ciudad
                </label>
                <input
                  type="text"
                  value={venueCity}
                  onChange={(e) => setVenueCity(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-lightGray focus:outline-none focus:border-[#A855F7]/50 focus:ring-2 focus:ring-[#A855F7]/20 transition-all duration-300"
                  placeholder="Ej: Buenos Aires"
                />
              </div>
            </div>
          )}

          {/* Paso 3: Tickets */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold uppercase tracking-wide">
                  Tickets
                </h2>
                <button
                  type="button"
                  onClick={addTicket}
                  className="px-4 py-2 bg-[#A855F7] hover:bg-[#9333EA] text-white rounded-full font-semibold uppercase tracking-wide text-sm transition-all duration-300"
                >
                  + Agregar Ticket
                </button>
              </div>

              {tickets.map((ticket, index) => (
                <div
                  key={index}
                  className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold uppercase tracking-wide">
                      Ticket {index + 1}
                    </h3>
                    {tickets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTicket(index)}
                        className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-semibold transition-all duration-300"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 uppercase tracking-wide text-lightGray">
                      Nombre del Ticket *
                    </label>
                    <input
                      type="text"
                      value={ticket.name}
                      onChange={(e) => updateTicket(index, 'name', e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-lightGray focus:outline-none focus:border-[#A855F7]/50 focus:ring-2 focus:ring-[#A855F7]/20 transition-all duration-300"
                      placeholder="Ej: Entrada General, VIP, Preventa"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2 uppercase tracking-wide text-lightGray">
                      Descripción
                    </label>
                    <textarea
                      value={ticket.description}
                      onChange={(e) => updateTicket(index, 'description', e.target.value)}
                      rows={2}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-lightGray focus:outline-none focus:border-[#A855F7]/50 focus:ring-2 focus:ring-[#A855F7]/20 transition-all duration-300 resize-none"
                      placeholder="Ej: Acceso al sector general, incluye consumición"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2 uppercase tracking-wide text-lightGray">
                        Precio (ARS) *
                      </label>
                      <div className="relative price-input-container">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={ticket.price}
                          onChange={(e) => updateTicket(index, 'price', e.target.value)}
                          onFocus={() => {
                            setOpenQuantitySuggestions(null)
                            setOpenPriceSuggestions(index)
                          }}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-lightGray focus:outline-none focus:border-[#A855F7]/50 focus:ring-2 focus:ring-[#A855F7]/20 transition-all duration-300"
                          placeholder="1500.00"
                          required
                        />
                        {openPriceSuggestions === index && (
                          <div className="suggestions-dropdown absolute z-10 top-full left-0 right-0 mt-2 p-3 bg-[#1F1F1F] border-2 border-[#2F2F2F] rounded-lg shadow-xl">
                            <div className="flex flex-wrap gap-2">
                              {[10000, 15000, 20000, 25000].map((price) => (
                                <button
                                  key={price}
                                  type="button"
                                  onClick={() => {
                                    updateTicket(index, 'price', price.toString())
                                    setOpenPriceSuggestions(null)
                                  }}
                                  className={`
                                    px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300
                                    ${
                                      ticket.price === price.toString()
                                        ? 'bg-[#A855F7] text-white'
                                        : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                                    }
                                  `}
                                >
                                  ${price.toLocaleString('es-AR')}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2 uppercase tracking-wide text-lightGray">
                        Cantidad Disponible *
                      </label>
                      <div className="relative quantity-input-container">
                        <input
                          type="number"
                          min="1"
                          value={ticket.quantity_available}
                          onChange={(e) => updateTicket(index, 'quantity_available', e.target.value)}
                          onFocus={() => {
                            setOpenPriceSuggestions(null)
                            setOpenQuantitySuggestions(index)
                          }}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-lightGray focus:outline-none focus:border-[#A855F7]/50 focus:ring-2 focus:ring-[#A855F7]/20 transition-all duration-300"
                          placeholder="100"
                          required
                        />
                        {openQuantitySuggestions === index && (
                          <div className="suggestions-dropdown absolute z-10 top-full left-0 right-0 mt-2 p-3 bg-[#1F1F1F] border-2 border-[#2F2F2F] rounded-lg shadow-xl">
                            <div className="flex flex-wrap gap-2">
                              {[50, 100, 250, 500].map((quantity) => (
                                <button
                                  key={quantity}
                                  type="button"
                                  onClick={() => {
                                    updateTicket(index, 'quantity_available', quantity.toString())
                                    setOpenQuantitySuggestions(null)
                                  }}
                                  className={`
                                    px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300
                                    ${
                                      ticket.quantity_available === quantity.toString()
                                        ? 'bg-[#A855F7] text-white'
                                        : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                                    }
                                  `}
                                >
                                  {quantity.toLocaleString('es-AR')}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wide mb-4 text-lightGray">
                      Fechas de Venta
                    </h4>
                    {isEventFinished() && (
                      <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
                        <p className="text-yellow-400 text-sm">
                          ⚠️ Este evento ya finalizó. No se pueden modificar las fechas de venta de entradas.
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <DateTimePicker
                        value={{ date: ticket.sale_start_date, time: ticket.sale_start_time }}
                        onChange={(date, time) => {
                          const updated = [...tickets]
                          updated[index] = {
                            ...updated[index],
                            sale_start_date: date,
                            sale_start_time: time,
                          }
                          setTickets(updated)
                        }}
                        label="Inicio de Venta"
                        required
                        minDate={new Date()}
                        disabled={isEventFinished()}
                      />
                      <DateTimePicker
                        value={{ date: ticket.sale_end_date, time: ticket.sale_end_time }}
                        onChange={(date, time) => {
                          const updated = [...tickets]
                          updated[index] = {
                            ...updated[index],
                            sale_end_date: date,
                            sale_end_time: time,
                          }
                          setTickets(updated)
                        }}
                        label="Fin de Venta"
                        required
                        minDate={
                          ticket.sale_start_date && ticket.sale_start_time
                            ? new Date(`${ticket.sale_start_date}T${ticket.sale_start_time}`)
                            : new Date()
                        }
                        disabled={isEventFinished()}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Paso 4: Publicar */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold uppercase tracking-wide mb-6">
                Publicar Evento
              </h2>
              <p className="text-lightGray mb-6">
                Define la visibilidad de tu evento antes de publicarlo.
              </p>

              <div>
                <h3 className="text-lg font-bold uppercase tracking-wide mb-4">
                  Tipo de Visibilidad
                </h3>
                <div className="space-y-4">
                  <label className="flex items-start gap-4 p-4 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:border-[#A855F7]/50 transition-all duration-300">
                    <input
                      type="radio"
                      name="status"
                      value="published"
                      checked={status === 'published'}
                      onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
                      className="mt-1 w-5 h-5 text-[#A855F7] focus:ring-[#A855F7] focus:ring-2 focus:ring-offset-2 focus:ring-offset-mediumGray cursor-pointer"
                    />
                    <div>
                      <div className="font-bold uppercase tracking-wide mb-1">Público</div>
                      <div className="text-sm text-lightGray">
                        Tu evento aparecerá en la página principal y será visible para todos los usuarios. Cualquiera podrá ver la información y comprar entradas.
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start gap-4 p-4 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:border-[#A855F7]/50 transition-all duration-300">
                    <input
                      type="radio"
                      name="status"
                      value="draft"
                      checked={status === 'draft'}
                      onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
                      className="mt-1 w-5 h-5 text-[#A855F7] focus:ring-[#A855F7] focus:ring-2 focus:ring-offset-2 focus:ring-offset-mediumGray cursor-pointer"
                    />
                    <div>
                      <div className="font-bold uppercase tracking-wide mb-1">Borrador</div>
                      <div className="text-sm text-lightGray">
                        Guarda el evento como borrador. No será visible públicamente hasta que lo publiques.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    className="mt-1 w-5 h-5 text-[#A855F7] focus:ring-[#A855F7] focus:ring-2 focus:ring-offset-2 focus:ring-offset-mediumGray cursor-pointer"
                  />
                  <span className="text-sm text-lightGray">
                    He leído y acepto los términos y condiciones para publicar eventos en Synapse.
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-4 mt-8">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1 || loading}
            className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all duration-300 font-semibold text-white hover:border-[#A855F7]/50 hover:text-[#A855F7] uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Anterior</span>
          </button>

          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-[#9333EA] via-[#A855F7] to-[#9333EA] text-white font-bold rounded-full transition-all duration-300 shadow-lg hover:shadow-[0_0_32px_rgba(168,85,247,0.6)] hover:scale-[1.02] active:scale-[0.98] uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed text-base flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 50%, #9333EA 100%)',
                boxShadow: '0 4px 24px rgba(168, 85, 247, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              }}
            >
              <span>Siguiente</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-[#9333EA] via-[#A855F7] to-[#9333EA] text-white font-bold rounded-full transition-all duration-300 shadow-lg hover:shadow-[0_0_32px_rgba(168,85,247,0.6)] hover:scale-[1.02] active:scale-[0.98] uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed text-base flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 50%, #9333EA 100%)',
                boxShadow: '0 4px 24px rgba(168, 85, 247, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              }}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{isEditMode ? 'Guardando cambios...' : 'Guardando...'}</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>
                    {isEditMode
                      ? status === 'published'
                        ? 'Guardar Cambios'
                        : 'Guardar Cambios'
                      : status === 'published'
                        ? 'Publicar Evento'
                        : 'Guardar Borrador'}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
