import EventDetail from '@/components/events/EventDetail'

interface EventDetailPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { slug } = await params
  return <EventDetail slug={slug} />
}
