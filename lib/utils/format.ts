/**
 * Formatea un número como precio en formato argentino
 * Consistente entre servidor y cliente para evitar errores de hidratación
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}











