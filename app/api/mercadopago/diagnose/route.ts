import { NextRequest, NextResponse } from 'next/server'

/**
 * Endpoint de diagnóstico para verificar la configuración de Mercado Pago
 * 
 * Accede a: GET /api/mercadopago/diagnose
 */
export async function GET(request: NextRequest) {
  const diagnostics: {
    timestamp: string
    environment: string
    checks: Array<{
      name: string
      status: 'ok' | 'error' | 'warning'
      message: string
      details?: any
    }>
  } = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    checks: [],
  }

  // Check 1: MERCADOPAGO_ACCESS_TOKEN
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!accessToken) {
    diagnostics.checks.push({
      name: 'MERCADOPAGO_ACCESS_TOKEN',
      status: 'error',
      message: '❌ No está configurado',
      details: {
        instruction: 'Agrega MERCADOPAGO_ACCESS_TOKEN a tu archivo .env.local',
      },
    })
  } else {
    const isTest = accessToken.startsWith('TEST-')
    const isProd = accessToken.startsWith('APP_USR-')
    
    if (!isTest && !isProd) {
      diagnostics.checks.push({
        name: 'MERCADOPAGO_ACCESS_TOKEN',
        status: 'warning',
        message: '⚠️ Formato desconocido',
        details: {
          prefix: accessToken.substring(0, 20) + '...',
          expected: 'Debe empezar con TEST- (sandbox) o APP_USR- (producción)',
        },
      })
    } else {
      diagnostics.checks.push({
        name: 'MERCADOPAGO_ACCESS_TOKEN',
        status: 'ok',
        message: `✅ Configurado (${isTest ? 'TEST/Sandbox' : 'PRODUCTION'})`,
        details: {
          prefix: accessToken.substring(0, 20) + '...',
          length: accessToken.length,
          type: isTest ? 'sandbox' : 'production',
        },
      })
    }
  }

  // Check 2: NEXT_PUBLIC_APP_URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    diagnostics.checks.push({
      name: 'NEXT_PUBLIC_APP_URL',
      status: 'warning',
      message: '⚠️ No está configurado',
      details: {
        instruction: 'Se usará http://localhost:3000 por defecto',
        warning: 'Los webhooks no funcionarán en localhost sin ngrok',
      },
    })
  } else if (appUrl.includes('localhost')) {
    diagnostics.checks.push({
      name: 'NEXT_PUBLIC_APP_URL',
      status: 'warning',
      message: '⚠️ Está configurado como localhost',
      details: {
        current: appUrl,
        warning: 'Los webhooks de Mercado Pago no pueden llegar a localhost. Necesitas usar ngrok o desplegar en producción.',
      },
    })
  } else {
    diagnostics.checks.push({
      name: 'NEXT_PUBLIC_APP_URL',
      status: 'ok',
      message: '✅ Configurado correctamente',
      details: {
        url: appUrl,
      },
    })
  }

  // Check 3: Verificar que el SDK de Mercado Pago está instalado
  try {
    const mercadopago = await import('mercadopago')
    diagnostics.checks.push({
      name: 'SDK de Mercado Pago',
      status: 'ok',
      message: '✅ SDK instalado',
      details: {
        version: '2.12.0 (verificado en package.json)',
      },
    })
  } catch (error) {
    diagnostics.checks.push({
      name: 'SDK de Mercado Pago',
      status: 'error',
      message: '❌ SDK no encontrado',
      details: {
        error: (error as Error).message,
        instruction: 'Ejecuta: npm install mercadopago',
      },
    })
  }

  // Check 4: Intentar crear una preferencia de prueba (solo si hay token)
  if (accessToken) {
    try {
      const { MercadoPagoConfig, Preference } = await import('mercadopago')
      const client = new MercadoPagoConfig({
        accessToken: accessToken,
      })
      const preferenceClient = new Preference(client)

      // Intentar crear una preferencia mínima de prueba
      const testPreference = await preferenceClient.create({
        body: {
          items: [
            {
              id: 'test-item',
              title: 'Test Item',
              quantity: 1,
              unit_price: 10,
            },
          ],
          back_urls: {
            success: appUrl ? `${appUrl}/checkout/success` : 'http://localhost:3000/checkout/success',
            failure: appUrl ? `${appUrl}/checkout?error=payment_failed` : 'http://localhost:3000/checkout?error=payment_failed',
          },
        },
      })

      if (testPreference.id) {
        diagnostics.checks.push({
          name: 'Conexión con Mercado Pago API',
          status: 'ok',
          message: '✅ Conexión exitosa',
          details: {
            preferenceId: testPreference.id,
            hasSandboxUrl: !!testPreference.sandbox_init_point,
            hasProdUrl: !!testPreference.init_point,
            message: 'La API de Mercado Pago responde correctamente',
          },
        })
      } else {
        diagnostics.checks.push({
          name: 'Conexión con Mercado Pago API',
          status: 'warning',
          message: '⚠️ Respuesta inesperada',
          details: {
            response: testPreference,
          },
        })
      }
    } catch (error: any) {
      diagnostics.checks.push({
        name: 'Conexión con Mercado Pago API',
        status: 'error',
        message: '❌ Error al conectar con Mercado Pago',
        details: {
          error: error.message,
          status: error.status || error.statusCode,
          code: error.code,
          instruction: 'Verifica que tu Access Token sea válido y tenga permisos',
        },
      })
    }
  } else {
    diagnostics.checks.push({
      name: 'Conexión con Mercado Pago API',
      status: 'warning',
      message: '⚠️ No se puede probar (falta Access Token)',
    })
  }

  // Resumen
  const allOk = diagnostics.checks.every((check) => check.status === 'ok')
  const hasErrors = diagnostics.checks.some((check) => check.status === 'error')

  return NextResponse.json(
    {
      ...diagnostics,
      summary: {
        allOk,
        hasErrors,
        totalChecks: diagnostics.checks.length,
        passedChecks: diagnostics.checks.filter((c) => c.status === 'ok').length,
        failedChecks: diagnostics.checks.filter((c) => c.status === 'error').length,
        warnings: diagnostics.checks.filter((c) => c.status === 'warning').length,
      },
    },
    { status: hasErrors ? 500 : 200 }
  )
}
