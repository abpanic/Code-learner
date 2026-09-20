"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

/**
 * Global keyboard shortcuts, mounted once in the layout.
 *
 * Deliberately no single-letter destructive actions: `g` starts a two-key
 * sequence, and everything else is either a question mark or scoped to a
 * focused control. Anything typed inside a field or the code editor is left
 * alone.
 */

const GOTO: Record<string, { href: string; label: string }> = {
  d: { href: "/", label: "Dashboard" },
  p: { href: "/problems", label: "Problems" },
  t: { href: "/topics", label: "Topics" },
  m: { href: "/matrix", label: "Matrix" },
  r: { href: "/review", label: "Review" },
  s: { href: "/settings", label: "Settings" },
};

/** Where typing should never be hijacked. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.closest(".cm-editor")) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

const SEQUENCE_TIMEOUT_MS = 1200;

export function KeyboardShortcuts() {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);
  const pending = useRef<{ key: string; at: number } | null>(null);

  const handler = useCallback((event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (isTypingTarget(event.target)) return;

    const now = Date.now();
    const armed = pending.current && now - pending.current.at < SEQUENCE_TIMEOUT_MS
      ? pending.current.key
      : null;
    pending.current = null;

    if (armed === "g") {
      const destination = GOTO[event.key.toLowerCase()];
      if (destination) {
        event.preventDefault();
        router.push(destination.href);
      }
      return;
    }

    if (event.key === "g") {
      pending.current = { key: "g", at: now };
      return;
    }

    if (event.key === "?") {
      event.preventDefault();
      setHelpOpen(true);
      return;
    }

    if (event.key === "/") {
      const search = document.querySelector<HTMLInputElement>('[data-shortcut="search"]');
      if (search) {
        event.preventDefault();
        search.focus();
        search.select();
      }
    }
  }, [router]);

  useEffect(() => {
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handler]);

  return <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
    <DialogContent className="shortcuts-dialog">
      <DialogHeader>
        <DialogTitle>Keyboard shortcuts</DialogTitle>
        <DialogDescription>
          Shortcuts are ignored while you are typing in a field or the code editor.
        </DialogDescription>
      </DialogHeader>
      <dl className="shortcuts-list">
        <Row keys={["?"]} label="Show this list" />
        <Row keys={["/"]} label="Focus the search box, where there is one" />
        {Object.entries(GOTO).map(([key, { label }]) => (
          <Row key={key} keys={["g", key]} label={`Go to ${label}`} />
        ))}
        <Row keys={["Ctrl", "Enter"]} label="Run the visible tests" />
        <Row keys={["Ctrl", "Shift", "Enter"]} label="Submit, including hidden tests" />
        <Row keys={["Esc"]} label="Close a dialog" />
      </dl>
    </DialogContent>
  </Dialog>;
}

function Row({ keys, label }: { keys: string[]; label: string }) {
  return <div className="shortcut-row">
    <dt>{keys.map((key) => <kbd key={key}>{key}</kbd>)}</dt>
    <dd>{label}</dd>
  </div>;
}
