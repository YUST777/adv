import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface LatexProps {
  math: string;
  display?: boolean;
  className?: string;
}

export default function Latex({ math, display = false, className = '' }: LatexProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode: display,
        throwOnError: false,
        trust: true,
      });
    } catch {
      return math;
    }
  }, [math, display]);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// Card that shows a labeled formula
export function FormulaCard({ label, formulas, className = '' }: { label: string; formulas: string[]; className?: string }) {
  return (
    <div className={`bg-grey-950/60 border border-grey-800/50 rounded-xl p-2 ${className}`}>
      <div className="text-[8px] uppercase tracking-widest font-bold text-grey-500 mb-1.5">{label}</div>
      <div className="space-y-1">
        {formulas.map((f, i) => (
          <div key={i} className="flex justify-center" style={{ fontSize: '0.7em' }}>
            <Latex math={f} display className="text-grey-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
