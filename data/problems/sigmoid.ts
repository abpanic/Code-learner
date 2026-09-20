import { PLACEHOLDER, type Problem } from "./types";

export const sigmoid: Problem = {
  slug: "sigmoid",
  title: "Sigmoid of a score",
  difficulty: "easy",
  topicIds: ["log_reg"],
  tags: ["classification", "activation", "numpy-free"],
  prompt: [
    "Map an unbounded score `z` to a probability with the logistic sigmoid:",
    "`1 / (1 + exp(-z))`.",
    "",
    "Standard library only. `math.exp` in Python, `Math.exp` in JavaScript.",
  ].join("\n"),
  links: { theory: PLACEHOLDER, explanation: PLACEHOLDER, learnMore: PLACEHOLDER },
  languages: {
    python: {
      entry: "sigmoid",
      starter: `import math


def sigmoid(z):
    # Map z to (0, 1) with the logistic function.
    pass
`,
      solution: `import math


def sigmoid(z):
    return 1 / (1 + math.exp(-z))
`,
    },
    javascript: {
      entry: "sigmoid",
      starter: `function sigmoid(z) {
  // Map z to (0, 1) with the logistic function.
}
`,
      solution: `function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}
`,
    },
  },
  tolerance: 1e-12,
  tests: [
    { name: "zero maps to one half", args: [0], expected: 0.5 },
    { name: "positive score", args: [2], expected: 0.8807970779778823 },
    { name: "negative score is symmetric", args: [-2], expected: 0.11920292202211755 },
    { name: "unit score", args: [1], expected: 0.7310585786300049 },
    { name: "saturates high", args: [10], expected: 0.9999546021312976, hidden: true },
  ],
  hints: [PLACEHOLDER],
};
