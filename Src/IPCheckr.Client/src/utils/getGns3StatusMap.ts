import { GNS3SessionStatus } from "../dtos"
import { TranslationKey } from "./i18n"

export type Gns3StatusKey = GNS3SessionStatus | "ERROR" | "UNKNOWN"

type Gns3StatusMapType = Record<Gns3StatusKey, { label: string; color: "default" | "success" | "error" | "warning" | "info" }>


/**
 * 
 * Returns a mapping of GNS3 session statuses to their localized labels and associated colors
 * @param t 
 * @returns 
 */
export const getGns3StatusMap = (t: (key: TranslationKey) => string): Gns3StatusMapType => ({
  [GNS3SessionStatus.Running]: { label: t(TranslationKey.GNS3_DATA_GRID_STATUS_RUNNING), color: "success" },
  [GNS3SessionStatus.Stopped]: { label: t(TranslationKey.GNS3_DATA_GRID_STATUS_STOPPED), color: "info" },
  ERROR: { label: t(TranslationKey.GNS3_DATA_GRID_STATUS_ERROR), color: "error" },
  UNKNOWN: { label: t(TranslationKey.GNS3_DATA_GRID_STATUS_UNKNOWN), color: "warning" },
})