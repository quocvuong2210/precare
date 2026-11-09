export interface DashboardKPIs {
  totalPregnantWomen: number;
  totalFacilities: number;
  totalDoctors: number;
  activeDoctors: number;
  totalUsers: number;
  pendingOcrFiles: number;
  readyToMapOcrFiles: number;
  pendingDoctors?: number;
  pendingDoctorsOver24h?: number;
}

export interface RiskDistributionItem {
  id: 'green' | 'amber' | 'red';
  name: string;
  description: string;
  count: number;
  percentage: number;
  colorHex: string;
}

export interface ClinicalRiskDistribution {
  totalAnalyzed: number;
  items: RiskDistributionItem[];
}

export interface PendingActionTask {
  id: string;
  type: 'doctor_approval' | 'ocr_fix' | 'ocr_failed';
  title: string;
  subtitle: string;
  actionText: string;
  targetTab: 'doctors' | 'users' | 'ocr' | 'logs';
}

export interface AdminDashboardData {
  kpis: DashboardKPIs;
  riskDistribution: ClinicalRiskDistribution;
  pendingTasks: PendingActionTask[];
  lastUpdated: string;
}

