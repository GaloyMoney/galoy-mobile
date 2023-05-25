import { useColorSchemeQuery } from "@app/graphql/generated"
import { useThemeMode, ThemeMode } from "@rneui/themed"
import React, { useEffect } from "react"
import { Appearance } from "react-native"

export const ThemeSync = () => {
  const { mode, setMode } = useThemeMode()

  React.useEffect(() => {
    const isDarkMode = Appearance.getColorScheme() !== "light"
    const intendedMode = isDarkMode ? "dark" : "light"

    if (intendedMode !== mode) {
      setMode(intendedMode)
    }
  }, [mode, setMode])

  React.useEffect(() => {
    const res = Appearance.addChangeListener(({ colorScheme }) => {
      if (mode === colorScheme) {
        return
      }

      if (colorScheme === null || colorScheme === undefined) {
        setMode("dark")
      }

      setMode(colorScheme as ThemeMode) // TODO: not do casting?
    })

    return res.remove
  }, [mode, setMode])

  return null
}

export const ThemeSyncGraphql = () => {
  const { mode, setMode } = useThemeMode()

  const data = useColorSchemeQuery()

  useEffect(() => {
    const scheme = data?.data?.colorScheme

    if (!scheme) {
      return () => {}
    }

    const systemScheme = Appearance.getColorScheme()

    if (scheme !== mode && scheme !== "system") {
      setMode(scheme as ThemeMode)
    } else if (scheme === "system" && systemScheme !== mode) {
      setMode(systemScheme as ThemeMode)
    }

    if (scheme === "system") {
      const stopListener = Appearance.addChangeListener(({ colorScheme }) => {
        if (!colorScheme) return
        if (colorScheme !== mode) setMode(colorScheme as ThemeMode)
      })
      return () => stopListener.remove()
    }

    return () => {}
  }, [data, setMode, mode])

  return null
}
