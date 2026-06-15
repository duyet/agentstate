import { Footer } from "@/components/footer";
import { Providers } from "@/components/providers";
import { Adapters } from "./adapters";
import { ApiSurface } from "./api-endpoints";
import { CTA } from "./cta";
import { Header } from "./header";
import { Hero } from "./hero";
import { Loop } from "./loop";
import { Primitives } from "./primitives";

export function LandingPage() {
  return (
    <Providers>
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
    </Providers>
  );
}
