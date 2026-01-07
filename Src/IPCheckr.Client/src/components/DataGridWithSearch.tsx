import { Box, Button, Checkbox, InputAdornment, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField } from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"
import { useTranslation } from "react-i18next"
import { TranslationKey } from "../utils/i18n"
import type { FC, ReactNode } from "react"

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
  columns: { label: string; key: string; width?: string | number; hideOnMobile?: boolean }[],
  rows?: Record<string, any>[]
  selectableRows?: boolean
  selectedRows?: number[]
  setSelectedRows?: (rows: number[]) => void
  expandedRowId?: number | null
  renderExpandedRow?: (row: any) => ReactNode
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
  expandedRowId,
  renderExpandedRow,
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
      <Stack
        spacing={2}
        direction={{ xs: "column", md: "row" }}
        sx={{ p: 2 }}
        alignItems={{ xs: "stretch", md: "center" }}
      >
        <Box sx={{ width: { xs: "100%", md: "auto" } }}>
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
            fullWidth
            size="small"
            sx={{
              "& .MuiInputBase-root": { height: 40 }
            }}
          />
        </Box>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            width: { xs: "100%", md: "auto" },
            alignItems: "center",
            justifyContent: { xs: "space-between", md: "flex-start" }
          }}
        >
          {filter1 && (
            <TextField
              label={filter1.label}
              select
              value={filter1.value}
              onChange={e => filter1.setValue(e.target.value)}
              size="small"
              sx={{
                minWidth: 140,
                flex: { xs: 1, md: "initial" },
                "& .MuiInputBase-root": { height: 40 }
              }}
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
              sx={{
                minWidth: 140,
                flex: { xs: 1, md: "initial" },
                "& .MuiInputBase-root": { height: 40 }
              }}
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
            disabled={!setDescending}
            sx={{ height: 40, whiteSpace: "nowrap" }}
          >
            {descending ? t(TranslationKey.DATA_GRID_DESC) : t(TranslationKey.DATA_GRID_ASC)}
          </Button>
        </Box>
      </Stack>

      <Table sx={{ tableLayout: "fixed" }}>
        <TableHead>
          <TableRow>
            {selectableRows && <TableCell />}
            {columns.map(col => (
              <TableCell
                key={col.key}
                sx={{
                  ...(col.width ? { width: col.width, minWidth: col.width } : {}),
                  textAlign: "left",
                  ...(col.hideOnMobile ? { display: { xs: "none", md: "table-cell" } } : {})
                }}
              >
                {col.label}
              </TableCell>
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
            rows.flatMap((row, idx) => {
              const baseRow = (
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
                    <TableCell
                      key={col.key}
                      sx={{
                          ...(col.width ? { width: col.width, minWidth: col.width } : {}),
                          textAlign: "left",
                          ...(col.hideOnMobile ? { display: { xs: "none", md: "table-cell" } } : {})
                        }}
                    >
                      {row[col.key]}
                    </TableCell>
                  ))}
                </TableRow>
              )

              if (expandedRowId != null && renderExpandedRow && expandedRowId === row.id) {
                return [
                  baseRow,
                  <TableRow key={`expanded-${row.id}`}>
                    <TableCell colSpan={columns.length + (selectableRows ? 1 : 0)} sx={{ p: 0 }}>
                      {renderExpandedRow(row)}
                    </TableCell>
                  </TableRow>
                ]
              }

              return [baseRow]
            })
          )}
        </TableBody>
      </Table>
    </Paper>
  )
}

export default DataGridWithSearch