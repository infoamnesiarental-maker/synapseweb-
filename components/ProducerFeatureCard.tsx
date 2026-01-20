'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

interface ProducerFeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
  badge?: string
  index: number
}

export default function ProducerFeatureCard({
  icon: Icon,
  title,
  description,
  badge,
  index,
}: ProducerFeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      whileHover={{ scale: 1.03, x: 5 }}
      className="group relative bg-black-deep rounded-xl p-5 border-2 border-teal/30 hover:border-teal/60 transition-all duration-300 overflow-hidden shadow-xl shadow-teal/10"
    >
      {/* Diagonal gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal/5 via-transparent to-cyan/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Animated grid pattern */}
      <div 
        className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-300"
        style={{
          backgroundImage: 'linear-gradient(rgba(20, 184, 166, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(20, 184, 166, 0.1) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      {badge && (
        <div className="mb-4 relative z-10">
          <span className="inline-block px-3 py-1 rounded-lg bg-teal/20 border border-teal/40 text-teal text-xs font-bold uppercase tracking-wide backdrop-blur-sm">
            {badge}
          </span>
        </div>
      )}

      <div className="mb-4 relative z-10 flex items-start gap-3">
        <motion.div
          whileHover={{ scale: 1.1, rotate: 10 }}
          className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal to-cyan flex items-center justify-center shadow-lg shadow-teal/30 flex-shrink-0"
        >
          <Icon className="w-6 h-6 text-white" />
        </motion.div>
        <div className="flex-1">
          <h3 className="text-lg font-black text-white mb-2 uppercase tracking-wide leading-tight">
            {title}
          </h3>
        </div>
      </div>

      <p className="text-white/70 leading-relaxed relative z-10 text-sm pl-14">
        {description}
      </p>

      {/* Right side accent line */}
      <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-teal via-cyan to-teal opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Corner accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </motion.div>
  )
}

