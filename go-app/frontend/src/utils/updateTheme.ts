export type UpdateThemeValue = "dark" | "light" | "system";

export const updateTheme = (theme: UpdateThemeValue) => {
  if (theme === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.dataset.theme = theme;
  }
};
