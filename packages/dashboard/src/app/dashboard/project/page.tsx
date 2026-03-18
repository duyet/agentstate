"use client";

import type {
  ConversationResponse,
  MessageResponse,
  ProjectDetailResponse,
} from "@agentstate/shared";
import { KeyIcon, MessageSquareIcon, Settings2Icon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeaderSkeleton, StatsCardsSkeleton } from "@/components/dashboard/loading-states";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { api } from "@/lib/api";
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
  type ColumnKey,
} from "./_components";

type ProjectDetail = ProjectDetailResponse;
type Conversation = ConversationResponse;
type Message = MessageResponse;

const DEFAULT_COLUMNS: ColumnKey[] = ["title", "message_count", "token_count", "updated_at"];

function ProjectContent() {
  const params = useSearchParams();
  const slug = params.get("slug");
  const router = useRouter();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convsLoading, setConvsLoading] = useState(false);
  const [expandedConv, setExpandedConv] = useState<string | null>(null);
  const [messagesCache, setMessagesCache] = useState<Record<string, Message[]>>({});
  const [loadingMessages, setLoadingMessages] = useState<Record<string, boolean>>({});
  const [visibleCols, setVisibleCols] = useState<ColumnKey[]>(DEFAULT_COLUMNS);
  const [showColPicker, setShowColPicker] = useState(false);
  const { copied, copy } = useCopiedText();

  useEffect(() => {
    if (!slug) return;
    const storedKey = sessionStorage.getItem(`new_key_${slug}`);
    if (storedKey) {
      setCreatedKey(storedKey);
      sessionStorage.removeItem(`new_key_${slug}`);
    }
    api<ProjectDetail>(`/v1/projects/by-slug/${slug}`)
      .then((p) => {
        setProject(p);
        setConvsLoading(true);
        api<{ data: Conversation[] }>(`/v1/projects/${p.id}/conversations?limit=100`)
          .then((res) => setConversations(res.data))
          .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load data"))
          .finally(() => setConvsLoading(false));
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load data"))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleCreateKey = useCallback(async () => {
    if (!newKeyName.trim() || !project) return;
    const res = await api<{ id: string; key: string }>(`/v1/projects/${project.id}/keys`, {
      method: "POST",
      body: JSON.stringify({ name: newKeyName.trim() }),
    });
    setCreatedKey(res.key);
    setShowCreateKey(false);
    setNewKeyName("");
    setProject(await api<ProjectDetail>(`/v1/projects/by-slug/${slug}`));
  }, [newKeyName, project, slug]);

  const handleRevokeKey = useCallback(
    async (keyId: string) => {
      if (!project) return;
      await api(`/v1/projects/${project.id}/keys/${keyId}`, { method: "DELETE" });
      setProject(await api<ProjectDetail>(`/v1/projects/by-slug/${slug}`));
    },
    [project, slug],
  );

  const toggleConversation = useCallback(
    async (convId: string) => {
      if (expandedConv === convId) {
        setExpandedConv(null);
        return;
      }
      setExpandedConv(convId);
      if (!messagesCache[convId] && project) {
        setLoadingMessages((prev) => ({ ...prev, [convId]: true }));
        try {
          const res = await api<{ data: Message[] }>(
            `/v1/projects/${project.id}/conversations/${convId}/messages`,
          );
          setMessagesCache((prev) => ({ ...prev, [convId]: res.data }));
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Failed to load messages");
        } finally {
          setLoadingMessages((prev) => ({ ...prev, [convId]: false }));
        }
      }
    },
    [expandedConv, messagesCache, project],
  );

  const handleDeleteProject = useCallback(async () => {
    if (!project || deleteConfirmSlug !== project.slug) return;
    setDeleting(true);
    try {
      await api(`/v1/projects/${project.id}`, { method: "DELETE" });
      toast.success(`Project "${project.name}" deleted`);
      router.push("/dashboard");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete project");
      setDeleting(false);
    }
  }, [project, deleteConfirmSlug, router]);

  // Memoized computed values
  const activeKeys = useMemo(
    () => project?.api_keys.filter((k) => !k.revoked_at) ?? [],
    [project?.api_keys],
  );
  const totalConvs = conversations.length;
  const totalMessages = useMemo(
    () => conversations.reduce((s, c) => s + c.message_count, 0),
    [conversations],
  );
  const totalTokens = useMemo(
    () => conversations.reduce((s, c) => s + c.token_count, 0),
    [conversations],
  );

  // Early returns after all hooks
  if (loading)
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <StatsCardsSkeleton count={4} />
        <div className="space-y-3">
          <div className="h-10 bg-muted/60 rounded w-48 animate-pulse" />
          <div className="h-64 bg-muted/60 rounded animate-pulse" />
        </div>
      </div>
    );
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
          />
        </TabsContent>

        <TabsContent value="keys">
          <_KeysTab
            showCreateKey={showCreateKey}
            newKeyName={newKeyName}
            apiKeys={project.api_keys}
            onCreateKey={handleCreateKey}
            onChangeKeyName={setNewKeyName}
            onShowCreateKey={() => setShowCreateKey(true)}
            onCancelCreateKey={() => setShowCreateKey(false)}
            onRevokeKey={handleRevokeKey}
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
            visibleCols={visibleCols}
            showColPicker={showColPicker}
            allColumns={CONVERSATION_COLUMNS}
            onToggleConversation={toggleConversation}
            onToggleColPicker={() => setShowColPicker(!showColPicker)}
            onChangeColumns={setVisibleCols}
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
