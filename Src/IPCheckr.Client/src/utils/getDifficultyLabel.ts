import { TranslationKey } from "./i18n"
import { AssignmentGroupDifficulty } from "../dtos"

export const getDifficultyLabel = (value: AssignmentGroupDifficulty, t: (key: string) => string): string =>
	value === AssignmentGroupDifficulty.Easy
		? t(TranslationKey.AG_HEADER_DIFFICULTY_EASY)
		: value === AssignmentGroupDifficulty.Medium
		? t(TranslationKey.AG_HEADER_DIFFICULTY_MEDIUM)
		: value === AssignmentGroupDifficulty.Hard
		? t(TranslationKey.AG_HEADER_DIFFICULTY_HARD)
		: t("unknown")

export const getDifficultyColor = (value: AssignmentGroupDifficulty): "success" | "warning" | "error" | "default" =>
	value === AssignmentGroupDifficulty.Easy
		? "success"
		: value === AssignmentGroupDifficulty.Medium
		? "warning"
		: value === AssignmentGroupDifficulty.Hard
		? "error"
		: "default"