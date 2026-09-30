import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { ColumnMappingModal } from './components/ColumnMappingModal';
import { ControlBar } from './components/ControlBar';
import { EmptyState } from './components/EmptyState';
import { Header } from './components/Header';
import { IllustrationInspectorModal } from './components/IllustrationInspectorModal';
import { PrintLayoutSettingsModal } from './components/PrintLayoutSettingsModal';
import { PrintPreviewView } from './components/PrintPreviewView';
import { ProblemCard } from './components/ProblemCard';
import { SAMPLE_PROBLEMS } from './data/sampleProblems';
import { ColumnMapping, LayoutMode, PrintSettings, Problem } from './types';
import {
  exportProblemsToExcel,
  parseSpreadsheetBuffer
} from './utils/spreadsheetParser';

const STORAGE_KEY_PROBLEMS = 'math_sheet_studio_problems_v2';
const STORAGE_KEY_SETTINGS = 'math_sheet_studio_settings_v2';

const DEFAULT_SETTINGS: PrintSettings = {
  bookTitle: '2026학년도 대학수학능력시험 대비 모의평가',
  subTitle: '수학 영역',
  schoolOrOrg: '',
  showNameBox: true,
  showUnitHeader: true,
  layoutMode: 'two-column',
  fontSize: 'standard',
  pageNumberFormat: 'dash',
  defaultIllustrationScale: 100,
  autoExtractInline: true,
  startPageNumber: 1
};

export default function App() {
  const [problems, setProblems] = useState<Problem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROBLEMS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return SAMPLE_PROBLEMS;
  });

  const [settings, setSettings] = useState<PrintSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_SETTINGS;
  });

  const [viewMode, setViewMode] = useState<'thumb' | 'print'>('thumb');
  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Column Mapping Modal State
  const [mappingState, setMappingState] = useState<{
    isOpen: boolean;
    headers: string[];
    sampleRows: unknown[][];
    initialMapping: ColumnMapping;
    buffer: ArrayBuffer | null;
  }>({
    isOpen: false,
    headers: [],
    sampleRows: [],
    initialMapping: {
      unitCol: 0,
      numCol: 1,
      textCol: 2,
      pageCol: 3,
      typeCol: 4,
      codeCol: 5,
      answerCol: -1,
      solutionCol: -1
    },
    buffer: null
  });

  // Save to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROBLEMS, JSON.stringify(problems));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  }, [problems]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.warn('Settings save error:', e);
    }
  }, [settings]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  // Distinct units list
  const units = useMemo(() => {
    const set = new Set<string>();
    problems.forEach((p) => {
      if (p.unit) set.add(p.unit);
    });
    return Array.from(set);
  }, [problems]);

  // Filtered problems for card view
  const filteredProblems = useMemo(() => {
    return problems.filter((p) => {
      // Unit filter
      if (selectedUnit !== 'ALL' && p.unit !== selectedUnit) {
        return false;
      }
      // Type filter
      if (typeFilter !== 'ALL') {
        if (typeFilter === 'inline' && p.illustrationSource !== 'inline') return false;
        if (typeFilter !== 'inline' && p.illustrationType !== typeFilter) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const numMatch = (p.num || '').toLowerCase().includes(q);
        const textMatch = (p.rawText || '').toLowerCase().includes(q);
        const unitMatch = (p.unit || '').toLowerCase().includes(q);
        return numMatch || textMatch || unitMatch;
      }
      return true;
    });
  }, [problems, selectedUnit, typeFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = problems.length;
    const included = problems.filter((p) => p.include).length;
    const withIllustration = problems.filter(
      (p) => p.illustrationType !== 'none' && Boolean(p.illustrationCode)
    ).length;
    const tikzCount = problems.filter((p) => p.illustrationType === 'tikz').length;
    const svgCount = problems.filter((p) => p.illustrationType === 'svg').length;
    const inlineCount = problems.filter((p) => p.illustrationSource === 'inline').length;

    return { total, included, withIllustration, tikzCount, svgCount, inlineCount };
  }, [problems]);

  const allIncluded = useMemo(() => {
    return problems.length > 0 && problems.every((p) => p.include);
  }, [problems]);

  // Upload Excel Handler
  const handleUploadExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const wb = XLSX.read(buffer, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

        if (rawRows.length <= 1) {
          showToast('불러올 문제가 없습니다. 스프레드시트를 확인하세요.');
          return;
        }

        const headers = (rawRows[0] || []).map((c) => String(c || '').trim());
        const sampleRows = rawRows.slice(1, 4);

        // Attempt automatic parse first
        const parsed = parseSpreadsheetBuffer(buffer, settings.autoExtractInline);

        // If parsed problems look good, apply directly
        if (parsed.problems.length > 0) {
          setProblems(parsed.problems);
          showToast(
            `성공: 문제 ${parsed.problems.length}개를 불러왔습니다. (삽화 ${
              parsed.problems.filter((p) => p.illustrationType !== 'none').length
            }개 감지)`
          );
        } else {
          // Open mapping modal if column detection was uncertain
          setMappingState({
            isOpen: true,
            headers,
            sampleRows,
            initialMapping: parsed.detectedMapping,
            buffer
          });
        }
      } catch (err) {
        console.error('File parsing error:', err);
        showToast('엑셀 파일을 읽는 도중 오류가 발생했습니다.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleApplyCustomMapping = (mapping: ColumnMapping) => {
    if (!mappingState.buffer) return;
    try {
      const parsed = parseSpreadsheetBuffer(
        mappingState.buffer,
        settings.autoExtractInline,
        mapping
      );
      setProblems(parsed.problems);
      showToast(`매핑 적용 완료: ${parsed.problems.length}개의 문제를 불러왔습니다.`);
    } catch (err) {
      console.error(err);
      showToast('열 매핑 적용 중 오류가 발생했습니다.');
    }
  };

  const handleLoadSamples = () => {
    setProblems(SAMPLE_PROBLEMS);
    showToast('샘플 문제 세트(기하, 미적분, 통계, 회로 등)를 불러왔습니다.');
  };

  const handleExportExcel = () => {
    exportProblemsToExcel(problems, `${settings.bookTitle || '문제집'}_조판데이터.xlsx`);
    showToast('현재 문제 및 조판 설정을 엑셀 파일로 저장했습니다.');
  };

  // Card list actions
  const handleToggleInclude = (id: string) => {
    setProblems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, include: !p.include } : p))
    );
  };

  const handleUpdateNum = (id: string, num: string) => {
    setProblems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, num } : p))
    );
  };

  const handleUpdatePage = (id: string, page: number) => {
    setProblems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, page } : p))
    );
  };

  const handleSaveProblem = (updated: Problem) => {
    setProblems((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
    showToast(`문항 [${updated.num}] 수정을 저장했습니다.`);
  };

  const handleDeleteProblem = (id: string) => {
    setProblems((prev) => prev.filter((p) => p.id !== id));
    showToast('문항을 삭제했습니다.');
  };

  const handleRenumber = () => {
    let current = settings.startPageNumber || 1;
    setProblems((prev) =>
      prev.map((p) => {
        if (p.include) {
          const updatedPage = current;
          current += 1;
          return { ...p, page: updatedPage };
        }
        return p;
      })
    );
    showToast('포함된 문제의 순서에 따라 쪽번호를 순차적으로 재부여했습니다.');
  };

  const handleToggleAll = () => {
    const nextState = !allIncluded;
    setProblems((prev) => prev.map((p) => ({ ...p, include: nextState })));
    showToast(nextState ? '모든 문제를 인쇄에 포함했습니다.' : '모든 문제를 인쇄에서 제외했습니다.');
  };

  const handleAddNewProblem = () => {
    const newId = `prob_custom_${Date.now().toString(36)}`;
    const newProblem: Problem = {
      id: newId,
      unit: selectedUnit !== 'ALL' ? selectedUnit : '새 단원',
      num: String(problems.length + 1).padStart(2, '0'),
      rawText: '새로운 문제를 입력하세요. 수식은 $...$ 기호를 사용합니다.',
      cleanedText: '새로운 문제를 입력하세요. 수식은 $...$ 기호를 사용합니다.',
      page: problems.length > 0 ? Math.max(...problems.map((p) => p.page)) + 1 : 1,
      include: true,
      illustrationType: 'none',
      illustrationCode: '',
      illustrationSource: 'manual',
      illustrationPosition: 'center',
      illustrationScale: 100,
      order: problems.length + 1
    };

    setProblems((prev) => [...prev, newProblem]);
    setEditingProblem(newProblem);
  };

  const handleTriggerPrint = () => {
    setViewMode('print');
    setTimeout(() => {
      window.print();
    }, 400);
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-100 text-stone-900 font-sans-kr selection:bg-amber-200">
      {/* Top Header */}
      <Header
        viewMode={viewMode}
        setViewMode={setViewMode}
        onUploadExcel={handleUploadExcel}
        onLoadSamples={handleLoadSamples}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onExportExcel={handleExportExcel}
        onTriggerPrint={handleTriggerPrint}
        totalCount={stats.total}
        includedCount={stats.included}
      />

      {/* Main Viewport */}
      {viewMode === 'thumb' ? (
        <main className="flex-1 flex flex-col no-print">
          {problems.length === 0 ? (
            <EmptyState
              onUploadExcel={handleUploadExcel}
              onLoadSamples={handleLoadSamples}
            />
          ) : (
            <>
              {/* Secondary Controls Bar */}
              <ControlBar
                units={units}
                selectedUnit={selectedUnit}
                onSelectUnit={setSelectedUnit}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                layoutMode={settings.layoutMode}
                onChangeLayoutMode={(mode: LayoutMode) =>
                  setSettings((prev) => ({ ...prev, layoutMode: mode }))
                }
                onRenumber={handleRenumber}
                onToggleAll={handleToggleAll}
                allIncluded={allIncluded}
                onAddNewProblem={handleAddNewProblem}
                onExportExcel={handleExportExcel}
                typeFilter={typeFilter}
                onChangeTypeFilter={setTypeFilter}
                stats={stats}
              />

              {/* Problem Card Grid */}
              <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
                {filteredProblems.length === 0 ? (
                  <div className="bg-white border border-stone-200 rounded p-12 text-center text-stone-500 my-8">
                    <p className="font-semibold text-stone-700">검색 조건에 일치하는 문제가 없습니다.</p>
                    <p className="text-xs mt-1">필터를 초기화하거나 검색어를 변경해 보세요.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredProblems.map((prob) => (
                      <ProblemCard
                        key={prob.id}
                        problem={prob}
                        onToggleInclude={handleToggleInclude}
                        onUpdateNum={handleUpdateNum}
                        onUpdatePage={handleUpdatePage}
                        onOpenEdit={(p) => setEditingProblem(p)}
                        onDelete={handleDeleteProblem}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      ) : (
        /* Print Preview View */
        <PrintPreviewView
          problems={problems}
          settings={settings}
          onBackToThumbnails={() => setViewMode('thumb')}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {/* Live Problem & Illustration Inspector Modal */}
      <IllustrationInspectorModal
        problem={editingProblem}
        isOpen={Boolean(editingProblem)}
        onClose={() => setEditingProblem(null)}
        onSave={handleSaveProblem}
      />

      {/* Print & Layout Settings Modal */}
      <PrintLayoutSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onChangeSettings={setSettings}
      />

      {/* Column Mapping Modal */}
      <ColumnMappingModal
        isOpen={mappingState.isOpen}
        onClose={() => setMappingState((prev) => ({ ...prev, isOpen: false }))}
        headers={mappingState.headers}
        initialMapping={mappingState.initialMapping}
        sampleRows={mappingState.sampleRows}
        onApplyMapping={handleApplyCustomMapping}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-stone-100 text-xs px-4 py-2.5 rounded shadow-lg border border-amber-500 flex items-center gap-2 pointer-events-none transition-all duration-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
