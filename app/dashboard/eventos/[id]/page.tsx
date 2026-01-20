'use client'

import CreateEventWizard from '@/components/dashboard/CreateEventWizard'
import { useParams } from 'next/navigation'

export default function EditEventoPage() {
  const params = useParams()
  const eventId = params.id as string

  return <CreateEventWizard eventId={eventId} />
}
