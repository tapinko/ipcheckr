import type { DemoEndpointHandler } from "../../../types/DemoEndpointHandler"
import { parseBody, demoResponse } from "./_http"
import { readDemoState, writeDemoState } from "../../db"
import UserRole from "../../../types/UserRole"

export const addStudentToClassHandler: DemoEndpointHandler = async ({ config, path, method }) => {
  if (path !== "/api/classes/add-student") return null
  if (method !== "post") return null

  const body = parseBody(config) as { username?: string; classIds?: number[] } | null
  const username = (body?.username ?? "").trim()
  const classIds = (body?.classIds ?? []).filter(Number.isFinite)

  if (!username) return demoResponse(config, { messageEn: "Username is required" }, 400)
  if (!classIds.length) return demoResponse(config, { messageEn: "At least one class is required" }, 400)

  const state = await readDemoState()

  const student = state.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.role === UserRole.STUDENT)
  if (!student) return demoResponse(config, { messageEn: "Student does not exist" }, 400)

  const missingClass = classIds.some(id => !state.classes.find(c => c.classId === id))
  if (missingClass) return demoResponse(config, { messageEn: "Some classes do not exist" }, 400)

  const updatedClassIds = [...new Set([...student.classIds, ...classIds])]
  const users = state.users.map(u => u.id === student.id ? { ...u, classIds: updatedClassIds } : u)

  await writeDemoState({ ...state, users })

  return demoResponse(config, { userId: student.id })
}