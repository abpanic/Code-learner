"use client";

import { useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Download, Monitor, Moon, Sun, Trash2, Upload } from "lucide-react";
import { applyBackup, downloadBackup, ImportError, readBackupFile } from "@/lib/backup";
import { clearProgress, useHydrated, useProgress } from "@/lib/progress";
import { clearAttempts, useAttempts } from "@/lib/attempts";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const THEMES = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
  { id: "system", label: "Match system", Icon: Monitor },
] as const;

export function SettingsPanel({
  topicIds,
  slugs,
}: {
  topicIds: string[];
  slugs: string[];
}) {
  const { theme, setTheme } = useTheme();
  const ready = useHydrated();
  const { progress } = useProgress();
  const { attempts } = useAttempts();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const recordedTopics = Object.keys(progress).length;
  const touchedProblems = Object.keys(attempts).length;

  const importFile = async (file?: File) => {
    if (!file) return;
    setNotice("");
    setError("");
    try {
      const result = applyBackup(
        await readBackupFile(file),
        new Set(topicIds),
        new Set(slugs),
      );
      setNotice(
        `Imported ${result.topics} topic ${result.topics === 1 ? "level" : "levels"}`
        + ` and ${result.problems} ${result.problems === 1 ? "problem" : "problems"}.`,
      );
    } catch (err) {
      setError(err instanceof ImportError || err instanceof Error
        ? err.message
        : "Import failed.");
    }
    if (fileInput.current) fileInput.current.value = "";
  };

  return <div className="settings">
    <section className="settings-block" aria-labelledby="appearance-heading">
      <h2 id="appearance-heading">Appearance</h2>
      <p>Applies to this browser. &ldquo;Match system&rdquo; follows your operating system.</p>
      <div className="theme-choice" role="radiogroup" aria-label="Colour theme">
        {THEMES.map(({ id, label, Icon }) => {
          const active = ready && (theme ?? "system") === id;
          return <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            className={active ? "theme-option theme-option-active" : "theme-option"}
            onClick={() => setTheme(id)}
          >
            <Icon size={17} aria-hidden="true" />
            {label}
          </button>;
        })}
      </div>
    </section>

    <section className="settings-block" aria-labelledby="data-heading">
      <h2 id="data-heading">Your data</h2>
      <p>
        Everything is stored in this browser only — nothing is sent anywhere. Export a backup
        before switching device or clearing site data.
      </p>
      <dl className="settings-stats">
        <div><dt>Topics with a recorded level</dt><dd>{ready ? recordedTopics : "—"}</dd></div>
        <div><dt>Problems attempted</dt><dd>{ready ? touchedProblems : "—"}</dd></div>
      </dl>

      {notice && <p className="settings-notice" role="status">{notice}</p>}
      {error && <p className="settings-error" role="alert">{error}</p>}

      <div className="settings-actions">
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(event) => importFile(event.target.files?.[0])}
        />
        <Button variant="outline" onClick={() => downloadBackup()}>
          <Download size={16} /> Export backup
        </Button>
        <Button variant="outline" onClick={() => fileInput.current?.click()}>
          <Upload size={16} /> Import backup
        </Button>
      </div>
    </section>

    <section className="settings-block settings-danger" aria-labelledby="reset-heading">
      <h2 id="reset-heading">Reset</h2>
      <p>These cannot be undone. Export a backup first if you want to keep anything.</p>
      <div className="settings-actions">
        <ResetButton
          label="Reset problem attempts"
          title="Reset every problem attempt?"
          body="This clears saved code, run history and solved status for every problem. Evidence levels are left alone."
          onConfirm={() => clearAttempts()}
          onDone={setNotice}
          doneMessage="Problem attempts were cleared."
        />
        <ResetButton
          label="Reset evidence levels"
          title="Reset every evidence level?"
          body="This clears the level recorded against all 70 topics. Problem attempts are left alone."
          onConfirm={() => clearProgress()}
          onDone={setNotice}
          doneMessage="Evidence levels were cleared."
        />
      </div>
    </section>
  </div>;
}

function ResetButton({
  label, title, body, onConfirm, onDone, doneMessage,
}: {
  label: string;
  title: string;
  body: string;
  onConfirm: () => boolean;
  onDone: (message: string) => void;
  doneMessage: string;
}) {
  return <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="outline" className="settings-reset"><Trash2 size={16} /> {label}</Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{body}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={() => onDone(onConfirm() ? doneMessage : "This browser could not clear the data.")}
        >
          {label}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
