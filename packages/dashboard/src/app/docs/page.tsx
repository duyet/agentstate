import { Footer } from "@/components/footer";
import { AuthSection } from "./_AuthSection";
import { DocsFooter } from "./_DocsFooter";
import { DocsHeader } from "./_DocsHeader";
import { EndpointsTable } from "./_EndpointsTable";
import { MessageFormatSection } from "./_MessageFormatSection";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <DocsHeader />

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="mb-6">
            <h1 className="text-lg font-semibold tracking-tight text-foreground mb-1">
              API Reference
            </h1>
            <p className="text-sm text-muted-foreground">
              REST API. All endpoints require a Bearer token.
            </p>
          </div>

          <AuthSection />
          <MessageFormatSection />
          <EndpointsTable />
          <DocsFooter />
        </div>
      </main>

      <Footer />
    </div>
  );
}
