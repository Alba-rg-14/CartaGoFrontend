import { MD3LightTheme } from "react-native-paper";

export const tokens = {
    colors: {
        primary: "#62ABEF",
        secondary: "#16A34A",
        background: "#F5F5F5",
        surface: "#FFFFFF",
        text: "#0F172A",
        muted: "#64748B",
        error: "#F95454",
        success: "#16A34A",
        warning: "#F59E0B",
    },
    radius: {
        xs: 4, sm: 8, md: 12, lg: 16, xl: 24,
    },
    spacing: (n) => n * 8,
};

export const theme = {
    ...MD3LightTheme,
    colors: {
        ...MD3LightTheme.colors,
        primary: tokens.colors.primary,
        secondary: tokens.colors.secondary,
        background: tokens.colors.background,
        surface: tokens.colors.surface,
        error: tokens.colors.error,
        onSurface: tokens.colors.text,
    },
    roundness: tokens.radius.md,
};