import {
  Student,
  StudentWeeklyRecord,
  WeekInfo,
  ClassMetadata,
  MorningDutyRecord,
  AfternoonRecord,
  UserRoleType,
  WeeklyRemarksStore,
  UserAccount,
  ScoreAdjustmentLog,
} from '../types/discipline';
import {
  INITIAL_METADATA,
  INITIAL_STUDENTS,
  INITIAL_WEEKS,
  INITIAL_WEEK4_RECORDS,
  INITIAL_MORNING_DUTY_RECORDS,
  INITIAL_AFTERNOON_RECORDS,
  INITIAL_WEEKLY_REMARKS,
  INITIAL_ACCOUNTS,
} from '../data/initialData';

const STORAGE_KEYS = {
  METADATA: 'cn_nene_metadata_v1',
  STUDENTS: 'cn_nene_students_v1',
  WEEKS: 'cn_nene_weeks_v1',
  CURRENT_WEEK_ID: 'cn_nene_current_week_id_v1',
  RECORDS: 'cn_nene_weekly_records_v1',
  MORNING_DUTY: 'cn_nene_morning_duty_v1',
  AFTERNOON: 'cn_nene_afternoon_v1',
  CURRENT_USER_ROLE: 'cn_nene_user_role_v1',
  WEEKLY_REMARKS: 'cn_nene_weekly_remarks_v1',
  ACCOUNTS: 'cn_nene_accounts_v1',
  CURRENT_ACCOUNT_ID: 'cn_nene_current_acc_id_v1',
  AUDIT_LOGS: 'cn_nene_audit_logs_v1',
};

export interface AppState {
  metadata: ClassMetadata;
  students: Student[];
  weeks: WeekInfo[];
  currentWeekId: number;
  currentUserRole: UserRoleType;
  currentAccountId: string;
  accounts: UserAccount[];
  weeklyRecords: Record<number, Record<string, StudentWeeklyRecord>>;
  morningDutyRecords: MorningDutyRecord[];
  afternoonRecords: AfternoonRecord[];
  weeklyRemarks: Record<number, WeeklyRemarksStore>;
}

/**
 * Chuẩn hóa và khôi phục toàn bộ ghi nhận của tất cả các tuần theo danh sách học sinh hiện tại.
 * Tự động ánh xạ bản ghi từ các mã ID cũ (hs-1, hs-imp-...-1) dựa trên STT để bảo toàn 100% dữ liệu đã nhập.
 */
export function normalizeWeeklyRecordsForStudents(
  weeklyRecords: Record<number, Record<string, StudentWeeklyRecord>>,
  students: Student[]
): Record<number, Record<string, StudentWeeklyRecord>> {
  if (!students || students.length === 0 || !weeklyRecords) return weeklyRecords || {};

  const normalized: Record<number, Record<string, StudentWeeklyRecord>> = {};

  for (const [wIdStr, weekRecs] of Object.entries(weeklyRecords)) {
    const wId = Number(wIdStr);
    if (!weekRecs || typeof weekRecs !== 'object') continue;

    const normalizedWeek: Record<string, StudentWeeklyRecord> = {};
    const existingKeys = Object.keys(weekRecs);

    students.forEach((s) => {
      // 1. Khớp chính xác ID hiện tại
      let rec = weekRecs[s.id];

      // 2. Khớp theo STT nếu bản ghi được lưu với ID của lần tải danh sách trước (hs-1, hs-imp-...-1)
      if (!rec) {
        const candidateKeys = existingKeys.filter(
          (k) => k.endsWith(`-${s.stt}`) || k === `hs-${s.stt}` || k === String(s.stt)
        );
        if (candidateKeys.length > 0) {
          const keyWithData = candidateKeys.find((k) => {
            const r = weekRecs[k];
            if (!r) return false;
            return (
              (r.diTre || 0) > 0 ||
              (r.nghiCP || 0) > 0 ||
              (r.nghiKP || 0) > 0 ||
              (r.boTiet || 0) > 0 ||
              (r.ktbKlbKsb || 0) > 0 ||
              (r.khongDongPhuc2 || 0) > 0 ||
              (r.diemTot || 0) > 0 ||
              (r.phatBieu || 0) > 0 ||
              (r.khongDongPhuc5 || 0) > 0 ||
              (r.matTratTu || 0) > 0 ||
              (r.khongThamGiaVS || 0) > 0 ||
              (r.noiTuc || 0) > 0 ||
              (r.xaRac || 0) > 0 ||
              (r.trucVSBan || 0) > 0 ||
              (r.huHongTS || 0) > 0 ||
              (r.voLeGV || 0) > 0 ||
              (r.dungDienThoai || 0) > 0 ||
              (r.viPhamKhac || 0) > 0 ||
              !!r.note
            );
          });
          rec = weekRecs[keyWithData || candidateKeys[0]];
        }
      }

      normalizedWeek[s.id] = rec
        ? {
            studentId: s.id,
            diTre: rec.diTre || 0,
            nghiCP: rec.nghiCP || 0,
            nghiKP: rec.nghiKP || 0,
            boTiet: rec.boTiet || 0,
            ktbKlbKsb: rec.ktbKlbKsb || 0,
            khongDongPhuc2: rec.khongDongPhuc2 || 0,
            diemTot: rec.diemTot || 0,
            phatBieu: rec.phatBieu || 0,
            khongDongPhuc5: rec.khongDongPhuc5 || 0,
            matTratTu: rec.matTratTu || 0,
            khongThamGiaVS: rec.khongThamGiaVS || 0,
            noiTuc: rec.noiTuc || 0,
            xaRac: rec.xaRac || 0,
            trucVSBan: rec.trucVSBan || 0,
            huHongTS: rec.huHongTS || 0,
            voLeGV: rec.voLeGV || 0,
            dungDienThoai: rec.dungDienThoai || 0,
            viPhamKhac: rec.viPhamKhac || 0,
            note: rec.note || '',
          }
        : {
            studentId: s.id,
            diTre: 0,
            nghiCP: 0,
            nghiKP: 0,
            boTiet: 0,
            ktbKlbKsb: 0,
            khongDongPhuc2: 0,
            diemTot: 0,
            phatBieu: 0,
            khongDongPhuc5: 0,
            matTratTu: 0,
            khongThamGiaVS: 0,
            noiTuc: 0,
            xaRac: 0,
            trucVSBan: 0,
            huHongTS: 0,
            voLeGV: 0,
            dungDienThoai: 0,
            viPhamKhac: 0,
            note: '',
          };
    });

    normalized[wId] = normalizedWeek;
  }

  // Khởi tạo tuần 6 nếu chưa có
  if (students.length > 0 && !normalized[6]) {
    const cleanW6: Record<string, StudentWeeklyRecord> = {};
    students.forEach((s) => {
      cleanW6[s.id] = {
        studentId: s.id,
        diTre: 0,
        nghiCP: 0,
        nghiKP: 0,
        boTiet: 0,
        ktbKlbKsb: 0,
        khongDongPhuc2: 0,
        diemTot: 0,
        phatBieu: 0,
        khongDongPhuc5: 0,
        matTratTu: 0,
        khongThamGiaVS: 0,
        noiTuc: 0,
        xaRac: 0,
        trucVSBan: 0,
        huHongTS: 0,
        voLeGV: 0,
        dungDienThoai: 0,
        viPhamKhac: 0,
        note: '',
      };
    });
    normalized[6] = cleanW6;
  }

  return normalized;
}

export function loadAppState(): AppState {
  try {
    const rawMeta = localStorage.getItem(STORAGE_KEYS.METADATA);
    const rawStudents = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    const rawWeeks = localStorage.getItem(STORAGE_KEYS.WEEKS);
    const rawWeekId = localStorage.getItem(STORAGE_KEYS.CURRENT_WEEK_ID);
    const rawRecords = localStorage.getItem(STORAGE_KEYS.RECORDS);
    const rawMorning = localStorage.getItem(STORAGE_KEYS.MORNING_DUTY);
    const rawAfternoon = localStorage.getItem(STORAGE_KEYS.AFTERNOON);
    const rawRole = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ROLE);
    const rawRemarks = localStorage.getItem(STORAGE_KEYS.WEEKLY_REMARKS);
    const rawAccounts = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
    const rawAccountId = localStorage.getItem(STORAGE_KEYS.CURRENT_ACCOUNT_ID);

    const metadata: ClassMetadata = rawMeta ? JSON.parse(rawMeta) : INITIAL_METADATA;
    if (metadata.homeroomTeacher === 'Cô Nguyễn Thị Mai Phương' || metadata.homeroomTeacher?.includes('Mai Phương') || !metadata.homeroomTeacher) {
      metadata.homeroomTeacher = 'Cô Nguyễn Thị Thuỳ Trang';
    }

    let students: Student[] = rawStudents ? JSON.parse(rawStudents) : INITIAL_STUDENTS;
    
    // Tự động xoá sạch danh sách học sinh mẫu cũ (Nguyễn Văn An, Trần Gia Hưng...) nếu còn lưu từ phiên trước
    const hasLegacyMockStudents = Array.isArray(students) && students.some(
      (s) => (s.id === 'hs-1' && s.name === 'Nguyễn Văn An') || (s.id === 'hs-8' && s.name === 'Trần Gia Hưng')
    );
    if (hasLegacyMockStudents) {
      students = [];
      metadata.monitorName = '';
      metadata.academicViceMonitorName = '';
      metadata.laborViceMonitorName = '';
      metadata.disciplineViceMonitorName = '';
      metadata.viceMonitorName = '';
      metadata.groupLeaders = {};
    }

    const weeks: WeekInfo[] = rawWeeks ? JSON.parse(rawWeeks) : INITIAL_WEEKS;
    const parsedWeekId = rawWeekId ? JSON.parse(rawWeekId) : 5;
    const currentWeekId: number = typeof parsedWeekId === 'number' && parsedWeekId > 0 ? parsedWeekId : 5;
    const currentUserRole: UserRoleType = rawRole ? (rawRole as UserRoleType) : 'gvcn';
    const accounts: UserAccount[] = rawAccounts ? JSON.parse(rawAccounts) : INITIAL_ACCOUNTS;
    // Cập nhật tên GVCN và quyền nhóm 1 nếu lưu từ phiên trước
    accounts.forEach((acc) => {
      if (acc.id === 'acc-gvcn' && (acc.displayName?.includes('Mai Phương') || !acc.displayName)) {
        acc.displayName = 'Cô Nguyễn Thị Thuỳ Trang';
      }
      if (acc.id === 'acc-nhom1') {
        acc.assignedGroupIds = [2];
      }
    });

    const currentAccountId: string = rawAccountId !== null ? rawAccountId : 'acc-gvcn';
    const weeklyRemarks: Record<number, WeeklyRemarksStore> = rawRemarks
      ? JSON.parse(rawRemarks)
      : INITIAL_WEEKLY_REMARKS;
    
    // Đồng bộ tên GVCN trong lời dặn nếu cần
    Object.values(weeklyRemarks).forEach((w) => {
      if (w.officerRemarks?.teacherAdvice?.teacherName?.includes('Mai Phương')) {
        w.officerRemarks.teacherAdvice.teacherName = 'Cô Nguyễn Thị Thuỳ Trang (GVCN)';
      }
    });
    
    let weeklyRecords: Record<number, Record<string, StudentWeeklyRecord>> = {};
    if (rawRecords && !hasLegacyMockStudents) {
      weeklyRecords = JSON.parse(rawRecords);
    } else {
      weeklyRecords = {};
    }

    // Chuẩn hóa và khôi phục toàn bộ dữ liệu của tất cả các tuần đã nhập
    if (students.length > 0) {
      weeklyRecords = normalizeWeeklyRecordsForStudents(weeklyRecords, students);
    }

    if (!weeklyRemarks[6]) {
      weeklyRemarks[6] = {
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

    const morningDutyRecords: MorningDutyRecord[] = rawMorning
      ? JSON.parse(rawMorning)
      : INITIAL_MORNING_DUTY_RECORDS;

    const afternoonRecords: AfternoonRecord[] = rawAfternoon
      ? JSON.parse(rawAfternoon)
      : INITIAL_AFTERNOON_RECORDS;

    return {
      metadata,
      students,
      weeks,
      currentWeekId,
      currentUserRole,
      currentAccountId,
      accounts,
      weeklyRecords,
      morningDutyRecords,
      afternoonRecords,
      weeklyRemarks,
    };
  } catch (err) {
    console.error('Lỗi khi tải dữ liệu từ localStorage, sử dụng dữ liệu mặc định:', err);
    return {
      metadata: INITIAL_METADATA,
      students: INITIAL_STUDENTS,
      weeks: INITIAL_WEEKS,
      currentWeekId: 4,
      currentUserRole: 'gvcn',
      currentAccountId: 'acc-gvcn',
      accounts: INITIAL_ACCOUNTS,
      weeklyRecords: { 4: INITIAL_WEEK4_RECORDS },
      morningDutyRecords: INITIAL_MORNING_DUTY_RECORDS,
      afternoonRecords: INITIAL_AFTERNOON_RECORDS,
      weeklyRemarks: INITIAL_WEEKLY_REMARKS,
    };
  }
}

export function saveAppState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEYS.METADATA, JSON.stringify(state.metadata));
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(state.students));
    localStorage.setItem(STORAGE_KEYS.WEEKS, JSON.stringify(state.weeks));
    localStorage.setItem(STORAGE_KEYS.CURRENT_WEEK_ID, JSON.stringify(state.currentWeekId));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ROLE, state.currentUserRole);
    localStorage.setItem(STORAGE_KEYS.CURRENT_ACCOUNT_ID, state.currentAccountId);
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(state.accounts));
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(state.weeklyRecords));
    localStorage.setItem(STORAGE_KEYS.MORNING_DUTY, JSON.stringify(state.morningDutyRecords));
    localStorage.setItem(STORAGE_KEYS.AFTERNOON, JSON.stringify(state.afternoonRecords));
    localStorage.setItem(STORAGE_KEYS.WEEKLY_REMARKS, JSON.stringify(state.weeklyRemarks));
  } catch (err) {
    console.error('Không thể lưu state vào localStorage:', err);
  }
}

export function resetToInitialData(): AppState {
  localStorage.clear();
  return {
    metadata: INITIAL_METADATA,
    students: INITIAL_STUDENTS,
    weeks: INITIAL_WEEKS,
    currentWeekId: 4,
    currentUserRole: 'gvcn',
    currentAccountId: 'acc-gvcn',
    accounts: INITIAL_ACCOUNTS,
    weeklyRecords: { 4: INITIAL_WEEK4_RECORDS },
    morningDutyRecords: INITIAL_MORNING_DUTY_RECORDS,
    afternoonRecords: INITIAL_AFTERNOON_RECORDS,
    weeklyRemarks: INITIAL_WEEKLY_REMARKS,
  };
}

export function exportBackupJSON(state: AppState): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadAnchor.setAttribute('download', `NeNep_Lop_${state.metadata.className}_${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// ============================================================================
// QUẢN LÝ NHẬT KÝ CHỈNH SỬA ĐIỂM (AUDIT LOGS)
// ============================================================================
export function loadAuditLogs(): ScoreAdjustmentLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAuditLogs(logs: ScoreAdjustmentLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs.slice(0, 500)));
  } catch (err) {
    console.error('Không thể lưu nhật ký sửa điểm:', err);
  }
}

export function addAuditLog(entry: Omit<ScoreAdjustmentLog, 'id' | 'timestamp'>): ScoreAdjustmentLog {
  const newLog: ScoreAdjustmentLog = {
    ...entry,
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
  };
  const currentLogs = loadAuditLogs();
  const updatedLogs = [newLog, ...currentLogs];
  saveAuditLogs(updatedLogs);
  return newLog;
}
