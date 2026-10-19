import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Header } from './components/Header';
import { GroupCompetitionView } from './components/GroupCompetitionView';
import { WeeklyScoreTable } from './components/WeeklyScoreTable';
import { MorningDutyView } from './components/MorningDutyView';
import { AfternoonSessionView } from './components/AfternoonSessionView';
import { ReportStatsView } from './components/ReportStatsView';
import { QuickEntryModal } from './components/QuickEntryModal';
import { ClassRosterModal } from './components/ClassRosterModal';
import { PrintReportView } from './components/PrintReportView';
import { ImportStudentsModal } from './components/ImportStudentsModal';
import { RoleSwitcher } from './components/RoleSwitcher';
import { RoleRemarksModal } from './components/RoleRemarksModal';
import { ClassSettingsModal } from './components/ClassSettingsModal';
import { ManHinhDangNhap } from './components/ManHinhDangNhap';
import { AuthModal } from './components/AuthModal';
import { QuickLoginModal } from './components/QuickLoginModal';
import { AccountManagerModal } from './components/AccountManagerModal';
import { AdjustScoreModal } from './components/AdjustScoreModal';
import { AIParentMessageModal } from './components/AIParentMessageModal';
import { AIEarlyWarningModal } from './components/AIEarlyWarningModal';
import { AIChatAssistant } from './components/AIChatAssistant';
import { CopyWeekDataModal } from './components/CopyWeekDataModal';

import type {
  Student,
  StudentWeeklyRecord,
  MorningDutyRecord,
  AfternoonRecord,
  WeekInfo,
  ClassMetadata,
  UserRoleType,
  WeeklyRemarksStore,
  UserAccount,
} from './types/discipline';
import {
  loadAppState,
  saveAppState,
  resetToInitialData,
  normalizeWeeklyRecordsForStudents,
  type AppState,
} from './utils/storage';
import { calculateGroupSummaries } from './utils/scoring';
import { syncRolesAndAccounts } from './utils/syncRoles';

// ============================================================================
// CẤU HÌNH ĐỒNG BỘ ĐÁM MÂY FIREBASE (PROJECT: trang-ec9ce)
// ============================================================================
const CANDIDATE_URLS = [
  'https://trang-ec9ce-default-rtdb.asia-southeast1.firebasedatabase.app',
  'https://trang-ec9ce-default-rtdb.firebaseio.com',
];

let activeFirebaseUrl = CANDIDATE_URLS[0];
let isSyncingFromCloud = false;
let lastSyncedTimestamp = 0;

async function resolveFirebaseUrl(): Promise<string> {
  for (const url of CANDIDATE_URLS) {
    try {
      const res = await fetch(`${url}/cn_nenep_data.json`, { method: 'GET' });
      if (res.ok) {
        activeFirebaseUrl = url;
        return url;
      }
    } catch {
      // Thử link tiếp theo
    }
  }
  return activeFirebaseUrl;
}

async function syncToCloud(stateToSync: AppState, force: boolean = false) {
  if ((isSyncingFromCloud && !force) || !stateToSync) return;
  try {
    const now = Date.now();
    lastSyncedTimestamp = now;

    // Không đẩy phiên đăng nhập cá nhân đè lên máy người khác
    const { currentUserRole, currentAccountId, ...sharedData } = stateToSync;

    const payload = {
      appData: sharedData,
      updatedAt: now,
    };

    await fetch(`${activeFirebaseUrl}/cn_nenep_data.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('Lỗi lưu đám mây Firebase (trang-ec9ce):', err);
  }
}

export default function App() {
  // Load state an toàn: nếu loadAppState bị null thì dùng resetToInitialData, đồng thời tự động khớp chức vụ và học sinh
  const [appState, setAppState] = useState<AppState>(() => {
    const raw = loadAppState() || resetToInitialData();
    const { syncedStudents, syncedMetadata, syncedAccounts } = syncRolesAndAccounts(
      raw.students || [],
      raw.metadata || ({} as ClassMetadata),
      raw.accounts || []
    );
    return {
      ...raw,
      students: syncedStudents,
      metadata: syncedMetadata,
      accounts: syncedAccounts,
    };
  });
  const [activeTab, setActiveTab] = useState<string>('competition');

  // Modals state
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);
  const [quickEntryStudent, setQuickEntryStudent] = useState<Student | null>(null);
  const [isClassRosterOpen, setIsClassRosterOpen] = useState(false);
  const [isClassSettingsOpen, setIsClassSettingsOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isRoleRemarksOpen, setIsRoleRemarksOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isQuickLoginOpen, setIsQuickLoginOpen] = useState(false);
  const [isAccountManagerOpen, setIsAccountManagerOpen] = useState(false);
  const [isCopyWeekModalOpen, setIsCopyWeekModalOpen] = useState(false);

  // AI Features state
  const [isParentMessageOpen, setIsParentMessageOpen] = useState(false);
  const [parentMessageStudentId, setParentMessageStudentId] = useState<string | null>(null);
  const [isEarlyWarningOpen, setIsEarlyWarningOpen] = useState(false);
  const [isChatAssistantOpen, setIsChatAssistantOpen] = useState(false);

  const isFirstMount = useRef(true);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Lưu vào localStorage và tự động đẩy lên Firebase (chỉ khi dữ liệu thực sự đổi sau khi mount)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (!appState) return;
    saveAppState(appState);
    if (!isSyncingFromCloud) {
      const timeout = setTimeout(() => {
        syncToCloud(appState);
      }, 400);
      return () => clearTimeout(timeout);
    }
  }, [appState]);

  // Kích hoạt đồng bộ 2 chiều từ Firebase
  useEffect(() => {
    const pullFromCloud = async () => {
      try {
        const res = await fetch(`${activeFirebaseUrl}/cn_nenep_data.json`);
        if (!res.ok) return;
        const cloudData = await res.json();

        if (!cloudData || !cloudData.appData) {
          return;
        }

        // Khắc phục lệch đồng hồ (clock skew) giữa điện thoại và máy tính:
        // Cập nhật khi có updatedAt khác mốc thời gian đã áp dụng gần nhất
        if (!lastSyncedTimestamp || cloudData.updatedAt !== lastSyncedTimestamp) {
          lastSyncedTimestamp = cloudData.updatedAt || Date.now();
          isSyncingFromCloud = true;

          const remote = cloudData.appData;
          setAppState((prev) => {
            const safePrev = prev || resetToInitialData();

            const hasLegacyMock = Array.isArray(remote.students) && remote.students.some(
              (s: any) => (s.id === 'hs-1' && s.name === 'Nguyễn Văn An') || s.name === 'Trần Bảo Anh' || s.name === 'Trần Gia Hưng'
            );
            let incomingStudents = safePrev.students || [];
            if (!hasLegacyMock && Array.isArray(remote.students) && remote.students.length > 0) {
              incomingStudents = remote.students;
            } else if (hasLegacyMock) {
              incomingStudents = safePrev.students.some(s => s.name === 'Nguyễn Văn An') ? [] : safePrev.students;
            }

            const incomingAccounts = Array.isArray(remote.accounts) ? remote.accounts : safePrev.accounts || [];
            const { syncedStudents, syncedMetadata, syncedAccounts } = syncRolesAndAccounts(
              incomingStudents,
              remote.metadata || safePrev.metadata,
              incomingAccounts
            );

            // Gộp weeklyRecords an toàn: xử lý cả Firebase Array lẫn Object không bị mất tuần
            const mergedWeeklyRecords: Record<number, Record<string, StudentWeeklyRecord>> = {
              ...(safePrev.weeklyRecords || {}),
            };

            if (remote.weeklyRecords) {
              const remoteEntries: [string | number, any][] = Array.isArray(remote.weeklyRecords)
                ? (remote.weeklyRecords as any[])
                    .map((r: any, i: number): [number, any] => [i, r])
                    .filter((pair: [number, any]) => pair[1] != null)
                : Object.entries(remote.weeklyRecords);

              for (const [wId, recs] of remoteEntries) {
                if (recs && typeof recs === 'object') {
                  const numWId = Number(wId);
                  mergedWeeklyRecords[numWId] = {
                    ...(mergedWeeklyRecords[numWId] || {}),
                    ...recs,
                  };
                }
              }
            }

            // Chuẩn hóa và khôi phục toàn bộ dữ liệu ghi nhận của tất cả các tuần (Tuần 1 -> Tuần 6)
            const fullyNormalizedRecords = normalizeWeeklyRecordsForStudents(
              mergedWeeklyRecords,
              syncedStudents
            );

            const mergedRemarks = remote.weeklyRemarks || safePrev.weeklyRemarks || {};
            // Khởi tạo nhận xét Tuần 6 nếu chưa có
            if (!mergedRemarks[6]) {
              mergedRemarks[6] = {
                groupRemarks: {
                  1: { groupId: 1, leaderName: 'Trần Như Mỹ', pros: '', cons: '', remindStudent: '', exemplaryStudent: '', selfRating: 'Tốt', updatedAt: '' },
                  2: { groupId: 2, leaderName: 'Hồ Thị Thảo Vy', pros: '', cons: '', remindStudent: '', exemplaryStudent: '', selfRating: 'Tốt', updatedAt: '' },
                  3: { groupId: 3, leaderName: 'Hồ Thị Tuyết Minh', pros: '', cons: '', remindStudent: '', exemplaryStudent: '', selfRating: 'Tốt', updatedAt: '' },
                  4: { groupId: 4, leaderName: 'Nguyễn Phi Thanh Long', pros: '', cons: '', remindStudent: '', exemplaryStudent: '', selfRating: 'Tốt', updatedAt: '' },
                  5: { groupId: 5, leaderName: 'Nguyễn Thị Yến Nhi A', pros: '', cons: '', remindStudent: '', exemplaryStudent: '', selfRating: 'Tốt', updatedAt: '' },
                  6: { groupId: 6, leaderName: 'Trương Lê Triều Vỹ', pros: '', cons: '', remindStudent: '', exemplaryStudent: '', selfRating: 'Tốt', updatedAt: '' },
                },
                officerRemarks: {
                  academicRemark: { authorName: 'Nguyễn Thị Ngân Quỳnh', content: '', rating: 'Tốt', updatedAt: '' },
                  disciplineRemark: { authorName: 'Trần Bích Tuyền', content: '', rating: 'Tốt', updatedAt: '' },
                  laborRemark: { authorName: 'Nguyễn Hồng Ân', content: '', rating: 'Tốt', updatedAt: '' },
                  monitorRemark: { authorName: 'Đinh Thị Ngọc Huệ', generalSummary: '', updatedAt: '' },
                  teacherAdvice: { advice: '', isApproved: false, teacherName: 'Cô Nguyễn Thị Thuỳ Trang', updatedAt: '' },
                },
              };
            }

            if (syncedMetadata.groupSubmissions?.[6] && !syncedMetadata.groupSubmissions?.[5]) {
              syncedMetadata.groupSubmissions[5] = syncedMetadata.groupSubmissions[6];
            }

            // Bảo toàn tuyệt đối tuần người dùng đang chọn trên giao diện
            const targetWeekId = safePrev.currentWeekId ?? remote.currentWeekId ?? 5;

            const merged: AppState = {
              ...safePrev,
              metadata: syncedMetadata,
              students: syncedStudents,
              weeks: Array.isArray(remote.weeks) ? remote.weeks : safePrev.weeks || [],
              currentWeekId: targetWeekId,
              accounts: syncedAccounts,
              weeklyRecords: fullyNormalizedRecords,
              morningDutyRecords: Array.isArray(remote.morningDutyRecords) ? remote.morningDutyRecords : (safePrev.morningDutyRecords || []),
              afternoonRecords: Array.isArray(remote.afternoonRecords) ? remote.afternoonRecords : (safePrev.afternoonRecords || []),
              weeklyRemarks: mergedRemarks,
            };
            saveAppState(merged);
            if (hasLegacyMock) {
              // Tự động làm sạch Firebase nếu đám mây còn tàn dư học sinh mẫu cũ
              syncToCloud(merged, true);
            }
            return merged;
          });

          setTimeout(() => {
            isSyncingFromCloud = false;
          }, 400);
        }
      } catch (err) {
        console.error('Lỗi tải dữ liệu từ Firebase (trang-ec9ce):', err);
      }
    };

    resolveFirebaseUrl().then(() => {
      pullFromCloud();
    });

    const timer = setInterval(() => {
      if (!isSyncingFromCloud) {
        pullFromCloud();
      }
    }, 2500);

    return () => clearInterval(timer);
  }, []);

  // Phân rã state an toàn (Tránh lỗi Cannot destructure property)
  const {
    metadata = {} as ClassMetadata,
    students = [],
    weeks = [],
    currentWeekId = 1,
    currentUserRole = 'guest',
    currentAccountId = '',
    accounts = [],
    weeklyRecords = {},
    morningDutyRecords = [],
    afternoonRecords = [],
    weeklyRemarks = {},
  } = appState || {};

  // Tài khoản đang đăng nhập (Tự động tổng hợp tài khoản học sinh, KHÔNG BAO GIỜ bị mất phiên khi đồng bộ)
  const currentAccount = useMemo(() => {
    if (!currentAccountId && currentUserRole === 'guest') {
      return undefined;
    }

    // 1. Tìm trực tiếp trong danh sách accounts
    const directMatch = accounts.find((a) => a.id === currentAccountId);
    if (directMatch) return directMatch;

    // 2. Nếu là tài khoản học sinh (acc-hs-...) hoặc ID học sinh
    if (currentAccountId && (currentAccountId.startsWith('acc-hs-') || currentAccountId.startsWith('hs-'))) {
      const studentId = currentAccountId.replace('acc-', '');
      const s = students.find((st) => st.id === studentId);
      if (s) {
        return {
          id: `acc-${s.id}`,
          username: s.stt ? s.stt.toString() : s.id,
          password: '123',
          role: (s.isLeader ? `nhomTruong${s.groupId}` : 'hocSinh') as UserRoleType,
          displayName: s.name,
          title: s.role || (s.isLeader ? `Nhóm trưởng ${s.groupId}` : `Học sinh Nhóm ${s.groupId}`),
          avatarIcon: s.isLeader ? '🚩' : '👤',
          assignedGroupIds: [s.groupId],
          description: `Học sinh ${s.name} - Nhóm ${s.groupId}`,
        };
      }
    }

    // 3. Fallback theo role
    if (currentUserRole !== 'guest') {
      const byRole = accounts.find((a) => a.role === currentUserRole);
      if (byRole) return byRole;
    }

    return undefined;
  }, [accounts, currentAccountId, currentUserRole, students]);

  // Hàm ép đồng bộ dữ liệu tức thì (Force Refresh)
  const handleForceSync = async () => {
    setSyncFeedback('Đang đồng bộ...');
    try {
      const res = await fetch(`${activeFirebaseUrl}/cn_nenep_data.json`);
      if (res.ok) {
        const cloudData = await res.json();
        if (cloudData?.appData) {
          lastSyncedTimestamp = cloudData.updatedAt || Date.now();
          const remote = cloudData.appData;
          setAppState((prev) => {
            const safePrev = prev || resetToInitialData();
            const mergedWeeklyRecords: Record<number, Record<string, StudentWeeklyRecord>> = {
              ...(safePrev.weeklyRecords || {}),
            };
            if (remote.weeklyRecords) {
              const remoteEntries: [string | number, any][] = Array.isArray(remote.weeklyRecords)
                ? (remote.weeklyRecords as any[])
                    .map((r: any, i: number): [number, any] => [i, r])
                    .filter((pair: [number, any]) => pair[1] != null)
                : Object.entries(remote.weeklyRecords);
              for (const [wId, recs] of remoteEntries) {
                if (recs && typeof recs === 'object') {
                  mergedWeeklyRecords[Number(wId)] = {
                    ...(mergedWeeklyRecords[Number(wId)] || {}),
                    ...recs,
                  };
                }
              }
            }
            const currentStudents = remote.students || safePrev.students;
            const fullyNormalizedRecords = normalizeWeeklyRecordsForStudents(
              mergedWeeklyRecords,
              currentStudents
            );

            const nextState: AppState = {
              ...safePrev,
              metadata: remote.metadata || safePrev.metadata,
              students: currentStudents,
              weeklyRecords: fullyNormalizedRecords,
              morningDutyRecords: Array.isArray(remote.morningDutyRecords) ? remote.morningDutyRecords : safePrev.morningDutyRecords,
              afternoonRecords: Array.isArray(remote.afternoonRecords) ? remote.afternoonRecords : safePrev.afternoonRecords,
              weeklyRemarks: remote.weeklyRemarks || safePrev.weeklyRemarks,
            };
            saveAppState(nextState);
            return nextState;
          });
          setSyncFeedback('Đã đồng bộ xong! ✓');
          setTimeout(() => setSyncFeedback(null), 2500);
          return;
        }
      }
    } catch (e) {
      console.error(e);
    }
    setSyncFeedback('Đã kết nối');
    setTimeout(() => setSyncFeedback(null), 2000);
  };

  const handleLogout = () => {
    setAppState((prev) => {
      const next: AppState = {
        ...(prev || resetToInitialData()),
        currentUserRole: 'guest',
        currentAccountId: '',
      };
      saveAppState(next);
      return next;
    });
  };

  // Lấy dữ liệu tuần hiện tại an toàn
  const currentWeek: WeekInfo = weeks.find((w) => w.id === currentWeekId) ||
    weeks[0] || { id: 1, name: 'Tuần 1', startDate: '', endDate: '' };
  
  const currentRecords = weeklyRecords[currentWeekId] || {};

  // Tính kết quả thi đua 6 nhóm (Có bọc Try/Catch chống crash)
  let groups: any[] = [];
  try {
    groups = calculateGroupSummaries(students, currentRecords);
  } catch (error) {
    console.error("Lỗi tính toán groups (calculateGroupSummaries):", error);
  }

  const allCalculatedScores = useMemo(() => {
    return groups.flatMap((g) => g.students || []);
  }, [groups]);

  const handleSelectRole = (newRole: UserRoleType) => {
    const matched = accounts.find((a) => a.role === newRole);
    setAppState((prev) => ({
      ...(prev || resetToInitialData()),
      currentUserRole: newRole,
      currentAccountId: matched ? matched.id : (prev?.currentAccountId || ''),
    }));
  };

  const handleLogin = (accountId: string, studentUser?: Student) => {
    // 1. Nếu có thông tin học sinh cụ thể (studentUser hoặc tìm thấy trong danh sách học sinh)
    const matchedStudent =
      studentUser ||
      students.find((s) => s.id === accountId || `acc-${s.id}` === accountId);

    if (matchedStudent) {
      const studentAccId = `acc-${matchedStudent.id}`;
      const role: UserRoleType = matchedStudent.isLeader
        ? (`nhomTruong${matchedStudent.groupId}` as UserRoleType)
        : 'hocSinh';

      const studentAccount: UserAccount = {
        id: studentAccId,
        username: matchedStudent.stt ? matchedStudent.stt.toString() : matchedStudent.id,
        password: '123',
        role,
        displayName: matchedStudent.name,
        title: matchedStudent.role || (matchedStudent.isLeader ? `Nhóm trưởng ${matchedStudent.groupId}` : `Học sinh Nhóm ${matchedStudent.groupId}`),
        avatarIcon: matchedStudent.isLeader ? '🚩' : '👤',
        assignedGroupIds: [matchedStudent.groupId],
        description: `Học sinh ${matchedStudent.name} - Nhóm ${matchedStudent.groupId}`,
      };

      setAppState((prev) => {
        const safePrev = prev || resetToInitialData();
        const existingAccounts = safePrev.accounts || [];
        const updatedAccounts = existingAccounts.some((a) => a.id === studentAccId)
          ? existingAccounts.map((a) => (a.id === studentAccId ? studentAccount : a))
          : [...existingAccounts, studentAccount];

        const next: AppState = {
          ...safePrev,
          accounts: updatedAccounts,
          currentAccountId: studentAccId,
          currentUserRole: role,
        };
        saveAppState(next);
        return next;
      });
      return;
    }

    // 2. Tài khoản cán sự hoặc GVCN
    const matched = accounts.find((a) => a.id === accountId);
    if (matched) {
      setAppState((prev) => {
        const next: AppState = {
          ...(prev || resetToInitialData()),
          currentAccountId: matched.id,
          currentUserRole: matched.role,
        };
        saveAppState(next);
        return next;
      });
      return;
    }
  };

  const handleUpdateAccounts = (newAccounts: UserAccount[]) => {
    setAppState((prev) => ({
      ...(prev || resetToInitialData()),
      accounts: newAccounts,
    }));
  };

  const handleSelectWeek = (weekId: number) => {
    setAppState((prev) => {
      const safePrev = prev || resetToInitialData();
      const nextState: AppState = {
        ...safePrev,
        currentWeekId: weekId,
        weeklyRecords: {
          ...safePrev.weeklyRecords,
          [weekId]: safePrev.weeklyRecords[weekId] || {},
        },
      };
      saveAppState(nextState);
      syncToCloud(nextState, true);
      return nextState;
    });
  };

  const handleUpdateRecord = (
    studentId: string,
    updatedFields: Partial<StudentWeeklyRecord>,
    targetWeekId?: number
  ) => {
    setAppState((prev) => {
      const safePrev = prev || resetToInitialData();
      const currentWeek = targetWeekId ?? safePrev.currentWeekId;
      const weekRecs = { ...(safePrev.weeklyRecords[currentWeek] || {}) };
      const currentStudentRec: StudentWeeklyRecord = weekRecs[studentId] || {
        studentId,
        diTre: 0, nghiCP: 0, nghiKP: 0, boTiet: 0, ktbKlbKsb: 0,
        khongDongPhuc2: 0, diemTot: 0, phatBieu: 0, khongDongPhuc5: 0,
        matTratTu: 0, khongThamGiaVS: 0, noiTuc: 0, xaRac: 0,
        trucVSBan: 0, huHongTS: 0, voLeGV: 0, dungDienThoai: 0, viPhamKhac: 0,
      };

      weekRecs[studentId] = {
        ...currentStudentRec,
        ...updatedFields,
      };

      const nextState: AppState = {
        ...safePrev,
        weeklyRecords: {
          ...safePrev.weeklyRecords,
          [currentWeek]: weekRecs,
        },
      };
      saveAppState(nextState);
      syncToCloud(nextState, true);
      return nextState;
    });
  };

  const handleApplyViolation = (
    studentId: string,
    field: keyof Omit<StudentWeeklyRecord, 'studentId' | 'note'>,
    delta: number,
    note?: string,
    context?: 'standard' | 'morning' | 'afternoon',
    contextDetails?: {
      dayOfWeek?: 'Thứ 2' | 'Thứ 3' | 'Thứ 4' | 'Thứ 5' | 'Thứ 6' | 'Thứ 7';
      sessionName?: string;
    },
    targetWeekId?: number
  ) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    setAppState((prev) => {
      const safePrev = prev || resetToInitialData();
      const currentWeek = targetWeekId ?? safePrev.currentWeekId;
      const weekRecs = { ...(safePrev.weeklyRecords[currentWeek] || {}) };
      const currentStudentRec: StudentWeeklyRecord = weekRecs[studentId] || {
        studentId,
        diTre: 0, nghiCP: 0, nghiKP: 0, boTiet: 0, ktbKlbKsb: 0,
        khongDongPhuc2: 0, diemTot: 0, phatBieu: 0, khongDongPhuc5: 0,
        matTratTu: 0, khongThamGiaVS: 0, noiTuc: 0, xaRac: 0,
        trucVSBan: 0, huHongTS: 0, voLeGV: 0, dungDienThoai: 0, viPhamKhac: 0,
      };

      const currentVal = Number(currentStudentRec[field] || 0);
      const newVal = Math.max(0, currentVal + delta);

      weekRecs[studentId] = {
        ...currentStudentRec,
        [field]: newVal,
        note: note
          ? currentStudentRec.note
            ? `${currentStudentRec.note}; ${note}`
            : note
          : currentStudentRec.note,
      };

      let newMorning = [...(safePrev.morningDutyRecords || [])];
      let newAfternoon = [...(safePrev.afternoonRecords || [])];

      if (context === 'morning') {
        const morningRec: MorningDutyRecord = {
          id: `md-${Date.now()}`,
          weekId: currentWeek,
          date: new Date().toISOString().slice(0, 10),
          dayOfWeek: contextDetails?.dayOfWeek || 'Thứ 2',
          studentId: student.id,
          studentName: student.name,
          groupId: student.groupId,
          violationType: 'khac',
          violationLabel: note || String(field),
          penaltyPoints: -2,
          note: note,
          recordedBy: 'Ban cán sự / Cờ đỏ',
          createdAt: new Date().toISOString(),
        };
        newMorning.unshift(morningRec);
      }

      if (context === 'afternoon') {
        const afternoonRec: AfternoonRecord = {
          id: `an-${Date.now()}`,
          weekId: currentWeek,
          date: new Date().toISOString().slice(0, 10),
          dayOfWeek: contextDetails?.dayOfWeek || 'Thứ 3',
          sessionName: contextDetails?.sessionName || 'Học trái buổi',
          subject: 'Khac',
          subjectLabel: 'Trái buổi',
          studentId: student.id,
          studentName: student.name,
          groupId: student.groupId,
          violationType: 'khac',
          violationLabel: note || String(field),
          penaltyPoints: -2,
          note: note,
          recordedBy: 'Ban cán sự',
          createdAt: new Date().toISOString(),
        };
        newAfternoon.unshift(afternoonRec);
      }

      const nextState: AppState = {
        ...safePrev,
        weeklyRecords: {
          ...safePrev.weeklyRecords,
          [currentWeek]: weekRecs,
        },
        morningDutyRecords: newMorning,
        afternoonRecords: newAfternoon,
      };
      saveAppState(nextState);
      syncToCloud(nextState, true);
      return nextState;
    });
  };

  const handleAddMorningRecord = (rec: Omit<MorningDutyRecord, 'id' | 'createdAt'>) => {
    const newRecord: MorningDutyRecord = {
      ...rec,
      id: `md-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    setAppState((prev) => {
      const safePrev = prev || resetToInitialData();
      const targetWeek = rec.weekId || safePrev.currentWeekId;
      const weekRecs = { ...(safePrev.weeklyRecords[targetWeek] || {}) };
      const currentStudentRec: StudentWeeklyRecord = weekRecs[rec.studentId] || {
        studentId: rec.studentId,
        diTre: 0, nghiCP: 0, nghiKP: 0, boTiet: 0, ktbKlbKsb: 0,
        khongDongPhuc2: 0, diemTot: 0, phatBieu: 0, khongDongPhuc5: 0,
        matTratTu: 0, khongThamGiaVS: 0, noiTuc: 0, xaRac: 0,
        trucVSBan: 0, huHongTS: 0, voLeGV: 0, dungDienThoai: 0, viPhamKhac: 0,
      };

      if (rec.violationType === 'khanQuangPhuHieu') {
        currentStudentRec.khongDongPhuc2 = (currentStudentRec.khongDongPhuc2 || 0) + 1;
      } else if (rec.violationType === 'truyBai') {
        currentStudentRec.ktbKlbKsb = (currentStudentRec.ktbKlbKsb || 0) + 1;
      } else if (rec.violationType === 'diTre15p') {
        currentStudentRec.diTre = (currentStudentRec.diTre || 0) + 1;
      } else if (rec.violationType === 'veSinhLop') {
        currentStudentRec.trucVSBan = (currentStudentRec.trucVSBan || 0) + 1;
      } else if (rec.violationType === 'matTratTu15p') {
        currentStudentRec.matTratTu = (currentStudentRec.matTratTu || 0) + 1;
      } else {
        currentStudentRec.viPhamKhac = (currentStudentRec.viPhamKhac || 0) + 1;
      }

      if (rec.note) {
        currentStudentRec.note = currentStudentRec.note
          ? `${currentStudentRec.note}; 15p: ${rec.note}`
          : `15p: ${rec.note}`;
      }

      weekRecs[rec.studentId] = currentStudentRec;

      const nextState: AppState = {
        ...safePrev,
        weeklyRecords: {
          ...safePrev.weeklyRecords,
          [targetWeek]: weekRecs,
        },
        morningDutyRecords: [newRecord, ...(safePrev.morningDutyRecords || [])],
      };
      saveAppState(nextState);
      syncToCloud(nextState, true);
      return nextState;
    });
  };

  const handleDeleteMorningRecord = (id: string) => {
    setAppState((prev) => {
      const safePrev = prev || resetToInitialData();
      const nextState: AppState = {
        ...safePrev,
        morningDutyRecords: (safePrev.morningDutyRecords || []).filter((r) => r.id !== id),
      };
      saveAppState(nextState);
      syncToCloud(nextState, true);
      return nextState;
    });
  };

  const handleAddAfternoonRecord = (rec: Omit<AfternoonRecord, 'id' | 'createdAt'>) => {
    const newRecord: AfternoonRecord = {
      ...rec,
      id: `an-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    setAppState((prev) => {
      const safePrev = prev || resetToInitialData();
      const targetWeek = rec.weekId || safePrev.currentWeekId;
      const weekRecs = { ...(safePrev.weeklyRecords[targetWeek] || {}) };
      const currentStudentRec: StudentWeeklyRecord = weekRecs[rec.studentId] || {
        studentId: rec.studentId,
        diTre: 0, nghiCP: 0, nghiKP: 0, boTiet: 0, ktbKlbKsb: 0,
        khongDongPhuc2: 0, diemTot: 0, phatBieu: 0, khongDongPhuc5: 0,
        matTratTu: 0, khongThamGiaVS: 0, noiTuc: 0, xaRac: 0,
        trucVSBan: 0, huHongTS: 0, voLeGV: 0, dungDienThoai: 0, viPhamKhac: 0,
      };

      if (rec.violationType === 'vangKP') {
        currentStudentRec.nghiKP = (currentStudentRec.nghiKP || 0) + 1;
      } else if (rec.violationType === 'vangCP') {
        currentStudentRec.nghiCP = (currentStudentRec.nghiCP || 0) + 1;
      } else if (rec.violationType === 'boTiet') {
        currentStudentRec.boTiet = (currentStudentRec.boTiet || 0) + 1;
      } else if (rec.violationType === 'diTre') {
        currentStudentRec.diTre = (currentStudentRec.diTre || 0) + 1;
      } else if (rec.violationType === 'khongDongPhuc') {
        currentStudentRec.khongDongPhuc2 = (currentStudentRec.khongDongPhuc2 || 0) + 1;
      } else if (rec.violationType === 'matTratTu') {
        currentStudentRec.matTratTu = (currentStudentRec.matTratTu || 0) + 1;
      } else if (rec.violationType === 'khac') {
        currentStudentRec.viPhamKhac = (currentStudentRec.viPhamKhac || 0) + 1;
      }

      if (rec.note) {
        currentStudentRec.note = currentStudentRec.note
          ? `${currentStudentRec.note}; Trái buổi: ${rec.note}`
          : `Trái buổi: ${rec.note}`;
      }

      weekRecs[rec.studentId] = currentStudentRec;

      const nextState: AppState = {
        ...safePrev,
        weeklyRecords: {
          ...safePrev.weeklyRecords,
          [targetWeek]: weekRecs,
        },
        afternoonRecords: [newRecord, ...(safePrev.afternoonRecords || [])],
      };
      saveAppState(nextState);
      syncToCloud(nextState, true);
      return nextState;
    });
  };

  const handleDeleteAfternoonRecord = (id: string) => {
    setAppState((prev) => {
      const safePrev = prev || resetToInitialData();
      const nextState: AppState = {
        ...safePrev,
        afternoonRecords: (safePrev.afternoonRecords || []).filter((r) => r.id !== id),
      };
      saveAppState(nextState);
      syncToCloud(nextState, true);
      return nextState;
    });
  };

  const handleUpdateMetadata = (newMeta: ClassMetadata) => {
    setAppState((prev) => {
      const safePrev = prev || resetToInitialData();
      const { syncedStudents, syncedMetadata, syncedAccounts } = syncRolesAndAccounts(
        safePrev.students || [],
        newMeta,
        safePrev.accounts || []
      );
      const nextState: AppState = {
        ...safePrev,
        metadata: syncedMetadata,
        students: syncedStudents,
        accounts: syncedAccounts,
      };
      saveAppState(nextState);
      syncToCloud(nextState, true);
      return nextState;
    });
  };

  const handleUpdateStudentsList = (newStudents: Student[]) => {
    setAppState((prev) => {
      const safePrev = prev || resetToInitialData();
      const { syncedStudents, syncedMetadata, syncedAccounts } = syncRolesAndAccounts(
        newStudents,
        safePrev.metadata,
        safePrev.accounts || []
      );
      const nextState: AppState = {
        ...safePrev,
        students: syncedStudents,
        metadata: syncedMetadata,
        accounts: syncedAccounts,
      };
      saveAppState(nextState);
      syncToCloud(nextState, true);
      return nextState;
    });
  };

  const handleAddStudent = (data: Omit<Student, 'id' | 'stt'>) => {
    setAppState((prev) => {
      const safePrev = prev || resetToInitialData();
      const newStt = (safePrev.students || []).length + 1;
      const newStudent: Student = {
        ...data,
        id: `hs-${Date.now()}`,
        stt: newStt,
      };
      const updatedList = [...(safePrev.students || []), newStudent];
      const { syncedStudents, syncedMetadata, syncedAccounts } = syncRolesAndAccounts(
        updatedList,
        safePrev.metadata,
        safePrev.accounts || []
      );
      const nextState: AppState = {
        ...safePrev,
        students: syncedStudents,
        metadata: syncedMetadata,
        accounts: syncedAccounts,
      };
      saveAppState(nextState);
      syncToCloud(nextState, true);
      return nextState;
    });
  };

  const handleUpdateStudent = (id: string, updated: Partial<Student>) => {
    setAppState((prev) => {
      const safePrev = prev || resetToInitialData();
      const updatedList = (safePrev.students || []).map((s) => (s.id === id ? { ...s, ...updated } : s));
      const { syncedStudents, syncedMetadata, syncedAccounts } = syncRolesAndAccounts(
        updatedList,
        safePrev.metadata,
        safePrev.accounts || []
      );
      const nextState: AppState = {
        ...safePrev,
        students: syncedStudents,
        metadata: syncedMetadata,
        accounts: syncedAccounts,
      };
      saveAppState(nextState);
      syncToCloud(nextState, true);
      return nextState;
    });
  };

  const handleDeleteStudent = (id: string) => {
    setAppState((prev) => {
      const safePrev = prev || resetToInitialData();
      const remaining = (safePrev.students || []).filter((s) => s.id !== id);
      const renumbered = remaining.map((s, idx) => ({ ...s, stt: idx + 1 }));
      const { syncedStudents, syncedMetadata, syncedAccounts } = syncRolesAndAccounts(
        renumbered,
        safePrev.metadata,
        safePrev.accounts || []
      );
      const nextState: AppState = {
        ...safePrev,
        students: syncedStudents,
        metadata: syncedMetadata,
        accounts: syncedAccounts,
      };
      saveAppState(nextState);
      syncToCloud(nextState, true);
      return nextState;
    });
  };

  const handleClearAllStudents = () => {
    setAppState((prev) => {
      const safePrev = prev || resetToInitialData();
      const { syncedStudents, syncedMetadata, syncedAccounts } = syncRolesAndAccounts(
        [],
        safePrev.metadata,
        safePrev.accounts || []
      );
      const nextState: AppState = {
        ...safePrev,
        students: [],
        metadata: syncedMetadata,
        accounts: syncedAccounts,
        weeklyRecords: {},
        morningDutyRecords: [],
        afternoonRecords: [],
      };
      saveAppState(nextState);
      syncToCloud(nextState, true);
      return nextState;
    });
  };

  const handleResetData = () => {
    const initial = resetToInitialData();
    const { syncedStudents, syncedMetadata, syncedAccounts } = syncRolesAndAccounts(
      initial.students || [],
      initial.metadata,
      initial.accounts || []
    );
    const fullInitial: AppState = {
      ...initial,
      students: syncedStudents,
      metadata: syncedMetadata,
      accounts: syncedAccounts,
    };
    setAppState(fullInitial);
    syncToCloud(fullInitial, true);
  };

  const handleApplyNewRoster = (newStudents: Student[]) => {
    setAppState((prev) => {
      const safePrev = prev || resetToInitialData();
      const { syncedStudents, syncedMetadata, syncedAccounts } = syncRolesAndAccounts(
        newStudents,
        safePrev.metadata,
        safePrev.accounts || []
      );
      const normalizedWeeklyRecords = normalizeWeeklyRecordsForStudents(
        safePrev.weeklyRecords,
        syncedStudents
      );

      const nextState: AppState = {
        ...safePrev,
        students: syncedStudents,
        metadata: syncedMetadata,
        accounts: syncedAccounts,
        weeklyRecords: normalizedWeeklyRecords,
      };
      saveAppState(nextState);
      syncToCloud(nextState, true);
      return nextState;
    });
  };

  const handleSyncAllRoles = () => {
    setAppState((prev) => {
      const safePrev = prev || resetToInitialData();
      const { syncedStudents, syncedMetadata, syncedAccounts } = syncRolesAndAccounts(
        safePrev.students || [],
        safePrev.metadata,
        safePrev.accounts || []
      );
      return {
        ...safePrev,
        students: syncedStudents,
        metadata: syncedMetadata,
        accounts: syncedAccounts,
      };
    });
  };

  const handleUpdateRemarks = (weekId: number, updated: WeeklyRemarksStore) => {
    setAppState((prev) => {
      const safePrev = prev || resetToInitialData();
      return {
        ...safePrev,
        weeklyRemarks: {
          ...safePrev.weeklyRemarks,
          [weekId]: updated,
        },
      };
    });
  };

  const handleConfirmGroupSubmission = (groupId: number) => {
    setAppState((prev) => {
      const safePrev = prev || resetToInitialData();
      const currentSubmissions = safePrev.metadata?.groupSubmissions || {};
      const weekSubs = { ...(currentSubmissions[safePrev.currentWeekId] || {}) };
      const nowStr =
        new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
        ' ' +
        new Date().toLocaleDateString('vi-VN');

      weekSubs[groupId] = {
        confirmed: true,
        confirmedAt: nowStr,
        confirmedBy: currentAccount?.displayName || `Nhóm trưởng ${groupId}`,
      };

      const updatedMeta: ClassMetadata = {
        ...safePrev.metadata,
        groupSubmissions: {
          ...currentSubmissions,
          [safePrev.currentWeekId]: weekSubs,
        },
      };

      const nextState: AppState = {
        ...safePrev,
        metadata: updatedMeta,
      };
      saveAppState(nextState);
      syncToCloud(nextState, true);
      return nextState;
    });
  };

  const handleCopyWeekData = (
    fromWeekId: number,
    toWeekId: number,
    options: {
      copyRecords: boolean;
      copySubmissions: boolean;
      copyRemarks: boolean;
      switchWeek: boolean;
      clearSourceWeek?: boolean;
    }
  ) => {
    setAppState((prev) => {
      const safePrev = prev || resetToInitialData();
      let newWeeklyRecords = { ...safePrev.weeklyRecords };
      if (options.copyRecords) {
        const sourceRecords = safePrev.weeklyRecords[fromWeekId] || {};
        newWeeklyRecords[toWeekId] = JSON.parse(JSON.stringify(sourceRecords));
      }

      let newMetadata = { ...safePrev.metadata };
      if (options.copySubmissions) {
        const subs = safePrev.metadata?.groupSubmissions || {};
        const sourceSubs = subs[fromWeekId] || {};
        newMetadata.groupSubmissions = {
          ...subs,
          [toWeekId]: JSON.parse(JSON.stringify(sourceSubs)),
        };
      }

      let newRemarks = { ...safePrev.weeklyRemarks };
      if (options.copyRemarks) {
        const sourceRemarks = safePrev.weeklyRemarks[fromWeekId] || {};
        newRemarks[toWeekId] = JSON.parse(JSON.stringify(sourceRemarks));
      }

      // Nếu người dùng chọn xoá tuần nguồn sau khi chuyển
      if (options.clearSourceWeek) {
        newWeeklyRecords[fromWeekId] = {};
        if (newMetadata.groupSubmissions) {
          newMetadata.groupSubmissions[fromWeekId] = {};
        }
        if (newRemarks[fromWeekId]) {
          newRemarks[fromWeekId] = {
            groupRemarks: {
              1: { groupId: 1, leaderName: '', pros: '', cons: '', remindStudent: '', exemplaryStudent: '', selfRating: 'Tốt', updatedAt: '' },
              2: { groupId: 2, leaderName: '', pros: '', cons: '', remindStudent: '', exemplaryStudent: '', selfRating: 'Tốt', updatedAt: '' },
              3: { groupId: 3, leaderName: '', pros: '', cons: '', remindStudent: '', exemplaryStudent: '', selfRating: 'Tốt', updatedAt: '' },
              4: { groupId: 4, leaderName: '', pros: '', cons: '', remindStudent: '', exemplaryStudent: '', selfRating: 'Tốt', updatedAt: '' },
              5: { groupId: 5, leaderName: '', pros: '', cons: '', remindStudent: '', exemplaryStudent: '', selfRating: 'Tốt', updatedAt: '' },
              6: { groupId: 6, leaderName: '', pros: '', cons: '', remindStudent: '', exemplaryStudent: '', selfRating: 'Tốt', updatedAt: '' },
            },
            officerRemarks: {
              academicRemark: { authorName: '', content: '', rating: 'Tốt', updatedAt: '' },
              disciplineRemark: { authorName: '', content: '', rating: 'Tốt', updatedAt: '' },
              laborRemark: { authorName: '', content: '', rating: 'Tốt', updatedAt: '' },
              monitorRemark: { authorName: '', generalSummary: '', updatedAt: '' },
              teacherAdvice: { advice: '', isApproved: false, teacherName: '', updatedAt: '' },
            },
          };
        }
      }

      const nextWeekId = options.switchWeek ? toWeekId : safePrev.currentWeekId;
      const nextState: AppState = {
        ...safePrev,
        currentWeekId: nextWeekId,
        weeklyRecords: newWeeklyRecords,
        weeklyRemarks: newRemarks,
        metadata: newMetadata,
      };

      saveAppState(nextState);
      syncToCloud(nextState, true);
      return nextState;
    });
  };

  const handleClearWeekViolations = (weekId: number) => {
    setAppState((prev) => {
      const safePrev = prev || resetToInitialData();
      const newWeeklyRecords = { ...safePrev.weeklyRecords, [weekId]: {} };
      const newMeta = {
        ...safePrev.metadata,
        groupSubmissions: {
          ...(safePrev.metadata?.groupSubmissions || {}),
          [weekId]: {},
        },
      };
      const newRemarks = { ...safePrev.weeklyRemarks };
      if (newRemarks[weekId]) {
        newRemarks[weekId] = {
          groupRemarks: {
            1: { groupId: 1, leaderName: '', pros: '', cons: '', remindStudent: '', exemplaryStudent: '', selfRating: 'Tốt', updatedAt: '' },
            2: { groupId: 2, leaderName: '', pros: '', cons: '', remindStudent: '', exemplaryStudent: '', selfRating: 'Tốt', updatedAt: '' },
            3: { groupId: 3, leaderName: '', pros: '', cons: '', remindStudent: '', exemplaryStudent: '', selfRating: 'Tốt', updatedAt: '' },
            4: { groupId: 4, leaderName: '', pros: '', cons: '', remindStudent: '', exemplaryStudent: '', selfRating: 'Tốt', updatedAt: '' },
            5: { groupId: 5, leaderName: '', pros: '', cons: '', remindStudent: '', exemplaryStudent: '', selfRating: 'Tốt', updatedAt: '' },
            6: { groupId: 6, leaderName: '', pros: '', cons: '', remindStudent: '', exemplaryStudent: '', selfRating: 'Tốt', updatedAt: '' },
          },
          officerRemarks: {
            academicRemark: { authorName: '', content: '', rating: 'Tốt', updatedAt: '' },
            disciplineRemark: { authorName: '', content: '', rating: 'Tốt', updatedAt: '' },
            laborRemark: { authorName: '', content: '', rating: 'Tốt', updatedAt: '' },
            monitorRemark: { authorName: '', generalSummary: '', updatedAt: '' },
            teacherAdvice: { advice: '', isApproved: false, teacherName: '', updatedAt: '' },
          },
        };
      }
      const nextState: AppState = {
        ...safePrev,
        weeklyRecords: newWeeklyRecords,
        metadata: newMeta,
        weeklyRemarks: newRemarks,
      };
      saveAppState(nextState);
      syncToCloud(nextState, true);
      return nextState;
    });
  };

  const handleSelectStudentForQuickEntry = (student: Student) => {
    setQuickEntryStudent(student);
    setIsQuickEntryOpen(true);
  };

  // Trình xử lý các tính năng AI
  const handleOpenParentMessage = (student?: Student) => {
    // Chỉ GVCN mới có quyền mở tính năng Soạn tin nhắn phụ huynh bằng AI
    if (currentUserRole !== 'gvcn' && currentAccount?.role !== 'gvcn') {
      return;
    }
    setParentMessageStudentId(student ? student.id : null);
    setIsParentMessageOpen(true);
  };

  const handleOpenEarlyWarning = () => {
    setIsEarlyWarningOpen(true);
  };

  const handleToggleChatAssistant = () => {
    setIsChatAssistantOpen((prev) => !prev);
  };

  // VÁ LỖ HỔNG BẢO MẬT: Nếu chưa đăng nhập, CHẶN HOÀN TOÀN không cho xem Dashboard
  const isAuthenticated = currentUserRole !== 'guest' && !!currentAccount;

  if (!isAuthenticated) {
    return (
      <ManHinhDangNhap
        metadata={metadata}
        students={students}
        accounts={accounts}
        onLoginSuccess={handleLogin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Be_Vietnam_Pro',sans-serif]">
      {/* Header bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        metadata={metadata}
        weeks={weeks}
        currentWeekId={currentWeekId}
        currentAccount={currentAccount}
        syncFeedback={syncFeedback}
        onForceSync={handleForceSync}
        onSelectWeek={handleSelectWeek}
        onOpenQuickEntry={() => {
          setQuickEntryStudent(null);
          setIsQuickEntryOpen(true);
        }}
        onOpenClassRoster={() => setIsClassRosterOpen(true)}
        onOpenImportRoster={() => setIsImportModalOpen(true)}
        onOpenSettings={() => setIsClassSettingsOpen(true)}
        onOpenPrint={() => setIsPrintOpen(true)}
        onOpenCopyWeekData={() => setIsCopyWeekModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenQuickLogin={() => setIsQuickLoginOpen(true)}
        onOpenEarlyWarning={handleOpenEarlyWarning}
        onToggleChatAssistant={handleToggleChatAssistant}
        onLogout={handleLogout}
      />

      {/* Role Switcher Bar */}
      <RoleSwitcher
        currentRole={currentUserRole}
        onSelectRole={handleSelectRole}
        metadata={metadata}
        students={students}
        accounts={accounts}
        currentAccountId={currentAccountId}
        onOpenRoleRemarks={() => setIsRoleRemarksOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenQuickLogin={() => setIsQuickLoginOpen(true)}
        onOpenAccountManager={() => setIsAccountManagerOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'competition' && (
          <GroupCompetitionView
            groups={groups}
            currentWeekName={currentWeek.name}
            currentWeekId={currentWeekId}
            weeks={weeks}
            onSelectWeek={handleSelectWeek}
            currentRole={currentUserRole}
            assignedGroupIds={currentAccount?.assignedGroupIds}
            groupSubmissions={metadata.groupSubmissions}
            onConfirmGroupSubmission={handleConfirmGroupSubmission}
            groupLeaders={metadata.groupLeaders}
            onSelectStudent={handleSelectStudentForQuickEntry}
            onQuickRecordStudent={handleSelectStudentForQuickEntry}
            onAddStudent={handleAddStudent}
            onDeleteStudent={handleDeleteStudent}
            onOpenClassRoster={() => setIsClassRosterOpen(true)}
            onOpenImportRoster={() => setIsImportModalOpen(true)}
            className={metadata.className}
            teacherName={metadata.homeroomTeacher}
            onOpenRoleRemarks={() => setIsRoleRemarksOpen(true)}
          />
        )}

        {activeTab === 'weeklyTable' && (
          <WeeklyScoreTable
            students={students}
            records={currentRecords}
            currentWeekName={currentWeek.name}
            currentWeekId={currentWeekId}
            weeks={weeks}
            onSelectWeek={handleSelectWeek}
            currentRole={currentUserRole}
            assignedGroupIds={currentAccount?.assignedGroupIds}
            currentAccount={currentAccount}
            groupSubmissions={metadata.groupSubmissions}
            groupLeaders={metadata.groupLeaders}
            groups={groups}
            onUpdateRecord={handleUpdateRecord}
            onQuickRecordStudent={handleSelectStudentForQuickEntry}
            onOpenParentMessage={
              currentUserRole === 'gvcn' || currentAccount?.role === 'gvcn'
                ? handleOpenParentMessage
                : undefined
            }
            onSaveRecords={() => syncToCloud(appState, true)}
          />
        )}

        {activeTab === 'morningDuty' && (
          <MorningDutyView
            students={students}
            records={morningDutyRecords}
            currentWeekId={currentWeekId}
            currentWeekName={currentWeek.name}
            weeks={weeks}
            onSelectWeek={handleSelectWeek}
            currentRole={currentUserRole}
            assignedGroupIds={currentAccount?.assignedGroupIds}
            onAddMorningRecord={handleAddMorningRecord}
            onDeleteMorningRecord={handleDeleteMorningRecord}
          />
        )}

        {activeTab === 'afternoon' && (
          <AfternoonSessionView
            students={students}
            records={afternoonRecords}
            currentWeekId={currentWeekId}
            currentWeekName={currentWeek.name}
            weeks={weeks}
            onSelectWeek={handleSelectWeek}
            currentRole={currentUserRole}
            assignedGroupIds={currentAccount?.assignedGroupIds}
            onAddAfternoonRecord={handleAddAfternoonRecord}
            onDeleteAfternoonRecord={handleDeleteAfternoonRecord}
          />
        )}

        {activeTab === 'reports' && (
          <ReportStatsView
            groups={groups}
            students={students}
            records={currentRecords}
            currentWeek={currentWeek}
            metadata={metadata}
            onOpenPrint={() => setIsPrintOpen(true)}
            teacherGroupNotes={weeklyRemarks[currentWeekId]?.teacherGroupNotes}
            officerRemarks={weeklyRemarks[currentWeekId]?.officerRemarks}
            groupRemarks={weeklyRemarks[currentWeekId]?.groupRemarks}
          />
        )}
      </main>

      {/* Modals */}
      <QuickEntryModal
        isOpen={isQuickEntryOpen}
        onClose={() => {
          setIsQuickEntryOpen(false);
          setQuickEntryStudent(null);
        }}
        students={students}
        initialStudent={quickEntryStudent}
        currentRole={currentUserRole}
        assignedGroupIds={currentAccount?.assignedGroupIds}
        currentWeekId={currentWeekId}
        weeks={weeks}
        onSelectWeek={handleSelectWeek}
        onApplyViolation={handleApplyViolation}
      />

      <ClassRosterModal
        isOpen={isClassRosterOpen}
        onClose={() => setIsClassRosterOpen(false)}
        students={students}
        metadata={metadata}
        accounts={accounts}
        currentRole={currentUserRole}
        assignedGroupIds={currentAccount?.assignedGroupIds}
        onUpdateMetadata={handleUpdateMetadata}
        onUpdateAccounts={handleUpdateAccounts}
        onAddStudent={handleAddStudent}
        onUpdateStudent={handleUpdateStudent}
        onDeleteStudent={handleDeleteStudent}
        onResetData={handleResetData}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onClearAllStudents={handleClearAllStudents}
        onSyncAllRoles={handleSyncAllRoles}
      />

      <ImportStudentsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        currentStudents={students}
        onApplyNewRoster={handleApplyNewRoster}
      />

      <PrintReportView
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        metadata={metadata}
        currentWeek={currentWeek}
        students={students}
        records={currentRecords}
        groups={groups}
        remarks={weeklyRemarks[currentWeekId]}
      />

      <CopyWeekDataModal
        isOpen={isCopyWeekModalOpen}
        onClose={() => setIsCopyWeekModalOpen(false)}
        weeks={weeks}
        currentWeekId={currentWeekId}
        onCopyWeekData={handleCopyWeekData}
        onClearWeekViolations={handleClearWeekViolations}
      />

      <RoleRemarksModal
        isOpen={isRoleRemarksOpen}
        onClose={() => setIsRoleRemarksOpen(false)}
        currentRole={currentUserRole}
        onSelectRole={handleSelectRole}
        metadata={metadata}
        students={students}
        currentWeek={currentWeek}
        weeklyRemarks={weeklyRemarks}
        onUpdateRemarks={handleUpdateRemarks}
      />

      <ClassSettingsModal
        isOpen={isClassSettingsOpen}
        onClose={() => setIsClassSettingsOpen(false)}
        metadata={metadata}
        onUpdateMetadata={handleUpdateMetadata}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        accounts={accounts}
        students={students}
        currentAccountId={currentAccountId}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onOpenQuickLogin={() => {
          setIsAuthModalOpen(false);
          setIsQuickLoginOpen(true);
        }}
        onOpenAccountManager={() => setIsAccountManagerOpen(true)}
      />

      <QuickLoginModal
        isOpen={isQuickLoginOpen}
        onClose={() => setIsQuickLoginOpen(false)}
        students={students}
        accounts={accounts}
        metadata={metadata}
        currentAccountId={currentAccountId}
        isLoggedIn={!!currentAccount}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onOpenFullAuthModal={() => {
          setIsQuickLoginOpen(false);
          setIsAuthModalOpen(true);
        }}
      />

      <AccountManagerModal
        isOpen={isAccountManagerOpen}
        onClose={() => setIsAccountManagerOpen(false)}
        metadata={metadata}
        students={students}
        accounts={accounts}
        currentRole={currentUserRole}
        onUpdateAccounts={handleUpdateAccounts}
        onUpdateMetadata={handleUpdateMetadata}
        onUpdateStudents={handleUpdateStudentsList}
        onSelectAccount={handleLogin}
      />

      {/* 3 Tính Năng AI Cốt Lõi: Soạn Tin Nhắn PH, Cảnh Báo Sớm, Chatbot Tra Cứu */}
      <AIParentMessageModal
        isOpen={isParentMessageOpen}
        onClose={() => {
          setIsParentMessageOpen(false);
          setParentMessageStudentId(null);
        }}
        students={students}
        currentWeek={currentWeek}
        calculatedScores={allCalculatedScores}
        metadata={metadata}
        morningDuties={morningDutyRecords}
        afternoonSessions={afternoonRecords}
        initialStudentId={parentMessageStudentId}
        currentRole={currentUserRole}
        currentAccount={currentAccount}
      />

      <AIEarlyWarningModal
        isOpen={isEarlyWarningOpen}
        onClose={() => setIsEarlyWarningOpen(false)}
        students={students}
        weeks={weeks}
        currentWeekId={currentWeekId}
        calculatedScores={allCalculatedScores}
        metadata={metadata}
        morningDuties={morningDutyRecords}
        afternoonSessions={afternoonRecords}
        weeklyRecords={weeklyRecords}
        onOpenParentMessageForStudent={
          currentUserRole === 'gvcn' || currentAccount?.role === 'gvcn'
            ? (studentId) => {
                setParentMessageStudentId(studentId);
                setIsParentMessageOpen(true);
              }
            : undefined
        }
      />

      <AIChatAssistant
        metadata={metadata}
        currentWeek={currentWeek}
        students={students}
        groupSummaries={groups}
        calculatedScores={allCalculatedScores}
        morningDuties={morningDutyRecords}
        afternoonSessions={afternoonRecords}
        isOpen={isChatAssistantOpen}
        onToggle={handleToggleChatAssistant}
      />
    </div>
  );
}
