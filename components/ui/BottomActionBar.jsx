// components/ui/BottomActionBar.jsx
import React from "react";
import { View, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Text, Icon, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tokens } from "../../theme";

/**
 * props:
 * - items: [{ icon: string|IconSource, label: string, onPress: () => void }]
 * - barColor?: string            // fondo de la banda (por defecto azul claro)
 * - circleColor?: string         // color del círculo de los iconos (por defecto primary)
 * - iconColor?: string           // color del icono (por defecto #FFF)
 * - style?: ViewStyle
 */
export default function BottomActionBar({
    items = [],
    barColor,
    circleColor,
    iconColor = "#FFF",
    style,
}) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    const bg = barColor ?? "#E7F0FF"; // azul clarito de fondo
    const circle = circleColor ?? theme.colors.primary;

    return (
        <View
            pointerEvents="box-none"
            style={StyleSheet.absoluteFill}
        >
            <View
                style={[
                    styles.wrap,
                    {
                        backgroundColor: bg,
                        paddingBottom: Math.max(insets.bottom, 8),
                    },
                    style,
                ]}
            >
                <View style={styles.row}>
                    {items.map((it, idx) => {
                        const disabled = !!it.disabled;
                        return (
                            <TouchableOpacity
                                key={idx}
                                onPress={it.onPress}
                                disabled={disabled}
                                activeOpacity={0.85}
                                style={[styles.item, disabled && { opacity: 0.45 }]}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <View style={[styles.circle, { backgroundColor: circle }]}>
                                    <Icon source={it.icon || "dots-horizontal"} size={20} color={iconColor} />
                                </View>
                                <Text style={styles.label} numberOfLines={2}>
                                    {it.label}
                                </Text>
                            </TouchableOpacity>
                        )
                    })}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingTop: 10,
        paddingHorizontal: 16,
        zIndex: 100,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: -4 },
            },
            android: { elevation: 10 },
        }),
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "flex-start",
    },
    item: {
        alignItems: "center",
        width: 110, // suficiente para 2 líneas de texto
    },
    circle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
    },
    label: {
        marginTop: 6,
        textAlign: "center",
        color: tokens.colors.primary,
        fontWeight: "700",
        fontSize: 12,
        lineHeight: 14,
    },
});
