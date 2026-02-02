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
    // idempotencyKey se genera automáticamente si no se especifica
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
    const body = {
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
    }

    console.log('📡 Enviando a Mercado Pago API:', JSON.stringify({
      ...body,
      payer: body.payer ? {
        ...body.payer,
        phone: body.payer.phone ? {
          area_code: body.payer.phone.area_code,
          number: body.payer.phone.number?.substring(0, 3) + '...',
        } : undefined,
      } : undefined,
    }, null, 2))

    const preference = await preferenceClient.create({ body })

    // Validar que la preferencia tenga al menos una URL de pago
    if (!preference.init_point && !preference.sandbox_init_point) {
      console.error('Preferencia creada sin URLs de pago:', preference)
      throw new Error('La preferencia de pago no tiene URLs de pago válidas')
    }

    return preference
  } catch (error: any) {
    console.error('Error creando preferencia de Mercado Pago:', error)
    
    // Mejorar mensajes de error según el tipo
    if (error.status === 401 || error.statusCode === 401) {
      throw new Error('Credenciales de Mercado Pago inválidas. Verifica tu Access Token.')
    } else if (error.status === 400 || error.statusCode === 400) {
      throw new Error(`Error en los datos de la preferencia: ${error.message || JSON.stringify(error)}`)
    } else if (error.message) {
      throw new Error(`Error creando preferencia de pago: ${error.message}`)
    } else {
      throw new Error(`Error creando preferencia de pago: ${JSON.stringify(error)}`)
    }
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
