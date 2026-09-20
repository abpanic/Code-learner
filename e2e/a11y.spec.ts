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
