"use client";

import { useEffect, useRef } from "react";
import { EditorState, type Extension } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import {
  HighlightStyle,
  bracketMatching,
  indentUnit,
  syntaxHighlighting,
} from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import type { Language } from "@/data/problems/types";

/** Matches the dark code blocks already used across the lesson pages. */
const highlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#7fd3e0" },
  { tag: [tags.function(tags.variableName), tags.definition(tags.variableName)], color: "#b6e8a8" },
  { tag: [tags.string, tags.special(tags.string)], color: "#f2c98a" },
  { tag: tags.number, color: "#f0a8b8" },
  { tag: tags.comment, color: "#7d93a6", fontStyle: "italic" },
  { tag: tags.operator, color: "#cfe3ea" },
  { tag: [tags.bool, tags.null], color: "#f0a8b8" },
]);

const theme = EditorView.theme({
  "&": { backgroundColor: "#172b40", color: "#eef9fa", fontSize: "13px" },
  ".cm-content": { fontFamily: "var(--font-mono)", padding: "12px 0" },
  ".cm-gutters": { backgroundColor: "#132437", color: "#5d7284", border: "none" },
  ".cm-activeLine": { backgroundColor: "#1d3549" },
  "&.cm-focused": { outline: "2px solid #3a8496", outlineOffset: "-2px" },
  ".cm-cursor": { borderLeftColor: "#8fe3ef" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": { backgroundColor: "#2b4a63" },
}, { dark: true });

function languageExtension(language: Language): Extension {
  return language === "python" ? python() : javascript();
}

export function CodeEditor({
  value,
  language,
  onChange,
  onRun,
  onSubmit,
  label,
}: {
  value: string;
  language: Language;
  onChange: (next: string) => void;
  onRun: () => void;
  onSubmit: () => void;
  label: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  // Set while the component pushes a value in (reset, restore, language
  // switch) so those edits are not reported back as if the learner typed them.
  const applyingExternal = useRef(false);
  // The keymap and update listener outlive any single render, so they read
  // callbacks through a ref that is refreshed after each commit.
  const latest = useRef({ onChange, onRun, onSubmit });
  useEffect(() => {
    latest.current = { onChange, onRun, onSubmit };
  });

  useEffect(() => {
    if (!host.current) return;
    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        history(),
        bracketMatching(),
        highlightActiveLine(),
        indentUnit.of(language === "python" ? "    " : "  "),
        syntaxHighlighting(highlight),
        languageExtension(language),
        keymap.of([
          {
            key: "Mod-Enter",
            preventDefault: true,
            run: () => {
              latest.current.onRun();
              return true;
            },
          },
          {
            key: "Mod-Shift-Enter",
            preventDefault: true,
            run: () => {
              latest.current.onSubmit();
              return true;
            },
          },
          indentWithTab,
          ...historyKeymap,
          ...defaultKeymap,
        ]),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (!update.docChanged || applyingExternal.current) return;
          latest.current.onChange(update.state.doc.toString());
        }),
        EditorView.contentAttributes.of({ "aria-label": label }),
        theme,
      ],
    });
    const editor = new EditorView({ state, parent: host.current });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
    // Rebuilt only when the language changes; `value` is synced below so that
    // typing does not tear down the editor on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, label]);

  // External replacements (reset, language switch, restored draft).
  useEffect(() => {
    const editor = view.current;
    if (!editor) return;
    const current = editor.state.doc.toString();
    if (current === value) return;
    applyingExternal.current = true;
    try {
      editor.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    } finally {
      applyingExternal.current = false;
    }
  }, [value]);

  return <div className="code-editor" ref={host} />;
}
