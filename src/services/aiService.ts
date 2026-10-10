import {
  AIMessageTone,
  StudentViolationsSummary,
  ParentMessageResult,
  EarlyWarningsResponse,
} from '../types/ai';
import { Student } from '../types/discipline';

export async function fetchParentMessage(payload: {
  student: Student;
  weekName: string;
  scores: {
    finalScore: number;
    classification: string;
    totalPenalty: number;
    totalBonus: number;
    groupRank?: number;
  };
  violationsSummary: StudentViolationsSummary;
  tone: AIMessageTone;
  metadata: {
    className: string;
    schoolName: string;
    homeroomTeacher: string;
  };
}): Promise<ParentMessageResult> {
  const response = await fetch('/api/ai/parent-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Lỗi server: ${response.status}`);
  }

  return response.json();
}

export async function fetchEarlyWarnings(payload: {
  students: Student[];
  weeklyHistory: any[];
  currentWeekId: number;
  metadata: any;
}): Promise<EarlyWarningsResponse> {
  const response = await fetch('/api/ai/early-warnings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Lỗi server: ${response.status}`);
  }

  return response.json();
}

export async function sendChatMessage(payload: {
  message: string;
  history: Array<{ role: 'user' | 'model'; text: string }>;
  context: any;
}): Promise<{ reply: string }> {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Lỗi server: ${response.status}`);
  }

  return response.json();
}

export async function generateWeeklyComment(payload: {
  weekData?: any;
  className?: string;
  teacherName?: string;
  weekName?: string;
  groupSummaries?: any[];
}): Promise<{ comment: string }> {
  const response = await fetch('/api/ai/weekly-comment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Lỗi server: ${response.status}`);
  }

  return response.json();
}
