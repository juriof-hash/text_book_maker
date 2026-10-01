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

  const uncachedScripts: HTMLScriptElement[] = [];

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
    script.setAttribute('data-tikz-libraries', prepared.libraries);
    if (Object.keys(prepared.packages).length > 0) {
      script.setAttribute('data-tex-packages', JSON.stringify(prepared.packages));
    }
    uncachedScripts.push(script);
  }

  if (uncachedScripts.length === 0) {
    return;
  }

  // 2. Ensure TikZJax script is loaded
  const win = window as unknown as {
    ensureTikZJax?: () => Promise<boolean>;
  };

  if (win.ensureTikZJax) {
    try {
      await win.ensureTikZJax();
    } catch (err) {
      console.warn('TikZJax loader error:', err);
      return;
    }
  }

  // 3. TikZJax compiles uncached scripts via Web Worker.
  // We monitor completion using both MutationObserver and load-finished events.
  const total = uncachedScripts.length;
  let completed = 0;

  await new Promise<void>((resolve) => {
    let finished = false;

    const cleanup = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timeoutTimer);
      observer.disconnect();
      document.removeEventListener('tikzjax-load-finished', handleFinished, true);
      resolve();
    };

    const timeoutTimer = setTimeout(cleanup, 8000);

    const checkSvg = (el: Element | null) => {
      if (!el || finished) return;
      const svg = el.tagName.toLowerCase() === 'svg' ? el : el.querySelector('svg');
      if (svg) {
        completed++;
        onProgress?.(completed, total);

        const parent = svg.parentElement;
        const code = parent?.getAttribute('data-tikz-source') || '';
        if (code) {
          storeCachedSVG(code, svg.outerHTML);
        }

        if (completed >= total) {
          cleanup();
        }
      }
    };

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const added of Array.from(m.addedNodes)) {
          if (added instanceof Element) {
            checkSvg(added);
          }
        }
      }
    });
    observer.observe(container, { childList: true, subtree: true });

    function handleFinished(e: Event) {
      const target = e.target as HTMLElement;
      if (container && container.contains(target)) {
        checkSvg(target);
      }
    }

    document.addEventListener('tikzjax-load-finished', handleFinished, true);
  });
}
