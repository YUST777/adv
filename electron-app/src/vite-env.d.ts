/// <reference types="vite/client" />

declare module '*.md?raw' {
  const content: string;
  export default content;
}

interface Window {
  electronAPI: {
    platform: string;
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    openMiniCalc: () => void;
  };
}
