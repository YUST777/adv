# Probability & Statistics — Complete Curriculum Knowledge Base
# Based on Dr. Mohamed E. Sobh's Lectures

---

## Chapter 1: Normal Distribution

### Definition
- A continuous distribution depending on two parameters: mean (μ) and variance (σ²).
- PDF: f(x; μ, σ²) = (1/(σ√(2π))) · e^(−(1/2)((x−μ)/σ)²), for −∞ < x < ∞
- Notation: X ~ N(μ, σ²)

### Properties
1. Support: −∞ < x < ∞
2. Bell-shaped curve, never touches x-axis
3. Total area under curve = 1
4. Highest point at mean μ
5. Symmetric about μ (mean = median = mode)
6. Denser in center, less dense in tails

### 68-95-99.7 Rule
- P(μ−σ < X < μ+σ) = 68%
- P(μ−2σ < X < μ+2σ) = 95%
- P(μ−3σ < X < μ+3σ) = 99.7%

### Standard Normal Distribution
- Z ~ N(0, 1) — mean = 0, variance = 1
- Converting: If X ~ N(μ, σ²), then Z = (X−μ)/σ ~ N(0, 1)

### Probability Calculations Using φ (CDF)
- P(X < a) = φ((a−μ)/σ)
- P(X > a) = 1 − φ((a−μ)/σ)
- P(a < X < b) = φ((b−μ)/σ) − φ((a−μ)/σ)
- φ(−a) = 1 − φ(a) (symmetry property)
- P(Z < 0) = P(Z > 0) = 0.5
- φ(0) = 0.5

### Finding k Values (Inverse Problems)
- Given P(X < k) = p, find k: Convert to Z, look up in table, solve k = μ + Z·σ
- Given P(X > k) = p, use P(X > k) = 1 − φ((k−μ)/σ) = p, so φ((k−μ)/σ) = 1−p

**Worked Example**: X ~ N(12, 9), find k such that P(X < k) = 0.9875
- σ² = 9, σ = 3
- φ((k−12)/3) = 0.9875
- From table: (k−12)/3 = 2.24
- k = 12 + 6.72 = 18.72

**Worked Example**: Heights of 1000 students ~ N(68, 9), σ = 3
- P(X < 64) = P(Z < (64−68)/3) = P(Z < −1.33) = φ(−1.33) = 0.0918
- Number of students = 0.0918 × 1000 ≈ 92

---

## Chapter 2: T-Distribution (Student's t)

### Definition
- Used when sample size is small (n < 30) and population σ is unknown.
- Heavier tails than normal distribution.
- Based on degrees of freedom: df = n − 1.

### Properties
1. Support: −∞ to ∞
2. Bell-shaped, symmetric about 0
3. Mean = median = mode = 0
4. Variance > 1 (wider than standard normal)
5. Family of curves based on degrees of freedom
6. As df → ∞, t-distribution → standard normal

### Reading the T-Table
- Find df = n − 1 in the left column
- Find the probability in the top row
- The intersection gives the critical value

**Example**: n = 19, find P(T > 2.101)
- df = 19 − 1 = 18
- Look up T-table at df = 18, value 2.101 → P = 0.025

---

## Chapter 2 (cont.): Chi-Square Distribution (χ²)

### Definition
- χ² = Z₁² + Z₂² + ... + Zₖ² (sum of squared standard normals)
- k = degrees of freedom

### Properties
- Always non-negative (0 to ∞)
- Right-skewed (positively skewed)
- Mean = k (degrees of freedom)
- Variance = 2k
- As df increases, becomes more symmetric → approaches normal

### Probability Calculations
- P(χ² > a) = read directly from χ² table
- P(a < χ² < b) = P(χ² > a) − P(χ² > b)

---

## Chapter 2 (cont.): F-Distribution

### Definition
- F = (U₁/d₁) / (U₂/d₂) where U₁, U₂ are independent chi-square variables
- F ~ F(d₁, d₂) with d₁ and d₂ degrees of freedom

### Properties
- Always non-negative (0 to ∞)
- Right-skewed
- Mean = d₂/(d₂−2)
- Used in ANOVA and comparing two variances

---

## Chapter 2 (cont.): Sampling Distributions

### Population vs Sample Notation
| Population | Sample |
|-----------|--------|
| N (size) | n (size) |
| μ (mean) | x̄ (mean) |
| σ² (variance) | s² (variance) |
| σ (std dev) | s (std dev) |

### Sampling Distribution of the Mean (x̄)
- E(x̄) = μ_x̄ = μ
- V(x̄) = σ²_x̄ = σ²/n
- Standard Error: σ_x̄ = σ/√n
- As n increases, standard error decreases → sample means become less variable

### Central Limit Theorem (CLT)
If X₁, X₂, ..., Xₙ is a random sample of large enough size n from a population with mean μ and variance σ², then x̄ is approximately normal:
- Z = (x̄ − μ) / (σ/√n) ~ N(0, 1)

### ⚠️ VERY IMPORTANT: Three Cases for the Sampling Distribution of x̄

**Case 1: σ² known, population normal or n ≥ 30**
- Z = (x̄ − μ) / (σ/√n) ~ N(0, 1)

**Case 2: σ² unknown, n ≥ 30**
- Z = (x̄ − μ) / (s/√n) ~ N(0, 1)
- (Use s instead of σ, still Z because CLT applies)

**Case 3: σ² unknown, n < 30, population approximately normal**
- T = (x̄ − μ) / (s/√n) ~ T(n−1)
- MUST use t-distribution with df = n − 1

**Worked Example**: n = 16, μ = 200, σ² = 36, σ = 6. Find P(x̄ ≤ 199)
- Z = (199 − 200) / (6/√16) = −1/1.5 = −0.67
- P(x̄ ≤ 199) = φ(−0.67) = 1 − φ(0.67) = 1 − 0.7486 = 0.251

**Worked Example**: n = 64, μ = 3.2, σ = 1.6. Find P(x̄ > 3.5)
- Z = (3.5 − 3.2) / (1.6/√64) = 0.3/0.2 = 1.5
- P(x̄ > 3.5) = 1 − φ(1.5) = 1 − 0.9332 = 0.0668

**Worked Example**: n = 64, μ = 3.2, s = 5 (σ unknown, n ≥ 30 → use Z with s)
- Z = (x̄ − μ) / (s/√n) ~ N(0, 1)
- P(x̄ > 2.2) = P(Z > (2.2−3.2)/(5/8)) = P(Z > −1.6) = 1 − φ(−1.6) = φ(1.6) = 0.9452

---

## Chapter 3: Sampling Distribution of the Variance (s²)

### Formula
If X₁, ..., Xₙ from N(μ, σ²), then:
- χ² = (n−1)s²/σ² ~ χ²(n−1)

### Properties
- E(s²) = σ² (unbiased estimator)
- V(s²) = 2σ⁴/(n−1)

### Probability Calculations
- P(s² > a) = P(χ² > (n−1)a/σ²)
- P(a < s² < b) = P((n−1)a/σ² < χ² < (n−1)b/σ²)

**Worked Example**: n = 25, σ² = 6. Find P(s² > 9.1)
- χ² = (25−1)(9.1)/6 = 24 × 9.1/6 = 36.4
- P(s² > 9.1) = P(χ² > 36.4) = 0.05

**Worked Example**: n = 25, σ² = 6. Find P(3.462 < s² < 10.745)
- Lower: (24)(3.462)/6 = 13.848
- Upper: (24)(10.745)/6 = 42.98
- P = P(χ² > 13.848) − P(χ² > 42.98) = 0.95 − 0.01 = 0.94

---

## Chapter 3 (cont.): Sampling Distribution of the Proportion (p̂)

### Definition
- p̂ = X/n where X = number with specific characteristic, 0 ≤ p̂ ≤ 1
- P = population proportion, p̂ = sample proportion

### Sampling Distribution
- E(p̂) = P
- V(p̂) = P(1−P)/n
- Standard Error of proportion: √(P(1−P)/n)
- Z = (p̂ − P) / √(P(1−P)/n) ~ N(0, 1)

**Worked Example**: N = 100, 20 smokers → P = 0.2, n = 36. Find P(p̂ > 0.1)
- Z = (0.1 − 0.2) / √(0.2(0.8)/36) = −0.1/0.0667 = −1.49
- P(p̂ > 0.1) = 1 − φ(−1.49) = φ(1.49) = 0.9251

---

## Chapter 4: Confidence Interval Estimation

### General Concept
A confidence interval gives a range of plausible values for an unknown population parameter.
- CI = point estimate ± margin of error

### CI for the Mean (μ) — Three Cases

**Case 1: σ known → Z**
- x̄ − Z_{α/2} · σ/√n < μ < x̄ + Z_{α/2} · σ/√n

**Case 2: σ unknown, n ≥ 30 → Z**
- x̄ − Z_{α/2} · s/√n < μ < x̄ + Z_{α/2} · s/√n

**Case 3: σ unknown, n < 30 → T**
- x̄ − t_{α/2, n−1} · s/√n < μ < x̄ + t_{α/2, n−1} · s/√n

### Common Z Critical Values
| Confidence | α | α/2 | Z_{α/2} |
|-----------|-----|------|---------|
| 90% | 0.10 | 0.05 | 1.645 |
| 95% | 0.05 | 0.025 | 1.960 |
| 99% | 0.01 | 0.005 | 2.576 |

### CI for the Proportion (P)
- p̂ − Z_{α/2} · √(p̂(1−p̂)/n) < P < p̂ + Z_{α/2} · √(p̂(1−p̂)/n)
- Note: Uses p̂ (sample proportion) in the standard error formula

**Worked Example**: n = 100, p̂ = 0.24, 95% CI
- Z_{0.025} = 1.96
- SE = √(0.24 × 0.76 / 100) = 0.0427
- CI: 0.24 ± 1.96 × 0.0427 → (0.1563, 0.3237)

**Worked Example**: n = 500, X = 340, p̂ = 0.68, 95% CI
- SE = √(0.68 × 0.32 / 500) = 0.0209
- CI: 0.68 ± 1.96 × 0.0209 → (0.64, 0.72)

### CI for the Variance (σ²) — Uses Chi-Square
- (n−1)s² / χ²_{α/2, n−1} < σ² < (n−1)s² / χ²_{1−α/2, n−1}

**Worked Example**: n = 10, s² = 0.25622, 95% CI
- χ²_{0.025, 9} = 19.023, χ²_{0.975, 9} = 3.22
- CI: (9 × 0.25622)/19.023 < σ² < (9 × 0.25622)/3.22
- CI: 0.1354 < σ² < 0.799

### Interpretation
"We are (1−α)×100% confident that the true population parameter lies within the interval."

---

## Chapter 5: Hypothesis Testing

### Framework
1. State H₀ (null) and H₁ (alternative)
2. Choose significance level α
3. Calculate test statistic
4. Find critical value(s)
5. Decision: reject or fail to reject H₀

### Test Statistic for Mean
- Z = (x̄ − μ₀) / (σ/√n) when σ known or n ≥ 30
- T = (x̄ − μ₀) / (s/√n) when σ unknown and n < 30

### Types of Tests
- Two-tailed (H₁: μ ≠ μ₀): Reject if |test stat| > Z_{α/2}
- Right-tailed (H₁: μ > μ₀): Reject if test stat > Z_α
- Left-tailed (H₁: μ < μ₀): Reject if test stat < −Z_α

### Type I and Type II Errors
- Type I (α): Rejecting H₀ when it's true (false positive)
- Type II (β): Failing to reject H₀ when it's false (false negative)
- Power = 1 − β

### Important Rules
- "Fail to reject H₀" ≠ "Accept H₀"
- The burden of proof is on H₁
- P-value approach: Reject H₀ if p-value < α

---

## Quick Reference — Key Formulas

| Concept | Formula |
|---------|---------|
| Z-score | Z = (X − μ) / σ |
| Sample Mean SE | σ/√n or s/√n |
| Proportion SE | √(P(1−P)/n) |
| Variance χ² | χ² = (n−1)s²/σ² |
| CI for mean | x̄ ± crit × SE |
| CI for proportion | p̂ ± Z_{α/2} × √(p̂(1−p̂)/n) |
| CI for variance | (n−1)s²/χ²_{α/2} < σ² < (n−1)s²/χ²_{1−α/2} |

---

## Common Student Mistakes
1. Using Z when you should use T (σ unknown AND n < 30 → must use T)
2. Confusing α and α/2 (two-tailed splits α; one-tailed uses full α)
3. Saying "accept H₀" instead of "fail to reject H₀"
4. Forgetting φ(−a) = 1 − φ(a) when computing probabilities
5. Using σ vs s incorrectly — σ is population (usually unknown), s is sample
6. For proportion CI, using P in SE formula instead of p̂
7. For variance CI, the χ² values are swapped (larger χ² in denominator gives smaller bound)
8. Forgetting that standard error = σ/√n (not σ)
