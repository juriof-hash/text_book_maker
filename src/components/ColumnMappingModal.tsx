import React, { useState } from 'react';
import { Columns3, HelpCircle, X } from 'lucide-react';
import { ColumnMapping } from '../types';

interface ColumnMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  headers: string[];
  initialMapping: ColumnMapping;
  sampleRows: unknown[][];
  onApplyMapping: (mapping: ColumnMapping) => void;
}

export const ColumnMappingModal: React.FC<ColumnMappingModalProps> = ({
  isOpen,
  onClose,
  headers,
  initialMapping,
  sampleRows,
  onApplyMapping
}) => {
  const [mapping, setMapping] = useState<ColumnMapping>(initialMapping);

  if (!isOpen) return null;

  const handleApply = () => {
    onApplyMapping(mapping);
    onClose();
  };

  const columnOptions = [
    { label: '(미지정)', value: -1 },
    ...headers.map((h, i) => ({
      label: `${i + 1}열: ${h || '빈 열'}`,
      value: i
    }))
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4 no-print">
      <div className="bg-white border border-stone-200 rounded-lg shadow-xl w-full max-w-2xl text-stone-800 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 bg-stone-900 text-stone-100 flex items-center justify-between border-b border-amber-600">
          <div className="flex items-center gap-2">
            <Columns3 className="w-4 h-4 text-amber-400" />
            <h3 className="font-serif-kr text-base font-bold">엑셀 열 매핑 확인 및 변경</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 text-xs max-h-[80vh] overflow-y-auto">
          <div className="text-stone-600">
            불러온 엑셀 파일의 열 구성을 확인하세요. 각 항목에 해당하는 열을 올바르게 지정하면 정확하게 문제를 불러옵니다.
          </div>

          <div className="grid grid-cols-2 gap-3 bg-stone-50 p-4 rounded border border-stone-200">
            <div>
              <label className="block text-stone-700 font-semibold mb-1">단원 열</label>
              <select
                value={mapping.unitCol}
                onChange={(e) => setMapping({ ...mapping, unitCol: Number(e.target.value) })}
                className="w-full border border-stone-300 rounded px-2.5 py-1.5 bg-white"
              >
                {columnOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">문항 번호 열</label>
              <select
                value={mapping.numCol}
                onChange={(e) => setMapping({ ...mapping, numCol: Number(e.target.value) })}
                className="w-full border border-stone-300 rounded px-2.5 py-1.5 bg-white"
              >
                {columnOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-stone-700 font-semibold mb-1">문제 본문 열 (수식/본문)</label>
              <select
                value={mapping.textCol}
                onChange={(e) => setMapping({ ...mapping, textCol: Number(e.target.value) })}
                className="w-full border border-stone-300 rounded px-2.5 py-1.5 bg-white"
              >
                {columnOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">쪽번호 열</label>
              <select
                value={mapping.pageCol}
                onChange={(e) => setMapping({ ...mapping, pageCol: Number(e.target.value) })}
                className="w-full border border-stone-300 rounded px-2.5 py-1.5 bg-white"
              >
                {columnOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">삽화 유형 열</label>
              <select
                value={mapping.typeCol}
                onChange={(e) => setMapping({ ...mapping, typeCol: Number(e.target.value) })}
                className="w-full border border-stone-300 rounded px-2.5 py-1.5 bg-white"
              >
                {columnOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-stone-700 font-semibold mb-1">
                삽화 코드 열 (TikZ / SVG / 이미지)
              </label>
              <select
                value={mapping.codeCol}
                onChange={(e) => setMapping({ ...mapping, codeCol: Number(e.target.value) })}
                className="w-full border border-stone-300 rounded px-2.5 py-1.5 bg-white font-mono-code"
              >
                {columnOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sample Data Preview Table */}
          {sampleRows.length > 0 && (
            <div>
              <div className="font-semibold text-stone-700 mb-1.5">샘플 데이터 1행 미리보기</div>
              <div className="overflow-x-auto border border-stone-200 rounded">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-stone-100 text-stone-600 border-b border-stone-200 font-mono-code">
                    <tr>
                      {headers.map((h, i) => (
                        <th key={i} className="p-2 whitespace-nowrap">
                          {i + 1}열 ({h || '빈 열'})
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white">
                      {sampleRows[0]?.map((cell, i) => (
                        <td key={i} className="p-2 border-r border-stone-100 max-w-xs truncate">
                          {String(cell || '')}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-stone-100 border-t border-stone-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 rounded"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-1.5 text-xs font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded shadow-xs"
          >
            매핑 적용
          </button>
        </div>
      </div>
    </div>
  );
};
