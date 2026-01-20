/**
 * Utilidades para calcular precios con comisiones
 */

// Configuración de comisiones
export const COMMISSION_RATE = 0.15 // 15% de comisión sobre precio base

export interface PriceBreakdown {
  basePrice: number // Precio base de la productora
  commission: number // Comisión de Synapse (15% sobre base)
  totalPrice: number // Precio final que paga el cliente
}

/**
 * Calcula el precio final con comisión
 * 
 * @param basePrice Precio base establecido por la productora
 * @returns Desglose completo de precios
 */
export function calculatePrice(basePrice: number): PriceBreakdown {
  // Comisión sobre precio base
  const commission = basePrice * COMMISSION_RATE
  
  // Precio final (base + comisión)
  const totalPrice = basePrice + commission
  
  return {
    basePrice,
    commission: Math.round(commission),
    totalPrice: Math.round(totalPrice),
  }
}

/**
 * Calcula el precio total para múltiples tickets
 * 
 * @param tickets Array de { ticketTypeId, quantity, basePrice }
 * @returns Desglose total
 */
export function calculateTotalPrice(
  tickets: Array<{ ticketTypeId: string; quantity: number; basePrice: number }>
): PriceBreakdown {
  // Sumar todos los precios base
  const totalBasePrice = tickets.reduce(
    (sum, ticket) => sum + ticket.basePrice * ticket.quantity,
    0
  )
  
  return calculatePrice(totalBasePrice)
}

/**
 * Formatea el desglose de precios para mostrar al usuario
 */
export function formatPriceBreakdown(breakdown: PriceBreakdown): {
  basePrice: string
  commission: string
  totalPrice: string
} {
  return {
    basePrice: breakdown.basePrice.toLocaleString('es-AR'),
    commission: breakdown.commission.toLocaleString('es-AR'),
    totalPrice: breakdown.totalPrice.toLocaleString('es-AR'),
  }
}
