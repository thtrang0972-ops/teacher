import { UserRoleType, StudentWeeklyRecord, MorningDutyType, Student, ClassMetadata } from '../types/discipline';

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

// Danh mục tiêu chí chuyên trách của từng lớp phó
export const ACADEMIC_CRITERIA_KEYS = ['ktbKlbKsb', 'diemTot', 'phatBieu'] as const;

export const LABOR_CRITERIA_KEYS = ['khongThamGiaVS', 'xaRac', 'trucVSBan', 'huHongTS'] as const;

export const DISCIPLINE_CRITERIA_KEYS = [
  'diTre',
  'nghiCP',
  'nghiKP',
  'boTiet',
  'khongDongPhuc2',
  'khongDongPhuc5',
  'matTratTu',
  'noiTuc',
  'dungDienThoai',
  'voLeGV',
] as const;

/**
 * Kiểm tra xem vai trò hiện tại có được phép chỉnh sửa học sinh thuộc nhóm nào
 * Theo quy định:
 * - Lớp trưởng: Bao quát toàn bộ 6 nhóm
 * - 3 Lớp phó (Học tập, Lao động, Trật tự): Được quản lý học sinh toàn lớp theo chuyên môn
 * - 6 Nhóm trưởng (Nhóm 1 -> 6): Nhóm nào thì phụ trách nhóm đó, không được can thiệp nhóm khác
 * - Học sinh thông thường & Khách: Chế độ chỉ xem, tuyệt đối không được sửa
 */
export function canEditStudent(
  role: UserRoleType,
  studentGroupId: number,
  assignedGroupIds?: number[]
): boolean {
  if (role === 'guest' || role === 'hocSinh') {
    return false; // Học sinh & Khách: Chỉ xem
  }

  // GVCN và Lớp trưởng bao quát toàn lớp cả 6 nhóm
  if (role === 'gvcn' || role === 'lopTruong') {
    return true;
  }

  // 3 Lớp phó được quản lý học sinh toàn lớp nhưng giới hạn theo mặt chuyên trách
  if (role === 'lopPhoHocTap' || role === 'lopPhoLaoDong' || role === 'lopPhoTratTu') {
    return true;
  }

  // 6 Nhóm trưởng: Nhóm nào thì phụ trách nhóm đó (nhóm nào chấm nhóm đó)
  if (role.startsWith('nhomTruong')) {
    if (assignedGroupIds && assignedGroupIds.length > 0) {
      return assignedGroupIds.includes(studentGroupId);
    }
    const defaultGroup = parseInt(role.replace('nhomTruong', ''), 10);
    return studentGroupId === defaultGroup;
  }

  return false;
}

/**
 * Kiểm tra xem vai trò hiện tại có được phép ghi nhận/sửa tiêu chí nề nếp này không
 */
export function canEditCriterion(
  role: UserRoleType,
  criterionKey: keyof Omit<StudentWeeklyRecord, 'studentId' | 'note'>
): boolean {
  if (role === 'guest' || role === 'hocSinh') {
    return false;
  }

  if (role === 'gvcn' || role === 'lopTruong') {
    return true; // GVCN và Lớp trưởng bao quát mọi tiêu chí
  }

  // Nhóm trưởng được chấm tất cả các tiêu chí cho học sinh thuộc nhóm mình phụ trách
  if (role.startsWith('nhomTruong')) {
    return true;
  }

  // Lớp phó Học tập: chỉ mảng học tập
  if (role === 'lopPhoHocTap') {
    return (ACADEMIC_CRITERIA_KEYS as readonly string[]).includes(criterionKey);
  }

  // Lớp phó Lao động: chỉ mảng lao động / vệ sinh
  if (role === 'lopPhoLaoDong') {
    return (LABOR_CRITERIA_KEYS as readonly string[]).includes(criterionKey);
  }

  // Lớp phó Trật tự: chỉ mảng kỷ luật / trật tự
  if (role === 'lopPhoTratTu') {
    return (DISCIPLINE_CRITERIA_KEYS as readonly string[]).includes(criterionKey);
  }

  return false;
}

/**
 * Kiểm tra chi tiết 1 ô điểm trong bảng sổ nề nếp
 */
export function checkCellPermission(
  role: UserRoleType,
  studentGroupId: number,
  criterionKey: keyof Omit<StudentWeeklyRecord, 'studentId' | 'note'>,
  assignedGroupIds?: number[]
): PermissionCheckResult {
  // 1. Kiểm tra quyền tài khoản
  if (role === 'guest' || role === 'hocSinh') {
    return {
      allowed: false,
      reason: 'Chế độ chỉ xem. Chỉ Ban cán sự lớp & Nhóm trưởng mới có quyền ghi nhận điểm',
    };
  }

  // 2. Kiểm tra nhóm phụ trách (Nhóm nào thì phụ trách nhóm đó)
  const studentAllowed = canEditStudent(role, studentGroupId, assignedGroupIds);
  if (!studentAllowed) {
    const defaultGroup = assignedGroupIds?.join(', ') || role.replace('nhomTruong', '');
    return {
      allowed: false,
      reason: `Bạn là Nhóm trưởng Nhóm ${defaultGroup}. Theo phân quyền, bạn chỉ phụ trách học sinh thuộc Nhóm ${defaultGroup}`,
    };
  }

  // 3. Kiểm tra quyền tiêu chí chuyên trách
  const criterionAllowed = canEditCriterion(role, criterionKey);
  if (!criterionAllowed) {
    if (role === 'lopPhoHocTap') {
      return {
        allowed: false,
        reason: 'Lớp phó Học tập chỉ được nhập: KTB/KLB/KSB, Điểm tốt (9-10) và Phát biểu',
      };
    }
    if (role === 'lopPhoLaoDong') {
      return {
        allowed: false,
        reason: 'Lớp phó Lao động chỉ được nhập: Vệ sinh, Xả rác, Trực nhật bẩn, Hư hỏng tài sản',
      };
    }
    if (role === 'lopPhoTratTu') {
      return {
        allowed: false,
        reason: 'Lớp phó Trật tự chỉ được nhập: Chuyên cần, Đi trễ, Đồng phục, Trật tự, Học trái buổi',
      };
    }
    return {
      allowed: false,
      reason: 'Bạn không có quyền sửa tiêu chí này',
    };
  }

  return { allowed: true };
}

/**
 * Quyền nhập vi phạm 15 phút đầu giờ
 */
export function canRecordMorningDuty(
  role: UserRoleType,
  violationType: MorningDutyType,
  studentGroupId: number,
  assignedGroupIds?: number[]
): PermissionCheckResult {
  if (role === 'guest' || role === 'hocSinh') {
    return { allowed: false, reason: 'Chế độ chỉ xem. Bạn không có quyền ghi nhận vi phạm' };
  }

  if (role === 'gvcn' || role === 'lopTruong') return { allowed: true };

  // Nhóm trưởng: chỉ ghi nhận học sinh nhóm mình
  if (role.startsWith('nhomTruong')) {
    const isStudentOk = canEditStudent(role, studentGroupId, assignedGroupIds);
    if (!isStudentOk) {
      const gNum = assignedGroupIds?.[0] || role.replace('nhomTruong', '');
      return {
        allowed: false,
        reason: `Nhóm trưởng chỉ được ghi nhận học sinh Nhóm ${gNum}`,
      };
    }
    return { allowed: true };
  }

  // Lớp phó Học tập: chỉ ghi nhận truy bài
  if (role === 'lopPhoHocTap') {
    if (violationType === 'truyBai') return { allowed: true };
    return {
      allowed: false,
      reason: 'Lớp phó Học tập chỉ được ghi nhận vi phạm Truy bài 15p đầu giờ',
    };
  }

  // Lớp phó Lao động: chỉ ghi nhận vệ sinh
  if (role === 'lopPhoLaoDong') {
    if (violationType === 'veSinhLop') return { allowed: true };
    return {
      allowed: false,
      reason: 'Lớp phó Lao động chỉ được ghi nhận vi phạm Vệ sinh phòng học',
    };
  }

  // Lớp phó Trật tự: khăn quàng, phù hiệu, đồng phục, đi trễ, mất trật tự
  if (role === 'lopPhoTratTu') {
    if (
      violationType === 'khanQuangPhuHieu' ||
      violationType === 'dongPhuc' ||
      violationType === 'diTre15p' ||
      violationType === 'matTratTu15p'
    ) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'Lớp phó Trật tự chỉ ghi nhận: Đồng phục, Khăn quàng, Đi trễ, Trật tự 15p',
    };
  }

  return { allowed: false, reason: 'Bạn không có quyền ghi nhận vi phạm' };
}

/**
 * Quyền nhập học trái buổi
 */
export function canRecordAfternoon(
  role: UserRoleType,
  studentGroupId: number,
  assignedGroupIds?: number[]
): PermissionCheckResult {
  if (role === 'guest' || role === 'hocSinh') {
    return {
      allowed: false,
      reason: 'Chế độ chỉ xem. Bạn không có quyền điểm danh học trái buổi',
    };
  }

  if (role === 'gvcn' || role === 'lopTruong' || role === 'lopPhoTratTu') {
    return { allowed: true };
  }

  if (role.startsWith('nhomTruong')) {
    const isStudentOk = canEditStudent(role, studentGroupId, assignedGroupIds);
    if (!isStudentOk) {
      const gNum = assignedGroupIds?.[0] || role.replace('nhomTruong', '');
      return {
        allowed: false,
        reason: `Nhóm trưởng chỉ được điểm danh học sinh Nhóm ${gNum}`,
      };
    }
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'Chuyên trách điểm danh học trái buổi do Lớp phó Trật tự, Lớp trưởng & GVCN phụ trách',
  };
}

/**
 * Tóm tắt mô tả quyền hạn
 */
export function getRolePermissionBadge(
  role: UserRoleType,
  assignedGroupIds?: number[]
): {
  badgeText: string;
  badgeColor: string;
  scopeText: string;
} {
  switch (role) {
    case 'guest':
      return {
        badgeText: 'Chưa đăng nhập',
        badgeColor: 'bg-slate-100 text-slate-600 border-slate-300',
        scopeText: 'Chế độ chỉ xem. Vui lòng đăng nhập tài khoản để nhập dữ liệu',
      };
    case 'gvcn':
      return {
        badgeText: 'Toàn quyền',
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
        scopeText: 'Toàn quyền duyệt sổ, quản lý lớp, tài khoản & báo cáo',
      };
    case 'lopTruong':
      return {
        badgeText: 'Bao quát lớp',
        badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        scopeText: 'Được nhập mọi học sinh cả 6 nhóm & mọi tiêu chí thi đua',
      };
    case 'lopPhoHocTap':
      return {
        badgeText: 'Chuyên trách Học tập',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        scopeText: 'Chỉ nhập mặt học tập: KTB/KLB/KSB, Điểm tốt (9-10), Phát biểu, Truy bài',
      };
    case 'lopPhoLaoDong':
      return {
        badgeText: 'Chuyên trách Lao động',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        scopeText: 'Chỉ nhập mặt lao động: Vệ sinh bẩn, Xả rác, Trực nhật, Tài sản',
      };
    case 'lopPhoTratTu':
      return {
        badgeText: 'Chuyên trách Trật tự',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
        scopeText: 'Chỉ nhập mặt kỷ luật: Đi trễ, Khăn quàng, Đồng phục, Trật tự, Trái buổi',
      };
    case 'hocSinh': {
      const gNum = assignedGroupIds?.join(', ');
      return {
        badgeText: gNum ? `Học sinh Nhóm ${gNum}` : 'Học sinh',
        badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
        scopeText: gNum ? `Học sinh chính thức thuộc Nhóm ${gNum} (Theo dõi điểm & thi đua lớp)` : 'Học sinh của lớp',
      };
    }
    default: {
      const gNum = assignedGroupIds?.join(', ') || role.replace('nhomTruong', '');
      return {
        badgeText: `Phụ trách Nhóm ${gNum}`,
        badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
        scopeText: `Chỉ được nhập điểm & nhận xét cho học sinh thuộc Nhóm ${gNum}`,
      };
    }
  }
}

export interface StudentRoleDetermination {
  role: UserRoleType;
  title: string;
  isOfficer: boolean;
  assignedGroupIds: number[];
  avatarIcon: string;
  scopeDescription: string;
}

/**
 * Tự động nhận diện quyền hạn của học sinh theo danh sách đã gửi lên và cấu hình lớp:
 * - Lớp trưởng: Toàn quyền bao quát cả 6 nhóm
 * - Lớp phó Học tập: Chuyên trách mảng học tập toàn lớp
 * - Lớp phó Trật tự: Chuyên trách mảng kỷ luật/trật tự toàn lớp
 * - Lớp phó Lao động: Chuyên trách mảng lao động/vệ sinh toàn lớp
 * - Nhóm trưởng: Nhóm nào phụ trách nhóm đó (chỉ được nhập/sửa học sinh nhóm mình)
 * - Học sinh thông thường: Chế độ chỉ xem điểm cá nhân, KHÔNG được nhập hay sửa điểm
 */
export function determineStudentRole(
  student: Student,
  metadata?: ClassMetadata
): StudentRoleDetermination {
  const normRole = (student.role || '').toLowerCase().trim();
  const normName = student.name.toLowerCase().trim();

  // 1. Kiểm tra Lớp trưởng
  const isMonitor =
    normRole.includes('lớp trưởng') ||
    normRole.includes('lop truong') ||
    normRole === 'lt' ||
    (metadata?.monitorName && metadata.monitorName.toLowerCase().trim() === normName);

  if (isMonitor) {
    return {
      role: 'lopTruong',
      title: 'Lớp trưởng',
      isOfficer: true,
      assignedGroupIds: [1, 2, 3, 4, 5, 6],
      avatarIcon: '🎖️',
      scopeDescription: 'Được phép nhập và sửa điểm nề nếp toàn bộ 6 nhóm',
    };
  }

  // 2. Kiểm tra Lớp phó Học tập
  const isAcademic =
    normRole.includes('học tập') ||
    normRole.includes('hoc tap') ||
    normRole.includes('lpht') ||
    normRole === 'lp ht' ||
    (metadata?.academicViceMonitorName && metadata.academicViceMonitorName.toLowerCase().trim() === normName);

  if (isAcademic) {
    return {
      role: 'lopPhoHocTap',
      title: 'Lớp phó Học tập',
      isOfficer: true,
      assignedGroupIds: [1, 2, 3, 4, 5, 6],
      avatarIcon: '📚',
      scopeDescription: 'Chuyên trách nhập/sửa tiêu chí học tập: KTB/KLB/KSB, Điểm 9-10, Phát biểu, Truy bài',
    };
  }

  // 3. Kiểm tra Lớp phó Trật tự
  const isDiscipline =
    normRole.includes('trật tự') ||
    normRole.includes('trat tu') ||
    normRole.includes('lptt') ||
    normRole === 'lp tt' ||
    normRole.includes('kỷ luật') ||
    (metadata?.disciplineViceMonitorName && metadata.disciplineViceMonitorName.toLowerCase().trim() === normName) ||
    (metadata?.viceMonitorName && metadata.viceMonitorName.toLowerCase().trim() === normName);

  if (isDiscipline) {
    return {
      role: 'lopPhoTratTu',
      title: 'Lớp phó Trật tự',
      isOfficer: true,
      assignedGroupIds: [1, 2, 3, 4, 5, 6],
      avatarIcon: '🛡️',
      scopeDescription: 'Chuyên trách nhập/sửa tiêu chí kỷ luật: Đi trễ, Đồng phục, Trật tự, Trái buổi',
    };
  }

  // 4. Kiểm tra Lớp phó Lao động
  const isLabor =
    normRole.includes('lao động') ||
    normRole.includes('lao dong') ||
    normRole.includes('lpld') ||
    normRole === 'lp ld' ||
    normRole.includes('vệ sinh') ||
    (metadata?.laborViceMonitorName && metadata.laborViceMonitorName.toLowerCase().trim() === normName);

  if (isLabor) {
    return {
      role: 'lopPhoLaoDong',
      title: 'Lớp phó Lao động',
      isOfficer: true,
      assignedGroupIds: [1, 2, 3, 4, 5, 6],
      avatarIcon: '🧹',
      scopeDescription: 'Chuyên trách nhập/sửa tiêu chí lao động: Vệ sinh bẩn, Trực nhật, Xả rác, Tài sản',
    };
  }

  // 5. Kiểm tra Nhóm trưởng (Nhóm nào thì phụ trách nhóm đó)
  const isLeader =
    student.isLeader ||
    normRole.includes('nhóm trưởng') ||
    normRole.includes('nhom truong') ||
    normRole.includes('tổ trưởng') ||
    normRole === 'nt' ||
    (metadata?.groupLeaders?.[student.groupId] && metadata.groupLeaders[student.groupId].toLowerCase().trim() === normName);

  if (isLeader) {
    return {
      role: ('nhomTruong' + student.groupId),
      title: 'Nhóm trưởng Nhóm ' + student.groupId,
      isOfficer: true,
      assignedGroupIds: [student.groupId],
      avatarIcon: '🚩',
      scopeDescription: 'Nhóm trưởng Nhóm ' + student.groupId + ': Chỉ được phép nhập và sửa điểm học sinh Nhóm ' + student.groupId,
    };
  }

  // 6. Học sinh thông thường (KHÔNG ĐƯỢC PHÂN QUYỀN: CHỈ XEM ĐIỂM, KHÔNG ĐƯỢC NHẬP/SỬA)
  return {
    role: 'hocSinh',
    title: 'Học sinh Nhóm ' + student.groupId,
    isOfficer: false,
    assignedGroupIds: [student.groupId],
    avatarIcon: '👤',
    scopeDescription: 'Chế độ chỉ xem điểm cá nhân và thi đua lớp. Không có quyền nhập hay sửa điểm.',
  };
}
