export type IllustrationType = 'tikz' | 'svg' | 'image' | 'math' | 'none';

export type IllustrationSource = 'column' | 'inline' | 'manual' | 'none';

export type IllustrationPosition = 'center' | 'right' | 'left';

export interface Problem {
  id: string;
  unit: string;
  num: string;
  rawText: string;
  cleanedText: string;
  page: number;
  include: boolean;
  illustrationType: IllustrationType;
  illustrationCode: string;
  illustrationSource: IllustrationSource;
  illustrationPosition: IllustrationPosition;
  illustrationScale: number; // percentage (50 - 150)
  order: number;
  answer?: string;
  solution?: string;
  renderCache?: string; // cached SVG markup for instant rendering
}

export type LayoutMode = 'single' | 'double' | 'two-column';

export type PageNumberFormat = 'dash' | 'fraction' | 'simple' | 'none';

export type FontSizeSetting = 'compact' | 'standard' | 'large';

export interface PrintSettings {
  bookTitle: string;
  subTitle: string;
  schoolOrOrg: string;
  showNameBox: boolean;
  showUnitHeader: boolean;
  layoutMode: LayoutMode;
  fontSize: FontSizeSetting;
  pageNumberFormat: PageNumberFormat;
  defaultIllustrationScale: number;
  autoExtractInline: boolean;
  startPageNumber: number;
}

export interface DetectedIllustration {
  type: IllustrationType;
  code: string;
  cleanedText: string;
  source: IllustrationSource;
  notes: string[];
  confidence: number;
}

export interface ColumnMapping {
  unitCol: number;
  numCol: number;
  textCol: number;
  pageCol: number;
  typeCol: number;
  codeCol: number;
  answerCol: number;
  solutionCol: number;
}
