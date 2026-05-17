import {
  ArchiveIcon,
  BarChart3Icon,
  DatabaseIcon,
  type LucideIcon,
  ShieldCheckIcon,
} from "lucide-react";
import {
  landingCard,
  landingContainer,
  landingHover,
  landingItem,
  MotionDiv,
  MotionSection,
} from "@/components/landing/motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Feature = {
  title: string;
  badge: string;
  icon: LucideIcon;
  description: string;
};

const features: readonly Feature[] = [
  {
    title: "Conversation storage",
    badge: "Core",
    icon: DatabaseIcon,
    description:
      "Store full threads with roles, content, metadata, token counts, and cursor-based pagination.",
  },
  {
    title: "Usage analytics",
    badge: "Ops",
    icon: BarChart3Icon,
    description: "Track conversation volume, tokens, costs, active projects, and recent activity.",
  },
  {
    title: "Export and audit",
    badge: "Data",
    icon: ArchiveIcon,
    description: "Export histories in bulk and keep searchable audit trails for agent behavior.",
  },
  {
    title: "API key security",
    badge: "Auth",
    icon: ShieldCheckIcon,
    description:
      "Issue bearer keys with only prefixes exposed and SHA-256 hashes stored server-side.",
  },
] as const;

export function Features() {
  return (
    <MotionSection
      className="max-w-5xl mx-auto px-6 pb-20"
      animate="visible"
      initial="hidden"
      variants={landingContainer}
    >
      <div className="flex flex-col gap-6">
        <MotionDiv className="flex flex-col gap-2" variants={landingItem}>
          <h2 className="text-lg font-medium">Operations snapshot</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            The primitives an agent product needs after the first conversation lands in production.
          </p>
        </MotionDiv>
        <MotionDiv className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" variants={landingContainer}>
          {features.map(({ title, badge, icon: Icon, description }) => (
            <MotionDiv
              className="h-full"
              key={title}
              variants={landingCard}
              whileHover={landingHover}
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Icon aria-hidden="true" />
                    </span>
                    {title}
                  </CardTitle>
                  <CardDescription>
                    <Badge variant="secondary">{badge}</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </CardContent>
              </Card>
            </MotionDiv>
          ))}
        </MotionDiv>
      </div>
    </MotionSection>
  );
}
