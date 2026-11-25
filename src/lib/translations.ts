import type { Translation } from "@/types/locale";

export type UiTranslationKey =
  | "searchPlace"
  | "allLevels"
  | "explore"
  | "eduLevel"
  | "calculate"
  | "history"
  | "noHistory"
  | "premiumLabel"
  | "purchase"
  | "info"
  | "sciNote"
  | "autoConvert"
  | "showFormula"
  | "hideFormula"
  | "reset"
  | "clearAll"
  | "clearConfirm"
  | "confirmDialog"
  | "cancelDialog"
  | "close"
  | "appName"
  | "appDesc"
  | "ready"
  | "launching"
  | "syncing"
  | "invalidInput"
  | "divByZero"
  | "calcError"
  | "levelsLabel"
  | "departmentsLabel"
  | "infoLabel"
  | "settingsLabel"
  | "guideTitle"
  | "guideStep1Title"
  | "guideStep1Desc"
  | "guideStep2Title"
  | "guideStep2Desc"
  | "guideStep3Title"
  | "guideStep3Desc"
  | "guideStep4Title"
  | "guideStep4Desc"
  | "guideStep5Title"
  | "guideStep5Desc"
  | "guideStep6Title"
  | "guideStep6Desc"
  | "guideStep7Title"
  | "guideStep7Desc"
  | "guideTipTitle"
  | "guideTip1"
  | "guideTip2"
  | "guideTip3"
  | "guideGotIt"
  | "initializing"
  | "loading"
  | "loadingModules"
  | "signUpTitle"
  | "signUpSubtitle"
  | "signUpNameLabel"
  | "signUpNamePlaceholder"
  | "signUpEmailLabel"
  | "signUpEmailPlaceholder"
  | "signUpPasswordLabel"
  | "signUpPasswordPlaceholder"
  | "signUpBtn"
  | "signUpBtnLoading"
  | "signUpGoogle"
  | "signUpSuccessTitle"
  | "signUpSuccessDesc"
  | "signUpConfirmPasswordLabel"
  | "signUpConfirmPasswordPlaceholder"
  | "signUpPasswordMismatch"
  | "signUpHasAccount"
  | "signUpSignIn"
  | "verifyTitle"
  | "verifyLoading"
  | "verifySuccessTitle"
  | "verifySuccessDesc"
  | "verifyFailedTitle"
  | "verifyFailedDesc"
  | "verifyGoHome"
  | "verifyGoSignUp"
  | "verifyNoToken"
  | "loginTitle"
  | "loginDisplayPrompt"
  | "loginEmailLabel"
  | "loginPasswordLabel"
  | "loginSubmit"
  | "loginLoading"
  | "loginGoogle"
  | "loginNoAccount"
  | "loginSignUp"
  | "loginErrorRequired"
  | "loginErrorFailed"
  | "loginForgotPassword"
  | "forgotPasswordTitle"
  | "forgotPasswordDesc"
  | "forgotPasswordSend"
  | "forgotPasswordSent"
  | "forgotPasswordBack"
  | "resetPasswordInvalid"
  | "resetPasswordSubtitle"
  | "signUpPasswordError"
  | "resetPasswordSuccess"
  | "resetPasswordSuccessDesc"
  | "resetPasswordResetting"
  | "resetPasswordSubmit"
  | "notFoundCalc"
  | "notFoundDomain"
  | "notFoundDesc"
  | "notFoundCTA"
;

export const uiTranslations = {
  searchPlace: {
    th: 'ค้นหาสูตร หรือ หมวดหมู่...',
    en: 'Search formulas or categories...',
    jp: '数式やカテゴリを検索...',
    ch: '搜索公式或类别...',
    ko: '공식 또는 카테고리 검색...'
  },
  allLevels: {
    th: 'ทุกระดับ',
    en: 'All Levels',
    jp: 'すべてのレベル',
    ch: '所有级别',
    ko: '모든 레벨'
  },
  explore: {
    th: 'ออกสำรวจ',
    en: 'EXPLORE',
    jp: '探索',
    ch: '探索',
    ko: '탐색'
  },
  eduLevel: {
    th: 'ระดับการศึกษา',
    en: 'EDUCATION LEVEL',
    jp: '教育レベル',
    ch: '教育阶段',
    ko: '교육 수준'
  },
  calculate: {
    th: 'คำนวณ',
    en: 'Calculate',
    jp: '計算する',
    ch: '计算',
    ko: '계산하기'
  },
  history: {
    th: 'ประวัติ',
    en: 'HISTORY',
    jp: '履歴',
    ch: '历史',
    ko: '기록'
  },
  noHistory: {
    th: 'ไม่พบประวัติ',
    en: 'No History Found',
    jp: '履歴が見つかりません',
    ch: '未找到历史记录',
    ko: '기록이 없습니다'
  },
  premiumLabel: {
    th: 'พรีเมียม',
    en: 'Premium',
    jp: 'プレミアム',
    ch: '高级版',
    ko: '프리미엄'
  },
  purchase: {
    th: 'ซื้อสูตร',
    en: 'Purchase',
    jp: '購入',
    ch: '购买公式',
    ko: '구매'
  },
  info: {
    th: 'ข้อมูลและแนะนำ',
    en: 'INFO & GUIDE',
    jp: '情報とガイド',
    ch: '信息与指南',
    ko: '정보 및 가이드'
  },
  sciNote: {
    th: 'รองรับการกรอกตัวเลขแบบวิทยาศาสตร์:',
    en: 'Supports scientific notation:',
    jp: '科学的表記法をサポート:',
    ch: '支持科学计数法:',
    ko: '과학적 표기법 지원:'
  },
  autoConvert: {
    th: 'ระบบจะแปลงและคำนวณให้อัตโนมัติ',
    en: 'System will convert and calculate automatically',
    jp: 'システムが自動的に変換して計算합니다',
    ch: '系统将自动转换并计算',
    ko: '시스템이 자동으로 변환하여 계산합니다'
  },
  showFormula: {
    th: 'แสดงสูตร',
    en: 'SHOW FORMULAS',
    jp: '数式を表示',
    ch: '显示公式',
    ko: '공식 보기'
  },
  hideFormula: {
    th: 'ซ่อนสูตร',
    en: 'HIDE FORMULAS',
    jp: '数式を隠す',
    ch: '隐藏公式',
    ko: '공식 숨기기'
  },
  reset: {
    th: 'รีเซ็ต',
    en: 'RESET',
    jp: 'リセット',
    ch: '重置',
    ko: '초기화'
  },
  clearAll: {
    th: 'ล้างทั้งหมด',
    en: 'CLEAR ALL',
    jp: 'すべてクリア',
    ch: '全部清除',
    ko: '모두 지우기'
  },
  clearConfirm: {
    th: 'คุณแน่ใจหรือไม่ว่าต้องการล้างประวัติทั้งหมด?',
    en: 'Are you sure you want to clear all history?',
    jp: '履歴をすべて消去してもよろしいですか？',
    ch: '您确定要清除所有历史记录吗？',
    ko: '모든 기록을 삭제하시겠습니까?'
  },
  confirmDialog: {
    th: 'ยืนยัน',
    en: 'CONFIRM',
    jp: '確認',
    ch: '确认',
    ko: '확인'
  },
  cancelDialog: {
    th: 'ยกเลิก',
    en: 'CANCEL',
    jp: 'キャンセル',
    ch: '取消',
    ko: '취소'
  },
  close: {
    th: 'ปิด',
    en: 'CLOSE',
    jp: '閉じる',
    ch: '关闭',
    ko: '닫기'
  },
  appName: {
    th: 'เครื่องคิดเลข',
    en: 'Math Calculator',
    jp: '数学電卓',
    ch: '数学计算器',
    ko: '수학 계산기'
  },
  appDesc: {
    th: 'เร่งความเร็วการทำงานทางคณิตศาสตร์ของคุณด้วยชุดเครื่องคิดเลขพรีเมียมที่รองรับทุกระดับการศึกษา',
    en: 'Accelerate your math workflows with our premium suite of localized calculators for all education levels.',
    jp: 'すべての教育レベルに対応したプレミアムなローカライズ電卓スイートで、数学のワークフローを加速させます。',
    ch: '使用我们适用于所有教育阶段的优质本地化计算器套件，加速您的数学工作流程。',
    ko: '모든 교육 수준을 위한 프리미엄 현지화 계산기 제품군으로 수학 워크플로우를 가속화하세요.'
  },
  ready: {
    th: 'ระบบพร้อมใช้งาน',
    en: 'Ready to Calculate',
    jp: '計算の準備ができました',
    ch: '准备计算',
    ko: '계산 준비 완료'
  },
  launching: {
    th: 'กำลังเปิดหน้าแดชบอร์ด...',
    en: 'Launching Dashboard...',
    jp: 'ダッシュボードを起動中...',
    ch: '正在启动仪表板...',
    ko: '대시보드 실행 중...'
  },
  syncing: {
    th: 'กำลังซิงค์สูตรคณิตศาสตร์...',
    en: 'Syncing Math Modules...',
    jp: '数学モジュールを同期中...',
    ch: '正在同步数学模块...',
    ko: '수학 모듈 동기화 중...'
  },
  invalidInput: {
    th: 'ข้อมูลผิดพลาด',
    en: 'Invalid input',
    jp: '不正な入力',
    ch: '输入无效',
    ko: '입력값이 올바르지 않습니다'
  },
  divByZero: {
    th: 'หารด้วยศูนย์ไม่ได้',
    en: 'Div by 0',
    jp: '0で割ることはできません',
    ch: '除数不能为零',
    ko: '0으로 나눌 수 없습니다'
  },
  calcError: {
    th: 'คำนวณผิดพลาด',
    en: 'Calc error',
    jp: '計算エラー',
    ch: '计算错误',
    ko: '계산 오류'
  },
  levelsLabel: {
    th: 'ระดับชั้น',
    en: 'LEVELS',
    jp: 'レベル',
    ch: '等级',
    ko: '레벱'
  },
  departmentsLabel: {
    th: 'สาขาวิชา',
    en: 'DEPARTMENTS',
    jp: '学科',
    ch: '院系',
    ko: '학과'
  },
  infoLabel: {
    th: 'ข้อมูล',
    en: 'INFO',
    jp: '情報',
    ch: '信息',
    ko: '정보'
  },
  settingsLabel: {
    th: 'การตั้งค่า',
    en: 'Settings',
    jp: '設定',
    ch: '设置',
    ko: '설정'
  },
  // Info modal guide
  guideTitle: {
    th: 'วิธีใช้งาน',
    en: 'How to Use',
    jp: '使い方',
    ch: '使用方法',
    ko: '사용 방법'
  },
  guideStep1Title: {
    th: '1. เลือกระดับการศึกษา',
    en: '1. Choose Education Level',
    jp: '1. 教育レベルを選択',
    ch: '1. 选择教育阶段',
    ko: '1. 교육 수준 선택'
  },
  guideStep1Desc: {
    th: 'กดปุ่มระดับชั้น (ประถม, มัธยมต้น, มัธยมปลาย, มหาวิทยาลัย) ที่แถบด้านบนเพื่อกรองสูตรตามระดับ หรือเลือก "ทุกระดับ" เพื่อดูสูตรทั้งหมด',
    en: 'Tap a level button (Elementary, Middle, High, University) in the top bar to filter formulas, or pick "All Levels" to see everything.',
    jp: 'トップバーのレベルボタンをタップして数式を絞り込むか、「すべてのレベル」で全件表示します。',
    ch: '点击顶部栏中的级别按钮筛选公式，或选择"所有级别"查看全部。',
    ko: '상단 바에서 레벨 버튼을 눌러 공식을 필터링하거나 "모든 레벨"을 선택하세요.'
  },
  guideStep2Title: {
    th: '2. เลือกสูตรคำนวณ',
    en: '2. Pick a Formula',
    jp: '2. 数式を選ぶ',
    ch: '2. 选择公式',
    ko: '2. 공식 선택'
  },
  guideStep2Desc: {
    th: 'กดที่การ์ดสูตรที่ต้องการ จะเปิดหน้าต่างคำนวณพร้อมช่องกรอกตัวแปร สูตรจะแสดงอยู่ด้านบน',
    en: 'Tap a formula card to open the calculator panel with input fields. The formula is displayed at the top.',
    jp: '数式カードをタップすると入力フィールド付きの計算パネルが開きます。数式は上部に表示されます。',
    ch: '点击公式卡片打开计算器面板，公式显示在顶部。',
    ko: '공식 카드를 탭하면 입력 필드가 있는 계산기 패널이 열립니다.'
  },
  guideStep3Title: {
    th: '3. กรอกค่าและคำนวณ',
    en: '3. Enter Values & Calculate',
    jp: '3. 値を入力して計算',
    ch: '3. 输入数值并计算',
    ko: '3. 값 입력 및 계산'
  },
  guideStep3Desc: {
    th: 'กรอกตัวเลขในช่องตัวแปรแต่ละช่อง แล้วกดปุ่ม "คำนวณ" ผลลัพธ์จะแสดงทันที รองรับสูตรวิทยาศาสตร์ เช่น 2e5, 10^6',
    en: 'Enter numbers in each variable field, then hit "Calculate". Results appear instantly. Supports scientific notation like 2e5, 10^6.',
    jp: '各変数フィールドに数値を入力し、「計算」を押します。結果は即座に表示されます。2e5, 10^6 などの科学的表記に対応。',
    ch: '在各变量字段中输入数字，然后点击"计算"。即时显示结果。支持科学计数法如 2e5, 10^6。',
    ko: '각 변수 필드에 숫자를 입력한 후 "계산"을 누르세요. 결과가 즉시 표시됩니다.'
  },
  guideStep4Title: {
    th: '4. ดูประวัติการคำนวณ',
    en: '4. Check Calculation History',
    jp: '4. 計算履歴を確認',
    ch: '4. 查看计算历史',
    ko: '4. 계산 기록 확인'
  },
  guideStep4Desc: {
    th: 'การคำนวณทุกครั้งจะถูกบันทึกไว้ในแถบประวัติ (ไอคอน 📜) สูงสุด 30 รายการ กดที่รายการเพื่อกลับไปแก้ไขได้',
    en: 'Every calculation is saved in the history sidebar (📜 icon), up to 30 entries. Tap an entry to revisit and edit.',
    jp: 'すべての計算は履歴サイドバー（📜アイコン）に最大30件保存されます。項目をタップして再編集できます。',
    ch: '每次计算都会保存在历史侧边栏（📜图标）中，最多30条。点击条目可返回修改。',
    ko: '모든 계산은 기록 사이드바(📜 아이콘)에 최대 30개 저장됩니다. 항목을 탭하여 다시 편집할 수 있습니다.'
  },
  guideStep5Title: {
    th: '5. ค้นหาสูตร',
    en: '5. Search Formulas',
    jp: '5. 数式を検索',
    ch: '5. 搜索公式',
    ko: '5. 공식 검색'
  },
  guideStep5Desc: {
    th: 'พิมพ์คำค้นในช่อง Search เพื่อหาสูตรจากชื่อ หมวดหมู่ หรือสูตรคณิตศาสตร์ รองรับทุกภาษา',
    en: 'Type in the Search bar to find formulas by name, category, or math expression. Works across all languages.',
    jp: '検索バーにキーワードを入力して、名前・カテゴリ・数式で検索できます。全言語対応。',
    ch: '在搜索栏中输入关键词，按名称、类别或数学表达式搜索公式。支持所有语言。',
    ko: '검색 바에 키워드를 입력하여 이름, 카테고리 또는 수학 표현식으로 공식을 찾으세요.'
  },
  guideStep6Title: {
    th: '6. เปลี่ยนภาษา',
    en: '6. Switch Language',
    jp: '6. 言語を切り替え',
    ch: '6. 切换语言',
    ko: '6. 언어 전환'
  },
  guideStep6Desc: {
    th: 'กดปุ่ม Globe (🌐) ที่มุมขวาบนเพื่อเลือกภาษา: ไทย, English, 日本語, 中文, 한국어',
    en: 'Tap the Globe button (🌐) in the top-right corner to switch language: ไทย, English, 日本語, 中文, 한국어.',
    jp: '右上の地球ボタン（🌐）をタップして言語を切り替えます。',
    ch: '点击右上角的地球按钮（🌐）切换语言。',
    ko: '오른쪽 상단의 지구 버튼(🌐)을 눌러 언어를 전환하세요.'
  },
  guideStep7Title: {
    th: '7. เลือกสาขาวิชา (มหาวิทยาลัย)',
    en: '7. Pick a Department (University)',
    jp: '7. 学科を選択（大学）',
    ch: '7. 选择院系（大学）',
    ko: '7. 학과 선택 (대학교)'
  },
  guideStep7Desc: {
    th: 'เมื่ออยู่ในระดับมหาวิทยาลัย จะมีตัวเลือกสาขาวิชา เช่น ธุรกิจ, วิศวกรรมโยธา เพื่อกรองสูตรตามสาขา',
    en: 'At University level, department filters appear (e.g., Business, Civil Engineering) to narrow formulas by field.',
    jp: '大学レベルでは、学科フィルター（ビジネス、土木工学など）が表示され、分野別に数式を絞り込めます。',
    ch: '在大学级别，会出现院系筛选器（如商业、土木工程）以按领域过滤公式。',
    ko: '대학교 수준에서는 학과 필터(예: 비즈니스, 토목공학)가 나타나 분야별로 공식을 필터링합니다.'
  },
  guideTipTitle: {
    th: 'เคล็ดลับ',
    en: 'Pro Tips',
    jp: 'プロのコツ',
    ch: '专业技巧',
    ko: '프로 팁'
  },
  guideTip1: {
    th: 'ใช้สูตรวิทยาศาสตร์: พิมพ์ 2e5 แทน 200,000 หรือ 1.5e-3 แทน 0.0015',
    en: 'Use scientific notation: type 2e5 for 200,000 or 1.5e-3 for 0.0015.',
    jp: '科学的表記法を使いましょう: 200,000 は 2e5、0.0015 は 1.5e-3。',
    ch: '使用科学计数法：输入 2e5 代替 200,000，或 1.5e-3 代替 0.0015。',
    ko: '과학적 표기법을 사용하세요: 200,000은 2e5, 0.0015는 1.5e-3.'
  },
  guideTip2: {
    th: 'กด Enter ในช่องตัวแปรเพื่อคำนวณได้เลย ไม่ต้องกดปุ่ม',
    en: 'Press Enter in any input field to calculate instantly — no need to tap the button.',
    jp: '入力フィールドで Enter を押すと即座に計算できます。ボタンをタップする必要はありません。',
    ch: '在任意输入字段中按 Enter 即可立即计算，无需点击按钮。',
    ko: '입력 필드에서 Enter를 누르면 즉시 계산됩니다.'
  },
  guideTip3: {
    th: 'กดที่รายการประวัติเพื่อโหลดค่าเดิมกลับมาแก้ไขได้ทันที',
    en: 'Tap a history entry to reload the original values for quick editing.',
    jp: '履歴項目をタップすると、元の値が読み込まれてすぐに編集できます。',
    ch: '点击历史条目可重新加载原始值以便快速编辑。',
    ko: '기록 항목을 탭하면 원래 값이 다시 로드되어 빠르게 편집할 수 있습니다.'
  },
  guideGotIt: {
    th: 'เข้าใจแล้ว!',
    en: 'Got it!',
    jp: 'わかりました！',
    ch: '知道了！',
    ko: '알겠습니다!'
  },

  // ── NEW: LoadingScreen i18n keys ──
  initializing: {
    th: 'กำลังเริ่มต้น...',
    en: 'Initializing...',
    jp: '初期化中...',
    ch: '初始化中...',
    ko: '초기화 중...',
  },
  loading: {
    th: 'กำลังโหลด...',
    en: 'Loading...',
    jp: '読み込み中...',
    ch: '加载中...',
    ko: '로딩 중...',
  },
  loadingModules: {
    th: 'กำลังโหลดโมดูล...',
    en: 'Loading modules...',
    jp: 'モジュール読み込み中...',
    ch: '加载模块中...',
    ko: '모듈 로딩 중...',
  },

  // ── SIGN UP page ──
  signUpTitle: {
    th: 'สร้างบัญชี',
    en: 'Create Account',
    jp: 'アカウント作成',
    ch: '创建账户',
    ko: '계정 만들기',
  },
  signUpSubtitle: {
    th: 'เริ่มต้นใช้งานเครื่องคิดเลขคณิตศาสตร์พรีเมียม',
    en: 'Get started with Premium Math Calculator',
    jp: 'プレミアム数学計算機を始めましょう',
    ch: '开始使用高级数学计算器',
    ko: '프리미엄 수학 계산기 시작하기',
  },
  signUpNameLabel: {
    th: 'ชื่อ',
    en: 'Name',
    jp: '名前',
    ch: '姓名',
    ko: '이름',
  },
  signUpNamePlaceholder: {
    th: 'กรอกชื่อของคุณ',
    en: 'Enter your name',
    jp: 'お名前を入力',
    ch: '输入您的姓名',
    ko: '이름을 입력하세요',
  },
  signUpEmailLabel: {
    th: 'อีเมล',
    en: 'Email',
    jp: 'メールアドレス',
    ch: '电子邮件',
    ko: '이메일',
  },
  signUpEmailPlaceholder: {
    th: 'กรอกอีเมลของคุณ',
    en: 'Enter your email',
    jp: 'メールアドレスを入力',
    ch: '输入您的电子邮件',
    ko: '이메일을 입력하세요',
  },
  signUpPasswordLabel: {
    th: 'รหัสผ่าน',
    en: 'Password',
    jp: 'パスワード',
    ch: '密码',
    ko: '비밀번호',
  },
  signUpPasswordPlaceholder: {
    th: 'ตั้งรหัสผ่าน (อย่างน้อย 8 ตัว)',
    en: 'Create password (min 8 characters)',
    jp: 'パスワードを設定（8文字以上）',
    ch: '设置密码（至少8个字符）',
    ko: '비밀번호 설정 (최소 8자)',
  },
  signUpBtn: {
    th: 'สร้างบัญชี',
    en: 'Create Account',
    jp: 'アカウント作成',
    ch: '创建账户',
    ko: '계정 만들기',
  },
  signUpBtnLoading: {
    th: 'กำลังสร้างบัญชี...',
    en: 'Creating account...',
    jp: 'アカウント作成中...',
    ch: '正在创建账户...',
    ko: '계정 생성 중...',
  },
  signUpGoogle: {
    th: 'สมัครด้วย Google',
    en: 'Sign up with Google',
    jp: 'Googleで登録',
    ch: '使用 Google 注册',
    ko: 'Google로 가입하기',
  },
  signUpSuccessTitle: {
    th: 'ลงทะเบียนสำเร็จ!',
    en: 'Registration Successful!',
    jp: '登録完了！',
    ch: '注册成功！',
    ko: '등록 성공!',
  },
  signUpSuccessDesc: {
    th: 'กรุณาตรวจสอบอีเมลของคุณเพื่อยืนยันบัญชี',
    en: 'Please check your email to verify your account',
    jp: 'アカウント確認のためメールをご確認ください',
    ch: '请检查您的电子邮件以验证账户',
    ko: '계정 확인을 위해 이메일을 확인하세요',
  },
  signUpConfirmPasswordLabel: {
    th: 'ยืนยันรหัสผ่าน',
    en: 'Confirm Password',
    jp: 'パスワードを確認',
    ch: '确认密码',
    ko: '비밀번호 확인',
  },
  signUpConfirmPasswordPlaceholder: {
    th: 'กรอกรหัสผ่านอีกครั้ง',
    en: 'Re-enter your password',
    jp: 'パスワードを再入力',
    ch: '再次输入密码',
    ko: '비밀번호를 다시 입력하세요',
  },
  signUpPasswordMismatch: {
    th: 'รหัสผ่านไม่ตรงกัน',
    en: 'Passwords do not match',
    jp: 'パスワードが一致しません',
    ch: '密码不匹配',
    ko: '비밀번호가 일치하지 않습니다',
  },
  signUpHasAccount: {
    th: 'มีบัญชีอยู่แล้ว?',
    en: 'Already have an account?',
    jp: 'すでにアカウントをお持ちですか？',
    ch: '已有账户？',
    ko: '이미 계정이 있으신가요?',
  },
  signUpSignIn: {
    th: 'เข้าสู่ระบบ',
    en: 'Sign in',
    jp: 'ログイン',
    ch: '登录',
    ko: '로그인',
  },

  // ── VERIFY page ──
  verifyTitle: {
    th: 'ยืนยันอีเมล',
    en: 'Email Verification',
    jp: 'メール確認',
    ch: '电子邮件验证',
    ko: '이메일 인증',
  },
  verifyLoading: {
    th: 'กำลังยืนยันอีเมลของคุณ...',
    en: 'Verifying your email...',
    jp: 'メールを確認しています...',
    ch: '正在验证您的电子邮件...',
    ko: '이메일을 확인하는 중...',
  },
  verifySuccessTitle: {
    th: 'ยืนยันสำเร็จ!',
    en: 'Verified!',
    jp: '確認完了！',
    ch: '验证成功！',
    ko: '인증 완료!',
  },
  verifySuccessDesc: {
    th: 'อีเมลของคุณได้รับการยืนยันแล้ว กำลังนำคุณไปยังหน้าหลัก...',
    en: 'Your email has been verified. Redirecting you to home...',
    jp: 'メールが確認されました。ホームにリダイレクトします...',
    ch: '您的电子邮件已验证。正在重定向到主页...',
    ko: '이메일이 확인되었습니다. 홈으로 이동합니다...',
  },
  verifyFailedTitle: {
    th: 'การยืนยันล้มเหลว',
    en: 'Verification Failed',
    jp: '確認に失敗しました',
    ch: '验证失败',
    ko: '인증 실패',
  },
  verifyFailedDesc: {
    th: 'ลิงก์ยืนยันไม่ถูกต้องหรือหมดอายุ กรุณาลองใหม่อีกครั้ง',
    en: 'The verification link is invalid or expired. Please try again.',
    jp: '確認リンクが無効か期限切れです。もう一度お試しください。',
    ch: '验证链接无效或已过期。请重试。',
    ko: '인증 링크가 유효하지 않거나 만료되었습니다. 다시 시도하세요.',
  },
  verifyGoHome: {
    th: 'กลับหน้าหลัก',
    en: 'Go Home',
    jp: 'ホームに戻る',
    ch: '返回主页',
    ko: '홈으로 가기',
  },
  verifyGoSignUp: {
    th: 'กลับไปสมัคร',
    en: 'Back to Sign Up',
    jp: '登録に戻る',
    ch: '返回注册',
    ko: '가입으로 돌아가기',
  },
  verifyNoToken: {
    th: 'ไม่พบข้อมูลยืนยัน โปรดใช้ลิงก์จากอีเมลของคุณ',
    en: 'No verification data found. Please use the link from your email.',
    jp: '確認データが見つかりません。メールのリンクを使用してください。',
    ch: '未找到验证数据。请使用电子邮件中的链接。',
    ko: '인증 데이터를 찾을 수 없습니다. 이메일의 링크를 사용하세요.',
  },

  /* ── Login / Sign In ── */
  loginTitle: {
    th: 'เข้าสู่ระบบ',
    en: 'Sign In',
    jp: 'サインイン',
    ch: '登录',
    ko: '로그인',
  },
  loginDisplayPrompt: {
    th: 'ACCESS:',
    en: 'ACCESS:',
    jp: 'ACCESS:',
    ch: 'ACCESS:',
    ko: 'ACCESS:',
  },
  loginEmailLabel: {
    th: 'อีเมล',
    en: 'Email',
    jp: 'メールアドレス',
    ch: '电子邮箱',
    ko: '이메일',
  },
  loginPasswordLabel: {
    th: 'รหัสผ่าน',
    en: 'Password',
    jp: 'パスワード',
    ch: '密码',
    ko: '비밀번호',
  },
  loginSubmit: {
    th: 'เข้าสู่ระบบ',
    en: 'Sign In',
    jp: 'サインイン',
    ch: '登录',
    ko: '로그인',
  },
  loginLoading: {
    th: 'กำลังเข้าสู่ระบบ...',
    en: 'Signing in...',
    jp: 'サインイン中...',
    ch: '登录中...',
    ko: '로그인 중...',
  },
  loginGoogle: {
    th: 'ดำเนินการต่อด้วย Google',
    en: 'Continue with Google',
    jp: 'Google で続ける',
    ch: '使用 Google 继续',
    ko: 'Google로 계속하기',
  },
  loginNoAccount: {
    th: 'ยังไม่มีบัญชี?',
    en: "Don't have an account?",
    jp: 'アカウントをお持ちでないですか？',
    ch: '没有账号？',
    ko: '계정이 없으신가요?',
  },
  loginSignUp: {
    th: 'สมัครสมาชิก',
    en: 'Sign Up',
    jp: '登録',
    ch: '注册',
    ko: '가입하기',
  },
  loginErrorRequired: {
    th: 'กรุณากรอกอีเมลและรหัสผ่าน',
    en: 'Please enter your email and password',
    jp: 'メールアドレスとパスワードを入力してください',
    ch: '请输入您的电子邮箱和密码',
    ko: '이메일과 비밀번호를 입력하세요',
  },
  loginErrorFailed: {
    th: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
    en: 'Invalid email or password',
    jp: 'メールアドレスかパスワードが正しくありません',
    ch: '电子邮箱或密码无效',
    ko: '이메일 또는 비밀번호가 올바르지 않습니다',
  },
  loginForgotPassword: {
    th: 'ลืมรหัสผ่าน?',
    en: 'Forgot Password?',
    jp: 'パスワードをお忘れですか？',
    ch: '忘记密码？',
    ko: '비밀번호를 잊으셨나요?',
  },
  forgotPasswordTitle: {
    th: 'รีเซ็ตรหัสผ่าน',
    en: 'Reset Password',
    jp: 'パスワードリセット',
    ch: '重置密码',
    ko: '비밀번호 재설정',
  },
  forgotPasswordDesc: {
    th: 'กรอกอีเมลที่คุณใช้สมัครสมาชิก เราจะส่งลิงก์รีเซ็ตรหัสผ่านให้คุณ',
    en: 'Enter your registered email and we will send you a reset link',
    jp: '登録メールアドレスを入力してください。リセットリンクを送信します',
    ch: '输入您注册时使用的电子邮箱，我们将发送重置链接',
    ko: '가입 시 사용한 이메일을 입력하시면 재설정 링크를 보내드립니다',
  },
  forgotPasswordSend: {
    th: 'ส่งลิงก์รีเซ็ต',
    en: 'Send Reset Link',
    jp: 'リセットリンクを送信',
    ch: '发送重置链接',
    ko: '재설정 링크 보내기',
  },
  forgotPasswordSent: {
    th: 'ส่งลิงก์รีเซ็ตไปยังอีเมลของคุณแล้ว',
    en: 'Reset link sent to your email',
    jp: 'リセットリンクをメールに送信しました',
    ch: '重置链接已发送到您的邮箱',
    ko: '재설정 링크가 이메일로 전송되었습니다',
  },
  forgotPasswordBack: {
    th: 'กลับไปหน้าเข้าสู่ระบบ',
    en: 'Back to Sign In',
    jp: 'サインインに戻る',
    ch: '返回登录',
    ko: '로그인으로 돌아가기',
  },
    resetPasswordSubtitle: {
    th: "กรอกรหัสผ่านใหม่ของคุณ",
    en: "Enter your new password",
    jp: "新しいパスワードを入力してください",
    ch: "输入您的新密码",
    ko: "새 비밀번호를 입력하세요",
  },
  resetPasswordInvalid: {
    th: 'ลิงก์รีเซ็ตไม่ถูกต้อง',
    en: 'Invalid reset link',
    jp: 'リセットリンクが無効です',
    ch: '重置链接无效',
    ko: '재설정 링크가 잘못되었습니다',
  },
  signUpPasswordError: {
    th: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร',
    en: 'Password must be at least 8 characters',
    jp: 'パスワードは8文字以上である必要があります',
    ch: '密码至少需要 8 个字符',
    ko: '비밀번호는 8자 이상이어야 합니다',
  },
  resetPasswordSuccess: {
    th: 'รีเซ็ตรหัสผ่านสำเร็จ!',
    en: 'Password Reset!',
    jp: 'パスワードをリセットしました！',
    ch: '密码重置成功！',
    ko: '비밀번호가 재설정되었습니다!',
  },
  resetPasswordSuccessDesc: {
    th: 'รหัสผ่านของคุณถูกรีเซ็ตเรียบร้อยแล้ว',
    en: 'Your password has been reset successfully',
    jp: 'パスワードが正常にリセットされました',
    ch: '您的密码已成功重置',
    ko: '비밀번호가 성공적으로 재설정되었습니다',
  },
  resetPasswordResetting: {
    th: 'กำลังรีเซ็ต...',
    en: 'Resetting...',
    jp: 'リセット中...',
    ch: '重置中...',
    ko: '재설정 중...',
  },
  resetPasswordSubmit: {
    th: 'รีเซ็ตรหัสผ่าน',
    en: 'Reset Password',
    jp: 'パスワードをリセット',
    ch: '重置密码',
    ko: '비밀번호 재설정',
  },

  /* ── 404 / Not Found ── */
  notFoundCalc: {
    th: '400 + 4 =',
    en: '400 + 4 =',
    jp: '400 + 4 =',
    ch: '400 + 4 =',
    ko: '400 + 4 =',
  },
  notFoundDomain: {
    th: '∉ โดเมนของเรา',
    en: '∉ our domain',
    jp: '∉ 定義域外',
    ch: '∉ 定义域之外',
    ko: '∉ 도메인 외부',
  },
  notFoundDesc: {
    th: 'หน้าที่คุณกำลังมองหาไม่มีอยู่ หรือถูกย้ายไปแล้ว',
    en: "The page you're looking for doesn't exist or has been moved.",
    jp: 'お探しのページは存在しないか、移動されました。',
    ch: '您要查找的页面不存在或已被移动。',
    ko: '찾으시는 페이지가 존재하지 않거나 이동되었습니다.',
  },
  notFoundCTA: {
    th: 'กลับไปที่เครื่องคิดเลข',
    en: 'Back to Calculator',
    jp: '計算機に戻る',
    ch: '返回计算器',
    ko: '계산기로 돌아가기',
  },

} satisfies Record<UiTranslationKey, Translation>;
