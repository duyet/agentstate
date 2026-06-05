import { Footer } from "@/components/footer";
import { Adapters } from "./_adapters";
import { ApiSurface } from "./_api-endpoints";
import { CTA } from "./_cta";
import { Header } from "./_header";
import { Hero } from "./_hero";
import { Loop } from "./_loop";
import { Primitives } from "./_primitives";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1">
        <Hero />
        <Adapters />
        <Primitives />
        <Loop />
        <ApiSurface />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
