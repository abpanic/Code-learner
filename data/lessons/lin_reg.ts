import { PLACEHOLDER, type TopicLesson } from "./types";

const links = {
  theory: PLACEHOLDER,
  explanation: PLACEHOLDER,
  learnMore: PLACEHOLDER,
};

/**
 * Code first.
 *
 * Every sub-topic opens with a snippet that runs, and the sections after it
 * explain what just happened. The numbers quoted in the prose are the numbers
 * these snippets actually print — they were run against scikit-learn rather
 * than estimated, which is how the "one test house" and the inverted residual
 * pattern in the first draft were caught.
 */
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

Every lesson opens with code you can run, then explains what it printed. The four split along
the questions people actually get stuck on — how the fit is computed, how to stop it
overfitting, how to bend it around a curve, and how to tell when you should not trust it.
Read them in order the first time; after that they stand alone.`,
  subtopics: [
    {
      id: "ols-fit",
      title: "How least squares fits a line",
      summary: "What least squares minimises, worked through on five points by hand.",
      minutes: 5,
      links,
      problemSlugs: ["ols-slope-intercept", "mean-squared-error"],
      notebookId: "lin_reg",
      code: {
        caption: "Fit a straight line to seven house sales, then score it on the two it never saw.",
        body: `import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score

# [square footage] -> price in $1000s
X = np.array([[650], [800], [1200], [1500], [2000], [2400], [2800]])
y = np.array([150, 180, 240, 300, 380, 450, 520])

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

model = LinearRegression()
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
print(f"Slope:     {model.coef_[0]:.3f}")     # dollars per square foot
print(f"Intercept: {model.intercept_:.1f}")   # price at 0 sq ft
print(f"RMSE:      {mean_squared_error(y_test, y_pred) ** 0.5:.1f}")
print(f"R2:        {r2_score(y_test, y_pred):.2f}")`,
        caveats: [
          "With seven rows, a 20% test split rounds up to two houses. That R2 is two sales — a demonstration of the API, not evidence about the model. At this size, cross-validation is the honest alternative.",
          "The intercept is the price of a zero-square-foot house, which does not exist. An intercept often sits outside the range of the data and means nothing on its own.",
          "One mansion priced in the millions would drag the line toward it, because squared error punishes the largest residual hardest. Plot the data before trusting the fit.",
          "random_state=42 makes the split reproducible, not representative. Change the seed and the score moves — if that is unsettling, it should be.",
        ],
        variation: {
          caption: "More than one feature: the same call, a wider X.",
          body: `# [square footage, bedrooms]
X_multi = np.array([
    [650, 1], [800, 2], [1200, 2], [1500, 3],
    [2000, 4], [2400, 4], [2800, 5],
])

model_multi = LinearRegression().fit(X_multi, y)
print("Coefficients:", model_multi.coef_)   # one per feature
print("Intercept:   ", model_multi.intercept_)

# Read each coefficient as: change in price per unit of that feature,
# holding the other included features fixed. Square footage and bedroom
# count are strongly correlated here, so neither coefficient is stable.`,
        },
      },
      sections: [
        {
          id: "what-it-printed",
          heading: "What those four numbers mean",
          body: String.raw`The run prints a slope of 0.173, an intercept of 35.7, an RMSE of
4.4 and an $R^2$ of 0.91.

Prices are in thousands, so the slope says each extra square foot is worth about \$173. The
intercept is the price the line gives a zero-square-foot house — \$35,700 for nothing at all,
which is your first sign that an intercept is where the line crosses the axis rather than a
quantity you should try to interpret.

RMSE of 4.4 is the typical miss on the held-out houses, about \$4,400. $R^2$ of 0.91 says the
line reproduces 91% of the variation in those test prices. Both come from exactly two sales,
because 20% of seven rounds up to two — which makes them an illustration of the API rather
than a measurement of the model.

The single line that did the work is ` + "`model.fit`" + String.raw`. Everything below is what it
minimised to get there.`,
        },
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
          id: "worked-fit",
          heading: "The same fit, done by hand",
          body: String.raw`Five observations are small enough to follow without a library. Take
$x = [1, 2, 3, 4, 5]$ and $y = [2, 4, 5, 4, 5]$. Their means are $\bar x = 3$ and
$\bar y = 4$. The sum of cross-deviations is 6 and the sum of squared $x$-deviations is 10, so

$$\hat\beta_1=\frac{6}{10}=0.6,\qquad\hat\beta_0=4-(0.6)(3)=2.2$$

The fitted line is $\hat y = 2.2 + 0.6x$. Its residual sum of squares is 2.4 against 6.0 for
predicting the mean every time, giving $R^2 = 1 - 2.4/6 = 0.60$ on these five points.`,
          callout: {
            title: "That 0.60 describes these five points only",
            body: "R² on the data you fitted is not an estimate of accuracy on new data, and it is not evidence that x causes y. It is a statement about how much of this sample's variation the line reproduces.",
          },
        },
        {
          id: "closed-form",
          heading: "What fit does underneath",
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
          id: "when-to-reach-for-it",
          heading: "When this is the right tool",
          body: `The variation above widens \`X\` from one column to two, and nothing else about
the call changes — that is the usual shape of the work. Reach for plain least squares when the
outcome is numeric, a straight line is a plausible first approximation, and you want a
baseline that anything more elaborate has to beat.

Move on when the data says to. A relationship that curves needs transformed features, which is
the third lesson. Many correlated predictors make individual coefficients swing, which is what
the penalties in the next lesson are for. Rows that are grouped or time-ordered break the
independence the standard errors assume, which the fourth lesson covers.

One habit matters more than the choice of model: training error cannot tell you whether a
feature helps. Adding any column — including random noise — can only reduce it, because the
optimiser can always set the new coefficient to zero and do no worse. Judge on held-out error,
on whether residuals show structure, on whether coefficients stay stable when you resample,
and on whether the predictions serve the decision you are making.`,
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
      minutes: 6,
      links,
      code: {
        caption: "The same seven houses under three penalties, each scaled inside its own fold.",
        body: `import numpy as np
from sklearn.linear_model import Ridge, Lasso, ElasticNet
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.model_selection import cross_val_score

X = np.array([[650, 1], [800, 2], [1200, 2], [1500, 3],
              [2000, 4], [2400, 4], [2800, 5]])
y = np.array([150, 180, 240, 300, 380, 450, 520])

models = {
    "ridge":   Ridge(alpha=1.0),
    "lasso":   Lasso(alpha=1.0, max_iter=10000),
    "elastic": ElasticNet(alpha=1.0, l1_ratio=0.5, max_iter=10000),
}

for name, estimator in models.items():
    pipe = make_pipeline(StandardScaler(), estimator)
    scores = cross_val_score(pipe, X, y, cv=3, scoring="r2")
    pipe.fit(X, y)
    print(f"{name:8} cv r2={scores.mean():5.2f}  "
          f"coefs={np.round(pipe[-1].coef_, 2)}")`,
        caveats: [
          "Scaling is not optional. The penalty acts on coefficient size, and square footage runs in the thousands while bedrooms run in single digits — unscaled, the penalty punishes the bedroom coefficient for its units rather than its usefulness.",
          "StandardScaler must sit inside the pipeline. Scaling the whole array first fits the mean and variance using rows that later serve as validation, which leaks and inflates the score.",
          "alpha=1.0 is a placeholder, not a choice. Search it over a log-spaced range; the right value depends on the data and on how many features there are.",
          "The cv r2 column comes from three folds of seven rows. Read the coefficients, not the ranking — at this size the scores are noise, which is why elastic net scores worst here despite usually being a reasonable default.",
        ],
        variation: {
          caption: "Let the search choose alpha instead of guessing it.",
          body: `from sklearn.model_selection import GridSearchCV

pipe = make_pipeline(StandardScaler(), Ridge())
grid = GridSearchCV(
    pipe,
    {"ridge__alpha": [0.01, 0.1, 1.0, 10.0, 100.0]},
    cv=3,
    scoring="r2",
)
grid.fit(X, y)
print(grid.best_params_, f"{grid.best_score_:.2f}")

# best_score_ was selected on these folds, so it is optimistic.
# Keep a test set the search never touched for the number you report.`,
        },
      },
      sections: [
        {
          id: "what-it-printed",
          heading: "Read the coefficients, not the scores",
          body: `The three rows print coefficients of \`[69.11, 50.94]\` for ridge,
\`[121.66, 6.07]\` for lasso and \`[54.08, 48.23]\` for elastic net.

Square footage and bedroom count correlate at 0.97 in this data, so the two columns carry
almost the same information. That is what makes the three rows disagree so visibly. Ridge
splits the weight between them, roughly 69 and 51. Lasso does the opposite: it puts 122 on
square footage and pushes bedrooms down to 6, close to dropping it. Elastic net lands between.

That contrast is the whole lesson, and it is not an artefact of this dataset — it is what the
two penalties are built to do. The cross-validated scores beside them are the part to ignore:
three folds of seven rows produce numbers that move with the split.`,
        },
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
weight between them rather than picking one — the 69 and 51 in the output above — which is
usually what you want if you believe they all genuinely matter.`,
        },
        {
          id: "lasso",
          heading: "Lasso can zero things out",
          body: String.raw`Lasso penalises absolute values instead:

$$L_{\text{lasso}} = \frac{1}{2n}\lVert y-X\beta\rVert_2^2+\lambda\lVert\beta\rVert_1$$

The absolute-value penalty has corners at zero, and an optimum can land exactly on a corner.
That is why lasso produces genuinely sparse models where ridge does not, and why bedrooms fell
to 6 while square footage rose to 122.

The selection it performs is less trustworthy than it looks. Among strongly correlated
predictors, lasso tends to keep one and drop the rest, and which one it keeps can change with
a different sample.`,
          callout: {
            title: "Sparsity is not the same as importance",
            body: "A coefficient driven to zero means the penalty outweighed that feature's contribution at this λ, on this sample. It is not a finding that the feature is irrelevant.",
          },
        },
        {
          id: "which-penalty-when",
          heading: "Which one you actually want",
          body: String.raw`Elastic net mixes the two penalties, with $\rho$ setting the balance:

$$L_{\text{EN}} = \frac{1}{2n}\lVert y-X\beta\rVert_2^2+\lambda\left(\rho\lVert\beta\rVert_1+(1-\rho)\lVert\beta\rVert_2^2\right)$$

Choose by what you need from the model, not by which scored best on a small sample. Reach for
ridge when you expect most features to matter a little and you want stable coefficients —
the default when predictors are correlated but all plausibly real. Reach for lasso when you
want a shorter model and can accept that the survivor among correlated features is somewhat
arbitrary. Reach for elastic net when both apply: groups of correlated features, of which some
groups are genuinely irrelevant. Its ridge component keeps the members of a group together
while its lasso component still drives useless ones to zero.

When features are few and uncorrelated, none of this earns its keep — plain least squares is
easier to explain.`,
        },
        {
          id: "choosing-lambda",
          heading: "Choosing the penalty strength",
          body: `Tune $\\lambda$ by cross-validation on training data only, with preprocessing
fitted inside each fold, as the variation above does. Fitting the scaler on the whole dataset
first leaks information about held-out rows into the model, and the resulting estimate will be
optimistic.

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
      minutes: 5,
      links,
      code: {
        caption: "Sweep the polynomial degree on curved data, then watch the two scores disagree.",
        body: `import numpy as np
from sklearn.preprocessing import PolynomialFeatures, StandardScaler
from sklearn.linear_model import Ridge
from sklearn.pipeline import make_pipeline
from sklearn.model_selection import cross_val_score

# Prices accelerating with size: a straight line will underfit.
X = np.array([[650], [800], [1200], [1500], [2000], [2400], [2800]])
y = np.array([150, 160, 210, 300, 450, 600, 850])

for degree in [1, 2, 3, 6]:
    pipe = make_pipeline(
        PolynomialFeatures(degree=degree, include_bias=False),
        StandardScaler(),
        Ridge(alpha=1.0),
    )
    cv = cross_val_score(pipe, X, y, cv=3, scoring="r2").mean()
    pipe.fit(X, y)
    print(f"degree {degree}: cv r2={cv:6.2f}   train r2={pipe.score(X, y):.3f}")`,
        caveats: [
          "Watch the two columns diverge. Training R2 climbs with every degree while cross-validated R2 peaks then collapses — that gap is overfitting, made visible.",
          "Expansion happens before scaling, for a reason: 2800 squared is 7,840,000, so the squared column dwarfs the linear one until it is standardised.",
          "Degree 2 on 10 features gives 65 columns; degree 3 gives 285. The count grows fast enough that regularisation stops being optional.",
          "Extrapolating a polynomial is close to meaningless. A cubic fitted to houses up to 2800 sq ft will predict something confident and absurd at 5000.",
        ],
        variation: {
          caption: "Interactions only, when you want products without powers.",
          body: `poly = PolynomialFeatures(degree=2, interaction_only=True, include_bias=False)
print(poly.fit_transform(np.array([[1500, 3]])))
# [[1500, 3, 4500]] -> sq_ft, bedrooms, sq_ft x bedrooms

# The product says the effect of size depends on bedroom count.
# Keep both main effects: dropping sq_ft while keeping the product
# asserts that size has exactly zero effect at zero bedrooms.`,
        },
      },
      sections: [
        {
          id: "what-it-printed",
          heading: "Two scores that move in opposite directions",
          body: String.raw`The sweep prints train $R^2$ of 0.930, 0.976, 0.993 and 0.996 as the
degree goes 1, 2, 3, 6. Cross-validated $R^2$ over the same degrees reads −3.01, −0.82, 0.71
and −1.25.

Training score climbs the whole way and never warns you about anything. The cross-validated
score tells a different story in three parts: degree 1 is badly underfit, because a straight
line cannot follow data that curves; degree 3 is the best this data supports; degree 6 has
started memorising, and falls off a cliff.

A negative $R^2$ is not a rounding artefact. It means the model does worse than predicting the
mean of the target every time — at degree 6, the curve between the training points has gone
somewhere the held-out points are not.`,
        },
        {
          id: "still-linear",
          heading: "Curved fits from a linear model",
          body: String.raw`"Linear" refers to the parameters, not the shape of the curve. Adding
$x^2$ as a feature and fitting $\hat y = \beta_0 + \beta_1 x + \beta_2 x^2$ traces a parabola,
but it is still a weighted sum of features and still solved by ordinary least squares.

That is the whole trick, and it is what ` + "`PolynomialFeatures`" + String.raw` does above:
transform the inputs, keep the same estimator. The same applies to logs, square roots, splines
and indicator variables.`,
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
          body: `Each extra degree adds parameters and lets the curve wiggle more, which is the
−1.25 at degree 6. High-degree polynomials also behave badly at the edges of the data and
catastrophically beyond it, so extrapolation with a cubic is close to meaningless.

Two habits keep this in check: choose the degree by cross-validation rather than by eye, and
prefer transformations you can justify — a log because the quantity is multiplicative, not a
fifth-degree term because it fitted.`,
        },
        {
          id: "which-transform-when",
          heading: "Which transform the data is asking for",
          body: `Pick the transform from the shape of the problem, not by sweeping every option.
A log fits a quantity that grows multiplicatively — incomes, populations, anything where a
percentage change is the natural unit. A polynomial fits a curve that bends smoothly and has
no meaning beyond the fitted range. A spline fits a curve that bends differently in different
regions, and behaves far better at the edges than a high-degree polynomial. The interaction
variation above fits the case where one feature's effect depends on another, which is a claim
about mechanism rather than shape.

Two things follow from expansion that are easy to miss. It multiplies columns quickly, so the
penalty from the previous lesson stops being optional — that is why the pipeline above ends in
\`Ridge\` rather than \`LinearRegression\`. And it makes extrapolation worse, not better: the
more flexible the curve, the more confidently wrong it is outside the data.`,
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
      code: {
        caption: "Read the residuals before the score, then check whether the score is stable at all.",
        body: `import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import cross_validate, KFold

X = np.array([[650], [800], [1200], [1500], [2000], [2400], [2800]])
y = np.array([150, 160, 210, 300, 450, 600, 850])

model = LinearRegression().fit(X, y)
residuals = y - model.predict(X)

# Structure in the residuals means the model missed something systematic.
for sq_ft, r in zip(X.ravel(), residuals):
    print(f"{sq_ft:5} {r:+7.1f} {'#' * int(abs(r) / 5)}")

cv = cross_validate(
    model, X, y, cv=KFold(3, shuffle=True, random_state=0),
    scoring=["r2", "neg_root_mean_squared_error"],
)
print("r2 per fold:  ", np.round(cv["test_r2"], 2))
print("rmse per fold:", np.round(-cv["test_neg_root_mean_squared_error"], 1))`,
        caveats: [
          "Those residuals are not noise. They are positive at both ends and negative through the middle — the signature of fitting a straight line to data that curves upward. No score reports this; the printed bars do.",
          "R2 varying widely across folds means the estimate is unstable, and the average alone hides that. Report the spread.",
          "shuffle=True is wrong for time-ordered rows and for repeated measurements of the same entity. Use TimeSeriesSplit or GroupKFold, or the model trains on the future.",
          "None of this can test exogeneity. Whether an omitted influence correlates with your features is a question about how the data was collected, and no residual plot answers it.",
        ],
        variation: {
          caption: "When rows are grouped or time-ordered, the split has to know it.",
          body: `from sklearn.model_selection import GroupKFold, TimeSeriesSplit

# Several sales per building: no building may span train and test.
groups = np.array([1, 1, 2, 2, 3, 3, 4])
grouped = cross_validate(model, X, y, cv=GroupKFold(2), groups=groups)
print("grouped:", np.round(grouped["test_score"], 2))

# Time-ordered rows: always train on the past, score on the future.
ordered = cross_validate(model, X, y, cv=TimeSeriesSplit(2))
print("ordered:", np.round(ordered["test_score"], 2))`,
        },
      },
      sections: [
        {
          id: "what-it-printed",
          heading: "The residuals say more than the score",
          body: `The printed residuals run +65.8, +28.8, −46.5, −50.5, −57.2, −32.5, +92.2.

Read the signs in order: positive at both ends, negative through the middle. That arc is the
signature of a straight line laid under data that curves upward — the line is forced to pass
above the middle points to keep up with the ends. Nothing in a score reports this, which is why
looking at residuals comes before reading any metric.

The fold scores make the second point: \`r2 per fold\` prints 0.88, 0.05 and −0.19. Averaging
those gives roughly 0.25, a number that describes none of the three folds and hides that one
of them is worse than predicting the mean. When folds disagree this violently, the average is
not an estimate — it is a summary of instability, and the spread is the finding.`,
        },
        {
          id: "which-claim",
          heading: "Different claims need different assumptions",
          body: `The assumptions behind linear regression are not one block you either satisfy
or fail. Each supports a specific claim, so which checks you owe depends on what you intend to
say.

Prediction needs the least: if held-out error is good, the model is useful regardless of
whether the errors are normally distributed. Conventional standard errors and p-values need
much more — constant variance, independence, a correctly specified mean. Causal interpretation
of a coefficient needs assumptions that no residual plot can verify at all. Decide which claim
you are making first; it tells you which of the sections below you actually have to work
through.`,
        },
        {
          id: "spread-and-dependence",
          heading: "Uneven spread and dependent errors",
          body: `If residual spread grows with the fitted value, the model is heteroscedastic.
Predictions are not necessarily bad, but they are less reliable at one end of the range than
the other, and conventional constant-variance standard errors will mislead.

Dependence is the more dangerous problem because it is usually invisible in a residual plot.
Repeated measurements on the same user, rows from the same time period, or observations
grouped by site all break the independence assumption. Fix it in the validation split — the
group- and time-aware folds in the variation above — not by patching the standard errors
afterwards.`,
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
