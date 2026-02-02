import { NextRequest, NextResponse } from 'next/server'
import { createPaymentPreference } from '@/lib/mercadopago'

/**
 * Endpoint de prueba para crear una preferencia y verificar qué URL se genera
 * 
 * Accede a: GET /api/mercadopago/test-preference
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar que el token esté configurado
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      return NextResponse.json({
        success: false,
        error: 'MERCADOPAGO_ACCESS_TOKEN no está configurado',
      }, { status: 500 })
    }

    console.log('🧪 Creando preferencia de prueba...')

    // Crear una preferencia de prueba mínima
    const preference = await createPaymentPreference({
      items: [
        {
          id: 'test-item',
          title: 'Test Payment',
          quantity: 1,
          unit_price: 100,
        },
      ],
      payer: {
        email: 'test@example.com',
      },
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/success`,
        failure: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout?error=payment_failed`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/success?status=pending`,
      },
    })

    // Analizar qué URLs tenemos
    const hasSandbox = !!preference.sandbox_init_point
    const hasProduction = !!preference.init_point
    const recommendedUrl = preference.sandbox_init_point || preference.init_point

    return NextResponse.json({
      success: true,
      preferenceId: preference.id,
      urls: {
        hasSandboxUrl: hasSandbox,
        hasProductionUrl: hasProduction,
        sandboxUrl: preference.sandbox_init_point || null,
        productionUrl: preference.init_point || null,
        recommendedUrl: recommendedUrl || null,
      },
      analysis: {
        isUsingSandbox: hasSandbox,
        shouldUseSandbox: hasSandbox, // Siempre preferir sandbox si está disponible
        urlType: hasSandbox ? 'sandbox' : hasProduction ? 'production' : 'none',
        recommendation: hasSandbox 
          ? '✅ Usar sandbox_init_point para pagos de prueba'
          : hasProduction
          ? '⚠️ Solo hay URL de producción. El token puede no ser de prueba.'
          : '❌ No hay URLs disponibles. Verifica el token.',
      },
      message: hasSandbox
        ? '✅ Preferencia creada correctamente. Sandbox disponible.'
        : hasProduction
        ? '⚠️ Preferencia creada pero NO hay sandbox. Solo producción disponible.'
        : '❌ Error: No se generaron URLs de pago.',
    })
  } catch (error: any) {
    console.error('❌ Error creando preferencia de prueba:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Error desconocido',
      errorDetails: {
        status: error.status || error.statusCode,
        code: error.code,
        message: error.message,
      },
    }, { status: 500 })
  }
}
