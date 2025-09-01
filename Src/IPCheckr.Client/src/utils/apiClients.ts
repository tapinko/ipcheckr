import { UserApi, ClassApi, AuthApi, AssignmentGroupApi, AssignmentApi, AssignmentSubmitApi, AppSettingsApi, DashboardApi } from "../dtos/api"
import { Configuration } from "../dtos/configuration"
import axiosInstance from "./axiosInstance"
import getApiBase from "./getApiBase"

const configuration = new Configuration({ basePath: getApiBase() })

export const userApi = new UserApi(configuration, undefined, axiosInstance)
export const classApi = new ClassApi(configuration, undefined, axiosInstance)
export const authApi = new AuthApi(configuration, undefined, axiosInstance)
export const assignmentGroupApi = new AssignmentGroupApi(configuration, undefined, axiosInstance)
export const assignmentApi = new AssignmentApi(configuration, undefined, axiosInstance)
export const assignmentSubmitApi = new AssignmentSubmitApi(configuration, undefined, axiosInstance)
export const appSettingsApi = new AppSettingsApi(configuration, undefined, axiosInstance)
export const dashboardApi = new DashboardApi(configuration, undefined, axiosInstance)