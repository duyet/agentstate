import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { ChatCentered, GearSix, Key } from "@phosphor-icons/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useCopiedText } from "@/lib/hooks/use-copied-text";
import {
  _CreatedKeyDisplay,
  _DataTab,
  _KeysTab,
  _PageHeader,
  _ProjectSettings,
  _StatsGrid,
  CONVERSATION_COLUMNS,
} from "./_components";
import { useDataTabState } from "./_data-tab-state";
import { useKeysTabState } from "./_keys-tab-state";
import { _ProjectLoadingState } from "./_loading-state";
import { useComputedStats } from "./_use-computed-stats";
import { useConversationActions } from "./_use-conversation-actions";
import { useDeleteProject } from "./_use-delete-project";
import { useKeyActions } from "./_use-key-actions";
import { useNewKeyStorage } from "./_use-new-key-storage";
import { useProjectData } from "./_use-project-data";

interface TabDef {
  value: "data" | "keys" | "settings";
  icon: PhosphorIcon;
  label: string;
  count?: number;
}

function Tabs({
  tabs,
  value,
  onChange,
}: {
  tabs: TabDef[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-[var(--radius-lg)] border border-edge bg-panel p-1">
      {tabs.map((t) => {
        const active = value === t.value;
        const Icon = t.icon;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={`inline-flex items-center gap-1.5 rounded-[var(--radius)] px-3.5 py-2 text-[13px] font-medium transition-[background-color,color] duration-150 ${
              active ? "bg-panel2 text-fg" : "text-fg-3 hover:text-fg hover:bg-panel2"
            }`}
          >
            <Icon size={15} aria-hidden />
            {t.label}
            {t.count !== undefined && (
              <span className="num font-mono text-[11px] tabular-nums text-fg-4">{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ProjectContent() {
  const params = useSearchParams();
  const slug = params.get("slug");
  const { copied, copy } = useCopiedText();

  // Data fetching
  const { project, loading, conversations, convsLoading, setProject, refreshProject } =
    useProjectData(slug);

  // UI state
  const { createdKey, setCreatedKey } = useNewKeyStorage(slug);
  const keysTab = useKeysTabState();
  const dataTab = useDataTabState();
  const [activeTab, setActiveTab] = useState<"data" | "keys" | "settings">(
    createdKey ? "keys" : "data",
  );

  // Actions
  const keyActions = useKeyActions({
    project,
    onKeyCreated: (key) => {
      setCreatedKey(key);
      keysTab.resetKeyForm();
    },
    onProjectRefresh: refreshProject,
  });
  const { expandedConv, messagesCache, loadingMessages, toggleConversation } =
    useConversationActions(project);
  const { deleteConfirmSlug, deleting, setDeleteConfirmSlug, handleDeleteProject } =
    useDeleteProject(project);

  // Computed stats
  const { activeKeys, totalConvs, totalMessages, totalTokens } = useComputedStats(
    project,
    conversations,
  );

  // Early returns after all hooks
  if (loading) return <_ProjectLoadingState />;
  if (!project) return <p className="px-4 text-fg-3 lg:px-6">Project not found.</p>;

  const tabs: TabDef[] = [
    { value: "data", icon: ChatCentered, label: "Data", count: totalConvs },
    { value: "keys", icon: Key, label: "API Keys", count: activeKeys.length },
    { value: "settings", icon: GearSix, label: "Settings" },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 lg:px-6">
      <_PageHeader name={project.name} slug={project.slug} />

      {createdKey && <_CreatedKeyDisplay apiKey={createdKey} copied={copied} onCopy={copy} />}

      <_StatsGrid
        totalConversations={totalConvs}
        totalMessages={totalMessages}
        totalTokens={totalTokens}
        activeKeyCount={activeKeys.length}
      />

      <div className="flex flex-col gap-4">
        <Tabs tabs={tabs} value={activeTab} onChange={(v) => setActiveTab(v as typeof activeTab)} />

        {activeTab === "settings" && (
          <_ProjectSettings
            project={project}
            deleteConfirmSlug={deleteConfirmSlug}
            deleting={deleting}
            onDeleteConfirm={setDeleteConfirmSlug}
            onDelete={handleDeleteProject}
            onProjectUpdated={(updated) => setProject(updated)}
          />
        )}

        {activeTab === "keys" && (
          <_KeysTab
            showCreateKey={keysTab.showCreateKey}
            newKeyName={keysTab.newKeyName}
            apiKeys={project.api_keys}
            onCreateKey={async () => keyActions.handleCreateKey(keysTab.newKeyName)}
            onChangeKeyName={keysTab.setNewKeyName}
            onShowCreateKey={() => keysTab.setShowCreateKey(true)}
            onCancelCreateKey={keysTab.resetKeyForm}
            onRevokeKey={keyActions.handleRevokeKey}
          />
        )}

        {activeTab === "data" && (
          <_DataTab
            totalConvs={totalConvs}
            convsLoading={convsLoading}
            conversations={conversations}
            expandedConv={expandedConv}
            messagesCache={messagesCache}
            loadingMessages={loadingMessages}
            visibleCols={dataTab.visibleCols}
            showColPicker={dataTab.showColPicker}
            allColumns={CONVERSATION_COLUMNS}
            onToggleConversation={toggleConversation}
            onToggleColPicker={dataTab.toggleColPicker}
            onChangeColumns={dataTab.setVisibleCols}
          />
        )}
      </div>
    </div>
  );
}

export default function ProjectPageContent() {
  return (
    <Suspense
      fallback={<div className="h-32 animate-pulse rounded-[var(--radius-lg)] bg-panel2" />}
    >
      <ProjectContent />
    </Suspense>
  );
}
