import React, { useState } from 'react';
import { Dashboard } from './pages/Dashboard';
import { PatientDetail } from './pages/PatientDetail';
import { HeartPulse, User, LogOut, Bell, FileText } from 'lucide-react';

export const App: React.FC = () => {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header Bar */}
      <header style={{
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '16px 24px'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setSelectedPatientId(null)}>
            <div style={{ padding: '8px', background: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)', borderRadius: '10px', color: 'white', display: 'flex' }}>
              <HeartPulse size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#F8FAFC', letterSpacing: '-0.02em' }}>PreCare Doctor Portal</h1>
              <p style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Hệ Thống Số Hóa Cận Lâm Sàng & Theo Dõi Thai Kỳ</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button className="btn btn-secondary" style={{ padding: '8px 12px' }}>
              <Bell size={16} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <User size={18} color="#38BDF8" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#F8FAFC' }}>BS. Lê Hoàng</div>
                <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>Khoa Sản - Bệnh Viện ĐKKV</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body Content */}
      <main className="app-container" style={{ flex: 1 }}>
        {selectedPatientId ? (
          <PatientDetail patientId={selectedPatientId} onBack={() => setSelectedPatientId(null)} />
        ) : (
          <Dashboard onSelectPatient={(id) => setSelectedPatientId(id)} />
        )}
      </main>
    </div>
  );
};

export default App;
