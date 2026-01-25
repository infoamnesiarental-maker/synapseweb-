import { MercadoPagoConfig, Preference } from 'mercadopago'

// Cliente de Mercado Pago (server-side)
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN

if (!accessToken) {
  console.warn('⚠️ MERCADOPAGO_ACCESS_TOKEN no está configurado')
}

const client = new MercadoPagoConfig({
  accessToken: accessToken || '',
  options: {
    timeout: 5000,
    idempotencyKey: 'abc',
  },
})

export const preferenceClient = new Preference(client)

export interface CreatePreferenceParams {
  items: Array<{
    id: string
    title: string
    quantity: number
    unit_price: number
  }>
  payer?: {
    name?: string
    surname?: string
    email: string
    phone?: {
      area_code?: string
      number?: string
    }
  }
  back_urls?: {
    success?: string
    failure?: string
    pending?: string
  }
  auto_return?: 'approved' | 'all'
  external_reference?: string
  notification_url?: string
}

/**
 * Crea una preferencia de pago en Mercado Pago
 */
export async function createPaymentPreference(params: CreatePreferenceParams) {
  if (!accessToken) {
    throw new Error('Mercado Pago no está configurado. Verifica MERCADOPAGO_ACCESS_TOKEN')
  }

  try {
    const preference = await preferenceClient.create({
      body: {
        items: params.items,
        payer: params.payer,
        back_urls: params.back_urls || {
          success: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/success`,
          failure: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout?error=payment_failed`,
          pending: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/success?status=pending`,
        },
        auto_return: params.auto_return || 'approved',
        external_reference: params.external_reference,
        notification_url: params.notification_url || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/mercadopago/webhook`,
      },
    })

    return preference
  } catch (error: any) {
    console.error('Error creando preferencia de Mercado Pago:', error)
    throw new Error(`Error creando preferencia de pago: ${error.message || 'Error desconocido'}`)
  }
}

/**
 * Obtiene información de un pago por su ID
 */
export async function getPayment(paymentId: string) {
  if (!accessToken) {
    throw new Error('Mercado Pago no está configurado')
  }

  try {
    // Necesitaríamos el cliente de Payment, pero por ahora solo usamos Preference
    // Esto se puede expandir si necesitamos consultar pagos específicos
    return null
  } catch (error: any) {
    console.error('Error obteniendo pago:', error)
    throw error
  }
}
