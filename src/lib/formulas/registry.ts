// lib/formulas/registry.ts
// Formula Library — pure data registry of all 45 formulas
// Every formula is a plain FormulaDef object. No React, no side effects.

import type { FormulaDef, FormulaGroup, Translation } from "@/types/formulas";

// ─── Level Labels ─────────────────────────────────────────────

export const levelMeta: Record<string, Translation> = {
  elementary:    { th: "ประถมศึกษา",   en: "Elementary",    jp: "小学校",   ch: "小学", ko: "초등학교" },
  middleSchool:  { th: "มัธยมต้น",     en: "Middle School", jp: "中学校",   ch: "初중",  ko: "중학교" },
  highSchool:    { th: "มัธยมปลาย",    en: "High School",   jp: "高校",     ch: "高中",  ko: "고등학교" },
  university:    { th: "มหาวิทยาลัย",  en: "University",    jp: "大学",     ch: "大学",  ko: "대학교" },
};

// ─── All 23 Formulas ──────────────────────────────────────────

export const formulas: FormulaDef[] = [
  // ── Elementary: Geometry ──
  {
    id: "geo_sq", level: "elementary",
    cat: { th: "เรขาคณิต", en: "Geometry", jp: "幾何学", ch: "几何", ko: "기하학" },
    subject: "geometry", icon: "fa-vector-square",
    title: { th: "พื้นที่สี่เหลี่ยมจัตุรัส", en: "Square Area", jp: "正方形の面積", ch: "正方形面积", ko: "정사각형 넓이" },
    fStr: "A = s²",
    vars: [{ id: "s", label: { th: "ด้าน (s)", en: "Side (s)", jp: "辺 (s)", ch: "边长 (s)", ko: "변 (s)" }, u: "units" }],
    unit: "sq. units",
    fn: (v) => v.s ** 2,
  },
  {
    id: "geo_rect", level: "elementary",
    cat: { th: "เรขาคณิต", en: "Geometry", jp: "幾何学", ch: "几何", ko: "기하학" },
    subject: "geometry", icon: "fa-square",
    title: { th: "พื้นที่สี่เหลี่ยมผืนผ้า", en: "Rectangle Area", jp: "長方形の面積", ch: "长方形面积", ko: "직사각형 넓이" },
    fStr: "A = L × W",
    vars: [
      { id: "l", label: { th: "ยาว (L)", en: "Length (L)", jp: "縦 (L)", ch: "长度 (L)", ko: "길이 (L)" }, u: "units" },
      { id: "w", label: { th: "กว้าง (W)", en: "Width (W)", jp: "横 (W)", ch: "宽度 (W)", ko: "너비 (W)" }, u: "units" },
    ],
    unit: "sq. units",
    fn: (v) => v.l * v.w,
  },
  {
    id: "geo_rect_perim", level: "elementary",
    cat: { th: "เรขาคณิต", en: "Geometry", jp: "幾何学", ch: "几何", ko: "기하학" },
    subject: "geometry", icon: "fa-vector-square",
    title: { th: "เส้นรอบรูปสี่เหลี่ยมผืนผ้า", en: "Rectangle Perimeter", jp: "長方形の周囲", ch: "长方形周长", ko: "직사각형 둘레" },
    fStr: "P = 2(L + W)",
    vars: [
      { id: "l", label: { th: "ยาว (L)", en: "Length (L)", jp: "縦 (L)", ch: "长度 (L)", ko: "길이 (L)" }, u: "units" },
      { id: "w", label: { th: "กว้าง (W)", en: "Width (W)", jp: "横 (W)", ch: "宽度 (W)", ko: "너비 (W)" }, u: "units" },
    ],
    unit: "units",
    fn: (v) => 2 * (v.l + v.w),
  },
  {
    id: "geo_tri", level: "elementary",
    cat: { th: "เรขาคณิต", en: "Geometry", jp: "幾何学", ch: "几何", ko: "기하학" },
    subject: "geometry", icon: "fa-play",
    title: { th: "พื้นที่สามเหลี่ยม", en: "Triangle Area", jp: "三角形の面積", ch: "三角形面积", ko: "삼각형 넓이" },
    fStr: "A = ½ × b × h",
    vars: [
      { id: "b", label: { th: "ฐาน (b)", en: "Base (b)", jp: "底辺 (b)", ch: "底边 (b)", ko: "밑변 (b)" }, u: "units" },
      { id: "h", label: { th: "สูง (h)", en: "Height (h)", jp: "高さ (h)", ch: "高度 (h)", ko: "높이 (h)" }, u: "units" },
    ],
    unit: "sq. units",
    fn: (v) => 0.5 * v.b * v.h,
  },
  {
    id: "geo_circle", level: "elementary",
    cat: { th: "เรขาคณิต", en: "Geometry", jp: "幾何学", ch: "几何", ko: "기하학" },
    subject: "geometry", icon: "fa-circle",
    title: { th: "พื้นที่วงกลม", en: "Circle Area", jp: "円の面積", ch: "圆面积", ko: "원의 넓이" },
    fStr: "A = πr²",
    vars: [{ id: "r", label: { th: "รัศมี (r)", en: "Radius (r)", jp: "半径 (r)", ch: "半径 (r)", ko: "반지름 (r)" }, u: "units" }],
    unit: "sq. units",
    fn: (v) => Math.PI * v.r ** 2,
  },
  {
    id: "geo_circ_perim", level: "elementary",
    cat: { th: "เรขาคณิต", en: "Geometry", jp: "幾何学", ch: "几何", ko: "기하학" },
    subject: "geometry", icon: "fa-circle-notch",
    title: { th: "เส้นรอบวงกลม", en: "Circle Circumference", jp: "円周", ch: "圆周长", ko: "원주 (원둘레)" },
    fStr: "C = 2πr",
    vars: [{ id: "r", label: { th: "รัศมี (r)", en: "Radius (r)", jp: "半径 (r)", ch: "半径 (r)", ko: "반지름 (r)" }, u: "units" }],
    unit: "units",
    fn: (v) => 2 * Math.PI * v.r,
  },
  {
    id: "geo_cube_vol", level: "elementary",
    cat: { th: "เรขาคณิต", en: "Geometry", jp: "幾何学", ch: "几何", ko: "기하학" },
    subject: "geometry", icon: "fa-cube",
    title: { th: "ปริมาตรลูกบาศก์", en: "Cube Volume", jp: "立方体の体積", ch: "立方体体积", ko: "정육면체 부피" },
    fStr: "V = s³",
    vars: [{ id: "s", label: { th: "ด้าน (s)", en: "Side (s)", jp: "辺 (s)", ch: "边长 (s)", ko: "변 (s)" }, u: "units" }],
    unit: "cu. units",
    fn: (v) => v.s ** 3,
  },

  // ── Elementary: Numbers ──
  {
    id: "pct_of", level: "elementary",
    cat: { th: "ร้อยละ", en: "Percentage", jp: "パーセンテージ", ch: "百分比", ko: "백분율" },
    subject: "numbers", icon: "fa-percent",
    title: { th: "หาค่าเปอร์เซ็นต์ (%)", en: "Percentage of", jp: "パーセンテージ計算", ch: "计算百分比", ko: "퍼센트 계산" },
    fStr: "Result = (P ÷ 100) × Value",
    vars: [
      { id: "p", label: { th: "ร้อยละ (P)", en: "Percentage (P)", jp: "割合 (P)", ch: "百分比 (P)", ko: "백분율 (P)" }, u: "%" },
      { id: "val", label: { th: "ค่าทั้งหมด", en: "Value", jp: "値", ch: "数值", ko: "값" } },
    ],
    unit: "",
    fn: (v) => (v.p / 100) * v.val,
  },

  // ── Middle School: Geometry ──
  {
    id: "pyth_c", level: "middleSchool",
    cat: { th: "เรขาคณิต", en: "Geometry", jp: "幾何学", ch: "几何", ko: "기하학" },
    subject: "geometry", icon: "fa-mountain",
    title: { th: "พีทาโกรัส (หา c)", en: "Pythagoras (Find c)", jp: "ピタゴラス (cを求める)", ch: "勾股定理 (求c)", ko: "피타고라스 정리 (c 구하기)" },
    fStr: "c = √(a² + b²)",
    vars: [
      { id: "a", label: { th: "ด้าน a", en: "Side a", jp: "辺 a", ch: "直角边 a", ko: "a 변" }, u: "units" },
      { id: "b", label: { th: "ด้าน b", en: "Side b", jp: "辺 b", ch: "直角边 b", ko: "b 변" }, u: "units" },
    ],
    unit: "units",
    fn: (v) => Math.sqrt(v.a ** 2 + v.b ** 2),
  },

  // ── Middle School: Algebra ──
  {
    id: "linear_eq", level: "middleSchool",
    cat: { th: "พีชคณิต", en: "Algebra", jp: "代数学", ch: "代数", ko: "대수학" },
    subject: "algebra", icon: "fa-equals",
    title: { th: "สมการเชิงเส้น", en: "Linear Equation", jp: "一次方程式", ch: "线性方程", ko: "일차 방정식" },
    fStr: "ax + b = 0  => x = -b/a",
    vars: [
      { id: "a", label: { th: "สัมประสิทธิ์ a", en: "Coefficient a", jp: "係数 a", ch: "系数 a", ko: "계수 a" } },
      { id: "b", label: { th: "ค่าคงที่ b", en: "Constant b", jp: "定数 b", ch: "常数 b", ko: "상수 b" } },
    ],
    unit: "",
    chk: ["a"],
    fn: (v) => -v.b / v.a,
  },

  // ── High School: Trigonometry ──
  {
    id: "trig_sin", level: "highSchool",
    cat: { th: "ตรีโกณมิติ", en: "Trigonometry", jp: "三角関数", ch: "三角学", ko: "삼각함수" },
    subject: "geometry", icon: "fa-wave-square",
    title: { th: "sin, cos, tan (องศา)", en: "sin, cos, tan (Deg)", jp: "三角関数 (度)", ch: "三角函数 (度)", ko: "sin, cos, tan (도)" },
    fStr: "sin θ, cos θ, tan θ",
    vars: [{ id: "deg", label: { th: "มุม (องศา)", en: "Angle (Deg)", jp: "角度 (度)", ch: "角度 (度)", ko: "각도 (도)" }, u: "°" }],
    unit: "",
    multiResult: ["sin", "cos", "tan"],
    resultLabels: {
      sin: { th: "sin θ", en: "sin θ", jp: "sin θ", ch: "sin θ", ko: "sin θ" },
      cos: { th: "cos θ", en: "cos θ", jp: "cos θ", ch: "cos θ", ko: "cos θ" },
      tan: { th: "tan θ", en: "tan θ", jp: "tan θ", ch: "tan θ", ko: "tan θ" },
    },
    fn: (v) => {
      const r = v.deg * (Math.PI / 180);
      const cosV = Math.cos(r);
      return { sin: Math.sin(r), cos: cosV, tan: Math.abs(cosV) < 1e-12 ? Infinity : Math.tan(r) };
    },
  },

  // ── High School: Calculus ──
  {
    id: "deriv_power", level: "highSchool",
    cat: { th: "แคลคูลัส", en: "Calculus", jp: "微積分", ch: "微积分", ko: "미적분학" },
    subject: "calculus", icon: "fa-italic",
    title: { th: "อนุพันธ์ (Power Rule)", en: "Derivative (Power)", jp: "微分 (べき乗)", ch: "导数 (幂规则)", ko: "미분 (거듭제곱 법칙)" },
    fStr: "d/dx [cxⁿ] = cnxⁿ⁻¹",
    vars: [
      { id: "c", label: { th: "สัมประสิทธิ์ c", en: "Coeff c", jp: "係数 c", ch: "系数 c", ko: "계수 c" } },
      { id: "n", label: { th: "เลขชี้กำลัง n", en: "Power n", jp: "指数 n", ch: "指数 n", ko: "지수 n" } },
      { id: "x", label: { th: "แทนค่า x", en: "At x", jp: "xの値", ch: "x的值", ko: "x" } },
    ],
    unit: "",
    fn: (v) => v.c * v.n * Math.pow(v.x, v.n - 1),
  },

  // ── University: Linear Algebra ──
  {
    id: "dot_product", level: "university",
    cat: { th: "พีชคณิตเชิงเส้น", en: "Linear Algebra", jp: "線形代数", ch: "线性代数", ko: "선형대수학" },
    subject: "algebra", icon: "fa-arrows-to-dot",
    title: { th: "Dot Product 3D", en: "Dot Product 3D", jp: "内積 3D", ch: "点积 3D", ko: "내적 (3D)" },
    fStr: "A·B = a₁b₁ + a₂b₂ + a₃b₃",
    vars: [
      { id: "a1", label: { th: "A1", en: "A1", jp: "A1", ch: "A1", ko: "A1" } },
      { id: "a2", label: { th: "A2", en: "A2", jp: "A2", ch: "A2", ko: "A2" } },
      { id: "a3", label: { th: "A3", en: "A3", jp: "A3", ch: "A3", ko: "A3" } },
      { id: "b1", label: { th: "B1", en: "B1", jp: "B1", ch: "B1", ko: "B1" } },
      { id: "b2", label: { th: "B2", en: "B2", jp: "B2", ch: "B2", ko: "B2" } },
      { id: "b3", label: { th: "B3", en: "B3", jp: "B3", ch: "B3", ko: "B3" } },
    ],
    unit: "",
    fn: (v) => v.a1 * v.b1 + v.a2 * v.b2 + v.a3 * v.b3,
  },

  // ── University: Business / Financial ──
  {
    id: "biz_compound_interest", level: "university",
    cat: { th: "การเงิน", en: "Financial", jp: "金融", ch: "金融", ko: "금융" },
    subject: "financial", icon: "fa-sack-dollar",
    title: { th: "ดอกเบี้ยทบต้น", en: "Compound Interest", jp: "複利", ch: "复利", ko: "복리" },
    fStr: "A = P(1 + r/n)^(nt)",
    vars: [
      { id: "p", label: { th: "เงินต้น (P)", en: "Principal (P)", jp: "元本 (P)", ch: "本金 (P)", ko: "원금 (P)" } },
      { id: "r", label: { th: "อัตราดอกเบี้ย (r%)", en: "Rate (r%)", jp: "利率 (r%)", ch: "利率 (r%)", ko: "이자율 (r%)" }, u: "%" },
      { id: "n", label: { th: "จำนวนครั้งทบต้น/ปี (n)", en: "Compounds/Year (n)", jp: "複利回数/年 (n)", ch: "年复利次数 (n)", ko: "연 복리 횟수 (n)" } },
      { id: "t", label: { th: "จำนวนปี (t)", en: "Years (t)", jp: "年数 (t)", ch: "年数 (t)", ko: "년수 (t)" }, u: "years" },
    ],
    unit: "",
    chk: ["n"],
    fn: (v) => v.p * Math.pow(1 + (v.r / 100) / v.n, v.n * v.t),
  },
  {
    id: "biz_breakeven", level: "university",
    cat: { th: "ธุรกิจ", en: "Business", jp: "ビジネス", ch: "商业", ko: "비즈니스" },
    subject: "business", icon: "fa-scale-balanced",
    title: { th: "จุดคุ้มทุน", en: "Break-Even Point", jp: "损益分岐点", ch: "盈亏平衡点", ko: "손익분기점" },
    fStr: "BEP = Fixed Costs ÷ (Price − Variable Cost)",
    vars: [
      { id: "fc", label: { th: "ต้นทุนคงที่", en: "Fixed Costs", jp: "固定費", ch: "固定成本", ko: "고정비용" } },
      { id: "p", label: { th: "ราคาต่อหน่วย", en: "Price/Unit", jp: "単価", ch: "单价", ko: "단가" } },
      { id: "vc", label: { th: "ต้นทุนผันแปรต่อหน่วย", en: "Variable Cost/Unit", jp: "変動費/単位", ch: "单位变动成本", ko: "단위 변동비용" } },
    ],
    unit: "units",
    chk: ["p-vc"],
    fn: (v) => v.fc / (v.p - v.vc),
  },
  {
    id: "biz_npv", level: "university",
    cat: { th: "การลงทุน", en: "Investment", jp: "投資", ch: "投资", ko: "투자" },
    subject: "investment", icon: "fa-chart-line",
    title: { th: "มูลค่าปัจจุบันสุทธิ (NPV)", en: "Net Present Value (NPV)", jp: "正味現在価値 (NPV)", ch: "净现值 (NPV)", ko: "순현재가치 (NPV)" },
    fStr: "NPV = Σ [Cₜ / (1 + r)ᵗ] − C₀",
    vars: [
      { id: "c0", label: { th: "เงินลงทุนเริ่มต้น (C₀)", en: "Initial Investment (C₀)", jp: "初期投資 (C₀)", ch: "初始投资 (C₀)", ko: "초기 투자액 (C₀)" } },
      { id: "r", label: { th: "อัตราคิดลด (r%)", en: "Discount Rate (r%)", jp: "割引率 (r%)", ch: "折现率 (r%)", ko: "할인율 (r%)" }, u: "%" },
      { id: "c1", label: { th: "กระแสเงินสด ปี 1", en: "Cash Flow Year 1", jp: "キャッシュフロー 年1", ch: "第1年现金流", ko: "1년차 현금흐름" } },
      { id: "c2", label: { th: "กระแสเงินสด ปี 2", en: "Cash Flow Year 2", jp: "キャッシュフロー 年2", ch: "第2年现金流", ko: "2년차 현금흐름" } },
      { id: "c3", label: { th: "กระแสเงินสด ปี 3", en: "Cash Flow Year 3", jp: "キャッシュフロー 年3", ch: "第3年现金流", ko: "3년차 현금흐름" } },
    ],
    unit: "",
    fn: (v) => {
      const rate = v.r / 100;
      return (v.c1 / Math.pow(1 + rate, 1))
        + (v.c2 / Math.pow(1 + rate, 2))
        + (v.c3 / Math.pow(1 + rate, 3))
        - v.c0;
    },
  },
  {
    id: "biz_elasticity", level: "university",
    cat: { th: "เศรษฐศาสตร์", en: "Economics", jp: "経済学", ch: "经济学", ko: "경제학" },
    subject: "economics", icon: "fa-arrows-left-right",
    title: { th: "ความยืดหยุ่นของอุปสงค์", en: "Elasticity of Demand", jp: "需要の弾力性", ch: "需求弹性", ko: "수요 탄력성" },
    fStr: "E = (ΔQ/Q₁) ÷ (ΔP/P₁)",
    vars: [
      { id: "q1", label: { th: "ปริมาณซื้อเดิม (Q₁)", en: "Old Quantity (Q₁)", jp: "元の量 (Q₁)", ch: "原需求量 (Q₁)", ko: "기존 수요량 (Q₁)" } },
      { id: "q2", label: { th: "ปริมาณซื้อใหม่ (Q₂)", en: "New Quantity (Q₂)", jp: "新しい量 (Q₂)", ch: "新需求量 (Q₂)", ko: "새 수요량 (Q₂)" } },
      { id: "p1", label: { th: "ราคาเดิม (P₁)", en: "Old Price (P₁)", jp: "元の価格 (P₁)", ch: "原价格 (P₁)", ko: "기존 가격 (P₁)" } },
      { id: "p2", label: { th: "ราคาใหม่ (P₂)", en: "New Price (P₂)", jp: "新しい価格 (P₂)", ch: "新价格 (P₂)", ko: "새 가격 (P₂)" } },
    ],
    unit: "",
    chk: ["q1", "p1"],
    fn: (v) => ((v.q2 - v.q1) / v.q1) / ((v.p2 - v.p1) / v.p1),
  },
  {
    id: "biz_depreciation_sl", level: "university",
    cat: { th: "การบัญชี", en: "Accounting", jp: "会計", ch: "会计", ko: "회계" },
    subject: "accounting", icon: "fa-arrow-trend-down",
    title: { th: "ค่าเสื่อมราคาแบบเส้นตรง", en: "Depreciation: Straight-Line", jp: "定額法減価償却", ch: "直线折旧法", ko: "정액법 감가상각" },
    fStr: "D = (Cost − Salvage) ÷ Life",
    vars: [
      { id: "cost", label: { th: "ต้นทุนสินทรัพย์", en: "Asset Cost", jp: "取得原価", ch: "资产成本", ko: "자산 취득원가" } },
      { id: "salvage", label: { th: "มูลค่าคงเหลือ", en: "Salvage Value", jp: "残存価値", ch: "残值", ko: "잔존 가치" } },
      { id: "life", label: { th: "อายุการใช้งาน (ปี)", en: "Useful Life (Years)", jp: "耐用年数", ch: "使用年限 (年)", ko: "내용연수 (년)" }, u: "years" },
    ],
    unit: "/year",
    chk: ["life"],
    fn: (v) => (v.cost - v.salvage) / v.life,
  },

  // ── University: Civil Engineering ──
  {
    id: "ce_flexural_stress", level: "university",
    cat: { th: "โครงสร้าง", en: "STRUCTURE", jp: "構造", ch: "结构", ko: "구조" },
    subject: "structure", icon: "fa-archway",
    title: { th: "ความเค้นดัดในคาน", en: "Flexural Stress in Beams", jp: "梁の曲げ応力", ch: "梁的弯曲应力", ko: "보의 휨 응력" },
    fStr: "σ = M·y / I",
    vars: [
      { id: "m", label: { th: "โมเมนต์ดัด (M)", en: "Bending Moment (M)", jp: "曲げモーメント (M)", ch: "弯矩 (M)", ko: "휨 모멘트 (M)" }, u: "N·m" },
      { id: "y", label: { th: "ระยะจากแกนกลาง (y)", en: "Distance from NA (y)", jp: "中立軸からの距離 (y)", ch: "距中性轴距离 (y)", ko: "중립축으로부터 거리 (y)" }, u: "m" },
      { id: "i", label: { th: "โมเมนต์ความเฉื่อย (I)", en: "Moment of Inertia (I)", jp: "断面二次モーメント (I)", ch: "惯性矩 (I)", ko: "단면 2차 모멘트 (I)" }, u: "m⁴" },
    ],
    unit: "Pa",
    chk: ["i"],
    fn: (v) => (v.m * v.y) / v.i,
  },
  {
    id: "ce_euler_buckling", level: "university",
    cat: { th: "กลศาสตร์วัสดุ", en: "MECHANICS", jp: "材料力学", ch: "材料力学", ko: "재료역학" },
    subject: "mechanics", icon: "fa-grip-lines-vertical",
    title: { th: "แรงโก่งเดาะของเสา (Euler)", en: "Euler's Buckling Load", jp: "オイラー座屈荷重", ch: "欧拉屈曲荷载", ko: "오일러 좌굴 하중" },
    fStr: "Pcr = π²EI / (Le)²",
    vars: [
      { id: "e", label: { th: "โมดูลัสยัง (E)", en: "Young's Modulus (E)", jp: "ヤング率 (E)", ch: "弹性模量 (E)", ko: "영률 (E)" }, u: "Pa" },
      { id: "i", label: { th: "โมเมนต์ความเฉื่อย (I)", en: "Moment of Inertia (I)", jp: "断面二次モーメント (I)", ch: "惯性矩 (I)", ko: "단면 2차 모멘트 (I)" }, u: "m⁴" },
      { id: "le", label: { th: "ความยาวประสิทธิภาพ (Le)", en: "Effective Length (Le)", jp: "有効長さ (Le)", ch: "有效长度 (Le)", ko: "유효 길이 (Le)" }, u: "m" },
    ],
    unit: "N",
    chk: ["le"],
    fn: (v) => (Math.PI ** 2 * v.e * v.i) / (v.le ** 2),
  },
  {
    id: "ce_bernoulli", level: "university",
    cat: { th: "ชลศาสตร์", en: "HYDRAULICS", jp: "水理学", ch: "水力学", ko: "수리학" },
    subject: "hydraulics", icon: "fa-water",
    title: { th: "สมการเบอร์นูลลี", en: "Bernoulli's Equation", jp: "ベルヌーイの式", ch: "伯努利方程", ko: "베르누이 방정식" },
    fStr: "P₁/ρg + v₁²/2g + z₁ = P₂/ρg + v₂²/2g + z₂",
    vars: [
      { id: "p1", label: { th: "ความดันจุด 1 (P₁)", en: "Pressure Point 1 (P₁)", jp: "圧力 点1 (P₁)", ch: "点1压力 (P₁)", ko: "점1 압력 (P₁)" }, u: "Pa" },
      { id: "v1", label: { th: "ความเร็วจุด 1 (v₁)", en: "Velocity Point 1 (v₁)", jp: "速度 点1 (v₁)", ch: "点1流速 (v₁)", ko: "점1 속도 (v₁)" }, u: "m/s" },
      { id: "z1", label: { th: "ระดับความสูงจุด 1 (z₁)", en: "Elevation Point 1 (z₁)", jp: "高さ 点1 (z₁)", ch: "点1高程 (z₁)", ko: "점1 고도 (z₁)" }, u: "m" },
      { id: "p2", label: { th: "ความดันจุด 2 (P₂)", en: "Pressure Point 2 (P₂)", jp: "圧力 点2 (P₂)", ch: "点2压力 (P₂)", ko: "점2 압력 (P₂)" }, u: "Pa" },
      { id: "v2", label: { th: "ความเร็วจุด 2 (v₂)", en: "Velocity Point 2 (v₂)", jp: "速度 点2 (v₂)", ch: "点2流速 (v₂)", ko: "점2 속도 (v₂)" }, u: "m/s" },
      { id: "z2", label: { th: "ระดับความสูงจุด 2 (z₂)", en: "Elevation Point 2 (z₂)", jp: "高さ 点2 (z₂)", ch: "点2高程 (z₂)", ko: "점2 고도 (z₂)" }, u: "m" },
      { id: "rho", label: { th: "ความหนาแน่นของไหล (ρ)", en: "Fluid Density (ρ)", jp: "流体密度 (ρ)", ch: "流体密度 (ρ)", ko: "유체 밀도 (ρ)" }, u: "kg/m³" },
    ],
    unit: "m",
    chk: ["rho"],
    multiResult: ["totalHead1", "totalHead2"],
    resultLabels: {
      totalHead1: { th: "พลังงานรวมจุด 1 (H₁)", en: "Total Head Point 1 (H₁)", jp: "全水頭 点1 (H₁)", ch: "总水头点1 (H₁)", ko: "전수두 점1 (H₁)" },
      totalHead2: { th: "พลังงานรวมจุด 2 (H₂)", en: "Total Head Point 2 (H₂)", jp: "全水頭 点2 (H₂)", ch: "总水头点2 (H₂)", ko: "전수두 점2 (H₂)" },
    },
    fn: (v) => {
      const g = 9.81;
      const h1 = v.p1 / (v.rho * g) + (v.v1 ** 2) / (2 * g) + v.z1;
      const h2 = v.p2 / (v.rho * g) + (v.v2 ** 2) / (2 * g) + v.z2;
      return { totalHead1: h1, totalHead2: h2 };
    },
  },
  {
    id: "ce_darcy_law", level: "university",
    cat: { th: "ธรณีเทคนิค", en: "GEOTECHNICAL", jp: "地盤工学", ch: "岩土工程", ko: "지반공학" },
    subject: "geotechnical", icon: "fa-layer-group",
    title: { th: "กฎของดาร์ซี (Darcy)", en: "Darcy's Law", jp: "ダルシーの法則", ch: "达西定律", ko: "달시의 법칙" },
    fStr: "Q = k·A·(Δh/L)",
    vars: [
      { id: "k", label: { th: "สัมประสิทธิ์การซึมผ่าน (k)", en: "Permeability Coeff. (k)", jp: "透水係数 (k)", ch: "渗透系数 (k)", ko: "투수계수 (k)" }, u: "m/s" },
      { id: "a", label: { th: "พื้นที่หน้าตัด (A)", en: "Cross-section Area (A)", jp: "断面積 (A)", ch: "截面积 (A)", ko: "단면적 (A)" }, u: "m²" },
      { id: "dh", label: { th: "ส่วนต่างค่าไฮดรอลิก (Δh)", en: "Head Difference (Δh)", jp: "水頭差 (Δh)", ch: "水头差 (Δh)", ko: "수두 차 (Δh)" }, u: "m" },
      { id: "l", label: { th: "ความยาวเส้นทางไหล (L)", en: "Flow Path Length (L)", jp: "流路長 (L)", ch: "渗流路径长度 (L)", ko: "유로 길이 (L)" }, u: "m" },
    ],
    unit: "m³/s",
    chk: ["l"],
    fn: (v) => v.k * v.a * (v.dh / v.l),
  },
  {
    id: "ce_concrete_mix", level: "university",
    cat: { th: "วัสดุก่อสร้าง", en: "MATERIALS", jp: "建設材料", ch: "建筑材料", ko: "건설 자재" },
    subject: "materials", icon: "fa-trowel-bricks",
    title: { th: "อัตราส่วนผสมคอนกรีต", en: "Concrete Mix Design", jp: "コンクリート配合", ch: "混凝土配合比", ko: "콘크리트 배합설계" },
    fStr: "Ratio = Cement : Sand : Aggregate : Water",
    vars: [
      { id: "wc", label: { th: "อัตราส่วนน้ำ/ปูน (w/c)", en: "Water/Cement Ratio (w/c)", jp: "水セメント比 (w/c)", ch: "水灰比 (w/c)", ko: "물시멘트비 (w/c)" } },
      { id: "cement", label: { th: "ปูนซีเมนต์ (kg)", en: "Cement (kg)", jp: "セメント (kg)", ch: "水泥 (kg)", ko: "시멘트 (kg)" }, u: "kg" },
      { id: "fa_ratio", label: { th: "อัตราส่วนทราย", en: "Sand Ratio", jp: "砂比率", ch: "砂率", ko: "모래 비율" } },
      { id: "ca_ratio", label: { th: "อัตราส่วนหิน", en: "Aggregate Ratio", jp: "骨材比率", ch: "石子比率", ko: "골재 비율" } },
    ],
    unit: "",
    multiResult: ["water", "sand", "aggregate"],
    resultLabels: {
      water: { th: "น้ำ (kg)", en: "Water (kg)", jp: "水 (kg)", ch: "水 (kg)", ko: "물 (kg)" },
      sand: { th: "ทราย (kg)", en: "Sand (kg)", jp: "砂 (kg)", ch: "砂 (kg)", ko: "모래 (kg)" },
      aggregate: { th: "หิน (kg)", en: "Aggregate (kg)", jp: "骨材 (kg)", ch: "石子 (kg)", ko: "골재 (kg)" },
    },
    fn: (v) => {
      const water = v.wc * v.cement;
      const sand = v.fa_ratio * v.cement;
      const aggregate = v.ca_ratio * v.cement;
      return { water, sand, aggregate };
    },
  },

  // ─── Phase 1: 22 New Departments (1 Formula Each) ──────────

  // 1. mechanical-engineering — Stress-Strain
  {
    id: "me_stress_strain", level: "university",
    cat: { th: "กลศาสตร์วัสดุ", en: "Mechanics of Materials", jp: "材料力学", ch: "材料力学", ko: "재료역학" },
    subject: "mechanics_of_materials", icon: "fa-gear",
    title: { th: "ความเค้น-ความเครียด", en: "Stress-Strain", jp: "応力-ひずみ", ch: "应力-应变", ko: "응력-변형률" },
    fStr: "σ = F / A",
    vars: [
      { id: "F", label: { th: "แรง (F) N", en: "Force (F) N", jp: "力 (F) N", ch: "力 (F) N", ko: "힘 (F) N" }, u: "N" },
      { id: "A", label: { th: "พื้นที่หน้าตัด (A) m²", en: "Area (A) m²", jp: "断面積 (A) m²", ch: "截面积 (A) m²", ko: "단면적 (A) m²" }, u: "m²" },
    ],
    unit: "Pa",
    chk: ["A"],
    fn: (v) => v.F / v.A,
  },

  // 2. electrical-engineering — Ohm's Law
  {
    id: "ee_ohms_law", level: "university",
    cat: { th: "วงจรไฟฟ้า", en: "Circuits", jp: "電気回路", ch: "电路", ko: "전기회로" },
    subject: "circuits", icon: "fa-bolt",
    title: { th: "กฎของโอห์ม", en: "Ohm's Law", jp: "オームの法則", ch: "欧姆定律", ko: "옴의 법칙" },
    fStr: "V = I × R",
    vars: [
      { id: "I", label: { th: "กระแส (I) A", en: "Current (I) A", jp: "電流 (I) A", ch: "电流 (I) A", ko: "전류 (I) A" }, u: "A" },
      { id: "R", label: { th: "ความต้านทาน (R) Ω", en: "Resistance (R) Ω", jp: "抵抗 (R) Ω", ch: "电阻 (R) Ω", ko: "저항 (R) Ω" }, u: "Ω" },
    ],
    unit: "V",
    fn: (v) => v.I * v.R,
  },

  // 3. computer-science — Binary Search Complexity
  {
    id: "cs_binary_search", level: "university",
    cat: { th: "อัลกอริทึม", en: "Algorithms", jp: "アルゴリズム", ch: "算法", ko: "알고리즘" },
    subject: "algorithms", icon: "fa-code",
    title: { th: "ความซับซ้อน Binary Search", en: "Binary Search Complexity", jp: "二分探索の計算量", ch: "二分查找复杂度", ko: "이진 탐색 복잡도" },
    fStr: "T(n) = O(log₂ n)",
    vars: [
      { id: "n", label: { th: "ขนาดข้อมูล (n)", en: "Input Size (n)", jp: "入力サイズ (n)", ch: "输入规模 (n)", ko: "입력 크기 (n)" } },
    ],
    unit: "steps",
    fn: (v) => Math.log2(v.n),
  },

  // 4. civil-engineering — Moment of Inertia (Rectangle) — tagged to existing civil-engineering dept
  {
    id: "ce_moment_inertia", level: "university",
    cat: { th: "โครงสร้าง", en: "Structure", jp: "構造力学", ch: "结构力学", ko: "구조역학" },
    subject: "mechanics_of_materials", icon: "fa-building-columns",
    title: { th: "โมเมนต์ความเฉื่อย (สี่เหลี่ยม)", en: "Moment of Inertia (Rectangle)", jp: "断面二次モーメント (矩形)", ch: "惯性矩 (矩形)", ko: "단면 2차 모멘트 (직사각형)" },
    fStr: "I = bh³ / 12",
    vars: [
      { id: "b", label: { th: "ฐาน (b) m", en: "Base (b) m", jp: "幅 (b) m", ch: "宽 (b) m", ko: "너비 (b) m" }, u: "m" },
      { id: "h", label: { th: "สูง (h) m", en: "Height (h) m", jp: "高さ (h) m", ch: "高 (h) m", ko: "높이 (h) m" }, u: "m" },
    ],
    unit: "m⁴",
    fn: (v) => (v.b * Math.pow(v.h, 3)) / 12,
  },

  // 5. chemical-engineering — Reynolds Number
  {
    id: "che_reynolds", level: "university",
    cat: { th: "กลศาสตร์ของไหล", en: "Fluid Mechanics", jp: "流体力学", ch: "流体力学", ko: "유체역학" },
    subject: "fluid_mechanics", icon: "fa-flask",
    title: { th: "เลขเรย์โนลด์ส", en: "Reynolds Number", jp: "レイノルズ数", ch: "雷诺数", ko: "레이놀즈 수" },
    fStr: "Re = ρvD / μ",
    vars: [
      { id: "rho", label: { th: "ความหนาแน่น (ρ) kg/m³", en: "Density (ρ) kg/m³", jp: "密度 (ρ) kg/m³", ch: "密度 (ρ) kg/m³", ko: "밀도 (ρ) kg/m³" }, u: "kg/m³" },
      { id: "v", label: { th: "ความเร็ว (v) m/s", en: "Velocity (v) m/s", jp: "流速 (v) m/s", ch: "流速 (v) m/s", ko: "유속 (v) m/s" }, u: "m/s" },
      { id: "D", label: { th: "เส้นผ่านศูนย์กลาง (D) m", en: "Diameter (D) m", jp: "直径 (D) m", ch: "直径 (D) m", ko: "직경 (D) m" }, u: "m" },
      { id: "mu", label: { th: "ความหนืด (μ) Pa·s", en: "Viscosity (μ) Pa·s", jp: "粘度 (μ) Pa·s", ch: "粘度 (μ) Pa·s", ko: "점도 (μ) Pa·s" }, u: "Pa·s" },
    ],
    unit: "",
    chk: ["mu"],
    fn: (v) => (v.rho * v.v * v.D) / v.mu,
  },

  // 6. industrial-engineering — Economic Order Quantity
  {
    id: "ie_eoq", level: "university",
    cat: { th: "ปฏิบัติการ", en: "Operations", jp: "オペレーション", ch: "运营管理", ko: "운영관리" },
    subject: "operations", icon: "fa-industry",
    title: { th: "ปริมาณสั่งซื้อที่ประหยัด", en: "Economic Order Quantity", jp: "経済的発注量", ch: "经济订货量", ko: "경제적 주문량" },
    fStr: "EOQ = √(2DS/H)",
    vars: [
      { id: "D", label: { th: "ความต้องการต่อปี (D)", en: "Annual Demand (D)", jp: "年間需要 (D)", ch: "年需求 (D)", ko: "연간 수요 (D)" } },
      { id: "S", label: { th: "ต้นทุนสั่งซื้อต่อครั้ง (S)", en: "Ordering Cost (S)", jp: "発注費 (S)", ch: "订货成本 (S)", ko: "주문 비용 (S)" } },
      { id: "H", label: { th: "ต้นทุนการเก็บรักษา/หน่วย (H)", en: "Holding Cost/Unit (H)", jp: "保管費 (H)", ch: "持有成本 (H)", ko: "보유 비용 (H)" } },
    ],
    unit: "units",
    chk: ["H"],
    fn: (v) => Math.sqrt((2 * v.D * v.S) / v.H),
  },

  // 7. aerospace-engineering — Lift Equation
  {
    id: "ae_lift", level: "university",
    cat: { th: "อากาศพลศาสตร์", en: "Aerodynamics", jp: "空気力学", ch: "空气动力学", ko: "공기역학" },
    subject: "aerodynamics", icon: "fa-plane",
    title: { th: "สมการแรงยก", en: "Lift Equation", jp: "揚力方程式", ch: "升力方程", ko: "양력 방정식" },
    fStr: "L = ½ρv²SC_L",
    vars: [
      { id: "rho", label: { th: "ความหนาแน่นอากาศ (ρ) kg/m³", en: "Air Density (ρ) kg/m³", jp: "空気密度 (ρ) kg/m³", ch: "空气密度 (ρ) kg/m³", ko: "공기 밀도 (ρ) kg/m³" }, u: "kg/m³", def: 1.225 },
      { id: "v", label: { th: "ความเร็ว (v) m/s", en: "Velocity (v) m/s", jp: "速度 (v) m/s", ch: "速度 (v) m/s", ko: "속도 (v) m/s" }, u: "m/s" },
      { id: "S", label: { th: "พื้นที่ปีก (S) m²", en: "Wing Area (S) m²", jp: "翼面積 (S) m²", ch: "翼面积 (S) m²", ko: "날개 면적 (S) m²" }, u: "m²" },
      { id: "CL", label: { th: "สัมประสิทธิ์แรงยก (CL)", en: "Lift Coefficient (CL)", jp: "揚力係数 (CL)", ch: "升力系数 (CL)", ko: "양력 계수 (CL)" }, def: 0.5 },
    ],
    unit: "N",
    fn: (v) => 0.5 * v.rho * Math.pow(v.v, 2) * v.S * v.CL,
  },

  // 8. environmental-engineering — Dilution Formula
  {
    id: "env_dilution", level: "university",
    cat: { th: "การบำบัดน้ำ", en: "Water Treatment", jp: "水処理", ch: "水处理", ko: "수처리" },
    subject: "water_treatment", icon: "fa-leaf",
    title: { th: "สูตรการเจือจาง", en: "Dilution Formula", jp: "希釈式", ch: "稀释公式", ko: "희석 공식" },
    fStr: "C₁V₁ = C₂V₂",
    vars: [
      { id: "C1", label: { th: "ความเข้มข้นเริ่มต้น (C₁)", en: "Initial Conc. (C₁)", jp: "初期濃度 (C₁)", ch: "初始浓度 (C₁)", ko: "초기 농도 (C₁)" } },
      { id: "V1", label: { th: "ปริมาตรเริ่มต้น (V₁) L", en: "Initial Volume (V₁) L", jp: "初期体積 (V₁) L", ch: "初始体积 (V₁) L", ko: "초기 부피 (V₁) L" }, u: "L" },
      { id: "C2", label: { th: "ความเข้มข้นสุดท้าย (C₂)", en: "Final Conc. (C₂)", jp: "最終濃度 (C₂)", ch: "最终浓度 (C₂)", ko: "최종 농도 (C₂)" } },
    ],
    unit: "L",
    chk: ["C2"],
    fn: (v) => (v.C1 * v.V1) / v.C2,
  },

  // 9. physics — Newton's Second Law
  {
    id: "ph_newton2", level: "university",
    cat: { th: "กลศาสตร์", en: "Mechanics", jp: "力学", ch: "力学", ko: "역학" },
    subject: "mechanics_physics", icon: "fa-atom",
    title: { th: "กฎข้อที่สองของนิวตัน", en: "Newton's Second Law", jp: "ニュートンの第2法則", ch: "牛顿第二定律", ko: "뉴턴 제2법칙" },
    fStr: "F = ma",
    vars: [
      { id: "m", label: { th: "มวล (m) kg", en: "Mass (m) kg", jp: "質量 (m) kg", ch: "质量 (m) kg", ko: "질량 (m) kg" }, u: "kg" },
      { id: "a", label: { th: "ความเร่ง (a) m/s²", en: "Acceleration (a) m/s²", jp: "加速度 (a) m/s²", ch: "加速度 (a) m/s²", ko: "가속도 (a) m/s²" }, u: "m/s²" },
    ],
    unit: "N",
    fn: (v) => v.m * v.a,
  },

  // 10. mathematics-statistics — Standard Deviation
  {
    id: "ms_std_dev", level: "university",
    cat: { th: "สถิติ", en: "Statistics", jp: "統計学", ch: "统计学", ko: "통계학" },
    subject: "statistics_math", icon: "fa-superscript",
    title: { th: "ส่วนเบี่ยงเบนมาตรฐาน", en: "Standard Deviation", jp: "標準偏差", ch: "标准差", ko: "표준편차" },
    fStr: "σ = √(Σ(x-μ)² / N)",
    vars: [
      { id: "sumSq", label: { th: "Σ(x-μ)²", en: "Sum of Squares Σ(x-μ)²", jp: "偏差平方和 Σ(x-μ)²", ch: "离差平方和 Σ(x-μ)²", ko: "편차 제곱합 Σ(x-μ)²" } },
      { id: "N", label: { th: "จำนวนข้อมูล (N)", en: "Count (N)", jp: "データ数 (N)", ch: "数据数量 (N)", ko: "데이터 수 (N)" } },
    ],
    unit: "",
    chk: ["N"],
    fn: (v) => Math.sqrt(v.sumSq / v.N),
  },

  // 11. chemistry — Molarity
  {
    id: "ch_molarity", level: "university",
    cat: { th: "สารละลาย", en: "Solutions", jp: "溶液", ch: "溶液", ko: "용액" },
    subject: "solutions_chem", icon: "fa-vial",
    title: { th: "ความเข้มข้นโมลาร์", en: "Molarity", jp: "モル濃度", ch: "摩尔浓度", ko: "몰농도" },
    fStr: "M = mol / L",
    vars: [
      { id: "mol", label: { th: "จำนวนโมล (mol)", en: "Moles (mol)", jp: "モル (mol)", ch: "摩尔 (mol)", ko: "몰 (mol)" }, u: "mol" },
      { id: "L", label: { th: "ปริมาตร (L)", en: "Volume (L)", jp: "体積 (L)", ch: "体积 (L)", ko: "부피 (L)" }, u: "L" },
    ],
    unit: "mol/L",
    chk: ["L"],
    fn: (v) => v.mol / v.L,
  },

  // 12. biology-genetics — Population Growth
  {
    id: "bg_pop_growth", level: "university",
    cat: { th: "นิเวศวิทยา", en: "Ecology", jp: "生態学", ch: "生态学", ko: "생태학" },
    subject: "ecology", icon: "fa-dna",
    title: { th: "การเติบโตของประชากร", en: "Population Growth", jp: "個体群成長", ch: "种群增长", ko: "개체군 성장" },
    fStr: "N(t) = N₀e^(rt)",
    vars: [
      { id: "N0", label: { th: "ประชากรเริ่มต้น (N₀)", en: "Initial Pop. (N₀)", jp: "初期個体数 (N₀)", ch: "初始种群 (N₀)", ko: "초기 개체수 (N₀)" } },
      { id: "r", label: { th: "อัตราการเติบโต (r)", en: "Growth Rate (r)", jp: "増加率 (r)", ch: "增长率 (r)", ko: "성장률 (r)" } },
      { id: "t", label: { th: "เวลา (t)", en: "Time (t)", jp: "時間 (t)", ch: "时间 (t)", ko: "시간 (t)" } },
    ],
    unit: "",
    fn: (v) => v.N0 * Math.exp(v.r * v.t),
  },

  // 13. business-administration — ROI
  {
    id: "ba_roi", level: "university",
    cat: { th: "การเงิน", en: "Finance", jp: "財務", ch: "财务", ko: "재무" },
    subject: "finance_ba", icon: "fa-briefcase",
    title: { th: "ผลตอบแทนการลงทุน", en: "Return on Investment", jp: "投資利益率", ch: "投资回报率", ko: "투자수익률" },
    fStr: "ROI = (Gain - Cost) / Cost × 100",
    vars: [
      { id: "gain", label: { th: "รายได้ (Gain)", en: "Gain", jp: "利益 (Gain)", ch: "收益 (Gain)", ko: "이익 (Gain)" } },
      { id: "cost", label: { th: "ต้นทุน (Cost)", en: "Cost", jp: "費用 (Cost)", ch: "成本 (Cost)", ko: "비용 (Cost)" } },
    ],
    unit: "%",
    chk: ["cost"],
    fn: (v) => ((v.gain - v.cost) / v.cost) * 100,
  },

  // 14. economics — GDP
  {
    id: "ec_gdp", level: "university",
    cat: { th: "เศรษฐศาสตร์มหภาค", en: "Macroeconomics", jp: "マクロ経済学", ch: "宏观经济学", ko: "거시경제학" },
    subject: "macroeconomics", icon: "fa-chart-line",
    title: { th: "ผลิตภัณฑ์มวลรวมในประเทศ", en: "Gross Domestic Product", jp: "国内総生産", ch: "国内生产总值", ko: "국내총생산" },
    fStr: "GDP = C + I + G + (X - M)",
    vars: [
      { id: "C", label: { th: "การบริโภค (C)", en: "Consumption (C)", jp: "消費 (C)", ch: "消费 (C)", ko: "소비 (C)" } },
      { id: "I", label: { th: "การลงทุน (I)", en: "Investment (I)", jp: "投資 (I)", ch: "投资 (I)", ko: "투자 (I)" } },
      { id: "G", label: { th: "การใช้จ่ายรัฐบาล (G)", en: "Gov. Spending (G)", jp: "政府支出 (G)", ch: "政府支出 (G)", ko: "정부 지출 (G)" } },
      { id: "X", label: { th: "การส่งออก (X)", en: "Exports (X)", jp: "輸出 (X)", ch: "出口 (X)", ko: "수출 (X)" } },
      { id: "M", label: { th: "การนำเข้า (M)", en: "Imports (M)", jp: "輸入 (M)", ch: "进口 (M)", ko: "수입 (M)" } },
    ],
    unit: "",
    fn: (v) => v.C + v.I + v.G + (v.X - v.M),
  },

  // 15. accounting — Current Ratio
  {
    id: "ac_current_ratio", level: "university",
    cat: { th: "อัตราส่วนทางการเงิน", en: "Financial Ratios", jp: "財務比率", ch: "财务比率", ko: "재무비율" },
    subject: "financial_ratios", icon: "fa-calculator",
    title: { th: "อัตราส่วนเงินทุนหมุนเวียน", en: "Current Ratio", jp: "流動比率", ch: "流动比率", ko: "유동비율" },
    fStr: "CR = Current Assets / Current Liabilities",
    vars: [
      { id: "ca", label: { th: "สินทรัพย์หมุนเวียน", en: "Current Assets", jp: "流動資産", ch: "流动资产", ko: "유동자산" } },
      { id: "cl", label: { th: "หนี้สินหมุนเวียน", en: "Current Liabilities", jp: "流動負債", ch: "流动负债", ko: "유동부채" } },
    ],
    unit: "",
    chk: ["cl"],
    fn: (v) => v.ca / v.cl,
  },

  // 16. finance-investment — Net Present Value
  {
    id: "fi_npv", level: "university",
    cat: { th: "การลงทุน", en: "Investment", jp: "投資", ch: "投资", ko: "투자" },
    subject: "investment_fi", icon: "fa-dollar-sign",
    title: { th: "มูลค่าปัจจุบันสุทธิ", en: "Net Present Value", jp: "正味現在価値", ch: "净现值", ko: "순현재가치" },
    fStr: "NPV = Σ[Ct / (1+r)^t] - C₀",
    vars: [
      { id: "Ct", label: { th: "กระแสเงินสด (Ct)", en: "Cash Flow (Ct)", jp: "キャッシュフロー (Ct)", ch: "现金流 (Ct)", ko: "현금흐름 (Ct)" } },
      { id: "r", label: { th: "อัตราคิดลด (r%)", en: "Discount Rate (r%)", jp: "割引率 (r%)", ch: "折现率 (r%)", ko: "할인율 (r%)" }, u: "%" },
      { id: "t", label: { th: "ระยะเวลา (t) ปี", en: "Period (t) yrs", jp: "期間 (t) 年", ch: "期限 (t) 年", ko: "기간 (t) 년" } },
      { id: "C0", label: { th: "เงินลงทุนเริ่มต้น (C₀)", en: "Initial Investment (C₀)", jp: "初期投資 (C₀)", ch: "初始投资 (C₀)", ko: "초기 투자 (C₀)" } },
    ],
    unit: "",
    fn: (v) => v.Ct / Math.pow(1 + v.r / 100, v.t) - v.C0,
  },

  // 17. political-science — Gini Coefficient
  {
    id: "ps_gini", level: "university",
    cat: { th: "นโยบายสาธารณะ", en: "Public Policy", jp: "公共政策", ch: "公共政策", ko: "공공정책" },
    subject: "public_policy", icon: "fa-scale-balanced",
    title: { th: "สัมประสิทธิ์จีนี", en: "Gini Coefficient", jp: "ジニ係数", ch: "基尼系数", ko: "지니 계수" },
    fStr: "G = A / (A + B)",
    vars: [
      { id: "A", label: { th: "พื้นที่ A", en: "Area A", jp: "面積 A", ch: "面积 A", ko: "면적 A" } },
      { id: "B", label: { th: "พื้นที่ B", en: "Area B", jp: "面積 B", ch: "面积 B", ko: "면적 B" } },
    ],
    unit: "",
    chk: ["A", "B"],
    fn: (v) => v.A / (v.A + v.B),
  },

  // 18. psychology — Z-score
  {
    id: "py_zscore", level: "university",
    cat: { th: "สถิติ", en: "Statistics", jp: "統計学", ch: "统计学", ko: "통계학" },
    subject: "statistics_psych", icon: "fa-brain",
    title: { th: "คะแนนมาตรฐาน Z", en: "Z-Score", jp: "Zスコア", ch: "Z分数", ko: "Z점수" },
    fStr: "z = (x - μ) / σ",
    vars: [
      { id: "x", label: { th: "ค่าสังเกต (x)", en: "Value (x)", jp: "観測値 (x)", ch: "观测值 (x)", ko: "관측값 (x)" } },
      { id: "mu", label: { th: "ค่าเฉลี่ย (μ)", en: "Mean (μ)", jp: "平均 (μ)", ch: "均值 (μ)", ko: "평균 (μ)" } },
      { id: "sigma", label: { th: "ส่วนเบี่ยงเบน (σ)", en: "Std Dev (σ)", jp: "標準偏差 (σ)", ch: "标准差 (σ)", ko: "표준편차 (σ)" } },
    ],
    unit: "",
    chk: ["sigma"],
    fn: (v) => (v.x - v.mu) / v.sigma,
  },

  // 19. education — Grade Point Average
  {
    id: "ed_gpa", level: "university",
    cat: { th: "การประเมินผล", en: "Assessment", jp: "評価", ch: "评估", ko: "평가" },
    subject: "assessment", icon: "fa-graduation-cap",
    title: { th: "เกรดเฉลี่ย", en: "Grade Point Average", jp: "成績平均点", ch: "平均绩点", ko: "평균 학점" },
    fStr: "GPA = Σ(grade × credit) / Σcredit",
    vars: [
      { id: "totalGP", label: { th: "Σ(เกรด × หน่วยกิต)", en: "Σ(Grade × Credits)", jp: "Σ(成績×単位)", ch: "Σ(成绩×学分)", ko: "Σ(성적×학점)" } },
      { id: "totalCredits", label: { th: "Σหน่วยกิต", en: "ΣCredits", jp: "Σ単位", ch: "Σ学分", ko: "Σ학점" } },
    ],
    unit: "",
    chk: ["totalCredits"],
    fn: (v) => v.totalGP / v.totalCredits,
  },

  // 20. architecture — Golden Ratio
  {
    id: "ar_golden_ratio", level: "university",
    cat: { th: "การออกแบบ", en: "Design", jp: "デザイン", ch: "设计", ko: "디자인" },
    subject: "design_arch", icon: "fa-ruler-combined",
    title: { th: "อัตราส่วนทองคำ", en: "Golden Ratio", jp: "黄金比", ch: "黄金比例", ko: "황금비" },
    fStr: "φ = (1 + √5) / 2",
    vars: [],
    unit: "",
    fn: () => (1 + Math.sqrt(5)) / 2,
  },

  // 21. data-science-ai — Sigmoid Function
  {
    id: "ds_sigmoid", level: "university",
    cat: { th: "การเรียนรู้ของเครื่อง", en: "Machine Learning", jp: "機械学習", ch: "机器学习", ko: "머신러닝" },
    subject: "machine_learning", icon: "fa-robot",
    title: { th: "ฟังก์ชันซิกมอยด์", en: "Sigmoid Function", jp: "シグモイド関数", ch: "Sigmoid 函数", ko: "시그모이드 함수" },
    fStr: "σ(x) = 1 / (1 + e^(-x))",
    vars: [
      { id: "x", label: { th: "ค่า x", en: "Value x", jp: "値 x", ch: "值 x", ko: "값 x" } },
    ],
    unit: "",
    fn: (v) => 1 / (1 + Math.exp(-v.x)),
  },

  // 22. medicine-pharmacy — Dosage Calculation
  {
    id: "mp_dosage", level: "university",
    cat: { th: "เภสัชวิทยา", en: "Pharmacology", jp: "薬理学", ch: "药理学", ko: "약리학" },
    subject: "pharmacology", icon: "fa-stethoscope",
    title: { th: "การคำนวณขนาดยา", en: "Dosage Calculation", jp: "投薬量計算", ch: "剂量计算", ko: "투여량 계산" },
    fStr: "Dose = mg/kg × weight",
    vars: [
      { id: "mg_per_kg", label: { th: "ขนาดยา (mg/kg)", en: "Dosage (mg/kg)", jp: "投与量 (mg/kg)", ch: "剂量 (mg/kg)", ko: "용량 (mg/kg)" }, u: "mg/kg" },
      { id: "weight", label: { th: "น้ำหนัก (kg)", en: "Weight (kg)", jp: "体重 (kg)", ch: "体重 (kg)", ko: "체중 (kg)" }, u: "kg" },
    ],
    unit: "mg",
    fn: (v) => v.mg_per_kg * v.weight,
  },
];

// ─── Utility Functions ────────────────────────────────────────

export function getFormulasByLevel(level: string): FormulaDef[] {
  return formulas.filter((f) => f.level === level);
}

export function getFormulasByCategory(label: string): FormulaDef[] {
  return formulas.filter((f) => f.cat.en === label || f.cat.th === label);
}

export function getFormulaById(id: string): FormulaDef | undefined {
  return formulas.find((f) => f.id === id);
}

/**
 * Count how many formulas belong to a department based on its subjects list.
 * A formula belongs to a department when formula.subject is in dept.subjects.
 */
export function getFormulaCountByDepartment(subjects: string[]): number {
  if (!subjects || subjects.length === 0) return 0;
  const set = new Set(subjects);
  return formulas.filter((f) => set.has(f.subject)).length;
}

/** Group all formulas by category, preserving the first-seen ordering */
export function getGroupedFormulas(): FormulaGroup[] {
  const map = new Map<string, FormulaDef[]>();
  for (const f of formulas) {
    const key = f.cat.en;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(f);
  }
  return Array.from(map.entries()).map(([category, list]) => ({
    category,
    label: list[0].cat,
    formulas: list,
  }));
}
