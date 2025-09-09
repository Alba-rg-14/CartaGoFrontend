import React from "react";
import { View, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function SearchBar({ value, onChangeText, onSubmitEditing, placeholder = "Buscar por nombre del restaurante" }) {
    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "white",
                borderRadius: 24,
                paddingHorizontal: 12,
                height: 44,
                shadowColor: "#000",
                shadowOpacity: 0.08,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
            }}
        >
            <Ionicons name="search" size={18} color="#9aa3af" style={{ marginRight: 6 }} />
            <TextInput
                style={{ flex: 1 }}
                placeholder={placeholder}
                value={value}
                onChangeText={onChangeText}
                onSubmitEditing={onSubmitEditing}
                returnKeyType="search"
            />
        </View>
    );
}
