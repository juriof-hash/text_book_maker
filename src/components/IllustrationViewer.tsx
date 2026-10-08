import React, { useEffect, useRef, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { IllustrationType } from '../types';
import { sanitizeTikZCode } from '../utils/illustrationRecognizer';
import { getCachedSVG, storeCachedSVG } from '../utils/renderEngine';
import { canParseWithFastEngine, parseTikz } from '../utils/tikzParser';
import {
  fixDegreeSymbolsInElement,
  fixDegreeSymbolsInSvgString,
  prepareTikZWithKorean,
  restoreKoreanInTikZElement,
  restoreKoreanInTikZSvgString
} from '../utils/tikzKoreanSupport';

interface IllustrationViewerProps {
  type: IllustrationType;
  code: string;
  scale?: number; // percentage (e.g. 100)
  className?: string;
  isThumbnail?: boolean;
}

export const IllustrationViewer: React.FC<IllustrationViewerProps> = ({
  type,
  code,
  scale = 100,
  className = '',
  isThumbnail = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedHtml, setCachedHtml] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  // Continuously fix any degree symbols rendered in the DOM
  useEffect(() => {
    if (containerRef.current) {
      fixDegreeSymbolsInElement(containerRef.current);
    }
  }, [cachedHtml]);

  useEffect(() => {
    setImageError(false);

    if (!code || type === 'none') {
      setCachedHtml(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (type === 'svg') {
      setCachedHtml(code);
      setError(null);
      setLoading(false);
      return;
    }

    if (type === 'image') {
      setCachedHtml(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (type === 'tikz') {
      const sanitized = sanitizeTikZCode(code);
      const cached = getCachedSVG(sanitized) || getCachedSVG(code);

      if (cached) {
        setCachedHtml(fixDegreeSymbolsInSvgString(cached));
        setError(null);
        setLoading(false);
        return;
      }

      // Fast native vector engine: instant zero-latency rendering with 100% Korean support
      if (canParseWithFastEngine(sanitized)) {
        try {
          const parsed = parseTikz(sanitized);
          if (parsed.svg && !parsed.errors.length) {
            const cleanSvg = fixDegreeSymbolsInSvgString(parsed.svg);
            storeCachedSVG(code, cleanSvg);
            storeCachedSVG(sanitized, cleanSvg);
            setCachedHtml(cleanSvg);
            setError(null);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn('Fast TikZ engine fallback to TikZJax:', err);
        }
      }

      // Fallback: Convert any Korean/Unicode text to safe ASCII tokens for TeX82 compilation
      const { code: compilableCode, replacements, hasKorean } = prepareTikZWithKorean(sanitized);

      if (hasKorean) {
        const cachedCompilable = getCachedSVG(compilableCode);
        if (cachedCompilable) {
          const restoredHtml = restoreKoreanInTikZSvgString(cachedCompilable, replacements);
          storeCachedSVG(code, restoredHtml);
          storeCachedSVG(sanitized, restoredHtml);
          setCachedHtml(restoredHtml);
          setError(null);
          setLoading(false);
          return;
        }
      }

      setLoading(true);
      setError(null);
      let isMounted = true;

      const win = window as unknown as {
        ensureTikZJax?: () => Promise<boolean>;
      };

      const startRender = async () => {
        try {
          if (win.ensureTikZJax) {
            await win.ensureTikZJax();
          }

          if (!isMounted) return;
          const container = containerRef.current;
          if (!container) return;

          container.innerHTML = '';

          const script = document.createElement('script');
          script.type = 'text/tikz';
          script.textContent = compilableCode;
          container.setAttribute('data-tikz-source', compilableCode);
          container.setAttribute('data-original-tikz', code);

          const onFinished = (e: Event) => {
            if (!isMounted) return;
            const target = e.target as HTMLElement;
            let svg = container.querySelector('svg');
            if (!svg && target && target.tagName?.toLowerCase() === 'svg') {
              svg = target as unknown as SVGSVGElement;
            }

            if (svg) {
              restoreKoreanInTikZElement(svg, replacements);
              let svgHtml = restoreKoreanInTikZSvgString(svg.outerHTML, replacements);
              svgHtml = fixDegreeSymbolsInSvgString(svgHtml);

              storeCachedSVG(sanitized, svgHtml);
              storeCachedSVG(code, svgHtml);
              storeCachedSVG(compilableCode, svgHtml);
              setCachedHtml(svgHtml);
              setError(null);
            }
            setLoading(false);
          };

          container.addEventListener('tikzjax-load-finished', onFinished, { once: true });
          container.appendChild(script);

          // Safety timeout if TeX syntax has errors and cannot render
          setTimeout(() => {
            if (!isMounted) return;
            container.removeEventListener('tikzjax-load-finished', onFinished);
            const svg = container.querySelector('svg');
            if (svg) {
              restoreKoreanInTikZElement(svg, replacements);
              let svgHtml = restoreKoreanInTikZSvgString(svg.outerHTML, replacements);
              svgHtml = fixDegreeSymbolsInSvgString(svgHtml);
              storeCachedSVG(sanitized, svgHtml);
              storeCachedSVG(code, svgHtml);
              setCachedHtml(svgHtml);
              setError(null);
              setLoading(false);
            } else {
              setLoading(false);
              setError('TikZ 삽화 조판 실패 (구문 확인 필요)');
            }
          }, 4000);
        } catch (err) {
          if (!isMounted) return;
          console.warn('TikZ render failure notice:', err);
          setError('TikZ 로더 초기화 실패');
          setLoading(false);
        }
      };

      startRender();

      return () => {
        isMounted = false;
      };
    }
  }, [code, type]);

  if (!code || type === 'none') {
    return null;
  }

  const scaleFactor = (scale || 100) / 100;
  const zoomStyle: React.CSSProperties = {
    maxWidth: '100%',
    transform: scaleFactor !== 1 ? `scale(${scaleFactor})` : undefined,
    transformOrigin: 'center center'
  };

  if (type === 'image') {
    if (imageError) {
      return (
        <div className={`flex flex-col items-center justify-center p-3 bg-stone-50 border border-stone-200 rounded text-stone-400 text-xs my-2 max-w-full ${className}`}>
          <ImageOff className="w-5 h-5 mb-1 text-stone-300" />
          <span>이미지를 불러올 수 없습니다</span>
          <span className="text-[10px] text-stone-400 font-mono-code truncate max-w-xs mt-0.5">
            {code}
          </span>
        </div>
      );
    }

    return (
      <div className={`flex justify-center items-center overflow-hidden my-2 max-w-full ${className}`}>
        <img
          src={code}
          alt="문제 삽화"
          style={zoomStyle}
          className={`max-w-full h-auto object-contain rounded ${isThumbnail ? 'max-h-24' : 'max-h-80'}`}
          onError={() => setImageError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col justify-center items-center my-2 select-none max-w-full overflow-hidden ${className}`}
      style={zoomStyle}
    >
      {loading && !cachedHtml && (
        <div className="flex items-center gap-2 text-xs text-stone-500 py-3 font-mono-code">
          <span className="inline-block w-3 h-3 border-2 border-stone-400 border-t-amber-600 rounded-full animate-spin"></span>
          <span>TikZ 삽화 렌더링 중...</span>
        </div>
      )}

      {error && !cachedHtml && (
        <div className="border border-amber-200 bg-amber-50 text-amber-800 text-xs px-3 py-2 rounded max-w-sm text-center">
          <p className="font-semibold">{error}</p>
          <p className="text-[10px] text-amber-600 mt-0.5 font-mono-code truncate">
            {code.slice(0, 50)}...
          </p>
        </div>
      )}

      {cachedHtml ? (
        <div
          ref={containerRef}
          className="tikz-svg-container w-full max-w-full flex justify-center items-center overflow-hidden"
          dangerouslySetInnerHTML={{ __html: cachedHtml }}
        />
      ) : (
        <div
          ref={containerRef}
          className="tikz-svg-container w-full max-w-full flex justify-center items-center overflow-hidden"
        />
      )}
    </div>
  );
};
