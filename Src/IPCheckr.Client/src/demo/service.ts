import { readDemoState, writeDemoState, type DemoAssignment, type DemoSubmission } from "./db"
import { AssignmentGroupIpCat, AssignmentGroupType } from "../dtos"

export type DemoAssignmentWithSubmission = DemoAssignment & {
  submission?: DemoSubmission
}

type CreateAssignmentInput = {
  title: string
  description: string
  expectedAnswer: string
  createdByUserId: number
}

const normalize = (value: string) => value.trim().toLowerCase()

const scoreAnswer = (expectedAnswer: string, answer: string) => {
  return normalize(expectedAnswer) === normalize(answer) ? 100 : 0
}

export const createDemoAssignment = async (input: CreateAssignmentInput) => {
  const state = await readDemoState()

  const assignment: DemoAssignment = {
    id: Date.now(),
    type: AssignmentGroupType.Idnet,
    name: input.title.trim(),
    description: input.description.trim(),
    className: "Demo Class",
    teacherUsername: "teacher",
    ipCat: AssignmentGroupIpCat.Abc,
    startDate: new Date().toISOString(),
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    expectedRows: [
      {
        address: input.expectedAnswer.trim(),
        idNet: input.expectedAnswer.trim(),
      },
    ],
    testWildcard: false,
    testFirstLastBr: false,
    createdByUserId: input.createdByUserId,
  }

  const nextState = {
    ...state,
    assignments: [assignment, ...state.assignments],
  }

  await writeDemoState(nextState)
  return assignment
}

export const listDemoAssignments = async () => {
  const state = await readDemoState()
  return state.assignments
}

export const listDemoAssignmentsForStudent = async (studentUserId: number): Promise<DemoAssignmentWithSubmission[]> => {
  const state = await readDemoState()

  return state.assignments.map(assignment => {
    const submission = state.submissions.find(
      item => item.assignmentId === assignment.id && item.studentUserId === studentUserId,
    )
    return { ...assignment, submission }
  })
}

export const submitDemoAssignment = async (input: {
  assignmentId: number
  studentUserId: number
  answer: string
}) => {
  const state = await readDemoState()
  const assignment = state.assignments.find(item => item.id === input.assignmentId)

  if (!assignment) {
    throw new Error("Assignment not found in this demo session.")
  }

  const expected = assignment.expectedRows[0]?.idNet ?? ""
  const score = scoreAnswer(expected, input.answer)
  const submission: DemoSubmission = {
    id: Date.now(),
    assignmentId: input.assignmentId,
    studentUserId: input.studentUserId,
    rows: [
      {
        idNet: input.answer.trim(),
      },
    ],
    score,
    submittedAt: new Date().toISOString(),
  }

  const filteredSubmissions = state.submissions.filter(
    item => !(item.assignmentId === input.assignmentId && item.studentUserId === input.studentUserId),
  )

  const nextState = {
    ...state,
    submissions: [submission, ...filteredSubmissions],
  }

  await writeDemoState(nextState)
  return submission
}