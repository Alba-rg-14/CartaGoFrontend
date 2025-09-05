// components/PillSwitch.jsx
import { useRef, useEffect, useState } from "react";
import { View, Text, Pressable, Animated, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";

export default function PillSwitch({ value, onChange, options = [], height = 40, style }) {
    // options: [{ label, value }, { label, value }]
    const theme = useTheme();
    const safeOptions = Array.isArray(options) ? options : [];

    const primary = theme?.colors?.primary ?? "#62ABEF";

    const [w, setW] = useState(0);
    const index = Math.max(0, safeOptions.findIndex(o => o.value === value));
    const segW = w > 0 && safeOptions.length > 0 ? w / safeOptions.length : 0;

    const tx = useRef(new Animated.Value(index * segW)).current;

    useEffect(() => {
        Animated.timing(tx, {
            toValue: index * segW,
            duration: 220,
            useNativeDriver: true,
        }).start();
    }, [index, segW]);

    return (
        <View
            style={[styles.track, { height, borderRadius: 999, borderColor: primary }, style]}
            onLayout={e => setW(e.nativeEvent.layout.width)}
        >
            {/* thumb deslizante */}
            {segW > 0 && (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.thumb,
                        {
                            width: segW - 4,
                            height: height - 4,
                            backgroundColor: primary,
                            transform: [{ translateX: Animated.add(tx, new Animated.Value(2)) }],
                        },
                    ]}
                />
            )}

            {/* botones */}
            <View style={styles.row}>
                {safeOptions.map((opt) => {
                    const selected = opt.value === value;
                    return (
                        <Pressable
                            key={opt.value}
                            style={styles.segment}
                            onPress={() => onChange?.(opt.value)}
                        >
                            <Text style={[styles.label, { color: selected ? "#fff" : primary }]}>
                                {opt.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    track: {
        borderWidth: 2,
        backgroundColor: "transparent",
        overflow: "hidden",
    },
    thumb: {
        position: "absolute",
        height: 0,
        top: 0,
        left: -2,
        right: 0,
        borderRadius: 999,
        zIndex: 0,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        zIndex: 1,
    },
    segment: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 8,
        height: "100%",
    },
    label: {
        fontWeight: "700",
        fontSize: 16,
        lineHeight: 18,
        includeFontPadding: false,
        textAlignVertical: "center",
        marginTop: 7,
    },
});
