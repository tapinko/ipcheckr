import { createContext, useState } from "react"
import type { ReactNode, Dispatch, SetStateAction, FC } from "react"

// eslint-disable-next-line react-refresh/only-export-components
export const ThemeContext = createContext<{
  mode: "dark" | "light"
  setMode: Dispatch<SetStateAction<"dark" | "light">>
}>({
  mode: "dark",
  setMode: () => {},
})

export const NestedThemeProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<"light" | "dark">("dark")

  return (
    <ThemeContext.Provider value={{ mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  )
}