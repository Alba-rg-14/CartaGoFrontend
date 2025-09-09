import { Pressable, Image, View, Text } from "react-native";

export default function RestaurantPreview({ restaurant, onPress, width = 160 }) {
    return (
        <Pressable onPress={() => onPress?.(restaurant)} style={{ width }}>
            <View
                style={{
                    borderRadius: 16,
                    overflow: "hidden",
                    backgroundColor: "#fff",
                    shadowColor: "#000",
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 2,
                    marginBottom: 8,
                }}
            >
                <Image
                    source={{ uri: restaurant?.coverUrl || restaurant?.imageUrl }}
                    style={{ width: "100%", height: width }}
                    resizeMode="cover"
                />
            </View>
            <Text style={{ fontWeight: "600" }} numberOfLines={1}>
                {restaurant?.name || "Restaurante"}
            </Text>
        </Pressable>
    );
}
