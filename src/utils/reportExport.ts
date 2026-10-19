import * as XLSX from 'xlsx';
import {
  Student,
  StudentWeeklyRecord,
  GroupSummary,
  WeekInfo,
  ClassMetadata,
  WeeklyRemarksStore,
} from '../types/discipline';
import { CRITERIA_LIST, calculateStudentScore } from './scoring';
import { formatDateVN, formatFullTextDateVN } from './date';

export interface ReportExportData {
  metadata: ClassMetadata;
  currentWeek: WeekInfo;
  students: Student[];
  records: Record<string, StudentWeeklyRecord>;
  groups: GroupSummary[];
  remarks?: WeeklyRemarksStore;
}

/**
 * 1. XUẤT BÁO CÁO THI ĐUA NỀ NẾP RA FILE EXCEL (.xlsx)
 * Bao gồm đầy đủ 3 Sheet:
 * - Sheet 1: Xếp Hạng 6 Nhóm (Điểm TB, Vi phạm, Điểm cộng, Xếp hạng, Khen thưởng)
 * - Sheet 2: Sổ Nề Nếp Chi Tiết (Tất cả 43 học sinh x các cột vi phạm chuẩn THCS)
 * - Sheet 3: Nhận Xét & Lời Dặn (Ý kiến ban cán sự, nhóm trưởng & GVCN)
 */
export function exportWeeklyReportToExcel(data: ReportExportData): void {
  const { metadata, currentWeek, students, records, groups, remarks } = data;
  const calculatedList = students.map((s) => calculateStudentScore(s, records[s.id]));

  const workbook = XLSX.utils.book_new();

  // === SHEET 1: XẾP HẠNG 6 NHÓM ===
  const groupRows = groups.map((g) => ({
    'Thứ hạng': g.rank === 1 ? 'Hạng 1 (Nhất)' : `Hạng ${g.rank}`,
    'Tên nhóm': g.groupName,
    'Nhóm trưởng': g.leaderName,
    'Sĩ số': g.memberCount,
    'Điểm TB nhóm': g.averageScore,
    'Tổng điểm trừ': -g.totalPenalty,
    'Tổng điểm cộng': g.totalBonus,
    'Số HS Tốt': g.goodCount,
    'Số HS Khá': g.fairCount,
    'Số HS Đạt': g.passCount,
    'Số HS Chưa đạt': g.failCount,
    'Khen thưởng tuần':
      g.rank === 1
        ? 'Nhận phần thưởng tuần'
        : g.rank === 2
        ? 'Cờ Vàng'
        : g.rank === 3
        ? 'Cờ Xanh'
        : 'Đạt chuẩn',
    'Ghi chú GVCN': remarks?.teacherGroupNotes?.[g.groupId] || '',
  }));

  const wsGroups = XLSX.utils.json_to_sheet(groupRows);
  wsGroups['!cols'] = [
    { wch: 15 },
    { wch: 14 },
    { wch: 22 },
    { wch: 8 },
    { wch: 14 },
    { wch: 14 },
    { wch: 15 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
    { wch: 22 },
    { wch: 35 },
  ];
  XLSX.utils.book_append_sheet(workbook, wsGroups, 'Xep_Hang_6_Nhom');

  // === SHEET 2: BẢNG NỀ NẾP CHI TIẾT TỪNG HỌC SINH ===
  const studentRows = calculatedList.map((item, idx) => ({
    'STT': idx + 1,
    'Họ và tên học sinh': item.student.name,
    'Nhóm': item.student.groupId,
    'Giới tính': item.student.gender || 'Nam',
    'Chức vụ': item.student.role || (item.student.isLeader ? 'Nhóm trưởng' : 'Thành viên'),
    'Đi trễ (-2)': item.record.diTre || 0,
    'Nghỉ CP (-2)': item.record.nghiCP || 0,
    'Nghỉ KP (-4)': item.record.nghiKP || 0,
    'Bỏ tiết (-2)': item.record.boTiet || 0,
    'KTB/KLB/KSB (-2)': item.record.ktbKlbKsb || 0,
    'Không ĐP thứ 2 (-2)': item.record.khongDongPhuc2 || 0,
    'Điểm tốt 9-10 (+2)': item.record.diemTot || 0,
    'Phát biểu (+1)': item.record.phatBieu || 0,
    'Không ĐP/Khăn quàng (-5)': item.record.khongDongPhuc5 || 0,
    'Mất trật tự (-2)': item.record.matTratTu || 0,
    'Không tham gia VS (-2)': item.record.khongThamGiaVS || 0,
    'Nói tục chửi thề (-2)': item.record.noiTuc || 0,
    'Xả rác (-2)': item.record.xaRac || 0,
    'Trực nhật bẩn (-2)': item.record.trucVSBan || 0,
    'Hư hỏng tài sản (-5)': item.record.huHongTS || 0,
    'Vô lễ GV (-5)': item.record.voLeGV || 0,
    'Dùng ĐT trong giờ (-10)': item.record.dungDienThoai || 0,
    'Vi phạm khác (-2)': item.record.viPhamKhac || 0,
    'Điểm chuẩn': item.baseScore,
    'Tổng điểm trừ': -item.totalPenalty,
    'Tổng điểm cộng': item.totalBonus,
    'Điểm nề nếp tuần': item.finalScore,
    'Xếp loại': item.classification,
    'Ghi chú vi phạm cụ thể': item.record.note || '',
  }));

  const wsStudents = XLSX.utils.json_to_sheet(studentRows);
  wsStudents['!cols'] = [
    { wch: 6 },
    { wch: 25 },
    { wch: 8 },
    { wch: 10 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
    { wch: 18 },
    { wch: 16 },
    { wch: 14 },
    { wch: 22 },
    { wch: 15 },
    { wch: 20 },
    { wch: 18 },
    { wch: 12 },
    { wch: 15 },
    { wch: 18 },
    { wch: 12 },
    { wch: 20 },
    { wch: 12 },
    { wch: 14 },
    { wch: 15 },
    { wch: 16 },
    { wch: 12 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(workbook, wsStudents, 'So_Ne_Nep_Chi_Tiet');

  // === SHEET 3: Ý KIẾN NHẬN XÉT CỦA BAN CÁN SỰ & GVCN ===
  const remarkRows = [
    { 'Bộ phận': 'Lớp trưởng', 'Họ tên': remarks?.officerRemarks.monitorRemark.authorName || metadata.monitorName, 'Nội dung nhận xét': remarks?.officerRemarks.monitorRemark.generalSummary || 'Lớp duy trì nề nếp tốt trong tuần.' },
    { 'Bộ phận': 'Lớp phó Học tập', 'Họ tên': remarks?.officerRemarks.academicRemark.authorName || metadata.academicViceMonitorName, 'Nội dung nhận xét': remarks?.officerRemarks.academicRemark.content || 'Nề nếp học tập nghiêm túc.' },
    { 'Bộ phận': 'Lớp phó Lao động', 'Họ tên': remarks?.officerRemarks.laborRemark.authorName || metadata.laborViceMonitorName, 'Nội dung nhận xét': remarks?.officerRemarks.laborRemark.content || 'Vệ sinh phòng học sạch sẽ.' },
    { 'Bộ phận': 'Lớp phó Trật tự', 'Họ tên': remarks?.officerRemarks.disciplineRemark.authorName || metadata.disciplineViceMonitorName, 'Nội dung nhận xét': remarks?.officerRemarks.disciplineRemark.content || 'Kỷ luật và đồng phục đảm bảo.' },
    { 'Bộ phận': 'Giáo viên chủ nhiệm', 'Họ tên': metadata.homeroomTeacher, 'Nội dung nhận xét': remarks?.officerRemarks.teacherAdvice.advice || 'GVCN phê duyệt kết quả thi đua và biểu dương các nhóm dẫn đầu.' },
  ];
  const wsRemarks = XLSX.utils.json_to_sheet(remarkRows);
  wsRemarks['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(workbook, wsRemarks, 'Nhan_Xet_Ban_Can_Su');

  const fileName = `Bao_Cao_Ne_Nep_${currentWeek.name.replace(/\s+/g, '_')}_Lop_${metadata.className}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * 2. XUẤT BÁO CÁO THI ĐUA NỀ NẾP RA FILE WORD (.doc / .docx)
 * Chuẩn thể thức văn bản hành chính Việt Nam (Quốc hiệu, Tiêu ngữ, Bảng thi đua, Sổ chi tiết, Nhận xét, Chữ ký 3 bên)
 */
export function exportWeeklyReportToWord(data: ReportExportData): void {
  const { metadata, currentWeek, students, records, groups, remarks } = data;
  const calculatedList = students.map((s) => calculateStudentScore(s, records[s.id]));

  const schoolName = metadata.schoolName ? metadata.schoolName.toUpperCase() : 'TRƯỜNG TH VÀ THCS PHƯỚC HƯNG';
  const className = metadata.className || '9A3';
  const teacherName = metadata.homeroomTeacher || 'Cô Nguyễn Thị Thuỳ Trang';
  const dateRangeStr = `Từ ngày ${formatDateVN(currentWeek.startDate)} đến ngày ${formatDateVN(currentWeek.endDate)}`;
  const signDateStr = formatFullTextDateVN(currentWeek.endDate);

  // Tạo HTML table cho 6 nhóm
  const groupsTableHtml = `
    <table border="1" cellspacing="0" cellpadding="5" style="border-collapse:collapse; width:100%; text-align:center; font-family:'Times New Roman', Times, serif; font-size:11pt; margin-bottom:15px;">
      <thead>
        <tr style="background-color:#f0f4f8; font-weight:bold;">
          <th style="padding:6px; border:1px solid #333;">Thứ hạng</th>
          <th style="padding:6px; border:1px solid #333;">Tên nhóm</th>
          <th style="padding:6px; border:1px solid #333;">Nhóm trưởng</th>
          <th style="padding:6px; border:1px solid #333;">Sĩ số</th>
          <th style="padding:6px; border:1px solid #333;">Điểm TB nhóm</th>
          <th style="padding:6px; border:1px solid #333;">Tổng trừ</th>
          <th style="padding:6px; border:1px solid #333;">Tổng cộng</th>
          <th style="padding:6px; border:1px solid #333;">HS Tốt</th>
          <th style="padding:6px; border:1px solid #333;">Khen thưởng</th>
        </tr>
      </thead>
      <tbody>
        ${groups
          .map(
            (g) => `
          <tr>
            <td style="padding:5px; border:1px solid #333; font-weight:bold;">${g.rank === 1 ? 'Hạng 1 (Nhất)' : `Hạng ${g.rank}`}</td>
            <td style="padding:5px; border:1px solid #333; font-weight:bold;">${g.groupName}</td>
            <td style="padding:5px; border:1px solid #333;">${g.leaderName}</td>
            <td style="padding:5px; border:1px solid #333;">${g.memberCount}</td>
            <td style="padding:5px; border:1px solid #333; font-weight:bold; color:#1a365d;">${g.averageScore}</td>
            <td style="padding:5px; border:1px solid #333; color:#b91c1c; font-weight:bold;">-${g.totalPenalty}đ</td>
            <td style="padding:5px; border:1px solid #333; color:#047857; font-weight:bold;">+${g.totalBonus}đ</td>
            <td style="padding:5px; border:1px solid #333;">${g.goodCount}</td>
            <td style="padding:5px; border:1px solid #333;">${g.rank === 1 ? 'Phần thưởng tuần' : g.rank === 2 ? 'Cờ Vàng' : g.rank === 3 ? 'Cờ Xanh' : 'Đạt chuẩn'}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `;

  // Tạo HTML table chi tiết từng học sinh
  const studentsTableHtml = `
    <table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse; width:100%; text-align:center; font-family:'Times New Roman', Times, serif; font-size:9.5pt;">
      <thead>
        <tr style="background-color:#e2e8f0; font-weight:bold;">
          <th rowspan="2" style="border:1px solid #333; width:25px;">STT</th>
          <th rowspan="2" style="border:1px solid #333; text-align:left; min-width:130px;">Họ tên học sinh</th>
          <th rowspan="2" style="border:1px solid #333; width:30px;">Nhóm</th>
          <th rowspan="2" style="border:1px solid #333;">Đi trễ<br>-2</th>
          <th colspan="2" style="border:1px solid #333;">Nghỉ học</th>
          <th rowspan="2" style="border:1px solid #333;">Bỏ tiết<br>-2</th>
          <th rowspan="2" style="border:1px solid #333;">KTB<br>-2</th>
          <th rowspan="2" style="border:1px solid #333;">K.ĐP<br>-2</th>
          <th rowspan="2" style="border:1px solid #333; background-color:#ecfdf5;">Điểm tốt<br>+2 / +1</th>
          <th rowspan="2" style="border:1px solid #333;">Mất TT<br>-2</th>
          <th rowspan="2" style="border:1px solid #333;">K.VS<br>-2</th>
          <th rowspan="2" style="border:1px solid #333;">Nói tục<br>-2</th>
          <th rowspan="2" style="border:1px solid #333;">Xả rác<br>-2</th>
          <th rowspan="2" style="border:1px solid #333;">Trực bẩn<br>-2</th>
          <th rowspan="2" style="border:1px solid #333;">Hư TS<br>-5</th>
          <th rowspan="2" style="border:1px solid #333;">Vô lễ<br>-5</th>
          <th rowspan="2" style="border:1px solid #333; color:#b91c1c;">Dùng ĐT<br>-10</th>
          <th rowspan="2" style="border:1px solid #333; color:#b91c1c;">VP khác<br>-2</th>
          <th rowspan="2" style="border:1px solid #333; background-color:#e2e8f0; font-weight:bold;">Đ.Chuẩn</th>
          <th rowspan="2" style="border:1px solid #333;">+/-</th>
          <th rowspan="2" style="border:1px solid #333; background-color:#dbeafe; font-weight:bold;">Tổng điểm</th>
          <th rowspan="2" style="border:1px solid #333;">Xếp loại</th>
        </tr>
        <tr style="background-color:#edf2f7; font-weight:bold;">
          <th style="border:1px solid #333;">CP -2</th>
          <th style="border:1px solid #333; color:#b91c1c;">KP -4</th>
        </tr>
      </thead>
      <tbody>
        ${calculatedList
          .map(
            (item, idx) => `
          <tr>
            <td style="border:1px solid #333;">${idx + 1}</td>
            <td style="border:1px solid #333; text-align:left; font-weight:500;">${item.student.name}</td>
            <td style="border:1px solid #333;">N${item.student.groupId}</td>
            <td style="border:1px solid #333;">${item.record.diTre || ''}</td>
            <td style="border:1px solid #333;">${item.record.nghiCP || ''}</td>
            <td style="border:1px solid #333; color:#b91c1c; font-weight:bold;">${item.record.nghiKP || ''}</td>
            <td style="border:1px solid #333;">${item.record.boTiet || ''}</td>
            <td style="border:1px solid #333;">${item.record.ktbKlbKsb || ''}</td>
            <td style="border:1px solid #333;">${item.record.khongDongPhuc2 || ''}</td>
            <td style="border:1px solid #333; background-color:#f0fdf4; color:#047857; font-weight:bold;">
              ${item.record.diemTot > 0 ? `${item.record.diemTot}đt ` : ''}${item.record.phatBieu > 0 ? `${item.record.phatBieu}pb` : ''}
            </td>
            <td style="border:1px solid #333;">${item.record.matTratTu || ''}</td>
            <td style="border:1px solid #333;">${item.record.khongThamGiaVS || ''}</td>
            <td style="border:1px solid #333;">${item.record.noiTuc || ''}</td>
            <td style="border:1px solid #333;">${item.record.xaRac || ''}</td>
            <td style="border:1px solid #333;">${item.record.trucVSBan || ''}</td>
            <td style="border:1px solid #333;">${item.record.huHongTS || ''}</td>
            <td style="border:1px solid #333;">${item.record.voLeGV || ''}</td>
            <td style="border:1px solid #333; color:#b91c1c; font-weight:bold;">${item.record.dungDienThoai || ''}</td>
            <td style="border:1px solid #333; color:#b91c1c; font-weight:bold;">${item.record.viPhamKhac || ''}</td>
            <td style="border:1px solid #333; font-weight:bold;">100</td>
            <td style="border:1px solid #333; font-weight:bold;">${item.netChange > 0 ? `+${item.netChange}` : item.netChange < 0 ? `${item.netChange}` : '0'}</td>
            <td style="border:1px solid #333; font-weight:bold; background-color:#eff6ff; font-size:10pt;">${item.finalScore}</td>
            <td style="border:1px solid #333; font-weight:bold;">${item.classification}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `;

  // Nội dung toàn bộ file Word
  const wordDocumentContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>Báo Cáo Nề Nếp ${currentWeek.name} - Lớp ${className}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page {
          size: A4 landscape;
          margin: 1.5cm 1.5cm 1.5cm 1.5cm;
          mso-page-orientation: landscape;
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 11pt;
          line-height: 1.3;
          color: #000;
        }
        h1, h2, h3, p { margin: 0 0 6px 0; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .uppercase { text-transform: uppercase; }
        .italic { font-style: italic; }
      </style>
    </head>
    <body>
      <!-- QUỐC HIỆU TIÊU NGỮ -->
      <table style="width:100%; border:none; margin-bottom:15px;">
        <tr>
          <td style="width:50%; text-align:center; vertical-align:top; border:none;">
            <p class="font-bold uppercase" style="font-size:10pt;">${schoolName}</p>
            <p class="font-bold uppercase" style="font-size:11pt; color:#1e3a8a;">CHI ĐỘI LỚP ${className}</p>
            <p style="font-size:9pt; color:#555;">Năm học: ${metadata.academicYear || '2026 - 2027'} ${metadata.semester ? `(Học kỳ ${metadata.semester})` : ''}</p>
          </td>
          <td style="width:50%; text-align:center; vertical-align:top; border:none;">
            <p class="font-bold uppercase" style="font-size:10.5pt;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p class="font-bold" style="font-size:10pt; text-decoration:underline;">Độc lập - Tự do - Hạnh phúc</p>
          </td>
        </tr>
      </table>

      <!-- TIÊU ĐỀ BÁO CÁO -->
      <div class="text-center" style="margin-bottom:18px;">
        <h1 class="font-bold uppercase" style="font-size:15pt; color:#0f172a;">BẢNG THEO DÕI NỀ NẾP & THI ĐUA HỌC SINH</h1>
        <p class="font-bold uppercase" style="font-size:11.5pt; color:#1e40af;">${currentWeek.name.toUpperCase()} (${dateRangeStr.toUpperCase()})</p>
        <p class="italic" style="font-size:10pt; color:#475569;">GVCN: ${teacherName} · Sĩ số: ${students.length} học sinh · Chia đều 6 nhóm thi đua</p>
      </div>

      <!-- MỤC 1: KẾT QUẢ THI ĐUA 6 NHÓM -->
      <h2 class="font-bold uppercase" style="font-size:11pt; color:#0f172a; margin-bottom:6px;">1. KẾT QUẢ THI ĐUA GIỮA 6 NHÓM TRONG TUẦN:</h2>
      ${groupsTableHtml}

      <!-- MỤC 2: BẢNG NỀ NẾP CHI TIẾT TỪNG HỌC SINH -->
      <h2 class="font-bold uppercase" style="font-size:11pt; color:#0f172a; margin-bottom:6px; page-break-before:auto;">2. BẢNG THEO DÕI NỀ NẾP TỪNG HỌC SINH (QUY CHUẨN THCS):</h2>
      ${studentsTableHtml}

      <!-- MỤC 3: NHẬN XÉT CỦA BAN CÁN SỰ & GVCN -->
      <div style="margin-top:18px;">
        <h2 class="font-bold uppercase" style="font-size:11pt; color:#0f172a; margin-bottom:8px;">3. Ý KIẾN NHẬN XÉT CỦA BAN CÁN SỰ & GIÁO VIÊN CHỦ NHIỆM:</h2>
        <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse; width:100%; font-size:10.5pt; border:1px solid #cbd5e1;">
          <tr>
            <td style="width:25%; font-weight:bold; background-color:#f1f5f9; border:1px solid #cbd5e1;">Lớp phó Học tập</td>
            <td style="border:1px solid #cbd5e1;"><strong style="color:#1e40af;">${remarks?.officerRemarks.academicRemark.authorName || metadata.academicViceMonitorName || 'LP Học tập'}:</strong> <em>${remarks?.officerRemarks.academicRemark.content || 'Nề nếp học tập duy trì tốt, nhiều bạn tích cực phát biểu.'}</em></td>
          </tr>
          <tr>
            <td style="font-weight:bold; background-color:#f1f5f9; border:1px solid #cbd5e1;">Lớp phó Lao động</td>
            <td style="border:1px solid #cbd5e1;"><strong style="color:#047857;">${remarks?.officerRemarks.laborRemark.authorName || metadata.laborViceMonitorName || 'LP Lao động'}:</strong> <em>${remarks?.officerRemarks.laborRemark.content || 'Vệ sinh phòng học sạch sẽ, các nhóm trực nhật đúng giờ.'}</em></td>
          </tr>
          <tr>
            <td style="font-weight:bold; background-color:#f1f5f9; border:1px solid #cbd5e1;">Lớp phó Trật tự</td>
            <td style="border:1px solid #cbd5e1;"><strong style="color:#b45309;">${remarks?.officerRemarks.disciplineRemark.authorName || metadata.disciplineViceMonitorName || 'LP Trật tự'}:</strong> <em>${remarks?.officerRemarks.disciplineRemark.content || 'Kỷ luật và đồng phục đảm bảo nghiêm túc.'}</em></td>
          </tr>
          <tr>
            <td style="font-weight:bold; background-color:#f1f5f9; border:1px solid #cbd5e1;">Tổng hợp Lớp trưởng</td>
            <td style="border:1px solid #cbd5e1;"><strong style="color:#4338ca;">${remarks?.officerRemarks.monitorRemark.authorName || metadata.monitorName || 'Lớp trưởng'}:</strong> <em>${remarks?.officerRemarks.monitorRemark.generalSummary || 'Lớp hoàn thành tốt các chỉ tiêu thi đua tuần.'}</em></td>
          </tr>
          <tr style="background-color:#faf5ff;">
            <td style="font-weight:bold; color:#6b21a8; border:1px solid #cbd5e1;">Lời dặn của GVCN</td>
            <td style="border:1px solid #cbd5e1;"><strong style="color:#6b21a8;">${teacherName}:</strong> <em>${remarks?.officerRemarks.teacherAdvice.advice || 'GVCN phê duyệt kết quả thi đua và biểu dương các nhóm dẫn đầu.'}</em></td>
          </tr>
        </table>
      </div>

      <!-- NGÀY THÁNG & CHỮ KÝ 3 BÊN -->
      <div style="margin-top:20px; page-break-inside:avoid;">
        <div class="text-right italic" style="margin-bottom:12px; font-size:10.5pt;">
          ${signDateStr}
        </div>
        <table style="width:100%; border:none; text-align:center;">
          <tr>
            <td style="width:33.3%; border:none; vertical-align:top;">
              <p class="font-bold uppercase" style="font-size:10.5pt;">NGƯỜI LẬP BIỂU</p>
              <p class="italic" style="font-size:9.5pt; color:#666;">(Ký và ghi rõ họ tên)</p>
              <div style="height:55px;"></div>
              <p class="font-bold">${metadata.disciplineViceMonitorName || metadata.viceMonitorName || 'Lớp phó Trật tự'}</p>
            </td>
            <td style="width:33.3%; border:none; vertical-align:top;">
              <p class="font-bold uppercase" style="font-size:10.5pt;">LỚP TRƯỞNG</p>
              <p class="italic" style="font-size:9.5pt; color:#666;">(Ký và ghi rõ họ tên)</p>
              <div style="height:55px;"></div>
              <p class="font-bold">${metadata.monitorName || 'Lớp trưởng'}</p>
            </td>
            <td style="width:33.3%; border:none; vertical-align:top;">
              <p class="font-bold uppercase" style="font-size:10.5pt;">GIÁO VIÊN CHỦ NHIỆM</p>
              <p class="italic" style="font-size:9.5pt; color:#666;">(Phê duyệt & ký tên)</p>
              <div style="height:55px;"></div>
              <p class="font-bold">${teacherName}</p>
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', wordDocumentContent], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bao_Cao_Ne_Nep_${currentWeek.name.replace(/\s+/g, '_')}_Lop_${className}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
