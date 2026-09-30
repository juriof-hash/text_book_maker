import React, { useEffect, useRef } from 'react';
import { Edit3, Eye, FileText, Image, Trash2 } from 'lucide-react';
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
        problem.include ? 'border-stone-300' : 'border-stone-200 opacity-50 bg-stone-50/70'
      }`}
    >
      {/* Mini Sheet Preview area (proportional to A4 1:1.414) */}
      <div
        onClick={() => onOpenEdit(problem)}
        className="p-3 bg-stone-100/60 border-b border-stone-200 cursor-pointer relative"
        title="클릭하여 수식 및 삽화 상세 편집"
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
              className="text-[11px] leading-relaxed text-stone-700 line-clamp-5 font-serif-kr select-none"
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

          {/* Mini Bottom Page Indicator */}
          <div className="text-center text-[10px] font-mono-code text-stone-400 pt-1 border-t border-stone-100">
            {problem.page}쪽
          </div>
        </div>

        {/* Floating Quick Edit Hover Indicator */}
        <div className="absolute inset-0 bg-stone-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="bg-stone-900/85 text-white text-[11px] font-medium px-2 py-1 rounded shadow-sm flex items-center gap-1">
            <Edit3 className="w-3 h-3 text-amber-400" />
            <span>편집 및 미리보기</span>
          </span>
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
            <span>인쇄 포함</span>
          </label>

          {/* Recognition Type Tag */}
          <div className="text-[10px] text-stone-500 font-mono-code flex items-center gap-1">
            {problem.illustrationType === 'tikz' && (
              <span className="text-blue-700">TikZ 삽화</span>
            )}
            {problem.illustrationType === 'svg' && (
              <span className="text-emerald-700">SVG 벡터</span>
            )}
            {problem.illustrationType === 'image' && (
              <span className="text-indigo-700">이미지</span>
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

        {/* Action button row */}
        <div className="flex items-center justify-between pt-1 border-t border-stone-100 text-stone-500">
          <button
            type="button"
            onClick={() => onOpenEdit(problem)}
            className="flex items-center gap-1 text-[11px] text-stone-600 hover:text-stone-900 transition-colors"
          >
            <Edit3 className="w-3 h-3 text-amber-600" />
            <span>상세 편집</span>
          </button>

          <button
            type="button"
            onClick={() => onDelete(problem.id)}
            className="text-[11px] text-stone-400 hover:text-rose-600 transition-colors"
            title="문항 삭제"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
