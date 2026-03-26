import { AssignmentGroupStatus, AssignmentGroupType } from "../../../dtos"
import UserRole from "../../../types/UserRole"
import { readDemoState } from "../../db"

type DemoState = Awaited<ReturnType<typeof readDemoState>>
type DemoGroup = DemoState["assignments"][number]
type DemoVariant = NonNullable<DemoGroup["studentAssignments"]>[number]

const nowMs = () => Date.now()

export const resolveStatus = (startDate: string, deadline: string, completedAt?: string | null) => {
  if (completedAt) return AssignmentGroupStatus.Ended

  const now = nowMs()
  const start = new Date(startDate).getTime()
  const end = new Date(deadline).getTime()
  if (now < start) return AssignmentGroupStatus.Upcoming
  if (now > end) return AssignmentGroupStatus.Ended
  return AssignmentGroupStatus.InProgress
}

export const getGroupVariants = (state: DemoState, group: DemoGroup): DemoVariant[] => {
  if (group.studentAssignments?.length) return group.studentAssignments

  const classObj = state.classes.find(c => c.className === group.className)
  const students = state.users.filter(user => user.role === UserRole.STUDENT && user.classIds.includes(classObj?.classId ?? -1))

  return students.map(student => ({
    assignmentId: group.id * 1000 + student.id,
    studentUserId: student.id,
    addresses: group.type === AssignmentGroupType.Idnet ? group.expectedRows.map(r => r.address) : undefined,
    cidr: group.type === AssignmentGroupType.Subnet ? (group.expectedRows[0]?.network ?? "-") : undefined,
    hosts: group.type === AssignmentGroupType.Subnet ? group.expectedRows.map(r => r.hosts ?? 0) : undefined,
    rows: group.expectedRows,
  }))
}

export const makeIdNetAgDto = (state: DemoState, assignment: DemoState["assignments"][number]) => {
  const classObj = state.classes.find(c => c.className === assignment.className)
  const variants = getGroupVariants(state, assignment)
  const related = state.submissions.filter(sub => variants.some(v => v.assignmentId === sub.assignmentId))
  const submittedStudents = new Set(related.map(r => r.studentUserId)).size
  const successRate = variants.length
    ? variants.reduce((sum, variant) => {
      const sub = related.find(r => r.assignmentId === variant.assignmentId)
      return sum + (sub?.score ?? 0)
    }, 0) / variants.length
    : 0

  return {
    assignmentGroupId: assignment.id,
    name: assignment.name,
    description: assignment.description,
    classId: classObj?.classId ?? 0,
    className: assignment.className,
    submitted: submittedStudents,
    total: variants.length,
    startDate: assignment.startDate,
    deadline: assignment.deadline,
    status: resolveStatus(assignment.startDate, assignment.deadline, assignment.completedAt ?? null),
    successRate,
    ipCat: assignment.ipCat,
    testWildcard: assignment.testWildcard,
    testFirstLastBr: assignment.testFirstLastBr,
  }
}

export const makeSubnetAgDto = (state: DemoState, assignment: DemoState["assignments"][number]) => {
  const classObj = state.classes.find(c => c.className === assignment.className)
  const variants = getGroupVariants(state, assignment)
  const related = state.submissions.filter(sub => variants.some(v => v.assignmentId === sub.assignmentId))
  const submittedStudents = new Set(related.map(r => r.studentUserId)).size
  const successRate = variants.length
    ? variants.reduce((sum, variant) => {
      const sub = related.find(r => r.assignmentId === variant.assignmentId)
      return sum + (sub?.score ?? 0)
    }, 0) / variants.length
    : 0

  return {
    assignmentGroupId: assignment.id,
    name: assignment.name,
    description: assignment.description,
    classId: classObj?.classId ?? 0,
    className: assignment.className,
    submitted: submittedStudents,
    total: variants.length,
    startDate: assignment.startDate,
    deadline: assignment.deadline,
    status: resolveStatus(assignment.startDate, assignment.deadline, assignment.completedAt ?? null),
    successRate,
    ipCat: assignment.ipCat,
    type: AssignmentGroupType.Subnet,
  }
}

export const normalizeIpCat = (value?: string | null): "LOCAL" | "ABC" | "ALL" => {
  if (value === "LOCAL") return "LOCAL"
  if (value === "ABC") return "ABC"
  return "ALL"
}

const prefixToMask = (prefix: number) => (prefix === 0 ? 0 : ((0xffffffff << (32 - prefix)) >>> 0))

const ipToUint = (ip: string) => {
  const parts = ip.split(".").map(p => Number(p) & 0xff)
  return ((((parts[0] << 24) >>> 0) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0)
}

const uintToIp = (ip: number) =>
  `${(ip >>> 24) & 0xff}.${(ip >>> 16) & 0xff}.${(ip >>> 8) & 0xff}.${ip & 0xff}`

const generateRandomIpUint = (rand: () => number, cat: string) => {
  let a = 0
  let b = 0
  let c = 0

  if (cat === "LOCAL") {
    const choice = Math.floor(rand() * 3)
    if (choice === 0) {
      a = 10
      b = Math.floor(rand() * 256)
      c = Math.floor(rand() * 256)
    } else if (choice === 1) {
      a = 172
      b = 16 + Math.floor(rand() * 16)
      c = Math.floor(rand() * 256)
    } else {
      a = 192
      b = 168
      c = Math.floor(rand() * 256)
    }
  } else if (cat === "ABC") {
    while (true) {
      a = 1 + Math.floor(rand() * 223)
      if (a === 127) continue
      b = Math.floor(rand() * 256)
      if (a === 10) continue
      if (a === 192 && b === 168) continue
      if (a === 172 && b >= 16 && b <= 31) continue
      if (a === 169 && b === 254) continue
      c = Math.floor(rand() * 256)
      break
    }
  } else {
    a = 1 + Math.floor(rand() * 223)
    if (a === 127) a = 126
    b = Math.floor(rand() * 256)
    c = Math.floor(rand() * 256)
  }

  return (((a << 24) >>> 0) | (b << 16) | (c << 8)) >>> 0
}

const generateRandomHostIpUint = (rand: () => number, cat: string) => {
  const base = generateRandomIpUint(rand, cat)
  const hostOctet = 1 + Math.floor(rand() * 254)
  return ((base & 0xffffff00) | hostOctet) >>> 0
}

const makeSeededRandom = () => {
  let seed = (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0
  return () => {
    seed = (1664525 * seed + 1013904223) >>> 0
    return seed / 0xffffffff
  }
}

export const generateIdNetData = (numberOfRecords: number, ipCat: string, possibleOctets: number) => {
  const rand = makeSeededRandom()
  const normalizedOctets = Math.max(1, Math.min(possibleOctets, 4))
  const minPrefix = Math.max(1, (normalizedOctets - 1) * 8)
  const maxPrefix = 30

  return Array.from({ length: numberOfRecords }, () => {
    const prefix = minPrefix + Math.floor(rand() * (maxPrefix - minPrefix + 1))
    const mask = prefixToMask(prefix)
    const wildcard = (~mask) >>> 0

    let hostIp = 0
    let network = 0
    let broadcast = 0

    do {
      hostIp = generateRandomHostIpUint(rand, ipCat)
      network = (hostIp & mask) >>> 0
      broadcast = (network | wildcard) >>> 0
    } while (hostIp === network || hostIp === broadcast)

    const first = prefix >= 31 ? network : network + 1
    const last = prefix >= 31 ? broadcast : broadcast - 1

    return {
      address: `${uintToIp(hostIp)}/${prefix}`,
      idNet: uintToIp(network),
      wildcard: uintToIp(wildcard),
      firstUsable: uintToIp(first),
      lastUsable: uintToIp(last),
      broadcast: uintToIp(broadcast),
    }
  })
}

export const tryGenerateSubnetData = (numberOfRecords: number, ipCat: string, maxAttempts = 1000) => {
  const attempts = ipCat === "LOCAL" ? Math.max(maxAttempts, 5000) : maxAttempts
  for (let attempt = 0; attempt < attempts; attempt++) {
    const rand = makeSeededRandom()
    const prefix = 16 + Math.floor(rand() * 13)

    const ipUint = generateRandomIpUint(rand, ipCat)
    const mask = prefixToMask(prefix)
    const networkIp = (ipUint & mask) >>> 0
    const cidr = `${uintToIp(networkIp)}/${prefix}`

    const hosts = Array.from({ length: numberOfRecords }, () => 2 + Math.floor(rand() * 252)).sort((a, b) => b - a)
    const totalNeeded = hosts.reduce((sum, h) => sum + h + 2, 0)
    const available = 2 ** (32 - prefix)
    if (totalNeeded <= available) return { cidr, hosts }
  }

  return null
}

export const calculateSubnetAnswerKey = (cidr: string, hosts: number[]) => {
  const [baseIp] = cidr.split("/")
  let ipInt = ipToUint(baseIp)

  return hosts.map(h => {
    const needed = h + 2
    const subnetBits = 32 - Math.ceil(Math.log2(needed))
    const subnetSize = 2 ** (32 - subnetBits)

    const network = ipInt
    const first = subnetBits >= 31 ? network : network + 1
    const last = subnetBits >= 31 ? network : network + subnetSize - 2
    const broadcast = network + subnetSize - 1

    ipInt = (ipInt + subnetSize) >>> 0

    return {
      hosts: h,
      network: `${uintToIp(network)}/${subnetBits}`,
      firstUsable: uintToIp(first),
      lastUsable: uintToIp(last),
      broadcast: uintToIp(broadcast),
    }
  })
}