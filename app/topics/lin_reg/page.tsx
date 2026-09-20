import type { Metadata } from "next";
import katex from "katex";
import { NotebookViewer } from "@/app/notebook-viewer";
import { LessonShell } from "../lesson-shell";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Linear Regression & Regularization | Principal AI/ML Competency Matrix",
  description: "An applied guide to ordinary least squares, ridge, lasso, elastic net, assumptions, evaluation, and a worked Jupyter notebook.",
};

function Equation({ value, label }: { value: string; label?: string }) {
  return <div className="lesson-equation" role="img" aria-label={label || value} dangerouslySetInnerHTML={{ __html: katex.renderToString(value, { displayMode: true, throwOnError: false }) }} />;
}

function FitChart() {
  const points = [[70, 175], [155, 85], [240, 40], [325, 85], [410, 40]];
  return <figure className="fit-figure"><svg viewBox="0 0 470 270" role="img" aria-label="Five observed points, fitted line y equals 2.2 plus 0.6x, and a mean-only baseline at y equals 4">
    <line x1="54" y1="20" x2="54" y2="222" className="chart-axis" /><line x1="54" y1="222" x2="432" y2="222" className="chart-axis" />
    {[2,3,4,5].map(y => <g key={y}><line x1="54" x2="432" y1={220-(y-1)*45} y2={220-(y-1)*45} className="chart-grid"/><text x="40" y={224-(y-1)*45} textAnchor="end" className="chart-label">{y}</text></g>)}
    {[1,2,3,4,5].map((x,i) => <text x={points[i][0]} y="242" textAnchor="middle" className="chart-label" key={x}>{x}</text>)}
    <line x1="70" y1="85" x2="410" y2="85" className="chart-baseline" />
    <line x1="70" y1="139" x2="410" y2="31" className="chart-fit" />
    {points.map(([x,y],i) => <circle key={i} cx={x} cy={y} r="6" className="chart-point" />)}
    <text x="437" y="241" className="chart-label">x</text><text x="24" y="26" className="chart-label">y</text>
  </svg><figcaption><span><i className="legend-dot" /> Observed</span><span><i className="legend-line" /> Fitted line</span><span><i className="legend-dash" /> Mean baseline</span></figcaption></figure>;
}

const contents = [
  ["overview", "When to use it"], ["ols", "How OLS fits a line"], ["example", "Worked example"],
  ["regularization", "Ridge, lasso, elastic net"], ["assumptions", "Assumptions & diagnostics"],
  ["workflow", "Practical workflow"], ["practice", "Check understanding"], ["notebook", "Python notebook"],
] as const;

const sources = [
  { label: "scikit-learn: Linear models", url: "https://scikit-learn.org/stable/modules/linear_model.html" },
  { label: "An Introduction to Statistical Learning", url: "https://www.statlearning.com/" },
];

export default function LinearRegressionLesson() {
  return <LessonShell
    topicId="lin_reg"
    title="Linear Regression & Regularization"
    headline={<>Linear Regression &<br /> Regularization</>}
    eyebrow="CORE ML · FOUNDATION"
    subtitle="A clear baseline for predicting a number, understanding feature effects, and controlling model complexity."
    tags={["Regression", "Model selection"]}
    ctaNote="Work through the example, then test the assumptions."
    contents={contents}
    note="One model does not answer every question. Use the fitted line as a baseline, then test whether its assumptions and predictions hold on new data."
    sources={sources}
  >
        <section id="overview" className="lesson-section"><span className="section-kicker">01 / PURPOSE</span><h2>When should you use linear regression?</h2><p>Use it when the outcome is numeric and a linear combination of features is a useful first approximation. It gives you an interpretable starting point: a coefficient describes the expected change in the prediction when a feature increases by one unit, with other included features held fixed.</p><div className="lesson-callout"><strong>Prediction and explanation are different goals.</strong><p>A small test error can make the model useful for prediction. A coefficient is not automatically a causal effect; confounding, selection, and measurement can change its interpretation.</p></div><p>Linear regression is also a strong baseline for more complex models. Add transformations or interactions when the relationship is not adequately linear. Use regularization when many or correlated features make estimates unstable or lead to overfitting.</p></section>

        <section id="ols" className="lesson-section"><span className="section-kicker">02 / CORE IDEA</span><h2>How ordinary least squares fits a line</h2><p>For one input, the model predicts <strong>ŷ = β₀ + β₁x</strong>. Ordinary least squares (OLS) chooses the intercept and slope that minimize the sum of squared residuals—the vertical gaps between observed values and predictions.</p><Equation value={String.raw`\hat\beta = \underset{\beta}{\operatorname{argmin}}\;\sum_{i=1}^{n}(y_i - x_i^{\mathsf T}\beta)^2`} label="OLS minimizes the sum of squared differences between observed and predicted values"/><p>In matrix form, a full-rank design has the familiar closed-form expression below. In actual numerical work, a QR or singular-value decomposition is usually preferable to directly computing an inverse.</p><Equation value={String.raw`\hat\beta = (X^{\mathsf T}X)^{-1}X^{\mathsf T}y\quad\text{if }X^{\mathsf T}X\text{ is invertible}`} label="OLS coefficient solution when X transpose X is invertible"/><div className="lesson-two-up"><div><strong>What OLS optimizes</strong><p>Training residual sum of squares. Adding features cannot increase this training loss.</p></div><div><strong>What you should judge</strong><p>Error on held-out data, residual patterns, stability, and whether the resulting model serves the decision.</p></div></div></section>

        <section id="example" className="lesson-section"><span className="section-kicker">03 / WORKED EXAMPLE</span><h2>Fit a small dataset by hand</h2><p>Consider five observations: <strong>x = [1, 2, 3, 4, 5]</strong> and <strong>y = [2, 4, 5, 4, 5]</strong>. Their means are x̄ = 3 and ȳ = 4. The sum of cross-deviations is 6; the sum of squared x-deviations is 10.</p><Equation value={String.raw`\hat\beta_1=\frac{6}{10}=0.6,\qquad\hat\beta_0=4-(0.6)(3)=2.2`} label="Slope equals 0.6 and intercept equals 2.2"/><div className="example-grid"><FitChart/><div className="example-numbers"><div><span>Fitted line</span><strong>ŷ = 2.2 + 0.6x</strong></div><div><span>Residual sum of squares</span><strong>2.4</strong></div><div><span>Mean-only sum of squares</span><strong>6.0</strong></div><div><span>Training R²</span><strong>1 − 2.4 / 6 = 0.60</strong></div></div></div><p className="small-note">R² = 0.60 describes the fit on these five observations. It does not establish accuracy on future data or prove that x causes y.</p></section>

        <section id="regularization" className="lesson-section"><span className="section-kicker">04 / CONTROL COMPLEXITY</span><h2>Ridge, lasso, and elastic net</h2><p>Regularization adds a penalty for large coefficients. It trades a little training fit for potentially better stability and generalization. The intercept is ordinarily left unpenalized. Scale features within each training fold so the penalty treats coefficients on a comparable footing.</p><div className="method-list"><div><div className="method-title"><span>01</span><h3>Ridge · L2</h3></div><p>Adds the sum of squared coefficients. It shrinks weights smoothly and is often useful when correlated predictors carry shared signal.</p><Equation value={String.raw`L_{\text{ridge}} = \frac{1}{2n}\lVert y-X\beta\rVert_2^2+\lambda\lVert\beta\rVert_2^2`} /></div><div><div className="method-title"><span>02</span><h3>Lasso · L1</h3></div><p>Adds the sum of absolute coefficients. It can set some weights exactly to zero, but feature selection may be unstable among strongly correlated predictors.</p><Equation value={String.raw`L_{\text{lasso}} = \frac{1}{2n}\lVert y-X\beta\rVert_2^2+\lambda\lVert\beta\rVert_1`} /></div><div><div className="method-title"><span>03</span><h3>Elastic net · L1 + L2</h3></div><p>Combines sparsity and shrinkage. It is a useful candidate when you want selection but have groups of correlated features.</p><Equation value={String.raw`L_{\text{EN}} = \frac{1}{2n}\lVert y-X\beta\rVert_2^2+\lambda\left(\rho\lVert\beta\rVert_1+(1-\rho)\lVert\beta\rVert_2^2\right)`} /></div></div><div className="lesson-callout"><strong>How to choose λ</strong><p>Fit preprocessing and tune the penalty with cross-validation using only training data. Keep a separate test set for the final estimate of generalization. As λ increases, coefficients usually shrink more; too much shrinkage underfits.</p></div></section>

        <section id="assumptions" className="lesson-section"><span className="section-kicker">05 / VALIDITY</span><h2>Assumptions and diagnostics</h2><p>Different assumptions support different claims. You can have a useful predictor even when a textbook inference assumption fails, but do not report conventional standard errors or causal effects without checking the conditions behind them.</p><div className="diagnostic-table" role="table" aria-label="Regression assumptions and checks"><div role="row" className="diagnostic-head"><span role="columnheader">Question</span><span role="columnheader">What to inspect</span></div><div role="row"><span role="cell"><strong>Is the mean relationship adequately linear?</strong></span><span role="cell">Plot residuals against fitted values and important features. Curvature suggests missing transformations or interactions.</span></div><div role="row"><span role="cell"><strong>Are predictors correlated with omitted influences?</strong></span><span role="cell">Review data collection and confounders. Exogeneity is a design question; a residual plot alone cannot establish it.</span></div><div role="row"><span role="cell"><strong>Are errors dependent or uneven in spread?</strong></span><span role="cell">Check time/group structure and residual spread. Use an appropriate validation split and robust or clustered uncertainty estimates when justified.</span></div><div role="row"><span role="cell"><strong>Are coefficients unstable?</strong></span><span role="cell">Inspect correlation, condition number or VIF, and resampling stability. Regularization may help; VIF is a diagnostic, not a universal threshold.</span></div><div role="row"><span role="cell"><strong>Do you need small-sample inference?</strong></span><span role="cell">Check residual shape and influential observations. Normal errors aid exact small-sample tests; they are not required to compute OLS predictions.</span></div></div></section>

        <section id="workflow" className="lesson-section"><span className="section-kicker">06 / APPLY IT</span><h2>A practical modeling workflow</h2><ol className="workflow-list"><li><strong>Define the target and split first.</strong> Use a time-aware or group-aware split when random rows would leak information.</li><li><strong>Build a mean baseline and OLS model.</strong> Compare MAE/RMSE on validation data, not only training R².</li><li><strong>Fit preprocessing inside a pipeline.</strong> Impute and standardize using training folds only, especially before a penalized model.</li><li><strong>Compare ridge, lasso, and elastic net.</strong> Tune penalty strength by cross-validation, then inspect coefficient stability and validation error.</li><li><strong>Review residuals and segments.</strong> Check failures across ranges, groups, and time. Report performance on the untouched test set once.</li></ol><pre className="lesson-code"><code>{`from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import RidgeCV

# X_train and y_train come from your training split.
model = make_pipeline(
    StandardScaler(),
    RidgeCV(alphas=[0.01, 0.1, 1.0, 10.0], cv=5),
)
model.fit(X_train, y_train)
predictions = model.predict(X_test)`}</code></pre><p className="small-note">For time series or grouped data, replace ordinary cross-validation with folds that respect that structure. The notebook below implements the small OLS example from scratch.</p></section>

        <section id="practice" className="lesson-section"><span className="section-kicker">07 / PRACTICE</span><h2>Check your understanding</h2><div className="practice-list"><div><span>01</span><div><h3>Why can perfect multicollinearity break the usual OLS formula?</h3><p>One column can be reconstructed from others, so XᵀX is singular. Predictions may still be computable with other numerical approaches, but individual coefficients are not uniquely identified.</p></div></div><div><span>02</span><div><h3>Why does L1 often yield sparse coefficients while L2 usually shrinks them?</h3><p>The absolute-value penalty has corners at zero. An optimum can land exactly on a corner; the smooth squared penalty generally gives continuous shrinkage.</p></div></div><div><span>03</span><div><h3>What does a pattern of increasing residual spread change?</h3><p>It suggests heteroscedasticity. Predictive performance may vary across the target range, and conventional constant-variance standard errors may be misleading.</p></div></div></div></section>

        <section id="notebook" className="lesson-section lesson-notebook"><span className="section-kicker">08 / WORK THROUGH IT</span><h2>Python notebook</h2><p>Run this example in Jupyter to calculate the coefficients and training R². The preview shows saved cells and outputs; downloaded notebooks remain editable on your machine.</p><NotebookViewer topicId="lin_reg" title="Linear Regression & Regularization" available /></section>
  </LessonShell>;
}
