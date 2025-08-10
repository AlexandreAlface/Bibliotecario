import React from 'react';
import { SxProps, Theme } from '@mui/material';
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
export declare function SimpleDataTable<Row>({ columns, rows, rowsPerPageOptions, sx, }: SimpleDataTableProps<Row>): import("react/jsx-runtime").JSX.Element;
