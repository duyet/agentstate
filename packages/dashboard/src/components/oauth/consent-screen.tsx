"use client";

import { SignIn, useAuth } from "@clerk/react";
import { ShieldCheck } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { Providers } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { scopeLabel } from "@/lib/scopes";

interface ProjectItem {
  id: string;
  name: string;
  slug: string;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

function ConsentInner() {
  const { isLoaded, isSignedIn } = useAuth();
  const [params, setParams] = useState<URLSearchParams | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [projectId, setProjectId] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setParams(new URLSearchParams(window.location.search));
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    api<{ data: ProjectItem[] }>("/v1/projects")
      .then((res) => {
        setProjects(res.data);
        if (res.data[0]) setProjectId(res.data[0].id);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load projects"))
      .finally(() => setLoadingProjects(false));
  }, [isSignedIn]);

  if (!isLoaded) return <Centered>Loading…</Centered>;
  if (!isSignedIn)
    return (
      <Centered>
        <SignIn routing="hash" />
      </Centered>
    );
  if (!params) return null;

  const clientId = params.get("client_id") ?? "";
  const redirectUri = params.get("redirect_uri") ?? "";
  const scopes = (params.get("scope") ?? "").split(" ").filter(Boolean);
  const state = params.get("state") ?? "";
  const codeChallenge = params.get("code_challenge") ?? "";
  const codeChallengeMethod = params.get("code_challenge_method") ?? "S256";
  const resource = params.get("resource") ?? "";

  if (!clientId || !redirectUri || !codeChallenge) {
    return (
      <Centered>
        <Card className="flex flex-col gap-2 p-6">
          <h1 className="text-[15px] font-semibold text-fg">Invalid authorization request</h1>
          <p className="text-[13px] text-fg-3">
            This authorization link is missing required parameters. Return to the application that
            sent you here and try again.
          </p>
        </Card>
      </Centered>
    );
  }

  let appHost = redirectUri;
  try {
    appHost = new URL(redirectUri).host;
  } catch {
    // keep raw redirectUri as the label if it isn't a valid URL
  }

  async function decide(approve: boolean) {
    if (approve && !projectId) {
      setError("Select a project to grant access to.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api<{ redirect: string }>("/oauth/authorize/decision", {
        method: "POST",
        body: JSON.stringify({
          approve,
          client_id: clientId,
          redirect_uri: redirectUri,
          scopes,
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod,
          state,
          resource,
          project_id: projectId,
        }),
      });
      window.location.href = res.redirect;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Authorization failed");
      setSubmitting(false);
    }
  }

  const noProjects = !loadingProjects && projects.length === 0;

  return (
    <Centered>
      <Card className="flex flex-col gap-5 p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius)] border border-edge bg-panel2 text-accent">
            <ShieldCheck size={20} aria-hidden />
          </span>
          <div className="flex flex-col">
            <h1 className="text-[15px] font-semibold tracking-tight text-fg">Authorize access</h1>
            <p className="text-[12.5px] text-fg-3">
              <span className="font-mono">{appHost}</span> wants to connect to AgentState
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="as-label text-fg-3">Requested permissions</span>
          {scopes.length === 0 ? (
            <p className="text-[13px] text-fg-3">No specific permissions requested.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {scopes.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center rounded-full border border-edge bg-panel2 px-2.5 py-1 font-mono text-[11.5px] text-fg-2"
                >
                  {scopeLabel(s)}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="consent-project" className="as-label text-fg-3">
            Grant access to project
          </label>
          {noProjects ? (
            <p className="text-[13px] text-warn">
              You have no projects yet.{" "}
              <a href="/dashboard" className="text-accent underline">
                Create one
              </a>{" "}
              first.
            </p>
          ) : (
            <select
              id="consent-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={loadingProjects}
              className="w-full rounded-[var(--radius)] border border-edge bg-panel2 px-3 py-2 text-[13px] text-fg"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {error && <p className="text-[12.5px] text-neg">{error}</p>}

        <div className="flex gap-2">
          <Button
            variant="primary"
            className="flex-1"
            disabled={submitting || noProjects || !projectId}
            onClick={() => decide(true)}
          >
            Approve
          </Button>
          <Button variant="secondary" disabled={submitting} onClick={() => decide(false)}>
            Deny
          </Button>
        </div>
        <p className="text-[11.5px] leading-5 text-fg-4">
          Approving issues a scoped token to this application for the selected project. You can
          revoke it anytime from the project's API keys.
        </p>
      </Card>
    </Centered>
  );
}

export function ConsentScreen() {
  return (
    <Providers>
      <ConsentInner />
    </Providers>
  );
}
