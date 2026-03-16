export const DARK_THEME = {
  bg: "#07080C", surface: "#0E1018", card: "#13151E", border: "rgba(255,255,255,0.07)",
  text: "#F0F0F8", muted: "rgba(255,255,255,0.38)", faint: "rgba(255,255,255,0.12)",
  inputBg: "rgba(255,255,255,0.05)", isDark: true,
};

export const LIGHT_THEME = {
  bg: "#F4F5F8", surface: "#FFFFFF", card: "#FFFFFF", border: "rgba(0,0,0,0.08)",
  text: "#0E1018", muted: "rgba(0,0,0,0.45)", faint: "rgba(0,0,0,0.1)",
  inputBg: "rgba(0,0,0,0.04)", isDark: false,
};

// T is the live theme object — mutated by App on every render via Object.assign
// All components import T and read from it directly
export let T = { ...DARK_THEME };