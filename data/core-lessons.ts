export type CoreLesson = {
  id: string;
  title: string;
  subtitle: string;
  eyebrow: string;
  tags: string[];
  note: string;
  notebookIntro: string;
  sections: { id: string; label: string; kicker: string; heading: string; body: string; callout?: { title: string; body: string } }[];
  questions: { question: string; answer: string }[];
  sources: { label: string; url: string }[];
};

export const coreLessons = {
  log_reg: {
    id: "log_reg", title: "Logistic Regression & BCE Loss", eyebrow: "CORE ML · CLASSIFICATION",
    subtitle: "Turn a linear score into a binary probability, then choose decisions using the costs that matter.",
    tags: ["Classification", "Likelihood", "Decision thresholds"],
    note: "A probability estimate and a decision are separate things. Evaluate probability quality before selecting a threshold.",
    notebookIntro: "Calculate sigmoid probabilities, binary cross-entropy, a gradient step, and confusion counts from scratch with Python's standard library.",
    sections: [
      { id: "overview", label: "When to use it", kicker: "01 / PURPOSE", heading: "A baseline for binary outcomes", body: String.raw`Logistic regression models the probability that a binary label equals 1. It is a good first model when a linear boundary in the chosen features is plausible, interpretability matters, or you need a benchmark before fitting a more flexible classifier.

The score $z=b+w^\mathsf{T}x$ is unbounded. The sigmoid maps it to $p=\sigma(z)=1/(1+e^{-z})$, which stays between zero and one. A threshold such as 0.5 then turns $p$ into a class decision. That threshold is a policy choice, not a property of the fitted coefficients.`, callout: { title: "Interpret probabilities carefully", body: "A coefficient changes log-odds conditional on the included features. It is not a causal effect by itself, and its exponent is an odds ratio rather than a risk ratio." } },
      { id: "likelihood", label: "Likelihood & gradient", kicker: "02 / CORE IDEA", heading: "Why binary cross-entropy appears", body: String.raw`Assume independent Bernoulli outcomes conditional on the features: $P(y_i\mid x_i)=p_i^{y_i}(1-p_i)^{1-y_i}$. Maximizing the product of those probabilities is equivalent to minimizing the average negative log-likelihood:

$$L(w,b)=-\frac{1}{n}\sum_i\left[y_i\log p_i+(1-y_i)\log(1-p_i)\right].$$

The sigmoid and log-loss derivatives cancel neatly: $\partial L/\partial z_i=(p_i-y_i)/n$. Therefore $\nabla_w L=X^\mathsf{T}(p-y)/n$ and $\partial L/\partial b=\sum_i(p_i-y_i)/n$. A gradient step subtracts the learning rate times these derivatives. Add a penalty when you need shrinkage; avoid penalizing the intercept by default.

Squared loss on an unconstrained linear prediction can produce values outside $[0,1]$. Logistic regression pairs a valid Bernoulli probability model with a loss that strongly penalizes confident mistakes.` },
      { id: "example", label: "Worked example", kicker: "03 / WORKED EXAMPLE", heading: "One update on two observations", body: String.raw`Start with $x=[0,1]$, labels $y=[0,1]$, and $w=b=0$. Both predictions are $0.5$. The mean BCE is $-\log(0.5)\approx0.6931$. The weight gradient is $[0(0.5-0)+1(0.5-1)]/2=-0.25$; the intercept gradient is zero.

With learning rate $\eta=1$, the next weight is $w=0.25$. The probabilities become $0.5$ and $\sigma(0.25)\approx0.5622$. This small step moves the second example toward its positive label. See the notebook for the calculation and a threshold comparison.` },
      { id: "extensions", label: "Interpret & extend", kicker: "04 / DESIGN CHOICES", heading: "Odds, regularization, and more classes", body: String.raw`If $w_j=0.7$, increasing feature $j$ by one unit multiplies the **conditional odds** by $e^{0.7}\approx2.01$, holding other features fixed. The probability change depends on the starting score: the sigmoid is steepest near 0.5 and flatter near 0 or 1.

L2 regularization shrinks weights; L1 can make some weights zero. Standardize numeric features inside each training fold if you want a comparable penalty. For multiclass problems, one-vs-rest fits a binary model per class; multinomial logistic regression uses a softmax and a joint cross-entropy objective. The resulting scores and calibration behavior can differ.

For rare positives, accuracy can hide missed cases. Inspect precision, recall, PR curves, log loss, and calibration. Class weights change the fitted objective and can affect calibration; verify probabilities afterward if you need them for downstream decisions.` },
      { id: "workflow", label: "Practical workflow", kicker: "05 / APPLY IT", heading: "From split to decision rule", body: String.raw`1. Define the positive label, time of prediction, available features, and cost of false positives versus false negatives.
2. Split by time, user, or group when random rows would leak future or related information. Fit imputation, encoding, and scaling on training folds only.
3. Fit an intercept-only or prevalence baseline, then logistic regression. Tune regularization on validation data; keep the final test set untouched.
4. Inspect log loss and calibration for probabilities; inspect PR behavior and confusion counts at candidate thresholds for actions.
5. Pick the operating threshold using validation data and documented costs or capacity, then measure the locked decision rule on the test set.`, callout: { title: "Thresholds belong to the deployment decision", body: "A 0.5 cutoff is only justified when the loss and class distribution make it appropriate. Report the threshold alongside performance." } },
    ],
    questions: [
      { question: "Why is the gradient proportional to p − y?", answer: "Differentiate BCE through the sigmoid: the sigmoid derivative p(1−p) cancels terms from the log-likelihood derivative, leaving p−y for each score." },
      { question: "Does an odds ratio of 2 mean twice the probability?", answer: "No. It doubles odds, p/(1−p). The corresponding probability change depends on the starting probability." },
      { question: "When would you move the decision threshold?", answer: "When false positives and false negatives have different costs, capacity is limited, or the base rate changes; select it on validation data and verify on a final test set." },
    ], sources: [{ label: "scikit-learn: Logistic regression", url: "https://scikit-learn.org/stable/modules/linear_model.html#logistic-regression" }],
  },
  trees_rf: {
    id: "trees_rf", title: "Decision Trees & Random Forests", eyebrow: "CORE ML · ENSEMBLES",
    subtitle: "Build splits you can inspect, then average diverse trees to reduce the instability of a single tree.",
    tags: ["Impurity", "Bagging", "Out-of-bag"],
    note: "A forest's feature importance depends on the metric and the validation data. Treat it as a diagnostic, not a causal attribution.",
    notebookIntro: "Compute a Gini split, fit shallow decision stumps, and compare one tree with a bootstrapped vote using only standard Python.",
    sections: [
      { id: "overview", label: "When to use them", kicker: "01 / PURPOSE", heading: "Rules for nonlinear tabular patterns", body: String.raw`A decision tree recursively divides feature space into regions, then predicts from the observations in a terminal leaf. Trees capture interactions and nonlinear thresholds without requiring feature scaling. A small tree can be explained as a set of rules; an unrestricted tree often memorizes noise.

A random forest aggregates many trees trained on bootstrap samples. At each split it also considers a random subset of features, making trees less correlated. Averaging predictions reduces variance when errors are not perfectly shared. For classification, aggregate votes or class probabilities; for regression, average numeric predictions.` },
      { id: "splits", label: "How splits work", kicker: "02 / CORE IDEA", heading: "Impurity and weighted gain", body: String.raw`For classification, Gini impurity is $1-\sum_k p_k^2$; entropy is $-\sum_k p_k\log_2 p_k$. Both are zero in a pure node. A candidate split is scored by parent impurity minus the **sample-weighted** impurity of its two children:

$$\Delta I=I(P)-\frac{n_L}{n_P}I(L)-\frac{n_R}{n_P}I(R).$$

For regression, a common split score is reduction in squared error. Continue splitting only while constraints such as maximum depth, minimum samples per leaf, or cost-complexity pruning allow it. The greedy split chosen now may not yield the globally best tree later.`, callout: { title: "Do not mistake training purity for generalization", body: "A fully grown tree can achieve nearly pure training leaves while making unstable predictions for new rows. Compare candidate complexity on held-out data." } },
      { id: "example", label: "Worked split", kicker: "03 / WORKED EXAMPLE", heading: "Six cases, one split", body: String.raw`Suppose six labels are $[0,0,0,1,1,1]$. The parent has equal class proportions, so Gini impurity is $1-(3/6)^2-(3/6)^2=0.5$. A candidate threshold leaves $[0,0,0,1]$ on the left and $[1,1]$ on the right.

The left impurity is $1-(3/4)^2-(1/4)^2=0.375$; the right is zero. Weighted child impurity is $(4/6)(0.375)+(2/6)(0)=0.25$, so the improvement is **0.25**. The notebook reproduces this calculation and searches thresholds.` },
      { id: "forest", label: "Why a forest helps", kicker: "04 / ENSEMBLES", heading: "Bagging, feature randomness, and OOB", body: String.raw`Bootstrap sampling draws training rows with replacement for each tree. Some rows are excluded from that tree; those **out-of-bag (OOB)** rows can provide an internal estimate of performance by aggregating only trees that did not train on a row. It is useful, but a separate untouched test set remains valuable for the final result.

If one strong feature dominates every tree, their errors may become correlated. Sampling a subset of features at each split gives alternatives a chance, which can improve the ensemble. The usual square-root-of-feature-count setting for classification is a starting point, not a law.

Mean decrease in impurity accumulates training split gains and can favor features with many candidate thresholds. Permutation importance measures the change in a chosen held-out metric after shuffling one feature; correlated features can mask one another. Both describe model reliance under an evaluation setup, not causality.` },
      { id: "workflow", label: "Practical workflow", kicker: "05 / APPLY IT", heading: "Validate the forest, not only the leaves", body: String.raw`1. Set the prediction horizon and split by time or group when appropriate. Compare against a trivial baseline and a small interpretable tree.
2. Tune depth or minimum leaf size on validation data. For a forest, consider number of trees, leaf size, feature subsampling, and class balance.
3. Check OOB and validation scores with the same metric; prefer external validation when rows are dependent or leakage is possible.
4. Inspect errors by segment and use held-out permutation importance carefully. For imbalanced labels, measure precision, recall, and calibration as needed.
5. Keep the test set for one final estimate, and monitor drift in feature definitions and missingness after deployment.` },
    ],
    questions: [
      { question: "Why sample features at each forest split?", answer: "It reduces the tendency for the same strong feature to dominate every tree, lowering correlation between tree errors and improving the average when signal remains available." },
      { question: "What does OOB estimate?", answer: "It predicts each training row using only trees whose bootstrap sample omitted it. It is an internal generalization estimate, subject to data dependence and tuning choices." },
      { question: "Can permutation importance establish that a feature causes the outcome?", answer: "No. It measures a model and metric response to shuffling; correlated predictors and shifted combinations can distort the reading." },
    ], sources: [{ label: "scikit-learn: Decision trees", url: "https://scikit-learn.org/stable/modules/tree.html" }, { label: "scikit-learn: Forests of randomized trees", url: "https://scikit-learn.org/stable/modules/ensemble.html#forests-of-randomized-trees" }],
  },
  gbms: {
    id: "gbms", title: "Gradient Boosting (XGBoost, LightGBM, CatBoost)", eyebrow: "CORE ML · BOOSTING",
    subtitle: "Add small corrective trees in sequence, then control how quickly the ensemble learns.",
    tags: ["Pseudo-residuals", "Regularization", "Tabular ML"],
    note: "Boosting is sequential. Each new tree responds to the current ensemble's loss, so validation-based stopping matters.",
    notebookIntro: "Follow two boosting rounds on four numeric targets, then calculate an XGBoost-style leaf weight and split gain from supplied gradients.",
    sections: [
      { id: "overview", label: "When to use it", kicker: "01 / PURPOSE", heading: "Sequential corrections for tabular data", body: String.raw`Gradient boosting builds an additive model, $F_t(x)=F_{t-1}(x)+\eta f_t(x)$, where $f_t$ is a new weak learner, often a shallow tree, and $\eta$ is the learning rate. It can fit nonlinear patterns and interactions in tabular data with flexible losses.

Unlike a random forest's largely independent trees, each boosting round depends on the current model. A smaller learning rate often needs more rounds. Depth, number of leaves, subsampling, minimum leaf size, penalties, and early stopping control complexity.` },
      { id: "gradient", label: "Gradients & objective", kicker: "02 / CORE IDEA", heading: "Fit what the current model gets wrong", body: String.raw`For differentiable loss $\ell(y,F)$, the **negative gradient** with respect to the current prediction is the direction that locally reduces loss. Under half-squared error, $\ell=\tfrac12(y-F)^2$, the negative gradient is the residual $y-F$. Under other losses, pseudo-residuals are different; never assume they always equal numeric residuals.

XGBoost approximates the incremental objective with first and second derivatives $g_i$ and $h_i$. For a leaf with summed gradients $G$ and Hessians $H$, an L2-regularized optimal weight is $w^*=-G/(H+\lambda)$. Its split gain, before any implementation-specific conventions, has the form

$$\text{gain}=\tfrac12\left[\frac{G_L^2}{H_L+\lambda}+\frac{G_R^2}{H_R+\lambda}-\frac{G_P^2}{H_P+\lambda}\right]-\gamma.$$

Here $\gamma$ penalizes adding a leaf and $\lambda$ shrinks leaf scores. A split must earn enough improvement to offset its cost.` },
      { id: "example", label: "Worked rounds", kicker: "03 / WORKED EXAMPLE", heading: "Two rounds on four targets", body: String.raw`Take targets $[1,1,3,3]$ and start every prediction at the mean, $F_0=2$. Residuals are $[-1,-1,1,1]$. A stump separating the first two rows from the last two fits leaf values $-1$ and $+1$. With learning rate $0.5$, new predictions are $[1.5,1.5,2.5,2.5]$.

The new residuals are $[-0.5,-0.5,0.5,0.5]$. A second identical stump and learning rate $0.5$ produce $[1.25,1.25,2.75,2.75]$. Training half-squared error falls, but only held-out performance tells you whether another round helps. The notebook walks through both updates.` },
      { id: "variants", label: "Three toolkits", kicker: "04 / COMPARISON", heading: "XGBoost, LightGBM, and CatBoost", body: String.raw`**XGBoost** formalizes split scoring with gradient and Hessian sums, regularizes leaf weights, and supports row and column sampling. Common tree growth strategies include depth-wise and loss-guided; the configured method matters.

**LightGBM** uses histogram-based splitting and grows the leaf with the largest loss reduction, which can be efficient but may overfit small datasets without limits. Its GOSS technique keeps large-gradient examples and samples smaller-gradient ones; EFB bundles mutually exclusive sparse features to reduce feature dimension.

**CatBoost** is especially useful for categorical features. Ordered target statistics use only earlier rows in a permutation for a row's category statistic, reducing target leakage; ordered boosting tackles prediction shift. These methods do not excuse mixing future information into features or validation splits.

No toolkit wins on every dataset. Compare quality, training time, inference cost, category handling, and tuning effort under the same honest split.`, callout: { title: "Category handling is part of validation", body: "A mean-encoded category computed on the full dataset leaks labels. Fit any encoding with training data only, and preserve temporal ordering when the task requires it." } },
      { id: "workflow", label: "Practical workflow", kicker: "05 / APPLY IT", heading: "A controlled boosting experiment", body: String.raw`1. Establish a simple model and leakage-safe split, with a validation set for tuning and a final holdout.
2. Choose an objective that matches the target; compare its evaluation metric with the business decision metric.
3. Start with modest tree complexity, a learning rate, and enough rounds for early stopping. Tune depth or leaves and minimum leaf size first.
4. Evaluate calibration for probabilistic classification, segment errors, latency, and feature handling. Record the best iteration found on validation data.
5. Refit according to your deployment protocol without peeking at the final test labels. Save preprocessing, feature schema, model configuration, and evaluation artifacts together.` },
    ],
    questions: [
      { question: "When are boosting pseudo-residuals ordinary residuals?", answer: "For half-squared error, the negative derivative with respect to a prediction is y−F. Other objectives have different gradients." },
      { question: "What does XGBoost's second derivative add?", answer: "The Hessian provides curvature in the local Taylor approximation; together with summed gradients and regularization, it determines leaf scores and split gain." },
      { question: "Why can naive target encoding leak labels?", answer: "If a row's encoded value includes its own target, the model sees a label-derived feature. Ordered statistics use earlier rows in a permutation for training encodings." },
    ], sources: [{ label: "XGBoost: Introduction to boosted trees", url: "https://xgboost.readthedocs.io/en/stable/tutorials/model.html" }, { label: "LightGBM: Features", url: "https://lightgbm.readthedocs.io/en/latest/Features.html" }, { label: "CatBoost: Unbiased boosting with categorical features", url: "https://arxiv.org/abs/1706.09516" }],
  },
  dl_fnn: {
    id: "dl_fnn", title: "Feedforward Neural Networks & Backprop", eyebrow: "CORE ML · DEEP LEARNING",
    subtitle: "Follow activations forward, derivatives backward, and understand what an optimizer actually updates.",
    tags: ["MLP", "Chain rule", "Optimization"],
    note: "Debug the smallest network that can learn your data before adding layers, regularizers, and training infrastructure.",
    notebookIntro: "Run a single-neuron gradient step and a finite-difference gradient check, then inspect a two-layer XOR network from scratch.",
    sections: [
      { id: "overview", label: "When to use it", kicker: "01 / PURPOSE", heading: "Learn nonlinear feature combinations", body: String.raw`A feedforward network composes affine transformations and nonlinear activations: $a^{(l)}=\phi(W^{(l)}a^{(l-1)}+b^{(l)})$. Without a nonlinearity, stacked linear layers collapse into a single linear map. A multilayer perceptron (MLP) can learn interactions that a linear baseline misses.

For tabular data, compare against trees and simpler baselines. For images, language, and structured signals, MLP layers often serve as components of larger architectures. Choose output activation and loss together: a binary logit with BCE, class logits with softmax cross-entropy, or a numeric output with an appropriate regression loss.` },
      { id: "backprop", label: "Backpropagation", kicker: "02 / CORE IDEA", heading: "Apply the chain rule in reverse", body: String.raw`For one neuron, let $z=wx+b$, $a=\sigma(z)$, and $L=\tfrac12(a-y)^2$. The chain rule gives

$$\frac{\partial L}{\partial w}=\underbrace{(a-y)}_{\partial L/\partial a}\underbrace{a(1-a)}_{\partial a/\partial z}\underbrace{x}_{\partial z/\partial w},\qquad \frac{\partial L}{\partial b}=(a-y)a(1-a).$$

For a layer, cache inputs and pre-activations in the forward pass. Multiply the upstream gradient by the activation derivative to obtain the local error, then compute parameter gradients and propagate the error to the previous layer with the transpose of its weight matrix. Automatic differentiation does the bookkeeping, but this local rule explains its results.

For BCE paired with a sigmoid logit, the derivative with respect to the logit simplifies to $a-y$. Avoid computing log of a saturated probability directly; stable implementations work from logits.` },
      { id: "example", label: "Worked update", kicker: "03 / WORKED EXAMPLE", heading: "One neuron, one gradient step", body: String.raw`Set $x=2$, $y=1$, $w=b=0$. Then $z=0$, $a=0.5$, and $L=\tfrac12(0.5-1)^2=0.125$. Since $a(1-a)=0.25$, the weight gradient is $(0.5-1)(0.25)(2)=-0.25$ and the bias gradient is $-0.125$.

With learning rate $0.1$, gradient descent yields $w=0.025$ and $b=0.0125$. The new logit is $0.0625$, the prediction about $0.5156$, and the loss is lower. The notebook compares the analytic weight gradient with a finite-difference check.` },
      { id: "training", label: "Training choices", kicker: "04 / OPTIMIZATION", heading: "Activations, initialization, and AdamW", body: String.raw`ReLU returns $\max(0,z)$ and has a zero gradient for negative inputs; GELU smoothly gates inputs rather than applying a hard cutoff. Xavier initialization scales variance for symmetric activations, while He initialization is often used with ReLU-like activations. Neither guarantees healthy gradients in every architecture.

Momentum accumulates a moving direction; RMSprop scales steps by recent squared gradients. Adam combines moving averages of the first and second moments with bias correction. **AdamW** decouples weight decay from the loss gradient: conceptually, apply an Adam step and a separate shrinkage term to selected parameters. This differs from adding an L2 gradient inside Adam's adaptive rescaling.

Normalization, residual paths, and suitable initialization can help deep networks train. Dropout can regularize; gradient clipping limits large updates. Monitor training and validation loss, gradient norms, and activation ranges before assuming more training time will solve a stalled model.`, callout: { title: "A debugging sequence", body: "Try to overfit a tiny batch, check target and loss shapes, inspect one gradient numerically, then restore regularization and larger data." } },
      { id: "workflow", label: "Practical workflow", kicker: "05 / APPLY IT", heading: "Build and verify a training loop", body: String.raw`1. Split data before learned preprocessing, define the output shape and loss, and establish a baseline.
2. Start with a small model; seed randomness for debugging and inspect a forward pass for shapes and finite values.
3. Check that training loss falls on a tiny batch. If it does not, verify labels, loss reduction, gradient flow, and learning rate.
4. Compare optimizer and regularization settings on validation data. Track train/validation curves and stop according to a recorded criterion.
5. Evaluate once on untouched data, including relevant segments, and package model weights with normalization and input schema.` },
    ],
    questions: [
      { question: "Where does the input x appear in the weight gradient?", answer: "Through ∂z/∂w=x; the chain rule multiplies the upstream loss derivative, local activation derivative, and input." },
      { question: "How does AdamW differ from L2 inside Adam?", answer: "AdamW applies weight decay separately from the adaptive gradient update. Adding λw to the gradient lets Adam's moment scaling alter the decay." },
      { question: "What does a failed tiny-batch overfit suggest?", answer: "A bug in inputs, labels, loss, gradient flow, optimizer configuration, or model capacity is more likely than insufficient data." },
    ], sources: [{ label: "PyTorch: Autograd mechanics", url: "https://docs.pytorch.org/docs/stable/notes/autograd.html" }, { label: "Decoupled Weight Decay Regularization", url: "https://arxiv.org/abs/1711.05101" }],
  },
  transformers: {
    id: "transformers", title: "Transformers & Attention Mechanisms", eyebrow: "CORE ML · SEQUENCE MODELS",
    subtitle: "See how token representations exchange information through attention, position, and masking.",
    tags: ["Self-attention", "Position", "Architecture"],
    note: "Attention weights describe one computation inside a model. They do not by themselves prove the reason for a final prediction.",
    notebookIntro: "Compute scaled dot-product attention for two tokens, apply a causal mask, and compare its outputs with unmasked attention using standard Python.",
    sections: [
      { id: "overview", label: "Why attention", kicker: "01 / PURPOSE", heading: "Let tokens exchange context", body: String.raw`A transformer maps token embeddings into context-dependent representations. Each self-attention layer lets a token use information from other allowed positions. Unlike a fixed-width convolutional window, an attention head can assign weight across the input sequence. Feedforward layers, residual connections, and normalization complete a standard block.

Representations can serve different tasks. An encoder reads both left and right context for understanding; a causal decoder predicts the next token using earlier positions; an encoder–decoder processes input and generates output conditioned on the encoder states.` },
      { id: "attention", label: "Q, K, V", kicker: "02 / CORE IDEA", heading: "Scores, softmax, weighted values", body: String.raw`A layer projects inputs $X$ into queries $Q=XW_Q$, keys $K=XW_K$, and values $V=XW_V$. A query compares with each key. Scale dot products by $\sqrt{d_k}$, apply any mask, normalize each query row with softmax, and average the values:

$$\operatorname{Attention}(Q,K,V)=\operatorname{softmax}\!\left(\frac{QK^\mathsf{T}}{\sqrt{d_k}}+M\right)V.$$

For a causal mask, disallowed future positions receive $-\infty$ before softmax and thus zero weight. Scaling helps prevent dot products from growing with key dimension and driving softmax toward saturation under common assumptions. Multiple heads learn distinct projections; concatenate their outputs and project again.` },
      { id: "example", label: "Worked attention", kicker: "03 / WORKED EXAMPLE", heading: "Two tokens, two dimensions", body: String.raw`Take $Q=K=V=\begin{bmatrix}1&0\\0&1\end{bmatrix}$. Before scaling, query 1 has scores $[1,0]$ and query 2 has $[0,1]$. After division by $\sqrt2$, softmax gives each query about $[0.670,0.330]$ over itself and the other token, respectively. With identity values, the output rows equal those weights.

In causal self-attention, token 1 may see only itself, so its output becomes $[1,0]$. Token 2 may see both and keeps about $[0.330,0.670]$. The notebook calculates the weights and verifies that each allowed row sums to one.` },
      { id: "position", label: "Position & variants", kicker: "04 / ARCHITECTURE", heading: "Order, masking, and memory", body: String.raw`Self-attention over a sequence without position information is permutation equivariant: rearranging input tokens rearranges outputs in the same way. Absolute position embeddings add position-dependent information to token vectors. Rotary position embeddings (RoPE) rotate query and key components by position-dependent angles, making their dot products depend on relative offsets.

An **encoder-only** model such as BERT commonly uses bidirectional attention. A **decoder-only** model such as GPT uses a causal mask for autoregressive generation. An **encoder–decoder** model such as T5 uses encoder self-attention, causal decoder self-attention, and cross-attention from decoder queries to encoder outputs.

The ordinary attention score matrix has $n^2$ entries for sequence length $n$. FlashAttention computes exact attention with tiling and online softmax to reduce memory traffic and avoid materializing the full score matrix in high-bandwidth memory. Attention arithmetic remains quadratic in sequence length for dense exact attention; memory behavior is the key distinction.`, callout: { title: "Mask before softmax", body: "Masking probabilities after softmax without renormalizing produces a different distribution and can leak future context in a causal model." } },
      { id: "workflow", label: "Practical workflow", kicker: "05 / APPLY IT", heading: "Check architecture and evaluation", body: String.raw`1. Define the task and output: classification, span prediction, next-token generation, or conditional generation.
2. Match masks and positional treatment to the task. Verify that token 1 cannot attend to future tokens in a causal decoder.
3. Inspect tokenization, padding masks, truncation, and label shifting. These are common sources of silent mistakes.
4. Evaluate on separated documents or time periods to prevent near-duplicate leakage. Track task quality plus context length, latency, and memory.
5. In generation, test prompt and distribution shifts, factual accuracy where relevant, and failure modes beyond a single aggregate score.` },
    ],
    questions: [
      { question: "Why divide attention scores by √dₖ?", answer: "With roughly independent, unit-variance components, dot-product variance grows with dₖ. Scaling moderates score magnitude and softmax saturation." },
      { question: "What does FlashAttention save?", answer: "It tiles exact attention and uses online normalization, reducing reads and writes to slower memory and avoiding a fully materialized n×n score matrix; dense attention arithmetic still scales quadratically." },
      { question: "How does RoPE carry position?", answer: "It rotates query and key pairs by position-dependent angles; their dot product includes the difference between positions, giving a relative-position relationship." },
    ], sources: [{ label: "Attention Is All You Need", url: "https://arxiv.org/abs/1706.03762" }, { label: "RoFormer: Rotary Position Embedding", url: "https://arxiv.org/abs/2104.09864" }, { label: "FlashAttention", url: "https://arxiv.org/abs/2205.14135" }],
  },
} satisfies Record<string, CoreLesson>;

export type CoreLessonId = keyof typeof coreLessons;

/**
 * Reading order across the Core ML track. `lin_reg` keeps a bespoke page, so it
 * is listed here rather than derived from `coreLessons`.
 */
export const CORE_LESSON_ORDER = [
  "lin_reg",
  "log_reg",
  "trees_rf",
  "gbms",
  "dl_fnn",
  "transformers",
] as const;

export const CORE_LESSON_TITLES: Record<string, string> = {
  lin_reg: "Linear Regression & Regularization",
  ...Object.fromEntries(
    Object.entries(coreLessons).map(([id, lesson]) => [id, lesson.title]),
  ),
};
