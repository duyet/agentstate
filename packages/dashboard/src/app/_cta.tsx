import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Section } from "./_section";

export function CTA() {
  return (
    <Section className="pb-24">
      <div className="flex flex-wrap items-center justify-between gap-6 rounded-[14px] border border-zinc-900 bg-zinc-900 px-10 py-11 dark:border-zinc-800">
        <div>
          <h2 className="text-[30px] text-white">Ship the agent, not the backend.</h2>
          <p className="mt-2 text-[15.5px] text-zinc-400">
            Spin up a project, grab a key, and persist your first session in two minutes.
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="brand" nativeButton={false} render={<Link href="/dashboard" />}>
            Open dashboard
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
          <Button
            variant="outline"
            className="border-zinc-700 bg-transparent text-white hover:bg-white/10 hover:text-white dark:border-zinc-700 dark:bg-transparent"
            nativeButton={false}
            render={<Link href="/docs" />}
          >
            Docs
          </Button>
        </div>
      </div>
    </Section>
  );
}
