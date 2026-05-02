import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material"
import { AssignmentGroupIpCat, AssignmentGroupType } from "../../dtos"

type AGTypeIpCatSelectorLabels = {
  typeLabel: string
  subnet: string
  idnet: string
  ipCatLabel: string
  ipCatAbc: string
  ipCatAll: string
  ipCatLocal: string
}

type Props = {
  selectedType: AssignmentGroupType
  selectedIpCat: AssignmentGroupIpCat
  onTypeChange: (type: AssignmentGroupType) => void
  onIpCatChange: (ipCat: AssignmentGroupIpCat) => void
  labels: AGTypeIpCatSelectorLabels
}

const AGTypeIpCatSelector = ({ selectedType, selectedIpCat, onTypeChange, onIpCatChange, labels }: Props) => (
  <Stack spacing={2}>
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: "block" }}>
        {labels.typeLabel}
      </Typography>
      <ToggleButtonGroup
        value={selectedType}
        exclusive
        onChange={(_, val) => val && onTypeChange(val)}
        size="small"
        sx={{ width: "100%" }}
      >
        <ToggleButton value={AssignmentGroupType.Subnet} sx={{ flex: 1 }}>{labels.subnet}</ToggleButton>
        <ToggleButton value={AssignmentGroupType.Idnet} sx={{ flex: 1 }}>{labels.idnet}</ToggleButton>
      </ToggleButtonGroup>
    </Box>
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: "block" }}>
        {labels.ipCatLabel}
      </Typography>
      <ToggleButtonGroup
        value={selectedIpCat}
        exclusive
        onChange={(_, val) => val && onIpCatChange(val)}
        size="small"
        sx={{ width: "100%" }}
      >
        <ToggleButton value={AssignmentGroupIpCat.Abc} sx={{ flex: 1 }}>{labels.ipCatAbc}</ToggleButton>
        <ToggleButton value={AssignmentGroupIpCat.All} sx={{ flex: 1 }}>{labels.ipCatAll}</ToggleButton>
        <ToggleButton value={AssignmentGroupIpCat.Local} sx={{ flex: 1 }}>{labels.ipCatLocal}</ToggleButton>
      </ToggleButtonGroup>
    </Box>
  </Stack>
)

export default AGTypeIpCatSelector