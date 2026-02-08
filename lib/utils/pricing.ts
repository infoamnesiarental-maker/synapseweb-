/**
 * Utilidades para calcular precios con comisiones y gastos operativos
 * Según Manual de Operaciones V1
 */

// Configuración de comisiones
export const COMMISSION_RATE = 0.15 // 15% de comisión sobre precio base

// Constantes de gastos operativos (según Manual V1)
export const OPERATING_COSTS_RATE = 0.0773 // 7.73% del total cobrado
export const MERCADOPAGO_COMMISSION_RATE = 0.0432 // 4.32% del total cobrado
export const IVA_COMMISSION_RATE = 0.0091 // 0.91% del total cobrado (IVA sobre comisión MP)
export const IIBB_RETENTION_RATE = 0.0250 // 2.50% del total cobrado (Buenos Aires)

// Plazo mínimo de liquidación (240 horas = 10 días)
export const MIN_SETTLEMENT_HOURS = 240

export interface PriceBreakdown {
  basePrice: number // Precio base de la productora
  commission: number // Comisión de Synapse (15% sobre base)
  totalPrice: number // Precio final que paga el cliente
}

export interface OperatingCosts {
  mercadopagoCommission: number // 4.32% del total cobrado
  ivaCommission: number // 0.91% del total cobrado
  iibbRetention: number // 2.50% del total cobrado
  total: number // 7.73% del total cobrado
}

export interface FinancialBreakdown {
  totalAmount: number // Total cobrado al cliente
  baseAmount: number // Precio base de productora
  commissionAmount: number // Comisión Synapse (15%)
  operatingCosts: OperatingCosts // Gastos operativos desglosados
  netAmount: number // Monto neto recibido después de gastos
  netMargin: number // Margen neto de Synapse
  moneyReleaseDate: Date // Fecha de liberación de Mercado Pago (10 días)
}

/**
 * Calcula el precio final con comisión
 * 
 * @param basePrice Precio base establecido por la productora
 * @returns Desglose completo de precios
 */
export function calculatePrice(basePrice: number): PriceBreakdown {
  // Comisión sobre precio base (15%)
  const commission = basePrice * COMMISSION_RATE
  
  // Precio final (base + comisión)
  const totalPrice = basePrice + commission
  
  // Redondear a 2 decimales (no a entero)
  return {
    basePrice: Math.round(basePrice * 100) / 100,
    commission: Math.round(commission * 100) / 100,
    totalPrice: Math.round(totalPrice * 100) / 100,
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
 * Calcula los gastos operativos según Manual V1
 * 
 * @param totalAmount Total cobrado al cliente (precio base + comisión 15%)
 * @returns Desglose de gastos operativos
 */
export function calculateOperatingCosts(totalAmount: number): OperatingCosts {
  const mercadopagoCommission = totalAmount * MERCADOPAGO_COMMISSION_RATE
  const ivaCommission = totalAmount * IVA_COMMISSION_RATE
  const iibbRetention = totalAmount * IIBB_RETENTION_RATE
  
  return {
    mercadopagoCommission: Math.round(mercadopagoCommission * 100) / 100,
    ivaCommission: Math.round(ivaCommission * 100) / 100,
    iibbRetention: Math.round(iibbRetention * 100) / 100,
    total: Math.round((mercadopagoCommission + ivaCommission + iibbRetention) * 100) / 100,
  }
}

/**
 * Calcula el desglose financiero completo según Manual V1
 * 
 * @param baseAmount Precio base de la productora
 * @param purchaseDate Fecha de creación de la compra (para calcular money_release_date)
 * @returns Desglose financiero completo
 */
export function calculateFinancialBreakdown(
  baseAmount: number,
  purchaseDate: Date = new Date()
): FinancialBreakdown {
  // Calcular precio con comisión
  const priceBreakdown = calculatePrice(baseAmount)
  const totalAmount = priceBreakdown.totalPrice
  
  // Calcular gastos operativos
  const operatingCosts = calculateOperatingCosts(totalAmount)
  
  // Calcular monto neto recibido
  const netAmount = totalAmount - operatingCosts.total
  
  // Calcular margen neto (netAmount - baseAmount)
  const netMargin = netAmount - baseAmount
  
  // Calcular fecha de liberación (240 horas = 10 días después de la compra)
  const moneyReleaseDate = new Date(
    purchaseDate.getTime() + MIN_SETTLEMENT_HOURS * 60 * 60 * 1000
  )
  
  return {
    totalAmount,
    baseAmount,
    commissionAmount: priceBreakdown.commission,
    operatingCosts,
    netAmount: Math.round(netAmount * 100) / 100,
    netMargin: Math.round(netMargin * 100) / 100,
    moneyReleaseDate,
  }
}

/**
 * Valida si se puede transferir dinero según el plazo mínimo
 * 
 * @param purchaseCreatedAt Fecha de creación de la compra
 * @returns true si ya pasaron 240 horas desde la compra
 */
export function canTransfer(purchaseCreatedAt: Date | string): boolean {
  const purchaseDate = new Date(purchaseCreatedAt)
  const minSettlementDate = new Date(
    purchaseDate.getTime() + MIN_SETTLEMENT_HOURS * 60 * 60 * 1000
  )
  return new Date() >= minSettlementDate
}

/**
 * Calcula cuántas horas faltan para poder transferir
 * 
 * @param purchaseCreatedAt Fecha de creación de la compra
 * @returns Horas restantes (0 si ya se puede transferir)
 */
export function getRemainingHoursUntilTransfer(purchaseCreatedAt: Date | string): number {
  const purchaseDate = new Date(purchaseCreatedAt)
  const minSettlementDate = new Date(
    purchaseDate.getTime() + MIN_SETTLEMENT_HOURS * 60 * 60 * 1000
  )
  const now = new Date()
  const diffMs = minSettlementDate.getTime() - now.getTime()
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60))
  return Math.max(0, diffHours)
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
