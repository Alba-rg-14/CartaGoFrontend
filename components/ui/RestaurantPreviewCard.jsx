import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function RestaurantPreviewCard({ item, onPress, size = "md", overlay = false }) {
    const radius = 16;
    const width = size === "md" ? 260 : 160;
    const height = size === "md" ? 180 : 120;

    return (
        <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
            <View style={{ width }}>
                <View
                    style={{
                        width,
                        height,
                        borderRadius: radius,
                        overflow: "hidden",
                        backgroundColor: "#eee",
                    }}
                >
                    <Image
                        source={{ uri: item.imagen || "https://via.placeholder.com/600x400?text=Restaurante" }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                    />

                    {overlay && (
                        <>
                            <LinearGradient
                                colors={["transparent", "rgba(0,0,0,0.65)"]}
                                style={{
                                    position: "absolute",
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    height: "55%",
                                }}
                            />
                            <Text
                                numberOfLines={2}
                                style={{
                                    position: "absolute",
                                    left: 12,
                                    right: 12,
                                    bottom: 12,
                                    color: "white",
                                    fontWeight: "700",
                                    fontSize: size === "md" ? 18 : 14,
                                }}
                            >
                                {item.nombre}
                            </Text>
                        </>
                    )}
                </View>

                {!overlay && (
                    <Text
                        numberOfLines={1}
                        style={{ marginTop: 8, fontWeight: "600", fontSize: size === "md" ? 18 : 14 }}
                    >
                        {item.nombre}
                    </Text>
                )}
            </View>
        </TouchableOpacity>
    );
}
