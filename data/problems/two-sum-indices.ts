import { PLACEHOLDER, type Problem } from "./types";

export const twoSumIndices: Problem = {
  slug: "two-sum-indices",
  title: "Two Sum — return indices",
  difficulty: "easy",
  topicIds: ["dsa_arrays_ptrs"],
  tags: ["arrays", "hash-map", "one-pass"],
  prompt: [
    "Given an array of integers `nums` and an integer `target`, return the indices of the",
    "two numbers that add up to `target`.",
    "",
    "Exactly one valid answer exists. Return it as `[i, j]` with `i < j`. You may not use",
    "the same element twice.",
  ].join("\n"),
  links: {
    theory: PLACEHOLDER,
    explanation: PLACEHOLDER,
    learnMore: PLACEHOLDER,
  },
  languages: {
    python: {
      entry: "two_sum",
      starter: `def two_sum(nums, target):
    # Return [i, j] with i < j such that nums[i] + nums[j] == target.
    pass
`,
      solution: `def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i
    return []
`,
    },
    javascript: {
      entry: "twoSum",
      starter: `function twoSum(nums, target) {
  // Return [i, j] with i < j such that nums[i] + nums[j] === target.
}
`,
      solution: `function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i += 1) {
    if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i];
    seen.set(nums[i], i);
  }
  return [];
}
`,
    },
  },
  tests: [
    { name: "answer at the front", args: [[2, 7, 11, 15], 9], expected: [0, 1] },
    { name: "answer spans the array", args: [[3, 2, 4], 6], expected: [1, 2] },
    { name: "repeated value", args: [[3, 3], 6], expected: [0, 1] },
    { name: "negative numbers", args: [[-3, 4, 3, 90], 0], expected: [0, 2] },
    { name: "larger input", args: [[1, 5, 9, 12, 20, 33], 32], expected: [3, 4], hidden: true },
  ],
  hints: [PLACEHOLDER],
};
