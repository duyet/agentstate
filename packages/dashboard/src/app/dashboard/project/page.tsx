"use client";

import { KeyIcon, MessageSquareIcon, Settings2Icon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { useCopiedText } from "@/lib/hooks/use-copied-text";
import {
  _CreatedKeyDisplay,
  _DataTab,
  _KeysTab,
  _PageHeader,
  _ProjectSettings,
  _StatsGrid,
  _TabTrigger,
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
  if (!project) return <p className="text-muted-foreground">Project not found.</p>;

  return (
    <div className="flex flex-col px-4 lg:px-6">
      <_PageHeader name={project.name} slug={project.slug} />

      {createdKey && <_CreatedKeyDisplay apiKey={createdKey} copied={copied} onCopy={copy} />}

      <_StatsGrid
        totalConversations={totalConvs}
        totalMessages={totalMessages}
        totalTokens={totalTokens}
        activeKeyCount={activeKeys.length}
      />

      <Tabs defaultValue={createdKey ? "keys" : "data"} className="gap-4">
        <TabsList
          variant="default"
          className="mb-1 grid h-auto w-full grid-cols-3 rounded-lg border border-border bg-bg-deep p-1"
        >
          <_TabTrigger value="data" icon={MessageSquareIcon} label="Data" count={totalConvs} />
          <_TabTrigger value="keys" icon={KeyIcon} label="API Keys" count={activeKeys.length} />
          <_TabTrigger value="settings" icon={Settings2Icon} label="Settings" />
        </TabsList>

        <TabsContent value="settings">
          <_ProjectSettings
            project={project}
            deleteConfirmSlug={deleteConfirmSlug}
            deleting={deleting}
            onDeleteConfirm={setDeleteConfirmSlug}
            onDelete={handleDeleteProject}
            onProjectUpdated={(updated) => setProject(updated)}
          />
        </TabsContent>

        <TabsContent value="keys">
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
        </TabsContent>

        <TabsContent value="data">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ProjectPage() {
  return (
    <Suspense fallback={<div className="h-32 animate-pulse rounded-lg bg-muted" />}>
      <ProjectContent />
    </Suspense>
  );
}
