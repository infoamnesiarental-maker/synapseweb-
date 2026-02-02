import { NextRequest, NextResponse } from 'next/server'
import { createPaymentPreference } from '@/lib/mercadopago'

/**
 * Endpoint de debug para crear una preferencia y ver exactamente qué se envía
 * 
 * Accede a: POST /api/mercadopago/debug-preference
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Construir los datos exactos que se enviarían en el flujo real
    const items = body.items || [
      {
        id: 'test-item',
        title: 'Test Item',
        quantity: 1,
        unit_price: 100,
      },
    ]

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    const preferenceParams = {
      items,
      payer: body.payer || {
        email: body.buyerEmail || 'test@example.com',
        name: body.buyerName?.split(' ')[0] || undefined,
        surname: body.buyerName?.split(' ').slice(1).join(' ') || undefined,
        phone: body.buyerPhone ? {
          area_code: body.buyerPhone.replace(/\D/g, '').substring(0, 2) || undefined,
          number: body.buyerPhone.replace(/\D/g, '').substring(2) || undefined,
        } : undefined,
      },
      back_urls: {
        success: `${appUrl}/checkout/success?purchaseId=${body.purchaseId || 'test'}`,
        failure: `${appUrl}/checkout?error=payment_failed&purchaseId=${body.purchaseId || 'test'}`,
        pending: `${appUrl}/checkout/success?purchaseId=${body.purchaseId || 'test'}&status=pending`,
      },
      auto_return: 'approved',
      external_reference: body.purchaseId || 'test',
      notification_url: `${appUrl}/api/mercadopago/webhook`,
    }

    console.log('🔍 DEBUG: Datos que se enviarán a Mercado Pago:', JSON.stringify(preferenceParams, null, 2))

    const preference = await createPaymentPreference(preferenceParams)

    return NextResponse.json({
      success: true,
      preferenceId: preference.id,
      sentData: preferenceParams,
      receivedData: {
        id: preference.id,
        sandbox_init_point: preference.sandbox_init_point,
        init_point: preference.init_point,
        status: (preference as any).status,
        items: preference.items,
        payer: preference.payer,
      },
      analysis: {
        hasSandboxUrl: !!preference.sandbox_init_point,
        hasProductionUrl: !!preference.init_point,
        recommendedUrl: preference.sandbox_init_point || preference.init_point,
        potentialIssues: [],
      },
    })
  } catch (error: any) {
    console.error('❌ Error en debug:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      errorDetails: {
        status: error.status || error.statusCode,
        code: error.code,
        response: error.response || error.cause,
      },
    }, { status: 500 })
  }
}
