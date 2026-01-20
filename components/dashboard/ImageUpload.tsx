'use client'

import { useState, useRef, DragEvent, ChangeEvent, forwardRef, useImperativeHandle, useEffect } from 'react'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ImageUploadProps {
  onFileSelect?: (file: File | null) => void // Nueva prop para pasar el archivo sin subir
  onUploadComplete?: (url: string) => void // Mantener para compatibilidad
  onRemove: () => void
  currentImageUrl?: string | null
  folder?: string
  maxSizeMB?: number
  uploadImmediately?: boolean // Si true, sube inmediatamente (comportamiento anterior)
}

export interface ImageUploadRef {
  upload: () => Promise<string | null>
  hasFile: () => boolean
}

const ImageUpload = forwardRef<ImageUploadRef, ImageUploadProps>(({
  onFileSelect,
  onUploadComplete,
  onRemove,
  currentImageUrl,
  folder = 'event-flyers',
  maxSizeMB = 1,
  uploadImmediately = false,
}, ref) => {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const selectedFileRef = useRef<File | null>(null) // Ref para mantener el valor actualizado
  const supabase = createClient()

  // Sincronizar preview con currentImageUrl cuando cambia (pero solo si no hay selectedFile)
  useEffect(() => {
    if (!selectedFileRef.current && currentImageUrl) {
      setPreview(currentImageUrl)
      // Asegurarse de que el ref esté limpio cuando hay una imagen existente
      selectedFileRef.current = null
    }
  }, [currentImageUrl])

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const validateFile = (file: File): string | null => {
    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return 'Solo se permiten imágenes JPG, PNG o WEBP'
    }

    // Validar tamaño
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return `La imagen no puede ser mayor a ${maxSizeMB}MB`
    }

    return null
  }

  const processFile = async (file: File) => {
    setError(null)

    // Validar archivo
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    // Guardar archivo en estado Y en ref PRIMERO (importante para hasFile())
    setSelectedFile(file)
    selectedFileRef.current = file // Actualizar ref también
    console.log('📁 Archivo seleccionado:', file.name, file.size, 'bytes')
    console.log('✅ selectedFileRef.current actualizado:', selectedFileRef.current ? selectedFileRef.current.name : 'null')

    // Crear preview local del nuevo archivo
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Si uploadImmediately es true, subir inmediatamente (comportamiento anterior)
    if (uploadImmediately) {
      await uploadFileToStorage(file)
    } else {
      // Solo notificar al padre que hay un archivo seleccionado (sin subir)
      if (onFileSelect) {
        onFileSelect(file)
      }
    }
  }

  const uploadFileToStorage = async (file: File): Promise<string | null> => {
    setUploading(true)
    try {
      // Generar nombre único para el archivo
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${folder}/${fileName}`

      // Subir a Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('event-flyers')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error('Error subiendo imagen:', uploadError)
        setError(uploadError.message || 'Error al subir la imagen')
        setUploading(false)
        return null
      }

      // Obtener URL pública
      const {
        data: { publicUrl },
      } = supabase.storage.from('event-flyers').getPublicUrl(filePath)

      setUploading(false)
      return publicUrl
    } catch (err) {
      console.error('Error inesperado:', err)
      setError('Error inesperado al subir la imagen')
      setUploading(false)
      return null
    }
  }

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      await processFile(files[0])
    }
  }

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      await processFile(files[0])
      // Resetear el input para permitir seleccionar el mismo archivo de nuevo
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = () => {
    setPreview(null)
    setSelectedFile(null)
    selectedFileRef.current = null // Limpiar ref también
    if (onFileSelect) {
      onFileSelect(null)
    }
    onRemove()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Exponer funciones al padre usando useImperativeHandle
  // IMPORTANTE: No usar dependencias para que el ref siempre tenga acceso al valor actual del selectedFileRef
  useImperativeHandle(ref, () => {
    console.log('🔄 useImperativeHandle ejecutado, selectedFileRef.current:', selectedFileRef.current ? selectedFileRef.current.name : 'null')
    return {
      upload: async (): Promise<string | null> => {
        const file = selectedFileRef.current // Usar ref para obtener el valor actual
        console.log('📤 upload() llamado, archivo:', file ? file.name : 'null')
        if (!file) {
          console.log('ℹ️ No hay archivo nuevo, retornando URL existente:', currentImageUrl)
          return currentImageUrl || null
        }
        console.log('⬆️ Subiendo archivo al storage...')
        const url = await uploadFileToStorage(file)
        if (url && onUploadComplete) {
          console.log('✅ URL obtenida, notificando al padre:', url)
          onUploadComplete(url)
        }
        return url
      },
      hasFile: (): boolean => {
        const hasFile = selectedFileRef.current !== null // Usar ref para obtener el valor actual
        console.log('🔍 hasFile() llamado desde useImperativeHandle, resultado:', hasFile, selectedFileRef.current ? selectedFileRef.current.name : 'null')
        return hasFile
      },
    }
  }, []) // Sin dependencias para que siempre use el valor actual del ref

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4">
      {/* Input oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Preview de imagen existente o subida */}
      {preview && !uploading && (
        <div className="relative group">
          <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-[#2F2F2F] bg-mediumGray">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 p-2 bg-red-500/90 hover:bg-red-500 text-white rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Área de drag & drop */}
      {!preview && (
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          className={`
            relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
            transition-all duration-300
            ${
              isDragging
                ? 'border-[#A855F7] bg-[#A855F7]/10 scale-[1.02]'
                : 'border-white/20 hover:border-[#A855F7]/50 hover:bg-white/5'
            }
            ${uploading ? 'pointer-events-none opacity-50' : ''}
          `}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-[#A855F7] animate-spin" />
              <p className="text-lightGray font-semibold uppercase tracking-wide">
                Subiendo imagen...
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-[#A855F7]/20 rounded-full">
                {isDragging ? (
                  <Upload className="w-8 h-8 text-[#A855F7]" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-[#A855F7]" />
                )}
              </div>
              <div>
                <p className="text-white font-semibold mb-2 uppercase tracking-wide">
                  {isDragging ? 'Suelta la imagen aquí' : 'Arrastra y suelta tu imagen aquí'}
                </p>
                <p className="text-lightGray text-sm">
                  o haz clic para seleccionar
                </p>
                <p className="text-lightGray text-xs mt-2">
                  JPG, PNG o WEBP (máx. {maxSizeMB}MB)
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mensaje de error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Botón para cambiar imagen si ya hay una */}
      {preview && !uploading && (
        <button
          type="button"
          onClick={handleClick}
          className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all duration-300 text-white font-semibold uppercase tracking-wide text-sm"
        >
          Cambiar Imagen
        </button>
      )}
    </div>
  )
})

ImageUpload.displayName = 'ImageUpload'

export default ImageUpload
