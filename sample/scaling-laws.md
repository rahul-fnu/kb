# Scaling Laws for Neural Language Models

Scaling laws describe the predictable relationship between a model's performance and the resources used to train it. Research by Kaplan et al. (2020) at OpenAI established that language model loss follows power-law relationships with model size, dataset size, and compute budget.

## The Core Relationships

Three primary scaling axes determine model performance:

- **Model size (N)**: The number of parameters. Larger models achieve lower loss, following a power law: L ∝ N^(-α) for some exponent α.
- **Dataset size (D)**: The number of tokens in the training set. More data yields lower loss, also following a power law.
- **Compute budget (C)**: The total floating-point operations used for training. For a fixed compute budget, there is an optimal allocation between model size and training tokens.

These relationships hold remarkably consistently across several orders of magnitude, allowing researchers to predict the performance of larger models from smaller experiments.

## Chinchilla Scaling

Hoffmann et al. (2022) at DeepMind revisited the original scaling laws and found that many large models were significantly undertrained relative to their size. Their "Chinchilla" scaling law suggests that model size and training tokens should be scaled roughly equally — a model with N parameters should be trained on approximately 20N tokens.

This insight shifted the field's approach: rather than training the largest possible model on a fixed dataset, the focus moved toward balancing model size with sufficient training data. The Chinchilla-optimal 70B parameter model trained on 1.4 trillion tokens outperformed the much larger 280B Gopher model trained on fewer tokens.

## Implications for Practice

Scaling laws have several practical consequences:

1. **Predictable budgeting**: Organizations can estimate the compute cost needed to reach a target performance level before committing resources.
2. **Efficient experimentation**: Small-scale experiments can reliably predict large-scale outcomes, reducing wasted compute.
3. **Architecture search**: Scaling laws help distinguish genuine architectural improvements from gains that only appear at small scale.

## Beyond Loss: Emergent Capabilities

While scaling laws predict smooth improvements in loss, the capabilities of language models often emerge discontinuously. Tasks like arithmetic, chain-of-thought reasoning, and few-shot learning appear suddenly as models cross certain size thresholds. This disconnect between continuous loss improvement and discontinuous capability emergence remains an active area of research.

## Data Quality and Scaling

Recent work has shown that data quality significantly affects scaling behavior. Carefully curated and deduplicated datasets can shift the scaling curves, achieving better performance with less data. This has led to increased focus on data engineering — filtering, deduplication, and domain mixing — as a complement to simply scaling up model size and compute.
