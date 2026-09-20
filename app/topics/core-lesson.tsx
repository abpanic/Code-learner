import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { NotebookViewer } from "@/app/notebook-viewer";
import { coreLessons, type CoreLessonId } from "@/data/core-lessons";
import { LessonShell } from "./lesson-shell";

function Markdown({ children }: { children: string }) {
  return <div className="core-markdown"><ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{children}</ReactMarkdown></div>;
}

export function CoreLessonPage({ topicId }: { topicId: CoreLessonId }) {
  const lesson = coreLessons[topicId];
  const contents = [
    ...lesson.sections.map(section => [section.id, section.label] as const),
    ["practice", "Check understanding"] as const,
    ["notebook", "Python notebook"] as const,
  ];
  return <LessonShell
    topicId={topicId}
    title={lesson.title}
    eyebrow={lesson.eyebrow}
    subtitle={lesson.subtitle}
    tags={lesson.tags}
    ctaNote="Read the example, then run the notebook."
    contents={contents}
    note={lesson.note}
    sources={lesson.sources}
  >
    {lesson.sections.map(section => <section id={section.id} className="lesson-section" key={section.id}><span className="section-kicker">{section.kicker}</span><h2>{section.heading}</h2><Markdown>{section.body}</Markdown>{section.callout && <div className="lesson-callout"><strong>{section.callout.title}</strong><p>{section.callout.body}</p></div>}</section>)}
    <section id="practice" className="lesson-section"><span className="section-kicker">06 / PRACTICE</span><h2>Check your understanding</h2><div className="practice-list">{lesson.questions.map((item, i) => <div key={item.question}><span>{String(i + 1).padStart(2, "0")}</span><div><h3>{item.question}</h3><p>{item.answer}</p></div></div>)}</div></section>
    <section id="notebook" className="lesson-section lesson-notebook"><span className="section-kicker">07 / WORK THROUGH IT</span><h2>Python notebook</h2><p>{lesson.notebookIntro} The preview shows saved cells and outputs; download the notebook to edit and run it in Jupyter.</p><NotebookViewer topicId={topicId} title={lesson.title} available /></section>
  </LessonShell>;
}
