import { getIdnetAssignmentsHandler } from "./assignment.getIdnetAssignments"
import { getIdnetDataForSubmitHandler } from "./assignment.getIdnetDataForSubmit"
import { getIdnetSubmitDetailsFullHandler } from "./assignment.getIdnetSubmitDetailsFull"
import { getSubnetAssignmentsHandler } from "./assignment.getSubnetAssignments"
import { getSubnetDataForSubmitHandler } from "./assignment.getSubnetDataForSubmit"
import { getSubnetSubmitDetailsFullHandler } from "./assignment.getSubnetSubmitDetailsFull"
import { submitIdnetAssignmentHandler } from "./assignment.submitIdnet"
import { submitSubnetAssignmentHandler } from "./assignment.submitSubnet"
import { createIdnetAssignmentGroupHandler } from "./assignmentGroup.createIdnet"
import { createSubnetAssignmentGroupHandler } from "./assignmentGroup.createSubnet"
import { deleteIdnetAssignmentGroupsHandler } from "./assignmentGroup.deleteIdnet"
import { deleteSubnetAssignmentGroupsHandler } from "./assignmentGroup.deleteSubnet"
import { editIdnetAssignmentGroupHandler } from "./assignmentGroup.editIdnet"
import { editSubnetAssignmentGroupHandler } from "./assignmentGroup.editSubnet"
import { getIdnetAssignmentGroupDetailsHandler } from "./assignmentGroup.getIdnetDetails"
import { getIdnetAssignmentGroupsHandler } from "./assignmentGroup.getIdnetGroups"
import { getSubnetAssignmentGroupDetailsHandler } from "./assignmentGroup.getSubnetDetails"
import { getSubnetAssignmentGroupsHandler } from "./assignmentGroup.getSubnetGroups"
import { createClassHandler } from "./classes.createClass"
import { deleteClassesHandler } from "./classes.deleteClasses"
import { editClassHandler } from "./classes.editClass"
import { getClassDetailsHandler } from "./classes.getClassDetails"
import { getClassesHandler } from "./classes.getClasses"
import { getStudentDashboardHandler } from "./dashboard.getStudentDashboard"
import { getTeacherDashboardHandler } from "./dashboard.getTeacherDashboard"
import { addUserHandler } from "./users.addUser"
import { deleteUsersHandler } from "./users.deleteUsers"
import { editUserHandler } from "./users.editUser"
import { getUserDetailsHandler } from "./users.getUserDetails"
import { getUsersHandler } from "./users.getUsers"
import { isLdapAuthHandler } from "./users.isLdapAuth"
import type { DemoEndpointHandler } from "../types"

export const demoEndpointHandlers: DemoEndpointHandler[] = [
  getStudentDashboardHandler,
  getTeacherDashboardHandler,
  isLdapAuthHandler,
  getUsersHandler,
  addUserHandler,
  editUserHandler,
  deleteUsersHandler,
  getUserDetailsHandler,
  getClassesHandler,
  createClassHandler,
  editClassHandler,
  deleteClassesHandler,
  getClassDetailsHandler,
  getIdnetAssignmentGroupsHandler,
  getSubnetAssignmentGroupsHandler,
  getIdnetAssignmentGroupDetailsHandler,
  getSubnetAssignmentGroupDetailsHandler,
  createIdnetAssignmentGroupHandler,
  createSubnetAssignmentGroupHandler,
  editIdnetAssignmentGroupHandler,
  editSubnetAssignmentGroupHandler,
  deleteIdnetAssignmentGroupsHandler,
  deleteSubnetAssignmentGroupsHandler,
  getIdnetAssignmentsHandler,
  getSubnetAssignmentsHandler,
  getIdnetSubmitDetailsFullHandler,
  getSubnetSubmitDetailsFullHandler,
  getIdnetDataForSubmitHandler,
  getSubnetDataForSubmitHandler,
  submitIdnetAssignmentHandler,
  submitSubnetAssignmentHandler,
]