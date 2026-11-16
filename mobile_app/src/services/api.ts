import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Địa chỉ Backend PreCare
export const API_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:8000/api/v1'
    : 'http://localhost:8000/api/v1';

export interface UserAccountInfo {
  id?: string;
  full_name: string;
  email: string;
  phone_number: string;
  birthday?: string;
}

// Lưu thông tin tài khoản hiện tại trong phiên
export let currentAccessToken: string = '';
export let currentUserProfile: UserAccountInfo | null = null;
let sessionRevision = 0;

// Khôi phục phiên đăng nhập từ bộ nhớ máy nếu có
export async function restoreSession(): Promise<UserAccountInfo | null> {
  const revision = sessionRevision;
  try {
    const savedToken = await AsyncStorage.getItem('precare_access_token');
    const savedUser = await AsyncStorage.getItem('precare_current_user');
    if (revision !== sessionRevision) return null;
    currentAccessToken = savedToken || '';
    currentUserProfile = null;
    if (savedToken && savedUser) {
      currentUserProfile = JSON.parse(savedUser);
      return currentUserProfile;
    }
  } catch (e) {
    console.log('Lỗi khôi phục phiên:', e);
  }
  return currentUserProfile;
}

// Đăng xuất và xóa thông tin phiên cục bộ
export async function logout(): Promise<void> {
  sessionRevision += 1;
  const token = currentAccessToken || (await AsyncStorage.getItem('precare_access_token'));
  const refreshToken = await AsyncStorage.getItem('precare_refresh_token');
  await AsyncStorage.multiRemove([
    'precare_access_token',
    'precare_current_user',
    'precare_refresh_token',
  ]);
  sessionRevision += 1;
  currentAccessToken = '';
  currentUserProfile = null;

  if (!token || !refreshToken) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
      signal: controller.signal,
    });
  } catch {
    // Bỏ qua lỗi mạng khi đã xóa token trên máy
  } finally {
    clearTimeout(timeout);
  }
}

// Hàm đọc JSON an toàn tránh lỗi crash khi Backend trả về text thuần
async function safeParseJson(response: Response): Promise<any> {
  const rawText = await response.text();
  try {
    return rawText ? JSON.parse(rawText) : {};
  } catch {
    return {
      detail: rawText.includes('Internal Server Error')
        ? 'Máy chủ đang gặp lỗi (HTTP 500). Vui lòng thử lại sau hoặc liên hệ bộ phận hỗ trợ.'
        : rawText || `Máy chủ trả về phản hồi không hợp lệ (HTTP ${response.status}).`,
    };
  }
}

// Hàm dùng chung để xử lý response từ backend
async function handleResponse(response: Response): Promise<any> {
  const data: any = await safeParseJson(response);

  if (!response.ok) {
    const detail = data?.detail;
    const message = Array.isArray(detail)
      ? detail.map((d: any) => d.msg).join('; ')
      : typeof detail === 'string'
      ? detail
      : detail?.message || data?.message || `Yêu cầu thất bại (HTTP ${response.status})`;
    throw new Error(message);
  }

  return data;
}

// Hàm dùng chung để gọi API xác thực (chức năng Quên mật khẩu)
async function postAuth(path: string, body: object): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/auth/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data: any = await safeParseJson(response);

  if (!response.ok) {
    throw new Error(
      typeof data?.detail === 'string'
        ? data.detail
        : data?.message || JSON.stringify(data?.detail || data)
    );
  }

  return data;
}

// Đăng nhập và kiểm tra role qua API profile
export async function login(email: string, password: string) {
  const formData = new URLSearchParams();

  formData.append('username', email);
  formData.append('password', password);

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: formData.toString(),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data.detail === 'string'
        ? data.detail
        : JSON.stringify(data.detail || data),
    );
  }
  // Lấy access_token từ bước login
  const token = data.access_token;
  if (!token) {
    throw new Error('API không trả về access_token.');
  }
  // Gọi tiếp API lấy thông tin user hiện tại (ví dụ: /auth/me hoặc /users/me tùy backend của nhóm bạn)
  const profileRes = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!profileRes.ok) {
    throw new Error('Không lấy được thông tin tài khoản. Vui lòng thử lại.');
  }

  const profileData = await profileRes.json();
  const userObj = profileData.user || profileData.data || profileData;
  const role = userObj.role || profileData.role;

  if (role !== 'pregnant_woman') {
    throw new Error('Chỉ tài khoản thai phụ mới được phép đăng nhập vào ứng dụng.');
  }

  currentAccessToken = token;
  sessionRevision += 1;
  currentUserProfile = {
    id: userObj.id || userObj.user_id || '',
    full_name: userObj.full_name || userObj.name || '',
    email: (userObj.email || email).trim().toLowerCase(),
    phone_number: userObj.phone_number || userObj.phone || '',
    birthday: userObj.birthday || '',
  };

  // Lưu token và thông tin user hiện tại vào AsyncStorage
  try {
    await AsyncStorage.setItem('precare_access_token', token);
    await AsyncStorage.setItem('precare_current_user', JSON.stringify(currentUserProfile));
    if (data.refresh_token) {
      await AsyncStorage.setItem('precare_refresh_token', data.refresh_token);
    } else {
      await AsyncStorage.removeItem('precare_refresh_token');
    }
  } catch (e) {
    console.log('Lỗi lưu phiên đăng nhập:', e);
  }

  return { ...data, role, user: currentUserProfile };
}

// 1. Gửi mã OTP (đăng ký)
export interface SendOtpResponse {
  status: string;
  message: string;
  expires_in: number;
  retry_after: number;
}

export async function sendOtp(email: string, _role: string = 'pregnant_woman'): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      role: 'pregnant_woman',
    }),
  });

  return handleResponse(response);
}

// 2. Xác thực OTP (đăng ký)
export interface VerifyOtpResponse {
  status: string;
  message: string;
  verification_token: string;
}

export async function verifyOtp(
  email: string,
  otp: string
): Promise<VerifyOtpResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      otp,
    }),
  });

  return handleResponse(response);
}

// 3. Đăng ký tài khoản
export interface RegisterRequest {
  email: string;
  full_name: string;
  role: string;
  phone_number: string;
  password: string;
}

export async function register(
  user: RegisterRequest,
  verificationToken: string
): Promise<any> {
  const response = await fetch(
    `${API_BASE_URL}/auth/register?verification_token=${encodeURIComponent(verificationToken)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(user),
    }
  );

  return handleResponse(response);
}

// Gửi yêu cầu quên mật khẩu
export function forgotPassword(email: string): Promise<any> {
  return postAuth('forgot-password', {
    email: email.trim(),
  });
}

// Đổi mật khẩu bằng email và mã OTP
export function resetPassword(
  email: string,
  otp_code: string,
  new_password: string
): Promise<any> {
  return postAuth('reset-password', {
    email: email.trim(),
    otp_code: otp_code.trim(),
    new_password,
  });
}

// --- TÍNH TOÁN HỒ SƠ THAI KỲ (TUỔI THAI & EDD) ---
async function medicalRequest(path: string, body?: object): Promise<any> {
  if (!currentAccessToken) await restoreSession();
  if (!currentAccessToken) {
    throw new Error('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${currentAccessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
    return await handleResponse(response);
  } finally {
    clearTimeout(timer);
  }
}

export async function requestPregnancyDeletion(
  reason: string,
  allowResearch: boolean
): Promise<string> {
  if (reason.trim().length < 10) {
    throw new Error('Lý do cần có ít nhất 10 ký tự.');
  }
  if (!currentAccessToken) await restoreSession();
  if (!currentAccessToken) {
    throw new Error('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.');
  }

  const profile = await fetchPregnancyProfileFromDB(currentAccessToken);
  const profileId = profile?.id ? String(profile.id).trim() : '';
  if (!profileId) {
    throw new Error('Không tìm thấy hồ sơ thai kỳ hiện tại để gửi yêu cầu xóa.');
  }

  const result = await medicalRequest('/deletion-requests', {
    pregnancy_profile_id: profileId,
    checkup_id: null,
    target_type: 'full_profile',
    reason: reason.trim(),
    allow_anonymized_research: allowResearch,
  });

  if (!result?.success || result?.data?.status !== 'pending' || !result?.data?.request_id) {
    throw new Error(
      'Chưa xác nhận được yêu cầu. Vui lòng kiểm tra với bộ phận hỗ trợ trước khi gửi lại.'
    );
  }
  return result.data.request_id;
}

export interface PregnancyCalculateRequest {
  target_date?: string;
  lmp?: string;
  q1_ultrasound_date?: string;
  q1_gestational_weeks?: number;
  q1_gestational_days?: number;
  crl_mm?: number;
  override_edd?: string;
}

export type PregnancyCalculationMethod = 'lmp' | 'q1_ultrasound' | 'crl' | 'direct_edd';

export async function calculatePregnancyProfile(
  payload: PregnancyCalculateRequest,
  token?: string
): Promise<any> {
  const authToken = token || currentAccessToken;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}/pregnancy-profiles/calculate`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  return handleResponse(response);
}

// Hàm phụ trợ bóc tách đúng đối tượng và UUID của hồ sơ thai kỳ từ Backend
function extractProfileObject(raw: any): any {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw.data !== undefined ? raw.data : raw;
  if (!d) return null;
  if (Array.isArray(d)) return d[0] || null;
  if (Array.isArray(d.items)) return d.items[0] || null;
  if (Array.isArray(d.profiles)) return d.profiles[0] || null;
  if (d.profile && typeof d.profile === 'object') return d.profile;
  if (d.pregnancy_profile && typeof d.pregnancy_profile === 'object') return d.pregnancy_profile;
  return d;
}

function extractProfileUuid(raw: any): string | null {
  const obj = extractProfileObject(raw);
  const candidate = obj?.id || obj?.profile_id || obj?.pregnancy_profile_id;
  if (candidate && typeof candidate === 'string' && candidate !== 'profile_demo_01') {
    return candidate.trim();
  }
  return null;
}

// Lưu hồ sơ thai kỳ xuống bảng public.pregnancy_profiles trong Database
export async function savePregnancyProfileToDB(
  payload: PregnancyCalculateRequest & {
    edd?: string;
    calculation_method?: PregnancyCalculationMethod;
  },
  token?: string
): Promise<any> {
  const authToken =
    token || currentAccessToken || (await AsyncStorage.getItem('precare_access_token')) || '';
  if (!authToken) throw new Error('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: `Bearer ${authToken}`,
  };

  const requestBody: Record<string, any> = {};
  if (payload.calculation_method) {
    requestBody.calculation_method = payload.calculation_method;
  } else if (payload.lmp) {
    requestBody.calculation_method = 'lmp';
  } else if (payload.q1_ultrasound_date) {
    requestBody.calculation_method = 'q1_ultrasound';
  } else if (payload.crl_mm !== undefined) {
    requestBody.calculation_method = 'crl';
  } else if (payload.override_edd || payload.edd) {
    requestBody.calculation_method = 'direct_edd';
  }

  if (payload.lmp) requestBody.lmp = payload.lmp;
  if (payload.q1_ultrasound_date) requestBody.q1_ultrasound_date = payload.q1_ultrasound_date;
  if (payload.q1_gestational_weeks !== undefined) {
    requestBody.q1_gestational_weeks = payload.q1_gestational_weeks;
  }
  if (payload.q1_gestational_days !== undefined) {
    requestBody.q1_gestational_days = payload.q1_gestational_days;
  }
  if (payload.crl_mm !== undefined) requestBody.crl_mm = payload.crl_mm;
  if (payload.override_edd) {
    requestBody.override_edd = payload.override_edd;
  } else if (!payload.lmp && !payload.q1_ultrasound_date && payload.edd) {
    requestBody.override_edd = payload.edd;
  }

  let res = await fetch(`${API_BASE_URL}/pregnancy-profiles`, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!res.ok && (res.status === 400 || res.status === 409)) {
    const existingProfile = await fetchPregnancyProfileFromDB(authToken);
    const existingId =
      existingProfile?.id || (await AsyncStorage.getItem('precare_pregnancy_profile_id'));
    if (existingId) {
      const { calculation_method: _method, ...updateBody } = requestBody;
      res = await fetch(`${API_BASE_URL}/pregnancy-profiles/${existingId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ ...updateBody, recalculate_edd: true }),
      });
    }
  }

  const savedData = await handleResponse(res);
  const savedId = extractProfileUuid(savedData);
  if (savedId) {
    await AsyncStorage.setItem('precare_pregnancy_profile_id', savedId);
  }
  return savedData;
}

// Lấy hồ sơ thai kỳ đang active từ Backend qua GET /pregnancy-profiles/active
export async function fetchPregnancyProfileFromDB(
  token?: string,
  options: { throwOnError?: boolean } = {}
): Promise<any> {
  const authToken =
    token || currentAccessToken || (await AsyncStorage.getItem('precare_access_token')) || '';
  if (!authToken) {
    if (options.throwOnError) throw new Error('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.');
    return null;
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${authToken}`,
  };

  try {
    const res = await fetch(`${API_BASE_URL}/pregnancy-profiles/active`, {
      method: 'GET',
      headers,
    });

    if (res.ok) {
      const json: any = await safeParseJson(res);
      const profileObj = extractProfileObject(json);
      const pid = extractProfileUuid(json);
      if (pid) {
        await AsyncStorage.setItem('precare_pregnancy_profile_id', pid);
        return { ...profileObj, id: pid };
      }
      return profileObj;
    }

    // Nếu tài khoản chưa tạo hồ sơ (404) hoặc endpoint active gặp lỗi 500, không chặn luồng Login
    if (res.status === 404 || res.status >= 500) {
      return null;
    }
    if (options.throwOnError) await handleResponse(res);
  } catch (e) {
    console.log('Tải DB pregnancy_profiles:', e);
  }
  return null;
}

// Đảm bảo luôn lấy hoặc khởi tạo UUID thật trong bảng public.pregnancy_profiles trước khi Upload/Lưu DB
export async function ensureActivePregnancyProfileId(defaultWeek: number = 24): Promise<string> {
  const existing = await fetchPregnancyProfileFromDB();
  const existingId = existing?.id || existing?.profile_id || existing?.pregnancy_profile_id;
  if (existingId && String(existingId) !== 'profile_demo_01') {
    return String(existingId);
  }

  const cachedId = await AsyncStorage.getItem('precare_pregnancy_profile_id');
  if (cachedId && cachedId !== 'profile_demo_01') {
    return cachedId;
  }

  const lmpDate = new Date(Date.now() - defaultWeek * 7 * 24 * 60 * 60 * 1000);
  const lmpIso = `${lmpDate.getFullYear()}-${String(lmpDate.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(lmpDate.getDate()).padStart(2, '0')}`;

  try {
    const created = await savePregnancyProfileToDB({
      calculation_method: 'lmp',
      lmp: lmpIso,
    });
    const createdId = extractProfileUuid(created);
    if (createdId) {
      return createdId;
    }
  } catch (e) {
    console.log('Tự động khởi tạo pregnancy_profile:', e);
  }

  const retryExisting = await fetchPregnancyProfileFromDB();
  if (retryExisting?.id) {
    return String(retryExisting.id);
  }

  throw new Error(
    'Chưa tìm thấy Hồ sơ thai kỳ (pregnancy_profile_id). Vui lòng vào mục Hồ sơ bấm Lưu thông tin thai kỳ trước khi tải phiếu khám.'
  );
}

// =========================================================================
// --- PARACLINICAL INGEST & QUEUE (8 ĐẦU API TẢI LÊN & HÀNG ĐỢI CELERY) ---
// =========================================================================

export interface IngestFilePayload {
  uri: string;
  name: string;
  type: string;
}

export interface IngestUploadResponseData {
  file_id: string;
  task_id: string;
  pregnancy_profile_id: string;
  checkup_id?: string | null;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  document_type: string;
  status: string;
  tracking_url: string;
  created_at: string;
  [key: string]: any;
}

export interface IngestBatchItem {
  file_id: string;
  task_id: string;
  file_name: string;
  file_size_bytes: number;
  status: string;
  [key: string]: any;
}

export interface IngestBatchResponseData {
  batch_id: string;
  total_files: number;
  successful_enqueued: number;
  failed_enqueued: number;
  tracking_url: string;
  items: IngestBatchItem[];
  [key: string]: any;
}

export interface IngestTaskStatusData {
  task_id: string;
  file_id: string;
  state: string;
  status?: string;
  progress_percentage: number;
  current_stage: string;
  stage_message: string;
  estimated_seconds_remaining: number;
  verification_url?: string;
  error_code?: string;
  can_retry: boolean;
  [key: string]: any;
}

export interface IngestBatchStatusData {
  batch_id: string;
  total_files: number;
  completed_files: number;
  failed_files: number;
  overall_progress_percentage: number;
  is_all_finished: boolean;
  files: {
    file_id: string;
    file_name: string;
    state: string;
    progress_percentage: number;
    status: string;
    verification_url?: string;
  }[];
  [key: string]: any;
}

export interface IngestFileDetailData {
  id: string;
  file_id?: string;
  pregnancy_profile_id: string;
  checkup_id?: string | null;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  document_type: string;
  status: string;
  presigned_view_url: string;
  presigned_url?: string;
  url?: string;
  presigned_url_expires_in_seconds: number;
  uploaded_by?: {
    id: string;
    full_name: string;
    role: string;
  };
  created_at: string;
  [key: string]: any;
}

export async function ingestUploadSingle(
  file: IngestFilePayload,
  profileId?: string
) {
  console.log(`[API 1/8] Đang tải lên file đơn lẻ: "${file.name}" (POST /api/v1/ingest/upload)...`);
  const headers = await getIngestAuthHeaders(false);
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as any);

  if (profileId) {
    formData.append('profile_id', profileId);
  }

  const response = await fetch(`${API_BASE_URL}/ingest/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await handleResponse(response);
  console.log(`Tải lên file đơn lẻ "${file.name}" thành công!`);
  return data;
}

// 2. POST /api/v1/ingest/upload-batch — Tải lên hàng loạt nhiều phiếu khám (Batch Upload)
export async function ingestUploadBatch(
  files: IngestFilePayload[],
  profileId?: string
) {
  console.log(
    `[API 2/8] Đang tải lên hàng loạt ${files.length} file (POST /api/v1/ingest/upload-batch)...`
  );
  const headers = await getIngestAuthHeaders(false);
  const formData = new FormData();

  files.forEach((f) => {
    formData.append('files', {
      uri: f.uri,
      name: f.name,
      type: f.type,
    } as any);
  });

  if (profileId) {
    formData.append('profile_id', profileId);
  }

  const response = await fetch(`${API_BASE_URL}/ingest/upload-batch`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await handleResponse(response);
  console.log(`Tải lên hàng loạt (${files.length} file) thành công!`);
  return data;
}

// 3. GET /api/v1/ingest/tasks/{task_id}/status — Polling tiến trình tác vụ Celery đơn lẻ
export async function getIngestTaskStatus(taskId: string) {
  console.log(
    `[API 3/8] Đang kiểm tra trạng thái Task Celery: ${taskId} (GET /api/v1/ingest/tasks/${taskId}/status)...`
  );
  const headers = await getIngestAuthHeaders(false);
  const response = await fetch(
    `${API_BASE_URL}/ingest/tasks/${encodeURIComponent(taskId)}/status`,
    {
      method: 'GET',
      headers,
    }
  );

  const data = await handleResponse(response);
  console.log(`Kiểm tra trạng thái Task Celery (${taskId}) thành công!`);
  return data;
}

// 4. GET /api/v1/ingest/batches/{batch_id}/status — Polling tiến trình tổng hợp của đợt tải hàng loạt
export async function getIngestBatchStatus(batchId: string) {
  console.log(
    `[API 4/8] Đang kiểm tra tiến trình Batch: ${batchId} (GET /api/v1/ingest/batches/${batchId}/status)...`
  );
  const headers = await getIngestAuthHeaders(false);
  const response = await fetch(
    `${API_BASE_URL}/ingest/batches/${encodeURIComponent(batchId)}/status`,
    {
      method: 'GET',
      headers,
    }
  );

  const data = await handleResponse(response);
  console.log(`Kiểm tra tiến trình Batch (${batchId}) thành công!`);
  return data;
}

// 5. GET /api/v1/ingest/files/{file_id} — Chi tiết file & lấy Presigned URL xem trước bản gốc
export async function getIngestFileDetail(fileId: string) {
  console.log(
    `[API 5/8] Đang lấy chi tiết file & Presigned URL: ${fileId} (GET /api/v1/ingest/files/${fileId})...`
  );
  const headers = await getIngestAuthHeaders(false);
  const response = await fetch(
    `${API_BASE_URL}/ingest/files/${encodeURIComponent(fileId)}`,
    {
      method: 'GET',
      headers,
    }
  );

  const data = await handleResponse(response);
  console.log(`Lấy chi tiết file & Presigned URL (${fileId}) thành công!`);
  return data;
}

// 6. DELETE /api/v1/ingest/files/{file_id} — Xóa tài liệu tải lên nhầm (khi status là pending hoặc failed)
export async function deleteIngestFile(fileId: string) {
  console.log(`[API 6/8] Đang xoá tài liệu: ${fileId} (DELETE /api/v1/ingest/files/${fileId})...`);
  const headers = await getIngestAuthHeaders(false);
  const response = await fetch(
    `${API_BASE_URL}/ingest/files/${encodeURIComponent(fileId)}`,
    {
      method: 'DELETE',
      headers,
    }
  );

  if (response.status === 204) {
    console.log(`Xoá tài liệu (${fileId}) thành công!`);
    return { status: 'deleted' };
  }
  const data = await handleResponse(response);
  console.log(`Xoá tài liệu (${fileId}) thành công!`);
  return data;
}

// 7. GET /api/v1/ingest/profiles/{profile_id}/files — Danh sách tài liệu đã tải lên của hồ sơ thai kỳ
export async function getProfileIngestFiles(profileId: string) {
  console.log(
    `[API 7/8] Đang lấy danh sách tài liệu của hồ sơ: ${profileId} (GET /api/v1/ingest/profiles/${profileId}/files)...`
  );
  const headers = await getIngestAuthHeaders(false);
  const response = await fetch(
    `${API_BASE_URL}/ingest/profiles/${encodeURIComponent(profileId)}/files`,
    {
      method: 'GET',
      headers,
    }
  );

  const data = await handleResponse(response);
  console.log(`Lấy danh sách tài liệu hồ sơ (${profileId}) thành công!`);
  return data;
}

// 8. POST /api/v1/ingest/files/{file_id}/retry — Thử lại quá trình trích xuất nếu task Celery bị failed
export async function retryIngestFile(fileId: string) {
  console.log(
    `[API 8/8] Đang gửi yêu cầu thử lại trích xuất: ${fileId} (POST /api/v1/ingest/files/${fileId}/retry)...`
  );
  const headers = await getIngestAuthHeaders(true);
  const response = await fetch(
    `${API_BASE_URL}/ingest/files/${encodeURIComponent(fileId)}/retry`,
    {
      method: 'POST',
      headers,
    }
  );

  const data = await handleResponse(response);
  console.log(`Thử lại trích xuất tài liệu (${fileId}) thành công!`);
  return data;
}
