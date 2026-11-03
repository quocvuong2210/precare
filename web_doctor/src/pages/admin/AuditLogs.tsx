import React from 'react';
import { AuditLogTable } from '../../components/admin/AuditLogTable';

export const AuditLogs: React.FC = () => {
  return (
    <AuditLogTable
      logs={[]}
      totalLogs={0}
      currentPage={1}
      pageSize={10}
      isLoading={false}
      onPageChange={() => {}}
    />
  );
};

export default AuditLogs;

