'use client'

import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'

interface CategorySelectorProps {
  value: string
  onChange: (value: string) => void
  label: string
}

const categories = {
  'Eventos Sociales': [
    'Cumpleaños',
    'Gala',
    'XV Años',
    'Casamiento',
    'Aniversario',
  ],
  'Fiestas': [
    'After',
    'Fiesta',
    'Evento',
    'Festival',
    'Show',
  ],
}

export default function CategorySelector({ value, onChange, label }: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectorRef = useRef<HTMLDivElement>(null)

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (category: string) => {
    onChange(category)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={selectorRef}>
      <label className="block text-sm font-semibold mb-2 uppercase tracking-wide text-lightGray">
        {label}
      </label>
      
      {value ? (
        <div className="flex items-center gap-2">
          <span className="px-4 py-3 bg-[#A855F7]/20 border border-[#A855F7]/50 rounded-lg text-[#A855F7] font-semibold flex-1">
            {value}
          </span>
          <button
            type="button"
            onClick={() => onChange('')}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all duration-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-left focus:outline-none focus:border-[#A855F7]/50 focus:ring-2 focus:ring-[#A855F7]/20 transition-all duration-300 hover:border-[#A855F7]/30"
        >
          Seleccionar categoría
        </button>
      )}

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-[#1F1F1F] border-2 border-[#2F2F2F] rounded-2xl shadow-2xl p-6">
          {Object.entries(categories).map(([sectionName, sectionCategories]) => (
            <div key={sectionName} className="mb-6 last:mb-0">
              <h5 className="text-sm font-bold uppercase tracking-wide mb-3 text-lightGray">
                {sectionName}
              </h5>
              <div className="grid grid-cols-5 gap-2">
                {sectionCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleSelect(category)}
                    className={`
                      px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-300
                      ${
                        value === category
                          ? 'bg-[#A855F7] text-white'
                          : 'bg-white/5 text-white hover:bg-white/10'
                      }
                    `}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
