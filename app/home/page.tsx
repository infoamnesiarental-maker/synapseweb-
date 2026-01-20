'use client'

import EventsSection from '@/components/EventsSection'
import Footer from '@/components/Footer'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Menu, X, Ticket, User, Building2, LogOut, Calendar } from 'lucide-react'

export default function HomePage() {
  const { loading, isAuthenticated, user, profile, signOut, isProducer } = useAuth()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
    }
  }, [loading, isAuthenticated, router])

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

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black-deep flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-black-deep">
      {/* Video Background Banner */}
      <section className="relative h-[60vh] min-h-[400px] flex items-center justify-center overflow-hidden bg-black-deep">
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
          
          {/* Overlay para legibilidad */}
          <div 
            className="absolute inset-0 z-10 pointer-events-none"
            style={{
              background: 'linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.4) 50%, rgba(0, 0, 0, 0.18) 100%)',
            }}
          />
        </div>

        {/* Navigation Bar sobre el video */}
        <nav className="absolute top-0 left-0 right-0 z-30 w-full">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
            <div className="flex items-center justify-between">
              {/* Logo - Lado Izquierdo */}
              <Link href="/home" className="z-30">
                <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                  SYNAPSE
                </h1>
              </Link>

              {/* Desktop Menu - Centrado */}
              <nav className="hidden md:flex items-center gap-5 lg:gap-7 px-8 py-4 rounded-full bg-black/40 backdrop-blur-md border border-white/10 absolute left-1/2 transform -translate-x-1/2">
                <Link
                  href="/eventos"
                  className="text-white font-semibold text-base uppercase tracking-wide transition-colors duration-300 hover:text-white/80 px-3 py-1.5 rounded-lg border border-transparent hover:border-white/30 flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Eventos
                </Link>
                <Link
                  href="/mis-compras"
                  className="text-white font-semibold text-base uppercase tracking-wide transition-colors duration-300 hover:text-white/80 px-3 py-1.5 rounded-lg border border-transparent hover:border-white/30 flex items-center gap-2"
                >
                  <Ticket className="w-4 h-4" />
                  Mis Tickets
                </Link>
                <Link
                  href="/mi-perfil"
                  className="text-white font-semibold text-base uppercase tracking-wide transition-colors duration-300 hover:text-white/80 px-3 py-1.5 rounded-lg border border-transparent hover:border-white/30 flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Mi Perfil
                </Link>
                
                {/* Separador */}
                <div className="h-6 w-px bg-white/20 mx-2" />
                
                {!isProducer && (
                  <Link
                    href="/register-producer"
                    className="text-white font-semibold text-base uppercase tracking-wide transition-colors duration-300 hover:text-white/80 px-3 py-1.5 rounded-lg border border-transparent hover:border-white/30 flex items-center gap-2"
                  >
                    <Building2 className="w-4 h-4" />
                    Ser Productora
                  </Link>
                )}
                {isProducer && (
                  <Link
                    href="/dashboard"
                    className="text-white font-semibold text-base uppercase tracking-wide transition-colors duration-300 hover:text-white/80 px-3 py-1.5 rounded-lg border border-transparent hover:border-white/30 flex items-center gap-2"
                  >
                    <Building2 className="w-4 h-4" />
                    Dashboard
                  </Link>
                )}
              </nav>

              {/* Right Side - User Actions */}
              <div className="hidden md:flex items-center gap-4 ml-auto">
                <div className="flex items-center gap-2 text-white/90 text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  <User className="w-4 h-4" />
                  <span className="max-w-[150px] truncate">
                    {(profile as any)?.full_name || user?.email}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 bg-red/20 border border-red/50 text-red font-semibold rounded-full transition-all duration-300 hover:bg-red/30 uppercase tracking-wide text-sm flex items-center gap-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                >
                  <LogOut className="w-4 h-4" />
                  Salir
                </button>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden text-white hover:text-white/80 transition-colors drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-white/10 bg-black-deep/95 backdrop-blur-md">
              <div className="px-4 py-6 space-y-4">
                <Link
                  href="/eventos"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-white font-semibold text-base uppercase tracking-wide transition-colors duration-300 hover:text-purple-vibrant py-2 flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Eventos
                </Link>
                <Link
                  href="/mis-compras"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-white font-semibold text-base uppercase tracking-wide transition-colors duration-300 hover:text-purple-vibrant py-2 flex items-center gap-2"
                >
                  <Ticket className="w-4 h-4" />
                  Mis Tickets
                </Link>
                <Link
                  href="/mi-perfil"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-white font-semibold text-base uppercase tracking-wide transition-colors duration-300 hover:text-purple-vibrant py-2 flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Mi Perfil
                </Link>
                <div className="pt-2 border-t border-white/10 mt-2">
                  {!isProducer && (
                    <Link
                      href="/register-producer"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block text-white font-semibold text-base uppercase tracking-wide transition-colors duration-300 hover:text-teal py-2 flex items-center gap-2"
                    >
                      <Building2 className="w-4 h-4" />
                      Ser Productora
                    </Link>
                  )}
                  {isProducer && (
                    <Link
                      href="/dashboard"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block text-white font-semibold text-base uppercase tracking-wide transition-colors duration-300 hover:text-purple-vibrant py-2 flex items-center gap-2"
                    >
                      <Building2 className="w-4 h-4" />
                      Dashboard
                    </Link>
                  )}
                </div>
                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 text-white/70 text-sm mb-4">
                    <User className="w-4 h-4" />
                    <span className="truncate">
                      {(profile as any)?.full_name || user?.email}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      handleSignOut()
                      setIsMobileMenuOpen(false)
                    }}
                    className="w-full px-4 py-2 bg-red/20 border border-red/50 text-red font-semibold rounded-full transition-all duration-300 hover:bg-red/30 uppercase tracking-wide text-sm flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Salir
                  </button>
                </div>
              </div>
            </div>
          )}
        </nav>
      </section>

      {/* Content */}
      <main>
        <EventsSection />
        <Footer />
      </main>
    </div>
  )
}
