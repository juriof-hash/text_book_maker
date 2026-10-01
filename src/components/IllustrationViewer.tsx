import React, { useEffect, useRef, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { IllustrationType } from '../types';
import { prepareTikZForRendering } from '../utils/illustrationRecognizer';
import { getCachedSVG, storeCachedSVG } from '../utils/renderEngine';

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
      // 1. Instant Cache Lookup
      const rawCached = getCachedSVG(code);
      if (rawCached) {
        setCachedHtml(rawCached);
        setError(null);
        setLoading(false);
        return;
      }

      const prepared = prepareTikZForRendering(code);
      const preparedCached = getCachedSVG(prepared.body);
      if (preparedCached) {
        setCachedHtml(preparedCached);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      let isMounted = true;
      let timeoutTimer: NodeJS.Timeout | null = null;
      let observer: MutationObserver | null = null;

      const container = containerRef.current;
      if (!container) return;

      container.innerHTML = '';

      const handleSuccess = (svgElement: Element) => {
        if (!isMounted) return;
        if (timeoutTimer) clearTimeout(timeoutTimer);
        if (observer) observer.disconnect();
        const svgHtml = svgElement.outerHTML;
        storeCachedSVG(code, svgHtml);
        storeCachedSVG(prepared.body, svgHtml);
        setCachedHtml(svgHtml);
        setError(null);
        setLoading(false);
      };

      const handleFailure = (msg: string) => {
        if (!isMounted) return;
        if (timeoutTimer) clearTimeout(timeoutTimer);
        if (observer) observer.disconnect();
        setLoading(false);
        setError(msg);
      };

      // 2. High-speed MutationObserver: detects SVG the exact millisecond it is produced
      observer = new MutationObserver(() => {
        if (!isMounted) return;
        const svg = container.querySelector('svg');
        if (svg) {
          handleSuccess(svg);
          return;
        }
        const failedImg = container.querySelector('img[src*="invalid.site"]');
        if (failedImg) {
          handleFailure('TikZ 컴파일 오류 (수식 또는 기하 좌표 구문을 확인하세요)');
        }
      });
      observer.observe(container, { childList: true, subtree: true });

      // 3. Bubbling load-finished event listener
      const onFinished = (e: Event) => {
        if (!isMounted) return;
        const target = e.target as HTMLElement;
        let svg = container.querySelector('svg');
        if (!svg && target && target.tagName?.toLowerCase() === 'svg') {
          svg = target as unknown as SVGSVGElement;
        }
        if (svg) {
          handleSuccess(svg);
        }
      };
      container.addEventListener('tikzjax-load-finished', onFinished, { capture: true });

      // 4. Create and inject configured script with essential math libraries
      const script = document.createElement('script');
      script.type = 'text/tikz';
      script.textContent = prepared.body;
      script.setAttribute('data-tikz-libraries', prepared.libraries);
      if (Object.keys(prepared.packages).length > 0) {
        script.setAttribute('data-tex-packages', JSON.stringify(prepared.packages));
      }
      container.appendChild(script);

      // 5. Safety timeout (5s instead of 10s)
      timeoutTimer = setTimeout(() => {
        if (!isMounted) return;
        if (observer) observer.disconnect();
        container.removeEventListener('tikzjax-load-finished', onFinished, { capture: true });
        const svg = container.querySelector('svg');
        if (svg) {
          handleSuccess(svg);
        } else {
          handleFailure('TikZ 렌더링 시간 초과 (구문 확인 필요)');
        }
      }, 5000);

      return () => {
        isMounted = false;
        if (observer) observer.disconnect();
        if (timeoutTimer) clearTimeout(timeoutTimer);
        container.removeEventListener('tikzjax-load-finished', onFinished, { capture: true });
      };
    }
  }, [code, type]);

  if (!code || type === 'none') {
    return null;
  }

  const scaleFactor = (scale || 100) / 100;
  const zoomStyle: React.CSSProperties = {
    transform: scaleFactor !== 1 ? `scale(${scaleFactor})` : undefined,
    transformOrigin: 'center center'
  };

  if (type === 'image') {
    if (imageError) {
      return (
        <div className={`flex flex-col items-center justify-center p-3 bg-stone-50 border border-stone-200 rounded text-stone-400 text-xs my-2 ${className}`}>
          <ImageOff className="w-5 h-5 mb-1 text-stone-300" />
          <span>이미지를 불러올 수 없습니다</span>
          <span className="text-[10px] text-stone-400 font-mono-code truncate max-w-xs mt-0.5">
            {code}
          </span>
        </div>
      );
    }

    return (
      <div className={`flex justify-center items-center overflow-hidden my-2 ${className}`}>
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
      className={`relative flex flex-col justify-center items-center my-2 select-none ${className}`}
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
          className="tikz-svg-container w-full flex justify-center items-center"
          dangerouslySetInnerHTML={{ __html: cachedHtml }}
        />
      ) : (
        <div
          ref={containerRef}
          className="tikz-svg-container w-full flex justify-center items-center"
        />
      )}
    </div>
  );
};
