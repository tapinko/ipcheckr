import { Box, Button, Checkbox, InputAdornment, MenuItem, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField } from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"
import { useTranslation } from "react-i18next"
import { TranslationKey } from "../utils/i18n"
import type { FC } from "react"

interface IDataGridWithSearchProps {
  filter1?: {
    label: string
    value: string
    setValue: (val: string) => void
    options: { value: string; label: string }[]
  }
  filter2?: {
    label: string
    value: string
    setValue: (val: string) => void
    options: { value: string; label: string }[]
  }
  searchValue: string
  setSearchValue: (val: string) => void
  descending?: boolean
  setDescending?: (val: boolean) => void
  columns: { label: string; key: string }[],
  rows?: Record<string, any>[]
  selectableRows?: boolean
  selectedRows?: number[]
  setSelectedRows?: (rows: number[]) => void
}

const DataGridWithSearch: FC<IDataGridWithSearchProps> = ({
  filter1,
  filter2,
  searchValue,
  setSearchValue,
  descending = false,
  setDescending,
  columns,
  rows = [],
  selectableRows = false,
  selectedRows = [],
  setSelectedRows,
}) => {
  const { t } = useTranslation()

  const handleRowSelect = (row: any) => {
    if (!selectableRows || !setSelectedRows) return
    const id = row.id
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(i => i !== id))
    } else {
      setSelectedRows([...selectedRows, id])
    }
  }

  return (
    <Paper>
      <Box display="flex" gap={2} p={2}>
        <TextField
          label={t(TranslationKey.DATA_GRID_SEARCH)}
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            )
          }}
          size="small"
        />
        {filter1 && (
          <TextField
            label={filter1.label}
            select
            value={filter1.value}
            onChange={e => filter1.setValue(e.target.value)}
            size="small"
            sx={{ minWidth: 120 }}
          >
            {filter1.options.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </TextField>
        )}
        {filter2 && (
          <TextField
            label={filter2.label}
            select
            value={filter2.value}
            onChange={e => filter2.setValue(e.target.value)}
            size="small"
            sx={{ minWidth: 120 }}
          >
            {filter2.options.map(opt => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </TextField>
        )}
        <Button
          variant="outlined"
          onClick={() => setDescending && setDescending(!descending)}
          size="small"
        >
          {descending ? t(TranslationKey.DATA_GRID_DESC) : t(TranslationKey.DATA_GRID_ASC)}
        </Button>
      </Box>

      <Table>
        <TableHead>
          <TableRow>
            {selectableRows && <TableCell />}
            {columns.map(col => (
              <TableCell key={col.key}>{col.label}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + (selectableRows ? 1 : 0)} align="center">
                {t(TranslationKey.DATA_GRID_NO_DATA)}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, idx) => (
              <TableRow
                key={row.id ?? idx}
                hover={selectableRows}
                selected={selectableRows && selectedRows.includes(row.id)}
                onClick={selectableRows ? () => handleRowSelect(row) : undefined}
                style={selectableRows ? { cursor: "pointer" } : undefined}
              >
                {selectableRows && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedRows.includes(row.id)}
                      onChange={() => handleRowSelect(row)}
                      onClick={e => e.stopPropagation()}
                      color="primary"
                    />
                  </TableCell>
                )}
                {columns.map(col => (
                  <TableCell key={col.key}>
                    {row[col.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Paper>
  )
}

export default DataGridWithSearch