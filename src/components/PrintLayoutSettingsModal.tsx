import React from 'react';
import { Settings, X } from 'lucide-react';
import { FontSizeSetting, LayoutMode, PageNumberFormat, PrintSettings } from '../types';

interface PrintLayoutSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PrintSettings;
  onChangeSettings: (updated: PrintSettings) => void;
}

export const PrintLayoutSettingsModal: React.FC<PrintLayoutSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onChangeSettings
}) => {
  if (!isOpen) return null;

  const update = <K extends keyof PrintSettings>(key: K, value: PrintSettings[K]) => {
    onChangeSettings({
      ...settings,
      [key]: value
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4 no-print">
      <div className="bg-white border border-stone-200 rounded-lg shadow-xl w-full max-w-lg text-stone-800 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-stone-900 text-stone-100 flex items-center justify-between border-b border-amber-600">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-amber-400" />
            <h3 className="font-serif-kr text-base font-bold">인쇄 및 조판 환경설정</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col gap-4 text-xs max-h-[80vh] overflow-y-auto">
          {/* Header Title & Subtitle */}
          <div className="flex flex-col gap-2.5 bg-stone-50 p-3 rounded border border-stone-200">
            <div className="font-semibold text-stone-800 text-[13px]">상단 시험지 머리글</div>

            <div>
              <label className="block text-stone-600 mb-1">문제집 / 시험지 제목</label>
              <input
                type="text"
                value={settings.bookTitle}
                onChange={(e) => update('bookTitle', e.target.value)}
                placeholder="예: 2027학년도 영재원 대비"
                className="w-full border border-stone-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-600 bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-stone-600 mb-1">영역 / 과목명</label>
                <input
                  type="text"
                  value={settings.subTitle}
                  onChange={(e) => update('subTitle', e.target.value)}
                  placeholder="예: 수학 영역"
                  className="w-full border border-stone-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-600 bg-white font-serif-kr"
                />
              </div>

              <div>
                <label className="block text-stone-600 mb-1">학교 / 학원명</label>
                <input
                  type="text"
                  value={settings.schoolOrOrg}
                  onChange={(e) => update('schoolOrOrg', e.target.value)}
                  placeholder="예: 수학연구소"
                  className="w-full border border-stone-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-600 bg-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showNameBox}
                  onChange={(e) => update('showNameBox', e.target.checked)}
                  className="w-3.5 h-3.5 text-amber-600 rounded"
                />
                <span>성명 및 점수 기입란 표시</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showUnitHeader}
                  onChange={(e) => update('showUnitHeader', e.target.checked)}
                  className="w-3.5 h-3.5 text-amber-600 rounded"
                />
                <span>각 문항별 단원명 표시</span>
              </label>
            </div>
          </div>

          {/* Layout Mode (3 modes) */}
          <div>
            <label className="block text-stone-700 font-semibold mb-1.5">조판 레이아웃 형식 (3가지 모드)</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'single' as LayoutMode, name: '1장 1문제', desc: 'A4 전면 (넓은 풀이 공간)' },
                { id: 'double' as LayoutMode, name: '1장 2문제 (2행)', desc: '상·하 분할 (1행 1문제)' },
                { id: 'two-column' as LayoutMode, name: '1장 2문제 (2열)', desc: '좌·우 분할 (1열 1문제)' }
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => update('layoutMode', m.id)}
                  className={`p-2.5 text-left border rounded transition-colors ${
                    settings.layoutMode === m.id
                      ? 'border-amber-500 bg-amber-50/70 text-stone-900 font-medium'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                  }`}
                >
                  <div className="font-semibold text-stone-900">{m.name}</div>
                  <div className="text-[10px] text-stone-500 mt-0.5">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Typography Font Size */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-700 font-semibold mb-1">인쇄 글자 크기</label>
              <select
                value={settings.fontSize}
                onChange={(e) => update('fontSize', e.target.value as FontSizeSetting)}
                className="w-full border border-stone-300 rounded px-2.5 py-1.5 bg-white"
              >
                <option value="compact">조밀하게 (11pt / 시험지 권장)</option>
                <option value="standard">표준 (12.5pt / 교재 권장)</option>
                <option value="large">크게 (14pt / 학습지 권장)</option>
              </select>
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">쪽번호 표기 형식</label>
              <select
                value={settings.pageNumberFormat}
                onChange={(e) => update('pageNumberFormat', e.target.value as PageNumberFormat)}
                className="w-full border border-stone-300 rounded px-2.5 py-1.5 bg-white font-mono-code"
              >
                <option value="dash">- 1 -</option>
                <option value="fraction">1 / 10</option>
                <option value="simple">1쪽</option>
                <option value="none">쪽번호 숨김</option>
              </select>
            </div>
          </div>

          {/* Default Illustration Scale */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-stone-700 font-semibold">기본 삽화 배율</label>
              <span className="font-mono-code text-stone-500">{settings.defaultIllustrationScale}%</span>
            </div>
            <input
              type="range"
              min="70"
              max="130"
              value={settings.defaultIllustrationScale}
              onChange={(e) => update('defaultIllustrationScale', Number(e.target.value))}
              className="w-full accent-amber-600"
            />
          </div>

          {/* Auto Extract Inline illustrations */}
          <div className="pt-2 border-t border-stone-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoExtractInline}
                onChange={(e) => update('autoExtractInline', e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded"
              />
              <div>
                <div className="font-semibold text-stone-800">본문 내 삽화 코드 자동 인식 및 분리</div>
                <div className="text-[11px] text-stone-500">
                  문제 내용 안에 포함된 TikZ나 SVG를 자동으로 감지하여 전용 삽화 구역에 깔끔하게 배치합니다.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-stone-100 border-t border-stone-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded shadow-xs transition-colors"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
