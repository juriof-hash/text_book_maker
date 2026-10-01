import React, { useEffect, useRef, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { IllustrationType } from '../types';
import { prepareTikZForRendering } from '../utils/illustrationRecognizer';
import { getCachedSVG, storeCachedSVG, processTikZScripts } from '../utils/renderEngine';

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

      const container = containerRef.current;
      if (!container) return;

      container.innerHTML = '';

      // 2. Insert standard TikZ script tag into container
      const script = document.createElement('script');
      script.type = 'text/tikz';
      script.textContent = prepared.body;
      container.appendChild(script);

      // 3. Trigger official tikzjax.com engine
      processTikZScripts()
        .then(() => {
          if (!isMounted) return;
          const svg = container.querySelector('svg');
          if (svg) {
            const svgHtml = container.innerHTML;
            storeCachedSVG(code, svgHtml);
            storeCachedSVG(prepared.body, svgHtml);
            setCachedHtml(svgHtml);
            setError(null);
            setLoading(false);
          } else {
            setLoading(false);
            setError('TikZ 삽화 렌더링 실패 (구문을 확인하세요)');
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          console.warn('TikZJax rendering error:', err);
          setLoading(false);
          setError('TikZ 엔진 초기화 실패');
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
