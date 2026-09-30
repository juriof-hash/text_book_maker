import React, { useEffect, useRef, useState } from 'react';
import { IllustrationType } from '../types';
import { getCachedSVG, renderTikZInContainer, storeCachedSVG } from '../utils/renderEngine';

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

  useEffect(() => {
    if (!code || type === 'none') {
      setCachedHtml(null);
      setError(null);
      return;
    }

    if (type === 'svg') {
      setCachedHtml(code);
      setError(null);
      return;
    }

    if (type === 'image') {
      setCachedHtml(null);
      setError(null);
      return;
    }

    if (type === 'tikz') {
      const cached = getCachedSVG(code);
      if (cached) {
        setCachedHtml(cached);
        setError(null);
        setLoading(false);
        return;
      }

      // Not cached, need to render via TikZJax
      setLoading(true);
      setError(null);
      const container = containerRef.current;
      if (!container) return;

      // Clear previous content
      container.innerHTML = '';

      const script = document.createElement('script');
      script.type = 'text/tikz';
      script.textContent = code;
      container.setAttribute('data-tikz-source', code);
      container.appendChild(script);

      let isMounted = true;

      renderTikZInContainer(container)
        .then(() => {
          if (!isMounted) return;
          const svg = container.querySelector('svg');
          if (svg) {
            storeCachedSVG(code, svg.outerHTML);
            setCachedHtml(svg.outerHTML);
            setError(null);
          }
          setLoading(false);
        })
        .catch((err) => {
          if (!isMounted) return;
          console.warn('TikZ diagram render error:', err);
          setError('TikZ 삽화 렌더링 실패');
          setLoading(false);
        });

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
    transform: scaleFactor !== 1 ? `scale(${scaleFactor})` : undefined,
    transformOrigin: 'center center'
  };

  if (type === 'image') {
    return (
      <div className={`flex justify-center items-center overflow-hidden my-2 ${className}`}>
        <img
          src={code}
          alt="문제 삽화"
          style={zoomStyle}
          className={`max-w-full h-auto object-contain rounded ${isThumbnail ? 'max-h-24' : 'max-h-80'}`}
          onError={() => setError('이미지를 불러올 수 없습니다.')}
        />
        {error && <div className="text-xs text-rose-500 mt-1">{error}</div>}
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
        <div className="border border-rose-200 bg-rose-50 text-rose-700 text-xs px-3 py-2 rounded max-w-sm text-center">
          <p className="font-semibold">{error}</p>
          <p className="text-[11px] text-rose-500 mt-0.5 font-mono-code truncate">
            {code.slice(0, 40)}...
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
