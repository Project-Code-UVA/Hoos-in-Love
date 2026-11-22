import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const STICKERS = [
  "🧡", "💙", "❤️", "💕", "💌", "⚔️",
  "🏛️", "🎓", "📚", "☕", "🍕", "🧋",
  "🎶", "🎸", "🏀", "⚽", "🎾", "🏊",
  "🐶", "🐱", "🌻", "🌸", "🌿", "🍂",
  "⭐", "✨", "🌈", "🔥", "😎", "🥰",
];

type Props = {
  onPick: (emoji: string) => void;
  onClose: () => void;
};

export default function StickerPicker({ onPick, onClose }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.grabber} />
        <Text style={styles.title}>Stickers</Text>
        <ScrollView contentContainerStyle={styles.grid}>
          {STICKERS.map((s) => (
            <Pressable
              key={s}
              onPress={() => onPick(s)}
              style={({ pressed }) => [styles.cell, pressed && styles.cellPressed]}
              accessibilityLabel={`Add ${s} sticker`}
            >
              <Text style={styles.emoji}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
    zIndex: 100,
  },
  sheet: {
    backgroundColor: "#EAF1F8",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 12,
    maxHeight: "55%",
  },
  grabber: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#B9C6D8",
    marginBottom: 10,
  },
  title: {
    color: "#002562",
    fontSize: 18,
    fontWeight: "800",
    marginLeft: 6,
    marginBottom: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  cell: {
    width: "16.66%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  cellPressed: {
    backgroundColor: "#D6E3F2",
  },
  emoji: {
    fontSize: 34,
  },
});
