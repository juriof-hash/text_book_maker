/**
 * High-performance client-side TikZ to SVG Parser and Generator
 * Directly compiles TikZ code into pure SVG with instant zero-latency rendering,
 * native Korean / Unicode text support, KaTeX math formulas, custom styles,
 * and advanced color models.
 */

import katex from 'katex';

export interface ParseResult {
  svg: string;
  viewBox: string;
  width: number;
  height: number;
  errors: string[];
  warnings: string[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

interface Point {
  x: number;
  y: number;
}

interface TikzStyle {
  drawColor?: string;
  fillColor?: string;
  fillOpacity?: number;
  strokeOpacity?: number;
  strokeWidth: number;
  strokeDasharray?: string;
  lineCap?: string;
  roundedCorners?: number;
  arrowStart?: string;
  arrowEnd?: string;
  scale?: number;
  xscale?: number;
  yscale?: number;
  rotate?: number;
  shift?: Point;
}

// Map common TikZ colors and mixes
const COLOR_MAP: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ef4444',
  green: '#10b981',
  blue: '#3b82f6',
  yellow: '#eab308',
  cyan: '#06b6d4',
  magenta: '#d946ef',
  orange: '#f97316',
  purple: '#a855f7',
  violet: '#8b5cf6',
  brown: '#78350f',
  gray: '#6b7280',
  grey: '#6b7280',
  darkgray: '#374151',
  lightgray: '#d1d5db',
  teal: '#14b8a6',
  olive: '#84cc16',
  lime: '#84cc16',
  pink: '#ec4899',
  navy: '#1e3a8a',
  transparent: 'transparent',
  none: 'none',
};

// Parse TikZ color expressions like "rgb,255:red,175;green,218;blue,198", "blue!30!white"
export function parseTikzColor(raw: string): string {
  let clean = raw.trim();
  if (!clean || clean === 'none') return 'none';
  if (COLOR_MAP[clean.toLowerCase()]) return COLOR_MAP[clean.toLowerCase()];

  // Check hex code directly
  if (clean.startsWith('#')) return clean;

  // Check xcolor rgb 255 model: e.g. {rgb,255:red,175;green,218;blue,198} or rgb,255:red,175;green,218;blue,198
  if (clean.startsWith('{') && clean.endsWith('}')) {
    clean = clean.slice(1, -1).trim();
  }

  const rgb255Match = clean.match(/rgb\s*,\s*255\s*:\s*red\s*,\s*(\d+)\s*;\s*green\s*,\s*(\d+)\s*;\s*blue\s*,\s*(\d+)/i);
  if (rgb255Match) {
    return `rgb(${rgb255Match[1]}, ${rgb255Match[2]}, ${rgb255Match[3]})`;
  }

  const rgb255SimpleMatch = clean.match(/rgb\s*,\s*255\s*:\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb255SimpleMatch) {
    return `rgb(${rgb255SimpleMatch[1]}, ${rgb255SimpleMatch[2]}, ${rgb255SimpleMatch[3]})`;
  }

  // xcolor normalized rgb model: rgb:red,0.5;green,0.8;blue,0.7
  const rgbNormMatch = clean.match(/rgb\s*:\s*red\s*,\s*([\d.]+)\s*;\s*green\s*,\s*([\d.]+)\s*;\s*blue\s*,\s*([\d.]+)/i);
  if (rgbNormMatch) {
    const r = Math.round(parseFloat(rgbNormMatch[1]) * 255);
    const g = Math.round(parseFloat(rgbNormMatch[2]) * 255);
    const b = Math.round(parseFloat(rgbNormMatch[3]) * 255);
    return `rgb(${r}, ${g}, ${b})`;
  }

  // Check color mixing: base!pct!target or base!pct
  const mixMatch = clean.match(/^([a-zA-Z]+)!(\d+)(?:!([a-zA-Z]+))?$/);
  if (mixMatch) {
    const baseName = mixMatch[1].toLowerCase();
    const pct = parseInt(mixMatch[2], 10) / 100;
    const targetName = (mixMatch[3] || 'white').toLowerCase();

    const baseHex = COLOR_MAP[baseName] || '#000000';
    const targetHex = COLOR_MAP[targetName] || '#ffffff';

    return mixColors(baseHex, targetHex, pct);
  }

  return clean;
}

function mixColors(c1: string, c2: string, ratio: number): string {
  const rgb1 = hexToRgb(c1);
  const rgb2 = hexToRgb(c2);
  if (!rgb1 || !rgb2) return c1;

  const r = Math.round(rgb1.r * ratio + rgb2.r * (1 - ratio));
  const g = Math.round(rgb1.g * ratio + rgb2.g * (1 - ratio));
  const b = Math.round(rgb1.b * ratio + rgb2.b * (1 - ratio));

  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  if (c.length !== 6) return null;
  const num = parseInt(c, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

// Convert LaTeX math formula to HTML string using KaTeX (or fallback)
export function renderMathText(latex: string): string {
  try {
    let clean = latex.trim();
    // Wrap naked angle/degree notation in $: e.g. 51° -> $51^\circ$, 51^\circ -> $51^\circ$
    if (!clean.includes('$')) {
      if (/\b\d+\s*°/.test(clean)) {
        clean = clean.replace(/\b(\d+)\s*°/g, '$$$1^\\circ$$');
      } else if (/\b\d+\s*\^\{?\\circ\}?/.test(clean)) {
        clean = clean.replace(/\b(\d+)\s*\^\{?\\circ\}?/g, '$$$1^\\circ$$');
      }
    }

    // Inside math portions, standardize ° to ^\circ
    clean = clean.replace(/\$([^$]+)\$/g, (_, math) => {
      const fixedMath = math.replace(/°/g, '^\\circ');
      try {
        return katex.renderToString(fixedMath, {
          throwOnError: false,
          displayMode: false,
        });
      } catch {
        return fixedMath;
      }
    });

    return clean;
  } catch {
    return latex;
  }
}

// Preprocess code: expand \foreach loops and remove comments
function preprocessTikz(code: string): string {
  // 1. Remove comments (% to end of line)
  let processed = code.replace(/%.*$/gm, '');

  // 2. Unroll \foreach loops: e.g. \foreach \x in {1,2,...,5} { ... }
  const foreachRegex = /\\foreach\s*\\([a-zA-Z0-9]+)\s*(?:\[[^\]]*\])?\s*in\s*\{([^}]+)\}\s*\{([^}]+)\}/gs;
  let hasForeach = true;
  let iterations = 0;

  while (hasForeach && iterations < 10) {
    iterations++;
    hasForeach = false;
    processed = processed.replace(foreachRegex, (_, varName, rangeStr, body) => {
      hasForeach = true;
      const values: string[] = [];
      const parts = rangeStr.split(',').map((s: string) => s.trim());

      const dotsIdx = parts.findIndex((p: string) => p === '...' || p === '..');
      if (dotsIdx > 0 && dotsIdx < parts.length - 1) {
        const start = parseFloat(parts[dotsIdx - 1]);
        const end = parseFloat(parts[dotsIdx + 1]);
        let step = 1;
        if (dotsIdx > 1) {
          step = start - parseFloat(parts[dotsIdx - 2]);
        }
        if (!isNaN(start) && !isNaN(end) && step !== 0) {
          if (step > 0) {
            for (let v = start; v <= end + 1e-6; v += step) {
              values.push(Number(v.toFixed(4)).toString());
            }
          } else {
            for (let v = start; v >= end - 1e-6; v += step) {
              values.push(Number(v.toFixed(4)).toString());
            }
          }
        }
      } else {
        parts.forEach((p: string) => {
          if (p) values.push(p);
        });
      }

      return values
        .map((val) => {
          const varRegex = new RegExp(`\\\\${varName}\\b`, 'g');
          return body.replace(varRegex, val);
        })
        .join('\n');
    });
  }

  return processed;
}

/**
 * Splits TikZ body into statements by semicolons, properly respecting nested braces { ... } and brackets [ ... ].
 * This prevents semicolons inside colors like fill={rgb,255:red,175;green,218;blue,198} from incorrectly splitting statements.
 */
function splitTikzStatements(code: string): string[] {
  const statements: string[] = [];
  let current = '';
  let braceDepth = 0;
  let bracketDepth = 0;

  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (ch === '{') braceDepth++;
    else if (ch === '}') braceDepth--;
    else if (ch === '[') bracketDepth++;
    else if (ch === ']') bracketDepth--;
    else if (ch === ';' && braceDepth === 0 && bracketDepth === 0) {
      if (current.trim()) statements.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

/**
 * Extracts custom styles defined as `name/.style={...}` with brace balancing.
 */
function extractCustomStyles(text: string): Map<string, string> {
  const styles = new Map<string, string>();
  const pattern = /([a-zA-Z0-9_-]+)\/\.style\s*=\s*\{/g;
  let m;
  while ((m = pattern.exec(text)) !== null) {
    const name = m[1];
    let depth = 1;
    const startIdx = pattern.lastIndex;
    let endIdx = startIdx;
    while (endIdx < text.length && depth > 0) {
      if (text[endIdx] === '{') depth++;
      else if (text[endIdx] === '}') depth--;
      endIdx++;
    }
    if (depth === 0) {
      const def = text.slice(startIdx, endIdx - 1);
      styles.set(name, def);
    }
  }
  return styles;
}

/**
 * Checks if the TikZ code can be parsed and rendered by our native client-side engine.
 */
export function canParseWithFastEngine(code: string): boolean {
  if (!code) return false;
  // If it requires complex external TeX engines like pgfplots/axis
  if (/\\begin\{axis\}/i.test(code)) return false;
  if (/\\addplot/i.test(code)) return false;
  // Matrix or tabular structures are best handled by full TeX engine
  if (/\\matrix\b|\\begin\{tabular\}|\btabular\b/i.test(code)) return false;

  return /\\(draw|fill|filldraw|node|coordinate|path)\b/i.test(code);
}

export function parseTikz(code: string, baseScaleFactor: number = 26): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const namedCoords = new Map<string, Point>();
  const svgElements: string[] = [];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  function trackPoint(p: Point) {
    if (isNaN(p.x) || isNaN(p.y)) return;
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  // Preprocess code
  const preprocessed = preprocessTikz(code);
  let scaleFactor = baseScaleFactor;

  // Custom styles defined in environment or tikzset
  const customStyles = extractCustomStyles(preprocessed);

  // Extract content inside \begin{tikzpicture}[options] ... \end{tikzpicture}
  let body = preprocessed;
  const tikzEnvMatch = preprocessed.match(/\\begin\{tikzpicture\}(?:\[([\s\S]*?)\])?([\s\S]*?)\\end\{tikzpicture\}/);
  if (tikzEnvMatch) {
    const envOpts = tikzEnvMatch[1] || '';
    body = tikzEnvMatch[2];

    const envStyles = extractCustomStyles(envOpts);
    envStyles.forEach((val, key) => customStyles.set(key, val));

    const scaleMatch = envOpts.match(/\bscale=([\d.]+)/);
    if (scaleMatch) {
      const parsedScale = parseFloat(scaleMatch[1]);
      if (!isNaN(parsedScale) && parsedScale > 0) {
        scaleFactor = baseScaleFactor * parsedScale;
      }
    }
  }

  // Split into statements ending with semicolon with brace and bracket balance
  const rawStatements = splitTikzStatements(body);
  let cursor: Point = { x: 0, y: 0 };

  // Parse coordinate: (x, y) or (angle:radius) or (A)
  function parseCoordinate(coordStr: string, currentCursor: Point): { point: Point; newCursor: Point } {
    let s = coordStr.trim();
    let isRelativePermanent = false;
    let isRelativeTemporary = false;

    if (s.startsWith('++')) {
      isRelativePermanent = true;
      s = s.slice(2).trim();
    } else if (s.startsWith('+')) {
      isRelativeTemporary = true;
      s = s.slice(1).trim();
    }

    if (s.startsWith('(') && s.endsWith(')')) {
      s = s.slice(1, -1).trim();
    }

    if (namedCoords.has(s)) {
      const pt = namedCoords.get(s)!;
      return { point: pt, newCursor: pt };
    }

    // Polar coordinates: (angle:radius)
    if (s.includes(':')) {
      const [angleStr, radiusStr] = s.split(':').map((v) => v.trim());
      const angle = (parseFloat(angleStr) * Math.PI) / 180;
      const radius = parseFloat(radiusStr.replace(/cm|pt|mm/g, '')) || 1;
      const dx = radius * Math.cos(angle);
      const dy = radius * Math.sin(angle);

      if (isRelativePermanent || isRelativeTemporary) {
        const pt = { x: currentCursor.x + dx, y: currentCursor.y + dy };
        return { point: pt, newCursor: isRelativePermanent ? pt : currentCursor };
      }
      return { point: { x: dx, y: dy }, newCursor: { x: dx, y: dy } };
    }

    // Cartesian coordinates: (x, y)
    if (s.includes(',')) {
      const [xStr, yStr] = s.split(',').map((v) => v.trim().replace(/cm|pt|mm/g, ''));
      const x = parseFloat(xStr);
      const y = parseFloat(yStr);

      if (!isNaN(x) && !isNaN(y)) {
        if (isRelativePermanent || isRelativeTemporary) {
          const pt = { x: currentCursor.x + x, y: currentCursor.y + y };
          return { point: pt, newCursor: isRelativePermanent ? pt : currentCursor };
        }
        return { point: { x, y }, newCursor: { x, y } };
      }
    }

    return { point: currentCursor, newCursor: currentCursor };
  }

  // Parse options block: [thick, block, draw=blue, fill=red!20, ...]
  function parseOptions(optStr: string): TikzStyle {
    const style: TikzStyle = {
      strokeWidth: 1.5,
      drawColor: undefined,
      fillColor: undefined,
    };

    if (!optStr) return style;

    // Expand custom styles
    let expandedOptStr = optStr;
    customStyles.forEach((def, name) => {
      const regex = new RegExp(`\\b${name}\\b`, 'g');
      expandedOptStr = expandedOptStr.replace(regex, def);
    });

    const opts: string[] = [];
    let currentOpt = '';
    let depth = 0;
    for (let i = 0; i < expandedOptStr.length; i++) {
      const ch = expandedOptStr[i];
      if (ch === '{' || ch === '[') depth++;
      else if (ch === '}' || ch === ']') depth--;
      else if (ch === ',' && depth === 0) {
        opts.push(currentOpt.trim());
        currentOpt = '';
        continue;
      }
      currentOpt += ch;
    }
    if (currentOpt.trim()) opts.push(currentOpt.trim());

    for (const opt of opts) {
      if (!opt) continue;

      if (opt === 'ultra thin') style.strokeWidth = 0.5;
      else if (opt === 'very thin') style.strokeWidth = 0.75;
      else if (opt === 'thin') style.strokeWidth = 1;
      else if (opt === 'semithick') style.strokeWidth = 1.5;
      else if (opt === 'thick') style.strokeWidth = 2.5;
      else if (opt === 'very thick') style.strokeWidth = 3.5;
      else if (opt === 'ultra thick') style.strokeWidth = 5;
      else if (opt === 'dashed') style.strokeDasharray = '5,4';
      else if (opt === 'dotted') style.strokeDasharray = '2,3';
      else if (opt === 'loosely dashed') style.strokeDasharray = '8,6';
      else if (opt === 'densely dashed') style.strokeDasharray = '3,2';
      else if (opt.startsWith('draw=')) {
        style.drawColor = parseTikzColor(opt.slice(5));
      } else if (opt.startsWith('fill=')) {
        style.fillColor = parseTikzColor(opt.slice(5));
      } else if (opt.startsWith('fill opacity=')) {
        style.fillOpacity = parseFloat(opt.slice(13));
      } else if (opt.startsWith('opacity=')) {
        style.fillOpacity = parseFloat(opt.slice(8));
        style.strokeOpacity = parseFloat(opt.slice(8));
      } else if (opt.startsWith('line width=')) {
        style.strokeWidth = parseFloat(opt.slice(11).replace(/pt|mm|cm/g, '')) * 1.5;
      } else if (opt.startsWith('rounded corners')) {
        const val = opt.includes('=') ? parseFloat(opt.split('=')[1]) : 4;
        style.roundedCorners = val;
      } else if (opt.includes('<->') || opt.includes('latex-latex')) {
        style.arrowStart = 'arrow-start';
        style.arrowEnd = 'arrow-end';
      } else if (opt.includes('->') || opt.includes('-latex') || opt.includes('-stealth')) {
        style.arrowEnd = 'arrow-end';
      } else if (opt.includes('<-') || opt.includes('latex-') || opt.includes('stealth-')) {
        style.arrowStart = 'arrow-start';
      } else if (opt.includes('|-|')) {
        style.arrowStart = 'bar-start';
        style.arrowEnd = 'bar-end';
      } else if (COLOR_MAP[opt.toLowerCase()]) {
        style.drawColor = COLOR_MAP[opt.toLowerCase()];
      }
    }

    return style;
  }

  function extractInlineNodes(pathStr: string, fallbackPos: Point) {
    const tokens = tokenizePath(pathStr);
    for (const token of tokens) {
      if (token.type === 'node') {
        const optStr = token.optStr || '';
        const text = token.text || '';
        const rendered = renderMathText(text);

        let anchor = 'middle';
        let dy = -10;
        let dx = 0;
        if (optStr.includes('above left')) { anchor = 'end'; dy = -14; dx = -8; }
        else if (optStr.includes('above right')) { anchor = 'start'; dy = -14; dx = 8; }
        else if (optStr.includes('below left')) { anchor = 'end'; dy = 16; dx = -8; }
        else if (optStr.includes('below right')) { anchor = 'start'; dy = 16; dx = 8; }
        else if (optStr.includes('above')) dy = -14;
        else if (optStr.includes('below')) dy = 16;
        else if (optStr.includes('left')) { anchor = 'end'; dx = -10; }
        else if (optStr.includes('right')) { anchor = 'start'; dx = 10; }

        const px = fallbackPos.x * scaleFactor + dx;
        const py = -fallbackPos.y * scaleFactor + dy;

        // Mask background if fill=white or fill requested
        if (optStr.includes('fill=white') || optStr.includes('fill=')) {
          svgElements.push(`
            <rect x="${px - 45}" y="${py - 11}" width="90" height="22" rx="2" fill="#ffffff" />
          `);
        }

        svgElements.push(`
          <foreignObject x="${px - 100}" y="${py - 15}" width="200" height="30" style="overflow: visible;">
            <div xmlns="http://www.w3.org/1999/xhtml" style="display: flex; justify-content: ${
              anchor === 'start' ? 'flex-start' : anchor === 'end' ? 'flex-end' : 'center'
            }; align-items: center; width: 100%; height: 100%; font-size: 13.5px; font-weight: 500; font-family: 'Noto Sans KR', 'Noto Serif KR', 'KaTeX_Main', sans-serif; color: #1e293b; pointer-events: none; text-shadow: 0 1px 2px rgba(255,255,255,0.85);">
              ${rendered}
            </div>
          </foreignObject>
        `);
      }
    }
  }

  // Iterate statements
  for (const rawStmt of rawStatements) {
    const stmt = rawStmt.trim();
    if (!stmt) continue;

    // 1. \coordinate (A) at (1, 2)
    const coordMatch = stmt.match(/\\coordinate\s*(?:\[[^\]]*\])?\s*\(([^)]+)\)\s*at\s*(\([^)]+\))/);
    if (coordMatch) {
      const name = coordMatch[1].trim();
      const pt = parseCoordinate(coordMatch[2], cursor).point;
      namedCoords.set(name, pt);
      trackPoint(pt);
      continue;
    }

    // 2. Standalone \node [options] (name)? at (coords)? {text}
    // Match balanced braces for content
    const nodeHeaderMatch = stmt.match(/^\\node\s*(?:\[([\s\S]*?)\])?\s*(?:\(([^)]+)\))?\s*(?:at\s*(\([^)]+\)))?\s*\{/);
    if (stmt.startsWith('\\node') && nodeHeaderMatch) {
      const optStr = nodeHeaderMatch[1] || '';
      const name = nodeHeaderMatch[2] ? nodeHeaderMatch[2].trim() : undefined;
      const atStr = nodeHeaderMatch[3];

      // Extract balanced content from opening {
      const startBraceIdx = stmt.indexOf('{');
      let depth = 1;
      let endBraceIdx = startBraceIdx + 1;
      while (endBraceIdx < stmt.length && depth > 0) {
        if (stmt[endBraceIdx] === '{') depth++;
        else if (stmt[endBraceIdx] === '}') depth--;
        endBraceIdx++;
      }
      const content = stmt.slice(startBraceIdx + 1, endBraceIdx - 1);

      const pos = atStr ? parseCoordinate(atStr, cursor).point : cursor;
      if (name) namedCoords.set(name, pos);
      trackPoint(pos);

      const style = parseOptions(optStr);

      let anchor = 'middle';
      let dy = '0.35em';
      let dx = 0;

      if (optStr.includes('above left')) {
        anchor = 'end';
        dy = '-0.6em';
        dx = -6;
      } else if (optStr.includes('above right')) {
        anchor = 'start';
        dy = '-0.6em';
        dx = 6;
      } else if (optStr.includes('below left')) {
        anchor = 'end';
        dy = '1.2em';
        dx = -6;
      } else if (optStr.includes('below right')) {
        anchor = 'start';
        dy = '1.2em';
        dx = 6;
      } else if (optStr.includes('above')) {
        anchor = 'middle';
        dy = '-0.6em';
      } else if (optStr.includes('below')) {
        anchor = 'middle';
        dy = '1.2em';
      } else if (optStr.includes('left')) {
        anchor = 'end';
        dx = -8;
      } else if (optStr.includes('right')) {
        anchor = 'start';
        dx = 8;
      }

      const fontColor = style.drawColor || '#1e293b';
      const renderedHtml = renderMathText(content);

      const posX = pos.x * scaleFactor + dx;
      const posY = -pos.y * scaleFactor;

      // Draw background shape if requested
      if (style.fillColor || style.drawColor || optStr.includes('circle') || optStr.includes('rectangle')) {
        if (optStr.includes('circle')) {
          svgElements.push(`
            <circle cx="${posX}" cy="${posY}" r="14" 
              fill="${style.fillColor || '#ffffff'}" 
              stroke="${style.drawColor || '#334155'}" 
              stroke-width="${style.strokeWidth || 1.5}" />
          `);
        } else if (optStr.includes('rectangle') || style.fillColor) {
          svgElements.push(`
            <rect x="${posX - 24}" y="${posY - 14}" width="48" height="28" rx="${style.roundedCorners || 3}" 
              fill="${style.fillColor || '#ffffff'}" 
              stroke="${style.drawColor || '#334155'}" 
              stroke-width="${style.strokeWidth || 1}" />
          `);
        }
      }

      const textLen = (content || '').length;
      const estimatedWidth = Math.max(30, Math.min(140, textLen * 10 + 16));
      const halfW = estimatedWidth / 2;

      // Track node bounds so SVG viewBox encompasses the label without clipping or artificial overflow
      trackPoint({ x: pos.x - (halfW / scaleFactor), y: pos.y });
      trackPoint({ x: pos.x + (halfW / scaleFactor), y: pos.y });
      trackPoint({ x: pos.x, y: pos.y + (12 / scaleFactor) });
      trackPoint({ x: pos.x, y: pos.y - (12 / scaleFactor) });

      const nodeX = anchor === 'start' ? posX : anchor === 'end' ? posX - estimatedWidth : posX - halfW;

      svgElements.push(`
        <foreignObject x="${nodeX}" y="${posY - 14 + (dy === '-0.6em' ? -12 : dy === '1.2em' ? 8 : 0)}" width="${estimatedWidth}" height="28" style="overflow: visible;">
          <div xmlns="http://www.w3.org/1999/xhtml" style="display: flex; justify-content: ${
            anchor === 'start' ? 'flex-start' : anchor === 'end' ? 'flex-end' : 'center'
          }; align-items: center; width: 100%; height: 100%; color: ${fontColor}; font-size: 12.5px; font-weight: 500; font-family: 'Noto Sans KR', 'Noto Serif KR', 'KaTeX_Main', sans-serif; pointer-events: none; text-shadow: 0 1px 2px rgba(255,255,255,0.85);">
            ${renderedHtml}
          </div>
        </foreignObject>
      `);
      continue;
    }

    // 3. \draw, \fill, \filldraw, \shade paths
    const isDraw = stmt.startsWith('\\draw');
    const isFill = stmt.startsWith('\\fill') && !stmt.startsWith('\\filldraw');
    const isFillDraw = stmt.startsWith('\\filldraw');
    const isShade = stmt.startsWith('\\shade');

    if (isDraw || isFill || isFillDraw || isShade) {
      let optStr = '';
      let pathBody = stmt;

      // Match options after \draw[ ... ] with bracket balance
      const cmdMatch = stmt.match(/^\\(?:draw|fill|filldraw|shade)/);
      if (cmdMatch) {
        let afterCmd = stmt.slice(cmdMatch[0].length).trim();
        if (afterCmd.startsWith('[')) {
          let bDepth = 1;
          let idx = 1;
          while (idx < afterCmd.length && bDepth > 0) {
            if (afterCmd[idx] === '[') bDepth++;
            else if (afterCmd[idx] === ']') bDepth--;
            idx++;
          }
          optStr = afterCmd.slice(1, idx - 1);
          pathBody = afterCmd.slice(idx).trim();
        } else {
          pathBody = afterCmd;
        }
      }

      const style = parseOptions(optStr);

      if (isDraw && !style.drawColor) style.drawColor = '#1e293b';
      if (isFill && !style.fillColor) style.fillColor = style.drawColor || '#1e293b';
      if (isFillDraw) {
        if (!style.drawColor) style.drawColor = '#1e293b';
        if (!style.fillColor) style.fillColor = '#e2e8f0';
      }

      // Grid: (x1, y1) grid (x2, y2)
      const gridMatch = pathBody.match(/(\([^)]+\))\s*grid\s*(?:\[step=([^\]]+)\])?\s*(\([^)]+\))/);
      if (gridMatch) {
        const p1 = parseCoordinate(gridMatch[1], cursor).point;
        const p2 = parseCoordinate(gridMatch[3], cursor).point;
        const step = gridMatch[2] ? parseFloat(gridMatch[2]) : 1;

        trackPoint(p1);
        trackPoint(p2);

        const xMin = Math.min(p1.x, p2.x);
        const xMax = Math.max(p1.x, p2.x);
        const yMin = Math.min(p1.y, p2.y);
        const yMax = Math.max(p1.y, p2.y);

        const gridPaths: string[] = [];
        for (let gx = xMin; gx <= xMax + 1e-6; gx += step) {
          const sx = gx * scaleFactor;
          const sy1 = -yMin * scaleFactor;
          const sy2 = -yMax * scaleFactor;
          gridPaths.push(`M ${sx} ${sy1} L ${sx} ${sy2}`);
        }
        for (let gy = yMin; gy <= yMax + 1e-6; gy += step) {
          const sy = -gy * scaleFactor;
          const sx1 = xMin * scaleFactor;
          const sx2 = xMax * scaleFactor;
          gridPaths.push(`M ${sx1} ${sy} L ${sx2} ${sy}`);
        }

        svgElements.push(`
          <path d="${gridPaths.join(' ')}" 
            stroke="${style.drawColor || '#cbd5e1'}" 
            stroke-width="${style.strokeWidth || 0.75}" 
            stroke-dasharray="${style.strokeDasharray || 'none'}" 
            fill="none" />
        `);
        continue;
      }

      // Rectangle: (x1, y1) rectangle (x2, y2)
      const rectMatch = pathBody.match(/(\([^)]+\))\s*rectangle\s*(\([^)]+\))/);
      if (rectMatch) {
        const p1 = parseCoordinate(rectMatch[1], cursor).point;
        const p2 = parseCoordinate(rectMatch[2], cursor).point;
        trackPoint(p1);
        trackPoint(p2);

        const rx = Math.min(p1.x, p2.x) * scaleFactor;
        const ry = -Math.max(p1.y, p2.y) * scaleFactor;
        const rw = Math.abs(p2.x - p1.x) * scaleFactor;
        const rh = Math.abs(p2.y - p1.y) * scaleFactor;

        svgElements.push(`
          <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" 
            rx="${style.roundedCorners || 0}"
            fill="${style.fillColor || 'none'}" 
            fill-opacity="${style.fillOpacity ?? 1}"
            stroke="${style.drawColor || 'none'}" 
            stroke-width="${style.strokeWidth}" 
            stroke-dasharray="${style.strokeDasharray || 'none'}" />
        `);

        extractInlineNodes(pathBody, { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 });
        continue;
      }

      // Circle: (x, y) circle (r)
      const circleMatch = pathBody.match(/(\([^)]+\))\s*circle\s*(?:\(([^)]+)\)|\[radius=([^\]]+)\])/);
      if (circleMatch) {
        const center = parseCoordinate(circleMatch[1], cursor).point;
        const radiusStr = circleMatch[2] || circleMatch[3] || '1';
        let radius = parseFloat(radiusStr.replace(/cm|pt|mm/g, ''));
        if (radiusStr.includes('pt')) {
          radius = radius * 1.33;
        } else {
          radius = radius * scaleFactor;
        }

        trackPoint({ x: center.x - radius / scaleFactor, y: center.y - radius / scaleFactor });
        trackPoint({ x: center.x + radius / scaleFactor, y: center.y + radius / scaleFactor });

        const cx = center.x * scaleFactor;
        const cy = -center.y * scaleFactor;

        svgElements.push(`
          <circle cx="${cx}" cy="${cy}" r="${radius}" 
            fill="${style.fillColor || 'none'}" 
            fill-opacity="${style.fillOpacity ?? 1}"
            stroke="${style.drawColor || 'none'}" 
            stroke-width="${style.strokeWidth}" 
            stroke-dasharray="${style.strokeDasharray || 'none'}" />
        `);

        extractInlineNodes(pathBody, center);
        continue;
      }

      // Generic path with line segments (--), curves, and nodes
      const pathTokens = tokenizePath(pathBody);
      let d = '';
      let isFirst = true;
      let prevPt: Point | null = null;
      let currPt: Point = cursor;

      for (let i = 0; i < pathTokens.length; i++) {
        const token = pathTokens[i];

        if (token.type === 'coord' && token.value) {
          const res = parseCoordinate(token.value, cursor);
          cursor = res.newCursor;
          const pt = res.point;
          trackPoint(pt);
          prevPt = currPt;
          currPt = pt;

          const sx = pt.x * scaleFactor;
          const sy = -pt.y * scaleFactor;

          if (isFirst) {
            d += `M ${sx} ${sy} `;
            isFirst = false;
          } else {
            d += `L ${sx} ${sy} `;
          }
        } else if (token.type === 'curve' && token.c1 && token.c2 && token.end) {
          const c1 = parseCoordinate(token.c1, cursor).point;
          const c2 = parseCoordinate(token.c2, cursor).point;
          const endPt = parseCoordinate(token.end, cursor).point;
          cursor = endPt;
          trackPoint(c1);
          trackPoint(c2);
          trackPoint(endPt);
          prevPt = currPt;
          currPt = endPt;

          d += `C ${c1.x * scaleFactor} ${-c1.y * scaleFactor}, ${c2.x * scaleFactor} ${-c2.y * scaleFactor}, ${endPt.x * scaleFactor} ${-endPt.y * scaleFactor} `;
        } else if (token.type === 'cycle') {
          d += 'Z ';
        } else if (token.type === 'node') {
          const optStr = token.optStr || '';
          const text = token.text || '';
          const isMidway = optStr.includes('midway') || optStr.includes('pos=');

          let nodePos = currPt;
          let slopeDeg = 0;

          if (isMidway && prevPt) {
            nodePos = {
              x: (prevPt.x + currPt.x) / 2,
              y: (prevPt.y + currPt.y) / 2,
            };
            if (optStr.includes('sloped')) {
              const dx = currPt.x - prevPt.x;
              const dy = currPt.y - prevPt.y;
              slopeDeg = (Math.atan2(-dy, dx) * 180) / Math.PI;
            }
          }

          let anchor = 'middle';
          let dy = 0;
          let dx = 0;
          if (optStr.includes('above left')) { anchor = 'end'; dy = -16; dx = -6; }
          else if (optStr.includes('above right')) { anchor = 'start'; dy = -16; dx = 6; }
          else if (optStr.includes('below left')) { anchor = 'end'; dy = 16; dx = -6; }
          else if (optStr.includes('below right')) { anchor = 'start'; dy = 16; dx = 6; }
          else if (optStr.includes('above')) { dy = -14; }
          else if (optStr.includes('below')) { dy = 16; }
          else if (optStr.includes('left')) { anchor = 'end'; dx = -8; }
          else if (optStr.includes('right')) { anchor = 'start'; dx = 8; }

          const rendered = renderMathText(text);
          const px = nodePos.x * scaleFactor + dx;
          const py = -nodePos.y * scaleFactor + dy;

          const transformAttr = slopeDeg !== 0 ? `transform="rotate(${slopeDeg} ${px} ${py})"` : '';

          const textLen = (text || '').length;
          const estimatedWidth = Math.max(30, Math.min(130, textLen * 9 + 16));
          const halfW = estimatedWidth / 2;

          // If node requested fill=white (standard in TikZ for dimension labels)
          if (optStr.includes('fill=white') || optStr.includes('fill=')) {
            svgElements.push(`
              <rect x="${px - halfW}" y="${py - 11}" width="${estimatedWidth}" height="22" rx="2" fill="#ffffff" ${transformAttr} />
            `);
          }

          const nodeX = anchor === 'start' ? px : anchor === 'end' ? px - estimatedWidth : px - halfW;

          svgElements.push(`
            <foreignObject x="${nodeX}" y="${py - 13}" width="${estimatedWidth}" height="26" style="overflow: visible;" ${transformAttr}>
              <div xmlns="http://www.w3.org/1999/xhtml" style="display: flex; justify-content: ${
                anchor === 'start' ? 'flex-start' : anchor === 'end' ? 'flex-end' : 'center'
              }; align-items: center; width: 100%; height: 100%; font-size: 12px; font-weight: 500; font-family: 'Noto Sans KR', 'Noto Serif KR', 'KaTeX_Main', sans-serif; color: #1e293b; pointer-events: none; text-shadow: 0 1px 2px rgba(255,255,255,0.85);">
                ${rendered}
              </div>
            </foreignObject>
          `);
        }
      }

      if (d) {
        let markerProps = '';
        if (style.arrowStart) markerProps += ` marker-start="url(#${style.arrowStart})"`;
        if (style.arrowEnd) markerProps += ` marker-end="url(#${style.arrowEnd})"`;

        svgElements.push(`
          <path d="${d.trim()}" 
            fill="${style.fillColor || 'none'}" 
            fill-opacity="${style.fillOpacity ?? 1}"
            stroke="${style.drawColor || 'none'}" 
            stroke-width="${style.strokeWidth}" 
            stroke-dasharray="${style.strokeDasharray || 'none'}" 
            stroke-linecap="${style.lineCap || 'round'}"
            stroke-linejoin="round"
            ${markerProps} />
        `);
      }
    }
  }

  // Fallback bounds
  if (!isFinite(minX) || !isFinite(maxX)) {
    minX = -1;
    maxX = 5;
    minY = -1;
    maxY = 5;
  }

  const pad = 0.8;
  const boundMinX = minX - pad;
  const boundMaxX = maxX + pad;
  const boundMinY = minY - pad;
  const boundMaxY = maxY + pad;

  const width = Math.max(100, (boundMaxX - boundMinX) * scaleFactor);
  const height = Math.max(100, (boundMaxY - boundMinY) * scaleFactor);

  const viewBoxX = boundMinX * scaleFactor;
  const viewBoxY = -boundMaxY * scaleFactor;
  const viewBoxW = width;
  const viewBoxH = height;

  const viewBoxStr = `${viewBoxX} ${viewBoxY} ${viewBoxW} ${viewBoxH}`;

  const defs = `
    <defs>
      <marker id="arrow-end" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#1e293b" />
      </marker>
      <marker id="arrow-start" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 10 1.5 L 0 5 L 10 8.5 z" fill="#1e293b" />
      </marker>
      <marker id="bar-end" viewBox="0 0 4 12" refX="2" refY="6" markerWidth="4" markerHeight="12" orient="auto">
        <line x1="2" y1="0" x2="2" y2="12" stroke="#475569" stroke-width="1.5" />
      </marker>
      <marker id="bar-start" viewBox="0 0 4 12" refX="2" refY="6" markerWidth="4" markerHeight="12" orient="auto">
        <line x1="2" y1="0" x2="2" y2="12" stroke="#475569" stroke-width="1.5" />
      </marker>
    </defs>
  `;

  const finalSvg = `
<svg xmlns="http://www.w3.org/2000/svg" 
  viewBox="${viewBoxStr}" 
  width="${Math.round(width)}px" 
  height="${Math.round(height)}px" 
  style="display: block; max-width: 100%; height: auto; margin: 0 auto;"
  preserveAspectRatio="xMidYMid meet">
  ${defs}
  <g class="tikz-diagram-layer">
    ${svgElements.join('\n')}
  </g>
</svg>
  `.trim();

  return {
    svg: finalSvg,
    viewBox: viewBoxStr,
    width,
    height,
    errors,
    warnings,
    bounds: { minX, minY, maxX, maxY },
  };
}

interface PathToken {
  type: 'coord' | 'node' | 'curve' | 'cycle';
  value?: string;
  optStr?: string;
  text?: string;
  c1?: string;
  c2?: string;
  end?: string;
}

/**
 * Tokenizes path body with brace and bracket balance so nested braces like node[...]{$22\text{ cm}$} are never broken.
 */
function tokenizePath(pathStr: string): PathToken[] {
  const tokens: PathToken[] = [];
  const s = pathStr.replace(/--\s*cycle\b/g, 'cycle').trim();
  let i = 0;

  while (i < s.length) {
    if (s[i] === ' ' || s[i] === '\t' || s[i] === '\n' || s[i] === '\r') {
      i++;
      continue;
    }
    if (s.startsWith('--', i)) {
      i += 2;
      continue;
    }

    // Check cycle
    if (s.startsWith('cycle', i) && (i + 5 === s.length || /[\s;]/.test(s[i + 5]))) {
      tokens.push({ type: 'cycle' });
      i += 5;
      continue;
    }

    // Check node
    if (s.startsWith('node', i) && (i + 4 === s.length || /[\s\[{]/.test(s[i + 4]))) {
      i += 4;
      while (i < s.length && /\s/.test(s[i])) i++;

      let optStr = '';
      if (i < s.length && s[i] === '[') {
        let bDepth = 1;
        const startOpt = i + 1;
        i++;
        while (i < s.length && bDepth > 0) {
          if (s[i] === '[') bDepth++;
          else if (s[i] === ']') bDepth--;
          i++;
        }
        optStr = s.slice(startOpt, i - 1);
      }

      while (i < s.length && /\s/.test(s[i])) i++;

      let text = '';
      if (i < s.length && s[i] === '{') {
        let depth = 1;
        const startText = i + 1;
        i++;
        while (i < s.length && depth > 0) {
          if (s[i] === '{') depth++;
          else if (s[i] === '}') depth--;
          i++;
        }
        text = s.slice(startText, i - 1);
      }

      tokens.push({ type: 'node', optStr, text });
      continue;
    }

    // Check coordinate (...)
    if (s[i] === '(') {
      let depth = 1;
      const startC = i;
      i++;
      while (i < s.length && depth > 0) {
        if (s[i] === '(') depth++;
        else if (s[i] === ')') depth--;
        i++;
      }
      tokens.push({ type: 'coord', value: s.slice(startC, i) });
      continue;
    }

    // Check curve: .. controls (c1) and (c2) .. (end)
    if (s.startsWith('..', i)) {
      const curveMatch = s.slice(i).match(/^\.\.\s*controls\s*(\([^)]+\))\s*and\s*(\([^)]+\))\s*\.\.\s*(\([^)]+\))/);
      if (curveMatch) {
        tokens.push({
          type: 'curve',
          c1: curveMatch[1],
          c2: curveMatch[2],
          end: curveMatch[3],
        });
        i += curveMatch[0].length;
        continue;
      }
    }

    i++;
  }

  return tokens;
}
