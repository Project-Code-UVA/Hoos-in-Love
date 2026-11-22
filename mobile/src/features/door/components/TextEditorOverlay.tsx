import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { DoorTextFont, DoorTextItem } from "../types";
import { TEXT_COLORS, TEXT_FONTS, textStyleFor } from "./textStyle";

export type TextDraft = Pick<DoorTextItem, "text" | "color" | "font" | "background">;

type Props = {
  initial?: TextDraft;
  onCancel: () => void;
  onDone: (draft: TextDraft) => void;
};

const DEFAULT_DRAFT: TextDraft = {
  text: "",
  color: "#FFFFFF",
  font: "classic",
  background: false,
};

const PREVIEW_FONT = 30;

export default function TextEditorOverlay({ initial, onCancel, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<TextDraft>(initial ?? DEFAULT_DRAFT);

  const update = (patch: Partial<TextDraft>) =>
    setDraft((d) => ({ ...d, ...patch }));

  const { text: textStyle, pill } = textStyleFor(draft, PREVIEW_FONT);

  return (
    <KeyboardAvoidingView
      style={styles.overlay}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.topRow, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={onCancel} style={styles.topButton} activeOpacity={0.8}>
          <Text style={styles.topButtonText}>Cancel</Text>
        </TouchableOpacity>

        <View style={styles.fontRow}>
          {TEXT_FONTS.map((f) => (
            <FontChip
              key={f.key}
              font={f.key}
              label={f.label}
              active={draft.font === f.key}
              onPress={() => update({ font: f.key })}
            />
          ))}
        </View>

        <TouchableOpacity
          onPress={() => onDone({ ...draft, text: draft.text.trim() })}
          style={[styles.topButton, styles.doneButton]}
          activeOpacity={0.8}
        >
          <Text style={[styles.topButtonText, styles.doneText]}>Done</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputArea}>
        <View style={pill}>
          <TextInput
            value={draft.text}
            onChangeText={(text) => update({ text })}
            placeholder="Type something…"
            placeholderTextColor="rgba(255,255,255,0.55)"
            multiline
            autoFocus
            style={[styles.input, textStyle]}
            selectionColor="#F2CF9D"
          />
        </View>
      </View>

      <View style={[styles.bottomRow, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          onPress={() => update({ background: !draft.background })}
          style={[styles.bgToggle, draft.background && styles.bgToggleActive]}
          activeOpacity={0.8}
          accessibilityLabel="Toggle text background"
        >
          <Text style={[styles.bgToggleText, draft.background && styles.bgToggleTextActive]}>
            A
          </Text>
        </TouchableOpacity>

        {TEXT_COLORS.map((c) => (
          <Pressable
            key={c}
            onPress={() => update({ color: c })}
            style={[
              styles.swatch,
              { backgroundColor: c },
              draft.color === c && styles.swatchActive,
            ]}
            accessibilityLabel={`Color ${c}`}
          />
        ))}
      </View>
    </KeyboardAvoidingView>
  );
}

function FontChip({
  font,
  label,
  active,
  onPress,
}: {
  font: DoorTextFont;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { text } = textStyleFor({ font, color: "#FFFFFF", background: false }, 14);
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.fontChip, active && styles.fontChipActive]}
    >
      <Text
        style={[
          text,
          styles.fontChipText,
          active && styles.fontChipTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 20, 50, 0.72)",
    zIndex: 100,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  topButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  topButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  doneButton: {
    backgroundColor: "#F2C078",
  },
  doneText: {
    color: "#002562",
    fontWeight: "800",
  },
  fontRow: {
    flexDirection: "row",
    gap: 6,
  },
  fontChip: {
    paddingHorizontal: 10,
    height: 30,
    justifyContent: "center",
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.6)",
  },
  fontChipActive: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
  },
  fontChipText: {
    textShadowRadius: 0,
    lineHeight: undefined,
  },
  fontChipTextActive: {
    color: "#002562",
  },
  inputArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  input: {
    minWidth: 60,
    maxWidth: "100%",
    padding: 0,
    outlineStyle: "none",
  } as object,
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  bgToggle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  bgToggleActive: {
    backgroundColor: "#FFFFFF",
  },
  bgToggleText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },
  bgToggleTextActive: {
    color: "#002562",
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.8)",
  },
  swatchActive: {
    transform: [{ scale: 1.25 }],
    borderColor: "#FFFFFF",
    borderWidth: 3,
  },
});
