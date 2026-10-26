/**
 * Central API Gateway Client
 * Tích hợp các service con theo từng ticket chuyên biệt (Auth, Records, Ultrasound...)
 */

import { apiClient, authApi } from './auth.service';

export const api = apiClient;
export { authApi };
export default api;
