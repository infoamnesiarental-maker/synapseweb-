'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { useCheckout, CheckoutTicket } from '@/lib/hooks/useCheckout'
import { calculateTotalPrice, formatPriceBreakdown } from '@/lib/utils/pricing'
import { formatPrice } from '@/lib/utils/format'
import { X, Trash2, Plus, ChevronRight, ChevronLeft, Tag, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface CheckoutWizardProps {
  tickets: CheckoutTicket[]
  eventId: string
  eventName: string
  onClose: () => void
}

interface BuyerData {
  firstName: string
  lastName: string
  documentType: string
  documentNumber: string
  email: string
  confirmEmail: string
  phone: string
  country: string
  province: string
}

interface TicketData {
  ticketId: string
  fullName: string
  documentNumber: string
}

const STEPS = [
  { id: 1, label: 'Revisá tu orden' },
  { id: 2, label: 'Comprador' },
  { id: 3, label: 'Tickets' },
  { id: 4, label: 'Confirmación' },
]

export default function CheckoutWizard({ tickets: initialTickets, eventId, eventName, onClose }: CheckoutWizardProps) {
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const { createPurchase, loading, error } = useCheckout()

  const [currentStep, setCurrentStep] = useState(1)
  const [tickets, setTickets] = useState<CheckoutTicket[]>(initialTickets)
  const [buyerData, setBuyerData] = useState<BuyerData>({
    firstName: '',
    lastName: '',
    documentType: 'DNI',
    documentNumber: '',
    email: user?.email || '',
    confirmEmail: user?.email || '',
    phone: '',
    country: 'Argentina',
    province: '',
  })
  const [ticketsData, setTicketsData] = useState<TicketData[]>([])
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Inicializar datos de tickets
  useEffect(() => {
    const initialTicketsData: TicketData[] = []
    tickets.forEach((ticket) => {
      for (let i = 0; i < ticket.quantity; i++) {
        initialTicketsData.push({
          ticketId: `${ticket.ticketTypeId}-${i}`,
          fullName: '',
          documentNumber: '',
        })
      }
    })
    setTicketsData(initialTicketsData)
  }, [tickets])

  // Actualizar email cuando el usuario esté autenticado
  useEffect(() => {
    if (user?.email) {
      setBuyerData((prev) => ({
        ...prev,
        email: user.email || '',
        confirmEmail: user.email || '',
      }))
    }
  }, [user?.email])

  const breakdown = calculateTotalPrice(tickets)
  const formattedBreakdown = formatPriceBreakdown(breakdown)

  const updateTicketQuantity = (ticketIndex: number, newQuantity: number) => {
    if (newQuantity < 1) return

    const updatedTickets = [...tickets]
    const oldQuantity = updatedTickets[ticketIndex].quantity
    updatedTickets[ticketIndex].quantity = newQuantity

    const ticket = updatedTickets[ticketIndex]
    
    setTicketsData((prev) => {
      const ticketsForThisType = prev.filter((td) => td.ticketId.startsWith(ticket.ticketTypeId))
      const ticketsForOtherTypes = prev.filter((td) => !td.ticketId.startsWith(ticket.ticketTypeId))
      
      if (newQuantity > oldQuantity) {
        const newTickets: TicketData[] = []
        for (let i = oldQuantity; i < newQuantity; i++) {
          newTickets.push({
            ticketId: `${ticket.ticketTypeId}-${i}`,
            fullName: '',
            documentNumber: '',
          })
        }
        return [...ticketsForOtherTypes, ...ticketsForThisType, ...newTickets]
      } else {
        const keptTickets = ticketsForThisType.slice(0, newQuantity)
        return [...ticketsForOtherTypes, ...keptTickets]
      }
    })

    setTickets(updatedTickets)
  }

  const validateStep1 = () => {
    if (tickets.length === 0) {
      setErrors({ step1: 'Debes seleccionar al menos un ticket' })
      return false
    }
    setErrors({})
    return true
  }

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {}

    if (!buyerData.firstName.trim()) newErrors.firstName = 'Requerido'
    if (!buyerData.lastName.trim()) newErrors.lastName = 'Requerido'
    if (!buyerData.documentNumber.trim()) newErrors.documentNumber = 'Requerido'
    if (!buyerData.email.trim()) newErrors.email = 'Requerido'
    if (!buyerData.confirmEmail.trim()) newErrors.confirmEmail = 'Requerido'
    if (buyerData.email !== buyerData.confirmEmail) newErrors.confirmEmail = 'Los emails no coinciden'
    if (!buyerData.phone.trim()) newErrors.phone = 'Requerido'
    if (!buyerData.province) newErrors.province = 'Requerido'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep3 = () => {
    const newErrors: Record<string, string> = {}

    ticketsData.forEach((ticketData, index) => {
      if (!ticketData.fullName.trim()) {
        newErrors[`ticket-${index}-name`] = 'Requerido'
      }
      if (!ticketData.documentNumber.trim()) {
        newErrors[`ticket-${index}-doc`] = 'Requerido'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    let isValid = false

    switch (currentStep) {
      case 1:
        isValid = validateStep1()
        break
      case 2:
        isValid = validateStep2()
        break
      case 3:
        isValid = validateStep3()
        break
      case 4:
        handleConfirmPurchase()
        return
    }

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, 4))
    }
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
    setErrors({})
  }

  const handleConfirmPurchase = async () => {
    if (!acceptedTerms) {
      setErrors({ terms: 'Debes aceptar los términos y condiciones' })
      return
    }

    const result = await createPurchase({
      tickets,
      eventId,
      userId: user?.id,
      guestEmail: buyerData.email,
      guestName: `${buyerData.firstName} ${buyerData.lastName}`,
      guestPhone: buyerData.phone,
    })

    if (result.success) {
      router.push(`/checkout/success?purchaseId=${result.purchaseId}`)
    }
  }

  const provinces = [
    'Buenos Aires',
    'Catamarca',
    'Chaco',
    'Chubut',
    'Córdoba',
    'Corrientes',
    'Entre Ríos',
    'Formosa',
    'Jujuy',
    'La Pampa',
    'La Rioja',
    'Mendoza',
    'Misiones',
    'Neuquén',
    'Río Negro',
    'Salta',
    'San Juan',
    'San Luis',
    'Santa Cruz',
    'Santa Fe',
    'Santiago del Estero',
    'Tierra del Fuego',
    'Tucumán',
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="bg-[#1F1F1F] rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_8px_48px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con botón cerrar */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#0F0F0F]/50">
          <h2 className="text-2xl font-black uppercase tracking-wider text-white">
            Checkout
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all duration-300 hover:scale-105"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de progreso mejorada */}
        <div className="px-6 pt-6 pb-4 bg-[#0F0F0F]/30">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1 relative z-10">
                  <motion.div
                    initial={false}
                    animate={{
                      scale: currentStep === step.id ? 1.1 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                      currentStep >= step.id
                        ? 'bg-purple-vibrant text-white shadow-[0_0_24px_rgba(168,85,247,0.3)]'
                        : 'bg-white/5 text-white/40 border border-white/10'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      step.id
                    )}
                  </motion.div>
                  <span
                    className={`text-xs mt-2 text-center font-semibold transition-colors duration-300 ${
                      currentStep >= step.id
                        ? 'text-white'
                        : 'text-white/40'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className="relative flex-1 mx-2 h-px">
                    <div className="absolute inset-0 bg-white/10" />
                    <motion.div
                      initial={false}
                      animate={{
                        width: currentStep > step.id ? '100%' : '0%',
                      }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0 bg-purple-vibrant h-full"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contenido del paso actual */}
        <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Lista de tickets mejorada */}
                {tickets.map((ticket, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white/5 rounded-xl p-5 border border-white/10 hover:border-purple-vibrant/30 transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-white font-bold text-lg mb-1 uppercase tracking-wide">
                          {ticket.ticketTypeName}
                        </h3>
                        <p className="text-white/60 text-sm">
                          ${formatPrice(ticket.basePrice)} ARS - Ticket
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateTicketQuantity(index, ticket.quantity - 1)}
                          className="w-9 h-9 rounded-lg bg-white/10 hover:bg-red/20 border border-white/10 hover:border-red/50 flex items-center justify-center text-white hover:text-red transition-all duration-300 hover:scale-105"
                          aria-label="Disminuir cantidad"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <span className="text-white font-bold text-xl w-10 text-center">
                          {ticket.quantity}
                        </span>
                        <button
                          onClick={() => updateTicketQuantity(index, ticket.quantity + 1)}
                          className="w-9 h-9 rounded-lg bg-white/10 hover:bg-green/20 border border-white/10 hover:border-green/50 flex items-center justify-center text-white hover:text-green transition-all duration-300 hover:scale-105"
                          aria-label="Aumentar cantidad"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Código de descuento mejorado */}
                <motion.button
                  type="button"
                  onClick={() => {
                    // TODO: Implementar modal de código de descuento
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-vibrant/30 rounded-xl text-white/60 hover:text-white transition-all duration-300 group"
                >
                  <Tag className="w-4 h-4 group-hover:text-purple-vibrant transition-colors" />
                  <span className="text-sm font-medium">¿Tenés un código de descuento?</span>
                </motion.button>

                {/* Resumen de precios mejorado */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <div className="flex justify-between text-white/60 text-sm">
                    <span>Subtotal</span>
                    <span className="text-white font-semibold">${formattedBreakdown.basePrice} ARS</span>
                  </div>
                  <div className="flex justify-between text-white/60 text-sm">
                    <span>Cargo por servicio</span>
                    <span className="text-white font-semibold">${formattedBreakdown.commission} ARS</span>
                  </div>
                  <div className="flex justify-between text-white font-black text-xl pt-3 border-t border-white/10">
                    <span className="uppercase tracking-wide">Total</span>
                    <span className="text-purple-vibrant">${formattedBreakdown.totalPrice} ARS</span>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/60 text-xs uppercase tracking-wider font-semibold mb-2">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={buyerData.firstName}
                      onChange={(e) => setBuyerData({ ...buyerData, firstName: e.target.value })}
                      className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-vibrant/50 transition-all duration-300 ${
                        errors.firstName ? 'border-red/50' : 'border-white/10 focus:border-purple-vibrant/50'
                      }`}
                      placeholder="Nombre"
                    />
                    {errors.firstName && (
                      <p className="text-red text-xs mt-1 font-medium">{errors.firstName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-white/60 text-xs uppercase tracking-wider font-semibold mb-2">
                      Apellido
                    </label>
                    <input
                      type="text"
                      value={buyerData.lastName}
                      onChange={(e) => setBuyerData({ ...buyerData, lastName: e.target.value })}
                      className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-vibrant/50 transition-all duration-300 ${
                        errors.lastName ? 'border-red/50' : 'border-white/10 focus:border-purple-vibrant/50'
                      }`}
                      placeholder="Apellido"
                    />
                    {errors.lastName && (
                      <p className="text-red text-xs mt-1 font-medium">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/60 text-xs uppercase tracking-wider font-semibold mb-2">
                      Tipo de documento
                    </label>
                    <select
                      value={buyerData.documentType}
                      onChange={(e) => setBuyerData({ ...buyerData, documentType: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-vibrant/50 focus:border-purple-vibrant/50 transition-all duration-300"
                    >
                      <option value="DNI">DNI</option>
                      <option value="LC">LC</option>
                      <option value="LE">LE</option>
                      <option value="PASAPORTE">Pasaporte</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-white/60 text-xs uppercase tracking-wider font-semibold mb-2">
                      Nro de Documento
                    </label>
                    <input
                      type="text"
                      value={buyerData.documentNumber}
                      onChange={(e) => setBuyerData({ ...buyerData, documentNumber: e.target.value })}
                      className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-vibrant/50 transition-all duration-300 ${
                        errors.documentNumber ? 'border-red/50' : 'border-white/10 focus:border-purple-vibrant/50'
                      }`}
                      placeholder="12345678"
                    />
                    {errors.documentNumber && (
                      <p className="text-red text-xs mt-1 font-medium">{errors.documentNumber}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-white/60 text-xs uppercase tracking-wider font-semibold mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={buyerData.email}
                    onChange={(e) => setBuyerData({ ...buyerData, email: e.target.value })}
                    className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-vibrant/50 transition-all duration-300 ${
                      errors.email ? 'border-red/50' : 'border-white/10 focus:border-purple-vibrant/50'
                    }`}
                    placeholder="tu@email.com"
                  />
                  {errors.email && (
                    <p className="text-red text-xs mt-1 font-medium">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-white/60 text-xs uppercase tracking-wider font-semibold mb-2">
                    Confirmar Email
                  </label>
                  <input
                    type="email"
                    value={buyerData.confirmEmail}
                    onChange={(e) => setBuyerData({ ...buyerData, confirmEmail: e.target.value })}
                    className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-vibrant/50 transition-all duration-300 ${
                      errors.confirmEmail ? 'border-red/50' : 'border-white/10 focus:border-purple-vibrant/50'
                    }`}
                    placeholder="tu@email.com"
                  />
                  {errors.confirmEmail && (
                    <p className="text-red text-xs mt-1 font-medium">{errors.confirmEmail}</p>
                  )}
                </div>

                <div>
                  <label className="block text-white/60 text-xs uppercase tracking-wider font-semibold mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={buyerData.phone}
                    onChange={(e) => setBuyerData({ ...buyerData, phone: e.target.value })}
                    className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-vibrant/50 transition-all duration-300 ${
                      errors.phone ? 'border-red/50' : 'border-white/10 focus:border-purple-vibrant/50'
                    }`}
                    placeholder="+54 9 11 1234-5678"
                  />
                  {errors.phone && (
                    <p className="text-red text-xs mt-1 font-medium">{errors.phone}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/60 text-xs uppercase tracking-wider font-semibold mb-2">
                      País
                    </label>
                    <select
                      value={buyerData.country}
                      onChange={(e) => setBuyerData({ ...buyerData, country: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-vibrant/50 focus:border-purple-vibrant/50 transition-all duration-300"
                    >
                      <option value="Argentina">🇦🇷 Argentina</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-white/60 text-xs uppercase tracking-wider font-semibold mb-2">
                      Provincia
                    </label>
                    <select
                      value={buyerData.province}
                      onChange={(e) => setBuyerData({ ...buyerData, province: e.target.value })}
                      className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-vibrant/50 transition-all duration-300 ${
                        errors.province ? 'border-red/50' : 'border-white/10 focus:border-purple-vibrant/50'
                      }`}
                    >
                      <option value="">Seleccione provincia</option>
                      {provinces.map((province) => (
                        <option key={province} value={province}>
                          {province}
                        </option>
                      ))}
                    </select>
                    {errors.province && (
                      <p className="text-red text-xs mt-1 font-medium">{errors.province}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                {tickets.map((ticket, ticketIndex) => {
                  const ticketDataForType = ticketsData.filter((td) =>
                    td.ticketId.startsWith(ticket.ticketTypeId)
                  )

                  return (
                    <div key={ticket.ticketTypeId} className="space-y-4">
                      <h3 className="text-white font-bold text-lg uppercase tracking-wide">
                        {ticket.ticketTypeName} ({ticket.quantity}x)
                      </h3>
                      {ticketDataForType.map((ticketData, index) => (
                        <motion.div
                          key={ticketData.ticketId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="bg-white/5 rounded-xl p-5 border border-white/10 hover:border-purple-vibrant/30 transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
                        >
                          <p className="text-white/60 text-sm mb-4 font-medium">
                            Ticket #{index + 1}: {ticket.ticketTypeName}
                          </p>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-white/60 text-xs uppercase tracking-wider font-semibold mb-2">
                                Nombre Completo
                              </label>
                              <input
                                type="text"
                                value={ticketData.fullName}
                                onChange={(e) => {
                                  setTicketsData((prev) =>
                                    prev.map((td) =>
                                      td.ticketId === ticketData.ticketId
                                        ? { ...td, fullName: e.target.value }
                                        : td
                                    )
                                  )
                                }}
                                className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-vibrant/50 transition-all duration-300 ${
                                  errors[`ticket-${ticketsData.indexOf(ticketData)}-name`]
                                    ? 'border-red/50'
                                    : 'border-white/10 focus:border-purple-vibrant/50'
                                }`}
                                placeholder="Nombre completo del asistente"
                              />
                              {errors[`ticket-${ticketsData.indexOf(ticketData)}-name`] && (
                                <p className="text-red text-xs mt-1 font-medium">
                                  {errors[`ticket-${ticketsData.indexOf(ticketData)}-name`]}
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="block text-white/60 text-xs uppercase tracking-wider font-semibold mb-2">
                                DNI/CI
                              </label>
                              <input
                                type="text"
                                value={ticketData.documentNumber}
                                onChange={(e) => {
                                  setTicketsData((prev) =>
                                    prev.map((td) =>
                                      td.ticketId === ticketData.ticketId
                                        ? { ...td, documentNumber: e.target.value }
                                        : td
                                    )
                                  )
                                }}
                                className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-vibrant/50 transition-all duration-300 ${
                                  errors[`ticket-${ticketsData.indexOf(ticketData)}-doc`]
                                    ? 'border-red/50'
                                    : 'border-white/10 focus:border-purple-vibrant/50'
                                }`}
                                placeholder="12345678"
                              />
                              {errors[`ticket-${ticketsData.indexOf(ticketData)}-doc`] && (
                                <p className="text-red text-xs mt-1 font-medium">
                                  {errors[`ticket-${ticketsData.indexOf(ticketData)}-doc`]}
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )
                })}
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <h3 className="text-white font-black text-xl mb-4 uppercase tracking-wider">
                  Resumen de tu compra
                </h3>

                {/* Resumen de tickets */}
                <div className="space-y-3">
                  {tickets.map((ticket, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center py-2 text-white/60 text-sm"
                    >
                      <span>
                        {ticket.quantity}x {ticket.ticketTypeName}
                      </span>
                      <span className="text-white font-semibold">
                        ${formatPrice(ticket.basePrice * ticket.quantity)} ARS
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-white/10 space-y-3">
                  <div className="flex justify-between text-white/60 text-sm">
                    <span>Costo de tus items</span>
                    <span className="text-white font-semibold">${formattedBreakdown.basePrice} ARS</span>
                  </div>
                  <div className="flex justify-between text-white/60 text-sm">
                    <span>Cargo por servicio</span>
                    <span className="text-white font-semibold">${formattedBreakdown.commission} ARS</span>
                  </div>
                  <div className="flex justify-between text-white font-black text-xl pt-3 border-t border-white/10">
                    <span className="uppercase tracking-wide">Total</span>
                    <span className="text-purple-vibrant">${formattedBreakdown.totalPrice} ARS</span>
                  </div>
                </div>

                {/* Términos y condiciones mejorados */}
                <div className="pt-4">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-1 w-5 h-5 rounded border-white/20 bg-white/5 text-purple-vibrant focus:ring-2 focus:ring-purple-vibrant/50 focus:ring-offset-0 transition-all duration-300 cursor-pointer"
                    />
                    <span className="text-white/60 text-sm leading-relaxed group-hover:text-white/80 transition-colors">
                      Acepto los{' '}
                      <a
                        href="/terminos"
                        className="text-purple-vibrant hover:underline font-semibold"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Términos y Condiciones
                      </a>
                      ,{' '}
                      <a
                        href="/privacidad"
                        className="text-purple-vibrant hover:underline font-semibold"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Política de Privacidad
                      </a>
                      ,{' '}
                      <a
                        href="/devoluciones"
                        className="text-purple-vibrant hover:underline font-semibold"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Política de Devoluciones
                      </a>{' '}
                      y Synapse
                    </span>
                  </label>
                  {errors.terms && (
                    <p className="text-red text-xs mt-2 font-medium">{errors.terms}</p>
                  )}
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red/20 border border-red/50 rounded-xl p-4 text-red text-sm font-medium"
                  >
                    {error}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer con botones de navegación mejorados */}
        <div className="flex items-center justify-between p-6 border-t border-white/10 bg-[#0F0F0F]/50">
          {currentStep > 1 && (
            <motion.button
              onClick={handleBack}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-full text-white font-semibold transition-all duration-300 flex items-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" />
              Volver
            </motion.button>
          )}
          <div className="flex-1" />
          <motion.button
            onClick={handleNext}
            disabled={loading || (currentStep === 4 && !acceptedTerms)}
            whileHover={{ scale: loading || (currentStep === 4 && !acceptedTerms) ? 1 : 1.05 }}
            whileTap={{ scale: loading || (currentStep === 4 && !acceptedTerms) ? 1 : 0.95 }}
            className="px-8 py-3 bg-purple-vibrant hover:bg-[#9333EA] text-white font-bold rounded-[32px] transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_24px_rgba(168,85,247,0.4)] hover:shadow-[0_0_32px_rgba(168,85,247,0.6)] hover:scale-105 active:scale-95"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Procesando...</span>
              </>
            ) : currentStep === 4 ? (
              <>
                <span>Confirmar y pagar</span>
                <ChevronRight className="w-5 h-5" />
              </>
            ) : (
              <>
                <span>Siguiente</span>
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}
