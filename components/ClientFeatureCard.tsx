'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

interface ClientFeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
  badge?: string
  index: number
}

export default function ClientFeatureCard({
  icon: Icon,
  title,
  description,
  badge,
  index,
}: ClientFeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ scale: 1.05, y: -8 }}
      className="group relative bg-gradient-to-br from-gray-dark via-gray-medium to-gray-dark rounded-2xl p-6 border-2 border-purple-vibrant/20 hover:border-purple-vibrant/60 transition-all duration-300 overflow-hidden shadow-xl shadow-black/50"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-vibrant/10 via-blue-electric/5 to-pink-neon/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Animated border glow */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-vibrant/0 via-purple-vibrant/20 to-purple-vibrant/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl" />

      {badge && (
        <div className="mb-4 relative z-10">
          <span className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-cyan to-teal text-white text-xs font-bold uppercase tracking-wide shadow-lg shadow-cyan/50">
            {badge}
          </span>
        </div>
      )}

      <div className="mb-4 relative z-10">
        <motion.div
          whileHover={{ scale: 1.15, rotate: -5 }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-vibrant via-blue-electric to-pink-neon flex items-center justify-center shadow-2xl shadow-purple-vibrant/50 relative overflow-hidden"
        >
          {/* Icon background animation */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <Icon className="w-8 h-8 text-white relative z-10" />
        </motion.div>
      </div>

      <h3 className="text-xl font-black text-white mb-3 relative z-10 uppercase tracking-wide leading-tight">
        {title}
      </h3>
      <p className="text-white/80 leading-relaxed relative z-10 text-sm">
        {description}
      </p>

      {/* Bottom glow effect */}
      <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-purple-vibrant/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute -top-20 -left-20 w-60 h-60 bg-blue-electric/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </motion.div>
  )
}

