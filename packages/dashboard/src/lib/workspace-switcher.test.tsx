import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { Window } from "happy-dom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const setActive = mock(async (_input: { organization: string | null }) => {});
let activeOrg: { id: string; name: string } | null = null;
let memberships = [
  { id: "org_first", name: "First team" },
  { id: "org_default", name: "Default Organization" },
];

mock.module("@clerk/react", () => ({
  useOrganization: () => ({ isLoaded: true, organization: activeOrg }),
}));
mock.module("@/hooks/_use-organizations-list", () => ({
  useOrganizationsList: () => ({ organizations: memberships, isLoaded: true, setActive }),
}));

const { WorkspaceSwitcher } = await import("../components/workspace-switcher");
let window: Window;
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  window = new Window({ url: "http://localhost:4321/dashboard/" });
  Object.assign(globalThis, {
    window,
    document: window.document,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  setActive.mockClear();
  activeOrg = null;
  memberships = [
    { id: "org_first", name: "First team" },
    { id: "org_default", name: "Default Organization" },
  ];
});

afterEach(async () => {
  await act(async () => root.unmount());
  window.happyDOM.abort();
});

describe("workspace selection", () => {
  it("preserves Personal with multiple memberships instead of auto-activating a team", async () => {
    await act(async () => root.render(<WorkspaceSwitcher />));
    const select = container.querySelector("select")!;
    expect(select.value).toBe("");
    expect(select.options[0].text).toBe("Personal");
    expect(select.options.length).toBe(3);
    expect(setActive).not.toHaveBeenCalled();
  });

  it("switches a team to Personal through the rendered control and preserves it on remount", async () => {
    activeOrg = memberships[0];
    await act(async () => root.render(<WorkspaceSwitcher />));
    const select = container.querySelector("select")!;
    expect(select.value).toBe("org_first");

    await act(async () => {
      select.value = "";
      select.dispatchEvent(new window.Event("change", { bubbles: true }));
    });
    expect(setActive).toHaveBeenCalledTimes(1);
    expect(setActive).toHaveBeenCalledWith({ organization: null });

    activeOrg = null;
    await act(async () => root.render(<WorkspaceSwitcher key="after-reload" />));
    expect(container.querySelector("select")!.value).toBe("");
    expect(setActive).toHaveBeenCalledTimes(1);
  });

  it("shows Personal even with no organization memberships", async () => {
    memberships = [];
    await act(async () => root.render(<WorkspaceSwitcher />));
    expect(container.querySelector("select")!.options[0].text).toBe("Personal");
    expect(setActive).not.toHaveBeenCalled();
  });
});
