import React, { useEffect, useRef } from 'react';
import { Check, CheckSquare, Edit3, Square, Trash2 } from 'lucide-react';
import { Problem } from '../types';
import { typesetMath } from '../utils/renderEngine';
import { IllustrationViewer } from './IllustrationViewer';

interface ProblemCardProps {
  problem: Problem;
  onToggleInclude: (id: string) => void;
  onUpdateNum: (id: string, num: string) => void;
  onUpdatePage: (id: string, page: number) => void;
  onOpenEdit: (problem: Problem) => void;
  onDelete: (id: string) => void;
}

export const ProblemCard: React.FC<ProblemCardProps> = ({
  problem,
  onToggleInclude,
  onUpdateNum,
  onUpdatePage,
  onOpenEdit,
  onDelete
}) => {
  const miniTextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (miniTextRef.current) {
      typesetMath(miniTextRef.current);
    }
  }, [problem.cleanedText, problem.rawText]);

  const hasIllustration = problem.illustrationType !== 'none' && Boolean(problem.illustrationCode);

  return (
    <div
      className={`group bg-white border rounded transition-all duration-150 flex flex-col justify-between overflow-hidden shadow-xs hover:border-amber-500 ${
        problem.include ? 'border-stone-300' : 'border-stone-200 opacity-55 bg-stone-50/80'
      }`}
    >
      {/* Mini Sheet Preview area - Clicking toggles print inclusion */}
      <div
        onClick={() => onToggleInclude(problem.id)}
        className="p-3 bg-stone-100/60 border-b border-stone-200 cursor-pointer relative select-none"
        title={problem.include ? '클릭하여 인쇄 제외' : '클릭하여 인쇄에 포함'}
      >
        <div className="bg-white border border-stone-200/90 rounded-sm p-3 aspect-[1/1.3] flex flex-col justify-between overflow-hidden shadow-2xs relative text-stone-900">
          <div>
            {/* Mini Unit & Number */}
            <div className="flex items-baseline justify-between border-b border-stone-200 pb-1 mb-2">
              <span className="text-[10px] text-amber-700 font-serif-kr font-semibold truncate max-w-[120px]">
                {problem.unit}
              </span>
              <span className="text-xs font-serif-kr font-bold text-stone-900">
                {problem.num}
              </span>
            </div>

            {/* Mini Problem Text */}
            <div
              ref={miniTextRef}
              className="text-[11px] leading-relaxed text-stone-700 line-clamp-5 font-serif-kr select-none whitespace-pre-line"
            >
              {problem.cleanedText || problem.rawText}
            </div>

            {/* Mini Illustration Indicator / Preview */}
            {hasIllustration && (
              <div className="mt-2 pt-2 border-t border-dashed border-stone-200/80 flex flex-col items-center">
                <div className="w-full flex justify-center max-h-20 overflow-hidden pointer-events-none opacity-90 scale-90">
                  <IllustrationViewer
                    type={problem.illustrationType}
                    code={problem.illustrationCode}
                    scale={problem.illustrationScale || 100}
                    isThumbnail
                  />
                </div>
              </div>
            )}
          </div>

          {/* Mini Bottom Page Indicator & Selection Status */}
          <div className="flex items-center justify-between text-[10px] font-mono-code pt-1 border-t border-stone-100">
            <span className={problem.include ? 'text-amber-700 font-semibold' : 'text-stone-400'}>
              {problem.include ? '인쇄 포함' : '인쇄 제외'}
            </span>
            <span className="text-stone-500 font-semibold">{problem.page}쪽</span>
          </div>
        </div>

        {/* Hover Indicator: Clicking toggles print selection */}
        <div className="absolute inset-0 bg-stone-900/15 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          {problem.include ? (
            <span className="bg-amber-600 text-white text-[11px] font-medium px-2.5 py-1.5 rounded shadow flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5" />
              <span>선택됨 (클릭 시 인쇄 제외)</span>
            </span>
          ) : (
            <span className="bg-stone-800 text-white text-[11px] font-medium px-2.5 py-1.5 rounded shadow flex items-center gap-1.5">
              <Square className="w-3.5 h-3.5" />
              <span>클릭하여 인쇄에 포함</span>
            </span>
          )}
        </div>
      </div>

      {/* Card Form & Controls */}
      <div className="p-3 flex flex-col gap-2.5 text-xs bg-white">
        {/* Include Toggle & Recognition Source */}
        <div className="flex items-center justify-between gap-1">
          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-stone-800 select-none">
            <input
              type="checkbox"
              checked={problem.include}
              onChange={() => onToggleInclude(problem.id)}
              className="w-3.5 h-3.5 text-amber-600 rounded border-stone-300 focus:ring-0 cursor-pointer"
            />
            <span className="text-stone-800 font-semibold">선택하여 인쇄</span>
          </label>

          {/* Recognition Type Tag */}
          <div className="text-[10px] text-stone-500 font-mono-code flex items-center gap-1">
            {problem.illustrationType === 'tikz' && (
              <span className="text-blue-700 font-medium">TikZ 삽화</span>
            )}
            {problem.illustrationType === 'svg' && (
              <span className="text-emerald-700 font-medium">SVG 벡터</span>
            )}
            {problem.illustrationType === 'image' && (
              <span className="text-indigo-700 font-medium">이미지</span>
            )}
            {problem.illustrationType === 'none' && (
              <span className="text-stone-400">삽화 없음</span>
            )}
            {problem.illustrationSource === 'inline' && (
              <span className="text-amber-700">· 본문추출</span>
            )}
          </div>
        </div>

        {/* Problem Number & Page Number inputs */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded px-2 py-1">
            <span className="text-[11px] text-stone-500 shrink-0">문항</span>
            <input
              type="text"
              value={problem.num}
              onChange={(e) => onUpdateNum(problem.id, e.target.value)}
              className="w-full text-xs font-semibold text-stone-800 bg-transparent focus:outline-none"
              placeholder="01"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded px-2 py-1">
            <span className="text-[11px] text-stone-500 shrink-0">쪽</span>
            <input
              type="number"
              value={problem.page}
              onChange={(e) => onUpdatePage(problem.id, parseInt(e.target.value, 10) || 1)}
              className="w-full text-xs font-semibold text-stone-800 bg-transparent focus:outline-none font-mono-code"
              placeholder="1"
            />
          </div>
        </div>

        {/* Bottom Action Row: Dedicated Edit Button and Delete */}
        <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
          <button
            type="button"
            onClick={() => onOpenEdit(problem)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-amber-100 hover:text-amber-900 border border-stone-200 rounded transition-colors"
            title="문항 본문, 수식(LaTeX) 및 삽화(TikZ/SVG) 상세 편집창 열기"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-600" />
            <span>편집창으로 이동</span>
          </button>

          <button
            type="button"
            onClick={() => onDelete(problem.id)}
            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded border border-transparent hover:border-rose-200 transition-colors"
            title="문항 삭제"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
