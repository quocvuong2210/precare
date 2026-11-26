/** Trả về ngày hiện tại dạng ISO YYYY-MM-DD theo múi giờ máy. */
export function getTodayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

/** Chuyển ngày ISO YYYY-MM-DD (hoặc timestamp ISO) sang định dạng cố định DD/MM/YYYY để hiển thị và nhập liệu. */
export function formatIsoToDmy(iso?: string | null): string {
  if (!iso) return '';
  const raw = String(iso).trim();
  const ymd = raw.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    return `${ymd[3]}/${ymd[2]}/${ymd[1]}`;
  }
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    return `${dmy[1].padStart(2, '0')}/${dmy[2].padStart(2, '0')}/${dmy[3]}`;
  }
  return '';
}

/** Chuẩn hóa chuỗi D/M/YYYY hoặc DD/MM/YYYY sang DD/MM/YYYY cố định khi hợp lệ. */
export function normalizeDmyString(raw?: string | null): string {
  const iso = parseStrictDmyToIso(raw);
  return iso ? formatIsoToDmy(iso) : String(raw || '').trim();
}

/**
 * Kiểm tra chặt chẽ định dạng ngày DD/MM/YYYY (ví dụ 01/03/2026) và chuyển sang YYYY-MM-DD để gửi Backend.
 * Trả về null nếu sai định dạng (như YYYY-MM-DD) hoặc ngày không tồn tại trên lịch.
 */
export function parseStrictDmyToIso(raw?: string | null): string | null {
  if (!raw) return null;
  const clean = String(raw).replace(/[\u200B-\u200D\uFEFF\u00A0\s]/g, '');
  const match = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (year < 1900 || year > 2100) return null;

  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }

  return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
}

/** Hỗ trợ nhập liệu cố định DD/MM/YYYY: tự chèn dấu '/' khi gõ số liên tiếp và giữ nguyên khi xóa ký tự. */
export function formatDmyInput(raw: string, previous: string): string {
  const cleaned = String(raw || '').replace(/[^0-9/]/g, '').replace(/\/{2,}/g, '/');
  if (cleaned.length < previous.length) {
    return cleaned.slice(0, 10);
  }

  // Giữ cấu trúc người dùng tự gõ '/' hợp lý (VD: 1/3/2026 hoặc 01/03/2026)
  if (cleaned.includes('/')) {
    const parts = cleaned.split('/');
    if (parts.length <= 3) {
      const dd = parts[0].slice(0, 2);
      const mm = (parts[1] || '').slice(0, 2);
      const yyyy = (parts[2] || '').slice(0, 4);
      if (parts.length === 2) {
        if (mm.length === 2 && !cleaned.endsWith('/') && previous.length < cleaned.length) {
          return `${dd}/${mm}/`;
        }
        return `${dd}/${mm}`;
      }
      if (parts.length === 3) {
        return `${dd}/${mm}/${yyyy}`;
      }
    }
  }

  const digits = cleaned.replace(/\//g, '').slice(0, 8);
  if (digits.length < 2) return digits;
  if (digits.length === 2) return `${digits}/`;
  if (digits.length < 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  if (digits.length === 4) return `${digits.slice(0, 2)}/${digits.slice(2)}/`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}
