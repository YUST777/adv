import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// ── Env ──
function getChatKey() { return import.meta.env.VITE_CHAT_API_KEY || ''; }
function getChatUrl() { return import.meta.env.VITE_CHAT_API_URL || ''; }
function getChatModel() { return import.meta.env.VITE_CHAT_MODEL || 'claude-sonnet-4.5'; }
function getGroqKey() { return import.meta.env.VITE_GROQ_API_KEY || ''; }
function getGeminiKey() { return import.meta.env.VITE_GEMINI_API_KEY || ''; }
function getOpenRouterKey() { return import.meta.env.VITE_OPEN_ROUTER_API_KEY || import.meta.env.VITE_OPENROUTER_API_KEY || ''; }
function getOpenRouterModel() { return import.meta.env.VITE_OPENROUTER_MODEL || 'google/gemini-2.0-flash-lite-preview-02-05:free'; }

const GROQ_BASE = 'https://api.groq.com/openai/v1';
const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_TTS_MODEL = 'canopylabs/orpheus-v1-english';
const GROQ_STT_MODEL = 'whisper-large-v3-turbo';
const GEMINI_MODEL = 'gemini-2.0-flash';

// ── Types ──
export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text?: string; inlineData?: { mimeType: string; data: string } }[];
}

// ── File utilities ──

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result as string;
      const i = r.indexOf(',');
      resolve(i === -1 ? r : r.slice(i + 1));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export async function extractPdfText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item: any) => item.str).join(' ');
    if (text.trim()) pages.push(`[Page ${i}]\n${text}`);
  }
  return pages.join('\n\n');
}

// ── Chat: routes to Claude (text) or Groq Vision (images) ──

export async function sendChatMessage(
  history: ChatMessage[],
  systemInstruction: string
): Promise<string> {
  // Check if the latest user message has images
  const lastMsg = history[history.length - 1];
  const hasImages = lastMsg?.parts.some(p => p.inlineData?.mimeType.startsWith('image/'));

  // If there are images and we have OpenRouter configured, try it first
  if (hasImages && getOpenRouterKey()) {
    try {
      return await sendViaOpenRouter(history, systemInstruction);
    } catch (e) {
      console.warn('[AI] OpenRouter Vision failed, falling back to Groq...', e);
    }
  }

  if (hasImages) {
    // Use shorter prompt for vision model
    const { VISION_SYSTEM_PROMPT } = await import('./knowledge');
    return sendViaGroqVision(history, VISION_SYSTEM_PROMPT);
  }

  // Try Gemini first, then Claude, then Groq as last resort
  const geminiKey = getGeminiKey();
  if (geminiKey) {
    try {
      return await sendViaGemini(history, systemInstruction);
    } catch (e) {
      console.warn('[AI] Gemini failed, trying Claude...', e);
    }
  }

  // Try OpenRouter (newly added)
  const orKey = getOpenRouterKey();
  if (orKey) {
    try {
      return await sendViaOpenRouter(history, systemInstruction);
    } catch (e) {
      console.warn('[AI] OpenRouter failed, trying Claude...', e);
    }
  }

  const claudeKey = getChatKey();
  const claudeUrl = getChatUrl();
  if (claudeKey && claudeUrl) {
    try {
      return await sendViaClaude(history, systemInstruction);
    } catch (e) {
      console.warn('[AI] Claude failed, falling back to Groq...', e);
    }
  }

  return sendViaGroqText(history, systemInstruction);
}

// Text-only → Claude endpoint
async function sendViaClaude(history: ChatMessage[], systemPrompt: string): Promise<string> {
  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
  ];
  for (const msg of history) {
    const role = msg.role === 'model' ? 'assistant' : 'user';
    const text = msg.parts.map(p => p.text || '').filter(Boolean).join('\n');
    if (text) messages.push({ role, content: text });
  }

  const res = await fetch(getChatUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getChatKey()}` },
    body: JSON.stringify({ model: getChatModel(), messages, temperature: 0.7, max_tokens: 4096, stream: false }),
  });
  if (!res.ok) throw new Error(`Chat API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  // Detect soft errors — proxy may return 200 with error text in body
  const errorPatterns = ['authentication expired', 'unauthorized', 'invalid api key', 'rate limit', 'service unavailable', 'internal server error'];
  if (!content || errorPatterns.some(p => content.toLowerCase().includes(p))) {
    throw new Error(`Claude soft error: ${content.slice(0, 100) || 'empty response'}`);
  }
  return content;
}

// Text-only → Gemini (second fallback)
async function sendViaGemini(history: ChatMessage[], systemPrompt: string): Promise<string> {
  const contents: { role: string; parts: { text: string }[] }[] = [];

  for (const msg of history) {
    const role = msg.role === 'model' ? 'model' : 'user';
    const text = msg.parts.map(p => p.text || '').filter(Boolean).join('\n');
    if (text) contents.push({ role, parts: [{ text }] });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${getGeminiKey()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';
}

// Text → Groq (fallback when Claude is down)
async function sendViaGroqText(history: ChatMessage[], systemPrompt: string): Promise<string> {
  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
  ];
  for (const msg of history) {
    const role = msg.role === 'model' ? 'assistant' : 'user';
    const text = msg.parts.map(p => p.text || '').filter(Boolean).join('\n');
    if (text) messages.push({ role, content: text });
  }

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getGroqKey()}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, temperature: 0.7, max_tokens: 4096 }),
  });
  if (!res.ok) throw new Error(`Groq text error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'No response.';
}

// Image messages → Groq Vision
async function sendViaGroqVision(history: ChatMessage[], systemPrompt: string): Promise<string> {
  type ContentPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };
  const messages: { role: string; content: string | ContentPart[] }[] = [
    { role: 'system', content: systemPrompt },
  ];

  for (const msg of history) {
    const role = msg.role === 'model' ? 'assistant' : 'user';
    const hasImg = msg.parts.some(p => p.inlineData?.mimeType.startsWith('image/'));

    if (hasImg) {
      const parts: ContentPart[] = [];
      for (const p of msg.parts) {
        if (p.text) parts.push({ type: 'text', text: p.text });
        if (p.inlineData?.mimeType.startsWith('image/')) {
          parts.push({ type: 'image_url', image_url: { url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` } });
        }
      }
      messages.push({ role, content: parts });
    } else {
      const text = msg.parts.map(p => p.text || '').filter(Boolean).join('\n');
      if (text) messages.push({ role, content: text });
    }
  }

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getGroqKey()}` },
    body: JSON.stringify({ model: GROQ_VISION_MODEL, messages, temperature: 0.7, max_tokens: 4096 }),
  });
  if (!res.ok) throw new Error(`Vision API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'No response.';
}

// ── OpenRouter Integration ──
async function sendViaOpenRouter(history: ChatMessage[], systemPrompt: string): Promise<string> {
  type ContentPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };
  const messages: { role: string; content: string | ContentPart[] }[] = [
    { role: 'system', content: systemPrompt },
  ];

  for (const msg of history) {
    const role = msg.role === 'model' ? 'assistant' : 'user';
    const hasImg = msg.parts.some(p => p.inlineData?.mimeType.startsWith('image/'));

    if (hasImg) {
      const parts: ContentPart[] = [];
      for (const p of msg.parts) {
        if (p.text) parts.push({ type: 'text', text: p.text });
        if (p.inlineData?.mimeType.startsWith('image/')) {
          parts.push({ type: 'image_url', image_url: { url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` } });
        }
      }
      messages.push({ role, content: parts });
    } else {
      const text = msg.parts.map(p => p.text || '').filter(Boolean).join('\n');
      if (text) messages.push({ role, content: text });
    }
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getOpenRouterKey()}`,
      'HTTP-Referer': 'https://mathly.ai', // Optional
      'X-Title': 'Mathly AI', // Optional
    },
    body: JSON.stringify({
      model: getOpenRouterModel(),
      messages,
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'No response.';
}

// ── TTS ──
export async function textToSpeech(text: string): Promise<ArrayBuffer> {
  const clean = text.replace(/[*_#`~\[\]()>]/g, '').replace(/\n+/g, '. ').trim();
  if (!clean) throw new Error('Nothing to speak');

  // Orpheus has a strict 200 char limit — truncate at sentence boundary
  let input = clean;
  if (input.length > 200) {
    let cut = input.lastIndexOf('. ', 197);
    if (cut < 30) cut = input.lastIndexOf(' ', 197);
    if (cut < 30) cut = 197;
    input = input.slice(0, cut + 1).trim();
    if (!input.endsWith('.')) input += '...';
  }

  const body = { model: GROQ_TTS_MODEL, input, voice: 'troy', response_format: 'wav' };
  console.log('[TTS] Sending request:', input.length, 'chars');

  const res = await fetch(`${GROQ_BASE}/audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getGroqKey()}` },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('[TTS] Error:', res.status, errText);
    throw new Error(`TTS error ${res.status}: ${errText}`);
  }

  console.log('[TTS] Success, content-type:', res.headers.get('content-type'));
  return res.arrayBuffer();
}

export function browserTTS(text: string, onEnd?: () => void): void {
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[*_#`~\[\]()>]/g, '').replace(/\n+/g, '. ').slice(0, 3000));
  u.rate = 1; u.pitch = 1;
  if (onEnd) u.onend = onEnd;
  speechSynthesis.speak(u);
}

export function stopBrowserTTS(): void { speechSynthesis.cancel(); }

// ── STT ──
export function startSpeechRecognition(
  onResult: (text: string) => void,
  onEnd: () => void,
  onError: (err: string) => void
): { stop: () => void } | null {
  let rec: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let stopped = false;
  const chunks: Blob[] = [];

  (async () => {
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { onError('Mic access denied.'); onEnd(); return; }

    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
    rec = new MediaRecorder(stream, { mimeType: mime });

    rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    rec.onstop = async () => {
      stream?.getTracks().forEach(t => t.stop());
      if (stopped && !chunks.length) { onEnd(); return; }
      const blob = new Blob(chunks, { type: mime });
      try {
        const fd = new FormData();
        fd.append('file', blob, `rec.${mime.includes('webm') ? 'webm' : 'ogg'}`);
        fd.append('model', GROQ_STT_MODEL);
        fd.append('language', 'en');
        const r = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
          method: 'POST', headers: { 'Authorization': `Bearer ${getGroqKey()}` }, body: fd,
        });
        if (!r.ok) throw new Error(`STT ${r.status}`);
        const d = await r.json();
        if (d.text?.trim()) onResult(d.text.trim());
      } catch (e: any) { onError(e.message); }
      onEnd();
    };
    rec.onerror = () => { onError('Recording failed'); stream?.getTracks().forEach(t => t.stop()); onEnd(); };
    rec.start();
  })();

  return {
    stop: () => {
      stopped = true;
      if (rec && rec.state !== 'inactive') rec.stop();
      else { stream?.getTracks().forEach(t => t.stop()); onEnd(); }
    },
  };
}
