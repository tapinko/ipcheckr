import { AssignmentGroupType } from "../dtos"

export const toAssignmentTypeParam = (type: AssignmentGroupType) => {
  if (type === AssignmentGroupType.Subnet) return "subnet" as const
  if (type === AssignmentGroupType.Idnet) return "idnet" as const
}

export const fromAssignmentTypeParam = (value?: string | null) => {
  const normalized = value?.toLowerCase()
  if (normalized === "subnet") return AssignmentGroupType.Subnet
  if (normalized === "idnet") return AssignmentGroupType.Idnet
}