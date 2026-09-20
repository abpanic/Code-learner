import { PLACEHOLDER, type TopicLesson } from "./types";

const links = { theory: PLACEHOLDER, explanation: PLACEHOLDER, learnMore: PLACEHOLDER };

export const dlFnnLesson: TopicLesson = {
  topicId: "dl_fnn",
  overview: String.raw`A feedforward network is a stack of linear maps with a nonlinearity between
each pair. That is genuinely all it is. The interesting part is not the architecture but the
fact that you can compute the gradient of a loss with respect to every weight in the stack
efficiently, which is what makes fitting millions of parameters practical.

Without the nonlinearities the whole stack collapses: a linear map composed with a linear map
is a linear map, so a hundred layers would have exactly the expressive power of one. The
activation function between layers is the entire reason depth buys anything.

Backpropagation is the algorithm that makes training feasible. It is the chain rule applied in
reverse order, reusing intermediate results so the cost of computing all the gradients is
roughly the cost of one forward pass rather than one pass per parameter. Understanding it
matters less for implementing it — every framework does that — than for reading the failure
modes, because most training problems announce themselves as gradients that have vanished,
exploded, or gone to NaN.

The four lessons below cover the forward computation, the backward one, the choices that make
optimisation behave, and how to build a training loop you can actually trust.`,
  subtopics: [
    {
      id: "neurons-and-layers",
      title: "The forward pass",
      summary: "What a layer computes, plus why nonlinearity is essential.",
      minutes: 5,
      links,
      sections: [
        {
          id: "what-it-printed",
          heading: "Shapes, parameters, and one collapse",
          body: `Three lines, and the third is the one that matters.

\`X (4, 5) -> z1 (4, 3) -> z2 (4, 2)\` tracks the batch through the network. Four rows stay four rows the whole way; only the feature dimension changes, 5 to 3 to 2. That pattern — first axis is the batch, last axis is what the layer transforms — holds almost everywhere in deep learning.

\`parameters: 26\` is the count: 5x3 weights plus 3 biases in the first layer, 3x2 plus 2 in the second. Worth computing by hand once, because parameter count is what memory and overfitting both scale with.

\`two linear layers == one: True\` is the punchline. Without an activation between them, stacking two linear layers produces a function a single linear layer could already express. Depth bought nothing, which is exactly what the next section is about.`,
        },
        {
          id: "a-layer",
          heading: "One layer",
          body: String.raw`A layer takes a vector in and produces a vector out:

$$h = \phi(Wx + b)$$

$W$ is a matrix of weights, $b$ a bias vector, $\phi$ an activation applied element-wise. Each
row of $W$ defines one unit's weighted combination of the inputs; the bias shifts where that
unit becomes active.

Stack these and the output of one becomes the input of the next. Nothing more elaborate is
happening — a deep network is this operation repeated, with the shapes chosen so the dimensions
line up.`,
        },
        {
          id: "why-nonlinear",
          heading: "Why the activation is not optional",
          body: String.raw`Remove $\phi$ and two layers become $W_2(W_1x + b_1) + b_2$, which is
$(W_2W_1)x + (W_2b_1 + b_2)$ — a single linear map with a different parameterisation. Depth
would buy nothing at all.

The nonlinearity breaks that collapse. With one between each pair of layers, a sufficiently wide
network can approximate any continuous function on a bounded domain. That result says nothing
about how wide, or whether gradient descent will find those weights, but it does explain why the
family is expressive enough to be worth the trouble.`,
          callout: {
            title: "Universal approximation is an existence result",
            body: "It says a network capable of representing the function exists. It does not say training will find it, or that the width required is reasonable. Treat it as permission to try, not as a guarantee.",
          },
        },
        {
          id: "shapes",
          heading: "Shapes are where the bugs live",
          body: `A layer mapping 784 inputs to 128 units has a $128 \\times 784$ weight matrix and a
128-element bias, so 100,480 parameters. Working through those dimensions by hand once is worth
more than reading about it, because shape mismatches are the single most common error when
writing a model.

Batching adds a leading dimension: inputs arrive as $(B, 784)$ and come out $(B, 128)$. The same
weights apply to every row in the batch, which is what makes the operation a single matrix
multiply rather than a loop.`,
        },
        {
          id: "output-layer",
          heading: "The last layer is different",
          body: `Hidden layers use a general-purpose activation. The output layer is determined by
the task: no activation for regression, a sigmoid for binary classification, a softmax across the
final dimension for multiclass.

In practice frameworks fold that final activation into the loss function, for numerical stability
— computing log-softmax directly is better conditioned than taking a softmax and then its log.
This is why a model's last layer often looks bare in the code, and why applying a softmax before
a loss that already includes one is a quiet, common bug.`,
        },
        {
          id: "when-a-network",
          heading: "When a network is the right shape",
          body: `A feedforward network is a general function approximator, which makes it tempting everywhere and correct in fewer places than that suggests.

It earns its keep when the features are not already meaningful — pixels, audio samples, characters, sequences — because the layers learn a representation instead of you engineering one. It also keeps improving with more data, past the point where other tabular methods flatten out.

On ordinary tabular data of modest size it is usually the wrong tool, and this topic's notebook is the evidence: a two-layer network scores 0.9649 on the breast-cancer data, behind logistic regression at 0.9737. Gradient boosting beats networks on tabular problems often enough that it should be the default there, with networks kept for the cases where the representation is the problem.`,
        },
      ],
      code: {
        caption: "A two-layer forward pass in numpy, with the shapes printed at each step.",
        body: `import numpy as np

rng = np.random.default_rng(0)
batch, d_in, hidden, d_out = 4, 5, 3, 2

X = rng.normal(size=(batch, d_in))
W1, b1 = rng.normal(size=(d_in, hidden)) * 0.5, np.zeros(hidden)
W2, b2 = rng.normal(size=(hidden, d_out)) * 0.5, np.zeros(d_out)

z1 = X @ W1 + b1
h1 = np.maximum(0, z1)          # ReLU
z2 = h1 @ W2 + b2               # no activation: these are logits

print("X ", X.shape, "-> z1", z1.shape, "-> z2", z2.shape)
print("parameters:", W1.size + b1.size + W2.size + b2.size)

# Without the ReLU the whole stack collapses to one linear map.
collapsed = X @ (W1 @ W2) + (b1 @ W2 + b2)
linear_only = (X @ W1 + b1) @ W2 + b2
print("two linear layers == one:", np.allclose(collapsed, linear_only))`,
        caveats: [
          "Remove the nonlinearity and ten layers have exactly the expressive power of one, as the last two lines show. The activation is the entire reason depth buys anything.",
          "Shape errors are the most common bug in a hand-written model. Print shapes at every step while building.",
          "The final layer produces logits, not probabilities. Frameworks fold the softmax into the loss for numerical stability, so applying one yourself applies it twice.",
          "Weight scale at initialisation decides whether activations saturate or decay. A model producing NaN in its first steps is usually badly initialised rather than badly designed.",
        ],
      },
      questions: [
        {
          question: "What happens to a ten-layer network with no activation functions?",
          answer: "It is exactly equivalent to a single linear layer. Composing linear maps yields a linear map, so the extra depth adds parameters and cost while adding no expressive power at all.",
        },
        {
          question: "Why do frameworks fold the softmax into the loss?",
          answer: "Numerical stability. Computing log-softmax directly avoids exponentiating large scores and then taking a log of something near zero. It also means applying a softmax yourself before such a loss applies it twice.",
        },
      ],
    },
    {
      id: "backpropagation",
      title: "Backpropagation",
      summary: "The chain rule in reverse, worked on one neuron.",
      minutes: 5,
      links,
      notebookId: "dl_fnn",
      sections: [
        {
          id: "what-it-printed",
          heading: "A gradient, checked against arithmetic",
          body: `The forward pass gives \`z=1.0000\`, \`a=0.7311\`, \`loss=0.036165\`. The backward pass gives \`dL/dw=-0.105754\` and \`dL/db=-0.052877\`.

The next two lines recompute both by finite differences and land on exactly the same figures. That agreement is the point of the cell. Backpropagation is a bookkeeping scheme for the chain rule, and a gradient check — nudge a parameter a little each way, divide the change in loss by twice the nudge — is how you confirm the bookkeeping is right.

Notice the relationship between the two: \`dL/dw\` is exactly twice \`dL/db\`, because the input here is x = 2.0 and the weight's gradient carries a factor of x that the bias's does not. Small consistency checks like that catch real errors early.

Both gradients are negative, meaning the loss falls as the parameter rises, so the update moves both upward.`,
        },
        {
          id: "the-idea",
          heading: "Reuse, not recomputation",
          body: `The gradient of the loss with respect to an early weight is a product of
derivatives along the path from that weight to the loss. Computing each such product
independently would repeat almost all of the work.

Backpropagation computes them once, from the output backwards. At each layer it receives the
gradient of the loss with respect to that layer's output, and produces two things: the gradient
with respect to that layer's parameters, and the gradient with respect to its input, which is
what the previous layer needs. One backward sweep, every gradient.`,
        },
        {
          id: "one-neuron",
          heading: "One neuron, one step",
          body: String.raw`Take a single neuron: $z = wx + b$, $a = \sigma(z)$, with squared loss
$L = \tfrac{1}{2}(a - y)^2$. Let $x = 2$, $w = 0.5$, $b = 0$, $y = 1$.

Forward: $z = 1$, $a = \sigma(1) \approx 0.731$, $L \approx 0.036$.

Backward, one factor at a time. $\partial L/\partial a = a - y \approx -0.269$. Then
$\partial a/\partial z = a(1-a) \approx 0.197$, so $\partial L/\partial z \approx -0.053$.
Finally $\partial z/\partial w = x = 2$, giving $\partial L/\partial w \approx -0.106$ and
$\partial L/\partial b \approx -0.053$.

The input appears in the weight gradient and not in the bias gradient, which is exactly why a
feature that is always zero never updates its weight.`,
        },
        {
          id: "vanishing",
          heading: "Why depth makes this fragile",
          body: String.raw`Each layer contributes a factor. The sigmoid's derivative $a(1-a)$
peaks at 0.25 and approaches zero when the unit saturates, so ten sigmoid layers can multiply
ten factors below 0.25 together — the gradient reaching the first layer is effectively zero and
it stops learning.

This is the vanishing gradient problem, and it is why deep sigmoid networks were impractical for
years. ReLU's derivative is 1 for positive inputs, contributing no shrinkage along active paths,
which is most of why it replaced the sigmoid in hidden layers.

The opposite failure exists too: factors consistently above one make gradients explode, which
presents as loss going to NaN. Gradient clipping bounds the update norm as a blunt but effective
remedy.`,
          callout: {
            title: "Read the symptom backwards",
            body: "Loss flat from the start and early layers barely moving suggests vanishing gradients. Loss falling then jumping to NaN suggests exploding ones. The distinction tells you whether to change activations or clip.",
          },
        },
        {
          id: "autodiff",
          heading: "What the framework is doing",
          body: `You will not write this by hand. The framework records each operation during the
forward pass, building a graph, then walks it backwards applying each operation's known
derivative rule.

That is worth knowing for two practical reasons. The graph holds intermediate activations, which
is why memory scales with batch size and depth rather than just parameter count. And anything
that breaks the chain — detaching a tensor, a non-differentiable operation, converting to a plain
array — silently stops gradients flowing through that path.`,
        },
        {
          id: "when-you-need-this",
          heading: "When this matters in practice",
          body: `Every framework computes these derivatives for you, and you will almost never write a backward pass. Three situations make the mechanism worth carrying anyway.

Diagnosing a network that will not learn. Flat loss, exploding loss, and loss that moves then stalls all have signatures in the gradients — the vanishing-gradient case below is the most common of them.

Writing a custom layer or loss. The moment you step outside what the library ships, you have to supply what it expects, and a gradient check exactly like this one is how you verify it before training anything expensive.

Reading an error message. Most framework stack traces concern shapes or a broken graph, and both are easier to interpret once you know a backward pass walks the same graph in reverse.`,
        },
      ],
      code: {
        caption: "Backpropagate one neuron by hand, then verify every gradient numerically.",
        body: `import numpy as np

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

x, w, b, y = 2.0, 0.5, 0.0, 1.0

# forward
z = w * x + b
a = sigmoid(z)
loss = 0.5 * (a - y) ** 2

# backward, one factor at a time
dL_da = a - y
da_dz = a * (1 - a)
dL_dz = dL_da * da_dz
dL_dw = dL_dz * x        # the input reappears here, and only here
dL_db = dL_dz * 1.0

print(f"z={z:.4f} a={a:.4f} loss={loss:.6f}")
print(f"dL/dw={dL_dw:+.6f}  dL/db={dL_db:+.6f}")

def loss_at(w_, b_):
    return 0.5 * (sigmoid(w_ * x + b_) - y) ** 2

eps = 1e-6
print(f"numeric dL/dw={(loss_at(w + eps, b) - loss_at(w - eps, b)) / (2 * eps):+.6f}")
print(f"numeric dL/db={(loss_at(w, b + eps) - loss_at(w, b - eps)) / (2 * eps):+.6f}")`,
        caveats: [
          "The input appears in the weight gradient and not in the bias gradient. A feature that is always zero therefore never updates its weight, however wrong the prediction.",
          "Sigmoid's derivative peaks at 0.25, so ten stacked sigmoid layers multiply ten factors below 0.25 and the first layer stops learning. That is the vanishing gradient.",
          "Loss flat from step one points at vanishing gradients; loss falling then going NaN points at exploding ones. The symptom tells you which fix applies.",
          "Anything that breaks the chain — detaching a tensor, converting to a plain array, a non-differentiable op — silently stops gradients with no error raised.",
        ],
      },
      questions: [
        {
          question: "Where does the input x appear in the weight gradient?",
          answer: "As the final factor: ∂z/∂w = x. The gradient for a weight is the upstream gradient scaled by the input that weight multiplies — which is why a feature that is always zero leaves its weight unchanged.",
        },
        {
          question: "Why did ReLU largely replace sigmoid in hidden layers?",
          answer: "Its derivative is 1 wherever the unit is active, so it contributes no shrinkage to the product of factors. Sigmoid's derivative never exceeds 0.25, so stacking layers drives early gradients toward zero.",
        },
      ],
    },
    {
      id: "activations-and-initialisation",
      title: "Activations, initialisation, optimisers",
      summary: "The choices that decide whether training behaves.",
      minutes: 6,
      links,
      sections: [
        {
          id: "what-it-printed",
          heading: "Three initialisations, three fates",
          body: `Activation variance is measured every four layers, starting near 1.0.

**Too small**: 4.39e-03, then 7.98e-12, then 1.10e-20. The signal has vanished. Twenty layers down there is nothing left for a gradient to travel through.

**Too large**: 4.36e-01, 6.07e-02, 6.48e-03 — shrinking as well, because activations this size are being squashed flat by the nonlinearity. Both failure modes end in a network that does not train.

**He initialisation**: 0.686, 0.800, 0.721. Variance holds roughly steady the whole way down. That is the design goal — scale the starting weights by the fan-in so each layer passes signal on at about the size it received it.

The final line is separate and absolute: \`zero init, distinct column values: 1\`. Initialise every weight to zero and all units in a layer compute the same thing, receive the same gradient, and stay identical forever. Randomness is what breaks that symmetry.`,
        },
        {
          id: "activations",
          heading: "Which activation",
          body: `ReLU, $\\max(0, z)$, is the default: cheap, non-saturating for positive inputs, and
sparse in its activations. Its failure mode is the dead unit — once a unit's inputs are always
negative its gradient is always zero and it never recovers.

Leaky ReLU gives a small negative slope so there is always some gradient. GELU is smooth and
standard in transformers. The differences are real but modest; start with ReLU and only
investigate if you observe many dead units.`,
        },
        {
          id: "initialisation",
          heading: "Initialisation sets the starting scale",
          body: String.raw`All-zero weights make every unit in a layer compute the same thing and
receive the same gradient, so they stay identical forever. Symmetry has to be broken randomly.

Scale matters as much as randomness. Too large and activations saturate or explode; too small and
the signal decays layer by layer. He initialisation, drawing from variance $2/n_{\text{in}}$,
keeps activation variance roughly stable through ReLU layers; Xavier does the same for tanh.

These are defaults in every framework. They are worth knowing because a model that produces NaN
in its first few steps is often initialised or scaled wrongly rather than broken in its
architecture.`,
        },
        {
          id: "normalisation",
          heading: "Normalisation layers",
          body: `Batch normalisation standardises each feature across the batch; layer normalisation
standardises across features within each example. Both keep activations in a usable range as
training shifts the weights.

Layer norm is the one to prefer when batches are small or variable, since batch norm's statistics
get noisy and its train/eval behaviour differs — it uses batch statistics while training and
running averages at inference, which is a classic source of "works in training, wrong in
production".`,
        },
        {
          id: "optimisers",
          heading: "SGD, Adam, AdamW",
          body: `Plain SGD updates against the gradient. Momentum accumulates a velocity, smoothing
the path. Adam additionally scales each parameter's step by a running estimate of its gradient
magnitude, so rarely-active parameters still move.

AdamW matters for a specific reason. Adding an L2 term to the loss inside Adam means the penalty
gets divided by that per-parameter scale along with everything else, so it is applied unevenly and
not really weight decay at all. AdamW decouples it, subtracting the decay from the weights
directly. Where you want weight decay, use AdamW — this is why it is the default in most modern
training code.`,
          callout: {
            title: "L2 inside Adam is not weight decay",
            body: "Adam rescales every gradient component, including the penalty's. Decoupling the decay restores the intended uniform pull toward zero, which is exactly the difference AdamW makes.",
          },
        },
        {
          id: "what-to-pick",
          heading: "What to pick, and when to depart from it",
          body: `The defaults are good and you should usually take them: ReLU in the hidden layers, He initialisation to match, Adam as the optimiser, and a normalisation layer once the network is deep.

Depart for specific reasons. Use GELU or SiLU in transformers, where they are standard and measurably better. Use Leaky ReLU when a large share of units have gone permanently dead. Use tanh when you need a bounded, zero-centred activation, as in some recurrent architectures.

Match initialisation to activation rather than choosing them separately: He for the ReLU family, Xavier for tanh and sigmoid. They are a pair, and mixing them is how you end up in the first column of that output.

The output layer follows the task and nothing else: no activation for regression, sigmoid for binary, softmax for exclusive multiclass.`,
        },
      ],
      code: {
        caption: "Measure activation variance through a deep stack under three initialisations.",
        body: `import numpy as np

rng = np.random.default_rng(0)
width, depth, batch = 128, 12, 256

def propagate(scale_fn, label):
    h = rng.normal(size=(batch, width))
    variances = []
    for _ in range(depth):
        W = rng.normal(size=(width, width)) * scale_fn(width)
        h = np.maximum(0, h @ W)
        variances.append(h.var())
    shown = [f"{v:.2e}" for v in variances[::4]]
    print(f"{label:12} {' '.join(shown)}")

print("layer variance every 4 layers (start ~1.0)")
propagate(lambda n: 0.01, "too small")            # signal dies
propagate(lambda n: 0.1, "too large")             # signal explodes
propagate(lambda n: np.sqrt(2.0 / n), "He init")  # stays put

# All-zero weights: every unit computes the same thing forever.
W = np.zeros((width, width))
h = np.maximum(0, rng.normal(size=(batch, width)) @ W)
print("zero init, distinct column values:", len(np.unique(h)))`,
        caveats: [
          "Too small and the signal decays to nothing by layer 12; too large and it explodes. He initialisation holds variance roughly constant through ReLU layers.",
          "Zero initialisation makes every unit in a layer identical and keeps them identical, since they receive identical gradients. The layer has the power of one unit.",
          "A dead ReLU unit — always negative input — has zero gradient forever and never recovers. Leaky ReLU keeps a small slope so there is always something to learn from.",
          "L2 inside Adam is not weight decay: Adam rescales every gradient component including the penalty's, so the pull toward zero is uneven. AdamW decouples it.",
        ],
      },
      questions: [
        {
          question: "Why can't you initialise all weights to zero?",
          answer: "Every unit in a layer would compute the same output and receive the same gradient, so they would remain identical however long you train. The layer would have the expressive power of a single unit.",
        },
        {
          question: "How does AdamW differ from L2 regularisation inside Adam?",
          answer: "Adam divides each gradient component by a running magnitude estimate, which rescales the L2 term unevenly across parameters. AdamW subtracts the decay from the weights directly, so the pull toward zero is uniform as intended.",
        },
        {
          question: "A model works in training and is wrong at inference. What would you check first?",
          answer: "Whether it was left in training mode. Batch norm uses batch statistics while training and running averages afterwards, and dropout is active in one and not the other — both produce exactly this symptom.",
        },
      ],
    },
    {
      id: "the-training-loop",
      title: "Building a loop you can trust",
      summary: "The order of operations, with the checks that catch real bugs.",
      minutes: 5,
      links,
      sections: [
        {
          id: "what-it-printed",
          heading: "A loss curve, descending",
          body: `Loss falls 0.83954, 0.18104, 0.05454, 0.02431 across 300 steps, sampled every hundred.

The shape matters more than the values. It drops steeply and then flattens: most of the progress arrives early and later steps buy progressively less. That is the normal shape of gradient descent on a problem it can solve.

Two other shapes are worth recognising, because they are the ones you will actually meet. Flat from the very start means the learning rate is too small, the inputs are unscaled, or the gradient never reaches the parameters. Loss that rises, oscillates, or becomes \`nan\` means the learning rate is too large and every step overshoots.

This loss is measured on training data, so it says the optimiser is working. It says nothing about generalisation — for that you need the same curve on held-out data, and the gap between the two is what overfitting looks like.`,
        },
        {
          id: "the-loop",
          heading: "What each step does",
          body: `Zero the gradients, run the forward pass, compute the loss, call backward, step the
optimiser. Repeat per batch, and evaluate on validation data each epoch.

The zeroing is not ceremonial. Frameworks accumulate gradients by default, so forgetting it means
each step uses the sum of every gradient so far and training quietly diverges. It is the most
common bug in a hand-written loop and produces no error message.`,
        },
        {
          id: "overfit-one-batch",
          heading: "Overfit a tiny batch first",
          body: `Before any real training run, take eight examples and fit until the loss is
essentially zero. It takes seconds and it is the highest-value check available.

If the model cannot memorise eight examples, no amount of data or tuning will help — something is
broken. Labels misaligned with inputs, a loss applied to the wrong axis, a detached tensor
stopping gradients, a learning rate so small nothing moves. All of these show up here in seconds
rather than after an hour of full training.`,
          callout: {
            title: "A failed tiny-batch overfit is a bug, not a tuning problem",
            body: "It means gradients are not reaching the parameters that matter, or the targets are not what you think they are. Fix that before considering architecture or hyperparameters.",
          },
        },
        {
          id: "learning-rate",
          heading: "Learning rate first",
          body: `It is the hyperparameter that matters most, by a wide margin. Too high and the loss
oscillates or diverges; too low and it creeps. A range test — increase the rate exponentially over
a few hundred steps and plot the loss — finds a usable value quickly.

A schedule usually helps: warm up over the first few hundred steps so early updates do not wreck
the initialisation, then decay so later steps refine rather than bounce.`,
        },
        {
          id: "watching",
          heading: "What to watch",
          body: `Track training and validation loss together. Training falling while validation rises
is overfitting; both flat is underfitting or a broken gradient path; training loss spiking is
usually the learning rate.

Also log gradient norms occasionally. A norm collapsing toward zero or growing without bound
identifies vanishing or exploding gradients directly, rather than leaving you to infer them from
the loss curve. Set a seed and record it, so that when a run behaves strangely you can tell
whether it reproduces.`,
        },
        {
          id: "what-to-reach-for",
          heading: "Which knob, for which symptom",
          body: `The loop has a handful of controls, and they map onto symptoms rather than being tuned in the abstract.

Learning rate first, always. It is the parameter that most often decides whether a network trains at all, and the loss curve tells you which direction to move it. Decaying it over training is close to free improvement.

Batch size trades gradient noise against hardware efficiency. Larger batches give smoother gradients and faster epochs; smaller ones add noise that often generalises slightly better. Pick the largest that fits and move on.

Reach for regularisation only once training and validation loss have visibly diverged — weight decay, dropout, or simply stopping early. Applying it before you have seen that gap is guessing.

If the loss is flat rather than plateauing, none of these is the answer: check the data pipeline and the input scaling before touching anything inside the loop.`,
        },
      ],
      code: {
        caption: "The tiny-batch overfit check: the highest-value test before any real run.",
        body: `import numpy as np

rng = np.random.default_rng(0)
X = rng.normal(size=(8, 4))          # eight examples is the whole point
y = (X[:, 0] > 0).astype(float).reshape(-1, 1)

W1, b1 = rng.normal(size=(4, 16)) * np.sqrt(2 / 4), np.zeros(16)
W2, b2 = rng.normal(size=(16, 1)) * np.sqrt(2 / 16), np.zeros(1)
lr = 0.1

for step in range(301):
    z1 = X @ W1 + b1
    h1 = np.maximum(0, z1)
    p = 1 / (1 + np.exp(-(h1 @ W2 + b2)))
    loss = -np.mean(y * np.log(p + 1e-12) + (1 - y) * np.log(1 - p + 1e-12))

    dz2 = (p - y) / len(y)                  # gradients start here
    dW2, db2 = h1.T @ dz2, dz2.sum(0)
    dh1 = dz2 @ W2.T
    dz1 = dh1 * (z1 > 0)                    # ReLU passes gradient only where active
    dW1, db1 = X.T @ dz1, dz1.sum(0)

    for param, grad in ((W1, dW1), (b1, db1), (W2, dW2), (b2, db2)):
        param -= lr * grad

    if step % 100 == 0:
        print(f"step {step:3}  loss={loss:.5f}")`,
        caveats: [
          "If the loss does not reach near zero on eight examples, you have a bug, not a tuning problem. Misaligned labels, a loss on the wrong axis, or gradients not reaching the parameters.",
          "Frameworks accumulate gradients by default, so a real loop must zero them each step. Forgetting produces silent divergence with no error message.",
          "Learning rate dominates every other hyperparameter. Find a workable range before touching architecture.",
          "Batch norm and dropout behave differently in training and evaluation. A model that is right while training and wrong at inference is usually left in the wrong mode.",
        ],
      },
      questions: [
        {
          question: "What does a failed tiny-batch overfit suggest?",
          answer: "A bug rather than a modelling shortfall — gradients not reaching the parameters, misaligned labels, a loss on the wrong axis, or a learning rate so small nothing updates. A correct model memorises a handful of examples easily.",
        },
        {
          question: "Why must gradients be zeroed each step?",
          answer: "Frameworks accumulate them by default, to support splitting a batch across passes. Without zeroing, each step uses the running sum of all previous gradients, which diverges silently with no error raised.",
        },
      ],
    },
  ],
};
