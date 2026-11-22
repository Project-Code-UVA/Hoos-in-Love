import React from "react";
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  onKeepEditing: () => void;
  onDiscard: () => void;
};

/**
 * In-app confirm instead of `Alert.alert`, which is a no-op on web
 * and doesn't match the app's styling.
 */
export default function ConfirmDiscardSheet({ onKeepEditing, onDiscard }: Props) {
  return (
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onKeepEditing} />
      <View style={styles.card}>
        <Text style={styles.title}>Discard changes?</Text>
        <Text style={styles.body}>
          Your door edits haven't been saved. If you go back now they'll be lost.
        </Text>

        <TouchableOpacity style={styles.keepButton} onPress={onKeepEditing} activeOpacity={0.85}>
          <Text style={styles.keepText}>Keep editing</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.discardButton} onPress={onDiscard} activeOpacity={0.85}>
          <Text style={styles.discardText}>Discard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    zIndex: 200,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#EAF1F8",
    borderRadius: 24,
    padding: 22,
  },
  title: {
    color: "#002562",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 8,
  },
  body: {
    color: "#2B3A55",
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 20,
  },
  keepButton: {
    backgroundColor: "#F2C078",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    marginBottom: 10,
  },
  keepText: {
    color: "#002562",
    fontSize: 16,
    fontWeight: "800",
  },
  discardButton: {
    backgroundColor: "#FDEAEA",
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  discardText: {
    color: "#C62828",
    fontSize: 16,
    fontWeight: "800",
  },
});
