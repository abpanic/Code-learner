import type { Components } from "react-markdown";

/**
 * Heading components for markdown that is embedded inside a page that already
 * owns an outline.
 *
 * Authored markdown and notebook cells both start their headings at `#`, which
 * renders as an `h1`. Dropped into a page that already has one, that produces a
 * second top-level heading and a document outline that lies to screen readers
 * and to anything else that navigates by structure.
 *
 * `headingsFrom(3)` renders `#` as `h3`, `##` as `h4`, and so on, clamped at
 * `h6`. Pick the level from where the markdown actually sits: content directly
 * under the page title starts at 2, content inside an `h2` section starts at 3.
 */
export function headingsFrom(start: 2 | 3 | 4): Partial<Components> {
  const at = (depth: number) => Math.min(6, start + depth - 1);
  const make = (depth: number) => {
    const Tag = `h${at(depth)}` as "h2" | "h3" | "h4" | "h5" | "h6";
    const Heading = (props: React.ComponentProps<"h2">) => <Tag {...props} />;
    Heading.displayName = `MarkdownH${depth}As${at(depth)}`;
    return Heading;
  };
  return {
    h1: make(1),
    h2: make(2),
    h3: make(3),
    h4: make(4),
    h5: make(5),
    h6: make(6),
  };
}

/** Markdown sitting directly under the page title. */
export const HEADINGS_UNDER_TITLE = headingsFrom(2);

/** Markdown sitting inside an `h2` section. */
export const HEADINGS_UNDER_SECTION = headingsFrom(3);
