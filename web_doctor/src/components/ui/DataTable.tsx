import React from 'react';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  widthClass?: string;
  align?: 'left' | 'center' | 'right';
  render: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (item: T) => string;
  emptyMessage?: string;
  minWidthClass?: string;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  emptyMessage = 'Không có dữ liệu phù hợp.',
  minWidthClass = 'min-w-[980px]',
}: DataTableProps<T>) {
  const alignCls = (align: 'left' | 'center' | 'right' = 'left') =>
    align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';

  return (
    <div className="overflow-x-auto">
      <table className={`w-full table-fixed border-collapse text-xs ${minWidthClass}`}>
        <colgroup>
          {columns.map((col) => (
            <col key={col.key} className={col.widthClass} />
          ))}
        </colgroup>
        <thead>
          <tr className="bg-slate-50/90 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`py-3.5 px-4 whitespace-nowrap ${alignCls(col.align)}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-slate-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr
                key={rowKey(item)}
                className="hover:bg-slate-50/70 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`py-3.5 px-4 align-middle overflow-hidden ${alignCls(col.align)}`}
                  >
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
