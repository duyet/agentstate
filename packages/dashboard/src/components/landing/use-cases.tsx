import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCases } from "./use-cases-parts";

export function UseCases() {
  return (
    <section className="max-w-5xl mx-auto px-6 pb-20">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">Use cases</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            AgentState is an operational layer for products where every session should become
            queryable product data.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {useCases.map((useCase) => (
            <Card key={useCase.title}>
              <CardContent>
                <div className="flex aspect-[2/1] items-center justify-center rounded-lg bg-muted">
                  <Image
                    src={useCase.image}
                    alt=""
                    width={360}
                    height={180}
                    loading="eager"
                    className="size-full object-contain"
                    aria-hidden="true"
                  />
                </div>
              </CardContent>
              <CardHeader>
                <CardTitle>{useCase.title}</CardTitle>
                <CardDescription className="flex flex-col gap-2">
                  <Badge variant="secondary">{useCase.tag}</Badge>
                  <span>{useCase.description}</span>
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
