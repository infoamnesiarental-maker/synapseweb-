/**
 * Genera un slug único a partir de un texto
 * Convierte a minúsculas, reemplaza espacios y caracteres especiales con guiones
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina acentos
    .replace(/[^a-z0-9]+/g, '-') // Reemplaza caracteres especiales con guiones
    .replace(/^-+|-+$/g, '') // Elimina guiones al inicio y final
}

/**
 * Genera un slug único agregando un número al final si es necesario
 */
export async function generateUniqueSlug(
  baseSlug: string,
  checkUnique: (slug: string) => Promise<boolean>
): Promise<string> {
  let slug = baseSlug
  let counter = 1

  while (!(await checkUnique(slug))) {
    slug = `${baseSlug}-${counter}`
    counter++
  }

  return slug
}
