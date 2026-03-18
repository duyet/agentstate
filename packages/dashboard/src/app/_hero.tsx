import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { HeroIllustration } from "@/components/landing/hero-illustration";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative max-w-5xl mx-auto px-6 pt-28 pb-20">
      <HeroIllustration />
      <div className="relative max-w-2xl animate-fade-in-up">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight mb-5 leading-[1.1]">
          Conversation history
          <br />
          <span className="text-muted-foreground">for AI agents</span>
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground mb-4 leading-relaxed max-w-lg">
          You&apos;re building AI agents — not a conversation database. Stop reinventing storage,
          analytics, and history management. Just call an API.
        </p>
        <p className="text-sm text-muted-foreground/70 mb-10 leading-relaxed max-w-lg">
          Built for vibe coders. No SDK needed — give your coding agent the API docs and let it wire
          things up. Works with any framework, any language.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" render={<Link href="/dashboard" />}>
            Get started
            <ArrowRightIcon className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="outline" size="lg" render={<Link href="/agents.md" />}>
            agents.md
          </Button>
          <Button variant="outline" size="lg" render={<Link href="/docs" />}>
            API Reference
          </Button>
        </div>
      </div>
    </section>
  );
}
