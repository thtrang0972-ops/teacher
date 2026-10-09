/**
 * Tiện ích xử lý chuỗi tiếng Việt và chuẩn hóa tìm kiếm học sinh
 */

export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Kiểm tra xem chuỗi tìm kiếm có khớp với tên học sinh hoặc STT không.
 * Hỗ trợ linh hoạt:
 * - STT: "1", "01", "hs1", "hs01", "hs 1", "stt 1", "stt01", "#1"
 * - Tên: Có dấu đầy đủ ("Nguyễn Văn An"), không dấu ("nguyen van an"), viết hoa thường, thừa dấu cách
 * - Tên gọi cuối: "An", "Minh", "Bảo Anh"
 */
export function matchStudentQuery(
  student: { name: string; stt?: number; id: string },
  query: string
): boolean {
  if (!query || !query.trim()) return false;
  const rawQuery = query.trim().toLowerCase();
  const cleanQuery = removeVietnameseTones(query);
  const cleanName = removeVietnameseTones(student.name);

  // 1. So khớp STT
  if (student.stt !== undefined && student.stt !== null) {
    const sttStr = student.stt.toString();
    const sttPadded = student.stt < 10 ? `0${student.stt}` : sttStr;

    if (rawQuery === sttStr || rawQuery === sttPadded) return true;

    const variations = [
      `hs${sttStr}`,
      `hs${sttPadded}`,
      `hs ${sttStr}`,
      `hs ${sttPadded}`,
      `stt${sttStr}`,
      `stt${sttPadded}`,
      `stt ${sttStr}`,
      `stt ${sttPadded}`,
      `#${sttStr}`,
      `#${sttPadded}`,
    ];
    if (variations.includes(rawQuery) || variations.includes(cleanQuery)) return true;
  }

  // So khớp ID
  if (student.id.toLowerCase() === rawQuery) return true;

  // 2. So khớp Họ tên chính xác (cả có dấu lẫn không dấu)
  if (cleanName === cleanQuery) return true;
  if (student.name.trim().toLowerCase() === rawQuery) return true;

  // 3. So khớp nếu chuỗi tìm kiếm là tên gọi chính
  const nameParts = cleanName.split(' ');
  const lastName = nameParts[nameParts.length - 1];
  if (lastName === cleanQuery) return true;

  // 4. So khớp nếu gõ họ và tên lót hoặc chứa tên đầy đủ
  if (cleanQuery.length >= 3 && cleanName.includes(cleanQuery)) {
    return true;
  }

  return false;
}
