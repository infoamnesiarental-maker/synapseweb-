import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Synapse - Plataforma de Tickets para Eventos',
  description: 'La plataforma de tickets que conecta eventos con audiencias. Compra y gestiona tickets de forma fácil, segura y profesional.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}


