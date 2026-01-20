'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Download, X, Menu } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export default function HeroWithVideo() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    // Forzar reproducción del video cuando el componente se monta
    const video = videoRef.current
    if (video) {
      const playPromise = video.play()
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setVideoLoaded(true)
          })
          .catch((error) => {
            console.error('Error al reproducir video:', error)
            setVideoError(true)
          })
      }
    }
  }, [])

  const handleVideoLoaded = () => {
    setVideoLoaded(true)
    const video = videoRef.current
    if (video) {
      video.play().catch((error) => {
        console.error('Error al reproducir video después de cargar:', error)
      })
    }
  }

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error('Error cargando video:', e)
    setVideoError(true)
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black-deep">
      {/* Video Background */}
      <div className="absolute inset-0 z-0 w-full h-full">
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            width: '100%',
            height: '100%',
            minWidth: '100%',
            minHeight: '100%',
            objectFit: 'cover',
            zIndex: 1,
            backgroundColor: '#000000',
          }}
          onLoadedData={handleVideoLoaded}
          onCanPlay={handleVideoLoaded}
          onError={handleVideoError}
          onPlay={() => {
            setVideoLoaded(true)
          }}
        >
          <source src="/logoamnesia.mp4" type="video/mp4" />
          Tu navegador no soporta la reproducción de video.
        </video>
        
        {/* Fallback si el video no carga - fondo negro */}
        {videoError && (
          <div className="absolute inset-0 bg-black-deep z-2" />
        )}
        
        {/* Overlay para legibilidad del texto - Balance entre visibilidad del video y legibilidad */}
        <div 
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.4) 50%, rgba(0, 0, 0, 0.18) 100%)',
          }}
        />
      </div>

      {/* Navigation Overlay */}
      <div className="absolute top-0 left-0 right-0 z-30 pt-8 pb-6">
        <div className="max-w-container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            {/* Logo - Lado Izquierdo */}
            <Link href="/" className="z-30 mr-auto">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white uppercase tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                SYNAPSE
              </h1>
            </Link>

            {/* Desktop Menu - Translúcido y Centrado */}
            <nav className="hidden md:flex items-center gap-5 lg:gap-7 px-8 py-4 rounded-full bg-black/40 backdrop-blur-md border border-white/10 absolute left-1/2 transform -translate-x-1/2">
              <Link
                href="#eventos"
                className="text-white font-semibold text-base uppercase tracking-wide transition-colors duration-300 hover:text-white/80 px-3 py-1.5 rounded-lg border border-transparent hover:border-white/30"
              >
                Eventos
              </Link>
              <Link
                href="#clientes"
                className="text-white font-semibold text-base uppercase tracking-wide transition-colors duration-300 hover:text-white/80 px-3 py-1.5 rounded-lg border border-transparent hover:border-white/30"
              >
                Clientes
              </Link>
              <Link
                href="#productoras"
                className="text-white font-semibold text-base uppercase tracking-wide transition-colors duration-300 hover:text-white/80 px-3 py-1.5 rounded-lg border border-transparent hover:border-white/30"
              >
                Productoras
              </Link>

              {/* Auth Buttons */}
              <div className="flex items-center gap-3 ml-3 pl-5 border-l border-white/20">
                <Link
                  href="/login"
                  className="px-5 py-2.5 rounded-lg text-base font-semibold uppercase transition-all duration-300 text-white border border-white/30 hover:border-white/50 hover:bg-white/10"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="/register"
                  className="px-5 py-2.5 rounded-lg text-base font-semibold uppercase transition-all duration-300 text-white hover:bg-white/10"
                >
                  Registrarse
                </Link>
              </div>
            </nav>

            {/* Mobile - Logo y Menu Button */}
            <div className="md:hidden flex items-center justify-between w-full">
              <Link href="/" className="z-30">
                <h1 className="text-3xl font-black text-white uppercase tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                  SYNAPSE
                </h1>
              </Link>
              <button
                className="text-white z-30"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Menu"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-y-0 left-0 w-64 bg-black-deep/95 backdrop-blur-md z-40 md:hidden border-r border-white/10"
          >
            <div className="flex flex-col h-full pt-20 px-6">
              <Link
                href="#eventos"
                className="py-4 text-white/90 hover:text-white font-semibold text-base uppercase tracking-wide border-b border-white/10"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Eventos
              </Link>
              <Link
                href="#clientes"
                className="py-4 text-white/90 hover:text-white font-semibold text-base uppercase tracking-wide border-b border-white/10"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Clientes
              </Link>
              <Link
                href="#productoras"
                className="py-4 text-white/90 hover:text-white font-semibold text-base uppercase tracking-wide border-b border-white/10"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Productoras
              </Link>
              
              {/* Auth Buttons Mobile */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-white/60 text-sm uppercase mb-3">Cuenta</p>
                <div className="flex flex-col gap-2">
                  <Link
                    href="/login"
                    className="px-4 py-2 rounded-lg text-base font-semibold uppercase transition-all text-white border border-white/30 hover:border-white/50 hover:bg-white/10 text-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Iniciar Sesión
                  </Link>
                  <Link
                    href="/register"
                    className="px-4 py-2 rounded-lg text-base font-semibold uppercase transition-all text-white hover:bg-white/10 text-center"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Registrarse
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Content */}
      <div className="relative z-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-48 pb-24">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-10 leading-tight max-w-3xl mx-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] tracking-tight"
          style={{ letterSpacing: '-0.02em' }}
        >
          Comprá tus tickets de forma segura y descubrí una nueva manera de vivir la música electrónica.
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <Link
            href="#"
            className="inline-flex items-center gap-3 px-12 py-6 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white font-bold text-lg hover:bg-black/50 transition-all duration-300 hover:scale-105 shadow-lg"
          >
            <Download className="w-7 h-7" />
            <span>Descargar app</span>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
