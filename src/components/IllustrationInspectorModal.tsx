import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Code2,
  Copy,
  Eye,
  FileCode,
  Image,
  Maximize2,
  RefreshCw,
  Sparkles,
  Upload,
  X
} from 'lucide-react';
import { IllustrationPosition, IllustrationType, Problem } from '../types';
import {
  ensureSVGWrapping,
  ensureTikZWrapping,
  extractInlineIllustration
} from '../utils/illustrationRecognizer';
import { typesetMath } from '../utils/renderEngine';
import { IllustrationViewer } from './IllustrationViewer';

interface IllustrationInspectorModalProps {
  problem: Problem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Problem) => void;
}

const PRESET_SNIPPETS = [
  {
    title: '원과 내접삼각형 (TikZ)',
    type: 'tikz' as IllustrationType,
    code: `\\begin{tikzpicture}[scale=0.85, baseline=(current bounding box.center)]
  \\draw[thick] (0,0) circle (2);
  \\fill (0,0) circle (1.5pt) node[below left] {$O$};
  \\coordinate (A) at (90:2);
  \\coordinate (B) at (210:2);
  \\coordinate (C) at (330:2);
  \\draw[thick] (A) -- (B) -- (C) -- cycle;
  \\node[above] at (A) {$A$};
  \\node[left] at (B) {$B$};
  \\node[right] at (C) {$C$};
\\end{tikzpicture}`
  },
  {
    title: '좌표평면 함수 그래프 (TikZ)',
    type: 'tikz' as IllustrationType,
    code: `\\begin{tikzpicture}[scale=0.75, baseline=(current bounding box.center)]
  \\draw[->, thick] (-2.5,0) -- (3,0) node[right] {$x$};
  \\draw[->, thick] (0,-2) -- (0,3) node[above] {$y$};
  \\node[below left] at (0,0) {$O$};
  \\draw[very thick, blue!80!black, domain=-2:2, samples=60] plot (\\x, {\\x*\\x - 1}) node[right] {$y=f(x)$};
\\end{tikzpicture}`
  },
  {
    title: '직각삼각형 (TikZ)',
    type: 'tikz' as IllustrationType,
    code: `\\begin{tikzpicture}[scale=0.8, baseline=(current bounding box.center)]
  \\coordinate (A) at (0,3);
  \\coordinate (B) at (0,0);
  \\coordinate (C) at (4,0);
  \\draw[thick] (A) -- (B) -- (C) -- cycle;
  \\draw (0,0) rectangle (0.3,0.3);
  \\node[left] at (A) {$A$};
  \\node[below left] at (B) {$B$};
  \\node[below right] at (C) {$C$};
  \\node[left] at (0,1.5) {$3$};
  \\node[below] at (2,0) {$4$};
  \\node[above right] at (2,1.5) {$5$};
\\end{tikzpicture}`
  },
  {
    title: '벤 다이어그램 (SVG)',
    type: 'svg' as IllustrationType,
    code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 160" width="260" height="150">
  <rect x="5" y="5" width="270" height="150" rx="8" fill="#f8fafc" stroke="#475569" stroke-width="1.5" />
  <circle cx="105" cy="85" r="50" fill="#3b82f6" fill-opacity="0.2" stroke="#2563eb" stroke-width="1.8" />
  <circle cx="175" cy="85" r="50" fill="#ef4444" fill-opacity="0.2" stroke="#dc2626" stroke-width="1.8" />
  <text x="80" y="55" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e40af">A</text>
  <text x="190" y="55" font-family="sans-serif" font-size="13" font-weight="bold" fill="#991b1b">B</text>
  <text x="135" y="90" font-family="sans-serif" font-size="12" font-weight="bold" fill="#334155">A∩B</text>
</svg>`
  }
];

export const IllustrationInspectorModal: React.FC<IllustrationInspectorModalProps> = ({
  problem,
  isOpen,
  onClose,
  onSave
}) => {
  const [unit, setUnit] = useState('');
  const [num, setNum] = useState('');
  const [page, setPage] = useState(1);
  const [text, setText] = useState('');
  const [type, setType] = useState<IllustrationType>('none');
  const [code, setCode] = useState('');
  const [position, setPosition] = useState<IllustrationPosition>('center');
  const [scale, setScale] = useState(100);
  const [answer, setAnswer] = useState('');
  const [copied, setCopied] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  const mathPreviewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (problem) {
      setUnit(problem.unit || '');
      setNum(problem.num || '');
      setPage(problem.page || 1);
      setText(problem.cleanedText || problem.rawText || '');
      setType(problem.illustrationType || 'none');
      setCode(problem.illustrationCode || '');
      setPosition(problem.illustrationPosition || 'center');
      setScale(problem.illustrationScale || 100);
      setAnswer(problem.answer || '');
    }
  }, [problem]);

  useEffect(() => {
    if (mathPreviewRef.current) {
      typesetMath(mathPreviewRef.current);
    }
  }, [text, isOpen]);

  if (!isOpen || !problem) return null;

  const handleWrapTikZ = () => {
    const { code: wrapped } = ensureTikZWrapping(code);
    setCode(wrapped);
    setType('tikz');
    setPreviewKey((k) => k + 1);
  };

  const handleFixSVG = () => {
    const clean = ensureSVGWrapping(code);
    setCode(clean);
    setType('svg');
    setPreviewKey((k) => k + 1);
  };

  const handleApplySnippet = (snippet: typeof PRESET_SNIPPETS[0]) => {
    setType(snippet.type);
    setCode(snippet.code);
    setPreviewKey((k) => k + 1);
  };

  const handleDetectFromText = () => {
    const result = extractInlineIllustration(text);
    if (result.found) {
      setType(result.type);
      setCode(result.code);
      setText(result.cleanedText);
      setPreviewKey((k) => k + 1);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setType('image');
          setCode(String(ev.target.result));
          setPreviewKey((k) => k + 1);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onSave({
      ...problem,
      unit,
      num,
      page,
      rawText: text,
      cleanedText: text,
      illustrationType: type,
      illustrationCode: code,
      illustrationPosition: position,
      illustrationScale: scale,
      answer
    });
    onClose();
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 p-4 overflow-y-auto no-print">
      <div className="bg-white border border-stone-200 rounded-lg shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-stone-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-stone-900 text-stone-100 flex items-center justify-between border-b border-amber-600">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-amber-400" />
            <h3 className="font-serif-kr text-base font-bold">
              문항 및 삽화 코드 편집 스튜디오
            </h3>
            <span className="text-xs text-stone-400 font-mono-code ml-2">
              ID: {problem.id.slice(0, 12)}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - 2 Columns */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left Column: Problem Info & Question Text */}
          <div className="flex flex-col gap-4">
            {/* Top row: Unit, Number, Page */}
            <div className="grid grid-cols-12 gap-2 text-xs">
              <div className="col-span-6">
                <label className="block text-stone-600 font-medium mb-1">단원명</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full border border-stone-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-600"
                  placeholder="예: 기하와 벡터 · 평면도형"
                />
              </div>
              <div className="col-span-3">
                <label className="block text-stone-600 font-medium mb-1">문항 번호</label>
                <input
                  type="text"
                  value={num}
                  onChange={(e) => setNum(e.target.value)}
                  className="w-full border border-stone-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-600 font-serif-kr font-bold"
                  placeholder="01"
                />
              </div>
              <div className="col-span-3">
                <label className="block text-stone-600 font-medium mb-1">쪽번호</label>
                <input
                  type="number"
                  value={page}
                  onChange={(e) => setPage(parseInt(e.target.value, 10) || 1)}
                  className="w-full border border-stone-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-amber-600 font-mono-code"
                />
              </div>
            </div>

            {/* Question Text with Auto-detect action */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-stone-700 font-semibold flex items-center gap-1.5">
                  <span>문제 본문 (LaTeX 수식: $...$ 또는 $$...$$)</span>
                </label>
                <button
                  type="button"
                  onClick={handleDetectFromText}
                  className="text-[11px] text-amber-700 hover:text-amber-800 flex items-center gap-1 font-medium"
                  title="본문 안의 TikZ 또는 SVG 코드를 감지하여 삽화 영역으로 분리합니다"
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>본문 내 삽화 자동 추출</span>
                </button>
              </div>
              <textarea
                rows={5}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="문제를 입력하세요. $x^2 + y^2 = r^2$ 형태의 LaTeX 수식을 자유롭게 사용할 수 있습니다."
                className="w-full border border-stone-300 rounded p-2.5 text-xs text-stone-800 font-serif-kr leading-relaxed focus:outline-none focus:border-amber-600"
              />
            </div>

            {/* Live MathJax Preview */}
            <div>
              <div className="text-xs text-stone-500 font-medium mb-1 flex items-center gap-1">
                <Eye className="w-3 h-3" />
                <span>수식 렌더링 미리보기</span>
              </div>
              <div
                ref={mathPreviewRef}
                className="border border-stone-200 bg-stone-50/80 rounded p-3 text-xs font-serif-kr text-stone-900 leading-relaxed min-h-[70px] max-h-40 overflow-y-auto"
              >
                {text || <span className="text-stone-400">문제를 입력하면 실시간으로 수식이 조판됩니다.</span>}
              </div>
            </div>

            {/* Answer / Solution (Optional) */}
            <div>
              <label className="block text-xs text-stone-600 font-medium mb-1">정답 / 단답</label>
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="예: 25 또는 (1, 3)"
                className="w-full border border-stone-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-600"
              />
            </div>
          </div>

          {/* Right Column: Illustration Inspector & Live Canvas */}
          <div className="flex flex-col gap-4 border-t lg:border-t-0 lg:border-l border-stone-200 lg:pl-5">
            {/* Illustration Type Selector & Presets */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-stone-100 p-0.5 rounded border border-stone-200">
                {(['tikz', 'svg', 'image', 'none'] as IllustrationType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setType(t);
                      setPreviewKey((k) => k + 1);
                    }}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      type === t
                        ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {t === 'tikz' && 'TikZ'}
                    {t === 'svg' && 'SVG'}
                    {t === 'image' && '이미지'}
                    {t === 'none' && '없음'}
                  </button>
                ))}
              </div>

              {/* Format Fixers */}
              <div className="flex items-center gap-1">
                {type === 'tikz' && (
                  <button
                    type="button"
                    onClick={handleWrapTikZ}
                    className="text-[11px] px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200"
                  >
                    \\begin 블록 감싸기
                  </button>
                )}
                {type === 'svg' && (
                  <button
                    type="button"
                    onClick={handleFixSVG}
                    className="text-[11px] px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200"
                  >
                    xmlns 보정
                  </button>
                )}
              </div>
            </div>

            {/* Presets library buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-stone-500">템플릿:</span>
              {PRESET_SNIPPETS.map((snip) => (
                <button
                  key={snip.title}
                  type="button"
                  onClick={() => handleApplySnippet(snip)}
                  className="text-[10.5px] px-2 py-0.5 bg-stone-100 hover:bg-amber-100 hover:text-amber-900 text-stone-600 rounded border border-stone-200 transition-colors"
                >
                  {snip.title}
                </button>
              ))}
            </div>

            {/* Code Input or Image upload */}
            {type === 'image' ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="이미지 URL (https://...) 또는 Data URI"
                    className="flex-1 border border-stone-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-600"
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-stone-800 text-white rounded text-xs hover:bg-stone-700 shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>파일 업로드</span>
                  </button>
                </div>
              </div>
            ) : type !== 'none' ? (
              <div className="relative">
                <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
                  <span>{type === 'tikz' ? 'TikZ 코드' : 'SVG 코드'}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="flex items-center gap-1 text-[11px] text-stone-600 hover:text-stone-900"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? '복사됨' : '코드 복사'}</span>
                    </button>
                  </div>
                </div>
                <textarea
                  rows={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={
                    type === 'tikz'
                      ? '\\begin{tikzpicture} ... \\end{tikzpicture}'
                      : '<svg ...> ... </svg>'
                  }
                  className="w-full border border-stone-300 rounded p-2.5 text-xs text-stone-800 font-mono-code leading-normal focus:outline-none focus:border-amber-600 bg-stone-50"
                  spellCheck={false}
                />
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-stone-400 border border-dashed border-stone-200 rounded">
                삽화가 없는 문항입니다. 위의 [TikZ] 또는 [SVG] 버튼을 눌러 삽화를 추가할 수 있습니다.
              </div>
            )}

            {/* Position & Scale Sliders */}
            {type !== 'none' && (
              <div className="flex items-center justify-between gap-3 text-xs bg-stone-50 p-2.5 rounded border border-stone-200">
                <div className="flex items-center gap-2">
                  <span className="text-stone-600">배치:</span>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value as IllustrationPosition)}
                    className="border border-stone-300 rounded px-1.5 py-0.5 text-xs bg-white"
                  >
                    <option value="center">가운데</option>
                    <option value="left">왼쪽</option>
                    <option value="right">오른쪽</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                  <span className="text-stone-600">크기:</span>
                  <input
                    type="range"
                    min="50"
                    max="140"
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                  <span className="font-mono-code text-[11px] w-9 text-right">{scale}%</span>
                </div>
              </div>
            )}

            {/* Live Illustration Render Canvas */}
            {type !== 'none' && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span>삽화 렌더링 캔버스</span>
                  <button
                    type="button"
                    onClick={() => setPreviewKey((k) => k + 1)}
                    className="flex items-center gap-1 text-[11px] text-stone-600 hover:text-stone-900"
                    title="다시 렌더링"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>새로고침</span>
                  </button>
                </div>

                <div
                  key={previewKey}
                  className={`border border-stone-200 bg-white rounded p-4 flex flex-col justify-center min-h-[160px] max-h-64 overflow-auto shadow-inner ${
                    position === 'left'
                      ? 'items-start'
                      : position === 'right'
                      ? 'items-end'
                      : 'items-center'
                  }`}
                >
                  <IllustrationViewer type={type} code={code} scale={scale} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-stone-100 border-t border-stone-200 flex items-center justify-between">
          <div className="text-xs text-stone-500">
            수정 후 <strong>저장</strong>을 누르면 문제 목록과 인쇄 미리보기에 즉시 반영됩니다.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 rounded font-medium transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded shadow-xs transition-colors"
            >
              저장 및 반영
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
