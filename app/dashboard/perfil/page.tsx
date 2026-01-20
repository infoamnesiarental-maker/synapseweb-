'use client'

import { Settings } from 'lucide-react'

export default function PerfilPage() {
  return (
    <div className="min-h-screen bg-black-deep text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold uppercase tracking-wide mb-2">
            Perfil de Productora
          </h1>
          <p className="text-lightGray">
            Configura la información de tu productora
          </p>
        </div>

        <div className="bg-mediumGray rounded-2xl p-12 border border-[#2F2F2F] text-center">
          <Settings className="w-16 h-16 mx-auto text-purple-400 mb-4" />
          <h2 className="text-2xl font-bold mb-4 uppercase tracking-wide">
            Próximamente
          </h2>
          <p className="text-lightGray max-w-md mx-auto">
            Aquí podrás editar la información de tu productora, logo, redes sociales y más
          </p>
        </div>
      </div>
    </div>
  )
}
