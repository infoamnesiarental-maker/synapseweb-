'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

interface Producer {
  id: string
  is_active: boolean
}

// Cache global para evitar queries redundantes
let authCache: {
  user: User | null
  profile: { role: string } | null
  producer: Producer | null
  timestamp: number
} | null = null

const CACHE_DURATION = 30000 // 30 segundos

export function useAuth() {
  const [user, setUser] = useState<User | null>(authCache?.user || null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<{ role: string } | null>(authCache?.profile || null)
  const [producer, setProducer] = useState<Producer | null>(authCache?.producer || null)
  const supabase = createClient()
  const router = useRouter()
  const hasInitialized = useRef(false)

  useEffect(() => {
    // Si hay cache válido, usarlo inmediatamente
    if (authCache && Date.now() - authCache.timestamp < CACHE_DURATION) {
      setUser(authCache.user)
      setProfile(authCache.profile)
      setProducer(authCache.producer)
      setLoading(false)
      hasInitialized.current = true
      return
    }

    // Evitar múltiples inicializaciones simultáneas
    if (hasInitialized.current) return
    hasInitialized.current = true

    // Obtener usuario actual
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        // Obtener perfil del usuario
        supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
          .then(({ data, error: profileError }) => {
            // Log para debugging
            if (profileError) {
              console.error('❌ [useAuth] Error obteniendo perfil:', {
                error: profileError,
                code: profileError.code,
                message: profileError.message,
                userId: user.id,
                userEmail: user.email
              })
            }

            if (data) {
              console.log('✅ [useAuth] Perfil obtenido:', {
                userId: user.id,
                role: data.role
              })
              setProfile(data)
              // Si es productora, obtener información de la productora
              if (data.role === 'producer') {
                void supabase
                  .from('producers')
                  .select('id, is_active')
                  .eq('user_id', user.id)
                  .single()
                  .then(({ data: producerData, error }) => {
                    if (error) {
                      // Solo loggear errores reales, no "no encontrado" (PGRST116)
                      // PGRST116 significa que no hay registro, lo cual es válido si el usuario
                      // tiene role 'producer' pero aún no completó el registro de productora
                      if (error.code !== 'PGRST116') {
                        console.error('❌ [useAuth] Error obteniendo productora:', error)
                      }
                      setProducer(null)
                      setLoading(false)
                      authCache = { user, profile: data, producer: null, timestamp: Date.now() }
                    } else {
                      const producer = producerData || null
                      setProducer(producer)
                      setLoading(false)
                      // Actualizar cache
                      authCache = { user, profile: data, producer, timestamp: Date.now() }
                    }
                  })
              } else {
                setLoading(false)
                authCache = { user, profile: data, producer: null, timestamp: Date.now() }
              }
            } else {
              console.warn('⚠️ [useAuth] Perfil no encontrado para usuario:', user.id)
              setLoading(false)
              authCache = { user, profile: null, producer: null, timestamp: Date.now() }
            }
          })
          .catch((err) => {
            console.error('❌ [useAuth] Error inesperado obteniendo perfil:', err)
            setLoading(false)
            authCache = { user, profile: null, producer: null, timestamp: Date.now() }
          })
      } else {
        setLoading(false)
        authCache = { user: null, profile: null, producer: null, timestamp: Date.now() }
      }
    })

    // Escuchar cambios de autenticación (solo para cambios reales, no para carga inicial)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null
      setUser(newUser)
      
      // Invalidar cache si cambió el usuario
      if (newUser?.id !== authCache?.user?.id) {
        authCache = null
      }
      
      if (newUser) {
        supabase
          .from('profiles')
          .select('role')
          .eq('id', newUser.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setProfile(data)
              // Si es productora, obtener información de la productora
              if (data.role === 'producer') {
                void supabase
                  .from('producers')
                  .select('id, is_active')
                  .eq('user_id', newUser.id)
                  .single()
                  .then(({ data: producerData, error }) => {
                    if (error) {
                      // Solo loggear errores reales, no "no encontrado" (PGRST116)
                      if (error.code !== 'PGRST116') {
                        console.error('❌ [useAuth] Error obteniendo productora:', error)
                      }
                      setProducer(null)
                      authCache = { user: newUser, profile: data, producer: null, timestamp: Date.now() }
                    } else {
                      const producer = producerData || null
                      setProducer(producer)
                      authCache = { user: newUser, profile: data, producer, timestamp: Date.now() }
                    }
                  })
              } else {
                setProducer(null)
                authCache = { user: newUser, profile: data, producer: null, timestamp: Date.now() }
              }
            }
          })
      } else {
        setProfile(null)
        setProducer(null)
        authCache = { user: null, profile: null, producer: null, timestamp: Date.now() }
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const signOut = async () => {
    // Limpiar cache al cerrar sesión
    authCache = null
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const isProducerActiveValue = producer ? producer.is_active === true : undefined

  return {
    user,
    profile,
    producer,
    loading,
    signOut,
    isAuthenticated: !!user,
    isProducer: profile?.role === 'producer',
    // Solo es "activa" si producer existe Y is_active es true
    // Si producer es null, aún se está cargando, no sabemos el estado
    isProducerActive: isProducerActiveValue,
    isAdmin: profile?.role === 'admin',
  }
}
