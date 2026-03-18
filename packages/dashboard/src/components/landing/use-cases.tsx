"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCases } from "./use-cases-parts";

export function UseCases() {
  return (
    <section
      className="max-w-5xl mx-auto px-6 pb-28 space-y-6 animate-fade-in-up"
      style={{ animationDelay: "0.35s" }}
    >
      <h2 className="text-lg font-medium">Use cases</h2>
      <div className="grid sm:grid-cols-2 gap-5">
        {useCases.map((useCase) => (
          <Card key={useCase.title}>
            <div className="flex items-center justify-center h-40 bg-accent/20">
              <useCase.illustration />
            </div>
            <CardHeader>
              <span className="inline-block text-xs font-mono px-2 py-0.5 rounded bg-accent text-muted-foreground mb-2">
                {useCase.tag}
              </span>
              <CardTitle>{useCase.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{useCase.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
