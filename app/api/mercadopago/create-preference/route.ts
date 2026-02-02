import { NextRequest, NextResponse } from 'next/server'
import { createPaymentPreference } from '@/lib/mercadopago'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  console.log('🚀 POST /api/mercadopago/create-preference recibido')
  
  try {
    // Validar que el request tenga body
    let body
    try {
      body = await request.json()
      console.log('✅ Body parseado correctamente')
    } catch (parseError) {
      console.error('❌ Error parseando JSON del request:', parseError)
      return NextResponse.json(
        { error: 'Error en el formato de la solicitud' },
        { status: 400 }
      )
    }

    const { tickets, eventId, buyerEmail, buyerName, buyerPhone, purchaseId } = body

    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return NextResponse.json(
        { error: 'Tickets requeridos' },
        { status: 400 }
      )
    }

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID requerido' },
        { status: 400 }
      )
    }

    if (!purchaseId) {
      return NextResponse.json(
        { error: 'Purchase ID requerido' },
        { status: 400 }
      )
    }

    // Obtener información del evento
    const supabase = await createClient()
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('name, slug')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Evento no encontrado' },
        { status: 404 }
      )
    }

    // Construir items para Mercado Pago
    const items = tickets.map((ticket: any, index: number) => {
      const basePrice = Number(ticket.basePrice) || 0
      const unitPrice = basePrice + (basePrice * 0.15) // Precio con comisión incluida
      
      // Validar que el precio sea válido
      if (unitPrice <= 0) {
        throw new Error(`Precio inválido para ticket ${ticket.ticketTypeName}: ${unitPrice}`)
      }
      
      // Mercado Pago espera precios en la moneda base (ARS)
      // Redondear a 2 decimales
      const finalPrice = Math.round(unitPrice * 100) / 100
      
      console.log(`💰 Precio procesado para ${ticket.ticketTypeName}:`, {
        basePrice: basePrice,
        unitPriceWithCommission: unitPrice,
        finalPrice: finalPrice,
      })
      
      return {
        id: `${ticket.ticketTypeId}-${index}`, // ID único para cada item
        title: `${ticket.ticketTypeName} - ${event.name}`.substring(0, 256), // Limitar longitud del título
        quantity: Number(ticket.quantity) || 1,
        unit_price: finalPrice, // Precio en ARS
      }
    })

    // Calcular total
    const totalAmount = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0)

    // Validar Access Token antes de continuar
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      console.error('❌ MERCADOPAGO_ACCESS_TOKEN no está configurado')
      return NextResponse.json(
        { error: 'Mercado Pago no está configurado. Contacta al administrador.' },
        { status: 500 }
      )
    }

    // Crear preferencia de pago
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    // Preparar datos del payer con validación
    const buyerNameParts = buyerName?.trim().split(/\s+/) || []
    const firstName = buyerNameParts[0] || undefined
    const lastName = buyerNameParts.slice(1).join(' ') || undefined

    // Validar y formatear teléfono
    // Formato esperado: +54 11 1234-5678 o 541112345678 o 11 1234-5678
    let phoneData: { area_code?: string; number?: string } | undefined = undefined
    if (buyerPhone) {
      const cleanPhone = buyerPhone.replace(/\D/g, '')
      console.log(`📞 Teléfono original: ${buyerPhone}, limpio: ${cleanPhone}, longitud: ${cleanPhone.length}`)
      
      let phoneNumber = cleanPhone
      
      // Si empieza con 54 (código de país de Argentina), quitarlo
      if (phoneNumber.startsWith('54')) {
        phoneNumber = phoneNumber.substring(2)
        console.log(`📞 Después de quitar código de país (54): ${phoneNumber}`)
        
        // Si después del 54 hay un 9 (prefijo móvil en Argentina), quitarlo también
        // Formato: +54 9 11 1234-5678 -> después de quitar 54: 91112345678 -> después de quitar 9: 1112345678
        if (phoneNumber.startsWith('9')) {
          phoneNumber = phoneNumber.substring(1)
          console.log(`📞 Después de quitar prefijo móvil (9): ${phoneNumber}`)
        }
      }
      
      // Si empieza con 0, quitarlo (011 -> 11)
      if (phoneNumber.startsWith('0')) {
        phoneNumber = phoneNumber.substring(1)
        console.log(`📞 Después de quitar 0 inicial: ${phoneNumber}`)
      }
      
      // Ahora deberíamos tener: código de área (2-4 dígitos) + número (6-8 dígitos)
      // Códigos de área comunes en Argentina:
      // - 2 dígitos: 11 (CABA), 15, 20, 22, 23, 24, 26, 27, 28, 29, 34, 35, 36, 37, 38, etc.
      // - 3 dígitos: 221 (La Plata), 261 (Mendoza), 341 (Rosario), etc.
      // - 4 dígitos: 0221, 0261, etc. (con 0 inicial)
      
      // Códigos de área válidos de 2 dígitos en Argentina
      const validAreaCodes2 = ['11', '15', '20', '22', '23', '24', '26', '27', '28', '29', '34', '35', '36', '37', '38', '41', '42', '43', '44', '45', '46', '47', '48', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '70', '71', '72', '73', '74', '75', '76', '77', '78', '79', '80', '81', '82', '83', '84', '85', '86', '87', '88', '89', '90', '92', '93', '94', '95', '96', '97', '98', '99']
      
      if (phoneNumber.length >= 8 && phoneNumber.length <= 12) {
        // PRIORIZAR códigos de área de 2 dígitos válidos (más común)
        // Ejemplo: +5491123185976 -> después de quitar 54: 91123185976
        // Pero debería ser: 11 (código de área) + 23185976 (número)
        // El problema es que hay un 9 extra al principio
        
        // Si el número empieza con 9 y luego tiene un código de área válido de 2 dígitos, quitamos el 9
        if (phoneNumber.startsWith('9') && phoneNumber.length >= 9) {
          const without9 = phoneNumber.substring(1)
          const possibleAreaCode2 = without9.substring(0, 2)
          
          if (validAreaCodes2.includes(possibleAreaCode2)) {
            const number = without9.substring(2)
            if (number.length >= 6 && number.length <= 9) {
              phoneData = {
                area_code: possibleAreaCode2,
                number: number,
              }
              console.log(`✅ Teléfono formateado (quitando 9 inicial): código de área ${possibleAreaCode2}, número ${number}`)
            }
          }
        }
        
        // Si no se encontró, intentar con código de área de 2 dígitos directamente
        if (!phoneData) {
          const areaCode2 = phoneNumber.substring(0, 2)
          const number2 = phoneNumber.substring(2)
          
          if (validAreaCodes2.includes(areaCode2) && number2.length >= 6 && number2.length <= 9) {
            phoneData = {
              area_code: areaCode2,
              number: number2,
            }
            console.log(`✅ Teléfono formateado: código de área ${areaCode2}, número ${number2}`)
          }
        }
        
        // Si aún no se encontró, intentar con 3 dígitos
        if (!phoneData && phoneNumber.length >= 9) {
          const areaCode3 = phoneNumber.substring(0, 3)
          const number3 = phoneNumber.substring(3)
          
          if (number3.length >= 6 && number3.length <= 9) {
            phoneData = {
              area_code: areaCode3,
              number: number3,
            }
            console.log(`✅ Teléfono formateado (código de 3 dígitos): código de área ${areaCode3}, número ${number3}`)
          }
        }
        
        if (!phoneData) {
          console.warn(`⚠️ No se pudo formatear el teléfono. Longitud total: ${phoneNumber.length}, número: ${phoneNumber}`)
        }
      } else {
        console.warn(`⚠️ Teléfono muy corto o muy largo. Longitud después de limpiar: ${phoneNumber.length} (requiere 8-12 dígitos)`)
      }
    }
    
    // Si el teléfono no se pudo formatear correctamente, no enviarlo
    // Mercado Pago puede rechazar pagos con teléfonos mal formateados
    if (phoneData && (!phoneData.area_code || !phoneData.number || phoneData.number.length < 6)) {
      console.warn('⚠️ Teléfono mal formateado. No se enviará a Mercado Pago para evitar errores.')
      phoneData = undefined
    }

    console.log('👤 Datos del payer:', {
      email: buyerEmail,
      firstName,
      lastName,
      hasPhone: !!phoneData,
      phoneAreaCode: phoneData?.area_code,
      phoneNumber: phoneData?.number ? phoneData.number.substring(0, 3) + '...' : undefined,
    })

    console.log('📦 Items que se enviarán a Mercado Pago:', items.map(item => ({
      id: item.id,
      title: item.title.substring(0, 50) + '...',
      quantity: item.quantity,
      unit_price: item.unit_price,
    })))

    console.log('📦 Creando preferencia de Mercado Pago:', {
      itemsCount: items.length,
      totalAmount,
      buyerEmail,
      purchaseId,
      appUrl,
      accessTokenPrefix: process.env.MERCADOPAGO_ACCESS_TOKEN?.substring(0, 20) + '...', // Solo primeros caracteres por seguridad
    })
    
    // Preparar datos exactos que se enviarán
    const preferenceData = {
      items,
      payer: {
        email: buyerEmail,
        name: firstName,
        surname: lastName,
        phone: phoneData,
      },
      back_urls: {
        success: `${appUrl}/checkout/success?purchaseId=${purchaseId}`,
        failure: `${appUrl}/checkout?error=payment_failed&purchaseId=${purchaseId}`,
        pending: `${appUrl}/checkout/success?purchaseId=${purchaseId}&status=pending`,
      },
      auto_return: 'approved' as const,
      external_reference: purchaseId,
      notification_url: `${appUrl}/api/mercadopago/webhook`,
    }

    console.log('📤 Datos exactos que se enviarán a Mercado Pago:', JSON.stringify({
      ...preferenceData,
      payer: {
        ...preferenceData.payer,
        phone: phoneData ? { area_code: phoneData.area_code, number: phoneData.number?.substring(0, 3) + '...' } : undefined,
      },
    }, null, 2))
    
    const preference = await createPaymentPreference(preferenceData)

    // IMPORTANTE: Según la documentación y casos reales, cuando usas credenciales de prueba
    // del vendedor de prueba, debes usar la URL de PRODUCCIÓN (init_point), NO sandbox
    // Esto es porque las cuentas de prueba funcionan con el entorno de producción
    // 
    // Si tienes sandbox_init_point disponible, puedes usarlo, pero si estás usando
    // credenciales de prueba del vendedor de prueba, usa init_point
    const isTestToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.startsWith('TEST-')
    
    // Si es un token de prueba (TEST-), usar init_point (producción)
    // Si es un token de producción (APP_USR-), también usar init_point
    // Solo usar sandbox_init_point si explícitamente necesitas sandbox
    const paymentUrl = (isTestToken || !preference.sandbox_init_point) 
      ? preference.init_point 
      : preference.sandbox_init_point || preference.init_point

    console.log('🔗 URLs de pago disponibles:', {
      hasSandboxInitPoint: !!preference.sandbox_init_point,
      hasInitPoint: !!preference.init_point,
      isTestToken,
      sandboxUrl: preference.sandbox_init_point?.substring(0, 50) + '...',
      initUrl: preference.init_point?.substring(0, 50) + '...',
      usingUrl: paymentUrl?.substring(0, 50) + '...',
      isUsingSandbox: paymentUrl === preference.sandbox_init_point,
      recommendation: isTestToken 
        ? 'Usando init_point (producción) porque el token es de prueba (TEST-)' 
        : preference.sandbox_init_point 
        ? 'Sandbox disponible, pero usando init_point según mejores prácticas' 
        : 'Usando init_point (producción)',
    })

    // Advertencia si estamos en desarrollo
    if (process.env.NODE_ENV === 'development') {
      if (isTestToken) {
        console.log('ℹ️ Token de prueba detectado (TEST-). Usando URL de producción (init_point) según mejores prácticas.')
      } else if (!preference.init_point) {
        console.warn('⚠️ ADVERTENCIA: No se obtuvo init_point. Verifica tus credenciales.')
      }
    }

    return NextResponse.json({
      success: true,
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
      paymentUrl, // URL correcta según el modo (prueba o producción)
    })
  } catch (error: any) {
    console.error('❌ Error creando preferencia de Mercado Pago:', error)
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      status: error?.status,
      statusCode: error?.statusCode,
      response: error?.response,
    })
    
    // Asegurar que siempre devolvemos JSON, nunca HTML
    const errorMessage = error?.message || 'Error creando preferencia de pago'
    const errorStatus = error?.status || error?.statusCode || 500
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: errorStatus >= 400 && errorStatus < 600 ? errorStatus : 500 }
    )
  }
}
