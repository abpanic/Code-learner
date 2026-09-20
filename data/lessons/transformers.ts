import { PLACEHOLDER, type TopicLesson } from "./types";

const links = { theory: PLACEHOLDER, explanation: PLACEHOLDER, learnMore: PLACEHOLDER };

export const transformersLesson: TopicLesson = {
  topicId: "transformers",
  overview: String.raw`A transformer is a stack of blocks, each of which does two things: let
every token look at every other token, then process each token independently. The first is
attention. The second is the feedforward network from the previous topic, applied position by
position.

What made this replace recurrent models was not accuracy alone but parallelism. A recurrent
network processes a sequence one step at a time, because step $t$ needs the hidden state from
step $t-1$. Attention computes all positions at once as a matrix operation, so the whole
sequence goes through the hardware in parallel. That is what made training on very large
corpora practical.

The cost is quadratic. Every token attends to every token, so compute and memory grow with the
square of sequence length. Doubling the context quadruples the work, which is why context
length is a headline specification and why a large share of transformer research is about
making attention cheaper.

The four lessons below cover the attention computation itself, how position gets into a model
that is otherwise order-blind, what a full block contains, and where the costs actually land.`,
  subtopics: [
    {
      id: "attention",
      title: "Scaled dot-product attention",
      summary: "Queries, keys, values — the computation that mixes tokens.",
      minutes: 4,
      links,
      notebookId: "transformers",
      sections: [
        {
          id: "qkv",
          heading: "Three projections of the same input",
          body: String.raw`Each token's representation is projected three ways: a **query** for what
this token is looking for, a **key** for what it offers, and a **value** for what it passes on if
selected.

$$\text{Attention}(Q,K,V) = \text{softmax}\!\left(\frac{QK^{\mathsf T}}{\sqrt{d_k}}\right)V$$

Read it in three steps. $QK^{\mathsf T}$ scores every query against every key, giving a matrix of
compatibilities. The softmax turns each row into weights summing to one. Multiplying by $V$ takes
the weighted average of the values. Every token's output is a blend of all tokens' values,
weighted by relevance.`,
        },
        {
          id: "the-scale",
          heading: "Why divide by the square root",
          body: String.raw`With $d_k$ dimensions and roughly independent components, a dot product
has variance proportional to $d_k$. For $d_k = 64$ the scores spread wide enough that the softmax
saturates: one weight near 1, the rest near 0.

A saturated softmax has a near-zero gradient, so the model cannot learn to adjust its attention.
Dividing by $\sqrt{d_k}$ normalises the variance back to roughly 1, keeping the distribution soft
enough that gradients flow. It is a small correction with an outsized effect on whether training
works at all.`,
          callout: {
            title: "The scale is about gradients, not about the forward pass",
            body: "Without it the model still computes attention. It just cannot learn, because the softmax saturates and stops passing useful gradient back to the projections.",
          },
        },
        {
          id: "worked",
          heading: "Two tokens, by hand",
          body: String.raw`Two tokens with $d_k = 2$. Let $q_1 = [1, 0]$, and keys $k_1 = [1, 0]$,
$k_2 = [0, 1]$.

Scores: $q_1 \cdot k_1 = 1$, $q_1 \cdot k_2 = 0$. Scaled by $\sqrt{2} \approx 1.414$ these become
$0.707$ and $0$. Softmax gives $e^{0.707} \approx 2.03$ against $e^0 = 1$, so the weights are about
$0.67$ and $0.33$.

Token 1's output is $0.67 v_1 + 0.33 v_2$. It attends mostly to itself because its query aligns
with its own key, but it still takes a third of its content from token 2. Nothing is discrete
here — attention is a soft weighting, not a selection.`,
        },
        {
          id: "masking",
          heading: "Masking controls what can be seen",
          body: `A decoder generating text must not attend to future tokens, or it would be trained
with the answer available. A causal mask sets those scores to negative infinity before the
softmax, driving their weights to exactly zero.

The same mechanism handles padding: batched sequences are padded to equal length, and those
positions are masked so they contribute nothing. Masking bugs are quietly severe — a model that
can see one token ahead will show excellent validation loss and generate nonsense, because the
crutch it learned to use is gone at inference.`,
        },
      ],
      code: {
        caption: "Scaled dot-product attention in numpy, with and without the scale.",
        body: `import numpy as np

def softmax(x, axis=-1):
    shifted = x - x.max(axis=axis, keepdims=True)   # stability, not decoration
    e = np.exp(shifted)
    return e / e.sum(axis=axis, keepdims=True)

def attention(Q, K, V, mask=None):
    scores = Q @ K.T / np.sqrt(Q.shape[-1])
    if mask is not None:
        scores = np.where(mask, scores, -np.inf)
    weights = softmax(scores)
    return weights @ V, weights

rng = np.random.default_rng(0)
n, d_k = 4, 64
Q, K, V = rng.normal(size=(n, d_k)), rng.normal(size=(n, d_k)), rng.normal(size=(n, d_k))

_, weights = attention(Q, K, V)
print("scaled   max weight:", weights.max().round(3))
print("unscaled max weight:", softmax(Q @ K.T).max().round(3))

causal = np.tril(np.ones((n, n), dtype=bool))       # no peeking ahead
_, masked = attention(Q, K, V, mask=causal)
print("row 1 attends to:", masked[1].round(3))`,
        caveats: [
          "Unscaled, the largest weight is close to 1 and the softmax is saturated. A saturated softmax has near-zero gradient, so the model cannot learn where to attend.",
          "The scale is about gradients, not the forward pass. Without it attention still computes something; it just cannot be trained.",
          "Subtracting the max before exponentiating prevents overflow. It changes nothing mathematically and everything numerically.",
          "A causal mask off by one lets each token see one token of the future. Validation loss looks excellent and generation is poor — check masking before anything else.",
        ],
      },
      questions: [
        {
          question: "Why divide attention scores by the square root of the key dimension?",
          answer: "Dot products in d_k dimensions have variance growing with d_k, so unscaled scores spread wide and saturate the softmax. A saturated softmax has near-zero gradient, so the attention weights stop learning.",
        },
        {
          question: "What goes wrong if a causal mask is off by one position?",
          answer: "Each token sees one token of the future during training, so it learns to rely on information unavailable at generation time. Validation loss looks excellent while generated text is poor — a discrepancy that points at masking before anything else.",
        },
      ],
    },
    {
      id: "multi-head-and-position",
      title: "Multiple heads, plus position",
      summary: "Why several attention patterns run in parallel.",
      minutes: 4,
      links,
      sections: [
        {
          id: "heads",
          heading: "One attention pattern is not enough",
          body: String.raw`A single attention operation produces one weighting per token. But a
token may need to relate to its subject, its modifier and its coreferent simultaneously, and one
softmax-weighted average blurs those into a single blend.

Multi-head attention splits the representation into $h$ pieces, runs attention independently on
each, and concatenates the results before a final projection. With $d = 512$ and $h = 8$, each
head works in 64 dimensions. Total compute is roughly unchanged — the dimensions were divided,
not duplicated — but the model can maintain several distinct relational patterns at once.`,
        },
        {
          id: "order-blind",
          heading: "Attention ignores order",
          body: `Attention is permutation-equivariant: shuffle the input tokens and the outputs
shuffle identically, but no individual output changes. Nothing in the computation refers to
position. "Dog bites man" and "man bites dog" would be indistinguishable.

Position therefore has to be injected deliberately. That it is added rather than intrinsic is one
of the genuine oddities of the architecture, and it is why there are several competing schemes
rather than one obvious answer.`,
        },
        {
          id: "absolute",
          heading: "Absolute encodings",
          body: `The original approach adds a position-dependent vector to each token embedding
before the first block — sinusoids of varying frequency, or a learned vector per position.

Learned encodings are simple and cannot extrapolate: position 5000 has no vector if training only
reached 2048. Sinusoidal ones are defined at any position, though models using them still degrade
well beyond their training lengths. Both share a deeper awkwardness — they encode where a token
is absolutely, when what usually matters is how far apart two tokens are.`,
        },
        {
          id: "rope",
          heading: "Rotary encodings",
          body: String.raw`RoPE takes a different route. Instead of adding anything to the
embeddings, it rotates the query and key vectors by an angle proportional to position, in
two-dimensional pairs.

The consequence is neat: because a dot product between two rotated vectors depends on the
difference of their rotation angles, the attention score naturally carries relative position. The
model never sees an absolute index, and length extrapolation is better behaved. This is why RoPE
is the common choice in current large models.`,
          callout: {
            title: "Relative beats absolute for most tasks",
            body: "\"Three tokens back\" is usually the meaningful relationship, not \"position 847\". Encodings that express distance directly generalise past their training length more gracefully.",
          },
        },
      ],
      code: {
        caption: "Split into heads, then rotate queries and keys so the score carries distance.",
        body: `import numpy as np

d_model, n_heads, seq = 64, 8, 5
d_head = d_model // n_heads          # heads divide the width, they do not add to it

rng = np.random.default_rng(0)
x = rng.normal(size=(seq, d_model))
heads = x.reshape(seq, n_heads, d_head).transpose(1, 0, 2)
print("x", x.shape, "-> heads", heads.shape, "(head, position, dim)")

def rope(v, positions, base=10000.0):
    d = v.shape[-1]
    freqs = base ** (-np.arange(0, d, 2) / d)
    angles = positions[:, None] * freqs[None, :]
    cos, sin = np.cos(angles), np.sin(angles)
    even, odd = v[..., 0::2], v[..., 1::2]
    return np.stack([even * cos - odd * sin, even * sin + odd * cos], -1).reshape(v.shape)

positions = np.arange(seq)
q = rope(rng.normal(size=(seq, d_head)), positions)
k = rope(rng.normal(size=(seq, d_head)), positions)

scores = q @ k.T
print("score(0,1)", round(float(scores[0, 1]), 4),
      " score(2,3)", round(float(scores[2, 3]), 4), "<- same distance")`,
        caveats: [
          "Attention is permutation-equivariant: shuffle the tokens and the outputs shuffle with them, unchanged. Position has to be injected deliberately.",
          "Heads split the width rather than duplicating it, so eight 64-dimensional heads cost about the same as one 512-dimensional one while holding several relational patterns.",
          "Learned absolute encodings cannot extrapolate: position 5000 has no vector if training stopped at 2048. Rotary encodings are defined at any position.",
          "RoPE makes the score depend on the difference of rotation angles, so it carries relative distance without the model ever seeing an absolute index.",
        ],
      },
      questions: [
        {
          question: "Why use eight 64-dimensional heads rather than one 512-dimensional one?",
          answer: "One attention pattern forces all relationships into a single weighted average. Splitting the dimensions lets the model hold several distinct patterns at once for roughly the same compute, since the width was divided rather than duplicated.",
        },
        {
          question: "How does RoPE carry position without adding a position vector?",
          answer: "It rotates queries and keys by an angle proportional to position. A dot product between two rotated vectors depends on the difference of their angles, so the score itself encodes relative distance.",
        },
      ],
    },
    {
      id: "the-block",
      title: "Inside a transformer block",
      summary: "The residual stream, normalisation, the feedforward layer.",
      minutes: 4,
      links,
      sections: [
        {
          id: "two-sublayers",
          heading: "Attention then feedforward",
          body: `A block has two sub-layers. Attention mixes information between positions. The
feedforward network then processes each position independently, with no cross-token interaction
at all.

The division is clean and worth holding onto: attention is the only place tokens communicate.
Everything else in a transformer operates on one position at a time. Most of the parameters,
incidentally, live in the feedforward layers rather than in attention.`,
        },
        {
          id: "residuals",
          heading: "The residual stream",
          body: `Each sub-layer's output is added to its input rather than replacing it. That
addition is what makes deep stacks trainable: the gradient has a direct path back through every
addition, so it reaches early layers without being multiplied down by dozens of intermediate
factors.

It also gives a useful mental model. The residual stream is a running representation that each
block reads from and writes into, incrementally refining rather than transforming wholesale. A
block that has nothing to contribute can approximately pass its input through.`,
        },
        {
          id: "norm-placement",
          heading: "Where the normalisation goes",
          body: `Layer normalisation can sit after each sub-layer (post-norm, the original design) or
before it (pre-norm). The difference is more consequential than it looks.

Post-norm puts a normalisation directly on the residual path, which destabilises very deep stacks
and requires careful learning-rate warmup. Pre-norm leaves the residual path clean, so gradients
flow more freely and training tolerates larger rates. Essentially all modern large models use
pre-norm, and a deep post-norm model failing to train is a well-known result rather than a
mystery.`,
          callout: {
            title: "Keep the residual path unobstructed",
            body: "The value of a residual connection is the identity path it provides. Anything placed directly on that path — a normalisation, a gate — reduces the benefit and shows up as instability once the stack is deep.",
          },
        },
        {
          id: "ffn",
          heading: "The feedforward layer",
          body: String.raw`Two linear layers with a nonlinearity between, expanding and contracting:
typically $d \to 4d \to d$. With $d = 512$ that is a 2048-unit hidden layer.

The expansion is where most of the parameter count lives, and it is widely read as the model's
storage: attention decides what information to gather, the feedforward layer decides what to do
with it. Modern variants often use gated activations such as SwiGLU and adjust the width to keep
the parameter count comparable.`,
        },
      ],
      code: {
        caption: "A pre-norm block in numpy, and why the residual path must stay clear.",
        body: `import numpy as np

def layer_norm(x, eps=1e-5):
    mean = x.mean(-1, keepdims=True)
    var = x.var(-1, keepdims=True)
    return (x - mean) / np.sqrt(var + eps)

def block(x, attend, ffn, pre_norm=True):
    if pre_norm:
        x = x + attend(layer_norm(x))     # residual path stays untouched
        x = x + ffn(layer_norm(x))
    else:
        x = layer_norm(x + attend(x))     # normalisation sits on the residual
        x = layer_norm(x + ffn(x))
    return x

rng = np.random.default_rng(0)
d = 32
W1, W2 = rng.normal(size=(d, 4 * d)) * 0.1, rng.normal(size=(4 * d, d)) * 0.1
ffn = lambda h: np.maximum(0, h @ W1) @ W2
attend = lambda h: h * 0.5               # stand-in for real attention

x = rng.normal(size=(6, d))
for depth in [1, 12, 48]:
    for mode in (True, False):
        h = x.copy()
        for _ in range(depth):
            h = block(h, attend, ffn, pre_norm=mode)
        name = "pre" if mode else "post"
        print(f"depth {depth:3} {name:4}-norm  activation std = {h.std():.3f}")`,
        caveats: [
          "Only attention moves information between positions. The feedforward sub-layer sees one position at a time, so every cross-token interaction in the model happens in attention.",
          "The residual addition is what makes depth trainable: it gives the gradient an identity path back through every block.",
          "Post-norm puts a normalisation directly on that path, which destabilises deep stacks and needs careful warmup. Essentially all modern large models use pre-norm.",
          "Most parameters live in the feedforward expansion, not in attention. When people say a transformer stores knowledge, this is largely where they mean.",
        ],
      },
      questions: [
        {
          question: "Which part of a block lets tokens exchange information?",
          answer: "Only attention. The feedforward sub-layer applies to each position independently, so every cross-token interaction in the entire model happens inside attention.",
        },
        {
          question: "Why has pre-norm replaced post-norm in deep models?",
          answer: "Post-norm places a normalisation on the residual path itself, weakening the identity route gradients depend on and destabilising deep stacks. Pre-norm keeps that path clean, so deeper models train with less warmup and larger learning rates.",
        },
      ],
    },
    {
      id: "cost-and-context-length",
      title: "Where the cost goes",
      summary: "Quadratic attention, the KV cache, the usual remedies.",
      minutes: 4,
      links,
      sections: [
        {
          id: "quadratic",
          heading: "The quadratic term",
          body: String.raw`The score matrix is $n \times n$ for sequence length $n$, so attention
costs $O(n^2 d)$ time and, if materialised, $O(n^2)$ memory. Doubling context quadruples both.

For short sequences this is not the bottleneck — the feedforward layers, which are linear in $n$,
dominate. The crossover arrives somewhere in the low thousands of tokens, after which attention
takes over and context length becomes the limiting design decision.`,
        },
        {
          id: "flash",
          heading: "FlashAttention saves memory, not arithmetic",
          body: `FlashAttention computes attention in tiles, keeping each tile in fast on-chip memory
and never writing the full $n \\times n$ matrix to main memory. It is exact — the same result,
computed in a different order.

What it saves is memory traffic, and since attention is memory-bandwidth-bound rather than
compute-bound on modern accelerators, that translates into a large speedup and a much larger
feasible context. The arithmetic is unchanged; the quadratic term is still there.`,
          callout: {
            title: "Exact, not approximate",
            body: "FlashAttention is often grouped with efficient-attention methods that change what is computed. It does not — it reorders the same computation to avoid materialising the score matrix.",
          },
        },
        {
          id: "kv-cache",
          heading: "The KV cache dominates inference",
          body: `Generating token by token, keys and values for previous tokens do not change, so they
are cached rather than recomputed. That turns each new token from quadratic work into linear work.

The cache is then the memory constraint. Its size grows with sequence length, layer count, head
count and batch size, and at long contexts it can exceed the model weights themselves. Multi-query
and grouped-query attention share key and value projections across heads specifically to shrink it,
trading a little quality for a large reduction in serving cost.`,
        },
        {
          id: "long-context",
          heading: "Longer context is not free",
          body: `Sparse and linear attention variants reduce the asymptotic cost by attending to a
subset of positions or approximating the softmax. They work, with a quality cost that varies by
task, and none has displaced full attention as the default.

Worth separating two claims: a model that accepts 128k tokens can process them, which does not
mean it uses them well. Retrieval accuracy tends to sag in the middle of a long context, so
context length is a capability ceiling rather than a guarantee.`,
        },
      ],
      code: {
        caption: "Measure where the quadratic term overtakes everything else.",
        body: `import numpy as np

d_model, n_layers, n_heads = 4096, 32, 32
BYTES = 2                      # fp16

def attention_scores_bytes(n):
    return n * n * n_heads * BYTES          # one layer, if materialised

def ffn_flops(n):
    return 2 * n * d_model * (4 * d_model)  # linear in n

def kv_cache_bytes(n, batch=1):
    return 2 * n * d_model * n_layers * batch * BYTES

print(f"{'tokens':>8} {'scores/layer':>14} {'ffn flops':>14} {'kv cache':>12}")
for n in [512, 2048, 8192, 32768, 131072]:
    print(f"{n:8} {attention_scores_bytes(n) / 1e9:11.2f} GB "
          f"{ffn_flops(n) / 1e12:11.2f} TF "
          f"{kv_cache_bytes(n) / 1e9:9.2f} GB")

print("\\ndoubling tokens: ffn cost x2, attention scores x4")`,
        caveats: [
          "Attention is quadratic and the feedforward layers are linear, so the crossover arrives in the low thousands of tokens. Below that, attention is not your bottleneck.",
          "FlashAttention never materialises that score matrix — it tiles the computation. It is exact, saving memory traffic rather than arithmetic, so the quadratic term remains.",
          "At long contexts the KV cache can exceed the model weights. Multi-query and grouped-query attention share key and value projections specifically to shrink it.",
          "Accepting 128k tokens is not using them. Retrieval accuracy commonly sags in the middle of a long context, so the number is a ceiling rather than a promise.",
        ],
      },
      questions: [
        {
          question: "What exactly does FlashAttention save?",
          answer: "Memory traffic. It computes attention in tiles without materialising the full n×n score matrix, giving the same result faster because attention is bandwidth-bound. The arithmetic and its quadratic growth are unchanged.",
        },
        {
          question: "Why does the KV cache matter more at inference than training?",
          answer: "Generation is sequential, so caching previous keys and values turns quadratic recomputation into linear work per token. The cache then becomes the binding memory constraint, which is what multi-query attention exists to reduce.",
        },
        {
          question: "A model advertises 128k context. What does that guarantee?",
          answer: "That it accepts the input without error. It does not guarantee reliable use of it — retrieval accuracy commonly degrades for material in the middle of a long context, so the figure is a ceiling rather than a promise.",
        },
      ],
    },
  ],
};
