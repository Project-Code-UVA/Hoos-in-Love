import type { TextStyle, ViewStyle } from "react-native";
import type { DoorTextFont, DoorTextItem } from "../types";

export const TEXT_FONTS: { key: DoorTextFont; label: string }[] = [
  { key: "classic", label: "Classic" },
  { key: "script", label: "Script" },
  { key: "bold", label: "Bold" },
];

export const TEXT_COLORS = [
  "#FFFFFF",
  "#002562", // navy
  "#E57200", // UVA orange
  "#F2CF9D", // tan
  "#FF5C8A", // love pink
  "#C8A97E", // friend tan
  "#7FB3E8",
  "#1C1C1C",
];

function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 160;
}

function fontStyle(font: DoorTextFont, fontSize: number): TextStyle {
  switch (font) {
    case "script":
      // Gwendolyn sits small on its line box, so bump it up.
      return { fontFamily: "GwendolynBold", fontSize: fontSize * 1.45, lineHeight: fontSize * 1.6 };
    case "bold":
      return { fontWeight: "900", fontSize, lineHeight: fontSize * 1.2, letterSpacing: 0.5 };
    case "classic":
    default:
      return { fontFamily: "Faustina", fontWeight: "700", fontSize, lineHeight: fontSize * 1.25 };
  }
}

/**
 * Shared text styling for door text so the editor input and the placed
 * item look identical.
 */
export function textStyleFor(
  item: Pick<DoorTextItem, "color" | "font" | "background">,
  fontSize: number,
): { text: TextStyle; pill: ViewStyle | null } {
  const base = fontStyle(item.font, fontSize);

  if (item.background) {
    return {
      text: {
        ...base,
        textAlign: "center",
        color: isLight(item.color) ? "#002562" : "#FFFFFF",
      },
      pill: {
        backgroundColor: item.color,
        borderRadius: fontSize * 0.35,
        paddingHorizontal: fontSize * 0.4,
        paddingVertical: fontSize * 0.12,
      },
    };
  }

  return {
    text: {
      ...base,
      textAlign: "center",
      color: item.color,
      textShadowColor: "rgba(0,0,0,0.35)",
      textShadowRadius: 3,
      textShadowOffset: { width: 0, height: 1 },
    },
    pill: null,
  };
}
