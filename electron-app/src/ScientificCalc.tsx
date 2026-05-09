import React, { useState, useCallback, useEffect, useRef } from 'react';
import { evaluate, pi, e as E_CONST } from 'mathjs';
import { playClick, playError } from './sounds';

type AngleMode = 'DEG' | 'RAD';
type CalcMode = 'simple' | 'scientific';

export default function ScientificCalc() {
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [memory, setMemory] = useState(0);
  const [angleMode, setAngleMode] = useState<AngleMode>('DEG');
  const [isShift, setIsShift] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [calcMode, setCalcMode] = useState<CalcMode>('simple');
  const containerRef = useRef<HTMLDivElement>(null);

  const toRad = useCallback((val: number): number => {
    return angleMode === 'DEG' ? (val * Math.PI) / 180 : val;
  }, [angleMode]);

  const fromRad = useCallback((val: number): number => {
    return angleMode === 'DEG' ? (val * 180) / Math.PI : val;
  }, [angleMode]);

  const safeEval = useCallback((expr: string): string => {
    try {
      const result = evaluate(expr);
      if (typeof result === 'number') {
        if (!isFinite(result)) return 'Math Error';
        return String(parseFloat(result.toPrecision(12)));
      }
      return String(result);
    } catch {
      return 'Syntax Error';
    }
  }, []);

  const handleNumber = useCallback((num: string) => {
    playClick();
    if (hasResult) {
      setDisplay(num);
      setExpression(num);
      setHasResult(false);
    } else {
      if (display === '0' && num !== '.') {
        setDisplay(num);
        setExpression(expression === '' || expression === '0' ? num : expression + num);
      } else {
        setDisplay(display + num);
        setExpression(expression + num);
      }
    }
  }, [display, expression, hasResult]);

  const handleOperator = useCallback((op: string) => {
    playClick();
    setHasResult(false);
    const mapped = op === '×' ? '*' : op === '÷' ? '/' : op;
    setExpression(expression + mapped);
    setDisplay(mapped);
  }, [expression]);

  const handleEquals = useCallback(() => {
    if (!expression) return;
    const result = safeEval(expression);
    if (result === 'Syntax Error' || result === 'Math Error') {
      playError();
    } else {
      playClick();
    }
    setHistory(prev => [...prev.slice(-19), `${expression} = ${result}`]);
    setDisplay(result);
    setExpression(result === 'Syntax Error' || result === 'Math Error' ? '' : result);
    setHasResult(true);
  }, [expression, safeEval]);

  const handleClear = useCallback(() => {
    playClick();
    setDisplay('0');
    setExpression('');
    setHasResult(false);
  }, []);

  const handleBackspace = useCallback(() => {
    playClick();
    if (hasResult) { handleClear(); return; }
    if (expression.length <= 1) {
      setDisplay('0');
      setExpression('');
    } else {
      const newExpr = expression.slice(0, -1);
      setExpression(newExpr);
      setDisplay(newExpr || '0');
    }
  }, [expression, hasResult, handleClear]);

  const handleTrig = useCallback((fn: string) => {
    try {
      const val = parseFloat(display);
      if (isNaN(val)) { playError(); setDisplay('Error'); return; }
      let result: number;
      if (isShift) {
        switch (fn) {
          case 'sin': result = fromRad(Math.asin(val)); break;
          case 'cos': result = fromRad(Math.acos(val)); break;
          case 'tan': result = fromRad(Math.atan(val)); break;
          default: return;
        }
      } else {
        const radVal = toRad(val);
        switch (fn) {
          case 'sin': result = Math.sin(radVal); break;
          case 'cos': result = Math.cos(radVal); break;
          case 'tan': result = Math.tan(radVal); break;
          default: return;
        }
      }
      if (!isFinite(result)) { playError(); setDisplay('Math Error'); setExpression(''); return; }
      playClick();
      const clean = parseFloat(result.toPrecision(12));
      setDisplay(String(clean));
      setExpression(String(clean));
      setHasResult(true);
      setIsShift(false);
    } catch { playError(); setDisplay('Error'); }
  }, [display, isShift, toRad, fromRad]);

  const handleFunction = useCallback((fn: string) => {
    try {
      const val = parseFloat(display);
      if (isNaN(val) && fn !== 'pi' && fn !== 'e') { playError(); setDisplay('Error'); return; }
      let result: number;
      switch (fn) {
        case 'sqrt': result = Math.sqrt(val); break;
        case 'cbrt': result = Math.cbrt(val); break;
        case 'square': result = val * val; break;
        case 'cube': result = val * val * val; break;
        case 'reciprocal': result = 1 / val; break;
        case 'factorial': result = evaluate(`${Math.round(val)}!`); break;
        case 'log': result = Math.log10(val); break;
        case 'ln': result = Math.log(val); break;
        case '10x': result = Math.pow(10, val); break;
        case 'ex': result = Math.exp(val); break;
        case 'abs': result = Math.abs(val); break;
        case 'pi': result = pi; break;
        case 'e': result = E_CONST; break;
        case 'negate': result = -val; break;
        case 'percent': result = val / 100; break;
        default: return;
      }
      if (typeof result === 'number' && !isFinite(result)) { playError(); setDisplay('Math Error'); setExpression(''); return; }
      playClick();
      const clean = parseFloat(Number(result).toPrecision(12));
      setDisplay(String(clean));
      setExpression(String(clean));
      setHasResult(true);
      setIsShift(false);
    } catch { playError(); setDisplay('Error'); }
  }, [display, isShift, toRad]);

  const handlePower = useCallback(() => { playClick(); setExpression(expression + '^'); setDisplay('^'); setHasResult(false); }, [expression]);
  const handleParenthesis = useCallback((p: string) => {
    playClick();
    if (hasResult && p === '(') { setExpression(p); setDisplay(p); setHasResult(false); }
    else { setExpression(expression + p); setDisplay(display === '0' ? p : display + p); setHasResult(false); }
  }, [expression, display, hasResult]);
  const handleMemory = useCallback((action: string) => {
    playClick();
    const val = parseFloat(display) || 0;
    switch (action) {
      case 'MC': setMemory(0); break;
      case 'MR': setDisplay(String(memory)); setExpression(String(memory)); setHasResult(true); break;
      case 'M+': setMemory(memory + val); break;
      case 'M-': setMemory(memory - val); break;
    }
  }, [display, memory]);

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture if user is typing in a different input
      if (document.activeElement?.tagName === 'INPUT' && !containerRef.current?.contains(document.activeElement)) return;
      
      e.preventDefault();
      if (e.key >= '0' && e.key <= '9') handleNumber(e.key);
      else if (e.key === '.') handleNumber('.');
      else if (e.key === '+') handleOperator('+');
      else if (e.key === '-') handleOperator('-');
      else if (e.key === '*') handleOperator('×');
      else if (e.key === '/') handleOperator('÷');
      else if (e.key === 'Enter' || e.key === '=') handleEquals();
      else if (e.key === 'Backspace') handleBackspace();
      else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') handleClear();
      else if (e.key === '(') handleParenthesis('(');
      else if (e.key === ')') handleParenthesis(')');
      else if (e.key === '^') handlePower();
      else if (e.key === '%') handleFunction('percent');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleNumber, handleOperator, handleEquals, handleBackspace, handleClear, handleParenthesis, handlePower, handleFunction]);

  // Button
  const Btn = ({ label, onClick, className = '', span = 1 }: { label: string | React.ReactNode, onClick: () => void, className?: string, span?: number }) => (
    <button
      onClick={onClick}
      className={`flex items-center justify-center rounded-xl font-medium
        transition-all duration-100 active:scale-[0.93] select-none cursor-pointer
        ${className}`}
      style={span > 1 ? { gridColumn: `span ${span}` } : {}}
    >
      {label}
    </button>
  );

  const numStyle = 'bg-grey-800 text-grey-50 hover:bg-grey-700 h-10 sm:h-11 text-sm sm:text-base font-semibold shadow-sm';
  const opStyle = 'bg-grey-600 text-grey-50 hover:bg-grey-500 h-10 sm:h-11 text-base sm:text-lg font-bold shadow-sm';
  const fnStyle = 'bg-grey-900 text-grey-300 hover:bg-grey-800 h-7 sm:h-8 text-[10px] sm:text-xs border border-grey-800';
  const eqStyle = 'bg-grey-100 text-grey-950 hover:bg-white h-10 sm:h-11 text-base sm:text-lg font-bold shadow-md';

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col items-center p-2 overflow-y-auto" tabIndex={0}>
      <div className="w-full max-w-[360px] flex flex-col gap-1.5 my-auto py-2">
        
        {/* Mode Toggle */}
        <div className="flex items-center justify-center gap-1 mb-1 relative w-full">
          {!window.location.hash.includes('mini') && (
            <button 
              onClick={() => { playClick(); window.electronAPI?.openMiniCalc?.(); }} 
              className="absolute left-0 top-0.5 p-1.5 text-grey-500 hover:text-sky-400 transition-colors"
              title="Pop out standalone calculator"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </button>
          )}
          <button
            onClick={() => { playClick(); setCalcMode('simple'); }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              calcMode === 'simple' ? 'bg-grey-50 text-grey-950' : 'text-grey-400 hover:text-grey-200'
            }`}
          >
            Simple
          </button>
          <button
            onClick={() => { playClick(); setCalcMode('scientific'); }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              calcMode === 'scientific' ? 'bg-grey-50 text-grey-950' : 'text-grey-400 hover:text-grey-200'
            }`}
          >
            Scientific
          </button>
        </div>

        {/* Display */}
        <div className="bg-grey-900 border border-grey-800 rounded-xl p-3 sm:p-4 select-text shadow-inner">
          <div className="flex items-center gap-2 mb-2 text-[10px] uppercase tracking-widest text-grey-600 font-bold">
            {calcMode === 'scientific' && (
              <button onClick={() => { playClick(); setAngleMode(prev => prev === 'DEG' ? 'RAD' : 'DEG'); }} className="hover:text-grey-300 transition-colors px-2 py-0.5 rounded-md bg-grey-950 border border-grey-800">
                {angleMode}
              </button>
            )}
            {memory !== 0 && <span className="text-amber-400/80">M</span>}
            {isShift && <span className="text-sky-400">SHIFT</span>}
            <span className="ml-auto text-grey-700">⌨ keyboard</span>
          </div>
          <div className="text-grey-500 text-xs font-mono h-5 text-right overflow-hidden truncate mb-1">
            {expression || '\u00A0'}
          </div>
          <div className="text-grey-50 text-2xl sm:text-3xl font-mono text-right overflow-hidden truncate font-light tracking-wide">
            {display}
          </div>
        </div>

        {/* Scientific Rows */}
        {calcMode === 'scientific' && (
          <div className="space-y-1.5 animate-fade-in">
            <div className="grid grid-cols-6 gap-1">
              <Btn label="SHIFT" onClick={() => { playClick(); setIsShift(!isShift); }} className={`${isShift ? 'bg-sky-700 text-white' : fnStyle} text-[9px]`} />
              <Btn label={isShift ? "sin⁻¹" : "sin"} onClick={() => handleTrig('sin')} className={`${fnStyle}`} />
              <Btn label={isShift ? "cos⁻¹" : "cos"} onClick={() => handleTrig('cos')} className={`${fnStyle}`} />
              <Btn label={isShift ? "tan⁻¹" : "tan"} onClick={() => handleTrig('tan')} className={`${fnStyle}`} />
              <Btn label="(" onClick={() => handleParenthesis('(')} className={`${fnStyle}`} />
              <Btn label=")" onClick={() => handleParenthesis(')')} className={`${fnStyle}`} />
            </div>
            <div className="grid grid-cols-6 gap-1">
              <Btn label={isShift ? "10ˣ" : "log"} onClick={() => handleFunction(isShift ? '10x' : 'log')} className={`${fnStyle}`} />
              <Btn label={isShift ? "eˣ" : "ln"} onClick={() => handleFunction(isShift ? 'ex' : 'ln')} className={`${fnStyle}`} />
              <Btn label={isShift ? "∛" : "√"} onClick={() => handleFunction(isShift ? 'cbrt' : 'sqrt')} className={`${fnStyle}`} />
              <Btn label={isShift ? "x³" : "x²"} onClick={() => handleFunction(isShift ? 'cube' : 'square')} className={`${fnStyle}`} />
              <Btn label="xʸ" onClick={handlePower} className={`${fnStyle}`} />
              <Btn label={isShift ? "n!" : "1/x"} onClick={() => handleFunction(isShift ? 'factorial' : 'reciprocal')} className={`${fnStyle}`} />
            </div>
            <div className="grid grid-cols-6 gap-1">
              <Btn label="MC" onClick={() => handleMemory('MC')} className={`${fnStyle} text-[9px]`} />
              <Btn label="MR" onClick={() => handleMemory('MR')} className={`${fnStyle} text-[9px]`} />
              <Btn label="M+" onClick={() => handleMemory('M+')} className={`${fnStyle} text-[9px]`} />
              <Btn label="M-" onClick={() => handleMemory('M-')} className={`${fnStyle} text-[9px]`} />
              <Btn label="π" onClick={() => handleFunction('pi')} className={`${fnStyle}`} />
              <Btn label="e" onClick={() => handleFunction('e')} className={`${fnStyle}`} />
            </div>
          </div>
        )}

        {/* Number Pad */}
        <div className="grid grid-cols-4 gap-1.5">
          <Btn label="AC" onClick={handleClear} className="bg-red-900/50 text-red-200 hover:bg-red-800/50 h-10 sm:h-11 font-bold text-sm border border-red-900/50" />
          <Btn label="⌫" onClick={handleBackspace} className={opStyle} />
          <Btn label="%" onClick={() => handleFunction('percent')} className={opStyle} />
          <Btn label="÷" onClick={() => handleOperator('÷')} className={opStyle} />

          <Btn label="7" onClick={() => handleNumber('7')} className={numStyle} />
          <Btn label="8" onClick={() => handleNumber('8')} className={numStyle} />
          <Btn label="9" onClick={() => handleNumber('9')} className={numStyle} />
          <Btn label="×" onClick={() => handleOperator('×')} className={opStyle} />

          <Btn label="4" onClick={() => handleNumber('4')} className={numStyle} />
          <Btn label="5" onClick={() => handleNumber('5')} className={numStyle} />
          <Btn label="6" onClick={() => handleNumber('6')} className={numStyle} />
          <Btn label="−" onClick={() => handleOperator('-')} className={opStyle} />

          <Btn label="1" onClick={() => handleNumber('1')} className={numStyle} />
          <Btn label="2" onClick={() => handleNumber('2')} className={numStyle} />
          <Btn label="3" onClick={() => handleNumber('3')} className={numStyle} />
          <Btn label="+" onClick={() => handleOperator('+')} className={opStyle} />

          <Btn label="±" onClick={() => handleFunction('negate')} className={numStyle} />
          <Btn label="0" onClick={() => handleNumber('0')} className={numStyle} />
          <Btn label="." onClick={() => handleNumber('.')} className={numStyle} />
          <Btn label="=" onClick={handleEquals} className={eqStyle} />
        </div>
      </div>
    </div>
  );
}
