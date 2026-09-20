import { PLACEHOLDER, type TopicLesson } from "./types";

const links = { theory: PLACEHOLDER, explanation: PLACEHOLDER, learnMore: PLACEHOLDER };

export const logRegLesson: TopicLesson = {
  topicId: "log_reg",
  overview: String.raw`Logistic regression models the probability that a binary label is 1. It
is the classification counterpart to linear regression: a weighted sum of features, squashed
into a probability, fitted by maximising how likely the observed labels were.

Reach for it when a linear boundary in your chosen features is plausible, when you need
calibrated probabilities rather than bare labels, or when someone will ask why the model
decided what it decided. It stays the sensible baseline long after fancier models are on the
table, because it is fast to fit, hard to overfit with regularisation, and gives numbers you
can interrogate.

The distinction that causes the most trouble in practice is between a **probability** and a
**decision**. The model produces the first. Turning it into the second requires a threshold,
and that threshold is a policy choice about the relative cost of the two ways of being
wrong — not something the fitting procedure can tell you. A model with excellent probability
estimates can still produce terrible decisions at the wrong cutoff.

The four lessons below follow that arc: how the score becomes a probability, why the loss
function has the shape it does, how to choose the operating point, and what changes when
there are more than two classes.`,
  subtopics: [
    {
      id: "sigmoid-and-odds",
      title: "From score to probability",
      summary: "How the sigmoid turns an unbounded score into a usable probability.",
      minutes: 4,
      links,
      problemSlugs: ["sigmoid"],
      sections: [
        {
          id: "the-squash",
          heading: "The sigmoid",
          body: String.raw`The linear part is familiar: a score $z = b + w^{\mathsf T}x$, which
can be any real number. Probabilities cannot. The sigmoid maps one to the other:

$$p = \sigma(z) = \frac{1}{1 + e^{-z}}$$

It is monotonic, so a higher score always means a higher probability, and it saturates at both
ends, so extreme scores move the probability very little. At $z = 0$ the probability is exactly
$0.5$; at $z = 2$ it is about $0.88$; at $z = -2$ it is about $0.12$.`,
        },
        {
          id: "why-not-linear",
          heading: "Why not fit a line to the labels",
          body: `You could fit ordinary least squares to 0/1 labels. Two things go wrong.
Predictions run outside $[0, 1]$, which is not merely untidy — there is no sensible reading of
a predicted probability of $1.4$. And squared loss on a probability punishes a confident
mistake far too gently, so the fit is dragged around by points it already classifies correctly.

The sigmoid solves the range problem. The loss function in the next lesson solves the second.`,
        },
        {
          id: "odds",
          heading: "What a coefficient means",
          body: String.raw`Because the sigmoid is invertible, the model has a second reading.
The **log-odds** are linear in the features:

$$\log\frac{p}{1-p} = b + w^{\mathsf T}x$$

So if $w_j = 0.7$, increasing feature $j$ by one unit multiplies the conditional odds by
$e^{0.7} \approx 2.01$, holding the other included features fixed. That is a clean statement
about odds, and it is why coefficients are often reported as odds ratios.

It is not a statement about probability. Doubling the odds moves a probability of $0.1$ to
about $0.18$, but moves $0.5$ to $0.67$. The same coefficient produces a different probability
change depending on where you start.`,
          callout: {
            title: "An odds ratio of 2 does not double the probability",
            body: "It doubles p/(1−p). How much the probability itself moves depends entirely on the starting probability, and the effect shrinks as you approach either end.",
          },
        },
      ],
      questions: [
        {
          question: "Why is the sigmoid preferred to simply clipping a linear prediction to [0, 1]?",
          answer: "Clipping is flat outside the range, so the gradient vanishes for exactly the points that are most wrong, and the model stops learning from them. The sigmoid is smooth everywhere, saturating gradually rather than abruptly.",
        },
        {
          question: "A coefficient is 0. What does that say about the feature?",
          answer: "That this model, with these other features included, found no linear association with the log-odds. It is not evidence the feature is irrelevant — it may be predictive on its own and redundant given the others, or related in a way a linear term cannot express.",
        },
      ],
    },
    {
      id: "bce-and-the-gradient",
      title: "Binary cross-entropy",
      summary: "Where the loss comes from, plus the gradient it produces.",
      minutes: 4,
      links,
      problemSlugs: ["binary-cross-entropy"],
      notebookId: "log_reg",
      sections: [
        {
          id: "from-likelihood",
          heading: "The loss is a likelihood in disguise",
          body: String.raw`Assume each outcome is an independent Bernoulli draw given its
features: $P(y_i \mid x_i) = p_i^{y_i}(1-p_i)^{1-y_i}$. Maximising the product of those
probabilities across the dataset is the same as minimising the negative average of their logs,
which is binary cross-entropy:

$$L(w,b) = -\frac{1}{n}\sum_i\left[y_i\log p_i + (1-y_i)\log(1-p_i)\right]$$

Read it one term at a time. When $y_i = 1$ only $\log p_i$ survives, so the loss is small when
$p_i$ is near 1 and grows without bound as $p_i$ approaches 0. Confident and wrong is
arbitrarily expensive, which is exactly the property squared loss lacks.`,
        },
        {
          id: "the-gradient",
          heading: "A gradient that simplifies beautifully",
          body: String.raw`Differentiating through the sigmoid looks unpleasant and is not. The
sigmoid's derivative $p(1-p)$ cancels against a matching term from the log, leaving

$$\frac{\partial L}{\partial z_i} = \frac{p_i - y_i}{n}$$

and therefore $\nabla_w L = X^{\mathsf T}(p - y)/n$. The update depends only on how far each
predicted probability is from its label. This cancellation is not a coincidence: it is what
makes cross-entropy the natural partner for the sigmoid, and pairing the sigmoid with squared
loss instead reintroduces a $p(1-p)$ factor that stalls learning when the model is confidently
wrong.`,
        },
        {
          id: "one-step",
          heading: "One update, by hand",
          body: String.raw`Take $x = [0, 1]$, labels $y = [0, 1]$, and start from $w = b = 0$.
Both predictions are $0.5$, so the mean loss is $-\log(0.5) \approx 0.6931$.

The weight gradient is $[0(0.5-0) + 1(0.5-1)]/2 = -0.25$. With learning rate $\eta = 1$ the
new weight is $w = 0.25$. The probabilities become $0.5$ and $\sigma(0.25) \approx 0.5622$ —
the second example has moved toward its positive label, the first is unchanged because its
feature value is zero.`,
        },
        {
          id: "numerics",
          heading: "Where it breaks numerically",
          body: `A predicted probability of exactly 0 or 1 makes the loss infinite. Libraries
avoid this by clipping probabilities into something like $[10^{-15}, 1 - 10^{-15}]$, or by
computing the loss directly from the score with a numerically stable formulation rather than
forming the probability first.

Regularisation helps for a related reason: on perfectly separable data the likelihood is
maximised by pushing weights toward infinity, so an unpenalised fit will not converge. A
penalty on the weights keeps the solution finite. As with linear regression, leave the
intercept unpenalised.`,
        },
      ],
      questions: [
        {
          question: "Why is the gradient proportional to p − y?",
          answer: "The sigmoid's derivative p(1−p) cancels against a term from differentiating the log, leaving the plain difference between predicted probability and label for each example.",
        },
        {
          question: "What happens if you fit an unregularised model to perfectly separable data?",
          answer: "The likelihood keeps improving as the weights grow, so there is no finite optimum and the fit will not converge. A penalty on the weights bounds the solution and makes the problem well-posed again.",
        },
      ],
    },
    {
      id: "thresholds-and-costs",
      title: "Choosing the operating point",
      summary: "Turning probabilities into decisions using the costs that apply.",
      minutes: 4,
      links,
      problemSlugs: ["confusion-counts"],
      sections: [
        {
          id: "the-choice",
          heading: "0.5 is a default, not an answer",
          body: `The model gives you a probability. Acting on it requires a cutoff, and 0.5 is
only correct when a false positive and a false negative cost the same and the classes are
balanced. That situation is rarer than the default suggests.

If missing a case costs ten times as much as investigating a healthy one, the threshold that
minimises expected cost is far below 0.5. If you can only follow up on fifty cases a week, the
threshold is whatever puts fifty cases above it. Both are business facts, not model facts.`,
        },
        {
          id: "counts",
          heading: "The four counts",
          body: `Every threshold produces four numbers: true positives, false positives, true
negatives and false negatives. Precision is TP/(TP+FP) — of the cases you flagged, how many
were real. Recall is TP/(TP+FN) — of the real cases, how many you caught. Moving the threshold
trades one against the other, always.

Accuracy is the number to distrust. With 1% positives, predicting "no" for everything scores
99% and catches nothing. Whenever the positive class is rare, look at precision, recall and
the confusion counts rather than a single headline figure.`,
          callout: {
            title: "Report the threshold alongside the metric",
            body: "A precision figure without the threshold that produced it is not reproducible. Two models can look identical on one and be very different across the range.",
          },
        },
        {
          id: "calibration",
          heading: "Calibration is a separate question",
          body: `A model **ranks** well if higher scores really are more likely to be positive.
It is **calibrated** if a predicted 0.3 corresponds to roughly 30% of such cases being
positive. Ranking is what AUC measures; calibration is what log loss and a reliability plot
measure, and they can disagree sharply.

The distinction matters as soon as the probability feeds arithmetic — expected value, expected
cost, a downstream model. A well-ranked but poorly calibrated model is fine for "show me the
riskiest hundred" and actively misleading for "what is the expected loss".`,
        },
        {
          id: "class-weights",
          heading: "Class weights change the objective",
          body: `Re-weighting or resampling to handle imbalance changes what the model is fitting,
and typically damages calibration in the process: the model now estimates probabilities under
a reweighted distribution, not the real one.

That can be the right call, but check the probabilities afterwards if anything downstream
depends on them. Often the cleaner path is to fit on the real distribution and move the
threshold, which changes the decision without disturbing the estimate.`,
        },
      ],
      questions: [
        {
          question: "When would you move the threshold away from 0.5?",
          answer: "When false positives and false negatives carry different costs, when capacity limits how many cases you can act on, or when the base rate is far from balanced. Pick it on validation data using documented costs, then measure the locked rule on the test set.",
        },
        {
          question: "A model has excellent AUC but poor log loss. What does that mean?",
          answer: "It ranks cases well but its probabilities are not calibrated. Fine if you only need an ordering; wrong if the probability is multiplied by anything, because the numbers themselves are off even though their order is right.",
        },
        {
          question: "Why is accuracy a poor metric for rare positives?",
          answer: "Predicting the majority class for everything achieves an accuracy equal to the majority share while catching none of the cases you care about. It rewards the one strategy that is certainly useless.",
        },
      ],
    },
    {
      id: "multiclass",
      title: "More than two classes",
      summary: "Extending the same machinery past a binary outcome.",
      minutes: 3,
      links,
      sections: [
        {
          id: "softmax",
          heading: "Softmax generalises the sigmoid",
          body: String.raw`With $K$ classes the model produces $K$ scores and normalises them:

$$p_k = \frac{e^{z_k}}{\sum_{j=1}^{K} e^{z_j}}$$

The outputs are positive and sum to one. With $K = 2$ this reduces to the sigmoid, so nothing
new is being introduced — the binary case was the special case all along. The loss generalises
the same way, to the negative log of the probability assigned to the true class.`,
        },
        {
          id: "ovr",
          heading: "One-vs-rest, and when it differs",
          body: `The alternative is to fit $K$ independent binary models, each separating one
class from all the others. It is simple and parallelises well, but the outputs are not
constrained to sum to one, so they need normalising before being read as a distribution.

Multinomial fitting optimises all classes jointly against a single objective and generally
produces better-behaved probabilities. One-vs-rest is still useful when classes are not
mutually exclusive — a document with several valid tags is a multi-label problem, and softmax
is the wrong tool for it because it forces the probabilities to compete.`,
        },
        {
          id: "thresholds-again",
          heading: "Decisions get harder, not easier",
          body: `Everything from the previous lesson still applies, with more surface area. There
is no single threshold any more: taking the highest-probability class is one decision rule
among many, and it ignores cost asymmetries between specific confusions.

If mistaking class A for class B is cheap but mistaking B for A is expensive, the rule that
minimises expected cost is not "pick the largest". Build the cost matrix explicitly, then pick
the class minimising expected cost. Calibration matters more here too, because the comparison
is now between several estimated numbers rather than one against a fixed cutoff.`,
        },
      ],
      questions: [
        {
          question: "Why does softmax with two classes reduce to the sigmoid?",
          answer: "Dividing numerator and denominator by e^{z₁} leaves 1/(1 + e^{z₂−z₁}), which is the sigmoid applied to the difference of the two scores. Only the difference was ever identified, which is why the binary case needs one score rather than two.",
        },
        {
          question: "When is one-vs-rest the right choice rather than softmax?",
          answer: "When the classes are not mutually exclusive. Softmax forces the probabilities to sum to one, so evidence for one label suppresses the others — wrong when an item can genuinely belong to several at once.",
        },
      ],
    },
  ],
};
