import { useEffect, useState } from "react"
import type { FC } from "react"
import { Autocomplete, TextField } from "@mui/material"
import type { FieldError } from "react-hook-form"
import type { LdapUserDto } from "../../../dtos"
import { userApi } from "../../../utils/apiClients"
import { useTranslation } from "react-i18next"

interface LdapAutocompleteFieldProps {
  field: { onChange: (value: string) => void }
  error?: FieldError
  label: string
  placeholder: string
  noOptionsText: string
  loadingText: string
  minSearchChars?: number
}

const LdapAutocompleteField: FC<LdapAutocompleteFieldProps> = ({
  field,
  error,
  label,
  placeholder,
  noOptionsText,
  loadingText,
  minSearchChars = 2,
}) => {
  const { t } = useTranslation()
  const [options, setOptions] = useState<LdapUserDto[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const q = input.trim()
    if (!q || q.length < minSearchChars) { setOptions([]); return }
    let cancelled = false
    setLoading(true)
    const timer = setTimeout(() => {
      userApi.userLdapSearchUsers(q)
        .then(r => { if (!cancelled) setOptions(r.data.users ?? []) })
        .finally(() => { if (!cancelled) setLoading(false) })
    }, 250)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [input, minSearchChars])

  return (
    <Autocomplete
      loading={loading}
      options={options}
      getOptionLabel={o => o.username}
      noOptionsText={noOptionsText}
      loadingText={loadingText}
      onInputChange={(_, v) => setInput(v)}
      onChange={(_, v) => field.onChange(v ? (v as LdapUserDto).username : "")}
      renderInput={params => (
        <TextField
          {...params}
          margin="dense"
          fullWidth
          label={label}
          placeholder={placeholder}
          error={!!error}
          helperText={error ? t(error.message ?? "") : ""}
        />
      )}
    />
  )
}

export default LdapAutocompleteField