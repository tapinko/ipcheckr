import { createContext, useContext, useEffect, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { type AppConfigDto } from "../dtos/api"
import { appConfigApi } from "../utils/apiClients"
import i18n from "../utils/i18n"

type AppConfigContextType = {
  config: AppConfigDto | null
  isLoading: boolean
}

const AppConfigContext = createContext<AppConfigContextType>({
  config: null,
  isLoading: true,
})

const fetchAppConfig = async (): Promise<AppConfigDto> => {
  const res = await appConfigApi.appConfigGetAppConfig()
  return res.data
}

export const AppConfigProvider = ({ children }: { children: ReactNode }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["app-config"],
    queryFn: fetchAppConfig,
    staleTime: Infinity,
    retry: 1,
  })

  useEffect(() => {
    if (data) {
      i18n.changeLanguage(data.defaultLanguage)
    }
  }, [data])

  return (
    <AppConfigContext.Provider value={{ config: data ?? null, isLoading }}>
      {children}
    </AppConfigContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAppConfig = () => useContext(AppConfigContext)