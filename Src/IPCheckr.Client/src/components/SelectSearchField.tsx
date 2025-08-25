import { TextField, MenuItem } from "@mui/material"

interface ISelectSearchFieldProps {
  label: string
  items: Record<string, any>[]
  value: string | number | undefined
  onChange: (item: Record<string, any>) => void
  valueKey: string
  labelKey: string
  sx?: object
}

/**
 * Component for selecting an item from a dropdown menu.
 */
const SelectSearchField = ({
  label,
  items,
  value,
  onChange,
  valueKey,
  labelKey,
  sx,
}: ISelectSearchFieldProps) => (
  <TextField
    margin="dense"
    label={label}
    select
    sx={sx}
    value={value ?? ""}
    onChange={e => {
      const selected = items.find(
        item => String(item[valueKey]) === e.target.value
      )
      if (selected) onChange(selected)
    }}
  >
    {items.map(item => (
      <MenuItem key={String(item[valueKey])} value={String(item[valueKey])}>
        {String(item[labelKey])}
      </MenuItem>
    ))}
  </TextField>
)

export default SelectSearchField