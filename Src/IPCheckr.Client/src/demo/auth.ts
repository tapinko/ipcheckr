import UserRole from "../types/UserRole"
import i18n, { TranslationKey } from "../utils/i18n"

type DemoUser = {
  id: number
  username: string
  password: string
  role: UserRole
}

type DemoTokenPayload = {
  userId: number
  username: string
  role: UserRole
  issuedAt: number
}

export type DemoAuthResult = {
  token: string
  role: UserRole
}

export type DemoValidatedAuth = {
  isValid: boolean
  role: UserRole | null
  username: string | null
  userId: number | null
}

const DEMO_USERS: DemoUser[] = [
  { id: 101, username: "teacher", password: "cisco", role: UserRole.TEACHER },
  { id: 102, username: "ucitel", password: "cisco", role: UserRole.TEACHER },
  { id: 201, username: "student", password: "cisco", role: UserRole.STUDENT },
  { id: 202, username: "ziak", password: "cisco", role: UserRole.STUDENT },
]

const encodeToken = (payload: DemoTokenPayload) => {
  const serialized = JSON.stringify(payload)
  return `demo.${window.btoa(serialized)}`
}

const decodeToken = (token: string): DemoTokenPayload | null => {
  if (!token.startsWith("demo.")) return null

  const encoded = token.slice(5)
  if (!encoded) return null

  try {
    const decoded = window.atob(encoded)
    const parsed = JSON.parse(decoded) as Partial<DemoTokenPayload>
    if (
      typeof parsed.userId !== "number" ||
      typeof parsed.username !== "string" ||
      typeof parsed.role !== "string" ||
      typeof parsed.issuedAt !== "number"
    ) {
      return null
    }

    if (!Object.values(UserRole).includes(parsed.role as UserRole)) return null

    return parsed as DemoTokenPayload
  } catch {
    return null
  }
}

export const demoLogin = async (username: string, password: string): Promise<DemoAuthResult> => {
  const normalizedUsername = username.trim().toLowerCase()
  const user = DEMO_USERS.find(
    candidate => candidate.username.toLowerCase() === normalizedUsername && candidate.password === password,
  )

  if (!user) {
    throw new Error(i18n.t(TranslationKey.LOGIN_INVALID_DEMO_CREDENTIALS))
  }

  const token = encodeToken({
    userId: user.id,
    username: user.username,
    role: user.role,
    issuedAt: Date.now(),
  })

  return { token, role: user.role }
}

export const demoValidateToken = async (token: string): Promise<DemoValidatedAuth> => {
  const payload = decodeToken(token)
  if (!payload) {
    return {
      isValid: false,
      role: null,
      username: null,
      userId: null,
    }
  }

  const user = DEMO_USERS.find(candidate => candidate.id === payload.userId && candidate.role === payload.role)
  if (!user) {
    return {
      isValid: false,
      role: null,
      username: null,
      userId: null,
    }
  }

  return {
    isValid: true,
    role: payload.role,
    username: payload.username,
    userId: payload.userId,
  }
}

export const getDemoUsers = () => DEMO_USERS.map(({ id, username, role }) => ({ id, username, role }))