import { THEME_KEYS, ThemeConfig } from "./Settings.js";

export function generateThemeCss(theme: ThemeConfig): string {
  return THEME_KEYS.map((key) => `@define-color caldy_${key} ${theme[key]};`)
    .join("\n");
}
