import { PLACEHOLDER, type TopicLesson } from "./types";

const links = {
  theory: PLACEHOLDER,
  explanation: PLACEHOLDER,
  learnMore: PLACEHOLDER,
};

export const linRegLesson: TopicLesson = {
  topicId: "lin_reg",
  overview: String.raw`Linear regression predicts a number from a weighted sum of features. It
is worth learning first not because it is the strongest model, but because almost everything
harder is judged against it.

Reach for it when the outcome is numeric and a straight-line relationship is a useful first
approximation. You get an interpretable starting point: a coefficient describes the expected
change in the prediction when a feature increases by one unit, with the other included
features held fixed.

It is also the model most often over-read. A small test error makes it useful for
prediction; it does not make a coefficient a causal effect. Confounding, selection and
measurement error all change what a weight means, and none of them show up in the fit
statistics. Keeping prediction and explanation separate is most of what it takes to use this
model well.

Where it struggles is equally worth knowing. Relationships that are genuinely curved need
transformed features, many correlated predictors make individual coefficients unstable, and
grouped or time-ordered data breaks the independence that standard errors assume. Each of
those has a lesson below.

The four split along the questions people actually get stuck on — how the fit is computed,
how to stop it overfitting, how to bend it around a curve, and how to tell when you should
not trust it. Read them in order the first time; after that they stand alone.`,
  subtopics: [
    {
      id: "ols-fit",
      title: "How least squares fits a line",
      summary: "What least squares minimises, worked through on five points by hand.",
      minutes: 4,
      links,
      problemSlugs: ["ols-slope-intercept", "mean-squared-error"],
      notebookId: "lin_reg",
      sections: [
        {
          id: "the-objective",
          heading: "What the fit actually minimises",
          body: String.raw`For one input the model predicts $\hat y = \beta_0 + \beta_1 x$.
Ordinary least squares picks the intercept and slope that make the sum of squared residuals
as small as possible — residuals being the vertical gaps between what you observed and what
the line predicts.

$$\hat\beta = \underset{\beta}{\operatorname{argmin}}\;\sum_{i=1}^{n}(y_i - x_i^{\mathsf T}\beta)^2$$

Squaring is what makes this "least squares" rather than "least error": it punishes one large
miss far more than several small ones, and it makes the problem solvable in closed form.`,
        },
        {
          id: "closed-form",
          heading: "The closed form, and why you rarely use it",
          body: String.raw`With a full-rank design matrix there is an exact solution:

$$\hat\beta = (X^{\mathsf T}X)^{-1}X^{\mathsf T}y$$

Every library writes this in the textbook, and almost none of them compute it that way. A QR
or singular-value decomposition gets the same answer with far better numerical behaviour when
columns are nearly collinear. Inverting $X^{\mathsf T}X$ directly squares the condition number
of the problem, which is a good way to turn a merely awkward dataset into a wrong answer.`,
          callout: {
            title: "Perfect collinearity has no unique answer",
            body: "If one column can be reconstructed from the others, XᵀX is singular and individual coefficients are not identified at all. Predictions may still be computable; the individual weights are not meaningful.",
          },
        },
        {
          id: "worked-fit",
          heading: "A fit you can do by hand",
          body: String.raw`Take five observations: $x = [1, 2, 3, 4, 5]$ and $y = [2, 4, 5, 4, 5]$.
Their means are $\bar x = 3$ and $\bar y = 4$. The sum of cross-deviations is 6 and the sum of
squared $x$-deviations is 10, so

$$\hat\beta_1=\frac{6}{10}=0.6,\qquad\hat\beta_0=4-(0.6)(3)=2.2$$

The fitted line is $\hat y = 2.2 + 0.6x$. Its residual sum of squares is 2.4 against 6.0 for
predicting the mean every time, giving $R^2 = 1 - 2.4/6 = 0.60$ on these five points.`,
          callout: {
            title: "That 0.60 describes these five points only",
            body: "R² on the data you fitted is not an estimate of accuracy on new data, and it is not evidence that x causes y. It is a statement about how much of this sample's variation the line reproduces.",
          },
        },
        {
          id: "what-to-judge",
          heading: "What OLS optimises versus what you should judge",
          body: `Training residual sum of squares is what the fit minimises, and adding any
feature can only reduce it — including a column of random noise. That makes training error
useless as a model-selection signal.

Judge instead on held-out error, on whether residuals show structure the model missed, on
whether coefficients stay stable when you resample, and on whether the resulting predictions
actually serve the decision you are making. Those four disagree often enough to be worth
checking separately.`,
        },
      ],
      questions: [
        {
          question: "Why does adding a useless feature never increase training error?",
          answer: "The optimiser can always set that feature's coefficient to zero, recovering the previous fit. Anything it does instead must fit the training data at least as well — which is exactly why training error cannot tell you whether the feature helps.",
        },
        {
          question: "Why prefer QR or SVD to computing the inverse directly?",
          answer: "Forming XᵀX squares the condition number, so nearly collinear columns lose far more precision than they need to. QR and SVD work on X itself and stay accurate in cases where the explicit inverse quietly does not.",
        },
      ],
    },
    {
      id: "ridge-lasso-elastic-net",
      title: "Ridge, lasso and elastic net",
      summary: "Three penalties on coefficient size, each shrinking weights differently.",
      minutes: 5,
      links,
      sections: [
        {
          id: "why-penalise",
          heading: "Why penalise coefficient size at all",
          body: `When features are many or correlated, least squares can fit the training data
beautifully with enormous coefficients that cancel each other out. Those cancellations are
fitted to noise, so they fall apart on new data.

Regularisation adds a penalty for large coefficients, trading a little training fit for
stability. The intercept is normally left unpenalised — shrinking it would just bias every
prediction toward zero for no benefit. Scale your features inside each training fold first,
or the penalty will fall hardest on whichever feature happens to be measured in small units.`,
        },
        {
          id: "ridge",
          heading: "Ridge shrinks smoothly",
          body: String.raw`Ridge adds the sum of squared coefficients:

$$L_{\text{ridge}} = \frac{1}{2n}\lVert y-X\beta\rVert_2^2+\lambda\lVert\beta\rVert_2^2$$

The penalty is smooth everywhere, so coefficients shrink toward zero but essentially never
reach it. When several correlated predictors carry the same signal, ridge tends to share the
weight between them rather than picking one — which is usually what you want if you believe
they all genuinely matter.`,
        },
        {
          id: "lasso",
          heading: "Lasso can zero things out",
          body: String.raw`Lasso penalises absolute values instead:

$$L_{\text{lasso}} = \frac{1}{2n}\lVert y-X\beta\rVert_2^2+\lambda\lVert\beta\rVert_1$$

The absolute-value penalty has corners at zero, and an optimum can land exactly on a corner.
That is why lasso produces genuinely sparse models where ridge does not.

The selection it performs is less trustworthy than it looks. Among strongly correlated
predictors, lasso tends to keep one and drop the rest, and which one it keeps can change with
a different sample.`,
          callout: {
            title: "Sparsity is not the same as importance",
            body: "A coefficient driven to zero means the penalty outweighed that feature's contribution at this λ, on this sample. It is not a finding that the feature is irrelevant.",
          },
        },
        {
          id: "elastic-net",
          heading: "Elastic net does both",
          body: String.raw`Elastic net mixes the two penalties:

$$L_{\text{EN}} = \frac{1}{2n}\lVert y-X\beta\rVert_2^2+\lambda\left(\rho\lVert\beta\rVert_1+(1-\rho)\lVert\beta\rVert_2^2\right)$$

It is the sensible default when you want some selection but have groups of correlated
features, because the ridge component keeps correlated predictors together while the lasso
component still drives irrelevant ones to zero.`,
        },
        {
          id: "choosing-lambda",
          heading: "Choosing the penalty strength",
          body: `Tune $\\lambda$ by cross-validation on training data only, with preprocessing
fitted inside each fold. Fitting the scaler on the whole dataset first leaks information
about held-out rows into the model, and the resulting estimate will be optimistic.

Keep a separate test set untouched for the final number. As $\\lambda$ grows, coefficients
shrink further and training error rises; somewhere in the middle is the value that generalises
best, and only held-out data can tell you where.`,
        },
      ],
      questions: [
        {
          question: "Why does L1 produce exact zeros when L2 does not?",
          answer: "The absolute-value penalty has a corner at zero, so the optimum can sit exactly on it. The squared penalty is smooth there, and its gradient shrinks as the coefficient approaches zero — so it approaches without arriving.",
        },
        {
          question: "Why must features be scaled before penalising?",
          answer: "The penalty acts on coefficient magnitude, and magnitude depends on the units of the feature. A variable measured in millimetres gets a coefficient a thousand times larger than the same variable in metres, and would be penalised a thousand times harder for no substantive reason.",
        },
        {
          question: "You raise λ and validation error drops, then rises. Why both?",
          answer: "Early on the penalty removes variance from coefficients fitted to noise, so error falls. Past a point it also removes signal the model needed, so bias grows faster than variance shrinks. The minimum is the trade-off point for this dataset.",
        },
      ],
    },
    {
      id: "polynomial-and-interactions",
      title: "Polynomial terms and interactions",
      summary: "Fitting curves with a model that is still linear in its parameters.",
      minutes: 4,
      links,
      sections: [
        {
          id: "still-linear",
          heading: "Curved fits from a linear model",
          body: String.raw`"Linear" refers to the parameters, not the shape of the curve. Adding
$x^2$ as a feature and fitting $\hat y = \beta_0 + \beta_1 x + \beta_2 x^2$ traces a parabola,
but it is still a weighted sum of features and still solved by ordinary least squares.

That is the whole trick: transform the inputs, keep the same estimator. The same applies to
logs, square roots, splines and indicator variables.`,
        },
        {
          id: "interactions",
          heading: "Interactions change the interpretation",
          body: `An interaction term is the product of two features. Including \`x1 * x2\` says
the effect of one depends on the level of the other — price sensitivity differing by customer
segment, say.

Once an interaction is present, a main-effect coefficient no longer reads as "the effect of
this feature". It reads as the effect when the interacting feature is zero, which may not be
a value that occurs in your data at all. This is the most common way a regression table gets
misread aloud in a meeting.`,
          callout: {
            title: "Keep the main effects",
            body: "Dropping x1 while keeping x1·x2 forces the model to assume the effect of x1 is exactly zero when x2 is zero. That is a strong claim, and almost never one you meant to make.",
          },
        },
        {
          id: "degree-cost",
          heading: "Degree is a variance dial",
          body: `Each extra degree adds parameters and lets the curve wiggle more. Training
error keeps falling; held-out error falls, flattens and then climbs. High-degree polynomials
also behave badly at the edges of the data and catastrophically beyond it, so extrapolation
with a cubic is close to meaningless.

Two habits keep this in check: choose the degree by cross-validation rather than by eye, and
prefer transformations you can justify — a log because the quantity is multiplicative, not a
fifth-degree term because it fitted.`,
        },
        {
          id: "practical",
          heading: "How this looks in practice",
          body: `\`\`\`python
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import PolynomialFeatures, StandardScaler
from sklearn.linear_model import RidgeCV

model = make_pipeline(
    PolynomialFeatures(degree=2, include_bias=False),
    StandardScaler(),
    RidgeCV(alphas=[0.01, 0.1, 1.0, 10.0], cv=5),
)
model.fit(X_train, y_train)
\`\`\`

Polynomial expansion is applied before scaling, and both sit inside the pipeline so they are
refitted on each cross-validation fold. Expansion also grows the feature count quickly —
degree 2 on 10 features gives 65 terms — which is exactly the situation the ridge penalty in
the last lesson exists to handle.`,
        },
      ],
      questions: [
        {
          question: "Why is a quadratic fit still called a linear model?",
          answer: "Because it is linear in the parameters. The prediction is a weighted sum of features, one of which happens to be x². Squaring happens to the data before fitting, not to the coefficients during it.",
        },
        {
          question: "Why keep a main effect when its interaction is in the model?",
          answer: "Dropping it constrains that feature's effect to be exactly zero when the interacting feature is zero. Unless you have a reason to believe that specific constraint, you are imposing a claim you did not intend.",
        },
      ],
    },
    {
      id: "assumptions-and-diagnostics",
      title: "Assumptions and diagnostics",
      summary: "Which claim each assumption actually supports.",
      minutes: 5,
      links,
      sections: [
        {
          id: "which-claim",
          heading: "Different claims need different assumptions",
          body: `The assumptions behind linear regression are not one block you either satisfy
or fail. Each supports a specific claim.

Prediction needs the least: if held-out error is good, the model is useful regardless of
whether the errors are normally distributed. Conventional standard errors and p-values need
much more. Causal interpretation of a coefficient needs assumptions that no residual plot can
verify at all. Be clear which claim you are making before deciding which checks matter.`,
        },
        {
          id: "linearity",
          heading: "Is the mean relationship adequately linear?",
          body: `Plot residuals against fitted values, and against each important feature.
Structure in that plot — a curve, a fan, a step — is the model telling you something
systematic is unmodelled.

Curvature suggests a transformation or an interaction, which is what the previous lesson is
for. A plot with no visible pattern does not prove the form is right, but a plot with an
obvious pattern does prove something is wrong.`,
        },
        {
          id: "spread-and-dependence",
          heading: "Uneven spread and dependent errors",
          body: `If residual spread grows with the fitted value, the model is heteroscedastic.
Predictions are not necessarily bad, but they are less reliable at one end of the range than
the other, and conventional constant-variance standard errors will mislead.

Dependence is the more dangerous problem because it is usually invisible in a residual plot.
Repeated measurements on the same user, rows from the same time period, or observations
grouped by site all break the independence assumption. Fix it in the validation split — group
or time-aware folds — not by patching the standard errors afterwards.`,
          callout: {
            title: "A random split can flatter a time series enormously",
            body: "Shuffling rows lets the model train on the future and predict the past. The held-out score can look excellent and mean nothing about tomorrow.",
          },
        },
        {
          id: "collinearity",
          heading: "Unstable coefficients",
          body: `When predictors are strongly correlated, coefficients can swing wildly — sign
included — with small changes in the data. Inspect the correlation matrix, the condition
number, or the variance inflation factor.

Treat VIF as a diagnostic, not a threshold to clear. A high value tells you the coefficient is
poorly determined, which matters a great deal if you plan to interpret it and much less if you
only plan to predict with it. Regularisation helps stability; it does not restore
identifiability.`,
        },
        {
          id: "exogeneity",
          heading: "The assumption you cannot test",
          body: `Whether predictors are uncorrelated with omitted influences is a question about
how the data came to exist. No residual plot can answer it, because the omitted variable is by
definition not in the model.

This is where most causal misreadings of a regression originate. If a coefficient is going to
inform a decision about intervening in the world, the justification has to come from the
design — randomisation, a natural experiment, a defensible identification strategy — and not
from the fit statistics.`,
        },
      ],
      questions: [
        {
          question: "Residuals fan out as fitted values grow. What does that change?",
          answer: "It suggests heteroscedasticity. Predictive performance varies across the target range, and conventional standard errors assuming constant variance will be wrong — typically too small at the high end. The point estimates themselves remain unbiased.",
        },
        {
          question: "Why can't a residual plot establish exogeneity?",
          answer: "Residuals are computed from the features the model already has. An influence that was omitted is not represented in them, so its correlation with the included features cannot show up. It is a question about data collection, not about model fit.",
        },
        {
          question: "A VIF of 8 — is that a problem?",
          answer: "It depends on the claim. It says that coefficient is poorly determined, which matters if you intend to interpret or report it and matters little if you only need predictions. There is no universal cutoff; treat it as information about precision.",
        },
      ],
    },
  ],
};
