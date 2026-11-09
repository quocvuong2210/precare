import React, { useState } from 'react';
import { MappingQueue } from '../../components/admin/MappingQueue';
import { MappingItem, StandardBiomarkerMetric } from '../../types/admin.types';

const INITIAL_MOCK_MAPPINGS: MappingItem[] = [
  {
    id: 'map-001',
    raw_label: 'DKLD (Đk lưỡng đỉnh)',
    sample_value: '84.5',
    unit: 'mm',
    file_name: 'US_Scan_28w_01.dcm',
    detected_at: '01/11/2026 09:15',
    frequency: 38,
    suggested_metric: 'bpd',
    status: 'pending',
    confidence: 0.94,
    machine_model: 'GE Voluson E10',
    patient_code: 'BN-847291',
    sample_image_url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: 'map-002',
    raw_label: 'CVVB (Chu vi bụng)',
    sample_value: '265.2',
    unit: 'mm',
    file_name: 'US_Scan_30w_04.jpg',
    detected_at: '01/11/2026 08:42',
    frequency: 24,
    suggested_metric: 'ac',
    status: 'pending',
    confidence: 0.91,
    machine_model: 'Samsung HERA W10',
    patient_code: 'BN-339182',
    sample_image_url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: 'map-003',
    raw_label: 'CDXD (Chiều dài đùi)',
    sample_value: '58.0',
    unit: 'mm',
    file_name: 'US_Femur_Scan_09.png',
    detected_at: '31/10/2026 16:30',
    frequency: 19,
    suggested_metric: 'fl',
    status: 'pending',
    confidence: 0.88,
    machine_model: 'Philips Epiq 7',
    patient_code: 'BN-910244',
  },
  {
    id: 'map-004',
    raw_label: 'VongDau_HC',
    sample_value: '298.4',
    unit: 'mm',
    file_name: 'Head_Circumference_02.dcm',
    detected_at: '31/10/2026 14:10',
    frequency: 15,
    suggested_metric: 'hc',
    status: 'pending',
    confidence: 0.96,
    machine_model: 'Siemens Acuson',
    patient_code: 'BN-662810',
  },
];

export const MappingQueuePage: React.FC = () => {
  const [items, setItems] = useState<MappingItem[]>(INITIAL_MOCK_MAPPINGS);
  const [notification, setNotification] = useState<string | null>(null);

  const handleConfirmMapping = async (
    itemId: string,
    targetMetric: StandardBiomarkerMetric,
    rawLabel: string,
    _note?: string
  ) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
    setNotification(
      `Đã ánh xạ thành công nhãn "${rawLabel}" sang chỉ số chuẩn "${targetMetric.toUpperCase()}".`
    );
    setTimeout(() => setNotification(null), 3500);
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div className="p-3 bg-teal-50 border border-teal-200 text-teal-800 text-xs rounded-lg flex items-center justify-between">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="font-bold ml-2 cursor-pointer">✕</button>
        </div>
      )}
      <MappingQueue
        items={items}
        isLoading={false}
        onConfirmMapping={handleConfirmMapping}
      />
    </div>
  );
};

export default MappingQueuePage;
