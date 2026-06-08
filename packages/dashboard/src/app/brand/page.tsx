import type { Metadata } from "next";
import { Header } from "@/app/_header";
import { AdapterHub } from "@/components/brand/adapter-hub";
import { Logo, Wordmark } from "@/components/brand/logo";
import { Footer } from "@/components/footer";
import { BrandCard, BrandRow } from "./_components";

export const metadata: Metadata = {
  title: "Brand — AgentState",
  description:
    "AgentState identity: a monotone node mark — one filled core wired to satellite adapters.",
};

// Brand reference palette. These are literal hex values shown in the swatches,
// not theme tokens, so the color blocks use inline styles intentionally.
const COLORS: ReadonlyArray<{ name: string; hex: string }> = [
  { name: "Ink", hex: "#18181b" },
  { name: "Ink 2", hex: "#3f3f46" },
  { name: "Muted", hex: "#71717a" },
  { name: "Line", hex: "#e4e4e7" },
  { name: "Background", hex: "#fafafa" },
  { name: "Accent", hex: "#d9543a" },
];

export default function BrandPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-6 py-12 pb-24">
          {/* Header block */}
          <div className="mb-10">
            <span className="as-label">Brand sheet</span>
            <h1 className="mt-2.5 text-[34px]">AgentState identity</h1>
            <p className="mt-2 max-w-[560px] text-muted-foreground">
              A monotone node mark: one filled core wired to satellite adapters — the literal shape
              of a single state hub serving many runtimes.
            </p>
          </div>

          {/* Logo lockups */}
          <BrandRow title="Logo">
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
              <BrandCard label="Mark / Light">
                <div className="flex items-center justify-center p-7 text-foreground">
                  <Logo size={64} />
                </div>
              </BrandCard>
              <BrandCard label="Mark / Accent">
                <div className="flex items-center justify-center p-7">
                  <Logo size={64} className="text-brand" />
                </div>
              </BrandCard>
              <BrandCard label="Mark / Dark" dark>
                <div className="flex items-center justify-center bg-zinc-900 p-7">
                  <Logo size={64} className="text-white" />
                </div>
              </BrandCard>
              <BrandCard label="Horizontal lockup">
                <div className="flex items-center justify-center p-7">
                  <Wordmark size={30} />
                </div>
              </BrandCard>
              <BrandCard label="Icon tile">
                <div className="flex items-center justify-center p-6">
                  <div className="flex size-[60px] items-center justify-center rounded-[13px] bg-foreground">
                    <Logo size={34} className="text-background" />
                  </div>
                </div>
              </BrandCard>
              <BrandCard label="Favicon 16–32">
                <div className="flex items-center justify-center gap-4 p-7 text-foreground">
                  <Logo size={16} />
                  <Logo size={24} />
                  <Logo size={32} />
                </div>
              </BrandCard>
            </div>
          </BrandRow>

          {/* Color */}
          <BrandRow title="Color">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {COLORS.map((c) => (
                <div
                  key={c.name}
                  className="overflow-hidden rounded-[9px] border border-border bg-card"
                >
                  <div className="h-[70px] border-b border-border" style={{ background: c.hex }} />
                  <div className="px-3 py-2.5">
                    <div className="text-[13px] font-semibold">{c.name}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {c.hex}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </BrandRow>

          {/* Typography */}
          <BrandRow title="Typography">
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
              <div className="rounded-[9px] border border-border bg-card p-[22px]">
                <span className="as-label">Display · Space Grotesk</span>
                <div className="mt-3 font-display text-[40px] font-semibold tracking-[-0.03em]">
                  Any state, anywhere
                </div>
                <div className="mt-1.5 font-display text-[17px] text-muted-foreground">
                  Aa Bb Cc 0123456789
                </div>
              </div>
              <div className="rounded-[9px] border border-border bg-card p-[22px]">
                <span className="as-label">Mono · JetBrains Mono</span>
                <div className="mt-3 font-mono text-[18px] text-foreground">
                  POST /api/v1/conversations
                </div>
                <div className="mt-2 font-mono text-[14px] text-muted-foreground">
                  as_live_3DqrVIvIfxttEkYiAz1V
                </div>
                <div className="mt-3 text-[14px] text-muted-foreground">
                  Body · Hanken Grotesk — clean humanist sans for running text and UI.
                </div>
              </div>
            </div>
          </BrandRow>

          {/* The mark as a system */}
          <BrandRow title="The mark as a system">
            <div className="dot-grid rounded-[14px] border border-border bg-card p-7">
              <div className="mx-auto max-w-[440px]">
                <AdapterHub compact />
              </div>
            </div>
          </BrandRow>

          {/* Usage guidelines */}
          <BrandRow title="Guidelines">
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
              <div className="rounded-[9px] border border-border bg-card p-[22px]">
                <span className="font-mono text-[10.5px] uppercase text-muted-foreground">Do</span>
                <ul className="mt-3 space-y-2 text-[14px] text-foreground">
                  <li>Use the mark in its original proportions</li>
                  <li>Give the logo adequate clear space</li>
                  <li>Use monochrome on dark backgrounds</li>
                  <li>Use the accent color to highlight</li>
                </ul>
              </div>
              <div className="rounded-[9px] border border-border bg-card p-[22px]">
                <span className="font-mono text-[10.5px] uppercase text-muted-foreground">
                  Don&apos;t
                </span>
                <ul className="mt-3 space-y-2 text-[14px] text-foreground">
                  <li>Stretch, rotate, or distort the mark</li>
                  <li>Recolor the mark to non-brand colors</li>
                  <li>Place on busy backgrounds without contrast</li>
                  <li>Use the wordmark without the mark</li>
                </ul>
              </div>
            </div>
          </BrandRow>
        </div>
      </main>
      <Footer />
    </div>
  );
}
