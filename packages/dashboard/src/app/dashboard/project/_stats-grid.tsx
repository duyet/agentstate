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
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard icon={MessageSquareIcon} label="Conversations" value={totalConversations} />
      <StatCard icon={HashIcon} label="Messages" value={totalMessages} />
      <StatCard icon={CoinsIcon} label="Tokens" value={totalTokens} />
      <StatCard icon={KeyIcon} label="API Keys" value={activeKeyCount} />
    </div>
  );
}
