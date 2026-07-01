# Algorithms

## Feature Engineering

Raw deal fields are converted into comparable features:

- Deal age and stage age.
- Days since last activity.
- Days until close.
- Sales cycle ratio.
- Inactivity ratio.
- Close pressure.
- Missing next step.
- Stage, segment, amount, and owner risk.

## Risk Score

Risk is a weighted logistic model:

```txt
z = intercept + age + inactivity + closePressure + stage + segment + amount + owner + missingNextStep
risk = sigmoid(z)
riskScore = 100 * risk
```

Weights are heuristic in the MVP and are intentionally visible in code. Risk drivers are the weighted feature contributions sorted descending.

## Adjusted Probability

The probability engine combines CRM probability, stage prior, owner win rate, and source prior in logit space. It then applies a risk penalty:

```txt
baseLogit = weightedLogit(crm, stage, owner, source)
adjustedLogit = baseLogit - gamma * risk
adjustedProbability = sigmoid(adjustedLogit)
```

This avoids adding probabilities directly and makes the CRM number correctable by operating signals.

## Monte Carlo

Each simulation samples every deal as a Bernoulli variable using adjusted probability. The simulation returns expected revenue, percentiles, standard deviation, target-hit probability, downside gap, upside potential, and histogram buckets.

## Evaluation

Synthetic scenarios include hidden outcomes so the app can calculate Brier score and calibration buckets.
