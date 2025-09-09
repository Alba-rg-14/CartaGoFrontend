import { View, Text, Pressable } from "react-native";

const FILTERS = [
    { key: "all", label: "Todos" },
    { key: "open", label: "Abierto ahora" },
    { key: "nearby", label: "Cerca de mí" },
];

export default function FiltersBar({ active, onChange }) {
    return (
        <View style={{ flexDirection: "row", gap: 8 }}>
            {FILTERS.map(f => {
                const selected = active === f.key;
                return (
                    <Pressable
                        key={f.key}
                        onPress={() => onChange?.(f.key)}
                        style={{
                            paddingVertical: 8,
                            paddingHorizontal: 14,
                            borderRadius: 999,
                            backgroundColor: selected ? "#3B82F6" : "#EEF2FF",
                        }}
                    >
                        <Text style={{ color: selected ? "#fff" : "#1E3A8A", fontWeight: "600" }}>
                            {f.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}
export const FILTER_KEYS = { ALL: "all", OPEN: "open", NEARBY: "nearby" };
