'use client'

import Link from 'next/link'
import { Download, Instagram, Twitter, Linkedin, Music, Youtube, Mail, User } from 'lucide-react'

export default function Footer() {
  return (
    <footer 
      className="relative rounded-t-3xl overflow-hidden"
      style={{
        background: 'linear-gradient(to bottom, #1a2f6b 0%, #2d5fc4 30%, #4f58c9 60%, #6d4da0 100%)',
      }}
    >
      <div className="max-w-container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Section - Download App */}
          <div className="flex flex-col">
            <div className="mb-5">
              <h2 className="text-4xl sm:text-5xl font-black text-white mb-1 leading-tight">
                Descargá
              </h2>
              <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight">
                la app
              </h2>
            </div>
            
            <a
              href="#"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-base transition-all duration-300 mb-8 w-fit"
            >
              <User className="w-5 h-5" />
              <span>Descargar app</span>
            </a>

            {/* Copyright */}
            <div className="mt-auto flex flex-wrap items-center gap-2 text-white/90 text-xs">
              <span>©2025 SYNAPSE S.A. Todos los derechos reservados.</span>
              <span className="h-3 w-px bg-white/40" />
              <Link href="/privacidad" className="text-white/70 hover:text-white transition-colors">
                Privacy Policy
              </Link>
            </div>
          </div>

          {/* Right Section - Support & Social */}
          <div className="flex flex-col justify-start items-end lg:items-start lg:ml-auto lg:max-w-md">
            <div className="mb-6 text-right lg:text-left">
              <h5 className="text-white text-sm mb-2 font-medium">
                Por consultas, devoluciones o situaciones técnicas:
              </h5>
              <a
                href="mailto:support@synapse.com"
                className="text-xl font-bold text-[#FF6B9D] hover:text-[#FF8FB3] transition-colors inline-block"
              >
                synapse.support
              </a>
            </div>

            <div className="text-right lg:text-left">
              <h5 className="text-white text-sm mb-3 font-medium">
                Seguinos en nuestras redes
              </h5>
              <div className="flex gap-2 justify-end lg:justify-start">
                {[
                  { icon: Instagram, label: 'Instagram' },
                  { icon: Twitter, label: 'X (Twitter)' },
                  { icon: Linkedin, label: 'LinkedIn' },
                  { icon: Music, label: 'TikTok' },
                  { icon: Youtube, label: 'YouTube' },
                ].map((social, index) => (
                  <a
                    key={index}
                    href="#"
                    className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black hover:scale-110 transition-transform duration-300"
                    aria-label={social.label}
                  >
                    <social.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
