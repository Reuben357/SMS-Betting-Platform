// Centralised design tokens for the JENGATIPS admin UI ("Midnight Gold" theme).

export const THEME = {
    colors: {
        bgDark: "#1A1A1A",
        cardBg: "#262626",
        textPrimary: "#FFFFFF",
        textSecondary: "#A3A3A3",
        gold: "#B3945B",
        goldLight: "#D4AF6A",
        goldDark: "#8B6B3D",
        danger: "#EF4444",
        success: "#10B981",
        warning: "#F59E0B",
    },
    fonts: {
        body: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
        mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
    },
};

// Named exports for call sites that currently do
//   const GOLD = "#B3945B";
export const BG_DARK = THEME.colors.bgDark;
export const CARD_BG = THEME.colors.cardBg;
export const TEXT_PRIMARY = THEME.colors.textPrimary;
export const TEXT_SECONDARY = THEME.colors.textSecondary;
export const GOLD = THEME.colors.gold;
export const GOLD_LIGHT = THEME.colors.goldLight;
export const GOLD_DARK = THEME.colors.goldDark;
export const DANGER = THEME.colors.danger;
export const SUCCESS = THEME.colors.success;
export const WARNING = THEME.colors.warning;

export default THEME;
