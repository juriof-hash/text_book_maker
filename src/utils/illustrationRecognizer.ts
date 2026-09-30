import { DetectedIllustration, IllustrationSource, IllustrationType } from '../types';

/**
 * Normalizes text and code by resolving escaped sequences, HTML entities,
 * and markdown wrappers while preserving LaTeX commands like \neq, \node, \nabla.
 */
export function normalizeCodeString(str: unknown): string {
  if (str === null || str === undefined) return '';
  let s = String(str);

  // Unescape HTML entities that frequently appear in web/spreadsheet exports
  s = s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Handle literal "\n" or "\r\n" while preserving LaTeX commands:
  // e.g. \neq, \node, \nabla, \ni, \nu, \notin, \null, \natural
  // Only replace \n when NOT immediately followed by ASCII letters.
  s = s.replace(/\\r\\n(?![a-zA-Z])/g, '\n').replace(/\\n(?![a-zA-Z])/g, '\n');

  // Also replace literal carriage returns
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Fix double-escaped backslashes in common LaTeX environments:
  // e.g. \\begin{tikzpicture} -> \begin{tikzpicture}
  s = s.replace(/\\\\begin\{/g, '\\begin{').replace(/\\\\end\{/g, '\\end{');
  s = s.replace(/\\\\draw\b/g, '\\draw').replace(/\\\\node\b/g, '\\node');

  // Strip Markdown code fences if present: ```tikz ... ``` or ```latex ... ```
  s = s.replace(/^```(?:tikz|latex|svg|html)?\s*\n?([\s\S]*?)\n?```$/i, '$1');

  return s.trim();
}

/**
 * Checks if code contains TikZ markup or drawing directives.
 */
export function isTikZCode(code: string): boolean {
  if (!code) return false;
  if (/\\begin\{tikzpicture\}/i.test(code)) return true;
  if (/\\tikz\b/i.test(code)) return true;
  if (/\\begin\{axis\}/i.test(code)) return true;
  // Raw drawing directives with coordinate syntax e.g. \draw (0,0) -- (1,1);
  if (/\\(draw|path|fill|shade|node)\b.*?\([^)]+\)/i.test(code)) return true;
  return false;
}

/**
 * Checks if code contains SVG markup.
 */
export function isSVGCode(code: string): boolean {
  if (!code) return false;
  return /<svg[\s\S]*?<\/svg>/i.test(code.trim());
}

/**
 * Checks if code is an image URL or data URI.
 */
export function isImageSource(code: string): boolean {
  if (!code) return false;
  const trimmed = code.trim();
  if (/^data:image\/(?:png|jpeg|jpg|gif|svg\+xml|webp);base64,/i.test(trimmed)) return true;
  if (/^https?:\/\/.+\.(?:png|jpg|jpeg|gif|svg|webp)(?:\?.*)?$/i.test(trimmed)) return true;
  if (/^!\[.*?\]\(.*?\)$/i.test(trimmed)) return true;
  if (/<img\s+[^>]*src=["'][^"']+["']/i.test(trimmed)) return true;
  return false;
}

/**
 * Sanitizes TikZ code by mapping non-standard CSS/Tailwind colors to standard LaTeX xcolor names.
 * Prevents TeX engine crash: "! Package xcolor Error: Undefined color ...".
 */
export function sanitizeTikZCode(code: string): string {
  if (!code) return '';
  let s = code;
  // Map Tailwind & CSS color names to standard LaTeX colors
  s = s.replace(/\b(?:stone|zinc|neutral|slate)-[0-9]+\b/gi, 'black');
  s = s.replace(/\b(?:gray|grey)-[0-9]+\b/gi, 'gray');
  s = s.replace(/\bamber(?:-[0-9]+)?\b/gi, 'orange');
  s = s.replace(/\bemerald(?:-[0-9]+)?\b/gi, 'green!70!black');
  s = s.replace(/\bindigo(?:-[0-9]+)?\b/gi, 'blue!80!black');
  s = s.replace(/\brose(?:-[0-9]+)?\b/gi, 'red');
  s = s.replace(/\bsky(?:-[0-9]+)?\b/gi, 'cyan');
  return s;
}

/**
 * Formats and repairs TikZ code: ensures \begin{tikzpicture} and \end{tikzpicture}
 * if raw drawing commands were provided, and cleans invalid color identifiers.
 */
export function ensureTikZWrapping(code: string): { code: string; wrapped: boolean } {
  let clean = sanitizeTikZCode(code.trim());
  if (/\\begin\{tikzpicture\}/i.test(clean)) {
    return { code: clean, wrapped: false };
  }

  // If user provided raw TikZ commands without environment wrapper, wrap it
  if (/\\(draw|fill|shade|node|path|clip)\b/i.test(clean)) {
    clean = `\\begin{tikzpicture}[baseline=(current bounding box.center), scale=0.9]\n${clean}\n\\end{tikzpicture}`;
    return { code: clean, wrapped: true };
  }

  return { code: clean, wrapped: false };
}

/**
 * Formats and repairs SVG code: ensures xmlns is present for standalone rendering.
 */
export function ensureSVGWrapping(code: string): string {
  let clean = code.trim();
  if (!clean.includes('xmlns="http://www.w3.org/2000/svg"')) {
    clean = clean.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  return clean;
}

/**
 * Scans question text for in-line embedded illustrations.
 * Extracts the diagram and returns cleaned text with natural editorial phrasing.
 */
export function extractInlineIllustration(text: string): {
  found: boolean;
  type: IllustrationType;
  code: string;
  cleanedText: string;
  notes: string[];
} {
  if (!text) {
    return { found: false, type: 'none', code: '', cleanedText: '', notes: [] };
  }

  const notes: string[] = [];
  const normalized = normalizeCodeString(text);

  // 1. Explicit Delimited Tags e.g. [삽화: ...] or [그림]...[/그림] or [tikz]...[/tikz]
  const tagBlockRegex = /\[(?:삽화|그림|tikz|svg|diagram)\]([\s\S]*?)\[\/(?:삽화|그림|tikz|svg|diagram)\]/i;
  const tagMatch = normalized.match(tagBlockRegex);
  if (tagMatch) {
    const rawContent = tagMatch[1].trim();
    const cleaned = normalized.replace(tagBlockRegex, '').replace(/\s{2,}/g, ' ').trim();
    notes.push('태그 [삽화]...[/삽화] 블록 감지 및 추출');

    if (isSVGCode(rawContent)) {
      return { found: true, type: 'svg', code: ensureSVGWrapping(rawContent), cleanedText: cleaned, notes };
    }
    if (isTikZCode(rawContent)) {
      const { code } = ensureTikZWrapping(rawContent);
      return { found: true, type: 'tikz', code, cleanedText: cleaned, notes };
    }
    return { found: true, type: 'tikz', code: rawContent, cleanedText: cleaned, notes };
  }

  // Single tag format: [삽화: ...] or [그림: ...]
  const singleTagRegex = /\[(?:삽화|그림):\s*([\s\S]*?)\]/i;
  const singleTagMatch = normalized.match(singleTagRegex);
  if (singleTagMatch) {
    const rawContent = singleTagMatch[1].trim();
    const cleaned = normalized.replace(singleTagRegex, '').replace(/\s{2,}/g, ' ').trim();
    notes.push('[삽화: ...] 태그 감지 및 추출');

    if (isSVGCode(rawContent)) {
      return { found: true, type: 'svg', code: ensureSVGWrapping(rawContent), cleanedText: cleaned, notes };
    }
    if (isTikZCode(rawContent)) {
      const { code } = ensureTikZWrapping(rawContent);
      return { found: true, type: 'tikz', code, cleanedText: cleaned, notes };
    }
    return { found: true, type: 'image', code: rawContent, cleanedText: cleaned, notes };
  }

  // 2. Embedded TikZ environment: \begin{tikzpicture}...\end{tikzpicture}
  const tikzRegex = /\\begin\{tikzpicture\}[\s\S]*?\\end\{tikzpicture\}/i;
  const tikzMatch = normalized.match(tikzRegex);
  if (tikzMatch) {
    const code = tikzMatch[0].trim();
    // Replace the bulky code with a clean reading marker or remove it cleanly
    const cleaned = normalized.replace(tikzRegex, '').replace(/\s{2,}/g, ' ').trim();
    notes.push('본문 내 TikZ(\\begin{tikzpicture}) 코드 자동 감지 및 분리');
    return { found: true, type: 'tikz', code, cleanedText: cleaned, notes };
  }

  // 3. Embedded SVG tag: <svg ...> ... </svg>
  const svgRegex = /<svg[\s\S]*?<\/svg>/i;
  const svgMatch = normalized.match(svgRegex);
  if (svgMatch) {
    const code = ensureSVGWrapping(svgMatch[0].trim());
    const cleaned = normalized.replace(svgRegex, '').replace(/\s{2,}/g, ' ').trim();
    notes.push('본문 내 SVG(<svg>...</svg>) 벡터 코드 감지 및 분리');
    return { found: true, type: 'svg', code, cleanedText: cleaned, notes };
  }

  // 4. Markdown image syntax: ![alt](url)
  const mdImgRegex = /!\[(.*?)\]\((.*?)\)/i;
  const mdImgMatch = normalized.match(mdImgRegex);
  if (mdImgMatch) {
    const url = mdImgMatch[2].trim();
    const cleaned = normalized.replace(mdImgRegex, '').replace(/\s{2,}/g, ' ').trim();
    notes.push('마크다운 이미지 문법(![...](...)) 감지 및 분리');
    return { found: true, type: 'image', code: url, cleanedText: cleaned, notes };
  }

  // 5. HTML img tag: <img src="..." />
  const htmlImgRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/i;
  const htmlImgMatch = normalized.match(htmlImgRegex);
  if (htmlImgMatch) {
    const url = htmlImgMatch[1].trim();
    const cleaned = normalized.replace(htmlImgRegex, '').replace(/\s{2,}/g, ' ').trim();
    notes.push('HTML <img> 태그 감지 및 분리');
    return { found: true, type: 'image', code: url, cleanedText: cleaned, notes };
  }

  return {
    found: false,
    type: 'none',
    code: '',
    cleanedText: normalized,
    notes: []
  };
}

/**
 * Intelligent master recognizer for problem illustrations.
 * Evaluates both dedicated column data and inline question text,
 * normalizes code, repairs wrappers, and generates diagnostics.
 */
export function recognizeProblemIllustration(
  rawText: string,
  colCode?: unknown,
  colType?: unknown,
  autoExtractInline = true
): DetectedIllustration {
  const notes: string[] = [];
  const normalizedColCode = normalizeCodeString(colCode);
  const normalizedText = normalizeCodeString(rawText);
  const rawColType = String(colType || '').trim().toLowerCase();

  // CASE 1: Dedicated Column contains illustration code
  if (normalizedColCode) {
    let type: IllustrationType = 'tikz';

    if (rawColType === 'tikz' || rawColType.includes('tikz') || isTikZCode(normalizedColCode)) {
      type = 'tikz';
      const { code, wrapped } = ensureTikZWrapping(normalizedColCode);
      if (wrapped) notes.push('원시 TikZ 명령어를 \\begin{tikzpicture} 블록으로 자동 포장');
      return {
        type,
        code,
        cleanedText: normalizedText,
        source: 'column',
        notes,
        confidence: 0.98
      };
    }

    if (rawColType === 'svg' || rawColType.includes('svg') || isSVGCode(normalizedColCode)) {
      type = 'svg';
      const code = ensureSVGWrapping(normalizedColCode);
      return {
        type,
        code,
        cleanedText: normalizedText,
        source: 'column',
        notes,
        confidence: 0.98
      };
    }

    if (rawColType === 'image' || rawColType === 'img' || isImageSource(normalizedColCode)) {
      type = 'image';
      return {
        type,
        code: normalizedColCode,
        cleanedText: normalizedText,
        source: 'column',
        notes,
        confidence: 0.95
      };
    }

    // Fallback: check if it's TikZ even if type was ambiguous
    if (isTikZCode(normalizedColCode) || normalizedColCode.includes('\\')) {
      const { code } = ensureTikZWrapping(normalizedColCode);
      return {
        type: 'tikz',
        code,
        cleanedText: normalizedText,
        source: 'column',
        notes: ['열의 LaTeX/TikZ 구문 자동 식별'],
        confidence: 0.9
      };
    }

    return {
      type: 'tikz',
      code: normalizedColCode,
      cleanedText: normalizedText,
      source: 'column',
      notes,
      confidence: 0.85
    };
  }

  // CASE 2: No dedicated column code, inspect in-line problem text
  if (autoExtractInline) {
    const inlineResult = extractInlineIllustration(normalizedText);
    if (inlineResult.found) {
      return {
        type: inlineResult.type,
        code: inlineResult.code,
        cleanedText: inlineResult.cleanedText,
        source: 'inline',
        notes: inlineResult.notes,
        confidence: 0.95
      };
    }
  }

  // CASE 3: No illustration detected
  return {
    type: 'none',
    code: '',
    cleanedText: normalizedText,
    source: 'none',
    notes: [],
    confidence: 1.0
  };
}
