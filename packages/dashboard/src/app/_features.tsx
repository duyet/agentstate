import { AnimatedFeatureIcon } from "@/components/landing/animated-feature-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    title: "Persistent storage",
    variant: "database" as const,
    description:
      "Full conversation threads with roles, content, metadata, and token counts. Cursor-based pagination for large histories.",
  },
  {
    title: "AI-powered",
    variant: "cpu" as const,
    description:
      "Auto-generate conversation titles and follow-up question suggestions. Let your agents organize their own history.",
  },
  {
    title: "Any framework",
    variant: "plug" as const,
    description:
      "Works with Vercel AI SDK, LangGraph, Cloudflare Agents, or any HTTP client. Simple REST API, no vendor lock-in.",
  },
];

export function Features() {
  return (
    <section
      className="max-w-5xl mx-auto px-6 pb-28 space-y-8 animate-fade-in-up"
      style={{ animationDelay: "0.3s" }}
    >
      <h2 className="text-lg font-medium">Features</h2>
      <div className="grid sm:grid-cols-3 gap-4">
        {features.map(({ title, variant, description }) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <AnimatedFeatureIcon variant={variant} />
                <span>{title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
