import React, { useRef } from 'react';
import {
  FileCode,
  FileSpreadsheet,
  HelpCircle,
  Layers,
  Sparkles,
  Upload
} from 'lucide-react';

interface EmptyStateProps {
  onUploadExcel: (file: File) => void;
  onLoadSamples: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onUploadExcel,
  onLoadSamples
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadExcel(e.target.files[0]);
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-3xl mx-auto my-12 px-4 no-print">
      <div className="bg-white border border-stone-200 rounded-lg p-8 sm:p-10 shadow-xs text-center">
        <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto mb-4">
          <Layers className="w-6 h-6" />
        </div>

        <h2 className="font-serif-kr text-xl sm:text-2xl font-bold text-stone-900 mb-2">
          수학·과학 문제집 DB를 불러오세요
        </h2>

        <p className="text-stone-600 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed mb-6 font-serif-kr">
          단원, 문제번호, 문제내용(LaTeX 수식), 삽화코드(TikZ, SVG, 이미지)가 포함된 스프레드시트를 불러오면
          인쇄용 A4 규격에 맞춰 자동으로 고품질 조판됩니다.
        </p>

        {/* Feature Highlights with Smart Recognition focus */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left mb-8 max-w-2xl mx-auto">
          <div className="p-3.5 bg-stone-50 rounded border border-stone-200/80">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-stone-900 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>지능형 삽화 인식</span>
            </div>
            <p className="text-[11px] text-stone-500 leading-normal">
              엑셀 열뿐만 아니라 문제 본문 안에 적힌 TikZ, SVG, 이미지 태그까지 자동으로 감지하여 분리 조판합니다.
            </p>
          </div>

          <div className="p-3.5 bg-stone-50 rounded border border-stone-200/80">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-stone-900 mb-1">
              <FileCode className="w-3.5 h-3.5 text-blue-600" />
              <span>TikZ WebAssembly 렌더</span>
            </div>
            <p className="text-[11px] text-stone-500 leading-normal">
              복잡한 기하 도형, 미적분 그래프, 좌표평면을 브라우저에서 직접 벡터 SVG로 초고속 렌더링 및 캐싱합니다.
            </p>
          </div>

          <div className="p-3.5 bg-stone-50 rounded border border-stone-200/80">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-stone-900 mb-1">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>자유로운 열 구조</span>
            </div>
            <p className="text-[11px] text-stone-500 leading-normal">
              열 순서가 다른 엑셀 파일도 자동 감지하며, 필요 시 대화형 열 매핑 도구로 즉시 지정할 수 있습니다.
            </p>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
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
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded shadow-xs transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>엑셀 파일 선택 (.xlsx / .csv)</span>
          </button>

          <button
            type="button"
            onClick={onLoadSamples}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 rounded shadow-2xs transition-colors"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>샘플 문제 세트 둘러보기</span>
          </button>
        </div>

        {/* Format hint */}
        <div className="mt-8 pt-4 border-t border-stone-100 text-[11px] text-stone-400 font-mono-code">
          권장 열 구성: [단원] · [문제번호] · [문제내용] · [쪽번호] · [삽화유형] · [삽화코드]
        </div>
      </div>
    </div>
  );
};
