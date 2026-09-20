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
      minutes: 4,
      links,
      sections: [
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
      ],
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
      minutes: 4,
      links,
      notebookId: "dl_fnn",
      sections: [
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
      ],
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
      minutes: 4,
      links,
      sections: [
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
      ],
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
      minutes: 4,
      links,
      sections: [
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
      ],
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
