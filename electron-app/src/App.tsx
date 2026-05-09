import React, { useState, useMemo } from 'react';
import { jStat } from 'jstat';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Filler, Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { motion, AnimatePresence } from 'framer-motion';
import ScientificCalc from './ScientificCalc';
import MathGame from './MathGame';
import NumericalCalc from './NumericalCalc';
import AiTutor from './AiTutor';
import { playTick } from './sounds';
import { FormulaCard } from './Latex';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend);

/* ── Capsule Navigation ── */
function NavLink({ isActive, onClick, icon, label }: { isActive: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={() => { playTick(); onClick(); }}
      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 relative group select-none ${
        isActive
          ? "bg-grey-700/90 text-grey-50 shadow-[0_2px_12px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)] ring-1 ring-grey-600/50"
          : "text-grey-400 hover:text-grey-200 hover:bg-grey-800/50"
      }`}
    >
      <span className="flex items-center justify-center transform group-hover:scale-110 transition-transform duration-200">
        {icon}
      </span>
      <span className="text-[13px] font-semibold tracking-wide whitespace-nowrap">
        {label}
      </span>
    </button>
  );
}

function CapsuleNav({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) {
  return (
    <motion.nav
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.1 }}
      className="shrink-0 flex justify-center py-4 z-50"
    >
      <div className="flex items-center gap-1 rounded-full border border-grey-700/60 bg-grey-900/80 p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.04)]">
        <NavLink
          isActive={activeTab === 'prob'}
          onClick={() => setActiveTab('prob')}
          label="Adv Prob"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 3v18h18"/><path d="M7 16l4-8 4 4 4-6"/></svg>}
        />
        <div className="w-[1px] h-5 bg-grey-700/50 mx-0.5" />
        <NavLink
          isActive={activeTab === 'tools'}
          onClick={() => setActiveTab('tools')}
          label="Numerical"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="16" y2="10"/><polyline points="8 14 10 16 14 12"/></svg>}
        />
        <div className="w-[1px] h-5 bg-grey-700/50 mx-0.5" />
        <NavLink
          isActive={activeTab === 'game'}
          onClick={() => setActiveTab('game')}
          label="Games"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>}
        />
        <div className="w-[1px] h-5 bg-grey-700/50 mx-0.5" />
        <NavLink
          isActive={activeTab === 'ai'}
          onClick={() => setActiveTab('ai')}
          label="AI Tutor"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h.01"/><path d="M12 10h.01"/><path d="M16 10h.01"/></svg>}
        />
      </div>
    </motion.nav>
  );
}

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.1 } },
};

/* ── Main App ── */
export default function App() {
  const [activeTab, setActiveTab] = useState<string>('prob');
  const [probView, setProbView] = useState<'estimation' | 'hypothesis'>('estimation');
  const [toolsView, setToolsView] = useState<'calc' | 'neu'>('neu');

  // Common State
  const [useRawData, setUseRawData] = useState<boolean>(false);
  const [rawData, setRawData] = useState<string>("52, 48, 55, 50, 49, 53, 47, 51");
  const [mean, setMean] = useState<number>(50);
  const [n, setN] = useState<number>(25);
  const [sigmaKnown, setSigmaKnown] = useState<boolean>(false);
  const [stdDev, setStdDev] = useState<number>(10);
  const [confLevel, setConfLevel] = useState<number>(95);

  // Hypothesis State
  const [h0Mean, setH0Mean] = useState<number>(50);
  const [altHypothesis, setAltHypothesis] = useState<'not_equal' | 'greater' | 'less'>('not_equal');
  const [alphaLevel, setAlphaLevel] = useState<number>(0.05);

  const statsFromRaw = useMemo(() => {
    if (!useRawData) return { mean, n, stdDev };
    const arr = rawData.split(/[\s,]+/).map(Number).filter(x => !isNaN(x));
    if (arr.length === 0) return { mean: 0, n: 0, stdDev: 0 };
    const m = arr.reduce((a, b) => a + b, 0) / arr.length;
    const v = arr.reduce((a, b) => a + Math.pow(b - m, 2), 0) / (arr.length - 1);
    return { mean: m, n: arr.length, stdDev: Math.sqrt(v) };
  }, [useRawData, rawData, mean, n, stdDev]);

  const resultsEstimation = useMemo(() => {
    const { mean: m, n: num, stdDev: s } = statsFromRaw;
    if (num <= 0 || s <= 0 || confLevel <= 0 || confLevel >= 100) return null;
    const alpha = 1 - confLevel / 100;
    const alphaHalf = alpha / 2;
    const cumulativeProb = 1 - alphaHalf;
    let caseName = "", useZ = true, criticalValue = 0, criticalName = "";
    if (sigmaKnown) {
      caseName = "Case 1: σ is known → Z-Distribution";
      criticalValue = jStat.normal.inv(cumulativeProb, 0, 1);
      criticalName = `Z(${cumulativeProb.toFixed(4)})`;
    } else if (num >= 30) {
      caseName = "Case 2: σ unknown, n ≥ 30 → Z-Distribution";
      criticalValue = jStat.normal.inv(cumulativeProb, 0, 1);
      criticalName = `Z(${cumulativeProb.toFixed(4)})`;
    } else {
      caseName = "Case 3: σ unknown, n < 30 → T-Distribution";
      useZ = false;
      criticalValue = jStat.studentt.inv(cumulativeProb, num - 1);
      criticalName = `T(${cumulativeProb.toFixed(3)}, df=${num - 1})`;
    }
    const standardError = s / Math.sqrt(num);
    const marginOfError = criticalValue * standardError;
    const lowerBound = m - marginOfError;
    const upperBound = m + marginOfError;
    const chartPoints = 100;
    const chartMin = m - 4 * standardError;
    const chartMax = m + 4 * standardError;
    const step = (chartMax - chartMin) / chartPoints;
    const labels: string[] = [], pdfData: number[] = [], shadedData: (number | null)[] = [];
    for (let i = 0; i <= chartPoints; i++) {
      const x = chartMin + i * step;
      labels.push(x.toFixed(2));
      let y = useZ ? jStat.normal.pdf(x, m, standardError) : jStat.studentt.pdf((x - m) / standardError, num - 1) / standardError;
      pdfData.push(y);
      shadedData.push(x >= lowerBound && x <= upperBound ? y : null);
    }
    return {
      alpha, alphaHalf, caseName, useZ, criticalValue, criticalName, standardError, marginOfError, lowerBound, upperBound,
      chartData: {
        labels,
        datasets: [
          { label: 'PDF', data: pdfData, borderColor: '#f7f6f6', borderWidth: 2, pointRadius: 0, fill: false, tension: 0.3 },
          { label: `${confLevel}% CI`, data: shadedData, backgroundColor: 'rgba(56, 189, 248, 0.4)', borderColor: 'transparent', pointRadius: 0, fill: 'origin', tension: 0.3 }
        ]
      }
    };
  }, [statsFromRaw, sigmaKnown, confLevel]);

  const resultsHypothesis = useMemo(() => {
    const { mean: m, n: num, stdDev: s } = statsFromRaw;
    if (num <= 0 || s <= 0) return null;
    let useZ = sigmaKnown || num >= 30;
    let standardError = s / Math.sqrt(num);
    let testStatistic = (m - h0Mean) / standardError;
    let criticalValueLower = 0, criticalValueUpper = 0;
    let isReject = false;
    let decisionReason = "";
    if (altHypothesis === 'not_equal') {
      const cumulativeUpper = 1 - (alphaLevel / 2);
      criticalValueUpper = useZ ? jStat.normal.inv(cumulativeUpper, 0, 1) : jStat.studentt.inv(cumulativeUpper, num - 1);
      criticalValueLower = -criticalValueUpper;
      isReject = Math.abs(testStatistic) > criticalValueUpper;
      decisionReason = isReject
        ? `|Test Stat| (${Math.abs(testStatistic).toFixed(4)}) > Critical Value (${criticalValueUpper.toFixed(4)})`
        : `|Test Stat| (${Math.abs(testStatistic).toFixed(4)}) ≤ Critical Value (${criticalValueUpper.toFixed(4)})`;
    } else if (altHypothesis === 'greater') {
      const cumulative = 1 - alphaLevel;
      criticalValueUpper = useZ ? jStat.normal.inv(cumulative, 0, 1) : jStat.studentt.inv(cumulative, num - 1);
      isReject = testStatistic > criticalValueUpper;
      decisionReason = isReject
        ? `Test Stat (${testStatistic.toFixed(4)}) > Critical Value (${criticalValueUpper.toFixed(4)})`
        : `Test Stat (${testStatistic.toFixed(4)}) ≤ Critical Value (${criticalValueUpper.toFixed(4)})`;
    } else {
      const cumulative = alphaLevel;
      criticalValueLower = useZ ? jStat.normal.inv(cumulative, 0, 1) : jStat.studentt.inv(cumulative, num - 1);
      isReject = testStatistic < criticalValueLower;
      decisionReason = isReject
        ? `Test Stat (${testStatistic.toFixed(4)}) < Critical Value (${criticalValueLower.toFixed(4)})`
        : `Test Stat (${testStatistic.toFixed(4)}) ≥ Critical Value (${criticalValueLower.toFixed(4)})`;
    }
    const chartPoints = 120;
    const distMean = h0Mean;
    const chartMin = distMean - 4 * standardError;
    const chartMax = distMean + 4 * standardError;
    const step = (chartMax - chartMin) / chartPoints;
    const labels: string[] = [], pdfData: number[] = [], rejectionData: (number | null)[] = [], acceptanceData: (number | null)[] = [];
    for (let i = 0; i <= chartPoints; i++) {
      const x = chartMin + i * step;
      labels.push(x.toFixed(2));
      let y = useZ ? jStat.normal.pdf(x, distMean, standardError) : jStat.studentt.pdf((x - distMean) / standardError, num - 1) / standardError;
      pdfData.push(y);
      let isRejection = false;
      if (altHypothesis === 'not_equal') isRejection = x < (distMean + criticalValueLower * standardError) || x > (distMean + criticalValueUpper * standardError);
      else if (altHypothesis === 'greater') isRejection = x > (distMean + criticalValueUpper * standardError);
      else isRejection = x < (distMean + criticalValueLower * standardError);
      if (isRejection) { rejectionData.push(y); acceptanceData.push(null); }
      else { rejectionData.push(null); acceptanceData.push(y); }
    }
    return {
      testStatistic, criticalValueLower, criticalValueUpper, isReject, decisionReason, useZ,
      chartData: {
        labels,
        datasets: [
          { label: 'Distribution', data: pdfData, borderColor: '#4a4543', borderWidth: 1, pointRadius: 0, fill: false, tension: 0.3 },
          { label: 'Rejection Region', data: rejectionData, backgroundColor: 'rgba(239, 68, 68, 0.45)', borderColor: 'transparent', pointRadius: 0, fill: 'origin', tension: 0.3 },
          { label: 'Acceptance Region', data: acceptanceData, backgroundColor: 'rgba(34, 197, 94, 0.25)', borderColor: 'transparent', pointRadius: 0, fill: 'origin', tension: 0.3 },
        ]
      }
    };
  }, [statsFromRaw, sigmaKnown, h0Mean, altHypothesis, alphaLevel]);

  const handleMinimize = () => window.electronAPI?.minimize();
  const handleMaximize = () => window.electronAPI?.maximize();
  const handleClose = () => window.electronAPI?.close();

  const isMini = window.location.hash.includes('mini');
  if (isMini) {
    return (
      <div className="h-screen w-screen bg-grey-950 text-grey-100 font-sans flex flex-col overflow-hidden">
        <div className="h-8 shrink-0 bg-[#161413] flex items-center justify-between px-3 border-b border-grey-900 select-none z-50 shadow-sm" style={{ WebkitAppRegion: 'drag' } as any}>
          <div className="flex items-center gap-2">
            <span className="text-amber-500 font-serif font-bold text-sm leading-none">µ</span>
            <span className="font-serif font-bold text-grey-400 text-[10px] tracking-widest uppercase mt-[1px]">Mini Calculator</span>
          </div>
          <div className="flex items-center" style={{ WebkitAppRegion: 'no-drag' } as any}>
            <button onClick={handleClose} className="p-1 hover:bg-red-500/80 hover:text-white text-grey-500 rounded transition-colors">
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 2L10 10M10 2L2 10" /></svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden" style={{ WebkitAppRegion: 'no-drag' } as any}><ScientificCalc /></div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-grey-950 text-grey-100 font-sans flex flex-col overflow-hidden">
      {/* ── Titlebar ── */}
      <div className="h-9 shrink-0 bg-grey-950 flex items-center justify-between px-4 border-b border-grey-900/50 select-none z-50" style={{ WebkitAppRegion: 'drag' } as any}>
        <div className="flex items-center gap-2">
          <span className="text-lg">µ</span>
          <span className="font-serif font-bold text-grey-300 text-xs tracking-wide">Mathly</span>
        </div>
        <div className="flex items-center" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <button onClick={handleMinimize} className="p-2 hover:bg-grey-800 rounded transition-colors"><div className="w-3 h-[2px] bg-grey-400"></div></button>
          <button onClick={handleMaximize} className="p-2 hover:bg-grey-800 rounded transition-colors"><div className="w-3 h-3 border-[1.5px] border-grey-400 rounded-sm"></div></button>
          <button onClick={handleClose} className="p-2 hover:bg-red-500/80 hover:text-white text-grey-400 rounded transition-colors">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 2L10 10M10 2L2 10" /></svg>
          </button>
        </div>
      </div>

      <CapsuleNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 overflow-hidden w-full max-w-[1400px] mx-auto flex flex-col px-4 md:px-6">
        <AnimatePresence mode="wait">
          {activeTab === 'tools' && (
            <motion.div key="tools" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex-1 overflow-hidden flex flex-row">
              {/* Content area */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <AnimatePresence mode="wait">
                  {toolsView === 'calc' ? (
                    <motion.div key="calc-view" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.2 }} className="flex-1 overflow-hidden">
                      <ScientificCalc />
                    </motion.div>
                  ) : (
                    <motion.div key="neu-view" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }} className="flex-1 overflow-hidden flex flex-col">
                      <NumericalCalc />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Right-side arrow flipper */}
              <div className="hidden md:flex flex-col items-center justify-center shrink-0 w-10">
                <button
                  onClick={() => { playTick(); setToolsView(toolsView === 'calc' ? 'neu' : 'calc'); }}
                  className="group flex flex-col items-center gap-3 py-6 px-1 rounded-xl border border-grey-800 bg-grey-900 hover:border-grey-600 hover:bg-grey-800 transition-all cursor-pointer"
                  title={toolsView === 'calc' ? 'Switch to Numerical Methods' : 'Switch to Calculator'}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-grey-400 group-hover:text-grey-100 transition-colors">
                    {toolsView === 'calc'
                      ? <polyline points="9 18 15 12 9 6" />
                      : <polyline points="15 18 9 12 15 6" />}
                  </svg>
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-grey-500 group-hover:text-grey-300 transition-colors"
                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                    {toolsView === 'calc' ? 'Numerical' : 'Calculator'}
                  </span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-grey-400 group-hover:text-grey-100 transition-colors">
                    {toolsView === 'calc'
                      ? <polyline points="9 18 15 12 9 6" />
                      : <polyline points="15 18 9 12 15 6" />}
                  </svg>
                </button>
              </div>
            </motion.div>
          )}
          {activeTab === 'game' && (
            <motion.div key="game" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex-1 overflow-hidden flex">
              <MathGame />
            </motion.div>
          )}
          {activeTab === 'ai' && (
            <motion.div key="ai" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex-1 overflow-hidden flex flex-col">
              <AiTutor />
            </motion.div>
          )}

          {/* ── Combined Adv Prob tab ── */}
          {activeTab === 'prob' && (
            <motion.div key="prob" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="flex-1 flex flex-row gap-4 h-full overflow-hidden">

              {/* Left sidebar — flips between estimation and hypothesis inputs */}
              <div className="w-full md:w-64 lg:w-72 shrink-0 bg-grey-900 border border-grey-800 rounded-xl p-4 flex flex-col h-full overflow-y-auto custom-scrollbar">
                <AnimatePresence mode="wait">
                {probView === 'estimation' ? (
                  <motion.div key="est-side" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.15 }} className="flex flex-col flex-1">
                    <h2 className="text-base font-serif text-grey-50 mb-4 font-bold border-b border-grey-800 pb-2 flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                      Variables
                    </h2>
                    <div className="space-y-3 flex-1 pr-1">
                      <label className="flex items-center gap-3 cursor-pointer group py-1" onClick={() => setUseRawData(!useRawData)}>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${useRawData ? 'bg-grey-400 border-grey-400' : 'border-grey-600 bg-grey-950 group-hover:border-grey-500'}`}>
                          {useRawData && <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#1c1917" strokeWidth="2.5"><path d="M2 6l3 3 5-5"/></svg>}
                        </div>
                        <span className="text-[11px] font-medium text-grey-300 group-hover:text-grey-100 transition-colors">Enter Raw Data Points</span>
                      </label>
                      {useRawData ? (
                        <div className="space-y-2">
                          <textarea className="w-full bg-grey-950 border border-grey-800 rounded-lg px-3 py-2 text-xs text-grey-100 font-mono focus:border-grey-500 focus:outline-none min-h-[120px]" value={rawData} onChange={(e) => setRawData(e.target.value)} placeholder="Paste values separated by comma or space" />
                          <div className="p-2 bg-grey-950 rounded border border-grey-800">
                            <p className="text-[10px] text-grey-500 uppercase font-bold mb-1">Calculated Stats</p>
                            <p className="text-[11px] text-grey-300 font-mono">x̄: {statsFromRaw.mean.toFixed(2)} | n: {statsFromRaw.n}</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <InputField label="Sample Mean (x̄)" value={mean} onChange={v => setMean(v)} />
                          <InputField label="Sample Size (n)" value={n} onChange={v => setN(Math.max(1, Math.round(v)))} min={1} />
                        </>
                      )}
                      <div className="pt-2 border-t border-grey-800">
                        <label className="flex items-center gap-3 cursor-pointer group py-1" onClick={() => setSigmaKnown(!sigmaKnown)}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${sigmaKnown ? 'bg-grey-400 border-grey-400' : 'border-grey-600 bg-grey-950 group-hover:border-grey-500'}`}>
                            {sigmaKnown && <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#1c1917" strokeWidth="2.5"><path d="M2 6l3 3 5-5"/></svg>}
                          </div>
                          <span className="text-[11px] font-medium text-grey-300 group-hover:text-grey-100 transition-colors">σ is known</span>
                        </label>
                        <InputField label={sigmaKnown ? 'Population σ' : 'Sample Std. Dev (s)'} value={stdDev} onChange={v => setStdDev(v)} step={0.01} />
                      </div>
                      <div className="pt-2 border-t border-grey-800 flex flex-col gap-1.5">
                        <InputField label="Confidence Level (%)" value={confLevel} onChange={v => setConfLevel(Math.min(99.99, Math.max(0.01, v)))} step={1} />
                        <div className="flex gap-1.5 justify-end">
                          {[90, 95, 99].map(c => (
                            <button key={c} onClick={() => { playTick(); setConfLevel(c); }} className="px-2 py-1 rounded bg-grey-950 border border-grey-800 hover:border-grey-600 text-grey-400 hover:text-grey-200 text-[10px] font-bold transition-all">{c}%</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="hyp-side" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.15 }} className="flex flex-col flex-1">
                    <h2 className="text-base font-serif text-grey-50 mb-4 font-bold border-b border-grey-800 pb-2 flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                      Hypothesis Setup
                    </h2>
                    <div className="space-y-4">
                      <InputField label="Null Hypothesis (H₀)" value={h0Mean} onChange={v => setH0Mean(v)} />
                      <div>
                        <label className="block text-[11px] font-semibold text-grey-500 mb-1.5 uppercase tracking-wider">Alt. Hypothesis (H₁)</label>
                        <div className="grid grid-cols-1 gap-1">
                          {[{ id: 'not_equal', label: 'µ ≠ H₀', icon: '≠' }, { id: 'greater', label: 'µ > H₀', icon: '>' }, { id: 'less', label: 'µ < H₀', icon: '<' }].map(opt => (
                            <button key={opt.id} onClick={() => setAltHypothesis(opt.id as any)} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium transition-all ${altHypothesis === opt.id ? 'bg-grey-800 border-grey-600 text-grey-50' : 'bg-grey-950 border-grey-800 text-grey-400 hover:border-grey-700'}`}>
                              <span>{opt.label}</span><span className="font-mono opacity-50">{opt.icon}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="pt-2 border-t border-grey-800">
                        <InputField label="Significance Level (α)" value={alphaLevel} onChange={v => setAlphaLevel(v)} step={0.01} />
                      </div>
                      <div className="pt-2 border-t border-grey-800 space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer group py-1" onClick={() => setUseRawData(!useRawData)}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${useRawData ? 'bg-sky-500 border-sky-500' : 'border-grey-600 bg-grey-950 group-hover:border-grey-500'}`}>
                            {useRawData && <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="3"><path d="M2 6l3 3 5-5"/></svg>}
                          </div>
                          <span className="text-[11px] font-medium text-grey-300">Use Raw Data Input</span>
                        </label>
                        {useRawData ? (
                          <textarea className="w-full bg-grey-950 border border-grey-800 rounded-lg px-3 py-2 text-xs text-grey-100 font-mono focus:border-grey-500 focus:outline-none min-h-[100px]" value={rawData} onChange={(e) => setRawData(e.target.value)} placeholder="Enter numbers e.g. 1, 2, 3" />
                        ) : (
                          <div className="space-y-3">
                            <InputField label="Sample Mean (x̄)" value={mean} onChange={v => setMean(v)} />
                            <InputField label="Sample Size (n)" value={n} onChange={v => setN(v)} />
                            <InputField label="Std. Deviation (s)" value={stdDev} onChange={v => setStdDev(v)} />
                          </div>
                        )}
                        <label className="flex items-center gap-3 cursor-pointer group py-1" onClick={() => setSigmaKnown(!sigmaKnown)}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${sigmaKnown ? 'bg-amber-500 border-amber-500' : 'border-grey-600 bg-grey-950 group-hover:border-grey-500'}`}>
                            {sigmaKnown && <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="3"><path d="M2 6l3 3 5-5"/></svg>}
                          </div>
                          <span className="text-[11px] font-medium text-grey-300">σ is known (Z-Test)</span>
                        </label>
                      </div>
                    </div>
                  </motion.div>
                )}
                </AnimatePresence>
              </div>

              {/* Main results area — flips between estimation and hypothesis */}
              <div className="flex-1 flex flex-col h-full gap-3 overflow-hidden">
                <AnimatePresence mode="wait">
                {probView === 'estimation' ? (
                  <motion.div key="est-res" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.2 }} className="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
                    {resultsEstimation ? (
                      <>
                        <div className="flex gap-3 shrink-0">
                          <div className="flex-1 bg-grey-900 border border-grey-800 rounded-xl p-4 flex flex-col justify-center">
                            <div className="text-[10px] text-grey-500 uppercase font-bold tracking-widest mb-1">Case</div>
                            <div className="text-sm font-serif text-grey-100">{resultsEstimation.caseName}</div>
                          </div>
                          <div className="flex-[2] bg-grey-900 border border-grey-800 rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-sky-500 to-transparent"></div>
                            <div className="text-[10px] text-sky-500/80 uppercase tracking-widest font-bold mb-2">Confidence Interval</div>
                            <div className="flex items-center gap-3">
                              <span className="text-2xl lg:text-3xl font-mono text-grey-50">{resultsEstimation.lowerBound.toFixed(4)}</span>
                              <span className="text-lg font-serif text-grey-600 italic">≤ µ ≤</span>
                              <span className="text-2xl lg:text-3xl font-mono text-grey-50">{resultsEstimation.upperBound.toFixed(4)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2 shrink-0">
                          <StepCard step="1" label="Alpha (α)" lines={[`α = ${resultsEstimation.alpha.toFixed(2)}`, `α/2 = ${resultsEstimation.alphaHalf.toFixed(3)}`]} />
                          <StepCard step="2" label="Critical Val" lines={[resultsEstimation.criticalName, `= ${resultsEstimation.criticalValue.toFixed(4)}`]} highlight />
                          <StepCard step="3" label="Std. Error" lines={[`SE = ${sigmaKnown ? 'σ' : 's'}/√n`, `= ${resultsEstimation.standardError.toFixed(4)}`]} />
                          <StepCard step="4" label="Margin (E)" lines={[`E = Crit × SE`, `= ${resultsEstimation.marginOfError.toFixed(4)}`]} highlight />
                        </div>
                        <FormulaCard
                          label="Applied Formula & Substitution"
                          className="shrink-0"
                          formulas={[
                            `\\bar{X} ${resultsEstimation.useZ ? `- Z_{\\alpha/2}` : `- t_{(\\alpha/2,\\, n-1)}`} \\frac{${sigmaKnown ? '\\sigma' : 's'}}{\\sqrt{n}} < \\mu < \\bar{X} ${resultsEstimation.useZ ? `+ Z_{\\alpha/2}` : `+ t_{(\\alpha/2,\\, n-1)}`} \\frac{${sigmaKnown ? '\\sigma' : 's'}}{\\sqrt{n}}`,
                            `${statsFromRaw.mean.toFixed(4)} - ${resultsEstimation.criticalValue.toFixed(4)} \\left(\\frac{${statsFromRaw.stdDev.toFixed(4)}}{\\sqrt{${statsFromRaw.n}}}\\right) < \\mu < ${statsFromRaw.mean.toFixed(4)} + ${resultsEstimation.criticalValue.toFixed(4)} \\left(\\frac{${statsFromRaw.stdDev.toFixed(4)}}{\\sqrt{${statsFromRaw.n}}}\\right)`,
                            `\\boxed{${resultsEstimation.lowerBound.toFixed(4)} < \\mu < ${resultsEstimation.upperBound.toFixed(4)}}`,
                          ]}
                        />
                        <div className="bg-grey-900 border border-grey-800 rounded-xl p-3 h-[220px] shrink-0 overflow-hidden">
                          <div className="h-full w-full">
                            <Line data={resultsEstimation.chartData} options={{
                              responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
                              elements: { point: { radius: 0 } },
                              scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8a7d77', font: { size: 10 }, maxTicksLimit: 10 } }, y: { grid: { display: false }, ticks: { display: false } } },
                              plugins: { legend: { display: false }, tooltip: { intersect: false, bodyFont: { size: 10, family: 'Inter' } } }
                            }} />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <div className="text-7xl mb-3 select-none">
                          <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber-500 mx-auto"><circle cx="12" cy="12" r="10"/><path d="M8 15h8"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/></svg>
                        </div>
                        <h3 className="text-xl font-serif text-grey-200 mb-2">Quack! Something's off...</h3>
                        <p className="text-grey-500 text-sm max-w-xs leading-relaxed">Check your inputs — <span className="text-grey-300">n</span> and <span className="text-grey-300">std dev</span> must be greater than zero.</p>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="hyp-res" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }} className="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
                    {resultsHypothesis ? (
                      <>
                        <div className="flex gap-3 shrink-0">
                          <div className={`flex-1 border rounded-xl p-4 flex flex-col items-center justify-center relative overflow-hidden transition-all ${resultsHypothesis.isReject ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                            <div className="text-[10px] uppercase tracking-widest font-bold mb-1 opacity-60">Decision</div>
                            <div className={`text-2xl font-serif font-bold ${resultsHypothesis.isReject ? 'text-red-400' : 'text-emerald-400'}`}>
                              {resultsHypothesis.isReject ? 'Reject H₀' : 'Fail to Reject H₀'}
                            </div>
                          </div>
                          <div className="flex-[1.5] bg-grey-900 border border-grey-800 rounded-xl p-4 flex flex-col justify-center">
                            <div className="text-[10px] text-grey-500 uppercase font-bold tracking-widest mb-1 italic">Reasoning</div>
                            <div className="text-xs font-mono text-grey-300 leading-relaxed">{resultsHypothesis.decisionReason}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 shrink-0">
                          <StepCard step="1" label="Test Statistic" lines={[`${resultsHypothesis.useZ ? 'Z' : 'T'}_calc = ${resultsHypothesis.testStatistic.toFixed(4)}`]} highlight />
                          <StepCard step="2" label="Critical Values" lines={[
                            altHypothesis === 'not_equal' ? `± ${resultsHypothesis.criticalValueUpper.toFixed(4)}` :
                            altHypothesis === 'greater' ? `+ ${resultsHypothesis.criticalValueUpper.toFixed(4)}` :
                            `- ${Math.abs(resultsHypothesis.criticalValueLower).toFixed(4)}`
                          ]} />
                          <StepCard step="3" label="Sample Info" lines={[`Mean: ${statsFromRaw.mean.toFixed(2)}`, `n: ${statsFromRaw.n}`]} />
                        </div>
                        <FormulaCard
                          label="Test Statistic Formula & Substitution"
                          className="shrink-0"
                          formulas={[
                            `${resultsHypothesis.useZ ? 'Z' : 'T'} = \\frac{\\bar{X} - \\mu_0}{${sigmaKnown ? '\\sigma' : 's'} / \\sqrt{n}}`,
                            `${resultsHypothesis.useZ ? 'Z' : 'T'} = \\frac{${statsFromRaw.mean.toFixed(4)} - ${h0Mean}}{${statsFromRaw.stdDev.toFixed(4)} / \\sqrt{${statsFromRaw.n}}} = ${resultsHypothesis.testStatistic.toFixed(4)}`,
                            altHypothesis === 'not_equal'
                              ? `\\text{Reject } H_0 \\text{ if } |${resultsHypothesis.useZ ? 'Z' : 'T'}| > ${resultsHypothesis.criticalValueUpper.toFixed(4)} \\quad \\Rightarrow \\quad |${resultsHypothesis.testStatistic.toFixed(4)}| = ${Math.abs(resultsHypothesis.testStatistic).toFixed(4)} ${resultsHypothesis.isReject ? '>' : '\\leq'} ${resultsHypothesis.criticalValueUpper.toFixed(4)}`
                              : altHypothesis === 'greater'
                                ? `\\text{Reject } H_0 \\text{ if } ${resultsHypothesis.useZ ? 'Z' : 'T'} > ${resultsHypothesis.criticalValueUpper.toFixed(4)} \\quad \\Rightarrow \\quad ${resultsHypothesis.testStatistic.toFixed(4)} ${resultsHypothesis.isReject ? '>' : '\\leq'} ${resultsHypothesis.criticalValueUpper.toFixed(4)}`
                                : `\\text{Reject } H_0 \\text{ if } ${resultsHypothesis.useZ ? 'Z' : 'T'} < ${resultsHypothesis.criticalValueLower.toFixed(4)} \\quad \\Rightarrow \\quad ${resultsHypothesis.testStatistic.toFixed(4)} ${resultsHypothesis.isReject ? '<' : '\\geq'} ${resultsHypothesis.criticalValueLower.toFixed(4)}`,
                          ]}
                        />
                        <div className="bg-grey-900 border border-grey-800 rounded-xl p-3 h-[220px] shrink-0 overflow-hidden">
                          <div className="h-full w-full">
                            <Line data={resultsHypothesis.chartData} options={{
                              responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
                              plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => `y: ${(context.parsed.y ?? 0).toFixed(4)}` } } },
                              scales: { x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#666', font: { size: 9 } } }, y: { display: false } }
                            }} />
                          </div>
                        </div>
                      </>
                    ) : null}
                  </motion.div>
                )}
                </AnimatePresence>
              </div>

              {/* Right-side arrow flipper */}
              <div className="hidden md:flex flex-col items-center justify-center shrink-0 w-10">
                <button
                  onClick={() => { playTick(); setProbView(probView === 'estimation' ? 'hypothesis' : 'estimation'); }}
                  className="group flex flex-col items-center gap-3 py-6 px-1 rounded-xl border border-grey-800 bg-grey-900 hover:border-grey-600 hover:bg-grey-800 transition-all cursor-pointer"
                  title={probView === 'estimation' ? 'Switch to Hypothesis Testing' : 'Switch to Estimation'}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-grey-400 group-hover:text-grey-100 transition-colors">
                    {probView === 'estimation'
                      ? <polyline points="9 18 15 12 9 6" />
                      : <polyline points="15 18 9 12 15 6" />}
                  </svg>
                  <span
                    className="text-[9px] font-bold uppercase tracking-[0.2em] text-grey-500 group-hover:text-grey-300 transition-colors"
                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                  >
                    {probView === 'estimation' ? 'Hypothesis' : 'Estimation'}
                  </span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-grey-400 group-hover:text-grey-100 transition-colors">
                    {probView === 'estimation'
                      ? <polyline points="9 18 15 12 9 6" />
                      : <polyline points="15 18 9 12 15 6" />}
                  </svg>
                </button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

/* ── Reusable sub-components ── */

function InputField({ label, value, onChange, min, step }: { label: string, value: number, onChange: (v: number) => void, min?: number, step?: number }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-grey-500 mb-1.5 uppercase tracking-wider">{label}</label>
      <input
        type="number"
        className="w-full bg-grey-950 border border-grey-800 rounded-lg px-3 py-2 text-sm text-grey-100 focus:border-grey-500 focus:outline-none focus:ring-1 focus:ring-grey-500/30 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        value={value}
        min={min}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </div>
  );
}

function StepCard({ step, label, lines, highlight }: { step: string, label: string, lines: string[], highlight?: boolean }) {
  return (
    <div className={`bg-grey-900 border rounded-xl p-3 ${highlight ? 'border-grey-600' : 'border-grey-800'}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="w-4 h-4 rounded-full bg-grey-800 text-grey-400 text-[9px] font-bold flex items-center justify-center">{step}</span>
        <span className="text-[10px] text-grey-500 uppercase font-bold tracking-wide">{label}</span>
      </div>
      {lines.map((l, i) => (
        <div key={i} className={`font-mono text-xs ${i === lines.length - 1 && highlight ? 'text-grey-100 font-bold' : 'text-grey-400'}`}>{l}</div>
      ))}
    </div>
  );
}
