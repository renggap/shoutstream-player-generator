import { useTheme as useThemeContext } from "../components/theme-provider";

export { useTheme as useThemeContext };

// Re-export for convenience
export function useTheme() {
  return useThemeContext();
}
