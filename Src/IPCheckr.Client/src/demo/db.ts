import { isDemoMode } from "../config/demoMode"
import { AssignmentGroupDifficulty, AssignmentGroupHostSortStrategy, AssignmentGroupIpCat, AssignmentGroupType } from "../dtos"
import UserRole from "../types/UserRole"

const DEMO_DB_NAME = "ipcheckr-demo"
const DEMO_DB_VERSION = 1
const DEMO_STORE = "state"

export type DemoAssignment = {
  id: number
  type: typeof AssignmentGroupType[keyof typeof AssignmentGroupType]
  name: string
  description: string
  className: string
  teacherUsername: string
  ipCat: typeof AssignmentGroupIpCat[keyof typeof AssignmentGroupIpCat]
  startDate: string
  deadline: string
  completedAt?: string | null
  expectedRows: Array<{
    hosts?: number
    network?: string
    address: string
    idNet?: string
    wildcard?: string
    firstUsable?: string
    lastUsable?: string
    broadcast?: string
  }>
  testWildcard: boolean
  testFirstLastBr: boolean
  isArchived: boolean
  createdByUserId: number
  studentAssignments?: Array<{
    assignmentId: number
    studentUserId: number
    cidr?: string
    hosts?: number[]
    addresses?: string[]
    rows: Array<{
      hosts?: number
      network?: string
      address?: string
      idNet?: string
      wildcard?: string
      firstUsable?: string
      lastUsable?: string
      broadcast?: string
    }>
  }>
}

export type DemoSubmission = {
  id: number
  assignmentId: number
  studentUserId: number
  rows: Array<{
    network?: string
    idNet?: string
    wildcard?: string
    firstUsable?: string
    lastUsable?: string
    broadcast?: string
  }>
  score: number
  submittedAt: string
}

export type DemoTemplate = {
  id: number
  name: string
  agName: string | null
  agDescription: string | null
  type: typeof AssignmentGroupType[keyof typeof AssignmentGroupType]
  ipCat: typeof AssignmentGroupIpCat[keyof typeof AssignmentGroupIpCat]
  numberOfRecords: number
  difficulty: string | null
  hostSortStrategy: string | null
  possibleOctets: number | null
  testWildcard: boolean
  testFirstLastBr: boolean
}

export type DemoState = {
  users: Array<{
    id: number
    username: string
    password: string
    role: UserRole
    classIds: number[]
  }>
  classes: Array<{
    classId: number
    className: string
    teachers: number[]
    teacherUsernames: string[]
  }>
  assignments: DemoAssignment[]
  submissions: DemoSubmission[]
  templates: DemoTemplate[]
}

type DemoStateRecord = {
  id: string
  value: DemoState
}

const getOrCreateDemoSessionId = () => { return "demo" }

const createDefaultState = (): DemoState => ({
  users: [
    { id: 101, username: "teacher", password: "cisco", role: UserRole.TEACHER, classIds: [1] },
    { id: 201, username: "student", password: "cisco", role: UserRole.STUDENT, classIds: [1] },
    { id: 102, username: "ucitel", password: "cisco", role: UserRole.TEACHER, classIds: [1] },
    { id: 202, username: "ziak", password: "cisco", role: UserRole.STUDENT, classIds: [1] },
  ],
  classes: [
    {
      classId: 1,
      className: "democlass",
      teachers: [101, 102],
      teacherUsernames: ["teacher", "ucitel"],
    },
  ],
  assignments: [],
  submissions: [],
  templates: [
    {
      id: 1,
      name: "Subnet Basics",
      agName: "Network Addressing",
      agDescription: "Basic subnetting - class ABC, easy difficulty",
      type: AssignmentGroupType.Subnet,
      ipCat: AssignmentGroupIpCat.Abc,
      numberOfRecords: 6,
      difficulty: AssignmentGroupDifficulty.Easy,
      hostSortStrategy: AssignmentGroupHostSortStrategy.Descending,
      possibleOctets: null,
      testWildcard: false,
      testFirstLastBr: false,
    },
    {
      id: 2,
      name: "Advanced Subnet",
      agName: "Advanced Subnetting",
      agDescription: "All IP categories, medium difficulty, random order",
      type: AssignmentGroupType.Subnet,
      ipCat: AssignmentGroupIpCat.All,
      numberOfRecords: 8,
      difficulty: AssignmentGroupDifficulty.Medium,
      hostSortStrategy: AssignmentGroupHostSortStrategy.Random,
      possibleOctets: null,
      testWildcard: false,
      testFirstLastBr: false,
    },
    {
      id: 3,
      name: "Subnet Local Networks",
      agName: "Local Addressing",
      agDescription: "Private IP ranges, hard difficulty, ascending order",
      type: AssignmentGroupType.Subnet,
      ipCat: AssignmentGroupIpCat.Local,
      numberOfRecords: 10,
      difficulty: AssignmentGroupDifficulty.Hard,
      hostSortStrategy: AssignmentGroupHostSortStrategy.Ascending,
      possibleOctets: null,
      testWildcard: false,
      testFirstLastBr: false,
    },
    {
      id: 4,
      name: "Subnet Quick Test",
      agName: null,
      agDescription: "Short subnet test, 4 records",
      type: AssignmentGroupType.Subnet,
      ipCat: AssignmentGroupIpCat.Abc,
      numberOfRecords: 4,
      difficulty: AssignmentGroupDifficulty.Medium,
      hostSortStrategy: AssignmentGroupHostSortStrategy.Descending,
      possibleOctets: null,
      testWildcard: false,
      testFirstLastBr: false,
    },
    {
      id: 5,
      name: "IDNet Basics",
      agName: "Network Identification",
      agDescription: "Basic network identification with wildcard masks",
      type: AssignmentGroupType.Idnet,
      ipCat: AssignmentGroupIpCat.Abc,
      numberOfRecords: 6,
      difficulty: AssignmentGroupDifficulty.Medium,
      hostSortStrategy: AssignmentGroupHostSortStrategy.Descending,
      possibleOctets: 3,
      testWildcard: true,
      testFirstLastBr: false,
    },
    {
      id: 6,
      name: "Advanced IDNet",
      agName: "Advanced IDNet Analysis",
      agDescription: "All IP categories, tests first/last and broadcast",
      type: AssignmentGroupType.Idnet,
      ipCat: AssignmentGroupIpCat.All,
      numberOfRecords: 8,
      difficulty: AssignmentGroupDifficulty.Medium,
      hostSortStrategy: AssignmentGroupHostSortStrategy.Descending,
      possibleOctets: 4,
      testWildcard: false,
      testFirstLastBr: true,
    },
  ],
})

const ensureStateShape = (state: DemoState): DemoState => {
  const defaults = createDefaultState()
  return {
    users: state.users ?? defaults.users,
    classes: state.classes ?? defaults.classes,
    assignments: state.assignments ?? defaults.assignments,
    submissions: state.submissions ?? defaults.submissions,
    templates: (state.templates && state.templates.length > 0) ? state.templates : defaults.templates,
  }
}

const openDemoDb = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DEMO_DB_NAME, DEMO_DB_VERSION)

    request.onerror = () => reject(request.error ?? new Error("Unable to open demo IndexedDB"))
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(DEMO_STORE)) {
        db.createObjectStore(DEMO_STORE, { keyPath: "id" })
      }
    }
  })

const withStore = async <T>(
  mode: IDBTransactionMode,
  handler: (store: IDBObjectStore, done: (value: T) => void, fail: (error: unknown) => void) => void,
) => {
  const db = await openDemoDb()

  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(DEMO_STORE, mode)
    const store = tx.objectStore(DEMO_STORE)
    let settled = false

    const done = (value: T) => {
      if (settled) return
      settled = true
      resolve(value)
    }

    const fail = (error: unknown) => {
      if (settled) return
      settled = true
      reject(error)
    }

    tx.onabort = () => fail(tx.error ?? new Error("Demo IndexedDB transaction aborted"))
    tx.onerror = () => fail(tx.error ?? new Error("Demo IndexedDB transaction failed"))

    handler(store, done, fail)
  }).finally(() => {
    db.close()
  })
}

const getStateRecordId = () => `state:${getOrCreateDemoSessionId()}`

export const initDemoDb = async () => {
  if (!isDemoMode) return

  const state = await readDemoState()
  await writeDemoState(state)
}

export const readDemoState = async (): Promise<DemoState> => {
  const recordId = getStateRecordId()

  const record = await withStore<DemoStateRecord | null>("readonly", (store, done, fail) => {
    const request = store.get(recordId)
    request.onerror = () => fail(request.error ?? new Error("Unable to read demo state"))
    request.onsuccess = () => {
      done((request.result as DemoStateRecord | undefined) ?? null)
    }
  })

  const value = record?.value ?? createDefaultState()
  return ensureStateShape(value)
}

export const writeDemoState = async (value: DemoState) => {
  const recordId = getStateRecordId()

  await withStore<void>("readwrite", (store, done, fail) => {
    const request = store.put({ id: recordId, value } satisfies DemoStateRecord)
    request.onerror = () => fail(request.error ?? new Error("Unable to write demo state"))
    request.onsuccess = () => done(undefined)
  })
}

export const resetDemoState = async () => {
  await writeDemoState(createDefaultState())

  sessionStorage.removeItem("token")
  sessionStorage.removeItem("role")
  sessionStorage.removeItem("userId")
  localStorage.removeItem("token")
  window.location.href = "/login"
}