# The Attention Mechanism

Attention is the core computational primitive in transformer models. It allows a model to dynamically focus on relevant parts of an input sequence when producing each element of the output, rather than compressing the entire input into a fixed-size vector.

## Scaled Dot-Product Attention

The fundamental attention operation takes three inputs — queries (Q), keys (K), and values (V) — and computes a weighted sum of values based on the similarity between queries and keys:

```
Attention(Q, K, V) = softmax(QK^T / √d_k) V
```

The scaling factor `√d_k` (where `d_k` is the dimension of the keys) prevents the dot products from growing too large, which would push the softmax into regions with extremely small gradients.

## Multi-Head Attention

Rather than performing a single attention computation, transformers use multi-head attention, which runs several attention operations in parallel with different learned linear projections. Each "head" can learn to attend to different types of relationships:

- One head might focus on syntactic relationships (subject-verb agreement).
- Another might capture semantic similarity between distant concepts.
- A third might track positional patterns or co-reference chains.

The outputs of all heads are concatenated and projected to produce the final result. This gives the model a richer representational capacity than single-head attention.

## Types of Attention in Transformers

Transformers use attention in three distinct ways:

1. **Self-attention in the encoder**: Each token attends to all other tokens in the input, building context-aware representations.
2. **Masked self-attention in the decoder**: Each token can only attend to previous tokens, preserving the autoregressive property needed for generation.
3. **Cross-attention**: Decoder tokens attend to encoder outputs, connecting the generated sequence to the input.

## Computational Considerations

Standard self-attention has O(n²) complexity in sequence length, which becomes a bottleneck for long sequences. This has motivated research into efficient attention variants such as sparse attention, linear attention, and sliding-window approaches. Flash Attention, introduced in 2022, optimizes the memory access patterns of standard attention to achieve significant speedups without approximation.

## Beyond NLP

The attention mechanism has proven remarkably versatile. Vision Transformers (ViT) apply self-attention to image patches. Audio models use attention over spectrograms. Graph neural networks incorporate attention for neighbor aggregation. The mechanism's generality — learning which parts of the input are relevant for each part of the output — is a broadly useful computational pattern.
