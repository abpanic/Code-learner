import { PLACEHOLDER, type Problem } from "./types";

export const binaryCrossEntropy: Problem = {
  slug: "binary-cross-entropy",
  title: "Binary cross-entropy loss",
  difficulty: "medium",
  topicIds: ["log_reg"],
  tags: ["classification", "loss-functions", "numerical-stability"],
  prompt: [
    "Return the mean binary cross-entropy of probabilities `probs` against 0/1 labels `ys`:",
    "`-(1/n) * sum(y*log(p) + (1-y)*log(1-p))`.",
    "",
    "Clip `p` into `[1e-15, 1 - 1e-15]` first — a predicted 0 or 1 would otherwise take the",
    "log of zero.",
  ].join("\n"),
  links: { theory: PLACEHOLDER, explanation: PLACEHOLDER, learnMore: PLACEHOLDER },
  languages: {
    python: {
      entry: "bce",
      starter: `import math


def bce(ys, probs):
    # Mean binary cross-entropy. Clip probs to [1e-15, 1 - 1e-15] first.
    pass
`,
      solution: `import math

EPS = 1e-15


def bce(ys, probs):
    total = 0.0
    for y, p in zip(ys, probs):
        p = min(max(p, EPS), 1 - EPS)
        total += y * math.log(p) + (1 - y) * math.log(1 - p)
    return -total / len(ys)
`,
    },
    javascript: {
      entry: "bce",
      starter: `function bce(ys, probs) {
  // Mean binary cross-entropy. Clip probs to [1e-15, 1 - 1e-15] first.
}
`,
      solution: `const EPS = 1e-15;

function bce(ys, probs) {
  let total = 0;
  for (let i = 0; i < ys.length; i += 1) {
    const p = Math.min(Math.max(probs[i], EPS), 1 - EPS);
    total += ys[i] * Math.log(p) + (1 - ys[i]) * Math.log(1 - p);
  }
  return -total / ys.length;
}
`,
    },
  },
  tolerance: 1e-9,
  tests: [
    { name: "uninformative halves", args: [[1, 0], [0.5, 0.5]], expected: 0.6931471805599453 },
    { name: "confident and correct", args: [[1, 0], [1, 0]], expected: 0 },
    { name: "confident and wrong", args: [[1], [0.25]], expected: 1.3862943611198906 },
    { name: "single negative label", args: [[0], [0.25]], expected: 0.2876820724517809 },
    {
      name: "mixed batch",
      args: [[1, 1, 0, 0], [0.9, 0.8, 0.2, 0.1]],
      expected: 0.16425203348601802,
      hidden: true,
    },
  ],
  hints: [PLACEHOLDER],
};
