import { Platform } from 'react-native';

// Máy ảo Android gọi về máy tính qua 10.0.2.2 (localhost của máy ảo là chính nó).
// Điện thoại thật: thay bằng IP LAN của máy tính, ví dụ http://192.168.1.10:8000
export const API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:8000/api/v1' : 'http://localhost:8000/api/v1';


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
      data.detail
        ? typeof data.detail === 'string'
          ? data.detail
          : JSON.stringify(data.detail)
        : 'Đăng nhập thất bại',
    );
  }

  return data;
}