import { CoinsIcon, HashIcon, KeyIcon, MessageSquareIcon } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";

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
  return (
    <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard
        className="bg-card/90 shadow-sm"
        icon={MessageSquareIcon}
        label="Conversations"
        value={totalConversations}
      />
      <StatCard
        className="bg-card/90 shadow-sm"
        icon={HashIcon}
        label="Messages"
        value={totalMessages}
      />
      <StatCard
        className="bg-card/90 shadow-sm"
        icon={CoinsIcon}
        label="Tokens"
        value={totalTokens}
      />
      <StatCard
        className="bg-card/90 shadow-sm"
        icon={KeyIcon}
        label="API Keys"
        value={activeKeyCount}
      />
    </div>
  );
}
