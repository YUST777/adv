import React, { useState } from 'react';
import { evaluate, derivative } from 'mathjs';
import { playClick, playError } from './sounds';

type Category = 'root' | 'linear_direct' | 'linear_iterative' | 'interpolation' | 'differentiation';
type MethodType = 
  'bisection' | 'falsePosition' | 'newtonRaphson' | 'secant' | 
  'thomas' | 'doolittle' | 'crout' | 
  'jacobi' | 'gaussSeidel' | 
  'newtonForward' | 'newtonBackward' | 'stirling' | 'lagrange' |
  'derivTabForward' | 'derivTabBackward' | 'derivTabStirling' | 'derivLagrange';

type Step = { title: string; detail: string; formula?: string; result?: string; badge?: string };

export default function NumericalCalc() {
  const [method, setMethod] = useState<MethodType>('bisection');
  const [calculationSteps, setCalculationSteps] = useState<Step[]>([]);
  
  // States for Root
  const [fx, setFx] = useState('x^2 - 4');
  const [valA, setValA] = useState('1');
  const [valB, setValB] = useState('3');
  const [tolerance, setTolerance] = useState('0.001');

  // States for Linear
  const [matrixSize, setMatrixSize] = useState(3);
  const [matrixGrid, setMatrixGrid] = useState<string[][]>([
    ['5', '-2', '3', '-1'],
    ['-3', '9', '1', '2'],
    ['2', '-1', '-7', '3']
  ]);
  const [thomasLower, setThomasLower] = useState('0, 2, 3');
  const [thomasMain, setThomasMain] = useState('2, 3, 5');
  const [thomasUpper, setThomasUpper] = useState('3, 1, 0');
  const [thomasRHS, setThomasRHS] = useState('5, 5, 5');

  // States for Interpolation
  const [pointsGrid, setPointsGrid] = useState<string[][]>([
    ['1.0', '0.76519'],
    ['1.3', '0.62008'],
    ['1.6', '0.45540'],
    ['1.9', '0.28181'],
    ['2.2', '0.11036'],
  ]);
  const [interpX, setInterpX] = useState('1.5');
  const [resultText, setResultText] = useState<string | null>(null);

  // Derive pointsText from grid for the calculate function
  const pointsText = pointsGrid.map(row => row.join(', ')).join('\n');

  const updatePointCell = (i: number, j: number, val: string) => {
    const newGrid = [...pointsGrid];
    newGrid[i] = [...newGrid[i]];
    newGrid[i][j] = val;
    setPointsGrid(newGrid);
  };

  const addPointRow = () => {
    playClick();
    const last = pointsGrid[pointsGrid.length - 1];
    const lastX = parseFloat(last?.[0] || '0');
    const h = pointsGrid.length >= 2 ? parseFloat(pointsGrid[1][0]) - parseFloat(pointsGrid[0][0]) : 0.3;
    setPointsGrid([...pointsGrid, [(lastX + h).toFixed(1), '0']]);
  };

  const removePointRow = (i: number) => {
    playClick();
    if (pointsGrid.length <= 2) return;
    setPointsGrid(pointsGrid.filter((_, idx) => idx !== i));
  };

  const updateMatrixSize = (newSize: number) => {
    playClick();
    setMatrixSize(newSize);
    setMatrixGrid(prev => {
      const newGrid = Array(newSize).fill(0).map(() => Array(newSize + 1).fill('0'));
      for(let i=0; i<Math.min(prev.length, newSize); i++) {
        for(let j=0; j<Math.min(prev[i].length - 1, newSize); j++) {
           newGrid[i][j] = prev[i][j];
        }
        newGrid[i][newSize] = prev[i][prev[i].length - 1]; // Persist RHS
      }
      return newGrid;
    });
  };

  const updateMatrixCell = (i: number, j: number, val: string) => {
    const newGrid = [...matrixGrid];
    newGrid[i] = [...newGrid[i]];
    newGrid[i][j] = val;
    setMatrixGrid(newGrid);
  };

  /* Helper: Check diagonal dominance */
  const checkDiagonalDominance = (A: number[][]) => {
    const n = A.length;
    for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let j = 0; j < n; j++) if (i !== j) sum += Math.abs(A[i][j]);
        if (Math.abs(A[i][i]) <= sum) return false;
    }
    return true;
  };

  /* Helper: Check if data points are equally spaced */
  const checkEqualSpacing = (x: number[], tolerance = 0.001): { valid: boolean; h: number } => {
    if (x.length < 2) return { valid: false, h: 0 };
    const h = x[1] - x[0];
    if (Math.abs(h) < 1e-12) return { valid: false, h: 0 };
    for (let i = 2; i < x.length; i++) {
      if (Math.abs((x[i] - x[i-1]) - h) > tolerance * Math.abs(h)) return { valid: false, h };
    }
    return { valid: true, h };
  };

  /* Helper: Check for duplicate x values */
  const checkDuplicateX = (x: number[]): boolean => {
    for (let i = 0; i < x.length; i++) {
      for (let j = i + 1; j < x.length; j++) {
        if (Math.abs(x[i] - x[j]) < 1e-12) return true;
      }
    }
    return false;
  };

  /* Helper: Check if x values are sorted ascending */
  const checkSorted = (x: number[]): boolean => {
    for (let i = 1; i < x.length; i++) {
      if (x[i] <= x[i-1]) return false;
    }
    return true;
  };

  const calculate = () => {
    playClick();
    setResultText(null);
    try {
      let log = "";
      let steps: Step[] = [];
      
      const parseMatrix = () => {
        const n = matrixSize;
        let A: number[][] = [];
        let B: number[] = [];
        for (let i = 0; i < n; i++) {
          const rowNums = matrixGrid[i].map(Number);
          if (rowNums.some(isNaN)) throw new Error(`Row ${i + 1} contains invalid numeric data.`);
          A.push(rowNums.slice(0, n));
          B.push(rowNums[n]);
        }
        return {A, B, n};
      };

      // --- ROOT FINDING ---
      if (['bisection', 'falsePosition', 'newtonRaphson', 'secant'].includes(method)) {
        const tol = parseFloat(tolerance);
        if (isNaN(tol) || tol <= 0) throw new Error("Invalid tolerance");

        if (method === 'bisection' || method === 'falsePosition') {
          let a = parseFloat(valA), b = parseFloat(valB);
          let fa = evaluate(fx, { x: a }), fb = evaluate(fx, { x: b });
          if (fa * fb > 0) throw new Error("f(a) and f(b) must have opposite signs. Root is not bracketed!");

          steps.push({ title: 'Initial Bounds', detail: `Range [${a}, ${b}]`, formula: `f(a)=${fa.toFixed(4)}, f(b)=${fb.toFixed(4)}`, badge: 'Bracketing' });

          let c = a, iter = 0;
          while (Math.abs(b - a) > tol && iter < 100) {
            c = method === 'bisection' ? (a + b) / 2 : (a * fb - b * fa) / (fb - fa);
            let fc = evaluate(fx, { x: c });
            log += `Iter ${iter + 1}: c = ${c.toFixed(6)}, f(c) = ${fc.toFixed(6)}\n`;
            
            if (iter < 5) {
                steps.push({ 
                    title: `Iteration ${iter + 1}`, 
                    detail: `Found midpoint/intercept c`, 
                    formula: method === 'bisection' ? 'c = (a + b) / 2' : 'c = (a*fb - b*fa)/(fb - fa)',
                    result: `c = ${c.toFixed(6)}, f(c) = ${fc.toFixed(6)}`
                });
            }

            if (Math.abs(fc) < 1e-10) break;
            if (fa * fc < 0) { b = c; fb = fc; } else { a = c; fa = fc; }
            iter++;
          }
          log += `\n>>> Root found: ${c.toFixed(6)} verified in ${iter} iterations.`;
          steps.push({ title: 'Final Result', detail: `Convergence achieved`, result: `Root ≈ ${c.toFixed(6)}`, badge: 'SUCCESS' });
        }
        else if (method === 'newtonRaphson') {
          let x0 = parseFloat(valA), iter = 0;
          const devExpr = derivative(fx, 'x');
          steps.push({ title: 'Initialization', detail: `Start at x0 = ${x0}`, formula: `f'(x) = ${devExpr.toString()}`, badge: 'Open Method' });
          
          while (iter < 100) {
            let f0 = evaluate(fx, { x: x0 });
            let fd0 = devExpr.evaluate({ x: x0 });
            if (Math.abs(fd0) < 1e-12) throw new Error("Derivative is zero. Newton-Raphson fails.");
            let x1 = x0 - (f0 / fd0);
            log += `Iter ${iter + 1}: x = ${x1.toFixed(6)}, f(x) = ${f0.toFixed(6)}\n`;
            
            if (iter < 5) {
                steps.push({ title: `Step ${iter + 1}`, detail: 'Newton Update', formula: 'x_new = x - f(x)/f\'(x)', result: `x = ${x1.toFixed(6)}` });
            }

            if (Math.abs(x1 - x0) < tol || Math.abs(f0) < tol) { x0 = x1; break; }
            x0 = x1; iter++;
          }
          log += `\n>>> Root found: ${x0.toFixed(6)} verified in ${iter} iterations.`;
          steps.push({ title: 'Final Result', detail: 'Target tolerance met', result: `Root ≈ ${x0.toFixed(6)}`, badge: 'SUCCESS' });
        }
        else if (method === 'secant') {
          let x0 = parseFloat(valA), x1 = parseFloat(valB), iter = 0;
          steps.push({ title: 'Initial Guesses', detail: `Points: ${x0}, ${x1}`, badge: 'Open Method' });
          
          while (iter < 100) {
            let f0 = evaluate(fx, { x: x0 }), f1 = evaluate(fx, { x: x1 });
            if (Math.abs(f1 - f0) < 1e-12) throw new Error("Difference in f(x) is zero. Secant fails.");
            let x2 = x1 - f1 * (x1 - x0) / (f1 - f0);
            log += `Iter ${iter + 1}: x2 = ${x2.toFixed(6)}, f(x2) = ${f1.toFixed(6)}\n`;
            
            if (iter < 5) {
                steps.push({ title: `Step ${iter + 1}`, detail: 'Secant Update', formula: 'x2 = x1 - f1(x1-x0)/(f1-f0)', result: `x = ${x2.toFixed(6)}` });
            }

            if (Math.abs(x2 - x1) < tol || Math.abs(evaluate(fx, {x: x2})) < tol) { x1 = x2; break; }
            x0 = x1; x1 = x2; iter++;
          }
          log += `\n>>> Root found: ${x1.toFixed(6)} verified in ${iter} iterations.`;
          steps.push({ title: 'Final Result', detail: 'Target tolerance met', result: `Root ≈ ${x1.toFixed(6)}`, badge: 'SUCCESS' });
        }
      }

      // --- LINEAR SYSTEMS (DIRECT) ---
      else if (method === 'thomas') {
        const a = thomasLower.split(',').map(Number);
        const b = thomasMain.split(',').map(Number);
        const c = thomasUpper.split(',').map(Number);
        const d = thomasRHS.split(',').map(Number);
        const n = b.length;
        if (a.length !== n || c.length !== n || d.length !== n) throw new Error("All vectors must have the same length 'n'");
        
        steps.push({ title: 'Thomas Algorithm', detail: 'Solving Tridiagonal System', badge: 'Direct' });

        let y = new Array(n).fill(0), z = new Array(n).fill(0), x = new Array(n).fill(0);
        if (Math.abs(b[0]) < 1e-12) throw new Error("Thomas Algorithm failed: main diagonal element b[0] is zero. Cannot proceed.");
        y[0] = b[0]; z[0] = d[0] / y[0];
        log += `Phase 1 (Forward Sweep):\n`;
        for (let i = 1; i < n; i++) {
          if (Math.abs(y[i - 1]) < 1e-12) throw new Error(`Thomas Algorithm failed: zero pivot at y[${i-1}]. The system may be singular.`);
          y[i] = b[i] - (a[i] * c[i - 1]) / y[i - 1];
          if (Math.abs(y[i]) < 1e-12) throw new Error(`Thomas Algorithm failed: zero pivot at y[${i}]. The system may be singular.`);
          z[i] = (d[i] - a[i] * z[i - 1]) / y[i];
          log += `  y[${i}]=${y[i].toFixed(4)}, z[${i}]=${z[i].toFixed(4)}\n`;
        }
        steps.push({ title: 'Forward Sweep', detail: 'Decomposing matrix into intermediate vectors y and z', result: `z[last] = ${z[n-1].toFixed(4)}` });

        x[n - 1] = z[n - 1];
        log += `\nPhase 2 (Back Substitution):\n`;
        for (let i = n - 2; i >= 0; i--) {
          x[i] = z[i] - (c[i] * x[i + 1]) / y[i];
          log += `  x[${i}]=${x[i].toFixed(4)}\n`;
        }
        steps.push({ title: 'Back Substitution', detail: 'Calculating solution vector x from the end', result: `x[0] = ${x[0].toFixed(4)}` });
        log += `\n>>> Solution vector x: [ ${x.map(v => v.toFixed(4)).join(", ")} ]`;
        steps.push({ title: 'Final Solution', detail: 'Tridiagonal system solved', result: `x = [${x.map(v => v.toFixed(2)).join(', ')}]`, badge: 'SUCCESS' });
      }
      else if (method === 'doolittle' || method === 'crout') {
        const {A, B, n} = parseMatrix();
        let L = Array.from({length: n}, () => new Array(n).fill(0));
        let U = Array.from({length: n}, () => new Array(n).fill(0));
        
        steps.push({ title: `${method.toUpperCase()} Decomposition`, detail: 'Factoring A into L and U matrices', badge: 'Direct' });

        if (method === 'doolittle') {
          for(let i=0; i<n; i++) {
            for(let k=i; k<n; k++) {
              let sum = 0; for(let j=0; j<i; j++) sum += L[i][j]*U[j][k];
              U[i][k] = A[i][k] - sum;
            }
            if (Math.abs(U[i][i]) < 1e-12) throw new Error(`Doolittle failed: zero pivot at U[${i}][${i}]. The matrix may be singular or need row swapping (pivoting).`);
            for(let k=i; k<n; k++) {
              if (i===k) L[i][i] = 1;
              else {
                let sum = 0; for(let j=0; j<i; j++) sum += L[k][j]*U[j][i];
                L[k][i] = (A[k][i] - sum) / U[i][i];
              }
            }
          }
        } else { // crout
          for(let j=0; j<n; j++) {
            for(let i=j; i<n; i++) {
              let sum = 0; for(let k=0; k<j; k++) sum += L[i][k]*U[k][j];
              L[i][j] = A[i][j] - sum;
            }
            if (Math.abs(L[j][j]) < 1e-12) throw new Error(`Crout failed: zero pivot at L[${j}][${j}]. The matrix may be singular or need row swapping (pivoting).`);
            for(let i=j; i<n; i++) {
              if (i===j) U[i][i] = 1;
              else {
                let sum = 0; for(let k=0; k<j; k++) sum += L[j][k]*U[k][i];
                U[j][i] = (A[j][i] - sum) / L[j][j];
              }
            }
          }
        }
        
        steps.push({ title: 'LU Matrix Result', detail: 'L and U matrices computed', result: 'Check Raw Terminal for matrices' });
        log += `${method.toUpperCase()} DECOMPOSITION:\nL Matrix:\n` + L.map(r => `  [${r.map(v=>v.toFixed(4)).join(', ')}]`).join('\n') + `\nU Matrix:\n` + U.map(r => `  [${r.map(v=>v.toFixed(4)).join(', ')}]`).join('\n') + '\n';
        
        // Solve LY = B
        let Y = new Array(n).fill(0);
        for(let i=0; i<n; i++) {
            let sum = 0; for(let j=0; j<i; j++) sum += L[i][j]*Y[j];
            Y[i] = (B[i] - sum)/L[i][i];
        }
        steps.push({ title: 'Forward Substitution', detail: 'Solving LY = B for Y', result: `Y = [${Y.map(v => v.toFixed(2)).join(', ')}]` });

        // Solve UX = Y
        let X = new Array(n).fill(0);
        for(let i=n-1; i>=0; i--) {
            let sum = 0; for(let j=i+1; j<n; j++) sum += U[i][j]*X[j];
            X[i] = (Y[i] - sum)/U[i][i];
        }
        steps.push({ title: 'Backward Substitution', detail: 'Solving UX = Y for X', result: `X = [${X.map(v => v.toFixed(2)).join(', ')}]` });
        log += `\n>>> Solution vector x: [ ${X.map(v => v.toFixed(6)).join(", ")} ]`;
        steps.push({ title: 'Final Solution', detail: 'System solved successfully', result: `x = [${X.map(v => v.toFixed(2)).join(', ')}]`, badge: 'SUCCESS' });
      }

      // --- LINEAR SYSTEMS (ITERATIVE) ---
      else if (method === 'jacobi' || method === 'gaussSeidel') {
        const tol = parseFloat(tolerance);
        const {A, B, n} = parseMatrix();
        
        steps.push({ title: 'Iterative Solver', detail: `Method: ${method === 'jacobi' ? 'Jacobi' : 'Gauss-Seidel'}`, badge: 'Iterative' });

        // Check for zero diagonal elements first
        for (let i = 0; i < n; i++) {
          if (Math.abs(A[i][i]) < 1e-12) throw new Error(`Cannot solve: diagonal element A[${i+1}][${i+1}] is zero. Iterative methods require non-zero diagonal elements. Try rearranging your matrix rows.`);
        }

        if (!checkDiagonalDominance(A)) {
          log += "[!] WARNING: The matrix is NOT Strictly Diagonally Dominant. Convergence is NOT guaranteed!\n";
          log += "   For each row i, we need |a[i][i]| > sum of |a[i][j]| for j≠i.\n";
          log += "   Consider rearranging rows to achieve diagonal dominance.\n\n";
          steps.push({ title: 'Convergence Check', detail: 'Matrix is NOT diagonally dominant — convergence not guaranteed! Rearrange rows so largest values are on diagonal.', badge: 'WARNING' });
        } else {
           log += "[OK] Verification Passed: The matrix is Strictly Diagonally Dominant. Convergence is guaranteed.\n\n";
           steps.push({ title: 'Convergence Check', detail: 'Matrix is diagonally dominant ✓', badge: 'STABLE' });
        }

        let x = new Array(n).fill(0);
        let xNew = new Array(n).fill(0);
        let iter = 0;
        
        while (iter < 100) {
          let maxDiff = 0;
          for (let i = 0; i < n; i++) {
            let sum = 0;
            for (let j = 0; j < n; j++) {
              if (i !== j) {
                 if (method === 'gaussSeidel' && j < i) sum += A[i][j] * xNew[j]; 
                 else sum += A[i][j] * x[j]; 
              }
            }
            xNew[i] = (B[i] - sum) / A[i][i];
            maxDiff = Math.max(maxDiff, Math.abs(xNew[i] - x[i]));
          }
          log += `Iter ${iter + 1}: x = [${xNew.map(v => v.toFixed(5)).join(', ')}]\n`;
          
          if (iter < 5 || maxDiff < tol) {
              steps.push({ title: `Iteration ${iter + 1}`, detail: 'Approximating solution', result: `x[0] = ${xNew[0].toFixed(4)}` });
          }

          x = [...xNew];
          if (maxDiff < tol) break;
          iter++;
        }
        log += `\n>>> Converged in ${iter} iterations to: [ ${x.map(v => v.toFixed(5)).join(", ")} ]`;
        steps.push({ title: 'Final Result', detail: `Converged in ${iter} iterations`, result: `x = [${x.map(v => v.toFixed(2)).join(', ')}]`, badge: 'SUCCESS' });
      }

      // --- INTERPOLATION ---
      else if (method === 'newtonForward') {
        const pts = pointsText.trim().split('\n').map(r => r.split(',').map(Number));
        const tx = parseFloat(interpX);
        const n = pts.length;
        if (n < 2) throw new Error("Need at least 2 data points.");
        let x = pts.map(p => p[0]);
        let y = Array.from({length: n}, () => new Array(n).fill(0));
        for(let i=0; i<n; i++) y[i][0] = pts[i][1];
        
        if (!checkSorted(x)) throw new Error("Data points must be sorted in ascending order of x values for Newton Forward interpolation.");
        const spacing = checkEqualSpacing(x);
        if (!spacing.valid) throw new Error("Data points must be equally spaced for Newton Forward interpolation. Use Lagrange for unequal spacing.");

        steps.push({ title: "Newton's Forward", detail: `Interpolating at x = ${tx}`, badge: 'Interpolation' });

        let h = spacing.h;

        // Build forward difference table
        for (let j = 1; j < n; j++) {
            for (let i = 0; i < n - j; i++) {
                y[i][j] = y[i + 1][j - 1] - y[i][j - 1];
            }
        }
        
        steps.push({ title: 'Difference Table', detail: 'Built forward difference table', badge: 'Table' });
        log += "Forward Difference Table (y, Δy, Δ²y, ...):\n";
        for (let i = 0; i < n; i++) {
            let row = `x=${x[i].toFixed(2)} | `;
            for (let j = 0; j < n - i; j++) {
                row += y[i][j].toFixed(4) + "\t";
            }
            log += row + "\n";
        }

        let p = (tx - x[0]) / h;
        log += `\nh = ${h.toFixed(4)}, p = (x - x0)/h = ${p.toFixed(4)}\n`;
        steps.push({ title: 'Calculate p', detail: `p = (tx - x0)/h`, result: `p = ${p.toFixed(4)}` });

        let sum = y[0][0];
        let pTerm = 1;
        for (let i = 1; i < n; i++) {
            pTerm = pTerm * (p - (i - 1));
            let fact = 1; for(let k=1; k<=i; k++) fact *= k;
            let term = (pTerm * y[0][i]) / fact;
            log += `+ Term ${i}: (p...)*Δ^${i}y0 / ${i}! = ${term.toFixed(6)}\n`;
            if (i < 4) steps.push({ title: `Polynomial Term ${i}`, detail: `Order ${i} contribution`, result: `+ ${term.toFixed(6)}` });
            sum += term;
        }
        log += `\n>>> Interpolated value f(${tx}) ≈ ${sum.toFixed(6)}`;
        steps.push({ title: 'Result', detail: 'Final interpolated value', result: `f(${tx}) ≈ ${sum.toFixed(6)}`, badge: 'SUCCESS' });
      }
      else if (method === 'lagrange') {
        const pts = pointsText.trim().split('\n').map(r => r.split(',').map(Number));
        const tx = parseFloat(interpX);
        const n = pts.length;
        if (n < 2) throw new Error("Need at least 2 data points.");
        let x = pts.map(p => p[0]);
        let y = pts.map(p => p[1]);
        
        if (checkDuplicateX(x)) throw new Error("Lagrange interpolation requires all x-values to be distinct. Found duplicate x-values in your data.");

        steps.push({ title: 'Lagrange Interpolation', detail: `Interpolating at x = ${tx}`, badge: 'Unequal Spacing' });

        let result = 0;
        log += `Applying Lagrange Formulation for x = ${tx}\n\n`;
        
        for (let i = 0; i < n; i++) {
            let term = y[i];
            let l_i_str = `${y[i]} * `;
            let numStr = [], denStr = [];
            for (let j = 0; j < n; j++) {
                if (i !== j) {
                    term = term * (tx - x[j]) / (x[i] - x[j]);
                    numStr.push(`(${tx} - ${x[j]})`);
                    denStr.push(`(${x[i]} - ${x[j]})`);
                }
            }
            log += `L_${i}: ` + l_i_str + `[ ${numStr.join('')} / ${denStr.join('')} ] = ${term.toFixed(6)}\n`;
            if (i < 4) steps.push({ title: `Basis L_${i}`, detail: `L_${i}(x) * y_${i}`, result: `Term = ${term.toFixed(6)}` });
            result += term;
        }
        log += `\n>>> Interpolated value f(${tx}) ≈ ${result.toFixed(6)}`;
        steps.push({ title: 'Result', detail: 'Sum of all basis terms', result: `f(${tx}) ≈ ${result.toFixed(6)}`, badge: 'SUCCESS' });
      }
      else if (method === 'newtonBackward') {
        const pts = pointsText.trim().split('\n').map(r => r.split(',').map(Number));
        const tx = parseFloat(interpX);
        const n = pts.length;
        if (n < 2) throw new Error("Need at least 2 data points.");
        let x = pts.map(p => p[0]);
        let y = Array.from({length: n}, () => new Array(n).fill(0));
        for(let i=0; i<n; i++) y[i][0] = pts[i][1];
        
        if (!checkSorted(x)) throw new Error("Data points must be sorted in ascending order of x values for Newton Backward interpolation.");
        const spacing = checkEqualSpacing(x);
        if (!spacing.valid) throw new Error("Data points must be equally spaced for Newton Backward interpolation. Use Lagrange for unequal spacing.");

        steps.push({ title: "Newton's Backward", detail: `Interpolating at x = ${tx}`, badge: 'Interpolation' });

        let h = spacing.h;

        // Build backward difference table
        for (let j = 1; j < n; j++) {
            for (let i = n - 1; i >= j; i--) {
                y[i][j] = y[i][j - 1] - y[i - 1][j - 1];
            }
        }
        steps.push({ title: 'Difference Table', detail: 'Built backward difference table', badge: 'Table' });
        
        log += "Backward Difference Table (y, ∇y, ∇²y, ...):\n";
        for (let i = 0; i < n; i++) {
            let row = `x=${x[i].toFixed(2)} | `;
            for (let j = 0; j <= i; j++) {
                row += y[i][j].toFixed(4) + "\t";
            }
            log += row + "\n";
        }

        let v = (tx - x[n - 1]) / h;
        log += `\nh = ${h.toFixed(4)}, v = (x - xn)/h = ${v.toFixed(4)}\n`;
        steps.push({ title: 'Calculate v', detail: `v = (tx - xn)/h`, result: `v = ${v.toFixed(4)}` });

        let sum = y[n - 1][0];
        let vTerm = 1;
        for (let i = 1; i < n; i++) {
            vTerm = vTerm * (v + (i - 1));
            let fact = 1; for(let k=1; k<=i; k++) fact *= k;
            let term = (vTerm * y[n - 1][i]) / fact;
            log += `+ Term ${i}: (v...)*∇^${i}yn / ${i}! = ${term.toFixed(6)}\n`;
            if (i < 4) steps.push({ title: `Polynomial Term ${i}`, detail: `Order ${i} contribution`, result: `+ ${term.toFixed(6)}` });
            sum += term;
        }
        log += `\n>>> Interpolated value f(${tx}) ≈ ${sum.toFixed(6)}`;
        steps.push({ title: 'Result', detail: 'Final interpolated value', result: `f(${tx}) ≈ ${sum.toFixed(6)}`, badge: 'SUCCESS' });
      }
      else if (method === 'stirling') {
        const pts = pointsText.trim().split('\n').map(r => r.split(',').map(Number));
        const tx = parseFloat(interpX);
        const n = pts.length;
        if (n < 3) throw new Error("Stirling's formula needs at least 3 data points.");
        let x = pts.map(p => p[0]);

        if (!checkSorted(x)) throw new Error("Data points must be sorted in ascending order for Stirling interpolation.");
        const spacing = checkEqualSpacing(x);
        if (!spacing.valid) throw new Error("Data points must be equally spaced for Stirling interpolation. Use Lagrange for unequal spacing.");
        if (n % 2 === 0) throw new Error("Stirling's formula requires an odd number of data points (to have a center point).");

        steps.push({ title: "Stirling's Formula", detail: `Central interpolation at x = ${tx}`, badge: 'Central' });
        
        let y = Array.from({length: n}, () => new Array(n).fill(0));
        for(let i=0; i<n; i++) y[i][0] = pts[i][1];
        
        const h = spacing.h;
        const mid = Math.floor(n / 2);
        const p = (tx - x[mid]) / h;

        // Build difference table
        for (let j = 1; j < n; j++) {
            for (let i = 0; i < n - j; i++) {
                y[i][j] = y[i + 1][j - 1] - y[i][j - 1];
            }
        }
        steps.push({ title: 'Difference Table', detail: 'Built central difference table', badge: 'Table' });

        log += `Stirling's Interpolation (Center x0 = ${x[mid]}, p = ${p.toFixed(4)})\n`;
        steps.push({ title: 'Parameters', detail: `Center x0 = ${x[mid]}`, result: `p = ${p.toFixed(4)}` });
        let result = y[mid][0];
        
        if (n >= 3) {
            const avg1 = (y[mid-1][1] + y[mid][1]) / 2;
            result += p * avg1;
            log += `+ Term 1: p * avg(Δ) = ${ (p * avg1).toFixed(6) }\n`;
            steps.push({ title: 'Term 1', detail: 'p * mean of 1st differences', result: `+ ${(p * avg1).toFixed(6)}` });
        }
        if (n >= 3) {
            const t2 = (p * p * y[mid-1][2]) / 2;
            result += t2;
            log += `+ Term 2: p^2/2 * Δ^2 = ${ t2.toFixed(6) }\n`;
            steps.push({ title: 'Term 2', detail: 'p^2/2! * 2nd difference', result: `+ ${t2.toFixed(6)}` });
        }
        if (n >= 5) {
            const avg3 = (y[mid-2][3] + y[mid-1][3]) / 2;
            const t3 = (p * (p*p - 1) * avg3) / 6;
            result += t3;
            log += `+ Term 3: p(p^2-1)/6 * avg(Δ^3) = ${ t3.toFixed(6) }\n`;
            steps.push({ title: 'Term 3', detail: 'p(p^2-1)/3! * mean of 3rd diff', result: `+ ${t3.toFixed(6)}` });
        }
        
        log += `\n>>> Interpolated value f(${tx}) ≈ ${result.toFixed(6)}`;
        steps.push({ title: 'Result', detail: 'Stirling polynomial sum', result: `f(${tx}) ≈ ${result.toFixed(6)}`, badge: 'SUCCESS' });
      }
      else if (method === 'derivLagrange') {
        const pts = pointsText.trim().split('\n').map(r => r.split(',').map(Number));
        const tx = parseFloat(interpX);
        const n = pts.length;
        if (n < 2) throw new Error("Need at least 2 data points.");
        let x = pts.map(p => p[0]);
        let y = pts.map(p => p[1]);
        
        if (checkDuplicateX(x)) throw new Error("Lagrange derivative requires all x-values to be distinct. Found duplicate x-values.");

        steps.push({ title: 'Lagrange Derivative', detail: `Differentiating at x = ${tx}`, badge: 'Unequal' });

        log += `Lagrange Derivatives at x = ${tx}\n`;
        let d1 = 0;
        for (let i = 0; i < n; i++) {
            let liPrime = 0;
            for (let j = 0; j < n; j++) {
                if (i !== j) {
                    let product = 1;
                    for (let k = 0; k < n; k++) {
                        if (k !== i && k !== j) product *= (tx - x[k]);
                    }
                    let denom = 1;
                    for (let k = 0; k < n; k++) {
                        if (k !== i) denom *= (x[i] - x[k]);
                    }
                    liPrime += product / denom;
                }
            }
            d1 += liPrime * y[i];
        }
        log += `\n>>> f'(${tx}) ≈ ${d1.toFixed(6)}`;
        steps.push({ title: '1st Derivative', detail: 'Differentiated Lagrange basis sum', result: `f'(${tx}) ≈ ${d1.toFixed(6)}`, badge: 'SUCCESS' });
      }
      else if (['derivTabForward', 'derivTabBackward', 'derivTabStirling'].includes(method)) {
        const pts = pointsText.trim().split('\n').map(r => r.split(',').map(Number));
        const n = pts.length;
        if (n < 3) throw new Error("Need at least 3 data points for tabulated differentiation.");
        let x = pts.map(p => p[0]);
        let y = Array.from({length: n}, () => new Array(n).fill(0));
        for(let i=0; i<n; i++) y[i][0] = pts[i][1];

        if (!checkSorted(x)) throw new Error("Data points must be sorted in ascending order for tabulated differentiation.");
        const spacing = checkEqualSpacing(x);
        if (!spacing.valid) throw new Error("Data points must be equally spaced for tabulated differentiation. Use Lagrange derivative for unequal spacing.");
        const h = spacing.h;

        steps.push({ title: 'Tabulated Differentiation', detail: 'Finding derivatives at a table point', badge: 'Discrete' });

        for (let j = 1; j < n; j++) {
            for (let i = 0; i < n - j; i++) {
                y[i][j] = y[i + 1][j - 1] - y[i][j - 1];
            }
        }
        steps.push({ title: 'Difference Table', detail: 'Built differences for derivatives', badge: 'Table' });

        if (method === 'derivTabForward') {
          log += `Derivatives at x0 = ${x[0]} (Newton Forward Formulas)\n`;
          const d1 = (1/h) * (y[0][1] - 0.5*y[0][2] + (1/3)*y[0][3] - 0.25*y[0][4]);
          const d2 = (1/(h*h)) * (y[0][2] - y[0][3] + (11/12)*y[0][4]);
          log += `f'(x0) ≈ ${d1.toFixed(6)}\nf''(x0) ≈ ${d2.toFixed(6)}\n`;
          steps.push({ title: 'Forward Derivs', detail: `At x0 = ${x[0]}`, result: `f'=${d1.toFixed(4)}, f''=${d2.toFixed(4)}` });
        } 
        else if (method === 'derivTabBackward') {
          log += `Derivatives at xn = ${x[n-1]} (Newton Backward Formulas)\n`;
          const b1 = (1/h) * (y[n-2][1] + 0.5*y[n-3][2] + (1/3)*y[n-4][3]);
          const b2 = (1/(h*h)) * (y[n-3][2] + y[n-4][3]);
          log += `f'(xn) ≈ ${b1.toFixed(6)}\nf''(xn) ≈ ${b2.toFixed(6)}\n`;
          steps.push({ title: 'Backward Derivs', detail: `At xn = ${x[n-1]}`, result: `f'=${b1.toFixed(4)}, f''=${b2.toFixed(4)}` });
        }
        else {
          const mid = Math.floor(n/2);
          log += `Derivatives at x0 (center) = ${x[mid]} (Stirling Formulas)\n`;
          const d1 = (1/h) * ((y[mid-1][1] + y[mid][1])/2 - (1/6)*((y[mid-2][3] + y[mid-1][3])/2));
          const d2 = (1/(h*h)) * (y[mid-1][2] - (1/12)*y[mid-2][4]);
          log += `f'(x0) ≈ ${d1.toFixed(6)}\nf''(x0) ≈ ${d2.toFixed(6)}\n`;
          steps.push({ title: 'Central Derivs', detail: `At center = ${x[mid]}`, result: `f'=${d1.toFixed(4)}, f''=${d2.toFixed(4)}` });
        }
        steps.push({ title: 'Complete', detail: 'Tabulated derivatives computed', badge: 'SUCCESS' });
      }

      setResultText(log);
      setCalculationSteps(steps);
    } catch (e: any) {
      playError();
      setCalculationSteps([{ title: 'Error Occurred', detail: e.message, badge: 'FAILED' }]);
      setResultText(`[ERROR] Error: ${e.message}\nPlease check your inputs and try again.`);
    }
  };

  const getCategory = (m: MethodType): Category => {
    if (['bisection', 'falsePosition', 'newtonRaphson', 'secant'].includes(m)) return 'root';
    if (['thomas', 'doolittle', 'crout'].includes(m)) return 'linear_direct';
    if (['jacobi', 'gaussSeidel'].includes(m)) return 'linear_iterative';
    if (['newtonForward', 'newtonBackward', 'stirling', 'lagrange'].includes(m)) return 'interpolation';
    return 'differentiation';
  };
  const cCat = getCategory(method);

  return (
    <div className="flex-1 flex flex-col md:flex-row gap-4 h-full animate-fade-in overflow-hidden w-full">
      {/* Sidebar Inputs */}
      <div className="w-full md:w-64 lg:w-72 shrink-0 bg-grey-900 border border-grey-800 rounded-xl p-4 flex flex-col gap-4 h-full overflow-y-auto custom-scrollbar">
        <h2 className="text-base font-serif text-grey-50 font-bold border-b border-grey-800 pb-2 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
            Variables
        </h2>
        
        <div>
          <label className="block text-[11px] font-semibold text-grey-500 mb-1.5 uppercase tracking-wider">Method</label>
          <select 
            className="w-full bg-grey-950 border border-grey-800 rounded-lg px-3 py-2 text-sm text-grey-100 focus:border-grey-500 outline-none transition-colors"
            value={method}
            onChange={(e) => { playClick(); setMethod(e.target.value as MethodType); setResultText(null); }}
          >
            <optgroup label="Root-Finding">
                <option value="bisection">Bisection Method</option>
                <option value="falsePosition">False Position (Regula Falsi)</option>
                <option value="newtonRaphson">Newton-Raphson</option>
                <option value="secant">Secant Method</option>
            </optgroup>
            <optgroup label="Linear Systems (Direct)">
                <option value="thomas">Thomas Algorithm (Tridiagonal)</option>
                <option value="doolittle">Doolittle's Method (LU)</option>
                <option value="crout">Crout's Method (LU)</option>
            </optgroup>
            <optgroup label="Linear Systems (Iterative)">
                <option value="jacobi">Jacobi Iteration</option>
                <option value="gaussSeidel">Gauss-Seidel Iteration</option>
            </optgroup>
            <optgroup label="Interpolation">
                <option value="newtonForward">Newton's Forward Interpolation</option>
                <option value="newtonBackward">Newton's Backward Interpolation</option>
                <option value="stirling">Stirling's Interpolation (Center)</option>
                <option value="lagrange">Lagrange Interpolation</option>
            </optgroup>
            <optgroup label="Numerical Differentiation">
                <option value="derivTabForward">Tabulated Deriv at x0 (Forward)</option>
                <option value="derivTabBackward">Tabulated Deriv at xn (Backward)</option>
                <option value="derivTabStirling">Tabulated Deriv at x0 (Stirling)</option>
                <option value="derivLagrange">Lagrange Derivatives</option>
            </optgroup>
          </select>
        </div>

        <div className="h-[1px] bg-grey-800/80 my-1"></div>

        {cCat === 'root' && (
          <div className="space-y-3 animate-fade-in">
            <div>
                <label className="block text-[11px] font-semibold text-grey-500 mb-1.5 uppercase tracking-wider">Function f(x)</label>
                <input type="text" className="w-full bg-grey-950 border border-grey-800 rounded-lg px-3 py-2 text-sm text-grey-100 font-mono outline-none focus:border-grey-500" value={fx} onChange={e => setFx(e.target.value)} />
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-grey-500 mb-1.5 uppercase tracking-wider">{method === 'newtonRaphson' ? "Guess x0" : "x0 (a)"}</label>
                <input type="number" step="any" className="w-full bg-grey-950 border border-grey-800 rounded-lg px-3 py-2 text-sm text-grey-100 font-mono outline-none focus:border-grey-500" value={valA} onChange={e => setValA(e.target.value)} />
              </div>
              {method !== 'newtonRaphson' && (
                <div className="flex-1">
                  <label className="block text-[11px] font-semibold text-grey-500 mb-1.5 uppercase tracking-wider">x1 (b)</label>
                  <input type="number" step="any" className="w-full bg-grey-950 border border-grey-800 rounded-lg px-3 py-2 text-sm text-grey-100 font-mono outline-none focus:border-grey-500" value={valB} onChange={e => setValB(e.target.value)} />
                </div>
              )}
            </div>
            <div>
                <label className="block text-[11px] font-semibold text-grey-500 mb-1.5 uppercase tracking-wider">Tolerance (ε)</label>
                <input type="number" step="any" className="w-full bg-grey-950 border border-grey-800 rounded-lg px-3 py-2 text-sm text-grey-100 font-mono outline-none focus:border-grey-500" value={tolerance} onChange={e => setTolerance(e.target.value)} />
            </div>
          </div>
        )}

        {method === 'thomas' && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-[10px] text-grey-500 font-medium mb-1">Vectors (len n). a[0], c[n-1] must be 0.</p>
            <div><label className="block text-[10px] font-semibold text-grey-500 mb-1 uppercase tracking-wider">Lower Diag (a)</label><input className="w-full bg-grey-950 border border-grey-800 rounded-lg px-3 py-2 text-xs text-grey-100 font-mono outline-none" value={thomasLower} onChange={e=>setThomasLower(e.target.value)} /></div>
            <div><label className="block text-[10px] font-semibold text-grey-500 mb-1 uppercase tracking-wider">Main Diag (b)</label><input className="w-full bg-grey-950 border border-grey-800 rounded-lg px-3 py-2 text-xs text-grey-100 font-mono outline-none" value={thomasMain} onChange={e=>setThomasMain(e.target.value)} /></div>
            <div><label className="block text-[10px] font-semibold text-grey-500 mb-1 uppercase tracking-wider">Upper Diag (c)</label><input className="w-full bg-grey-950 border border-grey-800 rounded-lg px-3 py-2 text-xs text-grey-100 font-mono outline-none" value={thomasUpper} onChange={e=>setThomasUpper(e.target.value)} /></div>
            <div><label className="block text-[10px] font-semibold text-grey-500 mb-1 uppercase tracking-wider">RHS Vector (d)</label><input className="w-full bg-grey-950 border border-grey-800 rounded-lg px-3 py-2 text-xs text-grey-100 font-mono outline-none" value={thomasRHS} onChange={e=>setThomasRHS(e.target.value)} /></div>
          </div>
        )}

        {(method === 'doolittle' || method === 'crout' || cCat === 'linear_iterative') && (
          <div className="space-y-3 animate-fade-in">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-grey-500 uppercase tracking-wider flex items-center gap-1">
                  Matrix <span className="px-1 py-[1px] bg-grey-800 rounded font-mono text-[9px] text-grey-300">A|B</span>
                </label>
                <div className="flex gap-1">
                  <button onClick={() => updateMatrixSize(Math.max(2, matrixSize - 1))} className="px-2 bg-grey-800 hover:bg-grey-700 text-grey-300 rounded text-xs font-bold leading-none py-1">-</button>
                  <div className="text-[10px] text-grey-400 font-mono flex items-center bg-grey-950 border border-grey-800 px-1.5 rounded">{matrixSize}x{matrixSize+1}</div>
                  <button onClick={() => updateMatrixSize(Math.min(6, matrixSize + 1))} className="px-2 bg-grey-800 hover:bg-grey-700 text-grey-300 rounded text-xs font-bold leading-none py-1">+</button>
                </div>
              </div>
              
              <div className="flex flex-col gap-1.5 overflow-x-auto custom-scrollbar pb-1.5">
                {matrixGrid.map((row, i) => (
                  <div key={i} className="flex gap-1.5 min-w-max">
                    {row.map((cell, j) => (
                      <input
                        key={j}
                        value={cell}
                        onChange={(e) => updateMatrixCell(i, j, e.target.value)}
                        className={`w-[46px] h-8 text-center text-xs font-mono rounded bg-grey-950 border ${j === matrixSize ? 'border-sky-800/50 bg-sky-950/20 text-sky-200 shadow-inner' : 'border-grey-800 text-grey-100 shadow-inner'} outline-none focus:border-grey-400 transition-colors`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            
            {cCat === 'linear_iterative' && (
                <div>
                    <label className="block text-[11px] font-semibold text-grey-500 mb-1.5 uppercase tracking-wider">Tolerance (ε)</label>
                    <input type="number" step="any" className="w-full bg-grey-950 border border-grey-800 rounded-lg px-3 py-2 text-sm text-grey-100 font-mono outline-none focus:border-grey-500" value={tolerance} onChange={e => setTolerance(e.target.value)} />
                </div>
            )}
          </div>
        )}

        {(cCat === 'interpolation' || cCat === 'differentiation') && (
            <div className="space-y-3 animate-fade-in">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-grey-500 uppercase tracking-wider">Data Points</label>
                <div className="flex gap-1 items-center">
                  <span className="text-[9px] text-grey-600 font-mono">{pointsGrid.length} pts</span>
                  <button onClick={addPointRow} className="px-2 bg-grey-800 hover:bg-grey-700 text-grey-300 rounded text-xs font-bold leading-none py-1">+</button>
                </div>
              </div>
              {/* Header */}
              <div className="flex gap-1.5 mb-1">
                <div className="flex-1 text-center text-[9px] font-bold text-grey-500 uppercase">x</div>
                <div className="flex-1 text-center text-[9px] font-bold text-grey-500 uppercase">y</div>
                <div className="w-6"></div>
              </div>
              {/* Grid rows */}
              <div className="flex flex-col gap-0.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-0.5">
                {pointsGrid.map((row, i) => (
                  <div key={i} className="flex gap-1 items-center">
                    <input
                      value={row[0]}
                      onChange={(e) => updatePointCell(i, 0, e.target.value)}
                      className="flex-1 h-6 text-center text-[11px] font-mono rounded bg-grey-950 border border-grey-800 text-grey-100 outline-none focus:border-grey-500 transition-colors"
                      placeholder="x"
                    />
                    <input
                      value={row[1]}
                      onChange={(e) => updatePointCell(i, 1, e.target.value)}
                      className="flex-1 h-6 text-center text-[11px] font-mono rounded bg-grey-950 border border-grey-800 text-grey-100 outline-none focus:border-grey-500 transition-colors"
                      placeholder="y"
                    />
                    <button onClick={() => removePointRow(i)}
                      className="w-5 h-6 flex items-center justify-center text-grey-600 hover:text-red-400 hover:bg-grey-800 rounded transition-colors"
                      title="Remove row">
                      <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 2L10 10M10 2L2 10"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div>
                <label className="block text-[11px] font-semibold text-grey-500 mb-1.5 uppercase tracking-wider">
                  Target x
                </label>
                <input type="number" step="any" className="w-full bg-grey-950 border border-grey-800 rounded-lg px-3 py-2 text-sm text-grey-100 font-mono outline-none focus:border-grey-500" value={interpX} onChange={e => setInterpX(e.target.value)} />
            </div>
          </div>
        )}

        {cCat === 'differentiation' && (
          <div className="space-y-3 animate-fade-in">
             <div className="p-3 bg-grey-950 border border-grey-800 rounded-lg">
                <p className="text-[10px] text-grey-400 leading-relaxed italic">
                  Note: Tabulated differentiation formulas depend on the position of the point in the table (Start, End, or Center). Lagrange derivatives work for any point.
                </p>
             </div>
          </div>
        )}

        <button
          onClick={calculate}
          className="mt-auto w-full py-2.5 bg-grey-100 text-grey-950 font-bold rounded-lg text-sm hover:bg-white transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Execute Algorithm
        </button>
      </div>

      {/* Results Output Console - Split View */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden h-full">
        
        {/* TOP: Visual Step Widget */}
        <div className="flex-[2] bg-grey-900 border border-grey-800 rounded-xl flex flex-col overflow-hidden relative">
            <div className="h-10 shrink-0 bg-grey-950/50 border-b border-grey-800 flex items-center px-4 justify-between">
                <h2 className="text-[11px] font-bold text-grey-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500/80 shadow-[0_0_8px_rgba(14,165,233,0.3)]"></span>
                    Step-by-Step Solution
                </h2>
                {calculationSteps.length > 0 && (
                    <span className="text-[10px] text-sky-400 font-mono bg-sky-400/10 px-2 py-0.5 rounded-full border border-sky-400/20 animate-pulse">
                        Solving...
                    </span>
                )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
                {calculationSteps.length > 0 ? (
                    <div className="space-y-4">
                        {calculationSteps.map((step, idx) => (
                            <div key={idx} className="group relative bg-grey-950/50 border border-grey-800/50 rounded-lg p-3 hover:border-grey-700 transition-all animate-slide-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-mono text-grey-500 bg-grey-800 h-5 w-5 flex items-center justify-center rounded">
                                            {idx + 1}
                                        </span>
                                        <h3 className="text-xs font-bold text-grey-100">{step.title}</h3>
                                    </div>
                                    {step.badge && (
                                        <span className="text-[9px] uppercase tracking-tighter px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                                            {step.badge}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-grey-400 mb-2 leading-relaxed">{step.detail}</p>
                                {step.formula && (
                                    <div className="bg-grey-900/80 rounded px-2 py-1.5 font-mono text-[11px] text-sky-300 border-l-2 border-sky-500/50 my-2">
                                        {step.formula}
                                    </div>
                                )}
                                {step.result && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-[10px] text-grey-500 uppercase font-bold">Result:</span>
                                        <span className="text-xs font-mono text-emerald-400 font-bold">{step.result}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-grey-600 select-none opacity-40">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-4">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="3" y1="9" x2="21" y2="9"></line>
                            <line x1="9" y1="21" x2="9" y2="9"></line>
                        </svg>
                        <span className="italic tracking-wide text-xs">Awaiting Calculation Steps...</span>
                    </div>
                )}
            </div>
        </div>

        {/* BOTTOM: Raw Terminal Output */}
        <div className="flex-1 bg-grey-900 border border-grey-800 rounded-xl flex flex-col font-mono text-[11px] overflow-hidden relative min-h-[160px]">
            <div className="h-8 shrink-0 bg-grey-950/50 border-b border-grey-800 flex items-center px-4 justify-between">
                <h2 className="text-[9px] font-bold text-grey-500 uppercase tracking-widest flex items-center gap-2">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
                    Raw Terminal
                </h2>
                <button onClick={() => { playTick(); setResultText(null); setCalculationSteps([]); }} className="text-[9px] text-grey-500 hover:text-grey-300 uppercase tracking-widest transition-colors font-bold">Clear</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 whitespace-pre-wrap text-grey-400 custom-scrollbar leading-tight bg-grey-950/30">
                {resultText || (
                    <div className="h-full flex items-center justify-center text-grey-700 select-none">
                        <span className="italic text-[10px]">Ready for log dump...</span>
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}
