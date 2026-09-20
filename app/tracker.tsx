"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Code2, Download, FileCode2, FilterX, NotebookPen, Search, Upload, ArrowUpRight } from "lucide-react";
import topicData from "@/data/topics.json";
import { LEVEL_LABELS, LEVEL_OPTIONS, type Level, clearProgress, evidenceScore, isLevel, normalizeLevel, readProgress, useHydrated, useProgress, writeProgress } from "@/lib/progress";
import notebookIds from "@/data/notebooks.json";
import { NotebookViewer } from "./notebook-viewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const topics = topicData.skillsData;
const domains = topicData.domains;
type Topic = (typeof topics)[number];
type View = "topics" | "domains" | "roadmap";
const roles = [
  ["principal_ai", "Principal AI/ML leader"], ["principal_ds", "Principal Data Scientist"],
  ["principal_swe", "Principal SWE · AI/ML"], ["mle", "ML Engineer"],
  ["genai", "GenAI Engineer"], ["mlops", "MLOps Engineer"],
  ["research", "Applied Research Scientist"], ["ds", "Senior Data Scientist"],
] as const;
const notebookSet = new Set<string>(notebookIds);
function isPriority(topic: Topic, role: string) {
  if (topic.roles.includes(role)) return true;
  if (!["core_ml", "genai", "dist_infra", "dsa", "mlops", "swe_math"].includes(topic.domain)) return false;
  if (role === "principal_ai") return topic.domain !== "dsa";
  if (role === "principal_ds") return topic.roles.includes("ds") || topic.domain === "core_ml";
  if (role === "principal_swe") return ["dsa", "swe_math", "mlops", "dist_infra", "genai"].includes(topic.domain);
  return false;
}
function selectControl(value: string, change: (value: string) => void, options: readonly (readonly [string, string])[], label: string, className = "") {
  return <Select value={value} onValueChange={change}>
    <SelectTrigger aria-label={label} className={`control-select ${className}`}><SelectValue /></SelectTrigger>
    <SelectContent>{options.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent>
  </Select>;
}
function levelControl(topic: Topic, status: Level, change: (id: string, level: Level) => void) {
  return selectControl(status, value => change(topic.id, value as Level), LEVEL_OPTIONS, `Evidence level for ${topic.title}`, "level-select");
}
const roadmap = [
  { period: "Months 1–2", name: "ML and coding foundations", items: ["Math, SQL, Python and DS&A practice", "Implement regressions and trees", "Write down assumptions and validation choices"] },
  { period: "Months 3–4", name: "Deep learning and GenAI", items: ["Build a PyTorch model and evaluate it", "Explore RAG, PEFT and agent tools", "Publish annotated notebooks tied to topics"] },
  { period: "Month 5", name: "Production systems", items: ["Deploy and observe an inference service", "Design data freshness and rollback controls", "Measure latency, reliability and cost"] },
  { period: "Month 6", name: "Design and interviews", items: ["Practice ML and software system design", "Review architecture alternatives with peers", "Refine project evidence and interview stories"] },
];

export default function Tracker() {
  const [role, setRole] = useState("principal_ai");
  const [view, setView] = useState<View>("topics");
  const [search, setSearch] = useState("");
  const [domain, setDomain] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [notebooksOnly, setNotebooksOnly] = useState(false);
  const router = useRouter();
  const { progress: state, level, setLevel } = useProgress();
  const ready = useHydrated();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState("overview");
  const [notice, setNotice] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  // The URL is an external system and can only be read once the prerendered
  // markup has hydrated, so deep-link state genuinely belongs in an effect.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("topic");
    if (topics.some(t => t.id === id && t.domain === "core_ml")) {
      router.replace(`/topics/${id}${params.get("tab") === "notebook" ? "#notebook" : ""}`);
      return;
    }
    if (id && topics.some(t => t.id === id)) {
      /* eslint-disable react-hooks/set-state-in-effect -- restoring deep-link state after hydration */
      setSelectedId(id);
      setDetailTab(params.get("tab") === "notebook" ? "notebook" : "overview");
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [router]);

  const updateLevel = (id: string, next: Level) => {
    if (!setLevel(id, next)) setNotice("Progress could not be saved in this browser. Export a backup.");
  };
  const visibleTopics = useMemo(() => topics.filter(t => {
    const text = `${t.title} ${t.desc} ${t.domainName} ${t.id}`.toLowerCase();
    return (domain === "all" || t.domain === domain)
      && (statusFilter === "all" || normalizeLevel(state[t.id]) === statusFilter)
      && (!notebooksOnly || notebookSet.has(t.id))
      && (!search.trim() || text.includes(search.trim().toLowerCase()));
  }), [domain, statusFilter, notebooksOnly, search, state]);
  const selected = selectedId ? topics.find(t => t.id === selectedId) : undefined;
  const covered = topics.filter(t => evidenceScore(level(t.id)) > 0).length;
  const owned = topics.filter(t => ["owned", "led"].includes(level(t.id))).length;
  const priority = topics.filter(t => isPriority(t, role)).length;
  const coverage = Math.round(covered / topics.length * 100);

  const openTopic = (id: string, tab = "overview") => {
    setSelectedId(id); setDetailTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("topic", id); if (tab === "notebook") params.set("tab", "notebook"); else params.delete("tab");
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  };
  const closeTopic = () => {
    setSelectedId(null);
    const params = new URLSearchParams(window.location.search);
    params.delete("topic"); params.delete("tab");
    window.history.replaceState(null, "", window.location.pathname + (params.size ? `?${params}` : ""));
  };
  const changeDetailTab = (tab: string) => {
    setDetailTab(tab);
    if (selectedId) {
      const params = new URLSearchParams(window.location.search);
      if (tab === "notebook") params.set("tab", "notebook"); else params.delete("tab");
      window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
    }
  };
  const exportProgress = () => {
    const data = JSON.stringify({ format: "principal-ai-tracker-progress-v1", exportedAt: new Date().toISOString(), statuses: state }, null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "principal-ai-progress.json"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importProgress = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 1_000_000) throw new Error("The file is too large for a progress backup.");
      const parsed = JSON.parse(await file.text());
      const incoming = parsed?.statuses ?? parsed; // also accepts a raw export of the original localStorage object
      if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) throw new Error("Choose a JSON progress file.");
      const known = new Set(topics.map(t => t.id));
      const valid = Object.entries(incoming).filter(([id, value]) => known.has(id) && (isLevel(value) || value === "mastered"));
      if (!valid.length) throw new Error("No matching topic progress was found in this file.");
      const merged = Object.fromEntries(valid.map(([id, value]) => [id, normalizeLevel(value)]));
      if (!writeProgress({ ...readProgress(), ...merged })) throw new Error("This browser could not save the imported progress.");
      setNotice(`Imported progress for ${valid.length} topics.`);
    } catch (err) { setNotice(err instanceof Error ? err.message : "Import failed."); }
    if (fileInput.current) fileInput.current.value = "";
  };
  const clearFilters = () => { setSearch(""); setDomain("all"); setStatusFilter("all"); setNotebooksOnly(false); };

  return <main id="main" className="site-shell">
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand"><span className="brand-mark">AI<span className="brand-dot">·</span>ML</span><div><strong>Competency Matrix</strong><span>Science · Systems · Leadership</span></div></div>
        <div className="topbar-actions"><Link href="/problems" className="topbar-link"><Code2 size={15} /> Problems</Link><div className="role-control"><span className="topbar-label">Target role</span>{selectControl(role, setRole, roles, "Target role", "role-select")}</div></div>
      </div>
    </header>

    <div className="workspace">
      <section className="workspace-heading">
        <div><p className="eyebrow">YOUR LEARNING WORKSPACE</p><h1>Principal AI/ML skills</h1><p className="heading-copy">Explore each topic, record the level you can demonstrate, and attach Python notebooks to your work.</p></div>
        <div className="storage-actions">
          <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={e => importProgress(e.target.files?.[0])} />
          <Button variant="outline" onClick={() => fileInput.current?.click()}><Upload size={16} /> Import progress</Button>
          <Button variant="outline" onClick={exportProgress}><Download size={16} /> Export</Button>
        </div>
      </section>
      {notice && <p className="notice" role="status">{notice}<button aria-label="Dismiss notice" onClick={() => setNotice("")}>×</button></p>}

      <section className="metric-row" aria-label="Progress summary">
        <div className="metric"><span>Total topics</span><strong>{topics.length}</strong><small>Across {domains.length} domains</small></div>
        <div className="metric"><span>Learned or above</span><strong>{ready ? covered : "—"}<em> / {topics.length}</em></strong><Progress value={coverage} aria-label="Topic coverage" className="metric-progress" /></div>
        <div className="metric"><span>Designed or led</span><strong>{ready ? owned : "—"}</strong><small>Evidence of technical ownership</small></div>
        <div className="metric"><span>Priority for this role</span><strong>{priority}</strong><small>Highlighted in the topic list</small></div>
      </section>

      <Tabs value={view} onValueChange={v => setView(v as View)} className="main-tabs">
        <TabsList aria-label="Tracker views" className="view-tabs"><TabsTrigger value="topics">Topics</TabsTrigger><TabsTrigger value="domains">Domain balance</TabsTrigger><TabsTrigger value="roadmap">Roadmap</TabsTrigger></TabsList>
        <TabsContent value="topics">
          <section className="filters" aria-label="Filter topics">
            <div className="search-box"><Search size={17} aria-hidden="true" /><Input aria-label="Search topics" placeholder="Search concepts, skills, or keywords" value={search} onChange={e => setSearch(e.target.value)} /></div>
            {selectControl(domain, setDomain, [["all", "All domains"], ...domains.map(d => [d.id, d.name] as const)], "Filter by domain", "domain-select")}
            {selectControl(statusFilter, setStatusFilter, [["all", "All levels"], ...LEVEL_OPTIONS], "Filter by evidence level", "filter-select")}
            <div className="notebook-toggle"><Switch id="notebooks-only" checked={notebooksOnly} onCheckedChange={setNotebooksOnly} /><label htmlFor="notebooks-only">With notebooks</label></div>
          </section>
          <div className="results-line"><span>{visibleTopics.length} {visibleTopics.length === 1 ? "topic" : "topics"}</span><span className="results-hint">Select a topic for the explanation, interview questions, and notebook.</span></div>
          {visibleTopics.length ? <div className="domain-sections">{domains.map(d => {
            const items = visibleTopics.filter(t => t.domain === d.id); if (!items.length) return null;
            const all = topics.filter(t => t.domain === d.id);
            const count = all.filter(t => evidenceScore(level(t.id)) > 0).length;
            return <section className="domain-section" key={d.id}><div className="section-head"><div><span className="section-layer">{d.layer}</span><h2>{d.name}</h2></div><span className="section-count">{count}/{all.length} with evidence</span></div>
              <div className="topic-grid">{items.map(topic => {
                const current = level(topic.id), notebook = notebookSet.has(topic.id);
                return <article className={`topic-card ${isPriority(topic, role) ? "topic-priority" : ""}`} key={topic.id}>
                  <div className="topic-card-top"><span className={`level-tag level-${current}`}>{LEVEL_LABELS[current]}</span>{isPriority(topic, role) && <span className="priority-tag">Role priority</span>}</div>
                  <h3>{topic.domain === "core_ml" ? <Link href={`/topics/${topic.id}`} className="topic-title-link">{topic.title}</Link> : topic.title}</h3><p>{topic.desc}</p>
                  <div className="topic-card-actions">{topic.domain === "core_ml"
                    ? <Button asChild variant="link" size="sm" className="detail-link"><Link href={`/topics/${topic.id}`}>Read lesson <ArrowUpRight size={15} /></Link></Button>
                    : <Button variant="link" size="sm" onClick={() => openTopic(topic.id)} className="detail-link">Details <ArrowUpRight size={15} /></Button>}
                    {notebook && (topic.domain === "core_ml"
                      ? <Button asChild variant="ghost" size="sm" className="notebook-link"><Link href={`/topics/${topic.id}#notebook`}><NotebookPen size={15} /> Notebook</Link></Button>
                      : <Button variant="ghost" size="sm" className="notebook-link" onClick={() => openTopic(topic.id, "notebook")}><NotebookPen size={15} /> Notebook</Button>)}
                  </div>
                  <div className="topic-card-footer"><span>Evidence level</span>{levelControl(topic, current, updateLevel)}</div>
                </article>;
              })}</div></section>;
          })}</div> : <div className="empty-state"><FilterX size={24} /><h2>No topics match these filters</h2><p>Try another search or include topics without notebooks.</p><Button variant="outline" onClick={clearFilters}>Clear filters</Button></div>}
        </TabsContent>
        <TabsContent value="domains" className="panel"><h2>Evidence depth by domain</h2><p>Depth averages your recorded level: Learned counts 20%, Production Applied 60%, and Taught / Led 100%. Coverage and depth measure different things.</p>
          <div className="domain-bars">{domains.map(d => { const list = topics.filter(t => t.domain === d.id); const score = Math.round(list.reduce((sum, t) => sum + evidenceScore(level(t.id)), 0) / (list.length * 5) * 100); return <div className="domain-bar" key={d.id}><div><strong>{d.short}</strong><span>{score}% · {list.length} topics</span></div><Progress value={score} aria-label={`${d.short} evidence depth`} /></div>; })}</div>
        </TabsContent>
        <TabsContent value="roadmap" className="panel"><h2>Six-month starter plan</h2><p>Plan for about 1–2 hours a day. Principal ownership is developed through sustained project decisions and cross-team work beyond this starter plan.</p>
          <div className="roadmap-grid">{roadmap.map(phase => <article className="roadmap-card" key={phase.period}><span>{phase.period}</span><h3>{phase.name}</h3><ul>{phase.items.map(item => <li key={item}>{item}</li>)}</ul></article>)}</div>
          <div className="principal-proof"><h3>What Principal-level evidence looks like</h3><p>Take an ambiguous problem through a documented design, experiment or pilot, safe production rollout, measured business impact, and mentorship or influence across teams.</p></div>
        </TabsContent>
      </Tabs>
      <footer className="workspace-footer"><p>Evidence ladder: <strong>Learned → Implemented → Production Applied → Designed / Owned → Taught / Led.</strong> Earlier Mastered entries count as Learned; earlier In Progress entries remain visible until you choose a specific level.</p><p>Progress is saved in this browser. Export a backup when moving devices or sites.</p><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="sm">Reset progress</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Reset all topic progress?</AlertDialogTitle><AlertDialogDescription>This clears saved progress in this browser. Export a backup first if you want to keep it.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => setNotice(clearProgress() ? "Progress was reset." : "Progress could not be cleared in this browser.")}>Reset progress</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></footer>
    </div>

    <Dialog open={!!selected} onOpenChange={open => { if (!open) closeTopic(); }}><DialogContent className="detail-dialog"><DialogHeader><div className="detail-domain">{selected?.domainName}</div><DialogTitle>{selected?.title}</DialogTitle><DialogDescription>{selected ? (isPriority(selected, role) ? "Priority for your selected role" : "Core competency") : "Topic details"}</DialogDescription></DialogHeader>
      {selected && <Tabs value={detailTab} onValueChange={changeDetailTab} className="detail-tabs"><TabsList aria-label="Topic detail sections"><TabsTrigger value="overview"><BookOpen size={15} /> Overview</TabsTrigger><TabsTrigger value="notebook"><FileCode2 size={15} /> Notebook{notebookSet.has(selected.id) ? " · 1" : ""}</TabsTrigger></TabsList>
        <TabsContent value="overview" className="detail-scroll"><h3>What to know</h3><p>{selected.desc}</p><h3>Formula or decision rule</h3><pre className="formula"><code>{selected.formula}</code></pre><h3>Interview prompts</h3><ul className="question-list">{selected.questions.map(q => <li key={q}>{q}</li>)}</ul></TabsContent>
        <TabsContent value="notebook" className="detail-scroll"><NotebookViewer key={selected.id} topicId={selected.id} title={selected.title} available={notebookSet.has(selected.id)} /></TabsContent>
        <div className="detail-footer"><span>Highest level you can demonstrate</span>{levelControl(selected, level(selected.id), updateLevel)}</div>
      </Tabs>}
    </DialogContent></Dialog>
  </main>;
}
