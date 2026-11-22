import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { usePreventRemove, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ConfirmDiscardSheet from "../components/ConfirmDiscardSheet";
import DoorItemView from "../components/DoorItemView";
import StickerPicker from "../components/StickerPicker";
import TextEditorOverlay, { type TextDraft } from "../components/TextEditorOverlay";
import { saveMyDoor, useMyDoor } from "../doorStore";
import type { DoorItem, DoorTextItem, DoorTransform } from "../types";

const DOOR_ART = require("../../../../assets/images/SwipePageImages/Door_SwipePage.png");

/** Size of Door_SwipePage.png and where the black door sits inside it (in image pixels). */
const ART_PX = { w: 1329, h: 2732 };
const DOOR_PX = { x: 438, y: 802, w: 457, h: 796 };
const DOOR_ASPECT = DOOR_PX.w / DOOR_PX.h;

const NAVY = "#002562";
const TAN_BUTTON = "#F2C078";
const RED = "#C62828";

const TOP_BAR_H = 72;
const BOTTOM_BAR_H = 104;

type TextEditorState = { mode: "new" } | { mode: "edit"; id: string } | null;

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function EditDoorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Measured from the screen itself (not useWindowDimensions) so web's server
  // render, which has no window size, doesn't bake in a broken 0x0 layout.
  const [screenSize, setScreenSize] = useState<{ w: number; h: number } | null>(null);
  const winW = screenSize?.w ?? 0;
  const winH = screenSize?.h ?? 0;

  const savedItems = useMyDoor();
  const [items, setItems] = useState<DoorItem[]>(savedItems);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [textEditor, setTextEditor] = useState<TextEditorState>(null);
  const [stickersOpen, setStickersOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const dirty = JSON.stringify(items) !== JSON.stringify(savedItems);

  const isDragging = useSharedValue(0);
  const overTrash = useSharedValue(0);

  /* -------------------- layout: fit the door between the bars -------------------- */

  const topH = insets.top + TOP_BAR_H;
  const bottomH = insets.bottom + BOTTOM_BAR_H;
  const availW = winW - 40;
  const availH = Math.max(200, winH - topH - bottomH - 16);

  const doorH = Math.min(availH, availW / DOOR_ASPECT);
  const doorW = doorH * DOOR_ASPECT;
  const doorLeft = (winW - doorW) / 2;
  const doorTop = topH + (availH - doorH) / 2 + 8;

  // Scale the full background art so its door lands exactly on the canvas.
  const k = doorW / DOOR_PX.w;
  const artStyle = {
    width: ART_PX.w * k,
    height: ART_PX.h * k,
    left: doorLeft - DOOR_PX.x * k,
    top: doorTop - DOOR_PX.y * k,
  };

  const trashX = winW / 2;
  const trashY = winH - insets.bottom - BOTTOM_BAR_H / 2;

  /* -------------------- leaving: save / back / discard -------------------- */

  const pendingLeaveRef = useRef<(() => void) | null>(null);

  // Catches every way out (back button, iOS swipe, Android back, closing the tab on web)
  // while there are unsaved edits, and asks before throwing them away.
  const disablePrevention = usePreventRemove(dirty, ({ repeat }) => {
    pendingLeaveRef.current = repeat;
    setConfirmOpen(true);
  });

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/profile");
  };

  const handleSave = () => {
    saveMyDoor(items);
    disablePrevention();
    leave();
  };

  const handleDiscard = () => {
    setConfirmOpen(false);
    disablePrevention();
    const pending = pendingLeaveRef.current;
    pendingLeaveRef.current = null;
    if (pending) pending();
    else leave();
  };

  /* -------------------- item operations -------------------- */

  const addItem = (item: DoorItem) => {
    setItems((prev) => [...prev, item]);
    setSelectedId(item.id);
  };

  // Stagger new items a little so they don't land exactly on top of each other.
  const nextSpot = () => {
    const n = items.length % 5;
    return { x: 0.5 + (n - 2) * 0.05, y: 0.45 + (n - 2) * 0.04 };
  };

  const updateItem = (id: string, t: DoorTransform) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...t } : it)));
  };

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  };

  const bringToFront = (id: string) => {
    setItems((prev) => {
      const it = prev.find((p) => p.id === id);
      return it ? [...prev.filter((p) => p.id !== id), it] : prev;
    });
  };

  const sendToBack = (id: string) => {
    setItems((prev) => {
      const it = prev.find((p) => p.id === id);
      return it ? [it, ...prev.filter((p) => p.id !== id)] : prev;
    });
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const aspectRatio =
      asset.width && asset.height ? asset.width / asset.height : 1;

    addItem({
      id: newId(),
      type: "image",
      uri: asset.uri,
      aspectRatio,
      scale: 1,
      rotation: 0,
      ...nextSpot(),
    });
  };

  const addSticker = (emoji: string) => {
    setStickersOpen(false);
    addItem({
      id: newId(),
      type: "sticker",
      emoji,
      scale: 1,
      rotation: 0,
      ...nextSpot(),
    });
  };

  const finishText = (draft: TextDraft) => {
    const editor = textEditor;
    setTextEditor(null);
    if (!editor) return;

    if (editor.mode === "edit") {
      if (!draft.text) {
        deleteItem(editor.id);
        return;
      }
      setItems((prev) =>
        prev.map((it) => (it.id === editor.id ? { ...it, ...draft } : it)),
      );
      return;
    }

    if (!draft.text) return;
    addItem({
      id: newId(),
      type: "text",
      ...draft,
      scale: 1,
      rotation: 0,
      ...nextSpot(),
    });
  };

  const selected = items.find((it) => it.id === selectedId) ?? null;
  const editingText =
    textEditor?.mode === "edit"
      ? (items.find((it) => it.id === textEditor.id) as DoorTextItem | undefined)
      : undefined;

  /* -------------------- drag-to-delete visuals -------------------- */

  const toolbarStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isDragging.value ? 0 : 1, { duration: 150 }),
  }));

  const trashStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isDragging.value ? 1 : 0, { duration: 150 }),
    backgroundColor: overTrash.value ? RED : "rgba(0,0,0,0.45)",
    transform: [{ scale: withTiming(overTrash.value ? 1.25 : 1, { duration: 120 }) }],
  }));

  /* -------------------- render -------------------- */

  return (
    <View
      style={styles.screen}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width !== screenSize?.w || height !== screenSize?.h) {
          setScreenSize({ w: width, h: height });
        }
      }}
    >
      <StatusBar barStyle="light-content" />

      {screenSize && (
        <>
          {/* Tapping anywhere off an item deselects. Sits *behind* the items so it never steals their touches. */}
          <Pressable style={styles.clipLayer} onPress={() => setSelectedId(null)}>
            <Image
              source={DOOR_ART}
              resizeMode="stretch"
              style={[styles.art, artStyle]}
            />
          </Pressable>

          {items.length === 0 && !textEditor && (
            <View
              pointerEvents="none"
              style={[
                styles.emptyHint,
                { left: doorLeft, top: doorTop, width: doorW, height: doorH },
              ]}
            >
              <Ionicons name="sparkles-outline" size={28} color="rgba(255,255,255,0.75)" />
              <Text style={styles.emptyHintText}>
                Make it yours!{"\n"}Add text, photos and stickers below.
              </Text>
            </View>
          )}

          {/* Items layer covers the whole screen (not just the door) so parts hanging off the door stay touchable on Android. */}
          <View style={styles.clipLayer} pointerEvents="box-none">
            <View
              pointerEvents="box-none"
              style={{
                position: "absolute",
                left: doorLeft,
                top: doorTop,
                width: doorW,
                height: doorH,
              }}
            >
              {items.map((item) => (
                <DoorItemView
                  key={item.id}
                  item={item}
                  canvasW={doorW}
                  canvasH={doorH}
                  selected={item.id === selectedId}
                  trashX={trashX}
                  trashY={trashY}
                  isDragging={isDragging}
                  overTrash={overTrash}
                  onSelect={setSelectedId}
                  onChange={updateItem}
                  onDelete={deleteItem}
                  onEditText={(id) => setTextEditor({ mode: "edit", id })}
                />
              ))}
            </View>
          </View>
        </>
      )}

      {/* ---------- top bar ---------- */}
      <Animated.View
        style={[
          styles.topBar,
          { paddingTop: insets.top + 12 },
          toolbarStyle,
          textEditor && styles.hidden,
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={styles.circleButton}
          activeOpacity={0.8}
          onPress={leave}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={26} color={NAVY} />
        </TouchableOpacity>

        <View style={styles.titlePill}>
          <Text style={styles.titleText}>Edit Door</Text>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, !dirty && styles.saveButtonIdle]}
          activeOpacity={0.85}
          onPress={handleSave}
          accessibilityLabel="Save door"
        >
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ---------- bottom bar ---------- */}
      <View
        style={[
          styles.bottomArea,
          { height: bottomH, paddingBottom: insets.bottom },
          textEditor && styles.hidden,
        ]}
        pointerEvents="box-none"
      >
        <Animated.View style={toolbarStyle} pointerEvents="box-none">
          {selected ? (
            <>
              <Text style={styles.hint}>
                Pinch, or drag the <Ionicons name="sync" size={12} color="#fff" /> handle, to resize & rotate
              </Text>
              <View style={styles.toolbar}>
                <ToolButton
                  label="Front"
                  icon={<MaterialCommunityIcons name="arrange-bring-to-front" size={24} color={NAVY} />}
                  onPress={() => bringToFront(selected.id)}
                />
                <ToolButton
                  label="Back"
                  icon={<MaterialCommunityIcons name="arrange-send-to-back" size={24} color={NAVY} />}
                  onPress={() => sendToBack(selected.id)}
                />
                {selected.type === "text" && (
                  <ToolButton
                    label="Edit"
                    icon={<Ionicons name="create-outline" size={24} color={NAVY} />}
                    onPress={() => setTextEditor({ mode: "edit", id: selected.id })}
                  />
                )}
                <ToolButton
                  label="Delete"
                  icon={<Ionicons name="trash-outline" size={23} color={RED} />}
                  labelColor={RED}
                  onPress={() => deleteItem(selected.id)}
                />
                <ToolButton
                  label="Done"
                  icon={<Ionicons name="checkmark" size={26} color={NAVY} />}
                  onPress={() => setSelectedId(null)}
                />
              </View>
            </>
          ) : (
            <View style={styles.toolbar}>
              <ToolButton
                label="Text"
                icon={<Text style={styles.aaIcon}>Aa</Text>}
                onPress={() => setTextEditor({ mode: "new" })}
              />
              <ToolButton
                label="Photo"
                icon={<Ionicons name="image-outline" size={24} color={NAVY} />}
                onPress={pickPhoto}
              />
              <ToolButton
                label="Sticker"
                icon={<Ionicons name="happy-outline" size={25} color={NAVY} />}
                onPress={() => setStickersOpen(true)}
              />
            </View>
          )}
        </Animated.View>
      </View>

      {/* Trash target, only visible while dragging an item. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.trash,
          { left: trashX - 30, top: trashY - 30 },
          trashStyle,
        ]}
      >
        <Ionicons name="trash" size={26} color="#FFFFFF" />
      </Animated.View>

      {/* ---------- overlays ---------- */}
      {textEditor && (
        <TextEditorOverlay
          initial={
            editingText && {
              text: editingText.text,
              color: editingText.color,
              font: editingText.font,
              background: editingText.background,
            }
          }
          onCancel={() => setTextEditor(null)}
          onDone={finishText}
        />
      )}

      {stickersOpen && (
        <StickerPicker onPick={addSticker} onClose={() => setStickersOpen(false)} />
      )}

      {confirmOpen && (
        <ConfirmDiscardSheet
          onKeepEditing={() => {
            pendingLeaveRef.current = null;
            setConfirmOpen(false);
          }}
          onDiscard={handleDiscard}
        />
      )}
    </View>
  );
}

function ToolButton({
  label,
  icon,
  onPress,
  labelColor = NAVY,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  labelColor?: string;
}) {
  return (
    <TouchableOpacity
      style={styles.toolButton}
      activeOpacity={0.75}
      onPress={onPress}
      accessibilityLabel={label}
    >
      <View style={styles.toolIcon}>{icon}</View>
      <Text style={[styles.toolLabel, { color: labelColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFF5DB",
  },

  // Oversized content (the art, items dragged off-screen) is clipped in these
  // sibling layers rather than on `screen`. On web, a clipped ancestor of the
  // text input would get scrolled when the input focuses, shoving the UI up.
  clipLayer: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },

  art: {
    position: "absolute",
  },

  emptyHint: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 10,
  },

  emptyHintText: {
    color: "rgba(255,255,255,0.8)",
    fontFamily: "Faustina",
    fontSize: 17,
    lineHeight: 24,
    textAlign: "center",
  },

  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  circleButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  titlePill: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    height: 48,
    paddingHorizontal: 22,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  titleText: {
    color: NAVY,
    fontSize: 20,
    fontWeight: "900",
  },

  saveButton: {
    backgroundColor: TAN_BUTTON,
    borderRadius: 22,
    height: 48,
    paddingHorizontal: 20,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  saveButtonIdle: {
    opacity: 0.75,
  },

  saveText: {
    color: NAVY,
    fontSize: 17,
    fontWeight: "800",
  },

  bottomArea: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },

  hint: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 6,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 3,
  },

  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    paddingHorizontal: 8,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },

  toolButton: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 58,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },

  toolIcon: {
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  toolLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },

  aaIcon: {
    color: NAVY,
    fontSize: 20,
    fontWeight: "900",
  },

  hidden: {
    display: "none",
  },

  trash: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
});
