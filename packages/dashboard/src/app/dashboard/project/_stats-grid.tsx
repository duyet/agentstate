import { CoinsIcon, HashIcon, KeyIcon, MessageSquareIcon } from "lucide-react";
import { _StatCard } from "./_stat-card";

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
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <_StatCard icon={MessageSquareIcon} label="Conversations" value={totalConversations} />
      <_StatCard icon={HashIcon} label="Messages" value={totalMessages.toLocaleString()} />
      <_StatCard icon={CoinsIcon} label="Tokens" value={totalTokens.toLocaleString()} />
      <_StatCard icon={KeyIcon} label="API Keys" value={activeKeyCount} />
    </div>
  );
}
