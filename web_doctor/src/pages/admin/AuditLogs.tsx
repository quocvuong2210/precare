import React, { useState } from 'react';
import { AuditLogTable } from '../../components/admin/AuditLogTable';

export const AuditLogs: React.FC = () => {
  const [notification, setNotification] = useState<string | null>(null);

  return (
    <div>
      {notification && (
        <div className="mb-4 p-3 bg-sky-50 border border-sky-200 text-sky-800 text-xs rounded-lg flex items-center justify-between">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="font-bold ml-2 cursor-pointer">✕</button>
        </div>
      )}
      <AuditLogTable
        onActionNotification={(msg) => {
          setNotification(msg);
          setTimeout(() => setNotification(null), 3000);
        }}
      />
    </div>
  );
};

export default AuditLogs;

