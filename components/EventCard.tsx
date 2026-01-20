'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Calendar, MapPin, Ticket } from 'lucide-react'
import Image from 'next/image'
import { formatPrice } from '@/lib/utils/format'

interface EventCardProps {
  event: {
    id: string
    slug?: string
    name: string
    date: string
    time?: string
    venue: string
    city?: string
    image: string
    price: number
    category: string
    artist?: string
    supporting?: string
    ticketsLeft?: number
  }
  index: number
}

export default function EventCard({ event, index }: EventCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ scale: 1.05, y: -8 }}
      className="group relative flex-shrink-0 w-[300px] sm:w-[350px] rounded-2xl overflow-hidden bg-gray-medium shadow-lg shadow-black/50 hover:shadow-2xl hover:shadow-purple-vibrant/20 transition-shadow duration-300"
    >
      {/* Image Container */}
      <Link href={`/eventos/${event.slug || event.id}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden">
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black-deep via-black-deep/60 via-transparent to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-br from-purple-vibrant/5 via-transparent to-blue-electric/5 z-10" />
          
          {/* Imagen del evento */}
          {event.image ? (
            <Image
              src={event.image}
              alt={event.name}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 300px, 350px"
              unoptimized={event.image.includes('supabase.co')}
              onError={(e) => {
                // Fallback si la imagen falla al cargar
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
          ) : (
            <div className="w-full h-full relative bg-gradient-to-br from-gray-dark via-gray-medium to-gray-dark">
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-vibrant/30 to-blue-electric/30 flex items-center justify-center">
                    <Ticket className="w-12 h-12 text-white/50" />
                  </div>
                  <p className="text-white/30 text-xs uppercase tracking-wider font-semibold">Evento</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Category Badge con glow */}
          <div className="absolute top-4 left-4 z-30">
            <span className="px-4 py-1.5 rounded-full bg-purple-vibrant text-white text-xs font-bold uppercase tracking-wide shadow-lg shadow-purple-vibrant/50">
              {event.category}
            </span>
          </div>
          
          {/* Tickets Left Badge */}
          {event.ticketsLeft && event.ticketsLeft > 0 && (
            <div className="absolute top-4 right-4 z-30">
              <span className="px-3 py-1 rounded-full bg-red/90 text-white text-xs font-bold uppercase tracking-wide animate-pulse">
                {event.ticketsLeft} disponibles
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="pt-0 px-3 pb-3 space-y-2 bg-gray-medium">
          {/* Date & Time */}
          <div className="flex items-center gap-2 text-white/70 text-sm">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-purple-vibrant" />
              <span className="font-medium">{event.date}</span>
            </div>
            {event.time && (
              <>
                <span className="text-white/30">•</span>
                <span className="text-white/60">{event.time}</span>
              </>
            )}
          </div>

          {/* Event Name */}
          <h3 className="text-xl font-black uppercase tracking-wider text-white leading-tight" style={{ letterSpacing: '0.05em' }}>
            {event.name}
          </h3>

          {/* Artist */}
          {event.artist && (
            <p className="text-white/90 font-semibold text-sm uppercase tracking-wide">
              {event.artist}
            </p>
          )}

          {/* Supporting */}
          {event.supporting && (
            <p className="text-white/50 text-xs">
              {event.supporting}
            </p>
          )}

          {/* Venue & City */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <MapPin className="w-4 h-4 text-teal" />
              <span className="font-medium">{event.venue}</span>
            </div>
            {event.city && (
              <p className="text-white/50 text-xs ml-6">{event.city}</p>
            )}
          </div>

          {/* Price */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-purple-vibrant" />
              <span className="text-white/60 text-sm font-medium">Desde</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-white">
                ${formatPrice(event.price)}
              </span>
              <p className="text-white/40 text-xs">ARS</p>
            </div>
          </div>

          {/* Comprar Button */}
          <Link 
            href={`/eventos/${event.slug || event.id}`}
            className="block mt-4"
          >
            <button className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-purple-vibrant via-purple-600 to-purple-vibrant text-white font-bold text-sm uppercase tracking-wider hover:scale-105 transition-all duration-300 shadow-lg shadow-purple-vibrant/50 hover:shadow-purple-vibrant/70 relative overflow-hidden group">
              <span className="relative z-10 flex items-center justify-center gap-2">
                <Ticket className="w-4 h-4" />
                Comprar
              </span>
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-vibrant/0 via-white/20 to-purple-vibrant/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          </Link>
        </div>
    </motion.div>
  )
}

