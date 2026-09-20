/**
 * Code runner. Executes the learner's function once per test case and reports
 * what it returned. It never decides pass/fail — lib/runner/compare.ts does
 * that on the main thread, so the live runner and the build-time solution
 * tests apply identical rules.
 *
 * Served from public/ rather than bundled so that `importScripts` of the
 * Pyodide CDN build is not rewritten by the bundler.
 *
 * Containment: this worker has no DOM, no cookies and no same-origin fetch
 * that matters. A runaway loop is handled by the main thread terminating it
 * (see RUN_TIMEOUT_MS), which is why no state is kept that cannot be rebuilt.
 */

const PYODIDE_VERSION = "0.28.3";
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodidePromise = null;
let stdout = [];

function post(message) {
  self.postMessage(message);
}

async function getPyodide(id) {
  if (!pyodidePromise) {
    post({ id, type: "loading", message: "Downloading Python (about 6 MB, once per visit)…" });
    pyodidePromise = (async () => {
      importScripts(`${PYODIDE_BASE}pyodide.js`);
      const pyodide = await self.loadPyodide({
        indexURL: PYODIDE_BASE,
        stdout: (line) => stdout.push(line),
        stderr: (line) => stdout.push(line),
      });
      // json is the transport for arguments and results, so both languages are
      // graded against exactly the same values.
      pyodide.runPython("import json");
      return pyodide;
    })().catch((error) => {
      pyodidePromise = null;
      throw error;
    });
  }
  return pyodidePromise;
}

/** Turns a thrown value into a single readable line. */
function describe(error) {
  if (error && typeof error.message === "string") {
    const lines = error.message.trim().split("\n");
    // Python tracebacks are most useful at the end.
    return lines[lines.length - 1] || lines[0];
  }
  return String(error);
}

async function runPython(request) {
  const pyodide = await getPyodide(request.id);
  const globals = pyodide.globals.get("dict")();
  try {
    try {
      pyodide.runPython(request.code, { globals });
    } catch (error) {
      // A syntax or import error is the learner's to fix, so report it as a
      // failure on every case rather than tearing the run down.
      return request.cases.map(() => ({ ok: false, error: describe(error) }));
    }

    const fn = globals.get(request.entry);
    if (!fn) {
      return request.cases.map(() => ({
        ok: false,
        error: `${request.entry} is not defined`,
      }));
    }
    fn.destroy();

    globals.set("__cases_json", JSON.stringify(request.cases.map((c) => c.args)));
    globals.set("__entry_name", request.entry);
    pyodide.runPython(HARNESS_PY, { globals });
    const outcomesJson = globals.get("__outcomes_json");
    return JSON.parse(outcomesJson);
  } finally {
    globals.destroy();
  }
}

const HARNESS_PY = `
import json as __json

__fn = globals()[__entry_name]
__outcomes = []
for __args in __json.loads(__cases_json):
    try:
        __value = __fn(*__args)
        # Round-trip through JSON so Python tuples and JS arrays compare alike.
        __outcomes.append({"ok": True, "value": __json.loads(__json.dumps(__value, default=str))})
    except Exception as __exc:
        __outcomes.append({"ok": False, "error": f"{type(__exc).__name__}: {__exc}"})

__outcomes_json = __json.dumps(__outcomes)
`;

function runJavaScript(request) {
  let fn;
  try {
    const factory = new Function(`${request.code}\nreturn typeof ${request.entry} === "function" ? ${request.entry} : undefined;`);
    fn = factory();
  } catch (error) {
    return request.cases.map(() => ({ ok: false, error: describe(error) }));
  }
  if (typeof fn !== "function") {
    return request.cases.map(() => ({ ok: false, error: `${request.entry} is not defined` }));
  }

  const originalLog = console.log;
  console.log = (...args) => stdout.push(args.map((a) => String(a)).join(" "));
  try {
    return request.cases.map((testCase) => {
      try {
        // structuredClone keeps one case from mutating the arguments of the next.
        const value = fn(...structuredClone(testCase.args));
        return { ok: true, value: value === undefined ? null : JSON.parse(JSON.stringify(value ?? null)) };
      } catch (error) {
        return { ok: false, error: describe(error) };
      }
    });
  } finally {
    console.log = originalLog;
  }
}

self.onmessage = async (event) => {
  const request = event.data;
  stdout = [];
  const startedAt = Date.now();
  try {
    const outcomes = request.language === "python"
      ? await runPython(request)
      : runJavaScript(request);
    post({
      id: request.id,
      type: "done",
      outcomes,
      stdout: stdout.join("\n"),
      ms: Date.now() - startedAt,
    });
  } catch (error) {
    post({ id: request.id, type: "fatal", message: describe(error) });
  }
};

post({ id: "boot", type: "ready" });
