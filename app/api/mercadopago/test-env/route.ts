import { NextRequest, NextResponse } from 'next/server'

/**
 * Endpoint de prueba para verificar que las variables de entorno se están leyendo correctamente
 * 
 * Accede a: GET /api/mercadopago/test-env
 */
export async function GET(request: NextRequest) {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  return NextResponse.json({
    success: true,
    env: {
      hasAccessToken: !!accessToken,
      accessTokenPrefix: accessToken ? accessToken.substring(0, 20) + '...' : 'NO CONFIGURADO',
      accessTokenLength: accessToken?.length || 0,
      accessTokenType: accessToken?.startsWith('TEST-') 
        ? 'sandbox' 
        : accessToken?.startsWith('APP_USR-') 
        ? 'production' 
        : 'unknown',
      hasAppUrl: !!appUrl,
      appUrl: appUrl || 'NO CONFIGURADO',
      nodeEnv: process.env.NODE_ENV,
    },
    message: accessToken 
      ? '✅ Variables de entorno configuradas correctamente' 
      : '❌ MERCADOPAGO_ACCESS_TOKEN no está disponible en el servidor',
  })
}
