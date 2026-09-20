import { PLACEHOLDER, type Problem } from "./types";

export const maxSubarraySum: Problem = {
  slug: "max-subarray-sum",
  title: "Maximum subarray sum",
  difficulty: "medium",
  topicIds: ["dsa_arrays_ptrs"],
  tags: ["arrays", "kadane", "dynamic-programming"],
  prompt: [
    "Return the largest sum obtainable from a contiguous, non-empty subarray of `nums`.",
    "",
    "The array may be entirely negative, in which case the answer is the largest single",
    "element. Assume `nums` is non-empty.",
  ].join("\n"),
  links: { theory: PLACEHOLDER, explanation: PLACEHOLDER, learnMore: PLACEHOLDER },
  languages: {
    python: {
      entry: "max_subarray_sum",
      starter: `def max_subarray_sum(nums):
    # Largest sum over any contiguous non-empty slice of nums.
    pass
`,
      solution: `def max_subarray_sum(nums):
    best = current = nums[0]
    for n in nums[1:]:
        current = max(n, current + n)
        best = max(best, current)
    return best
`,
    },
    javascript: {
      entry: "maxSubarraySum",
      starter: `function maxSubarraySum(nums) {
  // Largest sum over any contiguous non-empty slice of nums.
}
`,
      solution: `function maxSubarraySum(nums) {
  let best = nums[0];
  let current = nums[0];
  for (let i = 1; i < nums.length; i += 1) {
    current = Math.max(nums[i], current + nums[i]);
    best = Math.max(best, current);
  }
  return best;
}
`,
    },
  },
  tests: [
    { name: "mixed signs", args: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6 },
    { name: "single element", args: [[1]], expected: 1 },
    { name: "all negative", args: [[-1, -2, -3]], expected: -1 },
    { name: "whole array is best", args: [[5, 4, -1, 7, 8]], expected: 23 },
    { name: "two negatives", args: [[-2, -1]], expected: -1, hidden: true },
  ],
  hints: [PLACEHOLDER],
};
