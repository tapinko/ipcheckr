import { AssignmentGroupState } from "../dtos"
import { TranslationKey } from "./i18n"

type StateMapType = Record<AssignmentGroupState, { label: string; color: "success" | "warning" | "default" }>

/**
 * @param t - Translation function to get localized labels.
 * @returns A map where keys are AssignmentGroupState and values are objects containing label and color
 * for the state.
 */
export function getStateMap(t: (key: string) => string): StateMapType {
  return {
    [AssignmentGroupState.Ended]: { label: t(TranslationKey.STATE_ENDED), color: "success" },
    [AssignmentGroupState.InProgress]: { label: t(TranslationKey.STATE_IN_PROGRESS), color: "warning" },
    [AssignmentGroupState.Upcoming]: { label: t(TranslationKey.STATE_UPCOMING), color: "default" },
  }
}