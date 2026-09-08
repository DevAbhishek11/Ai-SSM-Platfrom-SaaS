"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut, Settings, ShieldCheck, User } from "lucide-react";
import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";

export function UserMenu({
  name,
  email,
  role,
  initials
}: {
  name: string;
  email: string;
  role: string;
  initials: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
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

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] py-1 pl-1 pr-2.5 text-sm hover:bg-[var(--panel-soft)]"
      >
        <span className="grid size-7 place-items-center rounded-full bg-[var(--accent)] text-xs font-semibold text-white">
          {initials}
        </span>
        <span className="hidden max-w-[9rem] truncate font-medium sm:block">{name}</span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-lg"
        >
          <div className="border-b border-[var(--border)] px-4 py-3">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-xs text-[var(--muted)]">{email}</p>
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-medium capitalize text-[var(--accent-strong)]">
              <ShieldCheck size={11} aria-hidden="true" />
              {role.replace("_", " ")}
            </span>
          </div>

          <div className="grid py-1">
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-[var(--panel-soft)]"
            >
              <User size={15} aria-hidden="true" />
              Profile and security
            </Link>
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-[var(--panel-soft)]"
            >
              <Settings size={15} aria-hidden="true" />
              Workspace settings
            </Link>
          </div>

          <form action={signOut} className="border-t border-[var(--border)]">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-[var(--danger)] hover:bg-[var(--danger)]/10"
            >
              <LogOut size={15} aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
