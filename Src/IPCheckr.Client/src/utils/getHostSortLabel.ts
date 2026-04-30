import { TranslationKey } from "./i18n"
import { AssignmentGroupHostSortStrategy } from "../dtos"

export const getHostSortLabel = (value: AssignmentGroupHostSortStrategy, t: (key: string) => string): string =>
	value === AssignmentGroupHostSortStrategy.Random
		? t(TranslationKey.TEACHER_CREATE_ASSIGNMENT_GROUP_HOST_SORT_RANDOM)
		: value === AssignmentGroupHostSortStrategy.Ascending
		? t(TranslationKey.TEACHER_CREATE_ASSIGNMENT_GROUP_HOST_SORT_ASCENDING)
		: value === AssignmentGroupHostSortStrategy.Descending
		? t(TranslationKey.TEACHER_CREATE_ASSIGNMENT_GROUP_HOST_SORT_DESCENDING)
		: t("unknown")