import React from 'react';
import {
  CheckSquare,
  FileDown,
  Hash,
  Plus,
  RotateCcw,
  Search,
  Square
} from 'lucide-react';
import { LayoutMode } from '../types';

interface ControlBarProps {
  units: string[];
  selectedUnit: string;
  onSelectUnit: (unit: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  layoutMode: LayoutMode;
  onChangeLayoutMode: (mode: LayoutMode) => void;
  onRenumber: () => void;
  onToggleAll: () => void;
  allIncluded: boolean;
  onAddNewProblem: () => void;
  onExportExcel: () => void;
  typeFilter: string;
  onChangeTypeFilter: (t: string) => void;
  stats: {
    total: number;
    included: number;
    withIllustration: number;
    tikzCount: number;
    svgCount: number;
    inlineCount: number;
  };
}

export const ControlBar: React.FC<ControlBarProps> = ({
  units,
  selectedUnit,
  onSelectUnit,
  searchQuery,
  onSearchChange,
  layoutMode,
  onChangeLayoutMode,
  onRenumber,
  onToggleAll,
  allIncluded,
  onAddNewProblem,
  onExportExcel,
  typeFilter,
  onChangeTypeFilter,
  stats
}) => {
  return (
    <div className="bg-stone-50 border-b border-stone-200 px-4 sm:px-6 py-3 no-print">
      <div className="max-w-7xl mx-auto flex flex-col gap-3">
        {/* Top row: filters, search, layout mode */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Unit selector & search */}
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
            <select
              value={selectedUnit}
              onChange={(e) => onSelectUnit(e.target.value)}
              className="text-xs font-medium text-stone-800 bg-white border border-stone-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-600 cursor-pointer shadow-xs max-w-[200px] truncate"
            >
              <option value="ALL">모든 단원 ({stats.total})</option>
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>

            {/* Illustration type filter */}
            <select
              value={typeFilter}
              onChange={(e) => onChangeTypeFilter(e.target.value)}
              className="text-xs font-medium text-stone-800 bg-white border border-stone-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-600 cursor-pointer shadow-xs"
            >
              <option value="ALL">모든 삽화 유형</option>
              <option value="tikz">TikZ 코드 ({stats.tikzCount})</option>
              <option value="svg">SVG 벡터 ({stats.svgCount})</option>
              <option value="inline">본문 인라인 추출 ({stats.inlineCount})</option>
              <option value="none">삽화 없음</option>
            </select>

            {/* Search */}
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="문제 번호, 수식, 본문 검색..."
                className="w-full pl-8 pr-3 py-1.5 text-xs text-stone-800 bg-white border border-stone-300 rounded placeholder:text-stone-400 focus:outline-none focus:border-amber-600 shadow-xs"
              />
            </div>
          </div>

          {/* Layout mode switcher */}
          <div className="flex items-center gap-1 bg-stone-200/80 p-0.5 rounded border border-stone-300 shrink-0">
            <button
              type="button"
              onClick={() => onChangeLayoutMode('single')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                layoutMode === 'single'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="1페이지에 1문항 배치 (넓은 풀이 공간)"
            >
              1문제 1쪽
            </button>
            <button
              type="button"
              onClick={() => onChangeLayoutMode('double')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                layoutMode === 'double'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="1페이지에 2문항 배치 (상·하 분할)"
            >
              2문제 1쪽
            </button>
            <button
              type="button"
              onClick={() => onChangeLayoutMode('two-column')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                layoutMode === 'two-column'
                  ? 'bg-white text-stone-900 shadow-xs font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="수능 및 모의고사 스타일 (2단 세로 분할)"
            >
              2단 시험지형
            </button>
          </div>
        </div>

        {/* Bottom row: bulk actions & clean statistics */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-200/70 text-xs">
          {/* Metadata indicators - clean unboxed typography without pills */}
          <div className="flex items-center gap-2 text-stone-500 font-mono-code tabular-nums">
            <span>
              선택 <strong className="text-stone-800">{stats.included}</strong> / {stats.total}
            </span>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span>
              삽화 문항 <strong className="text-amber-700">{stats.withIllustration}</strong>개
            </span>
            <span aria-hidden="true" className="text-stone-300">·</span>
            <span className="hidden sm:inline">
              TikZ {stats.tikzCount} · SVG {stats.svgCount}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={onToggleAll}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 transition-colors"
            >
              {allIncluded ? (
                <>
                  <Square className="w-3.5 h-3.5 text-stone-500" />
                  <span>전체 해제</span>
                </>
              ) : (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
                  <span>전체 선택</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onRenumber}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 transition-colors"
              title="포함된 문제의 순서에 따라 쪽번호를 1부터 순차적으로 재정렬합니다"
            >
              <Hash className="w-3.5 h-3.5 text-stone-500" />
              <span>쪽번호 자동 매기기</span>
            </button>

            <button
              type="button"
              onClick={onAddNewProblem}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-stone-500" />
              <span>문항 직접 추가</span>
            </button>

            <button
              type="button"
              onClick={onExportExcel}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 transition-colors"
              title="수정된 설정(번호, 쪽번호, 삽화)을 엑셀로 내보내기"
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-600" />
              <span>엑셀 저장</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
