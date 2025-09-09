import { useRef } from "react";
import { View, FlatList } from "react-native";

export default function Carousel({ data = [], renderItem, itemWidth = 260, gap = 12 }) {
    const ref = useRef(null);
    const snap = itemWidth + gap;

    return (
        <View style={{ height: itemWidth + 40 }}>
            <FlatList
                ref={ref}
                horizontal
                data={data}
                keyExtractor={(item, idx) => item.id?.toString?.() ?? String(idx)}
                renderItem={({ item }) => (
                    <View style={{ width: itemWidth, marginRight: gap }}>{renderItem({ item })}</View>
                )}
                showsHorizontalScrollIndicator={false}
                snapToInterval={snap}
                decelerationRate="fast"
                pagingEnabled={false}
                bounces={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
            />
        </View>
    );
}
