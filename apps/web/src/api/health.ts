import { apiFetch } from './client';

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
}

export function fetchHealth() {
  return apiFetch<HealthResponse>('/health');
}
