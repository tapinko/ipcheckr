import { TranslationKey } from "./i18n"
import { AssignmentGroupIpCat } from "../dtos"

/**
 * Returns the localized label for a given AssignmentIpCat value.
 *
 * @param value - The AssignmentIpCat value.
 * @param t - The translation function.
 * @returns The localized label corresponding to the AssignmentIpCat value.
 */
export const getIpCatLabel = (value: AssignmentGroupIpCat, t: (key: string) => string): string =>
	value === AssignmentGroupIpCat.All
		? t(TranslationKey.IP_CATEGORY_ALL)
		: value === AssignmentGroupIpCat.Abc
		? t(TranslationKey.IP_CATEGORY_ABC)
		: value === AssignmentGroupIpCat.Local
		? t(TranslationKey.IP_CATEGORY_PRIVATE)
		: t("unknown")