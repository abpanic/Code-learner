import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import "./site-header.css";

/**
 * The bar shared by every page outside the dashboard. The brand goes home to
 * the dashboard; `back` points at whatever the page sits inside.
 */
export function SiteHeader({ back }: { back?: { href: string; label: string } }) {
  return <header className="lesson-topbar">
    <div className="lesson-topbar-inner">
      <Link href="/" className="lesson-brand">
        <span className="brand-mark">AI<span className="brand-dot">·</span>ML</span>
        <span>Competency Matrix</span>
      </Link>
      <nav className="site-nav" aria-label="Sections">
        <Link href="/problems">Problems</Link>
        <Link href="/topics">Topics</Link>
        <Link href="/matrix">Matrix</Link>
        {back && (
          <Link href={back.href} className="lesson-back">
            <ArrowLeft size={16} /> {back.label}
          </Link>
        )}
      </nav>
    </div>
  </header>;
}
