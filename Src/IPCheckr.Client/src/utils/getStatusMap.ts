import { AssignmentGroupStatus } from "../dtos"
import { TranslationKey } from "./i18n"

type StatusMapType = Record<AssignmentGroupStatus, { label: string; color: "success" | "default" }>

/**
 * @param t - Translation function to get localized labels.
 * @returns A map where keys are AssignmentGroupStatus and values are objects containing label and color
 * for the status.
 */
export function getStatusMap(t: (key: string) => string): StatusMapType {
  return {
    [AssignmentGroupStatus.Completed]: { label: t(TranslationKey.STATUS_COMPLETED), color: "success" },
    [AssignmentGroupStatus.NotCompleted]: { label: t(TranslationKey.STATUS_NOT_COMPLETED), color: "default" },
  }
}