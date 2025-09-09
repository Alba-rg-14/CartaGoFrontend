// components/ui/PlatoPreviewCard.jsx
import React from "react";
import { View, Image, StyleSheet, TouchableOpacity } from "react-native";
import { Text, Button, Icon } from "react-native-paper";
import { tokens } from "../../theme";

/**
 * Props:
 * - item: { id, nombre, precio, imagen, subtitle }
 * - onDetails, detailsLabel
 * - rightType: "add" | "delete"
 * - onRightPress
 * - centerSlot, rightSlot
 * - imageSize?: number (default 72)
 * - style
 */
export default function PlatoPreviewCard({
    item = {},
    onDetails,
    detailsLabel = "Ver detalles",
    rightType = "add",
    onRightPress,
    centerSlot,
    rightSlot,
    imageSize = 72,
    style,
}) {
    const price =
        item?.precio !== undefined && item?.precio !== null
            ? `${String(item.precio).replace(".", ",")}€`
            : "";

    const s = makeStyles(imageSize);

    return (
        <View style={[s.card, style]}>
            {/* Imagen */}
            <Image
                source={{
                    uri: item?.imagen || "https://via.placeholder.com/160x160.png?text=Plato",
                }}
                style={s.thumb}
                resizeMode="cover"
            />

            {/* Texto + acción central */}
            <View style={s.centerCol}>
                <Text numberOfLines={2} style={s.title}>
                    {item?.nombre || "Plato"}
                </Text>
                {!!item?.subtitle && (
                    <Text numberOfLines={1} style={s.subtitle}>
                        {item.subtitle}
                    </Text>
                )}

                <View style={{ marginTop: 8 }}>
                    {centerSlot ? (
                        centerSlot
                    ) : (
                        <Button
                            mode="contained"
                            onPress={onDetails}
                            buttonColor={tokens.colors.primary}  // fondo azul
                            textColor="#FFF"                     // texto SIEMPRE blanco
                            uppercase={false}
                            contentStyle={{ height: 36, paddingHorizontal: 14 }}
                            style={[s.detailsBtn, { borderRadius: 999 }]}
                            labelStyle={{ fontWeight: "800", fontSize: 12 }}
                        >
                            {detailsLabel}
                        </Button>

                    )}
                </View>
            </View>

            {/* Columna derecha */}
            <View style={s.rightCol}>
                {!!price && (
                    <Text style={s.price} numberOfLines={1}>
                        {price}
                    </Text>
                )}
                <View style={{ flex: 1 }} />
                {rightSlot ? (
                    rightSlot
                ) : (
                    <TouchableOpacity
                        onPress={onRightPress}
                        style={[s.iconCircle, { borderColor: tokens.colors.primary }]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Icon
                            source={rightType === "delete" ? "delete" : "plus"}
                            size={18}
                            color={tokens.colors.primary}
                        />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const makeStyles = (imageSize) =>
    StyleSheet.create({
        card: {
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: tokens.colors.surface,
            borderRadius: 16,
            padding: 10,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            gap: 10,
            minHeight: imageSize, // asegura altura suficiente
        },
        thumb: {
            width: imageSize,
            height: imageSize,
            borderRadius: 12,
            backgroundColor: "#EEE",
        },
        centerCol: {
            flex: 1,
            minHeight: imageSize,
            justifyContent: "space-between",
        },
        title: {
            fontWeight: "800",
            fontSize: 16,
        },
        subtitle: {
            color: tokens.colors.muted,
            marginTop: 2,
            fontSize: 12,
        },
        detailsBtn: {
            alignSelf: "flex-start",
            borderRadius: 999,
        },
        rightCol: {
            alignItems: "flex-end",
            justifyContent: "space-between",
            height: imageSize, // sincronizado con la imagen
        },
        price: {
            fontWeight: "800",
            fontSize: 16,
        },
        iconCircle: {
            width: 30,
            height: 30,
            borderRadius: 15,
            borderWidth: 2,
            alignItems: "center",
            justifyContent: "center",
        },
    });
