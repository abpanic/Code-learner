import { PLACEHOLDER, type Problem } from "./types";

export const meanSquaredError: Problem = {
  slug: "mean-squared-error",
  title: "Mean squared error from scratch",
  difficulty: "easy",
  topicIds: ["lin_reg"],
  tags: ["loss-functions", "regression", "numpy-free"],
  prompt: [
    "Given two equal-length sequences `y_true` and `y_pred`, return the mean squared error:",
    "the average of the squared differences between corresponding values.",
    "",
    "Use only the standard library — no NumPy. Return `0.0` for empty input.",
  ].join("\n"),
  links: {
    theory: PLACEHOLDER,
    explanation: PLACEHOLDER,
    learnMore: PLACEHOLDER,
  },
  languages: {
    python: {
      entry: "mse",
      starter: `def mse(y_true, y_pred):
    # Average of (y_true[i] - y_pred[i]) ** 2 across the sequences.
    pass
`,
      solution: `def mse(y_true, y_pred):
    if not y_true:
        return 0.0
    total = sum((t - p) ** 2 for t, p in zip(y_true, y_pred))
    return total / len(y_true)
`,
    },
    javascript: {
      entry: "mse",
      starter: `function mse(yTrue, yPred) {
  // Average of (yTrue[i] - yPred[i]) ** 2 across the arrays.
}
`,
      solution: `function mse(yTrue, yPred) {
  if (yTrue.length === 0) return 0;
  const total = yTrue.reduce((sum, t, i) => sum + (t - yPred[i]) ** 2, 0);
  return total / yTrue.length;
}
`,
    },
  },
  tolerance: 1e-9,
  tests: [
    { name: "perfect predictions", args: [[1, 2, 3], [1, 2, 3]], expected: 0 },
    { name: "small errors", args: [[1, 2, 3], [1.1, 1.9, 3.2]], expected: 0.02 },
    { name: "single value", args: [[4], [1]], expected: 9 },
    { name: "empty input", args: [[], []], expected: 0 },
    { name: "negatives", args: [[-2, 0, 2], [0, 0, 0]], expected: 8 / 3, hidden: true },
  ],
  hints: [PLACEHOLDER],
};
