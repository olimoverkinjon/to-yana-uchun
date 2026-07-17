"use client";

import { ChevronLeft, ChevronRight, Columns3 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface AdminColumn<T> {
  id: string;
  label: string;
  defaultVisible?: boolean;
  render: (row: T) => ReactNode;
}

interface AdminTableProps<T extends { id: string }> {
  rows: T[];
  columns: AdminColumn<T>[];
  totalCount: number;
  page: number;
  pageSize: number;
  basePath: string;
  query?: Record<string, string | number | undefined>;
  empty: ReactNode;
}

function href(basePath: string, query: Record<string, string | number | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, page })) {
    if (value !== undefined && String(value) !== "") params.set(key, String(value));
  }
  return `${basePath}?${params.toString()}`;
}

export function AdminTable<T extends { id: string }>({
  rows,
  columns,
  totalCount,
  page,
  pageSize,
  basePath,
  query = {},
  empty,
}: AdminTableProps<T>) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [visible, setVisible] = useState(
    () => new Set(columns.filter((column) => column.defaultVisible !== false).map((column) => column.id)),
  );

  const shown = useMemo(() => columns.filter((column) => visible.has(column.id)), [columns, visible]);
  const pageCount = Math.max(Math.ceil(totalCount / pageSize), 1);

  const toggleAll = () => {
    setSelected((current) => (current.size === rows.length ? new Set() : new Set(rows.map((row) => row.id))));
  };

  return (
    <div className="glass-panel overflow-hidden rounded-xl">
      <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
        <p className="text-muted-foreground text-xs tabular-nums">
          {selected.size ? `${selected.size} selected · ` : ""}
          {totalCount} total
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
            <Columns3 className="mr-1.5 size-3.5" />
            Columns
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {columns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={visible.has(column.id)}
                onCheckedChange={(checked) => {
                  setVisible((current) => {
                    const next = new Set(current);
                    if (checked) next.add(column.id);
                    else next.delete(column.id);
                    return next;
                  });
                }}
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {rows.length === 0 ? (
        <div className="p-8">{empty}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={rows.length > 0 && selected.size === rows.length}
                  onChange={toggleAll}
                  aria-label="Select all rows"
                />
              </TableHead>
              {shown.map((column) => (
                <TableHead key={column.id}>{column.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} data-state={selected.has(row.id) ? "selected" : undefined}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={(event) => {
                      setSelected((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.add(row.id);
                        else next.delete(row.id);
                        return next;
                      });
                    }}
                    aria-label="Select row"
                  />
                </TableCell>
                {shown.map((column) => (
                  <TableCell key={column.id}>{column.render(row)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <div className="flex items-center justify-between border-t px-3 py-2">
        <p className="text-muted-foreground text-xs tabular-nums">
          Page {page} of {pageCount}
        </p>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            render={<Link href={href(basePath, query, page - 1)} />}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            render={<Link href={href(basePath, query, page + 1)} />}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
