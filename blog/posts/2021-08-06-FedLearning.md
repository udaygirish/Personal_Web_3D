---
title: Federated learning and Continual learning
tags: [AI, ML, Federated Learning, Continual Learning]
style: fill
color: secondary
comments: true
description:  Intro to Federated learning and Continual learning techniques - Advances in AI
---
# 

### Federated Learning:

Link: [https://federated.withgoogle.com/](https://federated.withgoogle.com/)

Firms actively working on it : Google, Facebook , NVIDIA

Federated Learning (FL)  is a distributed machine learning approach which enables training on a large corpus of decentralized data residing on devices like mobile phones. FL is one instance of the more general approach of “bringing the code to the data, instead of the
data to the code” and addresses the fundamental problems of privacy, ownership, and locality of data.   

- Read Paper [here.](https://arxiv.org/pdf/1902.01046.pdf)

![Federated%20learning%20and%20Continual%20learning%204a67eea70937471ca5304bbe6c88193a/Untitled.png](https://github.com/udaygirish/udaygirish.github.io/raw/master/_posts/Federated_learning_Intro/Untitled.png)

 - Google Blog Image

![Federated%20learning%20and%20Continual%20learning%204a67eea70937471ca5304bbe6c88193a/Untitled%201.png](https://github.com/udaygirish/udaygirish.github.io/raw/master/_posts/Federated_learning_Intro/Untitled_1.png)

 - Nvidia Clara Federated Server Description

![Federated%20learning%20and%20Continual%20learning%204a67eea70937471ca5304bbe6c88193a/Untitled%202.png](https://github.com/udaygirish/udaygirish.github.io/raw/master/_posts/Federated_learning_Intro/Untitled_2.png)

Where it can be used :

1. Healthcare
2. Analytics on Private Data
3. Distributed Weight Shared learning use cases - ML Technical Point of View

### Continual Learning

Most of the information collected from 

Main Link: [https://www.continualai.org/home/](https://www.continualai.org/home/)

[https://medium.com/continual-ai/why-continuous-learning-is-the-key-towards-machine-intelligence-1851cb57c308](https://medium.com/continual-ai/why-continuous-learning-is-the-key-towards-machine-intelligence-1851cb57c308)

Continual learning, also called lifelong learning or online machine learning, is a fundamental idea in machine learning in which models continuously learn and evolve based on the input of increasing amounts of data while retaining previously learned knowledge. In practice, this refers to supporting a model’s ability to autonomously learn and adapt in production as new data comes in. Just like us, this concept too, is based on mimicking humans’ ability to learn incrementally by acquiring, fine-tuning, and transferring knowledge and skills throughout their lifespan.

Basically it is Incremental Knowledge Learning with Continuity in Adapting to the Knowledge.

Use cases:

1. Continual Bias addition to knowledge - recommender systems and Anomaly detection
2. Ever changing data either partial or complete updates

CL Enables Multimodal- Multitask learning too .

Lukasz Kaiser & All from Google Brain this year [8] come up with a single model which has been able to learn very different tasks in very different domains and with many input modalities (with a huge static training set).

**State-of-the-art & Future Challenges**

**Pros**:

1. Contrasting *[Catastrophic Forgetting](https://en.wikipedia.org/wiki/Catastrophic_interference)* is possible in many ways, and not only through careful hyper-parametrizations or regularization techniques.
2. We have already proved that CL can be used in complex problems in *Vision*, *Supervised* or with *Reinforce*.
3. Accuracy results (on some toy benchmarks) are impressively high, almost in line with other techniques which *have access* to previously encountered data.

**Cons**:

1. It’s not completely clear how evaluate CL techniques, and a more formalized framework may be needed.
2. We have pretty much focused on solving a rigid sequence of (simple) tasks (on the scale of dozens) and not on streaming perception data, neither on multimodal/multitask problems.
3. It’s not clear how to behave after the saturation of the capability of the model, neither how to selectively forget.