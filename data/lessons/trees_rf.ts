import { PLACEHOLDER, type TopicLesson } from "./types";

const links = { theory: PLACEHOLDER, explanation: PLACEHOLDER, learnMore: PLACEHOLDER };

export const treesRfLesson: TopicLesson = {
  topicId: "trees_rf",
  overview: String.raw`A decision tree asks a sequence of yes/no questions about the features
and reads the answer off the leaf you land in. That is the whole idea, and it explains both
why trees are so useful on tabular data and why a single one is rarely enough.

Trees need no feature scaling, handle mixed numeric and categorical inputs, capture
interactions without being told they exist, and produce a model you can print out and argue
with. What they do badly is generalise: grow one deep enough and it will carve out a region
for every training row, memorising noise as confidently as signal.

Random forests fix that by averaging. Train many trees on different resamples of the data,
with different features available at each split, and average their predictions. Individual
trees stay unstable; their average does not, because their errors are partly independent and
partly cancel.

The four lessons below build that up: how a single split is chosen, why depth is dangerous,
what averaging actually buys, and how to read feature importance without over-claiming. The
last one matters more than it sounds — importance scores are the most frequently misread
output any tree model produces.`,
  subtopics: [
    {
      id: "how-a-tree-splits",
      title: "How a tree chooses a split",
      summary: "Impurity, weighted gain, the greedy search over candidate cuts.",
      minutes: 4,
      links,
      sections: [
        {
          id: "impurity",
          heading: "Measuring how mixed a node is",
          body: String.raw`A split is good when it separates the classes. To make that precise
you need a number for "how mixed is this group", and the usual choice is Gini impurity:

$$G = 1 - \sum_k p_k^2$$

where $p_k$ is the share of class $k$ in the node. A pure node scores 0. A two-class node
split evenly scores $1 - (0.5^2 + 0.5^2) = 0.5$, the worst it can be. Entropy,
$-\sum_k p_k \log p_k$, behaves similarly and rarely changes which split wins; Gini is the
default mostly because it is cheaper to compute.

For regression trees the same role is played by variance within the node, and the split that
reduces total within-node variance most is the one chosen.`,
        },
        {
          id: "gain",
          heading: "Weighted gain, not average gain",
          body: `The value of a split is the parent's impurity minus the impurity of the
children, each child weighted by how many samples fall into it. The weighting is essential. A
split that produces one perfectly pure leaf holding two rows and one badly mixed leaf holding
two hundred has barely improved anything, and unweighted averaging would rate it highly.

The search itself is greedy and exhaustive: for each feature, sort the values, consider every
threshold between adjacent distinct values, compute the weighted gain, keep the best. Then
recurse into each child. No attempt is made to look ahead, which is why a tree can miss a
structure that two coordinated splits would capture easily.`,
        },
        {
          id: "worked",
          heading: "Six cases, one split",
          body: `Take six rows with labels \`[0, 0, 0, 1, 1, 1]\` and a feature
\`x = [1, 2, 3, 6, 7, 8]\`. The parent is evenly mixed, so its Gini is 0.5.

Split at $x < 4.5$: the left child holds three rows, all class 0, impurity 0. The right child
holds three rows, all class 1, impurity 0. Weighted child impurity is
$\\tfrac{3}{6}(0) + \\tfrac{3}{6}(0) = 0$, so the gain is the full 0.5 and the split is perfect.

Now split at $x < 2.5$ instead: the left child is two rows of class 0 (impurity 0), the right
is four rows split one-to-three, with impurity $1 - (0.25^2 + 0.75^2) = 0.375$. Weighted
impurity is $\\tfrac{2}{6}(0) + \\tfrac{4}{6}(0.375) = 0.25$, a gain of only 0.25. The greedy
search picks the first.`,
        },
        {
          id: "categoricals",
          heading: "Categorical features need care",
          body: `A categorical feature with many levels offers a great many possible groupings,
and that abundance is itself a hazard: with enough distinct values, some split will separate
the training labels well by chance alone. A user ID column will look like the most informative
feature in the dataset and generalise to nothing.

Implementations differ in how they handle this. Some require one-hot encoding, which is safe
but loses the ability to group levels. Some sort levels by mean target and split on that
ordering, which is efficient and leaks target information unless done carefully inside each
fold. Knowing which your library does is worth the five minutes it takes to check.`,
          callout: {
            title: "High-cardinality columns flatter themselves",
            body: "The more distinct values a feature has, the more split points it offers, and the easier it is for one to fit noise. This biases both split selection and the importance scores computed from it.",
          },
        },
      ],
      questions: [
        {
          question: "Why weight child impurity by sample count?",
          answer: "Otherwise a split producing one tiny pure leaf and one large mixed leaf scores as well as a genuinely balanced separation. The weighting makes the measure reflect how much of the data was actually sorted out.",
        },
        {
          question: "Why can a greedy tree miss structure that clearly exists?",
          answer: "It evaluates one split at a time with no lookahead. A pattern such as exclusive-or gives no single feature any first-split gain, so the search sees nothing worth doing even though two coordinated splits would separate the data completely.",
        },
      ],
    },
    {
      id: "overfitting-and-pruning",
      title: "Depth, overfitting, pruning",
      summary: "Why an unconstrained tree memorises, with the controls that stop it.",
      minutes: 4,
      links,
      sections: [
        {
          id: "perfect-fit",
          heading: "A deep tree can fit anything",
          body: `Left unconstrained, a tree keeps splitting until every leaf is pure. On data with
no duplicate feature rows that means a leaf per training row, training error of zero, and a
model that has memorised the dataset including its noise.

The symptom is stark: near-perfect training accuracy alongside mediocre held-out accuracy.
Unlike linear models, where overfitting creeps in gradually as features are added, a tree can
go from reasonable to memorising within a few extra levels of depth.`,
        },
        {
          id: "controls",
          heading: "The knobs that matter",
          body: `Three constraints do most of the work. \`max_depth\` caps how many questions can
be asked in sequence, which bounds the interaction order the tree can represent.
\`min_samples_leaf\` refuses splits that would leave too few rows in a child, which directly
stops leaves fitted to a handful of points. \`min_samples_split\` does the same at the parent.

Of these, \`min_samples_leaf\` is usually the most robust to tune: it responds to how much data
you have rather than to how deep the structure happens to be, and it constrains the parts of
the tree that are actually over-confident.`,
        },
        {
          id: "pruning",
          heading: "Growing then cutting back",
          body: `Stopping early is greedy in the same way splitting is: a split that looks useless
now may enable a valuable one below it. Cost-complexity pruning avoids that by growing the tree
fully and then removing subtrees whose contribution does not justify their size, governed by a
penalty $\\alpha$ on leaf count.

Sweeping $\\alpha$ produces a nested sequence of trees from the full one down to a single node,
and cross-validation picks among them. It is more expensive than early stopping and usually
gives a better tree, which is why it is the textbook method even though depth limits are what
most people reach for.`,
        },
        {
          id: "instability",
          heading: "The deeper problem",
          body: `Even a well-pruned tree is unstable. Change a few training rows and the top split
may change, which changes everything beneath it — the structure you were reading as an
explanation can be substantially different on a resample of the same data.

This is a property of the model class, not a tuning failure, and no amount of pruning fixes
it. It is the reason averaging exists, and the subject of the next lesson.`,
          callout: {
            title: "Do not read a single tree as the explanation",
            body: "Refit on a bootstrap sample and compare. If the top splits move, the structure is telling you about this sample rather than about the process that generated it.",
          },
        },
      ],
      questions: [
        {
          question: "A tree scores 100% on training data and 71% on validation. What is happening?",
          answer: "It has grown until every leaf is pure, fitting noise as well as signal. Constrain depth or minimum leaf size, or prune, and expect training accuracy to fall while validation accuracy rises.",
        },
        {
          question: "Why can pruning beat early stopping?",
          answer: "Early stopping is greedy: it rejects a low-gain split without seeing that a valuable split might sit beneath it. Pruning grows the tree first, so it judges subtrees on their whole contribution rather than on their first step.",
        },
      ],
    },
    {
      id: "bagging-and-random-forests",
      title: "Averaging many trees",
      summary: "What bootstrap sampling buys, with the extra randomness forests add.",
      minutes: 4,
      links,
      notebookId: "trees_rf",
      sections: [
        {
          id: "bagging",
          heading: "Bootstrap aggregation",
          body: `Train each tree on a bootstrap sample — draw $n$ rows with replacement from $n$
rows — then average the predictions, or take a majority vote for classification.

Averaging reduces variance. If the trees made independent errors, averaging $B$ of them would
cut the error variance by a factor of $B$. They do not, because they share most of their
training data, so the benefit is smaller. But it is real, and it costs only compute.

Crucially, bagging does not require the individual trees to be good. Deep unpruned trees have
low bias and high variance, which is exactly the profile averaging repairs. Bagging shallow
trees helps far less, because their problem is bias and averaging does nothing for that.`,
        },
        {
          id: "feature-randomness",
          heading: "Why forests also sample features",
          body: String.raw`Bagged trees stay correlated: if one feature dominates, every tree
splits on it first and they all make similar mistakes. A random forest breaks that by
considering only a random subset of features at each split — commonly $\sqrt{p}$ for
classification.

This deliberately makes each tree worse. A tree denied the best feature at some split must use
a second-best one, raising its individual error. But it decorrelates the ensemble, and for an
average, lower correlation beats lower individual error. That trade is the single idea that
separates a random forest from plain bagging.`,
          callout: {
            title: "Worse trees, better forest",
            body: "Feature sampling raises the error of every individual tree and lowers the error of the ensemble. If that sounds wrong, it is the same reason a diversified portfolio beats its average holding.",
          },
        },
        {
          id: "oob",
          heading: "Out-of-bag estimates come free",
          body: `A bootstrap sample leaves out about 37% of rows each time. Each row can therefore
be predicted by the trees that never saw it, and aggregating those predictions gives an
out-of-bag error estimate at no extra cost.

It is a reasonable substitute for cross-validation during development, and it is subject to the
same caveat as any random split: if rows are grouped or ordered in time, OOB inherits that leak
too. Bootstrapping does not know that two rows are the same customer.`,
        },
        {
          id: "tuning",
          heading: "What to tune",
          body: `More trees is monotonically better for accuracy and only costs time — the curve
flattens, but it does not turn back upward, so there is no overfitting-by-adding-trees to fear.
Pick a number where the OOB curve has plateaued.

The parameters that matter are the feature-sampling rate and the leaf-size constraint. Forests
are famously forgiving here; defaults are usually close, and the gains from tuning are modest
compared with what the same effort spent on features would return.`,
        },
      ],
      questions: [
        {
          question: "Why sample features at each split rather than once per tree?",
          answer: "Sampling per split decorrelates the trees throughout their depth, not only at the root. Restricting features once per tree leaves every split in that tree drawing on the same subset, which keeps the trees more similar than the averaging wants them to be.",
        },
        {
          question: "What exactly does out-of-bag error estimate?",
          answer: "Performance on rows a given tree never trained on, aggregated across the forest. It approximates held-out error, and it inherits any leakage present in the row structure — grouped or time-ordered data makes it optimistic just as a random split would.",
        },
        {
          question: "Can adding more trees cause overfitting?",
          answer: "No. Each tree is fitted independently and the average converges as the count grows; error flattens rather than rising. Overfitting in a forest comes from letting individual trees grow unconstrained, not from having many of them.",
        },
      ],
    },
    {
      id: "feature-importance",
      title: "Reading feature importance",
      summary: "What importance scores measure, with the claims they cannot support.",
      minutes: 4,
      links,
      sections: [
        {
          id: "impurity-importance",
          heading: "Built-in importance is biased",
          body: `The default importance in most libraries adds up the impurity reduction each
feature achieved, weighted by how many samples passed through those splits. It is free to
compute, because the numbers already exist from training.

It is also biased toward features with many possible split points. Continuous features and
high-cardinality categoricals get more chances to reduce impurity, so they score higher than
equally informative binary features. A random unique ID can rank near the top. Treat this score
as a rough diagnostic and never as evidence.`,
        },
        {
          id: "permutation",
          heading: "Permutation importance",
          body: `A better measure: shuffle one feature's column in held-out data, re-score, and
record how much performance dropped. The bigger the drop, the more the model was relying on
that feature.

Two properties make this preferable. It is measured on data the model did not train on, and it
reflects the fitted model's actual reliance rather than an artefact of the splitting procedure.
It is slower, needing a full re-scoring per feature, and worth the cost whenever the answer
will be quoted to anyone.`,
        },
        {
          id: "correlated",
          heading: "Correlated features split the credit",
          body: `Two strongly correlated features will each show low permutation importance, because
shuffling one leaves the other available to carry the same information. Read naively, both look
unimportant, and dropping both would hurt badly.

Group correlated features and permute them together, or cluster first and report at the cluster
level. The same caution applies to the built-in scores, where correlated features instead split
the impurity credit between them more or less arbitrarily depending on which won each split.`,
        },
        {
          id: "not-causal",
          heading: "Importance is not effect",
          body: `A high importance means the model used the feature. It does not mean intervening
on that feature would change the outcome. A model predicting illness from prescribed medication
will rank the medication highly; taking patients off it would not make them well.

This is the same distinction as in linear regression, where a coefficient is not automatically a
causal effect, and it is worth stating explicitly because tree importance has an air of
objectivity that invites exactly this misreading.`,
          callout: {
            title: "The question importance answers",
            body: "\"What is this model leaning on?\" — useful for debugging, auditing and detecting leakage. Not \"what drives the outcome?\", which needs a causal design rather than a fit.",
          },
        },
      ],
      questions: [
        {
          question: "Why can a random ID column rank as important?",
          answer: "A high-cardinality feature offers many split points, so some split will separate training labels by chance. Impurity-based importance rewards that, which is why it is biased toward features with many distinct values.",
        },
        {
          question: "Two correlated features both show near-zero permutation importance. What does that tell you?",
          answer: "That either alone is redundant given the other, not that the information is unimportant. Shuffling one leaves the second to supply it. Permute them as a group to see their joint contribution.",
        },
        {
          question: "Can permutation importance show that a feature causes the outcome?",
          answer: "No. It measures how much the fitted model depends on that column. A feature that is merely a consequence or a proxy of the outcome can dominate, which is exactly how leakage presents itself.",
        },
      ],
    },
  ],
};
