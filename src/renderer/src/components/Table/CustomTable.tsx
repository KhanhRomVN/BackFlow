import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getPaginationRowModel,
  ColumnDef,
  RowData
} from '@tanstack/react-table'
import { ReactNode } from 'react'

export interface CustomTableProps<T extends RowData> {
  data: T[]
  columns: ColumnDef<T>[]
  loading?: boolean
  totalCount?: number
  currentPage?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  emptyMessage?: ReactNode
}

const CustomTable = <T extends RowData>({
  data,
  columns,
  loading,
  totalCount,
  currentPage = 1,
  pageSize = 10,
  onPageChange,
  emptyMessage
}: CustomTableProps<T>) => {
  const pageCount = totalCount !== undefined ? Math.ceil((totalCount || 1) / pageSize) : 1

  const table = useReactTable<T>({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: !!totalCount,
    pageCount
  })

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#2D3748]">Đang tải...</div>
      </div>
    )

  if (!data.length)
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-xl font-semibold text-[#2D3748] mb-2">
          {emptyMessage || 'Không có dữ liệu'}
        </div>
      </div>
    )

  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden border border-[#ddd] hover:border-[#52aaaf]">
      {/* Table */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full">
          <thead className="border-b border-[#ddd] hover:border-[#52aaaf]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-5 text-left text-sm font-medium text-[#2D3748]"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-200">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:border-y-[#52aaaf] border border-b-[#ddd]">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-6 py-5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Footer Pagination */}
      {onPageChange && totalCount !== undefined && (
        <div className="flex-none border-t border-[#ddd] hover:border-[#52aaaf]">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="text-sm text-[#718096]">
              Hiển thị {data.length} trên {totalCount} kết quả
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  currentPage <= 1
                    ? 'bg-[#718096]/10 text-[#718096] cursor-not-allowed'
                    : 'bg-[#52aaa5] text-white hover:bg-[#52aaa5]/90'
                }`}
              >
                Trước
              </button>
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={data.length < pageSize}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  data.length < pageSize
                    ? 'bg-[#718096]/10 text-[#718096] cursor-not-allowed'
                    : 'bg-[#52aaa5] text-white hover:bg-[#52aaa5]/90'
                }`}
              >
                Sau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomTable
