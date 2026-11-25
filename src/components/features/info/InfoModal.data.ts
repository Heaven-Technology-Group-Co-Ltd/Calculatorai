import type { Lang } from "@/types/locale";
import type { LucideIcon } from "lucide-react";
import { MAX_HISTORY } from "@/hooks/useHistory";
import {
  GraduationCap,
  Calculator,
  Keyboard,
  Navigation,
  Grid3X3,
  Clock,
  Globe,
} from "lucide-react";
// ── Types ──────────────────────────────────────────────────

export type GuideDeviceCategory = "all" | "pc" | "mobile";

export interface GuideStep {
  id: string;
  device: GuideDeviceCategory;
  kbdHint?: string;
  icon: LucideIcon;
  title: Record<Lang, string>;
  desc: Record<Lang, string>;
}

export interface GuideTip {
  id: string;
  device: GuideDeviceCategory;
  text: Record<Lang, string>;
}

export interface InfoModalProps {
  show: boolean;
  onClose: () => void;
  lang: Lang;
}

// ── UI Translations for InfoModal ──────────────────────────

export const INFO_TRANSLATIONS: Record<string, Record<Lang, string>> = {
  guideSub: {
    th: "คู่มือใช้งานระบบบน PC และ Mobile",
    en: "Guide for PC & Mobile devices",
    jp: "PCおよびモバイル用ガイド",
    ch: "PC和移动设备指南",
    ko: "PC 및 모바일 기기 가이드",
  },
  guideTabAll: {
    th: "ทั้งหมด",
    en: "All Features",
    jp: "すべて",
    ch: "全部",
    ko: "전체",
  },
  guideTabPC: {
    th: "💻 PC / คอมพิวเตอร์",
    en: "💻 PC Desktop",
    jp: "💻 PC デスクトップ",
    ch: "💻 电脑 (PC)",
    ko: "💻 PC 데스크톱",
  },
  guideTabMobile: {
    th: "📱 Mobile / มือถือ",
    en: "📱 Mobile Touch",
    jp: "📱 モバイル タッチ",
    ch: "📱 手机 (Mobile)",
    ko: "📱 모바일 터치",
  },
  guideGotIt: {
    th: "เข้าใจแล้ว!",
    en: "Got it!",
    jp: "わかりました！",
    ch: "知道了！",
    ko: "알겠습니다!",
  },
};

// ── Data ───────────────────────────────────────────────────

export const GUIDE_STEPS: GuideStep[] = [
  {
    id: "step1",
    device: "all",
    icon: GraduationCap,
    title: {
      th: "1. เลือกช่วงชั้นและกรองสูตร",
      en: "1. Filter Education Levels",
      jp: "1. 教育レベルを絞り込む",
      ch: "1. 筛选教育阶段",
      ko: "1. 교육 수준 필터링",
    },
    desc: {
      th: "บน PC ใช้ Sidebar ซ้ายมือเพื่อเลือกชั้นเรียน (ประถม, มัธยม, มหาวิทยาลัย) บน Mobile ใช้แถบชิปแนวนอนใต้แถบค้นหา",
      en: "On PC, use the left Sidebar to select levels (Elementary to University). On Mobile, swipe the horizontal pill bar below Search.",
      jp: "PCでは左サイドバーでレベルを選択。モバイルでは検索バー下の横スクロールチップを使用します。",
      ch: "PC端使用左侧边栏选择级别，手机端在搜索栏下方横向滑动标签栏。",
      ko: "PC에서는 좌측 사이드바를, 모바일에서는 검색창 아래 가로 스크롤 칩을 사용하세요.",
    },
  },
  {
    id: "step2",
    device: "all",
    icon: Calculator,
    title: {
      th: "2. กรอกตัวแปร & คำนวณผลลัพธ์",
      en: "2. Enter Values & Calculate",
      jp: "2. 変数を入力して計算",
      ch: "2. 输入变量并计算",
      ko: "2. 변수 입력 및 계산",
    },
    desc: {
      th: "คลิกการ์ดสูตรเพื่อเปิดแผงคำนวณ กรอกตัวเลขในช่องตัวแปร แล้วกด 'คำนวณ' ผลลัพธ์จะแสดงทันทีแบบทศนิยมแม่นยำ",
      en: "Click any formula card to expand. Enter numbers into variable fields and hit 'Calculate' for instant results.",
      jp: "数式カードをクリックして展開。変数に数値を入力し『計算』を押すと即座に結果が表示されます。",
      ch: "点击公式卡片展开，在变量框中输入数字并点击'计算'即可获得即时结果。",
      ko: "공식 카드를 클릭하여 펼친 후 변수를 입력하고 '계산'을 누르면 즉시 결과가 나타납니다.",
    },
  },
  {
    id: "step3",
    device: "pc",
    icon: Keyboard,
    kbdHint: "⌘K / Enter / Esc",
    title: {
      th: "3. ทางลัดคีย์บอร์ด (PC)",
      en: "3. Keyboard Shortcuts (PC)",
      jp: "3. キーボードショートカット (PC)",
      ch: "3. 快捷键指南 (PC)",
      ko: "3. 키보드 단축키 (PC)",
    },
    desc: {
      th: "กด ⌘K หรือ / เพื่อโฟกัสช่องค้นหาทันที, กด Enter ในช่องกรอกค่าเพื่อคำนวณ และกด Esc เพื่อปิดป๊อปอัพ",
      en: "Press ⌘K or / to jump to Search, hit Enter in any input field to calculate immediately, and press Esc to close modals.",
      jp: "⌘K または / で検索バーへ移動、入力中に Enter で即計算、Esc でモーダルを閉じます。",
      ch: "按 ⌘K 或 / 快速聚焦搜索框，在输入框按 Enter 立即计算，按 Esc 关闭弹窗。",
      ko: "⌘K 또는 / 로 검색창 이동, 입력창에서 Enter로 즉시 계산, Esc로 팝업을 닫습니다.",
    },
  },
  {
    id: "step4",
    device: "mobile",
    icon: Navigation,
    title: {
      th: "4. แถบเมนูล่างสัมผัสง่าย (Mobile)",
      en: "4. Glassmorphic Bottom Nav (Mobile)",
      jp: "4. ボトムナビゲーション (Mobile)",
      ch: "4. 底部快捷导航栏 (Mobile)",
      ko: "4. 하단 터치 네비게이션 (Mobile)",
    },
    desc: {
      th: "บนมือถือ เข้าถึงหน้าแรก, เมนูระดับชั้น, ประวัติการคำนวณ และวิธีใช้งาน ได้ด้วยปุ่มเดียวที่แถบด้านล่างสุด",
      en: "On Mobile, switch between Home, Level Menu, History, and Guide with 1-tap using the bottom navigation bar.",
      jp: "モバイルでは画面 bottom のナビバーから ホーム、レベル、履歴、ガイドへ 1タップでアクセス。",
      ch: "手机端可通过屏幕底部的 Nav 栏单手一键切换首页、级别菜单、历史记录与指南。",
      ko: "모바일에서는 화면 하단 네비게이션 바를 통해 홈, 레벨, 기록, 가이드를 한 번에 이동합니다.",
    },
  },
  {
    id: "step5",
    device: "mobile",
    icon: Grid3X3,
    title: {
      th: "5. คีย์บอร์ดตัวเลขสมาร์ท (Mobile)",
      en: "5. Smart Numeric Keypad (Mobile)",
      jp: "5. 数字テンキー自動表示 (Mobile)",
      ch: "5. 智能数字键盘 (Mobile)",
      ko: "5. 스마트 숫자 키패드 (Mobile)",
    },
    desc: {
      th: "เมื่อแตะช่องกรอกตัวแปร คีย์บอร์ดตัวเลข (Numeric Keypad) จะเด้งขึ้นมาโดยอัตโนมัติ พิมพ์ตัวเลขได้สะดวกรวดเร็ว",
      en: "Tapping any input field automatically pops up the numeric keypad with decimal support for effortless mobile typing.",
      jp: "入力フィールドをタップするとテンキーが自動表示され、スマートフォンでも数値入力がスムーズ。",
      ch: "点击任意变量框会自动弹出带小数字符的数字键盘，便于手机端快速输入。",
      ko: "입력 필드를 터치하면 소수점 지원 숫자 키패드가 자동으로 열려 모바일 입력이 편리합니다.",
    },
  },
  {
    id: "step6",
    device: "all",
    icon: Clock,
    title: {
      th: "6. ดูประวัติ & โหลดค่ากลับมาใช้",
      en: "6. History Sidebar & Bottom Sheet",
      jp: "6. 計算履歴の再ロードと編集",
      ch: "6. 查看历史与重新加载",
      ko: "6. 기록 확인 및 재로드",
    },
    desc: {
      th: `การคำนวณจะบันทึกอัตโนมัติสูงสุด ${MAX_HISTORY} รายการ บน PC แสดงแถบข้างขวา บน Mobile แสดง Bottom Sheet แตะเพื่อดึงค่าเดิมกลับมาแก้ไข`,
      en: `Saves up to ${MAX_HISTORY} calculations automatically. Desktop shows right sidebar; Mobile opens a swipeable Bottom Sheet. Tap to reload.`,
      jp: `最大${MAX_HISTORY}件の計算を自動保存。PCは右サイドバー、モバイルはスワイプ対応ボトムシートで確認できます。`,
      ch: `自动保存最多${MAX_HISTORY}条记录。PC端显示右侧边栏，手机端弹出底部抽屉，点击可重载旧值。`,
      ko: `최대 ${MAX_HISTORY}개의 계산이 자동 저장됩니다. PC는 우측 사이드바, 모바일은 하단 시트로 제공됩니다.`,
    },
  },
  {
    id: "step7",
    device: "all",
    icon: Globe,
    title: {
      th: "7. ค้นหา & เปลี่ยนภาษาได้ตลอดเวลา",
      en: "7. Universal Search & i18n",
      jp: "7. 全文検索 & 多言語対応",
      ch: "7. 全局搜索与多语言切换",
      ko: "7. 통합 검색 및 다국어 지원",
    },
    desc: {
      th: "พิมพ์ค้นหาสูตรด้วยชื่อ หมวด หรือตัวแปร และกดปุ่ม Globe (🌐) เพื่อเปลี่ยนภาษาได้ 5 ภาษา (TH, EN, JP, CH, KO)",
      en: "Search formulas by title or math terms in real-time. Change languages instantly via the Globe icon (🌐) supporting 5 languages.",
      jp: "数式名やキーワードで検索可能。Globeアイコン(🌐)で 5つの言語(TH, EN, JP, CH, KO)を切り替え。",
      ch: "通过名称或公式表达式实时搜索，点击 Globe (🌐) 图标可在 5 种语言间随意切换。",
      ko: "제목이나 수식으로 실시간 검색하고 지구본 아이콘(🌐)으로 5개 국어를 자유롭게 전환하세요.",
    },
  },
];

export const GUIDE_TIPS: GuideTip[] = [
  {
    id: "tip1",
    device: "all",
    text: {
      th: "รองรับสัญลักษณ์วิทยาศาสตร์: พิมพ์ 2e5 แทน 200,000 หรือ 1.5e-3 แทน 0.0015",
      en: "Supports scientific notation: type 2e5 for 200,000 or 1.5e-3 for 0.0015.",
      jp: "科学的表記対応: 200,000 は 2e5、0.0015 は 1.5e-3 と入力できます。",
      ch: "支持科学计数法：输入 2e5 代替 200,000，1.5e-3 代替 0.0015。",
      ko: "과학적 표기법 지원: 200,000은 2e5, 0.0015는 1.5e-3으로 입력 가능합니다.",
    },
  },
  {
    id: "tip2",
    device: "pc",
    text: {
      th: "PC: กด Enter ในช่องกรอกเพื่อคำนวณได้ทันทีโดยไม่ต้องใช้เมาส์คลิกปุ่ม",
      en: "PC: Hit Enter in any input field to compute instantly without clicking the button.",
      jp: "PC: 入力中に Enter キーを押すと、ボタンをクリックせずに即座に計算します。",
      ch: "PC: 在输入框中按 Enter 即可快速计算，无需使用鼠标点击按钮。",
      ko: "PC: 입력창에서 Enter를 누르면 마우스 클릭 없이 즉시 계산됩니다.",
    },
  },
  {
    id: "tip3",
    device: "mobile",
    text: {
      th: "Mobile: ลากป๊อปอัพประวัติลงล่างเพื่อปิด และแตะรายการเพื่อนำสูตรมาคำนวณต่อ",
      en: "Mobile: Swipe down on the history bottom sheet to dismiss, and tap any entry to continue.",
      jp: "Mobile: 履歴ボトムシートを下にスワイプして閉じ、タップで数値を受け継ぎます。",
      ch: "Mobile: 向下滑动历史记录抽屉即可关闭，点击即可载入原公式继续计算。",
      ko: "Mobile: 기록 하단 시트를 아래로 스와이프하여 닫고, 터치하여 이전 계산을 이어갑니다.",
    },
  },
];
