import HeroWithVideo from '@/components/HeroWithVideo'
import EventsSection from '@/components/EventsSection'
import FeaturesSection from '@/components/FeaturesSection'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <main className="min-h-screen bg-black-deep">
      <HeroWithVideo />
      <EventsSection />
      <FeaturesSection />
      <Footer />
    </main>
  )
}
