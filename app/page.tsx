import PublicMarketingNav from '@/components/navigation/PublicMarketingNav';
import HeroSection from '@/components/construction/HeroSection';
import StatsBar from '@/components/construction/StatsBar';
import ServicesSection from '@/components/construction/ServicesSection';
import ProjectsSection from '@/components/construction/ProjectsSection';
import ReviewsSection from '@/components/construction/ReviewsSection';
import CtaBand from '@/components/construction/CtaBand';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#071014] text-slate-100">
      <PublicMarketingNav />
      <HeroSection />
      <StatsBar />
      <ServicesSection />
      <ProjectsSection limit={3} />
      <ReviewsSection limit={3} />
      <CtaBand />
    </main>
  );
}
