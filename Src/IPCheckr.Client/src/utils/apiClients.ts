import { UserApi, ClassApi, AuthApi, AssignmentGroupApi, AssignmentApi, AssignmentSubmitApi, AppSettingsApi, DashboardApi, Gns3Api, AGTemplateApi, AppConfigApi, UpdaterApi } from "../dtos/api"
import { Configuration } from "../dtos/configuration"
import axiosInstance from "./axiosInstance"
import getApiBase from "./getApiBase"

const configuration = /*#__PURE__*/ new Configuration({ basePath: getApiBase() })

export const userApi = /*#__PURE__*/ new UserApi(configuration, undefined, axiosInstance)
export const classApi = /*#__PURE__*/ new ClassApi(configuration, undefined, axiosInstance)
export const authApi = /*#__PURE__*/ new AuthApi(configuration, undefined, axiosInstance)
export const assignmentGroupApi = /*#__PURE__*/ new AssignmentGroupApi(configuration, undefined, axiosInstance)
export const assignmentApi = /*#__PURE__*/ new AssignmentApi(configuration, undefined, axiosInstance)
export const assignmentSubmitApi = /*#__PURE__*/ new AssignmentSubmitApi(configuration, undefined, axiosInstance)
export const appSettingsApi = /*#__PURE__*/ new AppSettingsApi(configuration, undefined, axiosInstance)
export const dashboardApi = /*#__PURE__*/ new DashboardApi(configuration, undefined, axiosInstance)
export const gns3Api = /*#__PURE__*/ new Gns3Api(configuration, undefined, axiosInstance)
export const agTemplateApi = /*#__PURE__*/ new AGTemplateApi(configuration, undefined, axiosInstance)
export const appConfigApi = /*#__PURE__*/ new AppConfigApi(configuration, undefined, axiosInstance)
export const updaterApi = /*#__PURE__*/ new UpdaterApi(configuration, undefined, axiosInstance)