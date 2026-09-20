import { PLACEHOLDER, type Problem } from "./types";

export const rSquared: Problem = {
  slug: "r-squared",
  title: "Coefficient of determination",
  difficulty: "medium",
  topicIds: ["lin_reg"],
  tags: ["regression", "evaluation", "numpy-free"],
  prompt: [
    "Return R-squared: `1 - ss_res / ss_tot`, where `ss_res` is the sum of squared residuals",
    "and `ss_tot` is the sum of squared deviations of `y_true` from its own mean.",
    "",
    "When `ss_tot` is zero the score is undefined — return `0.0` in that case.",
  ].join("\n"),
  links: { theory: PLACEHOLDER, explanation: PLACEHOLDER, learnMore: PLACEHOLDER },
  languages: {
    python: {
      entry: "r_squared",
      starter: `def r_squared(y_true, y_pred):
    # 1 - ss_res / ss_tot, or 0.0 when ss_tot == 0.
    pass
`,
      solution: `def r_squared(y_true, y_pred):
    mean_y = sum(y_true) / len(y_true)
    ss_res = sum((t - p) ** 2 for t, p in zip(y_true, y_pred))
    ss_tot = sum((t - mean_y) ** 2 for t in y_true)
    if ss_tot == 0:
        return 0.0
    return 1 - ss_res / ss_tot
`,
    },
    javascript: {
      entry: "rSquared",
      starter: `function rSquared(yTrue, yPred) {
  // 1 - ssRes / ssTot, or 0 when ssTot === 0.
}
`,
      solution: `function rSquared(yTrue, yPred) {
  const meanY = yTrue.reduce((a, b) => a + b, 0) / yTrue.length;
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < yTrue.length; i += 1) {
    ssRes += (yTrue[i] - yPred[i]) ** 2;
    ssTot += (yTrue[i] - meanY) ** 2;
  }
  if (ssTot === 0) return 0;
  return 1 - ssRes / ssTot;
}
`,
    },
  },
  tolerance: 1e-9,
  tests: [
    {
      name: "the worked example",
      args: [[2, 4, 5, 4, 5], [2.8, 3.4, 4.0, 4.6, 5.2]],
      expected: 0.6,
    },
    { name: "perfect fit", args: [[1, 2, 3], [1, 2, 3]], expected: 1 },
    { name: "predicting the mean scores zero", args: [[1, 2, 3], [2, 2, 2]], expected: 0 },
    { name: "constant target is undefined", args: [[5, 5, 5], [1, 2, 3]], expected: 0 },
    { name: "worse than the mean", args: [[1, 2, 3], [3, 2, 1]], expected: -3, hidden: true },
  ],
  hints: [PLACEHOLDER],
};
