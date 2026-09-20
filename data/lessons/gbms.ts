import { PLACEHOLDER, type TopicLesson } from "./types";

const links = { theory: PLACEHOLDER, explanation: PLACEHOLDER, learnMore: PLACEHOLDER };

export const gbmsLesson: TopicLesson = {
  topicId: "gbms",
  overview: String.raw`Gradient boosting builds an ensemble the opposite way round from a random
forest. A forest trains many independent trees in parallel and averages away their variance.
Boosting trains trees in sequence, each one fitted to what the current ensemble is still
getting wrong, and adds them in small steps.

That difference has consequences. Because each tree only has to correct a residual error, the
trees can be shallow — depth 3 to 6 is typical, against unlimited depth in a forest. Because
they are added in sequence, the ensemble reduces bias as well as variance, which is why
boosted trees usually beat forests on tabular data. Because it is sequential, it can overfit
in a way a forest cannot: keep adding corrective trees and eventually you are correcting noise.

The cost is sensitivity. A forest is famously forgiving of its hyperparameters; a gradient
boosting machine is not. Learning rate, tree count, depth and regularisation interact, and a
configuration that works beautifully on one dataset can be mediocre on another.

The four lessons below cover the core idea, the gradient step that gives the method its name,
what the popular implementations actually changed, and how to tune the thing without fooling
yourself.`,
  subtopics: [
    {
      id: "why-boosting-works",
      title: "Correcting your own mistakes",
      summary: "The sequential idea, with why shallow trees suffice.",
      minutes: 5,
      links,
      sections: [
        {
          id: "what-it-printed",
          heading: "Two curves that stop agreeing",
          body: `Train error falls 16027.6, 1188.4, 240.8, 23.8, 1.0 as the ensemble grows from 10 trees to 500. Test error falls too — 21089.7, 8696.5, 6704.0, 6170.1 — and then stops, bottoming out around 6159.9.

By 500 trees the training error is 1.0. The model reproduces its training data almost exactly, and the last line names the cost: the best test error arrived at **303 trees**, and every tree after that made the model worse on data it had not seen.

This is the distinguishing property of boosting. A random forest averages independent trees and cannot overfit by adding more of them. Boosting fits each tree to what remains wrong, so it keeps driving training error down forever, and the number of trees becomes a parameter you must choose rather than one you can set generously.`,
        },
        {
          id: "sequence",
          heading: "Each tree fixes the last",
          body: `Start with a constant prediction — the mean of the target is the usual choice.
Compute the errors. Fit a small tree to those errors. Add a fraction of its predictions to the
running model. Recompute the errors. Repeat.

After $M$ rounds the prediction is the initial constant plus the scaled contributions of $M$
trees. No single tree is trying to model the target; each is trying to model what remains after
everything before it has had its say.`,
        },
        {
          id: "shrinkage",
          heading: "Small steps, many of them",
          body: String.raw`Each tree's contribution is multiplied by a learning rate $\eta$, often
0.01 to 0.1. Taking the full correction would chase noise immediately; taking a tenth of it,
ten times over, lands in a similar place having averaged over ten different views of the
residual.

$$F_m(x) = F_{m-1}(x) + \eta\, h_m(x)$$

Learning rate and tree count trade against each other directly: halve $\eta$ and you need
roughly twice as many trees for the same fit. Lower rates generalise slightly better and cost
proportionally more time, which is the whole of that decision.`,
        },
        {
          id: "weak-learners",
          heading: "Why the trees stay shallow",
          body: `A depth-3 tree can express interactions between at most three features. That
sounds limiting until you notice the ensemble contains hundreds of them, each attending to a
different part of the residual, and their sum can represent a rich function.

Shallow trees also keep individual variance low, which matters because boosting does not
average variance away the way bagging does — it accumulates. A forest wants deep trees because
averaging repairs their variance. Boosting wants shallow ones because nothing will.`,
          callout: {
            title: "The two ensembles want opposite base learners",
            body: "Bagging wants low-bias, high-variance trees, because averaging fixes variance. Boosting wants low-variance, high-bias trees, because the sequence fixes bias. Using a deep tree in a boosted model is a common and expensive mistake.",
          },
        },
        {
          id: "overfits",
          heading: "It will overfit if you let it",
          body: `Training loss falls monotonically with every tree added. Validation loss falls,
flattens, and then rises. Unlike a forest, where more trees is always safe, tree count is a
genuine capacity parameter here.

The standard remedy is early stopping: monitor a validation set and halt once it has not
improved for some number of rounds. Every major implementation supports it, and using it is
close to mandatory rather than optional.`,
        },
        {
          id: "when-to-boost",
          heading: "When boosting is the right call",
          body: `Gradient boosting is the strongest general method for substantial tabular data — mixed types, non-linear relationships, interactions nobody enumerated. Given enough rows and some tuning it usually beats a random forest, which is why it wins most tabular competitions.

The cost is attention. It has more parameters that interact, it needs a validation slice to choose the tree count, and it will quietly overfit if you look away — none of which is true of a forest.

Reach for a forest instead when you want a strong result with almost no tuning, and for something simpler when the data is small. This topic's notebook makes that concrete: on 455 clean rows, all three boosting libraries lose to plain logistic regression.`,
        },
      ],
      code: {
        caption: "Track validation loss round by round to see where boosting starts hurting.",
        body: `import numpy as np
from sklearn.datasets import make_regression
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_squared_error
from sklearn.model_selection import train_test_split

X, y = make_regression(n_samples=300, n_features=10, noise=25.0, random_state=0)
X_tr, X_te, y_tr, y_te = train_test_split(X, y, random_state=0)

model = GradientBoostingRegressor(
    n_estimators=500, learning_rate=0.1, max_depth=3, random_state=0
).fit(X_tr, y_tr)

# staged_predict replays the ensemble one tree at a time.
test_error = [mean_squared_error(y_te, p) for p in model.staged_predict(X_te)]
train_error = [mean_squared_error(y_tr, p) for p in model.staged_predict(X_tr)]

for n in [10, 50, 100, 250, 500]:
    print(f"{n:4} trees  train={train_error[n-1]:8.1f}  test={test_error[n-1]:8.1f}")

print(f"\\nbest test error at {int(np.argmin(test_error)) + 1} trees")`,
        caveats: [
          "Training error falls forever; test error bottoms out and climbs. Tree count is a capacity parameter here, unlike in a forest.",
          "Use early stopping (n_iter_no_change) rather than a fixed count. The right number depends on the data and on every other parameter.",
          "Halving the learning rate roughly doubles the trees needed. Tuning one without the other compares configurations that are not comparable.",
          "Deep trees in a boosted model are a common and expensive mistake. Boosting wants weak learners — depth 3 to 6 — because nothing averages their variance away.",
        ],
      },
      questions: [
        {
          question: "Why does a forest tolerate unlimited trees while boosting does not?",
          answer: "Forest trees are fitted independently, so the average converges and extra trees only refine the estimate. Boosting trees are fitted to the current residual, so extra rounds keep reducing training error by modelling noise.",
        },
        {
          question: "You halve the learning rate. What else must change?",
          answer: "The tree count roughly doubles to reach a comparable fit. The two are directly coupled, which is why tuning one without the other produces misleading comparisons.",
        },
      ],
    },
    {
      id: "gradient-boosting-step-by-step",
      title: "The gradient step",
      summary: "Why residuals generalise to any differentiable loss.",
      minutes: 5,
      links,
      notebookId: "gbms",
      sections: [
        {
          id: "what-it-printed",
          heading: "The same predictions, arrived at by hand",
          body: `RMSE falls 2.8395, 2.1323, 1.4510, 1.1809 across four rounds, each tree fitted to what the previous ensemble still got wrong.

Then the check that matters: the hand-rolled predictions and scikit-learn's agree to three decimals on all eight rows — \`3.977 3.977 6.477 6.477 9.977 10.983 13.066 13.066\`. The loop above reproduces a library implementation exactly, which is the strongest evidence that the description of the algorithm is the algorithm.

Notice the repeated values. Eight rows collapse to five distinct predictions because a shallow tree has few leaves and every row landing in the same leaf gets the same number. Boosting refines those numbers round by round; it never produces a smooth function.`,
        },
        {
          id: "pseudo-residuals",
          heading: "Fitting the gradient, not the error",
          body: String.raw`Describing boosting as "fit the residual" is the squared-loss special
case. In general each tree is fitted to the negative gradient of the loss with respect to the
current prediction:

$$r_{im} = -\left[\frac{\partial L(y_i, F(x_i))}{\partial F(x_i)}\right]_{F = F_{m-1}}$$

For squared loss $L = \tfrac{1}{2}(y - F)^2$, that derivative is exactly $y - F$ — the ordinary
residual. For log loss it is $y - p$, the same difference-of-probability term that appears in
logistic regression. The machinery is identical; only the quantity being fitted changes.

This is what makes the method general. Any differentiable loss — squared, absolute, Huber, log
loss, ranking objectives — plugs into the same algorithm.`,
        },
        {
          id: "worked",
          heading: "Two rounds by hand",
          body: `Targets \`y = [2, 4, 6, 8]\`, squared loss, learning rate 0.5.

Round 0 predicts the mean, 5, so residuals are \`[-3, -1, 1, 3]\`. Fit a one-split tree that
separates the first two rows from the last two: it predicts $-2$ on the left, $+2$ on the
right. Scaled by 0.5 and added, predictions become \`[4, 4, 6, 6]\`.

New residuals are \`[-2, 0, 0, 2]\`. A second stump splitting the first row from the rest, and
the last from the rest, chips away further. Notice the corrections are shrinking — that is the
sequence converging, and it is also why stopping matters: continue long enough on real data and
the residuals being fitted are noise.`,
        },
        {
          id: "second-order",
          heading: "Using curvature too",
          body: `XGBoost's main algorithmic contribution was to use the second derivative as well
as the first. Approximating the loss to second order gives a closed form for each leaf's optimal
value, and a principled criterion for whether a split is worth making.

In practice this means better leaf values per round and a split criterion that accounts for how
confident the model already is at those points. It converges in fewer rounds than first-order
boosting, which on large datasets is the difference that matters.`,
        },
        {
          id: "regularised",
          heading: "The objective includes the tree",
          body: String.raw`Modern implementations put the model's complexity into the objective
rather than handling it separately:

$$\text{Obj} = \sum_i L(y_i, \hat y_i) + \sum_m \Omega(h_m)$$

with $\Omega$ penalising leaf count and the magnitude of leaf values. A split has to improve the
loss by more than it adds in penalty to be accepted, which is a cleaner mechanism than a
post-hoc depth cap and is why these models can afford to search deeper.`,
        },
        {
          id: "when-the-detail-matters",
          heading: "When you need this level of detail",
          body: `You will not implement this loop at work. Knowing what it does pays off in three specific places.

Reading the parameters: \`learning_rate\` is the multiplier on each tree's contribution, and once you have watched it scale the update, its trade-off against \`n_estimators\` stops being arbitrary — halve one and you roughly double the other.

Writing a custom objective. Boosting needs a gradient and, for the second-order libraries, a Hessian. Supplying those is a normal thing to do for ranking or for an asymmetric business cost, and it is impossible to do without this picture.

Debugging a fit that will not move. Predictions that stay flat, or explode, trace back to the update step — a learning rate too small to escape the initial guess, or leaves large enough to overshoot on every round.`,
        },
      ],
      code: {
        caption: "Build the ensemble by hand from stumps, then check it against the library.",
        body: `import numpy as np
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import GradientBoostingRegressor

X = np.array([[1], [2], [3], [4], [5], [6], [7], [8]])
y = np.array([2.0, 4.0, 6.0, 8.0, 9.0, 11.0, 13.0, 15.0])

lr = 0.5
prediction = np.full_like(y, y.mean())   # round 0: the mean
trees = []

for step in range(4):
    residual = y - prediction            # squared loss -> the gradient is the residual
    stump = DecisionTreeRegressor(max_depth=1).fit(X, residual)
    prediction += lr * stump.predict(X)
    trees.append(stump)
    print(f"round {step}: rmse={np.sqrt(((y - prediction) ** 2).mean()):.4f}")

reference = GradientBoostingRegressor(
    n_estimators=4, learning_rate=lr, max_depth=1, random_state=0
).fit(X, y)
print("manual   :", np.round(prediction, 3))
print("sklearn  :", np.round(reference.predict(X), 3))`,
        caveats: [
          "Fitting the residual is the squared-loss special case. In general each tree fits the negative gradient of the loss — for log loss that is y minus p, not y minus prediction.",
          "The corrections shrink each round. Once they are smaller than the noise, further rounds are fitting noise.",
          "XGBoost adds the second derivative, which gives a closed-form optimal leaf value and a curvature-aware split criterion. It converges in fewer rounds for the same quality.",
          "The initial prediction matters for non-squared losses: it should be the value minimising the loss, which is the log-odds of the base rate for classification, not zero.",
        ],
      },
      questions: [
        {
          question: "When are the pseudo-residuals just ordinary residuals?",
          answer: "Under squared loss. Its derivative with respect to the prediction is y − F exactly, so the general gradient step reduces to fitting the error. Under other losses the quantity differs — for log loss it is y − p.",
        },
        {
          question: "What does using the second derivative add?",
          answer: "A closed-form optimal leaf value and a split criterion informed by curvature, so each round makes better use of its tree. It typically converges in fewer rounds than first-order boosting for the same quality.",
        },
      ],
    },
    {
      id: "xgboost-lightgbm-catboost",
      title: "The three implementations",
      summary: "What each library changed, plus when the difference shows.",
      minutes: 5,
      links,
      sections: [
        {
          id: "what-it-printed",
          heading: "Early stopping picks the size for you",
          body: `Two lines: cross-validated accuracy of 0.997, and \`stopped after 133 iterations of 200\`.

The ceiling was 200 trees and the model used 133. That is early stopping doing its job — watching a validation slice, noticing that the last several rounds bought nothing, and halting. \`n_estimators\` is a budget, not a target, and this is the parameter you should stop hand-tuning first.

An accuracy of 0.997 on a small, clean dataset is not a result to be proud of; it mostly says the problem was easy. The topic's notebook runs all three libraries side by side and shows what actually separates them — LightGBM roughly an order of magnitude faster, CatBoost a little more accurate, none of them beating a linear model on data this size.`,
        },
        {
          id: "xgboost",
          heading: "XGBoost",
          body: `The one that made boosted trees the default for tabular competition work. Its
contributions were second-order optimisation, regularisation folded into the objective, a
sparsity-aware split finder that learns a default direction for missing values, and an
engineering effort that made all of it fast.

It grows trees level-wise: every node at a given depth is split before moving deeper. That
produces balanced trees and predictable memory use, at the cost of splitting nodes that were not
worth splitting.`,
        },
        {
          id: "lightgbm",
          heading: "LightGBM",
          body: `Two changes, both about speed. Features are bucketed into histograms, typically 255
bins, so the split search scans bins rather than sorted values — much faster, and a negligible
loss of precision.

And it grows leaf-wise: always split the leaf offering the largest gain, wherever it sits. That
reaches a lower loss for the same number of leaves, and produces deep unbalanced trees that
overfit small datasets readily. If you switch from XGBoost and see the validation score fall,
constraining \`num_leaves\` is the first thing to try.`,
          callout: {
            title: "Leaf-wise growth needs a leaf budget, not a depth cap",
            body: "A depth limit barely constrains leaf-wise growth, since it can go deep down one branch while others stay shallow. num_leaves is the parameter that actually bounds capacity.",
          },
        },
        {
          id: "catboost",
          heading: "CatBoost",
          body: `Built around categorical features. Target statistics — encoding a category by the
mean outcome of its rows — are powerful and leak badly, because a row's own label contributes to
the encoding it is then trained on.

CatBoost computes each row's encoding using only rows that precede it in a random permutation,
so no row informs its own feature. It also uses oblivious trees, where every node at a depth uses
the same split, which restricts the model but makes inference very fast. Reach for it when
categorical features with many levels dominate your data.`,
        },
        {
          id: "choosing",
          heading: "Which to use",
          body: `Honestly, the gap between them after tuning is usually smaller than the gap from
better features. LightGBM is fastest on large datasets and needs the most care against
overfitting. CatBoost wins where high-cardinality categoricals matter. XGBoost is the safe
default with the widest deployment support.

Pick one, learn its parameters properly, and spend the time you saved on the data.`,
        },
        {
          id: "which-library-when",
          heading: "Choosing between the three",
          body: `They implement the same algorithm, so the choice is about engineering rather than accuracy.

**LightGBM** when the data is large or training time is the binding constraint. Leaf-wise growth and histogram binning make it the fastest of the three by a wide margin, at the cost of needing \`num_leaves\` watched more carefully.

**CatBoost** when categorical columns are high-cardinality. It encodes them with ordered target statistics rather than making you one-hot encode, which is both less work and less leakage. Its defaults are the most forgiving.

**XGBoost** when you want the most documented, most portable, most widely deployed option. It is rarely the fastest and rarely the most accurate, and it is rarely the wrong answer.

Start with whichever your team already runs. The gap between any of them and a well-tuned version of another is smaller than the gap made by tuning.`,
        },
      ],
      code: {
        caption: "Histogram-based boosting from scikit-learn, with native categorical handling.",
        body: `import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import cross_val_score

rng = np.random.default_rng(0)
n = 2000
city = rng.integers(0, 40, size=n)              # high-cardinality categorical
numeric = rng.normal(size=n)
y = ((city % 4 == 0) & (numeric > -0.5)).astype(int)

X = np.column_stack([numeric, city]).astype(np.float64)
X[rng.random(n) < 0.05, 0] = np.nan             # missing values, left as-is

model = HistGradientBoostingClassifier(
    categorical_features=[1],   # index 1 is categorical, not ordered
    max_iter=200,
    early_stopping=True,
    random_state=0,
)
print(f"cv accuracy: {cross_val_score(model, X, y, cv=5).mean():.3f}")
model.fit(X, y)
print(f"stopped after {model.n_iter_} iterations of 200")`,
        caveats: [
          "Declaring a categorical column matters. Left as a float, city=39 is treated as larger than city=2, and the model wastes splits on an order that does not exist.",
          "Histogram binning is why this is fast: the split search scans 255 bins rather than every sorted value. The precision lost is negligible.",
          "LightGBM grows leaf-wise, which reaches lower loss per leaf and overfits small data readily. Constrain num_leaves, not just depth — depth barely bounds leaf-wise growth.",
          "Target encoding a high-cardinality column leaks unless each row's encoding excludes its own label. That is the problem CatBoost's ordered encoding exists to solve.",
        ],
      },
      questions: [
        {
          question: "Why does LightGBM overfit small datasets more readily?",
          answer: "Leaf-wise growth repeatedly splits whichever leaf offers the most gain, producing deep unbalanced branches that can isolate small groups of rows. Limiting num_leaves — not just depth — is the control that matters.",
        },
        {
          question: "Why can naive target encoding leak labels?",
          answer: "The encoding for a category is computed from the outcomes of rows in that category, including the row being encoded. The feature then carries information about its own label, which inflates training performance and vanishes at prediction time.",
        },
      ],
    },
    {
      id: "tuning-and-regularisation",
      title: "Tuning without fooling yourself",
      summary: "Which parameters matter, in which order.",
      minutes: 5,
      links,
      sections: [
        {
          id: "what-it-printed",
          heading: "Two scores, and which one you may report",
          body: `The search settles on \`max_leaf_nodes: 31\` and \`min_samples_leaf: 20\`, with a cross-validated AUC of 0.9712 and a holdout AUC of 0.9869.

The holdout score is *higher* here, which looks like it contradicts the labels on those lines. It does not, and the reason is worth being precise about. A cross-validated score that a search selected on is biased upward **as an estimate of the selected configuration**, because the winner is partly whichever configuration got the friendliest folds. That bias is real, but it is small next to the sampling noise on a holdout set of this size, so on any single run the holdout can land either side.

The rule survives the arithmetic: the number you report comes from data the search never touched. Run this with a different seed and the two values will trade places, which is the point — one of them is an estimate you may quote, and the other is not, regardless of which happens to be larger.`,
        },
        {
          id: "order",
          heading: "An order that works",
          body: `Fix a low learning rate, 0.05 or so, and let early stopping choose the tree count.
Tune depth or leaf count next, since capacity dominates everything else. Then the sampling rates
— row and column subsampling, 0.7 to 0.9 — which add regularisation cheaply. Then the explicit
penalties, if the gap between training and validation is still wide.

Lower the learning rate at the end if you have compute to spare. Doing it first only makes every
subsequent experiment slower without changing which configuration wins.`,
        },
        {
          id: "early-stopping",
          heading: "Early stopping is part of the model",
          body: `The round count chosen by early stopping was selected using the validation set,
which makes it a fitted parameter. Reporting that validation score as your estimate of
generalisation is optimistic for exactly the reason any selected-on quantity is.

Keep a separate test set that no decision touched, or use nested cross-validation. This is the
most common way a boosted model looks better in a notebook than in production, and it costs
nothing to avoid.`,
          callout: {
            title: "The split has to respect the data's structure",
            body: "Time-ordered or grouped rows need time-aware or grouped folds. A random split lets the model see the future or see the same customer on both sides, and boosting is efficient enough to exploit either.",
          },
        },
        {
          id: "sampling",
          heading: "Subsampling does double duty",
          body: `Fitting each tree on a random 80% of rows, and offering each split a random subset
of columns, makes rounds faster and the ensemble less correlated. The mechanism is the same as in
a random forest, applied to a sequential ensemble.

Column subsampling also blunts the tendency for one dominant feature to be chosen at the top of
every tree, which spreads the model's reliance and often improves both robustness and the
usefulness of its importance scores.`,
        },
        {
          id: "what-not-to-do",
          heading: "Diminishing returns",
          body: `Boosted trees respond less to hyperparameter search than their reputation suggests
once you are in a reasonable region. A large random search will find a configuration a fraction
of a percent better than a sensible manual one, and a meaningful share of that margin is noise in
the validation split.

The reliable gains are elsewhere: a feature that encodes something the model cannot derive, a
leak removed, a target defined more precisely, a validation split that matches how the model will
actually be used.`,
        },
        {
          id: "what-to-tune-first",
          heading: "What to tune, in what order",
          body: `Most of the available gain sits in a few parameters, and searching all of them at once wastes the budget.

Start by fixing a low \`learning_rate\` — 0.05 or 0.03 — and letting early stopping choose the tree count. Those two trade off directly, so tuning them jointly mostly rediscovers that relationship.

Then tune tree capacity: \`max_depth\` or \`max_leaf_nodes\`, together with \`min_samples_leaf\` or its library equivalent. This is where the real differences live, and the two interact, so search them as a grid rather than one after the other.

Then, if there is budget left, the sampling and penalty terms — \`subsample\`, \`colsample_bytree\`, the L1 and L2 weights. These usually buy less than the step before.

Stop earlier than feels comfortable. Past a point the search is fitting the validation folds, and a model tuned to three decimal places on a small dataset has been tuned to noise.`,
        },
      ],
      code: {
        caption: "Tune in the order that matters, holding the learning rate fixed until last.",
        body: `import numpy as np
from sklearn.datasets import make_classification
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import GridSearchCV, train_test_split

X, y = make_classification(n_samples=2000, n_features=20, n_informative=6,
                           random_state=0)
X_fit, X_holdout, y_fit, y_holdout = train_test_split(X, y, random_state=0)

search = GridSearchCV(
    HistGradientBoostingClassifier(
        learning_rate=0.05, max_iter=500, early_stopping=True, random_state=0
    ),
    {"max_leaf_nodes": [7, 31, 127], "min_samples_leaf": [5, 20, 50]},
    cv=3,
    scoring="roc_auc",
)
search.fit(X_fit, y_fit)

print("best params:", search.best_params_)
print(f"cv auc     : {search.best_score_:.4f}   <- selected on, optimistic")
print(f"holdout auc: {search.score(X_holdout, y_holdout):.4f}   <- the honest one")`,
        caveats: [
          "best_score_ was chosen by maximising it, so it is a fitted quantity. Quoting it as your generalisation estimate is the most common way a model looks better in a notebook than in production.",
          "Early stopping also uses validation data, which makes the round count another selected parameter. It needs the same separation.",
          "Tune capacity first, then sampling, then penalties, then lower the learning rate. Lowering it first only makes every experiment slower without changing which configuration wins.",
          "Time-ordered or grouped rows need matching folds. A random split lets a boosted model exploit the future efficiently enough that the score looks excellent.",
        ],
      },
      questions: [
        {
          question: "Why tune the learning rate last?",
          answer: "It trades directly against tree count, so lowering it early just makes every experiment slower without changing which depth or sampling settings win. Fix it low enough to be stable, tune structure, then lower it again if compute allows.",
        },
        {
          question: "Why is the early-stopping validation score an optimistic estimate?",
          answer: "The number of rounds was chosen to maximise that score, making it a fitted parameter selected on that data. An untouched test set, or nested cross-validation, gives the honest number.",
        },
      ],
    },
  ],
};
