# Introduction to Transformers

Transformers are a neural network architecture introduced in the 2017 paper "Attention Is All You Need" by Vaswani et al. They have since become the dominant architecture for natural language processing and are increasingly used in computer vision, audio processing, and other domains.

## Key Innovation

Unlike recurrent neural networks (RNNs) that process sequences one token at a time, transformers process entire sequences in parallel using a mechanism called self-attention. This parallelism makes them far more efficient to train on modern hardware, particularly GPUs and TPUs.

## Architecture

A transformer consists of an encoder and a decoder, each made up of stacked layers. Each layer contains two main components:

- **Multi-head self-attention**: Allows the model to attend to different parts of the input simultaneously, capturing relationships between tokens regardless of their distance in the sequence.
- **Feed-forward network**: A position-wise fully connected network that processes each token's representation independently.

Both components use residual connections and layer normalization to stabilize training.

## Variants

The original encoder-decoder architecture has spawned several important variants:

- **Encoder-only** (e.g., BERT): Designed for understanding tasks like classification and named entity recognition.
- **Decoder-only** (e.g., GPT): Designed for generation tasks, predicting the next token in a sequence.
- **Encoder-decoder** (e.g., T5): Retains the full architecture for sequence-to-sequence tasks like translation and summarization.

## Impact

Transformers enabled the development of large language models (LLMs) that demonstrate emergent capabilities at scale. Their ability to be pre-trained on vast corpora of text and then fine-tuned for specific tasks has revolutionized how NLP systems are built. The architecture's scalability — both in model size and training data — has been a key driver of recent progress in AI.
