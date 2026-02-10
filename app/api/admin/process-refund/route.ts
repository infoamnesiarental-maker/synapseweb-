import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * API Route para procesar reembolsos en Mercado Pago
 * 
 * Solo admins pueden procesar reembolsos
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { refundId, refundType, adminId } = body

    if (!refundId || !refundType || !adminId) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verificar que el usuario es admin
    const { data: adminProfile, error: adminError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', adminId)
      .single()

    if (adminError || adminProfile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      )
    }

    // Obtener información de la devolución
    const { data: refund, error: refundError } = await supabase
      .from('refunds')
      .select(`
        *,
        purchase:purchases(
          *,
          event:events(*)
        )
      `)
      .eq('id', refundId)
      .single()

    if (refundError || !refund) {
      return NextResponse.json(
        { error: 'Devolución no encontrada' },
        { status: 404 }
      )
    }

    const purchase = Array.isArray(refund.purchase) ? refund.purchase[0] : refund.purchase

    if (!purchase) {
      return NextResponse.json(
        { error: 'Compra no encontrada' },
        { status: 404 }
      )
    }

    // Verificar que el pago fue completado
    if (purchase.payment_status !== 'completed') {
      return NextResponse.json(
        { error: 'El pago no está completado, no se puede reembolsar' },
        { status: 400 }
      )
    }

    // Verificar que hay un payment_provider_id (ID de Mercado Pago)
    if (!purchase.payment_provider_id) {
      return NextResponse.json(
        { error: 'No se encontró ID de pago en Mercado Pago' },
        { status: 400 }
      )
    }

    // Procesar reembolso en Mercado Pago
    const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN

    if (!mpAccessToken) {
      return NextResponse.json(
        { error: 'Mercado Pago no está configurado' },
        { status: 500 }
      )
    }

    // Calcular monto a reembolsar
    const refundAmount = refund.refund_amount || purchase.total_amount

    // Crear reembolso en Mercado Pago
    const refundResponse = await fetch(`https://api.mercadopago.com/v1/payments/${purchase.payment_provider_id}/refunds`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: refundAmount,
      }),
    })

    if (!refundResponse.ok) {
      const errorData = await refundResponse.json()
      console.error('Error procesando reembolso en Mercado Pago:', errorData)
      return NextResponse.json(
        { error: `Error procesando reembolso: ${errorData.message || 'Error desconocido'}` },
        { status: 500 }
      )
    }

    const mpRefund = await refundResponse.json()

    // Actualizar estado de la devolución en nuestra BD
    const { error: updateError } = await supabase
      .from('refunds')
      .update({
        status: 'approved',
        processed_at: new Date().toISOString(),
        processed_by: adminId,
        refund_amount: refundAmount,
      })
      .eq('id', refundId)

    if (updateError) {
      console.error('Error actualizando devolución:', updateError)
      return NextResponse.json(
        { error: 'Error actualizando devolución' },
        { status: 500 }
      )
    }

    // Actualizar estado de los tickets a 'refunded'
    if (refund.ticket_id) {
      // Reembolso de un ticket específico
      await supabase
        .from('tickets')
        .update({ status: 'refunded' })
        .eq('id', refund.ticket_id)
    } else {
      // Reembolso de toda la compra
      await supabase
        .from('tickets')
        .update({ status: 'refunded' })
        .eq('purchase_id', purchase.id)
    }

    // Actualizar estado de la compra
    await supabase
      .from('purchases')
      .update({ payment_status: 'refunded' })
      .eq('id', purchase.id)

    // Marcar transferencia como 'cancelled' si existe
    const { data: transfer } = await supabase
      .from('transfers')
      .select('id, status')
      .eq('purchase_id', purchase.id)
      .maybeSingle()

    if (transfer && transfer.status !== 'cancelled') {
      await supabase
        .from('transfers')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', transfer.id)
      
      console.log(`✅ Transferencia ${transfer.id} marcada como 'cancelled' debido a reembolso`)
    }

    return NextResponse.json({
      success: true,
      refundId: refund.id,
      mpRefundId: mpRefund.id,
      amount: refundAmount,
    })
  } catch (error: any) {
    console.error('Error procesando reembolso:', error)
    return NextResponse.json(
      { error: error.message || 'Error procesando reembolso' },
      { status: 500 }
    )
  }
}
