# Numerical Methods — Complete Curriculum Knowledge Base

---

## 1. Root-Finding Methods

### 1.1 Bisection Method (Bracketing)
- **Idea**: Repeatedly halve a bracketing interval [a, b] where f(a)·f(b) < 0.
- **Algorithm**:
  1. Check f(a)·f(b) < 0 (sign change exists)
  2. Compute c = (a+b)/2
  3. If f(a)·f(c) < 0 → set b = c, else set a = c
  4. Repeat until |b−a| < ε or |f(c)| ≈ 0
- **Convergence**: Linear. Guaranteed if f is continuous and sign changes on [a, b].
- **Error bound**: After n iterations, error ≤ (b−a)/2^n.
- **Pros**: Always converges, simple.
- **Cons**: Slow (linear convergence).

**Worked Example**: f(x) = x³ − x − 2 on [1, 2], ε = 0.001
- f(1) = −2, f(2) = 4 → signs differ ✓
- Iter 1: c = 1.5, f(1.5) = −0.125 → [1.5, 2]
- Iter 2: c = 1.75, f(1.75) = 1.609 → [1.5, 1.75]
- Iter 3: c = 1.625, f(1.625) = 0.666 → [1.5, 1.625]
- Continue until |b−a| < 0.001

### 1.2 False Position (Regula Falsi) (Bracketing)
- **Idea**: Like bisection but uses the x-intercept of the secant line instead of midpoint.
- **Formula**: c = (a·f(b) − b·f(a)) / (f(b) − f(a))
- **Convergence**: Usually faster than bisection. Still bracketing (guaranteed).
- **Stagnation**: One endpoint may stay fixed for many iterations.

### 1.3 Newton-Raphson Method (Open)
- **Formula**: x_{n+1} = x_n − f(x_n) / f'(x_n)
- **Requires**: The derivative f'(x). f'(x) must not be zero.
- **Convergence**: Quadratic — error roughly squares each iteration (very fast near root).
- **Failure**: Diverges if initial guess is poor, oscillates if f'(x) ≈ 0.
- **Geometric meaning**: Draw tangent line at current point, find where it crosses x-axis.

**Worked Example**: f(x) = x² − 2, f'(x) = 2x, x₀ = 1 (finding √2)
- x₁ = 1 − (1−2)/(2·1) = 1.5
- x₂ = 1.5 − (2.25−2)/(3) = 1.4167
- x₃ = 1.4167 − (2.0069−2)/(2.8334) = 1.4142 ← 4 decimal places in 3 steps!

### 1.4 Secant Method (Open)
- **Formula**: x_{n+1} = x_n − f(x_n)·(x_n − x_{n-1}) / (f(x_n) − f(x_{n-1}))
- **Convergence**: Superlinear (order ≈ 1.618, the golden ratio).
- **Advantage**: No derivative needed — approximates f'(x) using finite differences.
- **Needs**: Two initial guesses x₀ and x₁.

### Comparison Table
| Method | Type | Convergence | Derivative? | Guaranteed? |
|--------|------|------------|-------------|-------------|
| Bisection | Bracketing | Linear (slow) | No | Yes |
| False Position | Bracketing | Linear+ | No | Yes |
| Newton-Raphson | Open | Quadratic (fast) | Yes | No |
| Secant | Open | Superlinear | No | No |

---

## 2. Linear Systems — Direct Methods

### 2.1 Thomas Algorithm (Tridiagonal Systems)
- Solves Ax = d where A is tridiagonal: lower diag (a), main diag (b), upper diag (c).
- **Forward sweep** (eliminate lower diagonal):
  - y[0] = b[0], z[0] = d[0]/y[0]
  - For i = 1 to n−1:
    - y[i] = b[i] − (a[i]·c[i−1])/y[i−1]
    - z[i] = (d[i] − a[i]·z[i−1])/y[i]
- **Back substitution**:
  - x[n−1] = z[n−1]
  - For i = n−2 down to 0: x[i] = z[i] − (c[i]·x[i+1])/y[i]
- **Complexity**: O(n) — much faster than Gaussian elimination O(n³).
- **Use case**: Tridiagonal systems from heat equations, splines, etc.

### 2.2 Doolittle's LU Decomposition
- Decomposes A = LU where:
  - L = lower triangular with **1s on diagonal**
  - U = upper triangular
- **Algorithm**:
  1. For row i, column k ≥ i: U[i][k] = A[i][k] − Σ_{j<i} L[i][j]·U[j][k]
  2. For row k > i: L[k][i] = (A[k][i] − Σ_{j<i} L[k][j]·U[j][i]) / U[i][i]
- **Solving**: First solve LY = B (forward substitution), then UX = Y (back substitution).
- **Key**: L has 1s on diagonal, U has the "heavy" values.

### 2.3 Crout's LU Decomposition
- Decomposes A = LU where:
  - L = lower triangular (general values)
  - U = upper triangular with **1s on diagonal**
- Same idea as Doolittle but roles of L and U are swapped.
- **Key difference**: In Crout, L has the "heavy" values; in Doolittle, U does.

**When to use LU**: When solving Ax = b for multiple different b vectors — decompose once, solve many times.

---

## 3. Linear Systems — Iterative Methods

### 3.1 Jacobi Iteration
- **Formula**: x_i^{(k+1)} = (1/a_{ii}) · (b_i − Σ_{j≠i} a_{ij}·x_j^{(k)})
- Uses ALL values from the **previous** iteration.
- **Initial guess**: Usually x^{(0)} = [0, 0, ..., 0].
- Can be parallelized since all updates use old values.

**Worked Example**: 5x₁ − 2x₂ = 1, −x₁ + 4x₂ = 3, start from [0, 0]
- Iter 1: x₁ = (1 + 2·0)/5 = 0.2, x₂ = (3 + 0)/4 = 0.75
- Iter 2: x₁ = (1 + 2·0.75)/5 = 0.5, x₂ = (3 + 0.2)/4 = 0.8
- Continue until convergence

### 3.2 Gauss-Seidel Iteration
- **Formula**: x_i^{(k+1)} = (1/a_{ii}) · (b_i − Σ_{j<i} a_{ij}·x_j^{(k+1)} − Σ_{j>i} a_{ij}·x_j^{(k)})
- Uses **updated values immediately** as they become available.
- Generally converges faster than Jacobi (roughly 2× fewer iterations).

**Key difference**: Jacobi uses all old values; Gauss-Seidel uses new values as soon as computed.

### Diagonal Dominance (Convergence Condition)
A matrix is **strictly diagonally dominant** if for every row i:
|a_{ii}| > Σ_{j≠i} |a_{ij}|

If A is strictly diagonally dominant → both Jacobi and Gauss-Seidel **guaranteed to converge**.

**Example check**: [[5, −2, 1], [1, 8, −3], [2, 1, 6]]
- Row 1: |5| > |−2|+|1| → 5 > 3 ✓
- Row 2: |8| > |1|+|−3| → 8 > 4 ✓
- Row 3: |6| > |2|+|1| → 6 > 3 ✓ → Diagonally dominant!

---

## 4. Interpolation

### When to Use Which Method
| Situation | Best Method |
|-----------|-------------|
| Equal spacing, near start of table | Newton Forward |
| Equal spacing, near end of table | Newton Backward |
| Equal spacing, near middle of table | Stirling |
| Unequal spacing (any point) | Lagrange |

### 4.1 Newton's Forward Interpolation
- **When**: Equally spaced data, interpolating near the **beginning**.
- **Formula**: f(x) ≈ y₀ + p·Δy₀ + p(p−1)/(2!)·Δ²y₀ + p(p−1)(p−2)/(3!)·Δ³y₀ + ...
- Where: p = (x − x₀)/h, h = uniform spacing
- **Forward differences**: Δyᵢ = y_{i+1} − yᵢ, Δ²yᵢ = Δy_{i+1} − Δyᵢ, etc.

**Building the difference table**:
| x | y | Δy | Δ²y | Δ³y |
|---|---|-----|------|------|
| x₀ | y₀ | y₁−y₀ | Δy₁−Δy₀ | Δ²y₁−Δ²y₀ |
| x₁ | y₁ | y₂−y₁ | Δy₂−Δy₁ | |
| x₂ | y₂ | y₃−y₂ | | |
| x₃ | y₃ | | | |

### 4.2 Newton's Backward Interpolation
- **When**: Equally spaced data, interpolating near the **end**.
- **Formula**: f(x) ≈ yₙ + v·∇yₙ + v(v+1)/(2!)·∇²yₙ + v(v+1)(v+2)/(3!)·∇³yₙ + ...
- Where: v = (x − xₙ)/h
- **Backward differences**: ∇yᵢ = yᵢ − y_{i−1}

### 4.3 Stirling's Interpolation (Central)
- **When**: Equally spaced data, interpolating near the **middle**.
- Uses averages of forward differences around the central point.
- **Formula**: f(x) ≈ y₀ + p·mean(Δy_{-1}, Δy₀) + p²/(2!)·Δ²y_{-1} + p(p²−1)/(3!)·mean(Δ³y_{-2}, Δ³y_{-1}) + ...
- Where: p = (x − x₀)/h, x₀ = central point
- **Best accuracy**: When |p| < 0.5

### 4.4 Lagrange Interpolation
- **When**: **Unequally spaced** data (works for any spacing).
- **Formula**: f(x) = Σᵢ yᵢ · Lᵢ(x)
- Where: Lᵢ(x) = Πⱼ≠ᵢ (x − xⱼ) / (xᵢ − xⱼ)
- Each Lᵢ(x) = 1 at xᵢ and 0 at all other points.
- **No difference table needed**.

---

## 5. Numerical Differentiation

### 5.1 Forward Difference Derivatives (at x₀ — start of table)
- f'(x₀) ≈ (1/h)[Δy₀ − Δ²y₀/2 + Δ³y₀/3 − Δ⁴y₀/4 + ...]
- f''(x₀) ≈ (1/h²)[Δ²y₀ − Δ³y₀ + (11/12)·Δ⁴y₀ − ...]

### 5.2 Backward Difference Derivatives (at xₙ — end of table)
- f'(xₙ) ≈ (1/h)[∇yₙ + ∇²yₙ/2 + ∇³yₙ/3 + ...]
- f''(xₙ) ≈ (1/h²)[∇²yₙ + ∇³yₙ + ...]

### 5.3 Stirling's Central Derivatives (at center x₀)
- f'(x₀) ≈ (1/h)[mean(δy_{-1/2}, δy_{1/2}) − (1/6)·mean(δ³y_{-3/2}, δ³y_{-1/2}) + ...]
- f''(x₀) ≈ (1/h²)[δ²y₀ − (1/12)·δ⁴y₀ + ...]

### 5.4 Lagrange Derivative
- Differentiate the Lagrange polynomial analytically.
- f'(x) = Σᵢ yᵢ · L'ᵢ(x)
- Works for any spacing. More complex but general.

---

## 6. Key Concepts & Glossary

- **Tolerance (ε)**: Acceptable error. Stop iterating when error < ε.
- **Convergence order**: Linear=1, Quadratic=2, Superlinear≈1.618.
- **Bracketing method**: Maintains interval containing root (Bisection, False Position). Guaranteed.
- **Open method**: No bracket guarantee (Newton, Secant). Faster but can diverge.
- **Forward difference**: Δfᵢ = f_{i+1} − fᵢ
- **Backward difference**: ∇fᵢ = fᵢ − f_{i−1}
- **Central difference**: δfᵢ = f_{i+1/2} − f_{i−1/2}
- **Diagonal dominance**: |a_{ii}| > Σ_{j≠i} |a_{ij}| for all rows → iterative methods converge.
- **LU Decomposition**: Factor A = LU once, then solve for any right-hand side efficiently.
- **Condition number**: High = ill-conditioned = numerically unstable.
