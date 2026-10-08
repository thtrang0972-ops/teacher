import { Student, ScoreClassification } from './discipline';

export type AIMessageTone = 'encouraging' | 'constructive' | 'concise_zalo' | 'formal_email';

export interface StudentViolationsSummary {
  diTre: number;
  nghiCP: number;
  nghiKP: number;
  ktbKlbKsb: number;
  khongDongPhuc: number;
  matTratTu: number;
  dungDienThoai: number;
  morningDutyCount: number;
  afternoonDutyCount: number;
  diemTot: number;
  phatBieu: number;
  specificNotes: string[];
}

export interface ParentMessageResult {
  zaloMessage: string;
  emailSubject: string;
  emailBody: string;
}

export type WarningLevel = 'high' | 'medium' | 'positive' | 'group';
export type WarningCategory = 'academic' | 'discipline' | 'attendance' | 'improvement';

export interface EarlyWarningItem {
  id: string;
  studentId: string;
  studentName: string;
  groupId: number;
  level: WarningLevel;
  category: WarningCategory;
  title: string;
  description: string;
  trendData: string;
  recommendation: string;
  suggestedAction: 'contact_parent' | 'praise' | 'counsel' | 'assign_mentor';
}

export interface EarlyWarningsResponse {
  warnings: EarlyWarningItem[];
  overallClassInsight: string;
  topPriorities: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
