import { Footer } from "@/components/footer";
import { HowItWorks } from "@/components/landing/how-it-works";
import { UseCases } from "@/components/landing/use-cases";
import { ApiEndpoints } from "./_api-endpoints";
import { CodeExamples } from "./_code-examples";
import { Features } from "./_features";
import { Header } from "./_header";
import { Hero } from "./_hero";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1">
        <Hero />
        <CodeExamples />
        <HowItWorks />
        <Features />
        <UseCases />
        <ApiEndpoints />
      </main>

      <Footer />
    </div>
  );
}
