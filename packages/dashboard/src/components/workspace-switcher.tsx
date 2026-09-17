import { useOrganization } from "@clerk/react";
import { Buildings, CaretDown } from "@phosphor-icons/react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { useOrganizationsList } from "@/hooks/_use-organizations-list";

/**
 * WorkspaceSwitcher — the active-organization switcher above the project scope.
 *
 * The org id is load-bearing for every project-scoped read (the API derives it
 * from the verified session), so it needs to be both visible and
 * selectable — an org mismatch otherwise presents as an empty account with no
 * way to diagnose or correct it (#387).
 *
 * Switching orgs mints a new session token with a different `o_id`. Rather than
 * refetch each project-scoped cache by hand, reload once so every consumer
 * re-reads under the new org.
 */
export function WorkspaceSwitcher() {
  const { organizations, isLoaded, setActive } = useOrganizationsList();
  const { isLoaded: isActiveOrgLoaded, organization: activeOrg } = useOrganization();
  const [switching, setSwitching] = useState(false);
  // The shell mounts this twice (desktop sidebar + mobile drawer), so a literal
  // id would collide and both labels would resolve to the first select.
  const selectId = useId();

  // Personal is a real workspace. Never auto-select a membership: doing so
  // hides personal projects and makes an explicit return to Personal impossible.
  if (!isLoaded || !isActiveOrgLoaded) {
    return (
      <div className="border-b border-edge-soft px-3 py-2.5" aria-live="polite">
        <div className="h-9 animate-pulse rounded-none bg-panel2" aria-hidden="true" />
        <span className="sr-only">Loading workspaces…</span>
      </div>
    );
  }

  const handleChange = async (orgId: string) => {
    if (!setActive || orgId === (activeOrg?.id ?? "")) return;
    setSwitching(true);
    try {
      await setActive({ organization: orgId || null });
      window.location.reload();
    } catch {
      setSwitching(false);
      toast.error("Could not switch organization. Please try again.");
    }
  };

  return (
    <div className="border-b border-edge-soft px-3 py-2.5">
      <label htmlFor={selectId} className="sr-only">
        Active workspace
      </label>
      {!activeOrg && (
        <p className="mb-2 text-[11.5px] leading-snug text-fg-3" role="status">
          Personal projects are private to you. Select an organization to view its projects.
        </p>
      )}
      <div className="relative">
        <Buildings
          size={14}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-4"
          aria-hidden
        />
        <select
          id={selectId}
          aria-label="Active workspace"
          disabled={switching}
          value={activeOrg?.id ?? ""}
          onChange={(e) => void handleChange(e.target.value)}
          className="h-9 w-full appearance-none rounded-none border border-edge bg-panel pl-8 pr-8 text-[13px] text-fg transition-colors hover:bg-panel2 focus-visible:bg-panel2 focus-visible:outline-none disabled:opacity-60"
        >
          <option value="">Personal</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
        <CaretDown
          size={13}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-4"
          aria-hidden
        />
      </div>
    </div>
  );
}

