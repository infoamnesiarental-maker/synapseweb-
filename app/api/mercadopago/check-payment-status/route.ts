import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * API Route para verificar el estado de un pago en Mercado Pago
 * 
 * Se usa cuando el usuario vuelve de Mercado Pago y el webhook aún no llegó
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { purchaseId } = body

    if (!purchaseId) {
      return NextResponse.json(
        { error: 'purchaseId es requerido' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Obtener la compra (incluyendo payment_provider_data para preservar tickets_data)
    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .select('payment_provider_id, payment_status, payment_provider_data')
      .eq('id', purchaseId)
      .single()

    if (purchaseError || !purchase) {
      return NextResponse.json(
        { error: 'Compra no encontrada' },
        { status: 404 }
      )
    }

    // Preservar tickets_data antes de actualizar payment_provider_data
    // Esto es crítico: si el webhook aún no llegó, tickets_data debe preservarse
    const ticketsData = (purchase.payment_provider_data as any)?.tickets_data

    const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN

    if (!mpAccessToken) {
      return NextResponse.json(
        { error: 'Mercado Pago no está configurado' },
        { status: 500 }
      )
    }

    let payment: any = null

    // Si ya tiene payment_provider_id, consultar directamente
    if (purchase.payment_provider_id) {
      const paymentResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${purchase.payment_provider_id}`,
        {
          headers: {
            'Authorization': `Bearer ${mpAccessToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (paymentResponse.ok) {
        payment = await paymentResponse.json()
      }
    } else {
      // Si no tiene payment_provider_id, buscar pagos recientes con este external_reference
      // Mercado Pago puede crear un pago incluso si fue rechazado
      const searchResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/search?external_reference=${purchaseId}&sort=date_created&criteria=desc&limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${mpAccessToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (searchResponse.ok) {
        const searchData = await searchResponse.json()
        if (searchData.results && searchData.results.length > 0) {
          payment = searchData.results[0]
        }
      }
    }

    // Si encontramos un pago, actualizar el estado
    if (payment) {
      // Mapear estados de Mercado Pago a nuestros estados
      let paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded' = 'pending'

      if (payment.status === 'approved') {
        paymentStatus = 'completed'
      } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
        paymentStatus = 'failed'
      } else if (payment.status === 'refunded' || payment.status === 'charged_back') {
        paymentStatus = 'refunded'
      }

      // Si el estado cambió, actualizar en la base de datos
      if (paymentStatus !== purchase.payment_status) {
        // Preservar tickets_data al actualizar payment_provider_data
        // Esto evita que se pierda la información necesaria para crear tickets cuando llegue el webhook
        const updatedPaymentProviderData: any = {
          ...payment,
        }
        
        // Solo preservar tickets_data si existe (puede ser null si el webhook ya lo procesó)
        if (ticketsData) {
          updatedPaymentProviderData.tickets_data = ticketsData
        }

        await supabase
          .from('purchases')
          .update({
            payment_status: paymentStatus,
            payment_provider_id: payment.id?.toString() || purchase.payment_provider_id,
            payment_provider_data: updatedPaymentProviderData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', purchaseId)

        return NextResponse.json({
          success: true,
          paymentStatus,
          updated: true,
          payment,
        })
      }

      return NextResponse.json({
        success: true,
        paymentStatus,
        updated: false,
      })
    }

    // Si no encontramos pago, el estado actual es correcto
    return NextResponse.json({
      success: true,
      paymentStatus: purchase.payment_status,
      updated: false,
    })
  } catch (error: any) {
    console.error('Error verificando estado de pago:', error)
    return NextResponse.json(
      { error: error.message || 'Error verificando estado de pago' },
      { status: 500 }
    )
  }
}
