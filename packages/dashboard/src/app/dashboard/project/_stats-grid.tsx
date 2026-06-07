import { CoinsIcon, HashIcon, KeyIcon, MessageSquareIcon, TrendingUpIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface StatsGridProps {
  totalConversations: number;
  totalMessages: number;
  totalTokens: number;
  activeKeyCount: number;
}

export function _StatsGrid({
  totalConversations,
  totalMessages,
  totalTokens,
  activeKeyCount,
}: StatsGridProps) {
  const stats = [
    { label: "Conversations", value: totalConversations.toLocaleString(), icon: MessageSquareIcon },
    { label: "Messages", value: totalMessages.toLocaleString(), icon: HashIcon },
    { label: "Tokens", value: totalTokens.toLocaleString(), icon: CoinsIcon },
    { label: "API Keys", value: activeKeyCount.toLocaleString(), icon: KeyIcon },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      {stats.map((s) => (
        <Card key={s.label} className="@container/card">
          <CardHeader>
            <CardDescription>{s.label}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {s.value}
            </CardTitle>
            <CardAction>
              <Badge variant="outline">
                <s.icon className="size-3" />
                active
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Project stats <TrendingUpIcon className="size-4" />
            </div>
            <div className="text-muted-foreground">{s.label.toLowerCase()} count</div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
