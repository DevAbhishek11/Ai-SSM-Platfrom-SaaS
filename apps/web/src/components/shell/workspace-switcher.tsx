"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Building2, Check, ChevronDown, Loader2 } from "lucide-react";
import { switchWorkspace } from "@/app/(dashboard)/workspace-actions";

export type WorkspaceOption = {
  workspaceId: string;
  workspaceName: string;
  role: string;
};

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId
}: {
  workspaces: WorkspaceOption[];
  activeWorkspaceId: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const active = workspaces.find((workspace) => workspace.workspaceId === activeWorkspaceId) ?? workspaces[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!active) {
    return null;
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-lg bg-white/5 px-2.5 py-2 text-left transition-colors hover:bg-white/10"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-[var(--accent-strong)] text-white">
          <Building2 size={16} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{active.workspaceName}</span>
          <span className="block truncate text-[11px] capitalize text-[var(--sidebar-muted)]">
            {active.role.replace("_", " ")}
          </span>
        </span>
        {pending ? (
          <Loader2 size={15} className="animate-spin text-[var(--sidebar-muted)]" aria-hidden="true" />
        ) : (
          <ChevronDown size={15} className="text-[var(--sidebar-muted)]" aria-hidden="true" />
        )}
      </button>

      {open ? (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)] py-1 text-[var(--foreground)] shadow-lg"
        >
          {workspaces.map((workspace) => (
            <li key={workspace.workspaceId}>
              <button
                type="button"
                role="option"
                aria-selected={workspace.workspaceId === activeWorkspaceId}
                disabled={pending}
                onClick={() => {
                  setOpen(false);
                  if (workspace.workspaceId === activeWorkspaceId) return;
                  startTransition(async () => {
                    await switchWorkspace(workspace.workspaceId);
                  });
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--panel-soft)]"
              >
                <span className="min-w-0 flex-1 truncate">{workspace.workspaceName}</span>
                {workspace.workspaceId === activeWorkspaceId ? (
                  <Check size={14} className="text-[var(--accent)]" aria-hidden="true" />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
