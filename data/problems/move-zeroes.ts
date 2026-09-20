import { PLACEHOLDER, type Problem } from "./types";

export const moveZeroes: Problem = {
  slug: "move-zeroes",
  title: "Move zeroes to the end",
  difficulty: "easy",
  topicIds: ["dsa_arrays_ptrs"],
  tags: ["arrays", "two-pointers", "in-place"],
  prompt: [
    "Move every `0` in `nums` to the end while keeping the relative order of the non-zero",
    "elements. Return the resulting list.",
    "",
    "Aim for a single pass with a write pointer rather than building a new list.",
  ].join("\n"),
  links: { theory: PLACEHOLDER, explanation: PLACEHOLDER, learnMore: PLACEHOLDER },
  languages: {
    python: {
      entry: "move_zeroes",
      starter: `def move_zeroes(nums):
    # Keep non-zero order, push zeroes to the end, return the list.
    pass
`,
      solution: `def move_zeroes(nums):
    write = 0
    for n in nums:
        if n != 0:
            nums[write] = n
            write += 1
    for i in range(write, len(nums)):
        nums[i] = 0
    return nums
`,
    },
    javascript: {
      entry: "moveZeroes",
      starter: `function moveZeroes(nums) {
  // Keep non-zero order, push zeroes to the end, return the array.
}
`,
      solution: `function moveZeroes(nums) {
  let write = 0;
  for (const n of nums) {
    if (n !== 0) nums[write++] = n;
  }
  while (write < nums.length) nums[write++] = 0;
  return nums;
}
`,
    },
  },
  tests: [
    { name: "zeroes interleaved", args: [[0, 1, 0, 3, 12]], expected: [1, 3, 12, 0, 0] },
    { name: "already in order", args: [[1, 2, 3]], expected: [1, 2, 3] },
    { name: "all zeroes", args: [[0, 0]], expected: [0, 0] },
    { name: "empty list", args: [[]], expected: [] },
    { name: "leading zero run", args: [[0, 0, 1, 2]], expected: [1, 2, 0, 0], hidden: true },
  ],
  hints: [PLACEHOLDER],
};
