import type { Translation } from "@/types/locale";
import type { LucideIcon } from "lucide-react";
import {
  TrendingUp,
  Building2,
  Cog,
  Zap,
  Code,
  FlaskConical,
  Factory,
  Plane,
  Leaf,
  Atom,
  Calculator,
  TestTube,
  Dna,
  Briefcase,
  LineChart,
  BookOpen,
  DollarSign,
  Scale,
  Brain,
  GraduationCap,
  Compass,
  Bot,
  Stethoscope,
} from "lucide-react";

export interface LevelSection {
  id: string;
  title: Translation;
  icon: LucideIcon;
  color: string;
}

export interface Department {
  id: string;
  label: Translation;
  icon: LucideIcon;
  subjects: string[];
  color: string;
  glowColor: string;
}

export const departments: Department[] = [
  {
    id: 'business',
    label: { th: 'ธุรกิจ', en: 'Business', jp: 'ビジネス', ch: '商业', ko: '비즈니스' },
    icon: TrendingUp,
    subjects: ['financial', 'business', 'investment', 'economics', 'accounting'],
    color: '#F97316',
    glowColor: 'rgba(249, 115, 22, 0.4)',
  },
  {
    id: 'civil-engineering',
    label: { th: 'วิศวกรรมโยธา', en: 'Civil Engineering', jp: '土木工学', ch: '土木工程', ko: '토목공학' },
    icon: Building2,
    subjects: ['structure', 'mechanics', 'hydraulics', 'geotechnical', 'materials', 'mechanics_of_materials'],
    color: '#EF4444',
    glowColor: 'rgba(239, 68, 68, 0.4)',
  },
  {
    id: 'mechanical-engineering',
    label: { th: 'วิศวกรรมเครื่องกล', en: 'Mechanical Engineering', jp: '機械工学', ch: '机械工程', ko: '기계공학' },
    icon: Cog,
    subjects: ['mechanics_of_materials'],
    color: '#3B82F6',
    glowColor: 'rgba(59, 130, 246, 0.4)',
  },
  {
    id: 'electrical-engineering',
    label: { th: 'วิศวกรรมไฟฟ้า', en: 'Electrical Engineering', jp: '電気工学', ch: '电气工程', ko: '전기공학' },
    icon: Zap,
    subjects: ['circuits'],
    color: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.4)',
  },
  {
    id: 'computer-science',
    label: { th: 'วิทยาการคอมพิวเตอร์', en: 'Computer Science', jp: '情報科学', ch: '计算机科学', ko: '컴퓨터과학' },
    icon: Code,
    subjects: ['algorithms'],
    color: '#8B5CF6',
    glowColor: 'rgba(139, 92, 246, 0.4)',
  },
  {
    id: 'chemical-engineering',
    label: { th: 'วิศวกรรมเคมี', en: 'Chemical Engineering', jp: '化学工学', ch: '化学工程', ko: '화학공학' },
    icon: FlaskConical,
    subjects: ['fluid_mechanics'],
    color: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.4)',
  },
  {
    id: 'industrial-engineering',
    label: { th: 'วิศวกรรมอุตสาหการ', en: 'Industrial Engineering', jp: '経営工学', ch: '工业工程', ko: '산업공학' },
    icon: Factory,
    subjects: ['operations_research'],
    color: '#6366F1',
    glowColor: 'rgba(99, 102, 241, 0.4)',
  },
  {
    id: 'aerospace-engineering',
    label: { th: 'วิศวกรรมการบินและอวกาศ', en: 'Aerospace Engineering', jp: '航空宇宙工学', ch: '航空航天工程', ko: '항공우주공학' },
    icon: Plane,
    subjects: ['aerodynamics'],
    color: '#0EA5E9',
    glowColor: 'rgba(14, 165, 233, 0.4)',
  },
  {
    id: 'environmental-engineering',
    label: { th: 'วิศวกรรมสิ่งแวดล้อม', en: 'Environmental Engineering', jp: '環境工学', ch: '环境工程', ko: '환경공학' },
    icon: Leaf,
    subjects: ['water_treatment'],
    color: '#84CC16',
    glowColor: 'rgba(132, 204, 22, 0.4)',
  },
  {
    id: 'physics',
    label: { th: 'ฟิสิกส์', en: 'Physics', jp: '物理学', ch: '物理学', ko: '물리학' },
    icon: Atom,
    subjects: ['thermodynamics', 'optics', 'electromagnetism'],
    color: '#EC4899',
    glowColor: 'rgba(236, 72, 153, 0.4)',
  },
  {
    id: 'mathematics-statistics',
    label: { th: 'คณิตศาสตร์และสถิติ', en: 'Mathematics & Statistics', jp: '数学・統計学', ch: '数学与统计', ko: '수학 및 통계학' },
    icon: Calculator,
    subjects: ['discrete_math', 'probability'],
    color: '#F43F5E',
    glowColor: 'rgba(244, 63, 94, 0.4)',
  },
  {
    id: 'chemistry',
    label: { th: 'เคมี', en: 'Chemistry', jp: '化学', ch: '化学', ko: '화학' },
    icon: TestTube,
    subjects: ['general_chemistry', 'organic_chemistry'],
    color: '#14B8A6',
    glowColor: 'rgba(20, 184, 166, 0.4)',
  },
  {
    id: 'biology-genetics',
    label: { th: 'ชีววิทยาและพันธุศาสตร์', en: 'Biology & Genetics', jp: '生物学・遺伝学', ch: '生物与遗传', ko: '생물학 및 유전학' },
    icon: Dna,
    subjects: ['genetics', 'cell_biology'],
    color: '#22C55E',
    glowColor: 'rgba(34, 197, 94, 0.4)',
  },
  {
    id: 'business-administration',
    label: { th: 'บริหารธุรกิจ', en: 'Business Administration', jp: '経営学', ch: '工商管理', ko: '경영학' },
    icon: Briefcase,
    subjects: ['marketing'],
    color: '#EAB308',
    glowColor: 'rgba(234, 179, 8, 0.4)',
  },
  {
    id: 'economics',
    label: { th: 'เศรษฐศาสตร์', en: 'Economics', jp: '経済学', ch: '经济学', ko: '경제학' },
    icon: LineChart,
    subjects: ['microeconomics', 'macroeconomics'],
    color: '#D946EF',
    glowColor: 'rgba(217, 70, 239, 0.4)',
  },
  {
    id: 'accounting',
    label: { th: 'การบัญชี', en: 'Accounting', jp: '会計学', ch: '会计学', ko: '회계학' },
    icon: BookOpen,
    subjects: ['cost_accounting'],
    color: '#A855F7',
    glowColor: 'rgba(168, 85, 247, 0.4)',
  },
  {
    id: 'finance-investment',
    label: { th: 'การเงินและการลงทุน', en: 'Finance & Investment', jp: '金融・投資', ch: '金融与投资', ko: '금융 및 투자' },
    icon: DollarSign,
    subjects: ['corporate_finance'],
    color: '#06B6D4',
    glowColor: 'rgba(6, 182, 212, 0.4)',
  },
  {
    id: 'political-science',
    label: { th: 'รัฐศาสตร์', en: 'Political Science', jp: '政治学', ch: '政治学', ko: '정치학' },
    icon: Scale,
    subjects: ['political_theory'],
    color: '#64748B',
    glowColor: 'rgba(100, 116, 139, 0.4)',
  },
  {
    id: 'psychology',
    label: { th: 'จิตวิทยา', en: 'Psychology', jp: '心理学', ch: '心理学', ko: '심리학' },
    icon: Brain,
    subjects: ['psychometrics'],
    color: '#7C3AED',
    glowColor: 'rgba(124, 58, 237, 0.4)',
  },
  {
    id: 'education',
    label: { th: 'ศึกษาศาสตร์', en: 'Education', jp: '教育学', ch: '教育学', ko: '교육학' },
    icon: GraduationCap,
    subjects: ['educational_measurement'],
    color: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.4)',
  },
  {
    id: 'architecture',
    label: { th: 'สถาปัตยกรรม', en: 'Architecture', jp: '建築学', ch: '建筑学', ko: '건축학' },
    icon: Compass,
    subjects: ['building_acoustics'],
    color: '#78716C',
    glowColor: 'rgba(120, 113, 108, 0.4)',
  },
  {
    id: 'data-science-ai',
    label: { th: 'วิทยาการข้อมูลและปัญญาประดิษฐ์', en: 'Data Science & AI', jp: 'データサイエンス・AI', ch: '数据科学与人工智能', ko: '데이터 과학 및 AI' },
    icon: Bot,
    subjects: ['machine_learning'],
    color: '#3B82F6',
    glowColor: 'rgba(59, 130, 246, 0.4)',
  },
  {
    id: 'medicine-pharmacy',
    label: { th: 'แพทยศาสตร์และเภสัชกรรม', en: 'Medicine & Pharmacy', jp: '医学・薬学', ch: '医学与药学', ko: '의학 및 약학' },
    icon: Stethoscope,
    subjects: ['pharmacology'],
    color: '#DC2626',
    glowColor: 'rgba(220, 38, 38, 0.4)',
  },
];

export const levels: LevelSection[] = [
  { id: 'elementary',   title: { th: 'ประถมศึกษา', en: 'Elementary', jp: '小学校', ch: '小学', ko: '초등학교' }, icon: BookOpen, color: '#4ade80' },        // Green (ง่ายสุด)
  { id: 'middleSchool', title: { th: 'มัธยมต้น', en: 'Middle School', jp: '中学校', ch: '初중', ko: '중학교' }, icon: Building2, color: '#facc15' },     // Yellow
  { id: 'highSchool',   title: { th: 'มัธยมปลาย', en: 'High School', jp: '高校', ch: '高中', ko: '고등학교' }, icon: GraduationCap, color: '#fb923c' },       // Orange
  { id: 'university',   title: { th: 'มหาวิทยาลัย', en: 'University', jp: '大学', ch: '大学', ko: '대학교' }, icon: Atom, color: '#ef4444' },                  // Red (ยากสุด)
];
