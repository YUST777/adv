import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  sendChatMessage,
  fileToBase64,
  extractPdfText,
  browserTTS,
  textToSpeech,
  stopBrowserTTS,
  startSpeechRecognition,
  type ChatMessage,
} from './geminiService';
import { SYSTEM_PROMPT } from './knowledge';
import { VIDEO_SYSTEM_PROMPT } from './knowledge/video-prompt';
import { playClick, playTick, playError } from './sounds';

interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  fileName?: string;
  videoHtml?: string;
  timestamp: Date;
}

interface Chat {
  id: string;
  title: string;
  messages: UIMessage[];
  history: ChatMessage[];
}

const WELCOME_MSG: UIMessage = {
  id: 'welcome',
  role: 'assistant',
  text: "Hey there! I'm **Mathly AI** — your tutor for Numerical Methods and Probability & Statistics. Ask me anything, or upload a photo/PDF of a problem!",
  timestamp: new Date(),
};

function createChat(): Chat {
  return { id: Date.now().toString(), title: 'New Chat', messages: [WELCOME_MSG], history: [] };
}

export default function AiTutor() {
  const [chats, setChats] = useState<Chat[]>([createChat()]);
  const [activeChatId, setActiveChatId] = useState(chats[0].id);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [vidMode, setVidMode] = useState(false);
  const [viewingVideo, setViewingVideo] = useState<string | null>(null);
  const [aiLang, setAiLang] = useState<'en' | 'ar'>('en');
  const [showSettings, setShowSettings] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const dragCounter = useRef(0);

  const activeChat = chats.find(c => c.id === activeChatId) || chats[0];

  // Auto-scroll
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeChat.messages]);
  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [input]);
  // Cleanup
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    recognitionRef.current?.stop();
    currentAudioRef.current?.pause();
    stopBrowserTTS();
  }, []);

  // Update active chat helper
  const updateChat = useCallback((chatId: string, updater: (c: Chat) => Chat) => {
    setChats(prev => prev.map(c => c.id === chatId ? updater(c) : c));
  }, []);

  // New chat
  const handleNewChat = () => {
    playClick();
    const c = createChat();
    setChats(prev => [...prev, c]);
    setActiveChatId(c.id);
    setInput('');
    setAttachedFile(null);
  };

  // Delete chat
  const handleDeleteChat = (id: string) => {
    playClick();
    setChats(prev => {
      const next = prev.filter(c => c.id !== id);
      if (next.length === 0) {
        const c = createChat();
        setActiveChatId(c.id);
        return [c];
      }
      if (activeChatId === id) setActiveChatId(next[next.length - 1].id);
      return next;
    });
  };

  // Send message
  const handleSend = useCallback(async () => {
    const text = input.trim();
    const file = attachedFile;
    if (!text && !file) return;
    if (isLoading) return;

    playClick();
    const chatId = activeChatId;
    const userMsg: UIMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: text || (file ? `[Uploaded: ${file.name}]` : ''),
      fileName: file?.name,
      timestamp: new Date(),
    };

    // Update title from first user message
    updateChat(chatId, c => ({
      ...c,
      messages: [...c.messages, userMsg],
      title: c.messages.length <= 1 ? (text || file?.name || 'New Chat').slice(0, 30) : c.title,
    }));

    setInput('');
    setAttachedFile(null);
    setIsLoading(true);

    try {
      const parts: ChatMessage['parts'] = [];
      if (text) parts.push({ text });

      if (file) {
        const isImage = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf';

        if (isImage) {
          const base64 = await fileToBase64(file);
          parts.push({ inlineData: { mimeType: file.type, data: base64 } });
          if (!text) parts.unshift({ text: 'Please analyze this image. Describe what you see and solve any math problems shown step by step.' });
        } else if (isPdf) {
          const pdfText = await extractPdfText(file);
          const content = pdfText.trim() ? pdfText.slice(0, 15000) : '[Could not extract text from PDF]';
          const prompt = `${text ? text + '\n\n' : 'Analyze this PDF and help me with the content:\n\n'}--- PDF: "${file.name}" ---\n${content}`;
          if (parts.length > 0 && parts[0].text) parts[0].text = prompt;
          else parts.unshift({ text: prompt });
        } else {
          try {
            const fileText = await file.text();
            const prompt = `${text ? text + '\n\n' : 'Analyze this file:\n\n'}--- File: "${file.name}" ---\n${fileText.slice(0, 15000)}`;
            if (parts.length > 0 && parts[0].text) parts[0].text = prompt;
            else parts.unshift({ text: prompt });
          } catch {
            parts.unshift({ text: `[Could not read "${file.name}". Please describe the content.]` });
          }
        }
      }

      // Get current history for this chat
      const currentChat = chats.find(c => c.id === chatId);
      const history = [...(currentChat?.history || []), { role: 'user' as const, parts }];

      // Use video prompt if @vid mode is active
      const langInstruction = aiLang === 'ar' ? '\n\nIMPORTANT: Respond entirely in Arabic. All text, explanations, and content must be in Arabic.' : '';
      const vidLangInstruction = aiLang === 'ar' ? `\n\nCRITICAL ARABIC RULES:
- All text content must be in Arabic.
- Add direction:rtl to body and all scene elements.
- Use font-family: 'Segoe UI', Tahoma, Arial, sans-serif for Arabic.
- Headlines must have line-height: 1.4 (not 0.92 or 1.02 — Arabic needs more line spacing).
- Set word-wrap: break-word and max-width: 90% on all text elements.
- Reduce headline font-size to 52px max (Arabic characters are wider).
- Add letter-spacing: 0 (no negative letter-spacing for Arabic).
- Use text-align: center on headlines.
- Keep math formulas and variable names (like x, f(x), n) in English/LTR using <span dir="ltr"> tags.` : '';
      const prompt = vidMode ? VIDEO_SYSTEM_PROMPT + vidLangInstruction : SYSTEM_PROMPT + langInstruction;
      const response = await sendChatMessage(history, prompt);

      // If vid mode, extract HTML and show in chat
      if (vidMode && response.includes('<!DOCTYPE html>')) {
        const htmlStart = response.indexOf('<!DOCTYPE html>');
        const htmlEnd = response.lastIndexOf('</html>') + 7;
        let htmlContent = response.slice(htmlStart, htmlEnd);

        // Force-fix Arabic typography if Arabic mode
        if (aiLang === 'ar') {
          const arabicFix = `<style>
            * { word-wrap: break-word !important; overflow-wrap: break-word !important; }
            body { direction: rtl !important; }
            .headline, .display, h1, h2, h3 {
              font-size: clamp(28px, 5vw, 48px) !important;
              line-height: 1.5 !important;
              letter-spacing: 0 !important;
              max-width: 85% !important;
              margin-left: auto !important;
              margin-right: auto !important;
            }
            .lede, p, .chip, span {
              line-height: 1.6 !important;
              letter-spacing: 0 !important;
            }
          </style>`;
          htmlContent = htmlContent.replace('</head>', arabicFix + '</head>');
        }

        const newHistory = [...history, { role: 'model' as const, parts: [{ text: '[Video generated]' }] }];
        const assistantMsg: UIMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: '**Video generated!** Click the preview below to watch it fullscreen.',
          videoHtml: htmlContent,
          timestamp: new Date(),
        };
        updateChat(chatId, c => ({ ...c, messages: [...c.messages, assistantMsg], history: newHistory }));
        setVidMode(false);
      } else {
        const newHistory = [...history, { role: 'model' as const, parts: [{ text: response }] }];
        const assistantMsg: UIMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          text: response,
          timestamp: new Date(),
        };
        updateChat(chatId, c => ({ ...c, messages: [...c.messages, assistantMsg], history: newHistory }));
      }
      playTick();
    } catch (err: any) {
      playError();
      updateChat(chatId, c => ({
        ...c,
        messages: [...c.messages, { id: (Date.now() + 1).toString(), role: 'assistant', text: `Error: ${err.message}`, timestamp: new Date() }],
      }));
    } finally {
      setIsLoading(false);
    }
  }, [input, attachedFile, isLoading, activeChatId, chats, updateChat]);

  // TTS
  const stopSpeaking = useCallback(() => {
    currentAudioRef.current?.pause(); currentAudioRef.current = null;
    stopBrowserTTS(); setSpeakingMsgId(null);
  }, []);

  const handleSpeak = useCallback(async (msgId: string, text: string) => {
    if (speakingMsgId === msgId) { stopSpeaking(); return; }
    stopSpeaking(); setSpeakingMsgId(msgId);
    try {
      const buf = await textToSpeech(text);
      const blob = new Blob([buf], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioRef.current = audio;
      audio.onended = () => { setSpeakingMsgId(null); currentAudioRef.current = null; URL.revokeObjectURL(url); };
      audio.onerror = () => { URL.revokeObjectURL(url); currentAudioRef.current = null; browserTTS(text, () => setSpeakingMsgId(null)); };
      await audio.play();
    } catch { browserTTS(text, () => setSpeakingMsgId(null)); }
  }, [speakingMsgId, stopSpeaking]);

  // STT
  const handleVoiceToggle = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop(); recognitionRef.current = null;
      setIsRecording(false);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setRecordingTime(0); return;
    }
    playClick();
    const rec = startSpeechRecognition(
      t => setInput(prev => prev ? prev + ' ' + t : t),
      () => { setIsRecording(false); recognitionRef.current = null; if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } setRecordingTime(0); },
      err => { playError(); console.warn('STT:', err); }
    );
    if (rec) { recognitionRef.current = rec; setIsRecording(true); setRecordingTime(0); timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000); }
  }, [isRecording]);

  // File attach
  const attachFile = useCallback((file: File) => {
    if (file.size > 20 * 1024 * 1024) { playError(); return; }
    playClick(); setAttachedFile(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) attachFile(f); if (e.target) e.target.value = '';
  };

  // Paste
  useEffect(() => {
    const h = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items; if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') { const f = items[i].getAsFile(); if (f) { e.preventDefault(); attachFile(f); return; } }
      }
    };
    document.addEventListener('paste', h); return () => document.removeEventListener('paste', h);
  }, [attachFile]);

  // Drag & drop
  const handleDragEnter = useCallback((e: React.DragEvent) => { e.preventDefault(); dragCounter.current++; if (e.dataTransfer.types.includes('Files')) setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); dragCounter.current--; if (dragCounter.current === 0) setIsDragging(false); }, []);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); dragCounter.current = 0; const f = e.dataTransfer.files?.[0]; if (f) attachFile(f); }, [attachFile]);

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // Markdown renderer
  const renderMarkdown = (text: string) => text.split('\n').map((line, i) => {
    let p = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-grey-50 font-semibold">$1</strong>');
    p = p.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em class="font-emp italic">$1</em>');
    p = p.replace(/`(.*?)`/g, '<code class="bg-grey-800 px-1.5 py-0.5 rounded text-amber-300 text-[11px] font-mono">$1</code>');
    if (line.startsWith('### ')) return <h4 key={i} className="text-sm font-serif font-bold text-grey-100 mt-3 mb-1">{line.slice(4)}</h4>;
    if (line.startsWith('## ')) return <h3 key={i} className="text-base font-serif font-bold text-grey-50 mt-4 mb-1">{line.slice(3)}</h3>;
    if (line.startsWith('- ')) return <li key={i} className="ml-4 text-grey-200 text-sm leading-relaxed list-disc" dangerouslySetInnerHTML={{ __html: p.slice(2) }} />;
    const nm = line.match(/^(\d+)\.\s/);
    if (nm) return <li key={i} className="ml-4 text-grey-200 text-sm leading-relaxed list-decimal" dangerouslySetInnerHTML={{ __html: p.slice(nm[0].length) }} />;
    if (!line.trim()) return <div key={i} className="h-2" />;
    return <p key={i} className="text-grey-200 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: p }} />;
  });

  const mainContent = (
    <div className="flex-1 flex h-full overflow-hidden animate-fade-in"
      onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}
    >
      {/* Drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-grey-950/80 backdrop-blur-sm flex items-center justify-center border-2 border-dashed border-sky-500/50 rounded-xl">
            <div className="text-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-sky-400 mx-auto mb-2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <p className="text-sky-300 font-semibold text-sm">Drop any file here</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat sidebar — collapsible */}
      <div className={`shrink-0 bg-grey-950 border-r border-grey-800 flex flex-col h-full transition-all duration-200 ${sidebarOpen ? 'w-48' : 'w-10'}`}>
        {/* Toggle + New Chat */}
        <div className={`flex items-center gap-1 p-1.5 ${sidebarOpen ? '' : 'flex-col'}`}>
          <button onClick={() => { setSidebarOpen(!sidebarOpen); playTick(); }}
            className="p-1.5 text-grey-500 hover:text-grey-200 hover:bg-grey-800 rounded-lg transition-colors shrink-0" title={sidebarOpen ? 'Collapse' : 'Expand'}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {sidebarOpen
                ? <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
                : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
            </svg>
          </button>
          <button onClick={handleNewChat}
            className={`p-1.5 text-grey-500 hover:text-grey-200 hover:bg-grey-800 rounded-lg transition-colors shrink-0 ${sidebarOpen ? 'ml-auto' : ''}`} title="New Chat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-1 space-y-0.5">
          {[...chats].reverse().map(c => (
            <div key={c.id}
              onClick={() => { setActiveChatId(c.id); playTick(); }}
              className={`group flex items-center gap-1.5 rounded-lg cursor-pointer transition-all ${
                sidebarOpen ? 'px-2 py-1.5' : 'px-0 py-1 justify-center'
              } ${c.id === activeChatId ? 'bg-grey-800 text-grey-100' : 'text-grey-500 hover:text-grey-300 hover:bg-grey-900'}`}
              title={sidebarOpen ? undefined : c.title}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-50">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              {sidebarOpen && (
                <>
                  <span className="truncate flex-1 text-[11px]">{c.title}</span>
                  {chats.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteChat(c.id); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-grey-700 rounded transition-all shrink-0">
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" className="text-grey-500"><path d="M2 2L10 10M10 2L2 10"/></svg>
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Settings */}
        <div className="shrink-0 border-t border-grey-800 p-1.5 relative">
          <button onClick={() => { setShowSettings(!showSettings); playTick(); }}
            className={`w-full flex items-center gap-1.5 p-1.5 rounded-lg transition-colors ${showSettings ? 'bg-grey-800 text-grey-200' : 'text-grey-500 hover:text-grey-300 hover:bg-grey-900'} ${sidebarOpen ? '' : 'justify-center'}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            {sidebarOpen && <span className="text-[10px] font-bold uppercase tracking-wider">Settings</span>}
          </button>
          <AnimatePresence>
            {showSettings && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                className={`${sidebarOpen ? 'pt-2' : 'absolute bottom-full left-0 mb-2 ml-1'} z-50`}>
                <div className={`space-y-2 ${sidebarOpen ? '' : 'bg-grey-900 border border-grey-700 rounded-xl p-3 shadow-xl w-40'}`}>
                  <div>
                    <label className="block text-[9px] font-bold text-grey-500 uppercase tracking-wider mb-1.5 px-0.5">AI Language</label>
                    <div className="flex gap-1">
                      <button onClick={() => { setAiLang('en'); playClick(); }}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${aiLang === 'en' ? 'bg-grey-700 text-grey-100 border border-grey-600' : 'bg-grey-950 text-grey-500 border border-grey-800 hover:border-grey-700'}`}>
                        EN
                      </button>
                      <button onClick={() => { setAiLang('ar'); playClick(); }}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${aiLang === 'ar' ? 'bg-grey-700 text-grey-100 border border-grey-600' : 'bg-grey-950 text-grey-500 border border-grey-800 hover:border-grey-700'}`}>
                        AR
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 md:px-4 py-4 space-y-4">
          <AnimatePresence initial={false}>
            {activeChat.messages.map(msg => (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 relative group ${
                  msg.role === 'user' ? 'bg-grey-700 border border-grey-600' : 'bg-grey-900 border border-grey-800'}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${msg.role === 'assistant' ? 'text-amber-500/80' : 'text-grey-400'}`}>
                      {msg.role === 'assistant' ? 'Mathly AI' : 'You'}
                    </span>
                    <span className="text-[9px] text-grey-600 font-mono">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {msg.fileName && (
                    <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-grey-800 rounded-lg w-fit">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-400">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <span className="text-[10px] text-sky-300 font-mono truncate max-w-[200px]">{msg.fileName}</span>
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {msg.role === 'assistant' ? renderMarkdown(msg.text) : <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                  </div>
                  {/* Video preview card */}
                  {msg.videoHtml && (
                    <div className="mt-3 border border-grey-700 rounded-xl overflow-hidden cursor-pointer hover:border-grey-500 transition-all group/vid"
                      onClick={() => setViewingVideo(msg.videoHtml!)}>
                      <div className="h-48 bg-grey-950 relative overflow-hidden">
                        <iframe
                          srcDoc={msg.videoHtml}
                          className="w-full h-full border-0 pointer-events-none scale-[0.5] origin-top-left"
                          style={{ width: '200%', height: '200%' }}
                          sandbox="allow-scripts"
                          title="Video thumbnail"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover/vid:bg-black/10 transition-all">
                          <div className="w-14 h-14 rounded-full bg-grey-800/90 border-2 border-grey-500 flex items-center justify-center group-hover/vid:scale-110 group-hover/vid:border-grey-300 transition-transform">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="text-grey-100 ml-1">
                              <polygon points="5 3 19 12 5 21 5 3"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div className="px-4 py-2.5 bg-grey-900 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-grey-300 uppercase tracking-wider flex items-center gap-2">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-500">
                            <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                          </svg>
                          Animated Explainer
                        </span>
                        <span className="text-[10px] text-grey-500 font-medium">Click to play fullscreen</span>
                      </div>
                    </div>
                  )}
                  {msg.role === 'assistant' && msg.id !== 'welcome' && (
                    <button onClick={() => handleSpeak(msg.id, msg.text)}
                      className="absolute -bottom-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-grey-800 border border-grey-700 rounded-full hover:bg-grey-700 shadow-lg"
                      title={speakingMsgId === msg.id ? 'Stop' : 'Read aloud'}>
                      {speakingMsgId === msg.id
                        ? <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-red-400"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                        : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-grey-300"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-grey-900 border border-grey-800 rounded-2xl px-4 py-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500/80">Mathly AI</span>
                <div className="flex gap-1 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-grey-500 animate-pulse"/><div className="w-1.5 h-1.5 rounded-full bg-grey-500 animate-pulse" style={{animationDelay:'0.2s'}}/><div className="w-1.5 h-1.5 rounded-full bg-grey-500 animate-pulse" style={{animationDelay:'0.4s'}}/>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef}/>
        </div>

        {/* Recording bar */}
        <AnimatePresence>
          {isRecording && (
            <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}
              className="flex items-center justify-center gap-3 py-2 bg-red-500/10 border-t border-red-500/20">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"/>
              <span className="text-xs font-mono text-red-400">{formatTime(recordingTime)}</span>
              <span className="text-[10px] text-red-400/80 uppercase tracking-wider font-bold">Listening...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* File preview */}
        <AnimatePresence>
          {attachedFile && (
            <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="px-4 pt-2">
              <div className="flex items-center gap-2 bg-grey-900 border border-grey-800 rounded-lg px-3 py-2 w-fit">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-400 shrink-0">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                <span className="text-xs text-grey-200 font-mono truncate max-w-[200px]">{attachedFile.name}</span>
                <button onClick={() => { playClick(); setAttachedFile(null); }} className="p-0.5 hover:bg-grey-700 rounded">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" className="text-grey-400"><path d="M2 2L10 10M10 2L2 10"/></svg>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="shrink-0 p-3 md:p-4">
          <div className={`flex items-end gap-2 bg-grey-900 border rounded-2xl p-2 transition-all ${isRecording ? 'border-red-500/50' : 'border-grey-700 focus-within:border-grey-500'}`}>
            <button onClick={() => fileInputRef.current?.click()} disabled={isLoading}
              className="shrink-0 p-2 text-grey-500 hover:text-grey-200 hover:bg-grey-800 rounded-xl transition-colors disabled:opacity-40" title="Attach file">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>
            <button onClick={() => { playClick(); setVidMode(!vidMode); }}
              className={`shrink-0 h-[34px] px-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border flex items-center justify-center ${
                vidMode ? 'bg-amber-500/15 border-amber-500/50 text-amber-400' : 'bg-transparent border-grey-800 text-grey-500 hover:text-grey-300 hover:border-grey-600'
              }`} title="Generate animated video explainer">
              @vid
            </button>
            <input ref={fileInputRef} type="file" className="hidden" accept="*/*" onChange={handleFileChange}/>
            <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={isRecording ? 'Listening...' : vidMode ? 'Describe the video topic (e.g. "Bisection method step by step")...' : 'Ask me anything...'} disabled={isLoading || isRecording}
              className="flex-1 bg-transparent text-sm text-grey-100 placeholder:text-grey-500 resize-none outline-none min-h-[40px] max-h-[160px] py-2 px-1" rows={1}/>
            <button onClick={handleVoiceToggle} disabled={isLoading}
              className={`shrink-0 p-2 rounded-xl transition-all disabled:opacity-40 ${isRecording ? 'text-red-400 bg-red-500/10' : 'text-grey-500 hover:text-grey-200 hover:bg-grey-800'}`}>
              {isRecording
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-red-400"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>}
            </button>
            <button onClick={handleSend} disabled={isLoading || (!input.trim() && !attachedFile)}
              className={`shrink-0 p-2 rounded-xl transition-all ${!isLoading && (input.trim() || attachedFile) ? 'bg-grey-100 text-grey-950 hover:bg-white shadow-md' : 'bg-grey-800 text-grey-600 cursor-not-allowed'}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
            </button>
          </div>
          {activeChat.messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 mt-3 justify-center">
              {['Explain Bisection method', 'What is a confidence interval?', 'Newton-Raphson vs Secant', 'How does hypothesis testing work?'].map(q => (
                <button key={q} onClick={() => { setInput(q); playTick(); }}
                  className="px-3 py-1.5 bg-grey-900 border border-grey-800 rounded-full text-[11px] text-grey-400 hover:text-grey-200 hover:border-grey-600 transition-all">{q}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  function VideoOverlay() {
    if (!viewingVideo) return null;
    
    // Inject pause/resume listener BEFORE the video's own scripts
    const pauseScript = `
<script>
(function() {
  var __paused = false;
  var __pendingTimeouts = [];
  var __origSetTimeout = window.setTimeout.bind(window);
  
  window.setTimeout = function(fn, ms) {
    if (__paused) {
      __pendingTimeouts.push({ fn: fn, ms: ms });
      return -1;
    }
    return __origSetTimeout(function() {
      if (!__paused) { if (typeof fn === 'function') fn(); }
      else __pendingTimeouts.push({ fn: fn, ms: 0 });
    }, ms);
  };

  window.addEventListener('message', function(e) {
    if (e.data === 'toggle-pause') {
      __paused = !__paused;
      try { document.getAnimations().forEach(function(a) { if (__paused) a.pause(); else a.play(); }); } catch(x){}
      if (!__paused) {
        var pending = __pendingTimeouts.splice(0);
        pending.forEach(function(p) { __origSetTimeout(typeof p.fn === 'function' ? p.fn : function(){}, p.ms); });
      }
      window.parent.postMessage(__paused ? 'paused' : 'playing', '*');
    }
  });
})();
</script>`;
    const patchedHtml = viewingVideo.replace('<body>', '<body>' + pauseScript);

    const blob = new Blob([patchedHtml], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    const iframeRef = React.useRef<HTMLIFrameElement>(null);
    const [paused, setPaused] = React.useState(false);

    // Listen for iframe responses
    React.useEffect(() => {
      const handler = (e: MessageEvent) => {
        if (e.data === 'paused') setPaused(true);
        if (e.data === 'playing') setPaused(false);
      };
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    }, []);

    // Spacebar to pause/resume, Escape to close
    React.useEffect(() => {
      const handler = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
          e.preventDefault();
          e.stopPropagation();
          iframeRef.current?.contentWindow?.postMessage('toggle-pause', '*');
        }
        if (e.code === 'Escape') {
          setViewingVideo(null);
          URL.revokeObjectURL(blobUrl);
        }
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }, [blobUrl]);

    const handleDownload = () => {
      const a = document.createElement('a');
      const downloadBlob = new Blob([viewingVideo], { type: 'text/html' });
      const downloadUrl = URL.createObjectURL(downloadBlob);
      a.href = downloadUrl;
      a.download = `mathly-video-${Date.now()}.html`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
    };

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black flex flex-col"
      >
        <div className="h-11 shrink-0 flex items-center justify-between px-4 bg-grey-950 border-b border-grey-800">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-grey-300 uppercase tracking-wider">Video Preview</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${paused ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {paused ? 'PAUSED' : 'PLAYING'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-grey-600 font-mono">SPACE to pause/play | ESC to close</span>
            <button onClick={handleDownload}
              className="px-3 py-1.5 bg-grey-800 border border-grey-700 rounded-lg text-[11px] font-bold text-grey-300 hover:text-grey-100 hover:border-grey-500 transition-all flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download .html
            </button>
            <button onClick={() => { setViewingVideo(null); URL.revokeObjectURL(blobUrl); }}
              className="p-1.5 hover:bg-grey-800 rounded-lg transition-colors text-grey-400 hover:text-grey-100">
              <svg width="16" height="16" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 2L10 10M10 2L2 10"/></svg>
            </button>
          </div>
        </div>
        <iframe
          ref={iframeRef}
          src={blobUrl}
          className="flex-1 w-full border-0"
          sandbox="allow-scripts allow-same-origin"
          title="Video Preview"
        />
      </motion.div>
    );
  }

  return (
    <>
      {mainContent}
      <AnimatePresence>
        {viewingVideo && <VideoOverlay />}
      </AnimatePresence>
    </>
  );
}
