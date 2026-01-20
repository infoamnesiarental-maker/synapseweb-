'use client'

import { ShoppingCart, Ticket, History, Calendar, BarChart3, QrCode, MessageCircle, Mail, RefreshCw, Users, ArrowLeftRight, Shield, Gift, Star, Zap } from 'lucide-react'
import ClientFeatureCard from './ClientFeatureCard'
import ProducerFeatureCard from './ProducerFeatureCard'

const clientFeatures = [
  {
    icon: ShoppingCart,
    title: 'Compra Rápida',
    description: 'Sin registro necesario. Solo ingresa tus datos básicos y compra en minutos.',
    badge: 'Para Clientes',
  },
  {
    icon: ArrowLeftRight,
    title: 'Mercado de Reventa Seguro',
    description: 'Vende o intercambia tus entradas con otros usuarios de forma segura. Todo tokenizado y verificado.',
    badge: 'Para Clientes',
  },
  {
    icon: Shield,
    title: 'Tickets Tokenizados',
    description: 'Tus entradas están protegidas con tecnología blockchain. Garantía de autenticidad y transferencia segura.',
    badge: 'Para Clientes',
  },
  {
    icon: Gift,
    title: 'Programa de Referidos',
    description: 'Invita amigos y gana descuentos. Por cada amigo que compre, ambos reciben beneficios exclusivos.',
    badge: 'Para Clientes',
  },
  {
    icon: Star,
    title: 'Acceso Anticipado',
    description: 'Usuarios registrados obtienen acceso prioritario a eventos exclusivos y preventas especiales.',
    badge: 'Para Clientes',
  },
  {
    icon: History,
    title: 'Historial Centralizado',
    description: 'Todos tus tickets, compras y ventas en un solo lugar. Historial completo de tus eventos.',
    badge: 'Para Clientes',
  },
]

const producerFeatures = [
  {
    icon: Calendar,
    title: 'Creación de Eventos',
    description: 'Interfaz intuitiva para crear eventos con múltiples tipos de entrada, cupones y configuraciones avanzadas.',
    badge: 'Para Productoras',
  },
  {
    icon: BarChart3,
    title: 'Dashboard Analítico',
    description: 'Ventas en tiempo real, gráficos de rendimiento, reportes detallados y exportación a Excel/CSV.',
    badge: 'Para Productoras',
  },
  {
    icon: QrCode,
    title: 'Validación QR',
    description: 'Escáner móvil para validar entradas en tiempo real, control de acceso y sistema anti-fraude.',
    badge: 'Para Productoras',
  },
  {
    icon: MessageCircle,
    title: 'Chatbot Inteligente',
    description: 'Asistente AI 24/7 que responde consultas de clientes, gestiona ventas y optimiza tu atención.',
    badge: 'Para Productoras',
  },
  {
    icon: Mail,
    title: 'Marketing Automation',
    description: 'Campañas de email automatizadas, segmentación de audiencia y seguimiento de conversiones integrado.',
    badge: 'Para Productoras',
  },
  {
    icon: RefreshCw,
    title: 'Reventa Controlada',
    description: 'Sistema de reventa autorizada con control de precios máximos y comisiones configurables para ti.',
    badge: 'Para Productoras',
  },
  {
    icon: Users,
    title: 'Lista de Espera Inteligente',
    description: 'Gestiona listas de espera automáticas, notificaciones cuando hay disponibilidad y reconversión de ventas.',
    badge: 'Para Productoras',
  },
  {
    icon: Zap,
    title: 'Integración Multi-Canal',
    description: 'Conecta con redes sociales, Google Ads, Facebook Events y sincroniza todo desde un solo panel.',
    badge: 'Para Productoras',
  },
]

export default function FeaturesSection() {
  return (
    <div 
      className="relative py-12"
      style={{
        background: 'radial-gradient(circle at center, rgba(168, 85, 247, 0.15) 0%, rgba(139, 92, 246, 0.1) 30%, rgba(0, 0, 0, 0.95) 70%, #000000 100%)',
      }}
    >
      {/* Para Clientes */}
      <section id="clientes" className="pt-8 pb-12 relative">
        <div className="max-w-container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-wide mb-4 text-white">
              COMPRA TICKETS
            </h2>
            <p className="text-cyan text-xl font-semibold mb-2">De forma fácil y segura</p>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Compra, vende o intercambia entradas de forma segura. Todo tokenizado y protegido con tecnología blockchain.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 max-w-5xl mx-auto">
            {clientFeatures.map((feature, index) => (
              <ClientFeatureCard key={index} {...feature} index={index} />
            ))}
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <a
              href="/eventos"
              className="inline-block px-10 py-4 rounded-full border border-white/20 text-white font-bold text-lg hover:scale-110 transition-all duration-300 shadow-lg"
              style={{
                background: 'linear-gradient(to bottom, #2A2A2A 0%, #1F1F1F 50%, #2A2A2A 100%)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(to bottom, #1F1F1F 0%, #2A2A2A 50%, #1F1F1F 100%)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(to bottom, #2A2A2A 0%, #1F1F1F 50%, #2A2A2A 100%)'
              }}
            >
              Comprar Tickets Ahora
            </a>
          </div>
        </div>
      </section>

      {/* Para Productoras */}
      <section id="productoras" className="pt-12 pb-12 relative">
        <div className="max-w-container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-wide mb-4 text-white">
              GESTIONA TUS EVENTOS
            </h2>
            <p className="text-teal text-xl font-semibold mb-2">Con herramientas profesionales</p>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Suite completa de herramientas profesionales: desde creación hasta marketing, validación y análisis. Todo en un solo lugar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 max-w-5xl mx-auto">
            {producerFeatures.map((feature, index) => (
              <ProducerFeatureCard key={index} {...feature} index={index} />
            ))}
          </div>

          {/* CTA Button */}
          <div className="text-center">
            <a
              href="/register"
              className="inline-block px-10 py-4 rounded-full border border-white/20 text-white font-bold text-lg hover:scale-110 transition-all duration-300 shadow-lg"
              style={{
                background: 'linear-gradient(to bottom, #2A2A2A 0%, #1F1F1F 50%, #2A2A2A 100%)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(to bottom, #1F1F1F 0%, #2A2A2A 50%, #1F1F1F 100%)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(to bottom, #2A2A2A 0%, #1F1F1F 50%, #2A2A2A 100%)'
              }}
            >
              Crear Mi Primer Evento
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}



