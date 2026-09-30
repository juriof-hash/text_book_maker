import { Problem } from '../types';

export const SAMPLE_PROBLEMS: Problem[] = [
  {
    id: 'sample_geom_01',
    unit: '기하와 벡터 · 평면도형',
    num: '01',
    rawText: '그림과 같이 반지름의 길이가 $4$인 원 $O$에 내접하는 삼각형 $ABC$에서 $\\angle A = 60^\\circ$이고 선분 $BC$의 길이가 $4\\sqrt{3}$이다. 점 $A$에서 대변 $BC$에 내린 수선의 발을 $H$라 할 때, 선분 $AH$의 최댓값을 구하시오.',
    cleanedText: '그림과 같이 반지름의 길이가 $4$인 원 $O$에 내접하는 삼각형 $ABC$에서 $\\angle A = 60^\\circ$이고 선분 $BC$의 길이가 $4\\sqrt{3}$이다. 점 $A$에서 대변 $BC$에 내린 수선의 발을 $H$라 할 때, 선분 $AH$의 최댓값을 구하시오.',
    page: 1,
    include: true,
    illustrationType: 'tikz',
    illustrationCode: `\\begin{tikzpicture}[scale=0.85, baseline=(current bounding box.center)]
  % Circle
  \\draw[thick, color=blue!70!black] (0,0) circle (2.2);
  \\node[below left, font=\\small] at (0,0) {$O$};
  \\fill (0,0) circle (1.5pt);

  % Triangle vertices
  \\coordinate (A) at (75:2.2);
  \\coordinate (B) at (210:2.2);
  \\coordinate (C) at (330:2.2);

  % Draw Triangle
  \\draw[thick, color=stone-800] (A) -- (B) -- (C) -- cycle;
  \\node[above, font=\\small] at (A) {$A$};
  \\node[left, font=\\small] at (B) {$B$};
  \\node[right, font=\\small] at (C) {$C$};

  % Altitude
  \\coordinate (H) at ($(B)!(A)!(C)$);
  \\draw[dashed, color=red!70!black, thick] (A) -- (H);
  \\node[below, font=\\small] at (H) {$H$};
  \\fill (H) circle (1.2pt);

  % Right angle mark
  \\draw (H) rectangle ++(0.18, 0.18);
\\end{tikzpicture}`,
    illustrationSource: 'column',
    illustrationPosition: 'center',
    illustrationScale: 100,
    order: 1,
    answer: '6'
  },
  {
    id: 'sample_calc_02',
    unit: '수학 II · 다항함수의 미분법',
    num: '02',
    rawText: '함수 $f(x) = x^3 - 3x + 1$의 그래프와 직선 $y = 3x - 3$이 만나는 두 점을 각각 $P, Q$라 하자. 선분 $PQ$의 중점 $M$의 좌표를 구하고, 점 $P$에서의 접선 방정식을 구하시오.',
    cleanedText: '함수 $f(x) = x^3 - 3x + 1$의 그래프와 직선 $y = 3x - 3$이 만나는 두 점을 각각 $P, Q$라 하자. 선분 $PQ$의 중점 $M$의 좌표를 구하고, 점 $P$에서의 접선 방정식을 구하시오.',
    page: 2,
    include: true,
    illustrationType: 'tikz',
    illustrationCode: `\\begin{tikzpicture}[scale=0.8, baseline=(current bounding box.center)]
  % Axes
  \\draw[->, thick] (-2.5,0) -- (3,0) node[right, font=\\small] {$x$};
  \\draw[->, thick] (0,-3.5) -- (0,4) node[above, font=\\small] {$y$};
  \\node[below left, font=\\small] at (0,0) {$O$};

  % Function curve: x^3 - 3x + 1
  \\draw[very thick, color=blue!80!black, domain=-2.1:2.3, samples=100] 
    plot (\\x, {\\x*\\x*\\x - 3*\\x + 1}) node[right, font=\\footnotesize] {$y=f(x)$};

  % Tangent line
  \\draw[thick, dashed, color=amber!80!black, domain=-0.5:2.5]
    plot (\\x, {3*\\x - 3}) node[above, font=\\footnotesize] {$y=3x-3$};

  % Intersection point P(2,3)
  \\fill[red!80!black] (2,3) circle (2pt) node[right, font=\\small] {$P(2,3)$};
\\end{tikzpicture}`,
    illustrationSource: 'column',
    illustrationPosition: 'center',
    illustrationScale: 100,
    order: 2,
    answer: '(1, 0)'
  },
  {
    id: 'sample_prob_03',
    unit: '확률과 통계 · 사건의 독립과 종속',
    num: '03',
    rawText: '어느 고등학교 학생 $100$명을 대상으로 수학과 과학 동아리 가입 여부를 조사한 결과이다. 수학 동아리에 가입한 학생 중 임의로 택한 한 명이 과학 동아리에도 가입했을 확률을 구하시오.',
    cleanedText: '어느 고등학교 학생 $100$명을 대상으로 수학과 과학 동아리 가입 여부를 조사한 결과이다. 수학 동아리에 가입한 학생 중 임의로 택한 한 명이 과학 동아리에도 가입했을 확률을 구하시오.',
    page: 3,
    include: true,
    illustrationType: 'svg',
    illustrationCode: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 180" width="300" height="160">
  <rect x="10" y="10" width="320" height="160" rx="8" fill="#f8fafc" stroke="#334155" stroke-width="1.8" />
  <text x="25" y="32" font-family="'Noto Sans KR', sans-serif" font-size="13" font-weight="600" fill="#475569">전체 집합 U (100명)</text>
  
  <!-- Circle A (Math) -->
  <circle cx="125" cy="95" r="55" fill="#3b82f6" fill-opacity="0.18" stroke="#1d4ed8" stroke-width="1.8" />
  <!-- Circle B (Science) -->
  <circle cx="195" cy="95" r="55" fill="#10b981" fill-opacity="0.18" stroke="#047857" stroke-width="1.8" />
  
  <text x="100" y="65" font-family="'Noto Serif KR', serif" font-size="14" font-weight="700" fill="#1e3a8a">수학(A)</text>
  <text x="200" y="65" font-family="'Noto Serif KR', serif" font-size="14" font-weight="700" fill="#064e3b">과학(B)</text>
  
  <!-- Numbers in sets -->
  <text x="105" y="102" font-family="'JetBrains Mono', monospace" font-size="15" font-weight="700" fill="#1e293b">35</text>
  <text x="152" y="102" font-family="'JetBrains Mono', monospace" font-size="15" font-weight="700" fill="#b91c1c">25</text>
  <text x="215" y="102" font-family="'JetBrains Mono', monospace" font-size="15" font-weight="700" fill="#1e293b">20</text>
  <text x="290" y="150" font-family="'JetBrains Mono', monospace" font-size="14" fill="#64748b">20</text>
</svg>`,
    illustrationSource: 'column',
    illustrationPosition: 'center',
    illustrationScale: 100,
    order: 3,
    answer: '5/12'
  },
  {
    id: 'sample_inline_04',
    unit: '삼각함수 · 삼각함수의 그래프',
    num: '04',
    rawText: '다음 그림과 같이 좌표평면에서 두 곡선 $y = \\sin x$와 $y = \\cos x$ ($0 \\le x \\le 2\\pi$)가 만나는 교점의 $x$좌표를 각각 $\\alpha, \\beta$라 할 때, $\\tan(\\beta - \\alpha)$의 값을 구하시오.\n\\begin{tikzpicture}[scale=0.9, baseline=(current bounding box.center)]\n  \\draw[->, thick] (-0.3,0) -- (6.6,0) node[right, font=\\small] {$x$};\n  \\draw[->, thick] (0,-1.4) -- (0,1.5) node[above, font=\\small] {$y$};\n  \\draw[thick, blue!85!black, domain=0:6.28, samples=80] plot (\\x, {sin(\\x*180/pi)}) node[right, font=\\footnotesize] {$\\sin x$};\n  \\draw[thick, red!85!black, dashed, domain=0:6.28, samples=80] plot (\\x, {cos(\\x*180/pi)}) node[above right, font=\\footnotesize] {$\\cos x$};\n  \\fill (0.785, 0.707) circle (1.8pt) node[above=2pt, font=\\footnotesize] {$\\alpha$};\n  \\fill (3.926, -0.707) circle (1.8pt) node[below=2pt, font=\\footnotesize] {$\\beta$};\n\\end{tikzpicture}',
    cleanedText: '다음 그림과 같이 좌표평면에서 두 곡선 $y = \\sin x$와 $y = \\cos x$ ($0 \\le x \\le 2\\pi$)가 만나는 교점의 $x$좌표를 각각 $\\alpha, \\beta$라 할 때, $\\tan(\\beta - \\alpha)$의 값을 구하시오.',
    page: 4,
    include: true,
    illustrationType: 'tikz',
    illustrationCode: `\\begin{tikzpicture}[scale=0.9, baseline=(current bounding box.center)]
  \\draw[->, thick] (-0.3,0) -- (6.6,0) node[right, font=\\small] {$x$};
  \\draw[->, thick] (0,-1.4) -- (0,1.5) node[above, font=\\small] {$y$};
  \\draw[thick, blue!85!black, domain=0:6.28, samples=80] plot (\\x, {sin(\\x*180/pi)}) node[right, font=\\footnotesize] {$\\sin x$};
  \\draw[thick, red!85!black, dashed, domain=0:6.28, samples=80] plot (\\x, {cos(\\x*180/pi)}) node[above right, font=\\footnotesize] {$\\cos x$};
  \\fill (0.785, 0.707) circle (1.8pt) node[above=2pt, font=\\footnotesize] {$\\alpha$};
  \\fill (3.926, -0.707) circle (1.8pt) node[below=2pt, font=\\footnotesize] {$\\beta$};
\\end{tikzpicture}`,
    illustrationSource: 'inline',
    illustrationPosition: 'center',
    illustrationScale: 100,
    order: 4,
    answer: '0'
  },
  {
    id: 'sample_alg_05',
    unit: '수학 I · 수열의 합과 점화식',
    num: '05',
    rawText: '수열 $\\{a_n\\}$이 모든 자연수 $n$에 대하여 다음 조건을 만족시킨다.\n\n(가) $a_1 = 2$\n(나) $a_{n+1} = \\begin{cases} \\dfrac{1}{a_n} + 1 & (a_n \\le 2) \\\\[8pt] a_n - 1 & (a_n > 2) \\end{cases}$\n\n이때 $\\sum_{k=1}^{30} a_k$의 값을 구하시오.',
    cleanedText: '수열 $\\{a_n\\}$이 모든 자연수 $n$에 대하여 다음 조건을 만족시킨다.\n\n(가) $a_1 = 2$\n(나) $a_{n+1} = \\begin{cases} \\dfrac{1}{a_n} + 1 & (a_n \\le 2) \\\\[8pt] a_n - 1 & (a_n > 2) \\end{cases}$\n\n이때 $\\sum_{k=1}^{30} a_k$의 값을 구하시오.',
    page: 5,
    include: true,
    illustrationType: 'none',
    illustrationCode: '',
    illustrationSource: 'none',
    illustrationPosition: 'center',
    illustrationScale: 100,
    order: 5,
    answer: '45'
  },
  {
    id: 'sample_circuit_06',
    unit: '물리학 I · 전자기 유도 및 회로',
    num: '06',
    rawText: '그림과 같이 기전력 $V = 12\\text{V}$인 직류 전원과 저항 $R_1 = 4\\,\\Omega$, $R_2 = 6\\,\\Omega$, 스위치 $S$로 연결된 회로가 있다. 스위치를 닫았을 때, 회로 전체에 흐르는 전류 $I$와 저항 $R_2$에 걸리는 전압을 구하시오.',
    cleanedText: '그림과 같이 기전력 $V = 12\\text{V}$인 직류 전원과 저항 $R_1 = 4\\,\\Omega$, $R_2 = 6\\,\\Omega$, 스위치 $S$로 연결된 회로가 있다. 스위치를 닫았을 때, 회로 전체에 흐르는 전류 $I$와 저항 $R_2$에 걸리는 전압을 구하시오.',
    page: 6,
    include: true,
    illustrationType: 'svg',
    illustrationCode: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 150" width="260" height="140">
  <!-- Wires -->
  <path d="M 40 75 L 40 25 L 120 25 M 160 25 L 240 25 L 240 125 L 160 125 M 120 125 L 40 125 L 40 75" 
        fill="none" stroke="#1e293b" stroke-width="2" />
        
  <!-- DC Source (left) -->
  <line x1="30" y1="70" x2="50" y2="70" stroke="#1e293b" stroke-width="3" />
  <line x1="35" y1="80" x2="45" y2="80" stroke="#1e293b" stroke-width="2" />
  <text x="12" y="78" font-family="'JetBrains Mono', monospace" font-size="12" font-weight="600">12V</text>

  <!-- Resistor 1 (top) -->
  <rect x="120" y="17" width="40" height="16" fill="#f8fafc" stroke="#1e293b" stroke-width="1.8" />
  <text x="126" y="11" font-family="'Noto Sans KR', sans-serif" font-size="11" font-weight="600">R₁=4Ω</text>

  <!-- Resistor 2 (bottom) -->
  <rect x="120" y="117" width="40" height="16" fill="#f8fafc" stroke="#1e293b" stroke-width="1.8" />
  <text x="126" y="146" font-family="'Noto Sans KR', sans-serif" font-size="11" font-weight="600">R₂=6Ω</text>
  
  <!-- Switch S -->
  <line x1="180" y1="25" x2="198" y2="15" stroke="#b91c1c" stroke-width="2" />
  <circle cx="180" cy="25" r="2.5" fill="#1e293b" />
  <circle cx="205" cy="25" r="2.5" fill="#1e293b" />
  <text x="190" y="12" font-family="'Noto Serif KR', serif" font-size="12" font-weight="700" fill="#b91c1c">S</text>
</svg>`,
    illustrationSource: 'column',
    illustrationPosition: 'center',
    illustrationScale: 100,
    order: 6,
    answer: '1.2A, 7.2V'
  }
];
