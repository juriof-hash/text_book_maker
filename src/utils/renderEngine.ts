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

  const scripts = Array.from(
    container.querySelectorAll<HTMLScriptElement>('script[type="text/tikz"]')
  );
  if (!scripts.length) return;

  const win = window as unknown as {
    ensureTikZJax?: () => Promise<(el?: HTMLElement) => Promise<void>>;
    TikZJax?: (el?: HTMLElement) => Promise<void>;
  };

  if (!win.ensureTikZJax) {
    throw new Error('TikZJax 로더를 찾을 수 없습니다.');
  }

  const tikzFunc = await win.ensureTikZJax();
  if (typeof tikzFunc !== 'function') {
    throw new Error('TikZJax 함수를 초기화할 수 없습니다.');
  }

  const total = scripts.length;
  let completed = 0;

  await new Promise<void>((resolve, reject) => {
    let finished = false;
    const timeoutTimer = setTimeout(() => {
      if (!finished) {
        finished = true;
        document.removeEventListener('tikzjax-load-finished', handleFinished, true);
        // Do not reject abruptly; some diagrams might have completed
        resolve();
      }
    }, 25000);

    function handleFinished(e: Event) {
      const target = e.target as Node;
      if (container && container.contains(target)) {
        completed++;
        onProgress?.(completed, total);

        // Store generated SVG in cache
        const parent = (target as HTMLElement).parentElement;
        const code = parent?.getAttribute('data-tikz-source');
        const svg = parent?.querySelector('svg');
        if (code && svg) {
          storeCachedSVG(code, svg.outerHTML);
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

    Promise.resolve(tikzFunc(container))
      .then(() => {
        // Double check remaining scripts
        const remaining = container.querySelectorAll('script[type="text/tikz"]').length;
        if (remaining === 0 && !finished) {
          finished = true;
          clearTimeout(timeoutTimer);
          document.removeEventListener('tikzjax-load-finished', handleFinished, true);
          resolve();
        }
      })
      .catch((err) => {
        if (!finished) {
          finished = true;
          clearTimeout(timeoutTimer);
          document.removeEventListener('tikzjax-load-finished', handleFinished, true);
          reject(err);
        }
      });
  });
}
