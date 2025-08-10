// src/components/Table/SimpleDataTable.tsx
import React, { useState } from 'react';
import {
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Paper,
  Stack,
  SxProps,
  Theme,
} from '@mui/material';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import { ColumnFilterPopper } from './ColumnFilterPopper';

export interface DataColumn<Row = any> {
  label: string;
  field?: keyof Row;
  render?: (row: Row) => React.ReactNode;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  filterable?: boolean;
  sx?: SxProps<Theme>;
}

export interface SimpleDataTableProps<Row = any> {
  columns: DataColumn<Row>[];
  rows: Row[];
  rowsPerPageOptions?: number[];
  sx?: SxProps<Theme>;
}

export function SimpleDataTable<Row>({
  columns,
  rows,
  rowsPerPageOptions = [5, 10, 25],
  sx,
}: SimpleDataTableProps<Row>) {
  /* paginação */
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(rowsPerPageOptions[0]);

  /* filtros */
  const [filters, setFilters] = useState<Record<string, Set<any>>>({});
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [colFilter, setColFilter] = useState<DataColumn<Row> | null>(null);

  /* aplica filtros activos */
  const filteredRows = rows.filter((r) =>
    columns.every((c) => {
      const active = filters[c.label];
      if (!active?.size) return true;
      const val = c.field ? r[c.field] : c.render?.(r);
      return active.has(val);
    }),
  );

  /* paginação calculada */
  const slice = filteredRows.slice(page * perPage, page * perPage + perPage);

  /* open popper */
  const openFilter = (el: HTMLElement, col: DataColumn<Row>) => {
    setAnchor(el);
    setColFilter(col);
  };

  /* valores únicos da coluna */
  const colValues = colFilter
    ? [...new Set(rows.map((r) => (colFilter.field ? r[colFilter.field] : colFilter.render!(r))))]
    : [];

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', ...sx }}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              {columns.map((c) => (
                <TableCell
                  key={c.label}
                  align={c.align}
                  sx={{ width: c.width, fontWeight: 700, ...c.sx }}
                >
                  <Stack
                    direction="row"
                    spacing={0.5}
                    alignItems="center"
                    sx={{ cursor: c.filterable ? 'pointer' : 'default' }}
                    onClick={
                      c.filterable
                        ? (e) => openFilter(e.currentTarget as HTMLElement, c)
                        : undefined
                    }
                  >
                    {c.label}
                    {c.filterable && (
                      <FilterAltIcon
                        fontSize="small"
                        color={filters[c.label]?.size ? 'primary' : 'inherit'}
                      />
                    )}
                  </Stack>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {slice.map((row, i) => (
              <TableRow key={i}>
                {columns.map((c) => (
                  <TableCell key={String(c.label)} align={c.align}>
                    {c.render ? c.render(row) : (row as any)[c.field!]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* paginação */}
      <TablePagination
        component="div"
        rowsPerPageOptions={rowsPerPageOptions}
        count={filteredRows.length}
        rowsPerPage={perPage}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        onRowsPerPageChange={(e) => {
          setPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        labelRowsPerPage="Items por página:"
      />

      {/* pop-up de filtro */}
      {colFilter && (
        <ColumnFilterPopper
          open
          anchorEl={anchor}
          values={colValues}
          selected={filters[colFilter.label] ?? new Set()}
          onClose={() => setColFilter(null)}
          onApply={(set) => setFilters({ ...filters, [colFilter.label]: set })}
        />
      )}
    </Paper>
  );
}
