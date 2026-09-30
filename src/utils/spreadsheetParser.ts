import * as XLSX from 'xlsx';
import { ColumnMapping, Problem } from '../types';
import { recognizeProblemIllustration } from './illustrationRecognizer';

/**
 * Heuristically identifies column roles based on header strings or content analysis.
 */
export function detectColumnMapping(headers: string[], sampleRows: unknown[][]): ColumnMapping {
  const mapping: ColumnMapping = {
    unitCol: 0,
    numCol: 1,
    textCol: 2,
    pageCol: 3,
    typeCol: 4,
    codeCol: 5,
    answerCol: -1,
    solutionCol: -1
  };

  const lowerHeaders = headers.map((h) => String(h || '').trim().toLowerCase());

  // 1. Header keyword matching
  lowerHeaders.forEach((h, idx) => {
    if (/^(단원|대단원|중단원|소단원|과목|분류|영역|챕터|unit|chapter|category|topic)$/i.test(h)) {
      mapping.unitCol = idx;
    } else if (/^(번호|문제번호|문항|문항번호|no|num|qnum|id|number)$/i.test(h)) {
      mapping.numCol = idx;
    } else if (/^(문제|내용|본문|지문|문항내용|question|text|problem|body|content)$/i.test(h)) {
      mapping.textCol = idx;
    } else if (/^(쪽|쪽번호|페이지|page|권장쪽|suggestedpage)$/i.test(h)) {
      mapping.pageCol = idx;
    } else if (/^(삽화유형|그림유형|유형|type|illustrationtype|diagramtype)$/i.test(h)) {
      mapping.typeCol = idx;
    } else if (/^(삽화코드|그림코드|삽화|그림|다이어그램|tikz|svg|image|code|illustrationcode|diagram)$/i.test(h)) {
      mapping.codeCol = idx;
    } else if (/^(정답|답|답안|answer|ans)$/i.test(h)) {
      mapping.answerCol = idx;
    } else if (/^(해설|풀이|해답|solution|explanation)$/i.test(h)) {
      mapping.solutionCol = idx;
    }
  });

  // 2. If headers were generic (e.g. col 0, col 1, or empty), inspect sample content
  if (lowerHeaders.length === 0 || lowerHeaders.every((h) => !h || /^[a-z0-9_-]+$/.test(h))) {
    sampleRows.slice(0, 5).forEach((row) => {
      row.forEach((cell, idx) => {
        const str = String(cell || '');
        if ((str.includes('$') || str.length > 40) && mapping.textCol !== idx) {
          mapping.textCol = idx;
        }
        if (/\\begin\{tikzpicture\}|<svg|\\draw\b/i.test(str)) {
          mapping.codeCol = idx;
        }
      });
    });
  }

  return mapping;
}

/**
 * Parses an ArrayBuffer containing an Excel file (.xlsx, .xls) or CSV.
 */
export function parseSpreadsheetBuffer(
  buffer: ArrayBuffer,
  autoExtractInline = true,
  customMapping?: ColumnMapping
): { problems: Problem[]; detectedMapping: ColumnMapping; sheetNames: string[] } {
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

  if (rawRows.length === 0) {
    throw new Error('스프레드시트에 데이터가 없습니다.');
  }

  // Extract header row
  const firstRow = rawRows[0] || [];
  const headers = firstRow.map((cell) => String(cell || '').trim());
  const sampleDataRows = rawRows.slice(1);

  const mapping = customMapping || detectColumnMapping(headers, sampleDataRows);

  const problems: Problem[] = [];
  let fallbackPage = 1;

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const unit = String(row[mapping.unitCol] ?? '').trim();
    const num = String(row[mapping.numCol] ?? '').trim();
    const rawText = String(row[mapping.textCol] ?? '').trim();
    const pageRaw = mapping.pageCol >= 0 ? row[mapping.pageCol] : '';
    const colType = mapping.typeCol >= 0 ? row[mapping.typeCol] : '';
    const colCode = mapping.codeCol >= 0 ? row[mapping.codeCol] : '';
    const answer = mapping.answerCol >= 0 ? String(row[mapping.answerCol] ?? '').trim() : undefined;
    const solution = mapping.solutionCol >= 0 ? String(row[mapping.solutionCol] ?? '').trim() : undefined;

    // Skip purely empty spacer rows
    if (!unit && !num && !rawText && !colCode) continue;

    // Page calculation
    const parsedPage =
      pageRaw === '' || pageRaw === undefined || pageRaw === null
        ? null
        : Math.round(Number(pageRaw));
    const page = !parsedPage || isNaN(parsedPage) ? fallbackPage : parsedPage;
    fallbackPage = page + 1;

    // Run intelligent illustration recognition
    const detected = recognizeProblemIllustration(rawText, colCode, colType, autoExtractInline);

    const problem: Problem = {
      id: `prob_${i}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      unit: unit || '기본 단원',
      num: num || String(i),
      rawText: rawText,
      cleanedText: detected.cleanedText || rawText,
      page: page,
      include: true,
      illustrationType: detected.type,
      illustrationCode: detected.code,
      illustrationSource: detected.source,
      illustrationPosition: 'center',
      illustrationScale: 100,
      order: i,
      answer,
      solution
    };

    problems.push(problem);
  }

  return {
    problems,
    detectedMapping: mapping,
    sheetNames: wb.SheetNames
  };
}

/**
 * Exports current problem dataset back to an Excel workbook (.xlsx).
 */
export function exportProblemsToExcel(problems: Problem[], fileName = '문제집_데이터.xlsx'): void {
  const rows = [
    ['단원', '문제번호', '문제내용', '쪽번호', '삽화유형', '삽화코드', '인쇄포함여부', '정답', '해설']
  ];

  problems.forEach((p) => {
    rows.push([
      p.unit,
      p.num,
      p.cleanedText || p.rawText,
      String(p.page),
      p.illustrationType,
      p.illustrationCode,
      p.include ? 'O' : 'X',
      p.answer || '',
      p.solution || ''
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '문제목록');
  XLSX.writeFile(wb, fileName);
}
