import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import {
  BASE_SIZE,
  MAX_SCALE,
  MIN_SCALE,
  type DoorItem,
  type DoorTextItem,
  type DoorTransform,
} from "../types";
import { textStyleFor } from "./textStyle";

const NAVY = "#002562";
const TRASH_RADIUS = 56;
/** Snap rotation to straight angles when within ~3 degrees. */
const SNAP_RAD = 0.055;
const SNAP_SPRING = { damping: 18, stiffness: 220 };

type Props = {
  item: DoorItem;
  canvasW: number;
  canvasH: number;
  selected: boolean;
  /** Center of the trash target, in window coordinates. */
  trashX: number;
  trashY: number;
  /** Shared with the screen so it can show the trash and hide toolbars while dragging. */
  isDragging: SharedValue<number>;
  overTrash: SharedValue<number>;
  onSelect: (id: string) => void;
  onChange: (id: string, t: DoorTransform) => void;
  onDelete: (id: string) => void;
  onEditText: (id: string) => void;
};

function clamp(v: number, lo: number, hi: number) {
  "worklet";
  return Math.min(hi, Math.max(lo, v));
}

function snapRotation(r: number) {
  "worklet";
  const quarter = Math.PI / 2;
  const nearest = Math.round(r / quarter) * quarter;
  return Math.abs(r - nearest) < SNAP_RAD ? nearest : r;
}

export default function DoorItemView({
  item,
  canvasW,
  canvasH,
  selected,
  trashX,
  trashY,
  isDragging,
  overTrash,
  onSelect,
  onChange,
  onDelete,
  onEditText,
}: Props) {
  const id = item.id;

  // Live transform (fractions of the canvas, like the stored item).
  const x = useSharedValue(item.x);
  const y = useSharedValue(item.y);
  const scale = useSharedValue(item.scale);
  const rotation = useSharedValue(item.rotation);

  // Unscaled size of the item, measured on layout.
  const w = useSharedValue(0);
  const h = useSharedValue(0);

  const thisOverTrash = useSharedValue(0);
  /** 1 = normal, shrinks while hovering over the trash. */
  const trashShrink = useSharedValue(1);

  // Gesture start snapshots.
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);
  const sScale = useSharedValue(1);
  const sRot = useSharedValue(0);
  const ax = useSharedValue(0);
  const ay = useSharedValue(0);
  const hax = useSharedValue(0);
  const hay = useSharedValue(0);
  const v0x = useSharedValue(0);
  const v0y = useSharedValue(0);

  const commit = () => {
    "worklet";
    runOnJS(onChange)(id, {
      x: x.value,
      y: y.value,
      scale: scale.value,
      rotation: rotation.value,
    });
  };

  /* ---------------- move (drag) ---------------- */

  const pan = Gesture.Pan()
    .minDistance(2)
    // Record the touch-down point in onBegin, not onStart: activation can lag a
    // few move events behind, and measuring from there makes the item trail the finger.
    .onBegin((e) => {
      sx.value = x.value;
      sy.value = y.value;
      ax.value = e.absoluteX;
      ay.value = e.absoluteY;
    })
    .onStart(() => {
      isDragging.value = 1;
      runOnJS(onSelect)(id);
    })
    .onUpdate((e) => {
      // Use absolute deltas so the math isn't affected by the item's own rotation/scale.
      x.value = sx.value + (e.absoluteX - ax.value) / canvasW;
      y.value = sy.value + (e.absoluteY - ay.value) / canvasH;

      const over =
        Math.hypot(e.absoluteX - trashX, e.absoluteY - trashY) < TRASH_RADIUS
          ? 1
          : 0;
      if (over !== thisOverTrash.value) {
        thisOverTrash.value = over;
        overTrash.value = over;
        trashShrink.value = withTiming(over ? 0.45 : 1, { duration: 140 });
      }
    })
    .onEnd(() => {
      if (thisOverTrash.value) {
        runOnJS(onDelete)(id);
        return;
      }
      // Keep the item's center on the door so it can't get lost off-screen.
      const cx = clamp(x.value, 0, 1);
      const cy = clamp(y.value, 0, 1);
      if (cx !== x.value) x.value = withSpring(cx, SNAP_SPRING);
      if (cy !== y.value) y.value = withSpring(cy, SNAP_SPRING);
      runOnJS(onChange)(id, {
        x: cx,
        y: cy,
        scale: scale.value,
        rotation: rotation.value,
      });
    })
    .onFinalize(() => {
      isDragging.value = 0;
      overTrash.value = 0;
      if (thisOverTrash.value) return; // being deleted; stay shrunk until unmount
      trashShrink.value = withTiming(1, { duration: 140 });
    });

  /* ---------------- two-finger pinch + rotate ---------------- */

  const pinch = Gesture.Pinch()
    .onStart(() => {
      sScale.value = scale.value;
      runOnJS(onSelect)(id);
    })
    .onUpdate((e) => {
      scale.value = clamp(sScale.value * e.scale, MIN_SCALE, MAX_SCALE);
    })
    .onEnd(commit);

  const rotate = Gesture.Rotation()
    .onStart(() => {
      sRot.value = rotation.value;
    })
    .onUpdate((e) => {
      rotation.value = snapRotation(sRot.value + e.rotation);
    })
    .onEnd(commit);

  /* ---------------- taps ---------------- */

  const tap = Gesture.Tap()
    .maxDistance(8)
    .onEnd(() => {
      runOnJS(onSelect)(id);
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDistance(10)
    .onEnd(() => {
      if (item.type === "text") runOnJS(onEditText)(id);
    });

  const itemGesture = Gesture.Simultaneous(pan, pinch, rotate, tap, doubleTap);

  /* ---------------- corner handle: rotate + resize with one finger / mouse ---------------- */

  const handle = Gesture.Pan()
    .minDistance(0)
    .blocksExternalGesture(pan, tap, doubleTap)
    .onStart((e) => {
      sScale.value = scale.value;
      sRot.value = rotation.value;
      hax.value = e.absoluteX;
      hay.value = e.absoluteY;
      // Vector from the item's center to the bottom-right corner, in screen space.
      const lx = (w.value / 2) * scale.value;
      const ly = (h.value / 2) * scale.value;
      const c = Math.cos(rotation.value);
      const s = Math.sin(rotation.value);
      v0x.value = lx * c - ly * s;
      v0y.value = lx * s + ly * c;
    })
    .onUpdate((e) => {
      const vx = v0x.value + (e.absoluteX - hax.value);
      const vy = v0y.value + (e.absoluteY - hay.value);
      const d0 = Math.hypot(v0x.value, v0y.value) || 1;
      scale.value = clamp(
        (sScale.value * Math.hypot(vx, vy)) / d0,
        MIN_SCALE,
        MAX_SCALE,
      );
      rotation.value = snapRotation(
        sRot.value + Math.atan2(vy, vx) - Math.atan2(v0y.value, v0x.value),
      );
    })
    .onEnd(commit);

  /* ---------------- styles ---------------- */

  const itemStyle = useAnimatedStyle(() => ({
    // Hidden until measured so it doesn't flash at the wrong spot.
    opacity: w.value === 0 ? 0 : 0.3 + 0.7 * ((trashShrink.value - 0.45) / 0.55),
    transform: [
      { translateX: x.value * canvasW - w.value / 2 },
      { translateY: y.value * canvasH - h.value / 2 },
      { rotate: `${rotation.value}rad` },
      { scale: scale.value * trashShrink.value },
    ],
  }));

  // Keep the selection outline and handle the same on-screen size at any scale.
  const outlineStyle = useAnimatedStyle(() => ({
    borderWidth: 2 / scale.value,
    borderRadius: 6 / scale.value,
    margin: -6 / scale.value,
  }));

  const handleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 / scale.value }],
  }));

  return (
    <GestureDetector gesture={itemGesture}>
      <Animated.View
        style={[styles.item, itemStyle]}
        onLayout={(e) => {
          w.value = e.nativeEvent.layout.width;
          h.value = e.nativeEvent.layout.height;
        }}
      >
        <ItemContent item={item} canvasW={canvasW} />

        {selected && (
          <>
            <Animated.View
              pointerEvents="none"
              style={[styles.outline, outlineStyle]}
            />
            <GestureDetector gesture={handle}>
              <Animated.View style={[styles.handle, handleStyle]} hitSlop={10}>
                <Ionicons name="sync" size={16} color={NAVY} />
              </Animated.View>
            </GestureDetector>
          </>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

/** Static rendering of an item's content at its base (unscaled) size. */
export function ItemContent({
  item,
  canvasW,
}: {
  item: DoorItem;
  canvasW: number;
}) {
  if (item.type === "image") {
    const width = BASE_SIZE.image * canvasW;
    // pointerEvents="none" so touches go to the draggable parent (and the
    // browser doesn't start its own image drag on web).
    return (
      <View pointerEvents="none">
        <Image
          source={{ uri: item.uri }}
          style={[styles.image, { width, height: width / item.aspectRatio }]}
        />
      </View>
    );
  }

  if (item.type === "sticker") {
    const size = BASE_SIZE.sticker * canvasW;
    return (
      <Text
        style={[styles.noSelect, { fontSize: size, lineHeight: size * 1.2 }]}
        selectable={false}
      >
        {item.emoji}
      </Text>
    );
  }

  return <TextContent item={item} canvasW={canvasW} />;
}

function TextContent({ item, canvasW }: { item: DoorTextItem; canvasW: number }) {
  const fontSize = BASE_SIZE.textFont * canvasW;
  const { text: textStyle, pill } = textStyleFor(item, fontSize);
  return (
    <View
      style={[
        { maxWidth: BASE_SIZE.textMaxWidth * canvasW },
        pill,
      ]}
    >
      <Text style={[styles.noSelect, textStyle]} selectable={false}>
        {item.text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  image: {
    borderRadius: 8,
  },
  noSelect: {
    userSelect: "none",
  },
  outline: {
    ...StyleSheet.absoluteFill,
    borderColor: "#FFFFFF",
    borderStyle: "dashed",
  },
  handle: {
    position: "absolute",
    right: -16,
    bottom: -16,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});
