import React, { createContext, useContext, useEffect, useState } from 'react'
import { PRESET_THEMES, PresetThemeType } from '../../components/drawer/PresetTheme'

type Theme = 'dark' | 'light' | 'system'

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

interface ColorSettings {
  primary: string
  background: string
  cardBackground: string
  sidebar: string
}

interface ThemeProviderState {
  theme: Theme
  setTheme: (theme: Theme) => void
  colorSettings: ColorSettings
  setColorSettings: (settings: ColorSettings) => void
}

const initialColors: ColorSettings = {
  primary: '#3686ff',
  background: '#ffffff',
  cardBackground: '#ffffff',
  sidebar: '#f9fafb'
}

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => {},
  colorSettings: initialColors,
  setColorSettings: () => {}
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'vite-ui-theme'
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )

  const [colorSettings, setColorSettingsState] = useState<ColorSettings>(() => {
    const saved = localStorage.getItem(`${storageKey}-colors`)
    if (saved) {
      return JSON.parse(saved)
    }
    // default fallback based on defaultTheme preset
    const themeKey: 'light' | 'dark' = defaultTheme === 'light' ? 'light' : 'dark'
    const presets: PresetThemeType[] = PRESET_THEMES[themeKey]
    const preset: PresetThemeType =
      presets.find(
        (t: PresetThemeType) => t.name === (defaultTheme === 'dark' ? 'Midnight Dark' : 'Default')
      ) || presets[0]
    return {
      primary: preset.primary,
      background: preset.background,
      cardBackground: preset.cardBackground,
      sidebar: preset.sidebarBackground || preset.cardBackground
    }
  })

  const updateColorSettings = (settings: ColorSettings) => {
    setColorSettingsState(settings)
    localStorage.setItem(`${storageKey}-colors`, JSON.stringify(settings))
  }

  // Fixed setTheme function
  const setTheme = (newTheme: Theme) => {
    console.log('ThemeProvider setTheme called with:', newTheme)
    setThemeState(newTheme)
    localStorage.setItem(storageKey, newTheme)
  }

  const applyTheme = () => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    // clear inline CSS vars
    Array.from(root.style)
      .filter((prop) => prop.startsWith('--'))
      .forEach((prop) => root.style.removeProperty(prop))

    const effective =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme

    root.classList.add(effective)

    // apply color variables
    Object.entries(colorSettings).forEach(([key, value]) => {
      const varName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
      root.style.setProperty(varName, value as string)
    })

    // apply clock gradient if available
    const palettePresets = PRESET_THEMES[effective]
    const matched = palettePresets.find(
      (p) =>
        p.primary === colorSettings.primary &&
        p.background === colorSettings.background &&
        p.cardBackground === colorSettings.cardBackground
    )
    if (matched?.clockGradientFrom && matched?.clockGradientTo) {
      root.style.setProperty('--clock-gradient-from', matched.clockGradientFrom)
      root.style.setProperty('--clock-gradient-to', matched.clockGradientTo)
    }
  }

  useEffect(() => {
    console.log('Theme changed in provider:', theme)
    applyTheme()
  }, [theme, colorSettings])

  const value: ThemeProviderState = {
    theme,
    setTheme, // Use the fixed setTheme function
    colorSettings,
    setColorSettings: updateColorSettings
  }

  return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>
}

export function useTheme(): ThemeProviderState {
  const context = useContext(ThemeProviderContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
