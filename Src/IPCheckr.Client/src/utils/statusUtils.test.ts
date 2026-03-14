import { describe, expect, it } from "vitest"
import { AssignmentGroupIpCat, AssignmentGroupStatus, GNS3SessionStatus } from "../dtos"
import { getGns3StatusMap } from "./getGns3StatusMap"
import { getIpCatLabel } from "./getIpCatLabel"
import { getStatusMap } from "./getStatusMap"
import { TranslationKey } from "./i18n"

const t = (key: string) => `tr:${key}`

describe("getStatusMap", () => {
  it("returns expected labels and colors", () => {
    const map = getStatusMap(t)

    expect(map[AssignmentGroupStatus.Upcoming]).toEqual({
      label: `tr:${TranslationKey.STATE_UPCOMING}`,
      color: "default",
    })
    expect(map[AssignmentGroupStatus.InProgress]).toEqual({
      label: `tr:${TranslationKey.STATE_IN_PROGRESS}`,
      color: "warning",
    })
    expect(map[AssignmentGroupStatus.Ended]).toEqual({
      label: `tr:${TranslationKey.STATE_ENDED}`,
      color: "success",
    })
  })
})

describe("getGns3StatusMap", () => {
  it("maps running and stopped values to semantic colors", () => {
    const map = getGns3StatusMap(t)

    expect(map[GNS3SessionStatus.Running].color).toBe("success")
    expect(map[GNS3SessionStatus.Stopped].color).toBe("info")
    expect(map.ERROR.label).toBe(`tr:${TranslationKey.GNS3_DATA_GRID_STATUS_ERROR}`)
    expect(map.UNKNOWN.label).toBe(`tr:${TranslationKey.GNS3_DATA_GRID_STATUS_UNKNOWN}`)
  })
})

describe("getIpCatLabel", () => {
  it("returns translated labels for known categories", () => {
    expect(getIpCatLabel(AssignmentGroupIpCat.All, t)).toBe(`tr:${TranslationKey.IP_CATEGORY_ALL}`)
    expect(getIpCatLabel(AssignmentGroupIpCat.Abc, t)).toBe(`tr:${TranslationKey.IP_CATEGORY_ABC}`)
    expect(getIpCatLabel(AssignmentGroupIpCat.Local, t)).toBe(`tr:${TranslationKey.IP_CATEGORY_PRIVATE}`)
  })

  it("falls back to unknown translation key for unsupported category", () => {
    const invalidValue = "INVALID" as AssignmentGroupIpCat

    expect(getIpCatLabel(invalidValue, t)).toBe("tr:unknown")
  })
})