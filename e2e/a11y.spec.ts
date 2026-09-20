import { expect, test, type Page } from "@playwright/test";

/**
 * Contrast audit across both themes.
 *
 * The dark palette was derived from the light one, so this is the check that
 * it actually works rather than merely looking plausible: every rendered text
 * node is measured against its effective background and held to WCAG AA.
 */

const PAGES = [
  "/",
  "/topics/lin_reg/ols-fit",
  "/problems",
  "/problems/two-sum-indices",
  "/topics",
  "/topics/vector_dbs",
  "/topics/lin_reg",
  "/review",
  "/settings",
  "/matrix",
];

type Finding = {
  ratio: number;
  color: string;
  background: string;
  text: string;
  selector: string;
};

async function contrastFailures(page: Page): Promise<Finding[]> {
  return page.evaluate(() => {
    const parse = (value: string): [number, number, number, number] | null => {
      const m = value.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const parts = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
      const [r, g, b, a = 1] = parts;
      return [r, g, b, a];
    };

    const channel = (c: number) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const luminance = ([r, g, b]: number[]) =>
      0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

    const ratio = (a: number[], b: number[]) => {
      const la = luminance(a);
      const lb = luminance(b);
      return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    };

    /**
     * Walks ancestors until an opaque background is found. A gradient lives in
     * background-image, not background-color, so its first colour stop is used
     * — otherwise a gradient panel reads as transparent and the walk sails past
     * it to something far lighter.
     */
    const backgroundOf = (el: Element): number[] => {
      let node: Element | null = el;
      while (node) {
        const style = getComputedStyle(node);
        const bg = parse(style.backgroundColor);
        if (bg && bg[3] > 0.95) return bg;
        if (style.backgroundImage && style.backgroundImage.includes("gradient")) {
          const stop = parse(style.backgroundImage);
          if (stop) return stop;
        }
        node = node.parentElement;
      }
      return [255, 255, 255, 1];
    };

    const describe = (el: Element) => {
      const cls = typeof el.className === "string" && el.className
        ? `.${el.className.trim().split(/\s+/).slice(0, 2).join(".")}`
        : "";
      return `${el.tagName.toLowerCase()}${cls}`;
    };

    const findings: Finding[] = [];
    const seen = new Set<string>();

    for (const el of Array.from(document.body.querySelectorAll("*"))) {
      const own = Array.from(el.childNodes).some(
        (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim().length > 1,
      );
      if (!own) continue;

      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none" || style.opacity === "0") continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;

      const fg = parse(style.color);
      if (!fg || fg[3] < 0.5) continue;
      const bg = backgroundOf(el);

      const size = parseFloat(style.fontSize);
      const weight = Number(style.fontWeight) || 400;
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      const required = large ? 3 : 4.5;

      const value = ratio(fg, bg);
      if (value + 0.02 >= required) continue;

      const key = `${style.color}|${style.backgroundColor}|${describe(el)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      findings.push({
        ratio: Math.round(value * 100) / 100,
        color: style.color,
        background: `rgb(${bg[0]}, ${bg[1]}, ${bg[2]})`,
        text: (el.textContent ?? "").trim().slice(0, 40),
        selector: describe(el),
      });
    }
    return findings;
  }) as Promise<Finding[]>;
}

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.addInitScript((value) => {
    localStorage.setItem("theme", value as string);
  }, theme);
}

for (const theme of ["light", "dark"] as const) {
  test.describe(`${theme} theme`, () => {
    for (const path of PAGES) {
      test(`meets AA contrast on ${path}`, async ({ page }) => {
        await setTheme(page, theme);
        await page.goto(path);
        await expect(page.locator("#main")).toBeVisible();
        await page.waitForTimeout(150);

        const attr = await page.locator("html").getAttribute("data-theme");
        expect(attr, "theme attribute should be applied").toBe(theme);

        const failures = await contrastFailures(page);
        expect(
          failures.map((f) => `${f.selector} ${f.ratio}:1 (${f.color} on ${f.background}) "${f.text}"`),
        ).toStrictEqual([]);
      });
    }
  });
}

test("the skip link reaches the main landmark", async ({ page }) => {
  await page.goto("/problems");
  await page.keyboard.press("Tab");
  const skip = page.locator(".skip-link");
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

test("? opens the shortcut list and g p navigates", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("?");
  await expect(page.getByRole("dialog")).toContainText("Keyboard shortcuts");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();

  await page.keyboard.press("g");
  await page.keyboard.press("p");
  await expect(page).toHaveURL(/\/problems$/);
});

test("shortcuts stay out of the way while typing", async ({ page }) => {
  await page.goto("/problems");
  const search = page.locator('[data-shortcut="search"]');
  await search.click();
  await search.fill("gp?");
  await expect(search).toHaveValue("gp?");
  await expect(page).toHaveURL(/\/problems/);
});

test("the theme toggle persists across a reload", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("radio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});


/**
 * Document outline.
 *
 * Markdown and notebook cells both start their headings at `#`. Embedded in a
 * page that already has an h1, that silently produces a second top-level
 * heading — which is how the outline drifts without anything looking broken.
 * Checking every page is the only way this stays fixed.
 */
for (const path of PAGES) {
  test(`has a single, unbroken heading outline on ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("#main")).toBeVisible();

    const headings = await page.evaluate(() =>
      Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"))
        .filter((el) => {
          const style = getComputedStyle(el);
          return style.display !== "none" && style.visibility !== "hidden";
        })
        .map((el) => ({
          level: Number(el.tagName[1]),
          text: (el.textContent ?? "").trim().slice(0, 50),
        })),
    );

    const h1s = headings.filter((h) => h.level === 1);
    expect(h1s.map((h) => h.text), "exactly one h1 per page").toHaveLength(1);

    // A jump from h2 straight to h4 leaves a hole in the outline.
    const skips: string[] = [];
    for (let i = 1; i < headings.length; i += 1) {
      const jump = headings[i].level - headings[i - 1].level;
      if (jump > 1) {
        skips.push(
          `h${headings[i - 1].level} "${headings[i - 1].text}" -> h${headings[i].level} "${headings[i].text}"`,
        );
      }
    }
    expect(skips, "heading levels should not skip").toStrictEqual([]);
  });
}

/**
 * Layout at width. The complaint that started this: a wide display showed a
 * narrow column of text with most of the screen empty. Prose still needs a
 * readable measure, so the check is that the *page* uses the width and the
 * *paragraph* does not exceed a comfortable line length.
 */
test.describe("wide screens", () => {
  test.use({ viewport: { width: 1920, height: 1000 } });

  const shells = ["/", "/problems", "/problems/two-sum-indices", "/topics", "/topics/lin_reg",
                  "/topics/lin_reg/ols-fit", "/matrix"];

  for (const path of shells) {
    test(`uses the available width on ${path}`, async ({ page }) => {
      await page.goto(path);
      const width = await page.evaluate(() => {
        const candidates = [".dashboard", ".problems-page", ".problem-detail", ".topics-index",
                            ".topic-page", ".lesson-container", ".workspace"];
        return Math.max(...candidates.map((s) => {
          const el = document.querySelector(s);
          return el ? el.getBoundingClientRect().width : 0;
        }));
      });
      // One shared shell width, so nothing jumps as you navigate.
      expect(Math.round(width)).toBe(1560);
    });
  }

  test("keeps paragraphs to a readable measure", async ({ page }) => {
    for (const path of ["/topics/lin_reg", "/topics/lin_reg/ols-fit", "/problems/two-sum-indices"]) {
      await page.goto(path);
      // The notebook renders after fetch, so wait for its prose before measuring.
      await page.waitForTimeout(1200);
      const tooWide = await page.evaluate(() =>
        Array.from(document.querySelectorAll("p"))
          .filter((el) => (el.textContent ?? "").trim().length > 120)
          .map((el) => {
            const style = getComputedStyle(el);
            const chars = el.getBoundingClientRect().width / (parseFloat(style.fontSize) * 0.5);
            return { chars: Math.round(chars), text: (el.textContent ?? "").trim().slice(0, 40) };
          })
          .filter((row) => row.chars > 95),
      );
      expect(tooWide.map((r) => `${r.chars}ch "${r.text}"`), path).toStrictEqual([]);
    }
  });

  /**
   * The editor panel and the generic page shell both answered to `.workspace`,
   * so the shell's page padding was landing inside the editor card and eating
   * ~128px of the code area. Separate names now; this pins that they stay apart.
   */
  test("does not pad the editor panel like a page shell", async ({ page }) => {
    await page.goto("/problems/two-sum-indices");
    const padding = await page.evaluate(() => {
      const el = document.querySelector(".code-workspace");
      return el ? getComputedStyle(el).padding : "MISSING";
    });
    expect(padding).toBe("0px");
  });

  test("shows the topic map as two columns when there is room", async ({ page }) => {
    await page.goto("/topics/lin_reg");
    const sideBySide = await page.evaluate(() => {
      const a = document.querySelector(".topic-overview")?.getBoundingClientRect();
      const b = document.querySelector(".subtopic-cards")?.getBoundingClientRect();
      return !!a && !!b && Math.abs(a.top - b.top) < 60 && b.left > a.right - 10;
    });
    expect(sideBySide, "overview and lesson list should sit side by side").toBe(true);
  });
});
