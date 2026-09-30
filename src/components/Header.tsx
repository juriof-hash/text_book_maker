import React, { useRef } from 'react';
import { Download, FileSpreadsheet, LayoutGrid, Printer, Settings2, Sparkles } from 'lucide-react';

interface HeaderProps {
  viewMode: 'thumb' | 'print';
  setViewMode: (mode: 'thumb' | 'print') => void;
  onUploadExcel: (file: File) => void;
  onLoadSamples: () => void;
  onOpenSettings: () => void;
  onExportExcel: () => void;
  onTriggerPrint: () => void;
  totalCount: number;
  includedCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  setViewMode,
  onUploadExcel,
  onLoadSamples,
  onOpenSettings,
  onExportExcel,
  onTriggerPrint,
  totalCount,
  includedCount
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadExcel(e.target.files[0]);
      e.target.value = '';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-stone-900 text-stone-100 border-b-2 border-amber-600 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element Brand Title */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-serif-kr text-base sm:text-lg font-bold tracking-tight text-amber-400">
            수식·삽화 문제집 조판기
          </span>
          <span className="hidden lg:inline text-xs text-stone-400 font-mono-code tabular-nums">
            전체 {totalCount}문항 · 포함 {includedCount}문항
          </span>
        </div>

        {/* Zone 2: Navigation Links / Segmented View Modes */}
        <nav className="flex items-center gap-1 bg-stone-800/80 p-1 rounded-md border border-stone-700/60">
          <button
            type="button"
            onClick={() => setViewMode('thumb')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              viewMode === 'thumb'
                ? 'bg-amber-500 text-stone-950 font-semibold shadow-xs'
                : 'text-stone-300 hover:text-white hover:bg-stone-700/50'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>문제 카드 편집</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('print')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              viewMode === 'print'
                ? 'bg-amber-500 text-stone-950 font-semibold shadow-xs'
                : 'text-stone-300 hover:text-white hover:bg-stone-700/50'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>인쇄 미리보기</span>
          </button>
        </nav>

        {/* Zone 3: Primary Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-200 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded transition-colors whitespace-nowrap"
            title="엑셀 파일 (.xlsx, .xls) 또는 CSV 가져오기"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">엑셀 불러오기</span>
          </button>

          <button
            type="button"
            onClick={onLoadSamples}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-300 hover:text-stone-100 hover:bg-stone-800 rounded transition-colors whitespace-nowrap"
            title="기하, 미적분, 통계, 회로 등 예제 문제 불러오기"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>샘플 데이터</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-300 hover:text-white hover:bg-stone-800 border border-stone-700 rounded transition-colors whitespace-nowrap"
            title="인쇄 머리글, 레이아웃, 글꼴 크기 설정"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">조판 설정</span>
          </button>

          <button
            type="button"
            onClick={onExportExcel}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-300 hover:text-white hover:bg-stone-800 border border-stone-700 rounded transition-colors whitespace-nowrap"
            title="수정된 문제 번호 및 쪽번호를 엑셀 파일로 저장"
          >
            <Download className="w-3.5 h-3.5" />
            <span>엑셀 저장</span>
          </button>

          <button
            type="button"
            onClick={onTriggerPrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded shadow-xs transition-colors whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>A4 인쇄</span>
          </button>
        </div>
      </div>
    </header>
  );
};
