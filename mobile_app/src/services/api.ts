import { Platform } from 'react-native';

// Máy ảo Android gọi về máy tính qua 10.0.2.2 (localhost của máy ảo là chính nó).
// Điện thoại thật: thay bằng IP LAN của máy tính, ví dụ http://192.168.1.10:8000
export const API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:8000/api/v1' : 'http://localhost:8000/api/v1';
