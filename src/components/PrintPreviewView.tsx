import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Printer, RefreshCw, Settings2, ZoomIn, ZoomOut } from 'lucide-react';
import { PrintSettings, Problem } from '../types';
import { renderTikZInContainer, typesetMath } from '../utils/renderEngine';
import { IllustrationViewer } from './IllustrationViewer';

interface PrintPreviewViewProps {
  problems: Problem[];
  settings: PrintSettings;
  onBackToThumbnails: () => void;
  onOpenSettings: () => void;
}

export const PrintPreviewView: React.FC<PrintPreviewViewProps> = ({
  problems,
  settings,
  onBackToThumbnails,
  onOpenSettings
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isRendering, setIsRendering] = useState(true);
  const [renderProgress, setRenderProgress] = useState({ completed: 0, total: 0 });

  // Filter only included problems, sorted by page then order
  const includedProblems = problems
    .filter((p) => p.include)
    .sort((a, b) => {
      const pa = a.page ?? 9999;
      const pb = b.page ?? 9999;
      if (pa !== pb) return pa - pb;
      return a.order - b.order;
    });

  // Group problems into pages based on layoutMode:
  // 1) 'single': 1장 1문제
  // 2) 'double': 1장 2문제 (상·하 2행 분할)
  // 3) 'two-column': 1장 2문제 (좌·우 2열 분할, 1열 1문제)
  const pages: Problem[][] = [];
  if (settings.layoutMode === 'single') {
    includedProblems.forEach((p) => {
      pages.push([p]);
    });
  } else {
    // Both 2-problem modes put exactly 2 problems per page
    for (let i = 0; i < includedProblems.length; i += 2) {
      pages.push(includedProblems.slice(i, i + 2));
    }
  }

  // Effect to typeset math and render diagrams
  useEffect(() => {
    const container = printAreaRef.current;
    if (!container) return;

    setIsRendering(true);

    const runRender = async () => {
      try {
        // Typeset LaTeX math with MathJax across the print pages
        await typesetMath(container);
      } catch (err) {
        console.warn('Print preview math typesetting notice:', err);
      } finally {
        setIsRendering(false);
      }
    };

    runRender();
  }, [includedProblems, settings.layoutMode, settings.fontSize]);

  const handlePrint = () => {
    window.print();
  };

  const getPageNumberText = (pageIdx: number, totalPages: number) => {
    const pageNum = pageIdx + (settings.startPageNumber || 1);
    switch (settings.pageNumberFormat) {
      case 'dash':
        return `- ${pageNum} -`;
      case 'fraction':
        return `${pageNum} / ${totalPages}`;
      case 'simple':
        return `${pageNum}쪽`;
      case 'none':
        return '';
      default:
        return `- ${pageNum} -`;
    }
  };

  const getFontSizeClass = () => {
    switch (settings.fontSize) {
      case 'compact':
        return 'text-[11pt] leading-[1.8]';
      case 'large':
        return 'text-[13.5pt] leading-[2.1]';
      case 'standard':
      default:
        return 'text-[12pt] leading-[1.95]';
    }
  };

  return (
    <div className="min-h-screen bg-stone-300 dark:bg-stone-900 pb-20">
      {/* Top Floating Action Bar for Print Preview */}
      <div className="sticky top-14 z-30 bg-stone-900/95 backdrop-blur text-stone-100 border-b border-stone-800 px-4 py-2.5 shadow-md flex items-center justify-between no-print">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToThumbnails}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-200 bg-stone-800 hover:bg-stone-700 rounded transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>문제 카드 목록으로</span>
          </button>

          <span className="text-xs text-stone-400 font-mono-code tabular-nums hidden sm:inline">
            총 {pages.length}쪽 (포함 문항 {includedProblems.length}개)
          </span>

          {isRendering && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono-code">
              <span className="inline-block w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></span>
              <span>수식 및 삽화 조판 중...</span>
            </div>
          )}
        </div>

        {/* Zoom & Print Trigger */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="hidden md:flex items-center gap-1 bg-stone-800 rounded px-1.5 py-0.5 border border-stone-700 text-xs">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(60, z - 10))}
              className="p-1 text-stone-300 hover:text-white"
              title="축소"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="w-10 text-center font-mono-code text-[11px]">{zoomLevel}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
              className="p-1 text-stone-300 hover:text-white"
              title="확대"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 rounded transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>조판 설정</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded shadow-sm transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>A4 인쇄하기</span>
          </button>
        </div>
      </div>

      {/* Pages Container with scalable zoom */}
      <div className="max-w-5xl mx-auto py-8 px-4 flex flex-col items-center print-area-wrapper">
        <div
          ref={printAreaRef}
          style={{
            transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined,
            transformOrigin: 'top center'
          }}
          className="transition-transform duration-100"
        >
          {pages.length === 0 ? (
            <div className="bg-white p-12 rounded shadow text-center text-stone-500 max-w-md my-12">
              <p className="font-semibold text-stone-700 mb-1">인쇄에 포함된 문제가 없습니다.</p>
              <p className="text-xs">
                상단의 [문제 카드 편집] 탭으로 이동하여 인쇄할 문제의 체크박스를 선택해 주세요.
              </p>
            </div>
          ) : (
            pages.map((pageProblems, pageIdx) => (
              <div
                key={`page_${pageIdx}`}
                className="print-page a4-page-shadow bg-white text-stone-900 mx-auto my-6 flex flex-col justify-between"
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  padding: '16mm 18mm 18mm 18mm',
                  boxSizing: 'border-box'
                }}
              >
                {/* Page Top Area: Header on First Page or configured */}
                <div>
                  {/* Exam Paper Official Header */}
                  {(pageIdx === 0 || settings.showNameBox) && (
                    <div className="border-b-2 border-stone-900 pb-2 mb-4">
                      <div className="flex items-end justify-between">
                        <div>
                          {settings.schoolOrOrg && (
                            <div className="text-[9pt] text-stone-600 font-serif-kr">
                              {settings.schoolOrOrg}
                            </div>
                          )}
                          <h2 className="font-serif-kr text-[14pt] font-extrabold tracking-tight text-stone-900 leading-tight">
                            {settings.bookTitle || '2027학년도 영재원 대비'}
                          </h2>
                        </div>
                        {settings.subTitle && (
                          <div className="font-serif-kr text-[12.5pt] font-bold text-amber-900 shrink-0">
                            {settings.subTitle}
                          </div>
                        )}
                      </div>

                      {/* Student info box */}
                      {settings.showNameBox && (
                        <div className="flex items-center justify-between text-[9pt] font-serif-kr pt-2 mt-1 border-t border-stone-300">
                          <div>
                            성명: <span className="inline-block w-28 border-b border-stone-600"></span>
                          </div>
                          <div>
                            수험번호: <span className="inline-block w-28 border-b border-stone-600"></span>
                          </div>
                          <div>
                            점수: <span className="inline-block w-16 border-b border-stone-600"></span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Problems Content by Layout Mode */}
                  {settings.layoutMode === 'two-column' ? (
                    /* 1장 2문제 (좌·우 2열 분할, 1열 1문제) */
                    <div className="grid grid-cols-2 gap-8 relative min-h-[220mm] flex-1">
                      {/* Vertical dividing line between left and right columns */}
                      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-stone-300 -translate-x-1/2"></div>

                      {/* Left Column: Problem 1 of this page */}
                      <div className="flex flex-col justify-between pr-4 h-full">
                        {pageProblems[0] ? (
                          <div className="flex flex-col flex-1 h-full">
                            {settings.showUnitHeader && pageProblems[0].unit && (
                              <div className="text-[9.5pt] text-amber-800 font-serif-kr font-medium mb-1">
                                [{pageProblems[0].unit}]
                              </div>
                            )}
                            <div className="flex items-baseline gap-2 mb-2">
                              <span className="font-serif-kr font-bold text-[14pt] text-stone-900 shrink-0">
                                {pageProblems[0].num}.
                              </span>
                              <div
                                className={`font-serif-kr ${getFontSizeClass()} text-stone-900 leading-relaxed break-keep`}
                              >
                                {pageProblems[0].cleanedText || pageProblems[0].rawText}
                              </div>
                            </div>

                            {/* Illustration */}
                            {pageProblems[0].illustrationType !== 'none' && pageProblems[0].illustrationCode && (
                              <div
                                className={`my-4 flex ${
                                  pageProblems[0].illustrationPosition === 'left'
                                    ? 'justify-start'
                                    : pageProblems[0].illustrationPosition === 'right'
                                    ? 'justify-end'
                                    : 'justify-center'
                                }`}
                              >
                                <IllustrationViewer
                                  type={pageProblems[0].illustrationType}
                                  code={pageProblems[0].illustrationCode}
                                  scale={pageProblems[0].illustrationScale || settings.defaultIllustrationScale}
                                />
                              </div>
                            )}

                            {/* Workspace / Note space at bottom (hidden during print) */}
                            <div className="mt-auto pt-8 border-t border-dotted border-stone-200 text-stone-300 text-[10px] font-serif-kr text-center no-print select-none">
                              [ 풀이 공간 ]
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {/* Right Column: Problem 2 of this page */}
                      <div className="flex flex-col justify-between pl-4 h-full">
                        {pageProblems[1] ? (
                          <div className="flex flex-col flex-1 h-full">
                            {settings.showUnitHeader && pageProblems[1].unit && (
                              <div className="text-[9.5pt] text-amber-800 font-serif-kr font-medium mb-1">
                                [{pageProblems[1].unit}]
                              </div>
                            )}
                            <div className="flex items-baseline gap-2 mb-2">
                              <span className="font-serif-kr font-bold text-[14pt] text-stone-900 shrink-0">
                                {pageProblems[1].num}.
                              </span>
                              <div
                                className={`font-serif-kr ${getFontSizeClass()} text-stone-900 leading-relaxed break-keep`}
                              >
                                {pageProblems[1].cleanedText || pageProblems[1].rawText}
                              </div>
                            </div>

                            {/* Illustration */}
                            {pageProblems[1].illustrationType !== 'none' && pageProblems[1].illustrationCode && (
                              <div
                                className={`my-4 flex ${
                                  pageProblems[1].illustrationPosition === 'left'
                                    ? 'justify-start'
                                    : pageProblems[1].illustrationPosition === 'right'
                                    ? 'justify-end'
                                    : 'justify-center'
                                }`}
                              >
                                <IllustrationViewer
                                  type={pageProblems[1].illustrationType}
                                  code={pageProblems[1].illustrationCode}
                                  scale={pageProblems[1].illustrationScale || settings.defaultIllustrationScale}
                                />
                              </div>
                            )}

                            {/* Workspace / Note space at bottom (hidden during print) */}
                            <div className="mt-auto pt-8 border-t border-dotted border-stone-200 text-stone-300 text-[10px] font-serif-kr text-center no-print select-none">
                              [ 풀이 공간 ]
                            </div>
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center border border-dashed border-stone-200 rounded text-stone-300 text-xs font-serif-kr no-print select-none">
                            [ 여백 ]
                          </div>
                        )}
                      </div>
                    </div>
                  ) : settings.layoutMode === 'double' ? (
                    /* 2 Problems per Page Layout (Top & Bottom split) */
                    <div className="flex flex-col justify-between gap-6 min-h-[220mm]">
                      {pageProblems.map((p, idx) => (
                        <div
                          key={p.id}
                          className={`flex flex-col flex-1 ${
                            idx === 1 ? 'pt-5 border-t border-dashed border-stone-300' : ''
                          }`}
                        >
                          {settings.showUnitHeader && p.unit && (
                            <div className="text-[9.5pt] text-amber-800 font-serif-kr font-semibold mb-1">
                              [{p.unit}]
                            </div>
                          )}

                          <div className="flex items-baseline gap-2 mb-2">
                            <span className="font-serif-kr font-bold text-[14pt] text-stone-900 shrink-0">
                              {p.num}.
                            </span>
                            <div
                              className={`font-serif-kr ${getFontSizeClass()} text-stone-900 leading-relaxed break-keep`}
                            >
                              {p.cleanedText || p.rawText}
                            </div>
                          </div>

                          {/* Illustration */}
                          {p.illustrationType !== 'none' && p.illustrationCode && (
                            <div
                              className={`my-3 flex ${
                                p.illustrationPosition === 'left'
                                  ? 'justify-start'
                                  : p.illustrationPosition === 'right'
                                  ? 'justify-end'
                                  : 'justify-center'
                              }`}
                            >
                              <IllustrationViewer
                                type={p.illustrationType}
                                code={p.illustrationCode}
                                scale={p.illustrationScale || settings.defaultIllustrationScale}
                              />
                            </div>
                          )}

                          <div className="mt-auto pt-4 border-t border-dotted border-stone-200 text-stone-300 text-[10px] font-serif-kr text-center no-print select-none">
                            [ 풀이 공간 ]
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Single Problem per Page Layout */
                    <div className="flex flex-col min-h-[220mm]">
                      {pageProblems.map((p) => (
                        <div key={p.id} className="flex flex-col flex-1">
                          {settings.showUnitHeader && p.unit && (
                            <div className="text-[10pt] text-amber-800 font-serif-kr font-semibold mb-1.5">
                              [{p.unit}]
                            </div>
                          )}

                          <div className="flex items-baseline gap-2 mb-3">
                            <span className="font-serif-kr font-bold text-[16pt] text-stone-900 shrink-0">
                              {p.num}.
                            </span>
                            <div
                              className={`font-serif-kr ${getFontSizeClass()} text-stone-900 leading-loose break-keep`}
                            >
                              {p.cleanedText || p.rawText}
                            </div>
                          </div>

                          {/* Illustration */}
                          {p.illustrationType !== 'none' && p.illustrationCode && (
                            <div
                              className={`my-6 flex ${
                                p.illustrationPosition === 'left'
                                  ? 'justify-start'
                                  : p.illustrationPosition === 'right'
                                  ? 'justify-end'
                                  : 'justify-center'
                              }`}
                            >
                              <IllustrationViewer
                                type={p.illustrationType}
                                code={p.illustrationCode}
                                scale={p.illustrationScale || settings.defaultIllustrationScale}
                              />
                            </div>
                          )}

                          {/* Ample note & solution workspace area (hidden during print) */}
                          <div className="mt-auto pt-10 border-t border-dotted border-stone-200 text-stone-300 text-xs font-serif-kr text-center no-print select-none">
                            [ 풀이 공간 ]
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Page Number */}
                <div className="text-center font-mono-code text-[9.5pt] text-stone-500 pt-3 border-t border-stone-200/80">
                  {getPageNumberText(pageIdx, pages.length)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
