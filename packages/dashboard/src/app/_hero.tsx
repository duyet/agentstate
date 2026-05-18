import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import {
  landingCard,
  landingContainer,
  landingHover,
  landingItem,
  MotionDiv,
  MotionSection,
} from "@/components/landing/motion";
import { HeroConsole } from "@/components/landing/visuals";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <MotionSection
      animate="visible"
      className="max-w-5xl mx-auto px-6 py-12 sm:py-16"
      initial="hidden"
      variants={landingContainer}
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_30rem] lg:items-center">
        <div className="flex flex-col gap-5">
          <MotionDiv className="flex flex-wrap gap-2" variants={landingItem}>
            <Badge variant="outline">REST API</Badge>
            <Badge variant="outline">Cloudflare D1</Badge>
            <Badge variant="outline">Agent memory</Badge>
          </MotionDiv>
          <MotionDiv className="flex flex-col gap-4" variants={landingItem}>
            <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-balance sm:text-6xl md:text-7xl">
              AgentState
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground sm:text-xl">
              Conversation history database-as-a-service for AI agents. Store threads, retrieve
              context, monitor usage, and ship without building another chat-history backend.
            </p>
          </MotionDiv>
          <MotionDiv className="flex flex-wrap items-center gap-3" variants={landingItem}>
            <Button size="lg" nativeButton={false} render={<Link href="/dashboard" />}>
              Open dashboard
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              nativeButton={false}
              // biome-ignore lint/a11y/useAnchorContent: Base UI injects the Button children into this render anchor.
              render={<a href="/agents.md" />}
            >
              agents.md
            </Button>
            <Button variant="outline" size="lg" nativeButton={false} render={<Link href="/docs" />}>
              API reference
            </Button>
          </MotionDiv>
        </div>

        <MotionDiv variants={landingCard} whileHover={landingHover} whileTap={{ scale: 0.99 }}>
          <HeroConsole />
        </MotionDiv>
      </div>
    </MotionSection>
  );
}
