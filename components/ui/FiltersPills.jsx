import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

export default function FiltersPills({ active, onChange }) {
    const Pill = ({ label, isActive, onPress }) => (
        <TouchableOpacity
            onPress={onPress}
            style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 18,
                backgroundColor: isActive ? "#4F8EF7" : "#E9EFFD",
                marginRight: 8,
            }}
        >
            <Text style={{ color: isActive ? "white" : "#3D5AA9", fontWeight: "700" }}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={{ flexDirection: "row", marginTop: 12 }}>
            <Pill label="Todos" isActive={active === "todos"} onPress={() => onChange("todos")} />
            <Pill label="Abierto ahora" isActive={active === "abiertos"} onPress={() => onChange("abiertos")} />
            <Pill label="Cerca de mí" isActive={active === "cerca"} onPress={() => onChange("cerca")} />
        </View>
    );
}
