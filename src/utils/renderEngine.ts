/**
 * High-performance rendering engine with SVG caching for TikZ and MathJax.
 */

import { prepareTikZForRendering } from './illustrationRecognizer';

// In-memory cache for rendered TikZ SVGs
const svgMemoryCache = new Map<string, string>();
const LOCAL_STORAGE_CACHE_PREFIX = 'math_sheet_tikz_svg_';

// Simple hash generator for caching
export function getCodeHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return 'tikz_' + Math.abs(hash).toString(36) + '_' + str.length;
}

export function getCachedSVG(code: string): string | null {
  if (!code) return null;
  const hash = getCodeHash(code.trim());

  // Check memory cache
  if (svgMemoryCache.has(hash)) {
    return svgMemoryCache.get(hash)!;
  }

  // Check localStorage cache
  try {
    const local = localStorage.getItem(LOCAL_STORAGE_CACHE_PREFIX + hash);
    if (local) {
      svgMemoryCache.set(hash, local);
      return local;
    }
  } catch {
    // Ignore storage quota errors
  }

  return null;
}

export function storeCachedSVG(code: string, svg: string): void {
  if (!code || !svg) return;
  const hash = getCodeHash(code.trim());
  svgMemoryCache.set(hash, svg);

  try {
    localStorage.setItem(LOCAL_STORAGE_CACHE_PREFIX + hash, svg);
  } catch {
    // Quota reached; memory cache remains active
  }
}

/**
 * Typesets all math formulas ($...$ and $$...$$) inside a DOM container using MathJax 3.
 */
export async function typesetMath(container: HTMLElement | null): Promise<void> {
  if (!container) return;

  const win = window as unknown as {
    MathJax?: {
      typesetPromise?: (elements: HTMLElement[]) => Promise<void>;
      typesetClear?: (elements: HTMLElement[]) => void;
    };
  };

  if (win.MathJax && typeof win.MathJax.typesetPromise === 'function') {
    try {
      if (typeof win.MathJax.typesetClear === 'function') {
        win.MathJax.typesetClear([container]);
      }
      await win.MathJax.typesetPromise([container]);
    } catch (err) {
      console.warn('MathJax typesetting notice:', err);
    }
  }
}

let isProcessingTikZ = false;
let tikzQueue: Array<() => void> = [];

/**
 * Triggers official TikZJax (tikzjax.com) compilation for all pending <script type="text/tikz"> elements.
 * Chains executions sequentially to guarantee WebAssembly virtual filesystem safety.
 */
export async function processTikZScripts(): Promise<void> {
  return new Promise((resolve) => {
    tikzQueue.push(resolve);
    runNextTikZBatch();
  });
}

async function runNextTikZBatch() {
  if (isProcessingTikZ || tikzQueue.length === 0) return;
  isProcessingTikZ = true;

  const currentResolvers = [...tikzQueue];
  tikzQueue = [];

  try {
    const win = window as unknown as { onload?: () => Promise<void> };

    // Wait until window.onload is attached by https://tikzjax.com/v1/tikzjax.js
    let attempts = 0;
    while (typeof win.onload !== 'function' && attempts < 100) {
      await new Promise((r) => setTimeout(r, 50));
      attempts++;
    }

    if (typeof win.onload === 'function') {
      await win.onload();
    }
  } catch (err) {
    console.warn('TikZJax batch compilation notice:', err);
  } finally {
    isProcessingTikZ = false;
    currentResolvers.forEach((res) => res());
    if (tikzQueue.length > 0) {
      runNextTikZBatch();
    }
  }
}

/**
 * Renders all <script type="text/tikz"> elements inside a container using TikZJax,
 * with caching and per-diagram error boundaries.
 */
export async function renderTikZInContainer(
  container: HTMLElement | null,
  onProgress?: (completed: number, total: number) => void
): Promise<void> {
  if (!container) return;

  // 1. Check existing cached SVGs first to avoid unnecessary WebAssembly compilation
  const scripts = Array.from(
    container.querySelectorAll<HTMLScriptElement>('script[type="text/tikz"]')
  );
  if (!scripts.length) return;

  let uncachedCount = 0;

  for (const script of scripts) {
    const rawCode = script.textContent || '';
    const cached = getCachedSVG(rawCode);
    if (cached) {
      const wrapper = document.createElement('div');
      wrapper.className = 'tikz-cached-rendered flex justify-center items-center';
      wrapper.innerHTML = cached;
      script.replaceWith(wrapper);
      continue;
    }

    const prepared = prepareTikZForRendering(rawCode);
    const preparedCached = getCachedSVG(prepared.body);
    if (preparedCached) {
      const wrapper = document.createElement('div');
      wrapper.className = 'tikz-cached-rendered flex justify-center items-center';
      wrapper.innerHTML = preparedCached;
      script.replaceWith(wrapper);
      continue;
    }

    script.textContent = prepared.body;
    script.setAttribute('data-tikz-source', rawCode);
    uncachedCount++;
  }

  if (uncachedCount === 0) {
    return;
  }

  // 2. Trigger official TikZJax compilation
  await processTikZScripts();

  // 3. Scan container and cache any newly generated SVGs
  const svgContainers = Array.from(container.querySelectorAll('div > svg'));
  for (const svg of svgContainers) {
    const parent = svg.parentElement;
    const source = parent?.getAttribute('data-tikz-source');
    if (source && parent) {
      storeCachedSVG(source, parent.innerHTML);
    }
  }

  onProgress?.(uncachedCount, uncachedCount);
}
