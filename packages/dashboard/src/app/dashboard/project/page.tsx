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
import { _useDataTabState } from "./_data-tab-state";
import { _useKeysTabState } from "./_keys-tab-state";
import { _ProjectLoadingState } from "./_loading-state";
import { _useComputedStats } from "./_use-computed-stats";
import { _useConversationActions } from "./_use-conversation-actions";
import { _useDeleteProject } from "./_use-delete-project";
import { _useKeyActions } from "./_use-key-actions";
import { _useNewKeyStorage } from "./_use-new-key-storage";
import { _useProjectData } from "./_use-project-data";

function ProjectContent() {
  const params = useSearchParams();
  const slug = params.get("slug");
  const { copied, copy } = useCopiedText();

  // Data fetching
  const { project, loading, conversations, convsLoading, refreshProject } = _useProjectData(slug);

  // UI state
  const { createdKey, setCreatedKey } = _useNewKeyStorage(slug);
  const keysTab = _useKeysTabState();
  const dataTab = _useDataTabState();

  // Actions
  const keyActions = _useKeyActions({
    project,
    onKeyCreated: (key) => {
      setCreatedKey(key);
      keysTab.resetKeyForm();
    },
    onProjectRefresh: refreshProject,
  });
  const { expandedConv, messagesCache, loadingMessages, toggleConversation } =
    _useConversationActions(project);
  const { deleteConfirmSlug, deleting, setDeleteConfirmSlug, handleDeleteProject } =
    _useDeleteProject(project);

  // Computed stats
  const { activeKeys, totalConvs, totalMessages, totalTokens } = _useComputedStats(
    project,
    conversations,
  );

  // Early returns after all hooks
  if (loading) return <_ProjectLoadingState />;
  if (!project) return <p className="text-muted-foreground">Project not found.</p>;

  return (
    <div>
      <_PageHeader name={project.name} slug={project.slug} />

      {createdKey && <_CreatedKeyDisplay apiKey={createdKey} copied={copied} onCopy={copy} />}

      <_StatsGrid
        totalConversations={totalConvs}
        totalMessages={totalMessages}
        totalTokens={totalTokens}
        activeKeyCount={activeKeys.length}
      />

      <Tabs defaultValue={createdKey ? "keys" : "data"}>
        <TabsList variant="line" className="mb-6 gap-0 border-b border-border pb-px">
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
            onProjectUpdated={async () => { await refreshProject(); }}
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
    <Suspense fallback={<div className="h-32 bg-muted rounded animate-pulse" />}>
      <ProjectContent />
    </Suspense>
  );
}
