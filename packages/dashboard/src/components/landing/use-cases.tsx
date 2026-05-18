import {
  landingCard,
  landingContainer,
  landingHover,
  landingItem,
  MotionDiv,
  MotionSection,
} from "@/components/landing/motion";
import { UseCaseVisual } from "@/components/landing/visuals";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCases } from "./use-cases-parts";

export function UseCases() {
  return (
    <MotionSection
      className="max-w-5xl mx-auto px-6 pb-20"
      animate="visible"
      initial="hidden"
      variants={landingContainer}
    >
      <div className="flex flex-col gap-6">
        <MotionDiv className="flex flex-col gap-2" variants={landingItem}>
          <h2 className="text-lg font-medium">Use cases</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            AgentState is an operational layer for products where every session should become
            queryable product data.
          </p>
        </MotionDiv>
        <MotionDiv className="grid gap-4 sm:grid-cols-2" variants={landingContainer}>
          {useCases.map((useCase) => (
            <MotionDiv key={useCase.title} variants={landingCard} whileHover={landingHover}>
              <Card>
                <CardContent>
                  <div className="landing-svg-frame landing-svg-frame--compact">
                    <UseCaseVisual variant={useCase.visual} />
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
            </MotionDiv>
          ))}
        </MotionDiv>
      </div>
    </MotionSection>
  );
}
