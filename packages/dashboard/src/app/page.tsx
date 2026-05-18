import { Footer } from "@/components/footer";
import { LandingMotionConfig } from "@/components/landing/motion-config";
import { ApiEndpoints } from "./_api-endpoints";
import { Features } from "./_features";
import { Header } from "./_header";
import { Hero } from "./_hero";

export default function LandingPage() {
  return (
    <LandingMotionConfig>
      <div className="landing-page min-h-screen bg-background text-foreground flex flex-col">
        <Header />

        <main className="flex-1">
          <Hero />
          <Features />
          <ApiEndpoints />
        </main>

        <Footer />
      </div>
    </LandingMotionConfig>
  );
}
