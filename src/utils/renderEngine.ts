import {
  prepareTikZWithKorean,
  restoreKoreanInTikZElement,
  restoreKoreanInTikZSvgString,
  TikZReplacement
} from './tikzKoreanSupport';

/**
 * High-performance rendering engine with SVG caching for TikZ and MathJax.
 */

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
    const code = script.textContent || '';
    const cached = getCachedSVG(code);
    if (cached) {
      const wrapper = document.createElement('div');
      wrapper.className = 'tikz-cached-rendered flex justify-center items-center';
      wrapper.innerHTML = cached;
      script.replaceWith(wrapper);
    } else {
      const { code: compilableCode, replacements, hasKorean } = prepareTikZWithKorean(code);
      if (hasKorean) {
        script.textContent = compilableCode;
        script.setAttribute('data-tikz-source', compilableCode);
        script.setAttribute('data-original-tikz', code);
        script.setAttribute('data-korean-replacements', JSON.stringify(replacements));
      } else {
        script.setAttribute('data-tikz-source', code);
        script.setAttribute('data-original-tikz', code);
      }
      uncachedScripts.push(script);
    }
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

  // 3. TikZJax uses a DOM MutationObserver to detect and compile uncached scripts.
  // We monitor the completion events with a timeout guard.
  const total = uncachedScripts.length;
  let completed = 0;

  await new Promise<void>((resolve) => {
    let finished = false;
    const timeoutTimer = setTimeout(() => {
      if (!finished) {
        finished = true;
        document.removeEventListener('tikzjax-load-finished', handleFinished, true);
        resolve();
      }
    }, 15000);

    function handleFinished(e: Event) {
      const target = e.target as Node;
      if (container && container.contains(target)) {
        completed++;
        onProgress?.(completed, total);

        // Store generated SVG in cache
        const targetElement = target as HTMLElement;
        const parent = targetElement.parentElement;
        const originalCode =
          parent?.getAttribute('data-original-tikz') || parent?.getAttribute('data-tikz-source');
        const compilableCode = parent?.getAttribute('data-tikz-source') || '';
        const replacementsJson = parent?.getAttribute('data-korean-replacements');
        let replacements: TikZReplacement[] = [];
        if (replacementsJson) {
          try {
            replacements = JSON.parse(replacementsJson);
          } catch {
            // ignore
          }
        }

        const svg = targetElement.tagName.toLowerCase() === 'svg'
          ? (targetElement as unknown as SVGSVGElement)
          : parent?.querySelector('svg');

        if (svg) {
          if (replacements.length > 0) {
            restoreKoreanInTikZElement(svg, replacements);
          }
          let svgHtml = svg.outerHTML;
          if (replacements.length > 0) {
            svgHtml = restoreKoreanInTikZSvgString(svgHtml, replacements);
          }

          if (originalCode) storeCachedSVG(originalCode, svgHtml);
          if (compilableCode) storeCachedSVG(compilableCode, svgHtml);
        }

        if (completed >= total && !finished) {
          finished = true;
          clearTimeout(timeoutTimer);
          document.removeEventListener('tikzjax-load-finished', handleFinished, true);
          resolve();
        }
      }
    }

    document.addEventListener('tikzjax-load-finished', handleFinished, true);
  });
}
