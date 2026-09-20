import { PLACEHOLDER, type Problem } from "./types";

export const confusionCounts: Problem = {
  slug: "confusion-counts",
  title: "Confusion counts at a threshold",
  difficulty: "medium",
  topicIds: ["log_reg"],
  tags: ["classification", "evaluation", "thresholds"],
  prompt: [
    "Turn scores into decisions at `threshold` — predict 1 when `score >= threshold` — and",
    "return `[tp, fp, tn, fn]` against the 0/1 labels `ys`.",
    "",
    "The threshold is a policy choice, so the same model gives different counts here.",
  ].join("\n"),
  links: { theory: PLACEHOLDER, explanation: PLACEHOLDER, learnMore: PLACEHOLDER },
  languages: {
    python: {
      entry: "confusion_counts",
      starter: `def confusion_counts(ys, scores, threshold):
    # Predict 1 when score >= threshold. Return [tp, fp, tn, fn].
    pass
`,
      solution: `def confusion_counts(ys, scores, threshold):
    tp = fp = tn = fn = 0
    for y, s in zip(ys, scores):
        pred = 1 if s >= threshold else 0
        if y == 1 and pred == 1:
            tp += 1
        elif y == 0 and pred == 1:
            fp += 1
        elif y == 0 and pred == 0:
            tn += 1
        else:
            fn += 1
    return [tp, fp, tn, fn]
`,
    },
    javascript: {
      entry: "confusionCounts",
      starter: `function confusionCounts(ys, scores, threshold) {
  // Predict 1 when score >= threshold. Return [tp, fp, tn, fn].
}
`,
      solution: `function confusionCounts(ys, scores, threshold) {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  for (let i = 0; i < ys.length; i += 1) {
    const pred = scores[i] >= threshold ? 1 : 0;
    if (ys[i] === 1 && pred === 1) tp += 1;
    else if (ys[i] === 0 && pred === 1) fp += 1;
    else if (ys[i] === 0 && pred === 0) tn += 1;
    else fn += 1;
  }
  return [tp, fp, tn, fn];
}
`,
    },
  },
  tests: [
    {
      name: "balanced at one half",
      args: [[1, 0, 1, 0], [0.9, 0.8, 0.3, 0.1], 0.5],
      expected: [1, 1, 1, 1],
    },
    {
      name: "strict threshold",
      args: [[1, 0, 1, 0], [0.9, 0.8, 0.3, 0.1], 0.85],
      expected: [1, 0, 2, 1],
    },
    {
      name: "threshold of zero predicts all positive",
      args: [[1, 0, 1, 0], [0.9, 0.8, 0.3, 0.1], 0],
      expected: [2, 2, 0, 0],
    },
    { name: "no positive labels", args: [[0, 0], [0.9, 0.1], 0.5], expected: [0, 1, 1, 0] },
    {
      name: "score exactly on the threshold counts as positive",
      args: [[1, 0], [0.5, 0.5], 0.5],
      expected: [1, 1, 0, 0],
      hidden: true,
    },
  ],
  hints: [PLACEHOLDER],
};
