/**
 * <psb-workbench>: the three Plucked/Struck/Blown instruments as a playable
 * widget. Loaded lazily by the widget runtime in Post.astro; WASM and the
 * AudioContext spin up only behind the power button (autoplay policy, and
 * courtesy). Everything renders in light DOM so the site's tokens apply.
 *
 * Budget: this chunk (runtime ~190 KB + glue) loads on intersection; the
 * three 9 KB wasm modules fetch on power-on. Well inside the 300 KB rule.
 */
import { FaustMonoDspGenerator } from './vendor/faustwasm.js';

import pluckWasm from '../assets/lab/psb/pluck/dsp-module.wasm?url';
import pluckMeta from '../assets/lab/psb/pluck/dsp-meta.json';
import barWasm from '../assets/lab/psb/bar/dsp-module.wasm?url';
import barMeta from '../assets/lab/psb/bar/dsp-meta.json';
import pipeWasm from '../assets/lab/psb/pipe/dsp-module.wasm?url';
import pipeMeta from '../assets/lab/psb/pipe/dsp-meta.json';

const INSTRUMENTS = [
  {
    name: 'pluck', label: 'wire · plucked', trigger: 'pluck', mode: 'tap',
    wasm: pluckWasm, meta: pluckMeta,
    notes: [110, 146.83, 220, 329.63],
    sliders: [
      { p: 'pick_position', label: 'pick position' },
      { p: 'brightness', label: 'brightness' },
    ],
  },
  {
    name: 'bar', label: 'bar · struck', trigger: 'strike', mode: 'tap',
    wasm: barWasm, meta: barMeta,
    notes: [523.25, 659.25, 783.99, 1046.5],
    sliders: [
      { p: 'strike_position', label: 'strike position' },
      { p: 'strike_hardness', label: 'hardness' },
    ],
  },
  {
    name: 'pipe', label: 'pipe · blown (hold)', trigger: 'blow', mode: 'hold',
    wasm: pipeWasm, meta: pipeMeta,
    notes: [293.66, 392, 440, 587.33],
    sliders: [
      { p: 'breath', label: 'breath' },
      { p: 'vibrato_depth', label: 'vibrato' },
    ],
  },
];

const noteName = (hz) => {
  const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  const n = Math.round(12 * Math.log2(hz / 440)) + 57; // A4 = index 57
  return `${NAMES[n % 12]}${Math.floor(n / 12)}`;
};

const CSS = `
.psbw { border: 1px solid var(--hair); border-radius: var(--radius, 6px); background: var(--ink-2); padding: 1.1rem 1.2rem 1.3rem; margin: 1.8rem 0; }
.psbw__head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
.psbw__title { font-family: var(--mono); font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--mid); }
.psbw__power { font-family: var(--mono); font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--signal); background: none; border: 1px solid var(--signal); border-radius: 999px; padding: 0.35rem 1rem; cursor: pointer; }
.psbw__power:disabled { opacity: 0.5; cursor: default; }
.psbw__rack { display: grid; gap: 0.9rem; grid-template-columns: repeat(auto-fit, minmax(215px, 1fr)); }
.psbw__inst { border: 1px solid var(--hair); border-radius: var(--radius, 6px); padding: 0.8rem 0.9rem; }
.psbw__name { font-family: var(--mono); font-size: 0.68rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--silver-dim, var(--mid)); margin: 0 0 0.6rem; }
.psbw__notes { display: flex; gap: 0.4rem; margin-bottom: 0.65rem; flex-wrap: wrap; }
.psbw__note { font-family: var(--mono); font-size: 0.72rem; color: var(--silver, #d6dbe1); background: none; border: 1px solid var(--hair-bright, var(--hair)); border-radius: 4px; padding: 0.35rem 0.55rem; min-width: 2.4rem; cursor: pointer; touch-action: none; }
.psbw__note:active { color: var(--signal); border-color: var(--signal); }
.psbw__param { display: grid; grid-template-columns: 6.2em 1fr; gap: 0.5em; align-items: center; margin: 0.3rem 0; }
.psbw__param label { font-family: var(--mono); font-size: 0.62rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--mid); }
.psbw__param input { width: 100%; accent-color: var(--signal); height: 2px; }
.psbw__meter { height: 2px; background: var(--hair); margin-top: 0.7rem; overflow: hidden; }
.psbw__meter i { display: block; height: 100%; background: var(--signal); transform-origin: left; transform: scaleX(0); }
.psbw__hint { font-family: var(--mono); font-size: 0.62rem; letter-spacing: 0.08em; color: var(--mid); margin-top: 0.9rem; }
`;

class PsbWorkbench extends HTMLElement {
  connectedCallback() {
    if (this.dataset.state) return;
    this.dataset.state = 'idle';
    if (!document.getElementById('psbw-css')) {
      const style = document.createElement('style');
      style.id = 'psbw-css';
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    this.innerHTML = `
      <div class="psbw">
        <div class="psbw__head">
          <span class="psbw__title">plucked / struck / blown · live wasm</span>
          <button class="psbw__power" type="button">power on</button>
        </div>
        <div class="psbw__rack" hidden></div>
        <p class="psbw__hint" hidden></p>
      </div>`;
    this.querySelector('.psbw__power').addEventListener('click', () => this.#boot());
  }

  async #boot() {
    const btn = this.querySelector('.psbw__power');
    if (this.dataset.state !== 'idle') return;
    this.dataset.state = 'loading';
    btn.disabled = true;
    btn.textContent = 'loading wasm…';
    try {
      const ctx = new AudioContext({ latencyHint: 'interactive' });
      const master = ctx.createGain();
      master.gain.value = 0.7;
      master.connect(ctx.destination);
      const t0 = performance.now();
      this.nodes = {};
      this.peaks = {};
      for (const spec of INSTRUMENTS) {
        const module = await WebAssembly.compileStreaming(fetch(spec.wasm)).catch(async () =>
          WebAssembly.compile(await (await fetch(spec.wasm)).arrayBuffer())
        );
        const gen = new FaustMonoDspGenerator();
        const node = await gen.createNode(ctx, spec.name, {
          module,
          json: JSON.stringify(spec.meta),
          soundfiles: {},
        });
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        node.connect(analyser);
        analyser.connect(master);
        const buf = new Float32Array(analyser.fftSize);
        this.peaks[spec.name] = () => {
          analyser.getFloatTimeDomainData(buf);
          let p = 0;
          for (let i = 0; i < buf.length; i++) p = Math.max(p, Math.abs(buf[i]));
          return p;
        };
        this.nodes[spec.name] = node;
      }
      await ctx.resume();
      this.ctx = ctx;
      this.#buildRack();
      this.dataset.state = 'running';
      btn.textContent = `running · ${Math.round(performance.now() - t0)} ms`;
      window.__psbLab = this; // for curious consoles and automated checks
      this.#meterLoop();
    } catch (err) {
      this.dataset.state = 'error';
      btn.textContent = 'audio failed to start';
      console.error('[psb-workbench]', err);
    }
  }

  #param(node, suffix) {
    return node.getParams().find((p) => p.endsWith('/' + suffix));
  }

  #buildRack() {
    const rack = this.querySelector('.psbw__rack');
    const hint = this.querySelector('.psbw__hint');
    rack.hidden = false;
    hint.hidden = false;
    hint.textContent = 'tap notes to play · the pipe sounds while held · sliders are the same parameters the field note describes';
    for (const spec of INSTRUMENTS) {
      const node = this.nodes[spec.name];
      const card = document.createElement('section');
      card.className = 'psbw__inst';
      card.innerHTML = `<h4 class="psbw__name">${spec.label}</h4><div class="psbw__notes"></div><div class="psbw__meter"><i></i></div>`;
      const notesEl = card.querySelector('.psbw__notes');
      for (const hz of spec.notes) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'psbw__note';
        b.textContent = noteName(hz);
        const freq = this.#param(node, 'freq');
        const trig = this.#param(node, spec.trigger);
        if (spec.mode === 'tap') {
          b.addEventListener('pointerdown', () => {
            node.setParamValue(freq, hz);
            node.setParamValue(trig, 1);
            setTimeout(() => node.setParamValue(trig, 0), 60);
          });
        } else {
          b.addEventListener('pointerdown', (e) => {
            node.setParamValue(freq, hz);
            node.setParamValue(trig, 1);
            try {
              b.setPointerCapture(e.pointerId); // keep the hold if the finger drifts
            } catch {
              /* synthetic or already-released pointer; the note still sounds */
            }
          });
          const off = () => node.setParamValue(trig, 0);
          b.addEventListener('pointerup', off);
          b.addEventListener('pointercancel', off);
        }
        notesEl.appendChild(b);
      }
      const meter = card.querySelector('.psbw__meter');
      for (const s of spec.sliders) {
        const path = this.#param(node, s.p);
        const d = node.getDescriptors().find((x) => x.address === path);
        const row = document.createElement('div');
        row.className = 'psbw__param';
        row.innerHTML = `<label>${s.label}</label><input type="range" min="${d.min}" max="${d.max}" step="${d.step}" value="${node.getParamValue(path)}">`;
        row.querySelector('input').addEventListener('input', (e) => node.setParamValue(path, +e.target.value));
        card.insertBefore(row, meter);
      }
      this.meterBar ??= {};
      this.meterBar[spec.name] = card.querySelector('.psbw__meter i');
      rack.appendChild(card);
    }
  }

  #meterLoop() {
    const tick = () => {
      if (!this.isConnected || this.dataset.state !== 'running') return;
      for (const spec of INSTRUMENTS) {
        const bar = this.meterBar[spec.name];
        if (bar) bar.style.transform = `scaleX(${Math.min(1, this.peaks[spec.name]()).toFixed(3)})`;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

export function define() {
  if (!customElements.get('psb-workbench')) customElements.define('psb-workbench', PsbWorkbench);
}
