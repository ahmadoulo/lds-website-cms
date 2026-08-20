import React from 'react';
import { cn } from '../../../lib/cn';

export interface Column<T> {
  key: string;
  header: string;
  /** Rendered in the desktop table cell and as the value in the mobile card. */
  render: (row: T) => React.ReactNode;
  className?: string;
  /** Hide this column on the mobile card layout (e.g. thumbnails). */
  hideOnMobile?: boolean;
  align?: 'left' | 'right';
}

interface DataTableProps<T> {
  columns: Array<Column<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  /** Rendered on the far right of each row / at the bottom of each mobile card. */
  actions?: (row: T) => React.ReactNode;
  /** Primary label used as the heading of the mobile card. */
  mobileTitle: (row: T) => React.ReactNode;
}

/**
 * A table on desktop, a stack of cards below `md`. Tables with six columns are
 * unusable on a phone, and the admin has to work from one.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  actions,
  mobileTitle,
}: DataTableProps<T>) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-x-auto rounded-xl border border-navy/8 bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-navy/8 bg-warm-muted/50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-navy/55',
                    column.align === 'right' && 'text-right',
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
              {actions && (
                <th scope="col" className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wide text-navy/55">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy/6">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="transition-colors hover:bg-warm-muted/30">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn('px-5 py-4 align-middle', column.align === 'right' && 'text-right')}
                  >
                    {column.render(row)}
                  </td>
                ))}
                {actions && (
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-1">{actions(row)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <div key={rowKey(row)} className="rounded-xl border border-navy/8 bg-white p-4">
            <div className="mb-3 font-semibold text-navy">{mobileTitle(row)}</div>
            <dl className="space-y-2">
              {columns
                .filter((column) => !column.hideOnMobile)
                .map((column) => (
                  <div key={column.key} className="flex items-center justify-between gap-3">
                    <dt className="text-xs font-medium uppercase tracking-wide text-navy/45">
                      {column.header}
                    </dt>
                    <dd className="text-sm text-navy">{column.render(row)}</dd>
                  </div>
                ))}
            </dl>
            {actions && (
              <div className="mt-4 flex justify-end gap-1 border-t border-navy/8 pt-3">
                {actions(row)}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: 'default' | 'danger';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const IconButton = ({ tone = 'default', label, icon: Icon, className, ...props }: IconButtonProps) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    className={cn(
      'rounded-lg p-2 transition-colors',
      tone === 'danger'
        ? 'text-red-500 hover:bg-red-50 hover:text-red-700'
        : 'text-navy/50 hover:bg-navy/5 hover:text-blue',
      'disabled:cursor-not-allowed disabled:opacity-40',
      className,
    )}
    {...props}
  >
    <Icon className="h-4 w-4" />
  </button>
);
