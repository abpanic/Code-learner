import { PLACEHOLDER, type Problem } from "./types";

export const olsSlopeIntercept: Problem = {
  slug: "ols-slope-intercept",
  title: "OLS slope and intercept",
  difficulty: "easy",
  topicIds: ["lin_reg"],
  tags: ["regression", "least-squares", "numpy-free"],
  prompt: [
    "Fit a simple linear regression by ordinary least squares and return",
    "`[slope, intercept]`.",
    "",
    "slope = sum((x - mean_x) * (y - mean_y)) / sum((x - mean_x) ** 2), and",
    "intercept = mean_y - slope * mean_x. Standard library only.",
  ].join("\n"),
  links: { theory: PLACEHOLDER, explanation: PLACEHOLDER, learnMore: PLACEHOLDER },
  languages: {
    python: {
      entry: "fit_ols",
      starter: `def fit_ols(xs, ys):
    # Return [slope, intercept] for the least-squares line through the points.
    pass
`,
      solution: `def fit_ols(xs, ys):
    n = len(xs)
    mean_x = sum(xs) / n
    mean_y = sum(ys) / n
    sxy = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    sxx = sum((x - mean_x) ** 2 for x in xs)
    slope = sxy / sxx
    return [slope, mean_y - slope * mean_x]
`,
    },
    javascript: {
      entry: "fitOls",
      starter: `function fitOls(xs, ys) {
  // Return [slope, intercept] for the least-squares line through the points.
}
`,
      solution: `function fitOls(xs, ys) {
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i += 1) {
    sxy += (xs[i] - meanX) * (ys[i] - meanY);
    sxx += (xs[i] - meanX) ** 2;
  }
  const slope = sxy / sxx;
  return [slope, meanY - slope * meanX];
}
`,
    },
  },
  tolerance: 1e-9,
  tests: [
    { name: "the worked example", args: [[1, 2, 3, 4, 5], [2, 4, 5, 4, 5]], expected: [0.6, 2.2] },
    { name: "exact straight line", args: [[0, 1, 2], [1, 3, 5]], expected: [2, 1] },
    { name: "flat response", args: [[1, 2, 3], [5, 5, 5]], expected: [0, 5] },
    { name: "two points", args: [[1, 2], [3, 7]], expected: [4, -1], hidden: true },
  ],
  hints: [PLACEHOLDER],
};
