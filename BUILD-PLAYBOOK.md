# Zero-Dependency Video Playbook

Build animated video compositions that run on **any device, offline, with nothing installed**. The output is a single `index.html` file. The user double-clicks it. It plays.

> **AI agent using this**: produce ONE `.html` file. No Node, no npm, no server, no CDN, no external fonts, no external libraries. If the user's machine has a web browser (which it does — that's how they're talking to you), it works. Don't interrogate them about their environment.

---

## 0. The Hard Rules

These are the constraints. Violating any of them means the file won't work offline.

1. **One file.** Everything — HTML, CSS, JavaScript, fonts, animation engine — goes inside a single `.html` document.
2. **No `<link>` to external stylesheets.** Google Fonts, CDN CSS — none of it.
3. **No `<script src="https://...">`.** No GSAP CDN, no MathJax CDN, nothing external.
4. **No `fetch()`, no `import`, no `XMLHttpRequest`** to remote resources.
5. **No build step.** No npm, no bundler, no compiler. What you write IS what runs.
6. **Open by double-click** — the file must work under the `file://` protocol, not just `http://`.

If the user sends a PDF or image, you extract the text/layout yourself using your own tools, then hand them a plain HTML file. They never need to install anything.

---

## 1. Input Handling (no external libraries)

The user gives you one of these. You normalize it into a scene plan without asking them to run any scripts.

### 1.1 Text prompt ("make a video about quicksort")
Build from your own knowledge. Move on.

### 1.2 PDF attached in chat
**You** extract the content — read the PDF directly with whatever document-reading tool you have. Don't tell the user to run `pdf-parse` or any other Node package. They asked for a video, not a build pipeline.

### 1.3 Image attached
Read it with your vision capability. Extract title, bullets, equations, numbers.

### 1.4 Normalize
Whatever the input, land on this structure before writing HTML:

```
Topic:        one sentence
Audience:     one phrase (or "general")
Duration:     30–180 s
Scenes:
  1. intro     → one-line claim
  2..N. body   → one concept each, ≤ 20 words headline
  (example)    → actual numbers/code if the source has them
  (chart)      → if there's a trend or comparison
  N+1. outro   → tagline
```

One concept per scene. If you can't summarize a scene in one sentence, split it.

---

## 2. The Single-File Template

Everything lives inside `<html>...</html>`. Animation happens with vanilla JavaScript and CSS — **no GSAP, no animation libraries**. The Web Animations API and CSS transitions are built into every browser released in the last decade.

### 2.1 Skeleton
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Preview</title>
  <style>
    /* ALL CSS inline here, including fonts (system-only) */
  </style>
</head>
<body>
  <div id="stage">
    <section class="scene" data-index="0">...</section>
    <section class="scene" data-index="1">...</section>
    <!-- FX overlays -->
    <div class="fx fx-flash"></div>
    <div class="fx fx-iris"></div>
    <div class="progress"><span></span></div>
    <button class="replay">↻ Replay</button>
  </div>
  <script>
    /* ALL JavaScript inline here */
  </script>
</body>
</html>
```

### 2.2 Why this works offline
- HTML/CSS/JS parsing happens in-browser
- No network requests at any point
- `file://` protocol supports everything needed (DOM, CSS, `setTimeout`, Web Animations API, `requestAnimationFrame`)
- Works on phones, tablets, desktops, Chromebooks, old laptops, any modern browser

---

## 3. Typography Without External Fonts

You cannot load Google Fonts. But every OS ships with good fonts — use CSS font stacks that degrade gracefully across Windows/macOS/Linux/Android/iOS.

```css
:root {
  --font-serif:   Georgia, 'Times New Roman', 'DejaVu Serif', serif;
  --font-display: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif;
  --font-sans:    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif;
  --font-mono:    'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
  --font-arabic:  'Segoe UI', Tahoma, 'Arial Unicode MS', Arial, sans-serif;
}
```

**Hierarchy with fixed px sizes** (don't use vw/clamp — they add noise between browsers):
```css
.display  { font-family: var(--font-display); font-weight: 900; font-size: 132px; line-height: .92; letter-spacing: -.02em }
.headline { font-family: var(--font-display); font-weight: 900; font-size: 78px;  line-height: 1.02 }
.lede     { font-family: var(--font-sans);    font-size: 26px;  line-height: 1.5 }
.chip     { font-family: var(--font-mono);    font-size: 14px;  letter-spacing: .3em; text-transform: uppercase }
```

Test that Georgia/Palatino look reasonable. They're on Windows, macOS, most Linux, Android, iOS. If a system lacks them, the stack falls back through serif generics.

**For Arabic**: Segoe UI is on Windows, Arial Unicode on older systems, and every mobile OS has a system Arabic font it picks via `direction: rtl`. Don't try to bundle Arabic webfonts — the encoding math isn't worth it for preview.

---

## 4. Textures Without Image Files

Backgrounds, grain, noise — all done with **inline SVG data URIs** and CSS gradients. Zero image assets.

```css
.paper {
  position: fixed; inset: 0; z-index: 0;
  background:
    radial-gradient(1200px 800px at 20% 10%, #f6efd8, transparent 60%),
    radial-gradient(900px 700px at 85% 90%,  #e8d6b0, transparent 60%),
    linear-gradient(180deg, #f3e9d2, #ede0c2);
}

.grain {
  position: fixed; inset: 0; z-index: 1; pointer-events: none;
  opacity: 0.22; mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml;utf8,\
<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>\
<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/></filter>\
<rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/>\
</svg>");
}

.vignette {
  position: fixed; inset: 0; z-index: 2; pointer-events: none;
  box-shadow: inset 0 0 280px 60px rgba(59,35,24,.35);
}
```

SVG data URIs require URL-encoding: `%23` for `#`, `%25` for `%`. Don't use `btoa()` base64 — the data URI form works everywhere and is smaller.

---

## 5. Animation Engine: Web Animations API (built-in)

**Do not use GSAP.** The browser has a built-in animation engine. It's called the Web Animations API (`Element.animate()`). It runs on every browser back to ~2018. No library to load.

### 5.1 Basic tween
```js
el.animate(
  [
    { opacity: 0, transform: 'translateY(30px)' },
    { opacity: 1, transform: 'translateY(0)'   }
  ],
  { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }
);
```

### 5.2 Sequencing — a tiny promise wrapper
```js
function anim(el, keyframes, options) {
  return new Promise(resolve => {
    const a = el.animate(keyframes, { fill: 'forwards', ...options });
    a.onfinish = resolve;
  });
}
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
```

Then scene playback is linear and readable:
```js
async function playScene(scene) {
  scene.classList.add('active');
  await anim(scene.querySelector('.chip'), [
    { opacity: 0, transform: 'translateY(-15px)' },
    { opacity: 1, transform: 'translateY(0)' }
  ], { duration: 400, easing: 'ease-out' });

  await anim(scene.querySelector('.headline'), [
    { opacity: 0, transform: 'translateY(30px)' },
    { opacity: 1, transform: 'translateY(0)' }
  ], { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)' });

  await delay(holdMs);
}
```

### 5.3 Why not GSAP?
GSAP requires a CDN or bundled file. A bundled GSAP minified is ~60 KB of extra code. The Web Animations API does 95% of what a video composition needs (keyframes, easing, stagger via manual iteration) and costs zero bytes.

### 5.4 Stagger without a library
```js
const cards = scene.querySelectorAll('.card');
await Promise.all([...cards].map((c, i) =>
  new Promise(r => setTimeout(() => {
    anim(c, [
      { opacity: 0, transform: 'translateY(30px) scale(.96)' },
      { opacity: 1, transform: 'translateY(0) scale(1)' }
    ], { duration: 550, easing: 'cubic-bezier(.34,1.56,.64,1)' }).onfinish = r;
  }, i * 120))
));
```

---

## 6. Scene + Transition Architecture

### 6.1 Scenes
```css
.scene {
  position: fixed; inset: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 34px; padding: 100px;
  opacity: 0;
}
.scene.active { opacity: 1 }
```

One `.scene.active` at a time. Flip the class during the transition's peak-cover moment.

### 6.2 Transition primitive (the rule that prevents scene overlap)
```js
async function transition(type, oldEl, newEl) {
  const coverDur = 450;

  // Cover-in
  await coverIn(type, coverDur);

  // SWAP at peak — exactly when the cover is fully opaque
  oldEl.classList.remove('active');
  newEl.classList.add('active');

  // Cover-out
  await coverOut(type, coverDur);
}
```

### 6.3 Transitions using WAAPI + CSS
All implemented without any library:

```js
const fx = {
  flash:  document.querySelector('.fx-flash'),
  iris:   document.querySelector('.fx-iris'),
  whip:   document.querySelector('.fx-whip'),
  pixels: document.querySelector('.fx-pixels'),
};

async function coverIn(type, dur) {
  if (type === 'flash') {
    await anim(fx.flash, [{ opacity: 0 }, { opacity: 1 }], { duration: dur, easing: 'ease-in' });
  } else if (type === 'iris') {
    await anim(fx.iris, [
      { clipPath: 'circle(0% at 50% 50%)' },
      { clipPath: 'circle(120% at 50% 50%)' }
    ], { duration: dur, easing: 'cubic-bezier(.7,0,.3,1)' });
  } else if (type === 'whip') {
    await anim(fx.whip, [
      { transform: 'translateX(-120%)' },
      { transform: 'translateX(0%)' }
    ], { duration: dur, easing: 'cubic-bezier(.6,0,1,.4)' });
  } else if (type === 'pixels') {
    const tiles = fx.pixels.children;
    // stagger tile scale-ups
    return Promise.all([...tiles].map((t, i) =>
      new Promise(r => setTimeout(() => {
        anim(t, [{ opacity: 0, transform: 'scale(0)' }, { opacity: 1, transform: 'scale(1)' }],
             { duration: dur * 0.6, easing: 'ease-out' }).onfinish = r;
      }, Math.random() * dur * 0.4))
    ));
  }
}
async function coverOut(type, dur) { /* mirror: play the out keyframes */ }
```

**Rotate through 3+ different transition types** — same transition every time = boring.

---

## 7. Math (Without MathJax)

MathJax is ~600 KB of JavaScript to load. For a preview-quality composition, you don't need it. Use **Unicode math + HTML/CSS typography** for the 90% case:

```html
<div class="formula">
  <span class="mvar">E</span> =
  <span class="mvar">m</span><span class="msup">c²</span>
</div>

<div class="formula">
  x<sub>1</sub><sup>(k+1)</sup> =
  <span class="frac">
    <span class="num">1</span>
    <span class="den">a<sub>11</sub></span>
  </span>
  <span class="paren">( b<sub>1</sub> − a<sub>12</sub>x<sub>2</sub><sup>(k)</sup> − a<sub>13</sub>x<sub>3</sub><sup>(k)</sup> )</span>
</div>
```

```css
.formula { font-family: var(--font-serif); font-size: 30px; line-height: 1.6 }
.formula .mvar { font-style: italic }
.formula .msup { vertical-align: super; font-size: 0.7em }
.formula .frac { display: inline-flex; flex-direction: column; vertical-align: middle;
                 text-align: center; padding: 0 .3em; font-size: .9em }
.formula .frac .num { border-bottom: 1px solid currentColor; padding: 0 .4em }
.formula .frac .den { padding: .1em .4em }
```

Unicode math symbols you can type directly: `≈ ≠ ≤ ≥ ± × ÷ ∞ ∑ ∏ ∫ √ ∂ ∇ α β γ δ ε π θ λ μ σ φ ψ ω` and superscript/subscript via `<sup>`/`<sub>`.

This renders in any browser with no external dependency. It won't match Computer Modern perfectly — but for a preview video, it's unmistakably readable as math.

---

## 8. Multi-Language Support (built-in)

No extra files, no translations API. Two language strings inline, CSS toggles visibility:

```html
<body data-lang="en">
  <div id="stage">
    <h2 class="headline">
      <span data-en>The clearest summary.</span>
      <span data-ar>أوضح ملخص.</span>
    </h2>
    <button class="lang-btn" data-set-lang="en">EN</button>
    <button class="lang-btn" data-set-lang="ar">ع</button>
  </div>
</body>
```

```css
[data-en], [data-ar] { display: none }
body[data-lang="en"] [data-en] { display: revert }
body[data-lang="ar"] [data-ar] { display: revert }
body[data-lang="en"] span[data-en] { display: inline }
body[data-lang="ar"] span[data-ar] { display: inline }
body[data-lang="ar"] { direction: rtl; font-family: var(--font-arabic) }
```

```js
document.querySelectorAll('[data-set-lang]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.body.dataset.lang = btn.dataset.setLang;
    restart();
  });
});
```

Arabic system font stack already covers iOS, Android, Windows, macOS. No webfont needed.

---

## 9. Design Palettes (pick one, don't ask)

```css
/* Editorial / academic */
--bg:#f3e9d2; --ink:#3b2318; --accent:#b07a4a;

/* Tech / software */
--bg:#0f172a; --ink:#e2e8f0; --accent:#38bdf8;

/* Premium / bold */
--bg:#0a0a0a; --ink:#fafaf9; --accent:#d4af37;

/* Health / nature */
--bg:#f0ebe0; --ink:#1f3a29; --accent:#7cb287;

/* Finance / data */
--bg:#eef0f2; --ink:#0b2545; --accent:#c9a86a;
```

Pick based on subject-matter feel. Don't ask the user unless they signal a preference.

---

## 10. The Playback Loop

Simple state machine. No GSAP timeline. No Hyperframes. Just DOM + WAAPI:

```js
const scenes = [...document.querySelectorAll('.scene')];
const plan = [
  { kind: 'dedication', hold: 3500, out: 'flash' },
  { kind: 'content',    hold: 4000, out: 'iris'  },
  { kind: 'cards',      hold: 5000, out: 'whip'  },
  // ...
  { kind: 'outro',      hold: 5000, out: null    },
];

let running = false;
async function play() {
  if (running) return;
  running = true;
  hideAll();
  for (let i = 0; i < scenes.length; i++) {
    await enterScene(scenes[i], plan[i].kind);
    await delay(plan[i].hold);
    if (plan[i].out) await transition(plan[i].out, scenes[i], scenes[i+1]);
  }
  running = false;
  showReplay();
}

document.querySelector('.replay').addEventListener('click', () => play());
window.addEventListener('load', () => setTimeout(play, 200));
```

### Progress bar
```js
// At play start:
const totalMs = plan.reduce((s, p) => s + (p.hold + 900), 0);
const bar = document.querySelector('.progress span');
bar.animate([{ width: '0%' }, { width: '100%' }],
  { duration: totalMs, fill: 'forwards', easing: 'linear' });
```

### Scrub during dev (devtools only)
No built-in scrubber, but during development:
```js
// Pause all animations
document.getAnimations().forEach(a => a.pause());
// Jump to 50% of the currently running animation
document.getAnimations().forEach(a => a.currentTime = a.effect.getTiming().duration * 0.5);
```

---

## 11. Common Bugs → Fixes (offline-specific)

| Symptom | Cause | Fix |
|---|---|---|
| Animation freezes when tab is backgrounded | Browser throttles `setTimeout` on hidden tabs | Use WAAPI `.animate()` — it runs on the compositor thread even when backgrounded, or accept the pause |
| Font looks wrong on user's machine | System font fallback kicked in | Make sure the stack has Georgia/Palatino/Segoe UI etc. — these are present on all mainstream OS |
| Two scenes overlap during a transition | Old scene's `.active` not removed at peak | Remove class exactly between `coverIn` and `coverOut`, never before/after |
| Scene never fades out | WAAPI with `fill: 'forwards'` leaves final state locked | Use `a.commitStyles(); a.cancel();` before re-animating the same element, or design keyframes so the final state matches the CSS rest state |
| RTL page opens but text is still LTR | `direction: rtl` only set on `body`, not on flex scenes | Apply `direction: rtl` on `.scene` too |
| File opens but is blank | CSP in browser blocks inline SVG data URIs (rare) | Move grain texture to a CSS gradient fallback; test with `file://` before deploying |
| Double-click on `.html` opens a text editor | OS default-opens `.html` with the editor | Right-click → Open With → Browser. Once. After that, set browser as default. |
| Arabic text renders as boxes | No Arabic font on host OS | Vanishingly rare — every modern OS has one. Add `Noto Sans Arabic` to the stack as final fallback if users report it |
| `<sup>` / `<sub>` tiny on some browsers | Default `font-size` for sup/sub is browser-dependent | Explicitly set `.formula sup { font-size: .7em }` in CSS |

---

## 12. Delivery to the User

1. Paste the full `index.html` into the chat **as a complete code block**. They copy, save, open.
2. Or use your file-writing capability to save it to their project folder.
3. Tell them: **"Double-click `index.html`. It works."** That's the instruction.
4. If they're on a phone and can't double-click: they can tap the file in any file manager — it opens in their default browser.

No install step, no build step, no commands. The deliverable is a file.

---

## 13. Minimal Working Skeleton (complete, copy-paste)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Preview</title>
<style>
  :root {
    --bg:#f3e9d2; --ink:#3b2318; --accent:#b07a4a;
    --font-display: 'Palatino Linotype','Book Antiqua',Palatino,Georgia,serif;
    --font-sans: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,system-ui,sans-serif;
    --font-mono: 'SF Mono',Menlo,Consolas,'Liberation Mono',monospace;
  }
  * { margin:0; padding:0; box-sizing:border-box }
  html, body { width:100%; height:100%; overflow:hidden;
    background:var(--bg); color:var(--ink); font-family:var(--font-sans) }
  #stage { position:fixed; inset:0 }

  .paper { position:fixed; inset:0; z-index:0;
    background:
      radial-gradient(1200px 800px at 20% 10%, #f6efd8, transparent 60%),
      radial-gradient(900px 700px at 85% 90%,  #e8d6b0, transparent 60%) }
  .vignette { position:fixed; inset:0; z-index:2; pointer-events:none;
    box-shadow: inset 0 0 280px 60px rgba(59,35,24,.35) }

  .scene { position:fixed; inset:0; display:flex; flex-direction:column;
    align-items:center; justify-content:center; gap:34px; padding:100px;
    z-index:5; opacity:0 }
  .scene.active { opacity:1 }

  .chip { font-family:var(--font-mono); font-size:14px; letter-spacing:.3em;
    text-transform:uppercase; padding:10px 16px;
    background:var(--ink); color:var(--bg); font-weight:700 }
  .headline { font-family:var(--font-display); font-weight:900; font-size:78px;
    line-height:1.02; text-align:center; max-width:22ch }
  .headline em { color:var(--accent); font-style:italic }
  .display { font-family:var(--font-display); font-weight:900; font-size:132px;
    line-height:.92; text-align:center }
  .rule { width:140px; height:2px; background:var(--ink); opacity:.6; transform:scaleX(0) }
  .rule.ready { transform:scaleX(1); transition:transform .7s cubic-bezier(.2,.8,.2,1) }

  .fx { position:fixed; inset:0; z-index:20; pointer-events:none }
  .fx-flash { background:var(--bg); opacity:0 }
  .fx-iris  { background:var(--ink); clip-path:circle(0% at 50% 50%) }

  .progress { position:fixed; left:0; right:0; bottom:0; height:3px;
    background:rgba(59,35,24,.1); z-index:30 }
  .progress span { display:block; height:100%; width:0%;
    background:linear-gradient(90deg, var(--accent), var(--ink)) }

  .replay { position:fixed; right:28px; bottom:24px; z-index:50;
    padding:12px 22px; border-radius:999px; background:var(--ink); color:var(--bg);
    border:0; font:700 13px/1 var(--font-mono); letter-spacing:.25em;
    text-transform:uppercase; cursor:pointer; display:none }
  .replay.show { display:block }
</style>
</head>
<body>
<div id="stage">
  <div class="paper"></div>
  <div class="vignette"></div>

  <section class="scene" data-index="0">
    <span class="chip">Chapter 01</span>
    <h2 class="headline">The first <em>idea</em>.</h2>
    <div class="rule"></div>
  </section>

  <section class="scene" data-index="1">
    <span class="chip">Chapter 02</span>
    <h1 class="display">And the <em>second</em>.</h1>
  </section>

  <div class="fx fx-flash"></div>
  <div class="fx fx-iris"></div>

  <div class="progress"><span></span></div>
  <button class="replay">↻ Replay</button>
</div>

<script>
  const $  = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const anim = (el, kf, opts) => new Promise(r => {
    const a = el.animate(kf, { fill: 'forwards', ...opts });
    a.onfinish = r;
  });

  const scenes = $$('.scene');
  const iris   = $('.fx-iris');
  const flash  = $('.fx-flash');

  const plan = [
    { hold: 3200, out: 'iris'  },
    { hold: 4000, out: null    },
  ];

  async function enterScene(scene, i) {
    scene.classList.add('active');
    const chip = scene.querySelector('.chip');
    const head = scene.querySelector('.headline, .display');
    const rule = scene.querySelector('.rule');
    if (chip) await anim(chip,
      [{ opacity:0, transform:'translateY(-15px)' }, { opacity:1, transform:'translateY(0)' }],
      { duration:400, easing:'cubic-bezier(.2,.8,.2,1)' });
    if (head) await anim(head,
      [{ opacity:0, transform:'translateY(30px)' }, { opacity:1, transform:'translateY(0)' }],
      { duration:700, easing:'cubic-bezier(.2,.8,.2,1)' });
    if (rule) rule.classList.add('ready');
  }

  async function transition(type, oldEl, newEl) {
    const dur = 450;
    if (type === 'flash') {
      await anim(flash, [{opacity:0},{opacity:1}], { duration:dur, easing:'ease-in' });
      oldEl.classList.remove('active');
      newEl.classList.add('active');
      await anim(flash, [{opacity:1},{opacity:0}], { duration:dur, easing:'ease-out' });
    } else if (type === 'iris') {
      await anim(iris,
        [{ clipPath:'circle(0% at 50% 50%)' }, { clipPath:'circle(120% at 50% 50%)' }],
        { duration:dur, easing:'cubic-bezier(.7,0,.3,1)' });
      oldEl.classList.remove('active');
      newEl.classList.add('active');
      await anim(iris,
        [{ clipPath:'circle(120% at 50% 50%)' }, { clipPath:'circle(0% at 50% 50%)' }],
        { duration:dur, easing:'cubic-bezier(.7,0,.3,1)' });
    }
  }

  async function play() {
    $$('.scene').forEach(s => s.classList.remove('active'));
    $$('.rule').forEach(r => r.classList.remove('ready'));
    $('.replay').classList.remove('show');

    const totalMs = plan.reduce((s,p) => s + p.hold + 900, 0);
    $('.progress span').animate([{ width:'0%' }, { width:'100%' }],
      { duration: totalMs, fill:'forwards', easing:'linear' });

    for (let i = 0; i < scenes.length; i++) {
      await enterScene(scenes[i]);
      await sleep(plan[i].hold);
      if (plan[i].out) await transition(plan[i].out, scenes[i], scenes[i+1]);
    }
    $('.replay').classList.add('show');
  }

  $('.replay').addEventListener('click', play);
  window.addEventListener('load', () => setTimeout(play, 200));
</script>
</body>
</html>
```

That's a working two-scene video with iris transition in a single file. No external dependencies. Open it from anywhere. It plays.

---

## 14. Checklist

- [ ] ONE `.html` file — nothing else ships
- [ ] No `<link href="https://...">`, no `<script src="https://...">`
- [ ] Fonts are system stacks only (Georgia, Segoe UI, SF Mono, etc.)
- [ ] Textures are CSS gradients + inline SVG data URIs
- [ ] Animations use `element.animate()` — no GSAP, no anime.js
- [ ] Math uses Unicode + HTML typography — no MathJax
- [ ] Sequencing via `async`/`await` + `setTimeout` — no libraries
- [ ] Root `<div id="stage">` wraps everything; scenes are `position:fixed; inset:0; opacity:0`
- [ ] Transition swaps `.active` class at peak cover, not before/after
- [ ] Rotate through at least 2 transition types (ideally 3+)
- [ ] Progress bar + replay button built-in
- [ ] If bilingual: `body[data-lang]` + inline `[data-en]`/`[data-ar]` spans
- [ ] Tested by opening under `file://` — no console errors, plays end to end

User experience: they get the file, they double-click, it plays. That's all.
