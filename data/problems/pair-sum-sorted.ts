import { PLACEHOLDER, type Problem } from "./types";

export const pairSumSorted: Problem = {
  slug: "pair-sum-sorted",
  title: "Pair sum in a sorted array",
  difficulty: "easy",
  topicIds: ["dsa_arrays_ptrs"],
  tags: ["arrays", "two-pointers", "sorted-input"],
  prompt: [
    "`nums` is sorted in non-decreasing order. Return `[i, j]` with `i < j` such that",
    "`nums[i] + nums[j] == target`, or `[]` when no such pair exists.",
    "",
    "Use the sortedness: two pointers from both ends, no hash map.",
  ].join("\n"),
  links: { theory: PLACEHOLDER, explanation: PLACEHOLDER, learnMore: PLACEHOLDER },
  languages: {
    python: {
      entry: "pair_sum",
      starter: `def pair_sum(nums, target):
    # Two pointers from both ends. Return [i, j] or [].
    pass
`,
      solution: `def pair_sum(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        total = nums[lo] + nums[hi]
        if total == target:
            return [lo, hi]
        if total < target:
            lo += 1
        else:
            hi -= 1
    return []
`,
    },
    javascript: {
      entry: "pairSum",
      starter: `function pairSum(nums, target) {
  // Two pointers from both ends. Return [i, j] or [].
}
`,
      solution: `function pairSum(nums, target) {
  let lo = 0;
  let hi = nums.length - 1;
  while (lo < hi) {
    const total = nums[lo] + nums[hi];
    if (total === target) return [lo, hi];
    if (total < target) lo += 1;
    else hi -= 1;
  }
  return [];
}
`,
    },
  },
  tests: [
    { name: "pair at the ends", args: [[2, 7, 11, 15], 9], expected: [0, 1] },
    { name: "pair spans the array", args: [[2, 3, 4], 6], expected: [0, 2] },
    { name: "negative values", args: [[-1, 0], -1], expected: [0, 1] },
    { name: "no pair exists", args: [[1, 2, 3], 100], expected: [] },
    { name: "duplicate values", args: [[1, 2, 3, 4, 4, 9], 8], expected: [3, 4], hidden: true },
  ],
  hints: [PLACEHOLDER],
};
