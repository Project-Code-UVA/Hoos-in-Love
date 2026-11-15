import Footer, { FOOTER_HEIGHT } from "../../../components/Footer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import ProgressBar from "../components/BottomProgressBar";
import InfoBubble from "../components/InfoBubble";
import KnockHearts from "../components/KnockHearts";

// to be removed LATER:
import { MOCK_PROFILES } from "../mockProfiles";


const { width: W, height: H } = Dimensions.get("window");

// Images
const DOOR_BG = require("../../../../assets/images/SwipePageImages/Door_SwipePage.png");
const WALL_BG = require("../../../../assets/images/SwipePageImages/Wall_SwipePage.png");

/* -------------------- ART / LAYOUT -------------------- */

const EXTRA_ZOOM = 1.07;
const MAIN_DOOR_CENTER = 0.5;

const DOOR_W = 210;
const DOOR_H = 320;
const DOOR_TOP = 250;

/* move the whole background down */
const BG_Y_OFFSET = 30;

/* -------------------- INTERACTION -------------------- */

const MAX_PULL_FRAC = 0.14;
const COMPLETE_THRESHOLD = 0.94;

const SNAP_CFG = { damping: 22, stiffness: 210 };
const COMMIT_MS = 380;
const COMMIT_EASE = Easing.out(Easing.cubic);

/* spring pull curve */
const SPRING_K = 0.02;

type BarDir = "ltr" | "rtl";
type SwipeMode = "love" | "friend";

export default function LawnScreen() {
  const profiles = MOCK_PROFILES;
  const n = profiles.length;
  const [mode, setMode] = useState<SwipeMode>("love");
  const [index, setIndex] = useState(0);

  const [barDir, setBarDir] = useState<BarDir>("ltr");
  const [showSwipeBar, setShowSwipeBar] = useState(false);

  const [isOpen, setIsOpen] = useState(false);

  const footerH = FOOTER_HEIGHT + useSafeAreaInsets().bottom;
  const BUBBLE_GAP = 28;
  const bubbleBottom = footerH + BUBBLE_GAP;
  const holdBarBottom = footerH + 6;

  const profile = profiles.length ? profiles[index % profiles.length] : null;

  /* -------------------- IMAGE SIZING -------------------- */

  const src = Image.resolveAssetSource(DOOR_BG);
  const imgW = src?.width ?? W;
  const imgH = src?.height ?? H;

  const coverScale = Math.max(W / imgW, H / imgH);
  const baseW = imgW * coverScale;
  const baseH = imgH * coverScale;

  const scaledW = baseW * EXTRA_ZOOM;
  const scaledH = baseH * EXTRA_ZOOM;

  const BG_TOP = (H - scaledH) / 2 + BG_Y_OFFSET;

  const initialX = W / 2 - scaledW * MAIN_DOOR_CENTER;
  const doorLeft = scaledW * MAIN_DOOR_CENTER - DOOR_W / 2;

  const MAX_PULL = W * MAX_PULL_FRAC;

  /* -------------------- SHARED VALUES -------------------- */

  const translateX = useSharedValue(0);
  const isCommitting = useSharedValue(false);
  const dragProgress = useSharedValue(0);

  const showSwipeBarSV = useSharedValue<0 | 1>(0);
  const barDirSV = useSharedValue<0 | 1>(0);

  const zoomScale = useSharedValue(1);
  const zoomTx = useSharedValue(0);
  const zoomTy = useSharedValue(0);

  /* -------------------- HELPERS -------------------- */

  const clamp01 = (v: number) => {
    "worklet";
    return Math.max(0, Math.min(1, v));
  };

  const springPull = (raw: number) => {
    "worklet";
    const sign = raw < 0 ? -1 : 1;
    const d = Math.abs(raw);
    const pulled = MAX_PULL * (1 - Math.exp(-SPRING_K * d));
    return sign * pulled;
  };

  const bumpIndex = (delta: number) => {
    setIndex((prev) => {
      const next = (prev + delta) % n;
      return next < 0 ? next + n : next;
    });
  };

  /* -------------------- ZOOM TARGET -------------------- */

  const doorCenterX = initialX + doorLeft + DOOR_W / 2;
  const doorCenterY = BG_TOP + DOOR_TOP + DOOR_H / 2;

  const targetScale = Math.min(W / DOOR_W, H / DOOR_H) * 1.02;

  const originX = W / 2;
  const originY = H / 2 - 25;

  const targetTx = targetScale * (originX - doorCenterX);
  const targetTy = targetScale * (originY - doorCenterY);

  useEffect(() => {
    if (isOpen) {
      translateX.value = withSpring(0, SNAP_CFG);
      dragProgress.value = withTiming(0, { duration: 120 });
      showSwipeBarSV.value = 0;
      setShowSwipeBar(false);
    }

    zoomScale.value = withTiming(isOpen ? targetScale : 1, {
      duration: isOpen ? 360 : 240,
      easing: COMMIT_EASE,
    });
    zoomTx.value = withTiming(isOpen ? targetTx : 0, {
      duration: isOpen ? 360 : 240,
      easing: COMMIT_EASE,
    });
    zoomTy.value = withTiming(isOpen ? targetTy : 0, {
      duration: isOpen ? 360 : 240,
      easing: COMMIT_EASE,
    });
  }, [isOpen, targetScale, targetTx, targetTy]);

  /* -------------------- STYLES -------------------- */

  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const sceneZoomStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: zoomScale.value },
      { translateX: zoomTx.value },
      { translateY: zoomTy.value },
    ],
  }));

  const artOffsetStyle = useMemo(
    () => ({
      ...StyleSheet.absoluteFill,
      transform: [{ translateX: initialX }],
    }),
    [initialX],
  );

  /* -------------------- COMMIT -------------------- */

  const commitTo = (dir: -1 | 1) => {
    "worklet";
    if (isCommitting.value || n <= 1) return;

    isCommitting.value = true;

    showSwipeBarSV.value = 0;
    runOnJS(setShowSwipeBar)(false);

    translateX.value = withTiming(
      dir * 2 * W,
      { duration: COMMIT_MS, easing: COMMIT_EASE },
      () => {
        runOnJS(bumpIndex)(dir === -1 ? 1 : -1);
        translateX.value = 0;
        dragProgress.value = 0;
        isCommitting.value = false;
      },
    );
  };

  /* -------------------- GESTURES -------------------- */

  const pan = Gesture.Pan()
    .enabled(!isOpen)
    .minDistance(6)
    .activeOffsetY([-12, 12])
    .onBegin(() => {
      if (isCommitting.value) return;
      dragProgress.value = 0;
      showSwipeBarSV.value = 0;
      runOnJS(setShowSwipeBar)(false);
    })
    .onUpdate((e) => {
      if (isCommitting.value) return;

      const tx = springPull(e.translationX);
      translateX.value = tx;

      const dir = tx > 0 ? 0 : 1;
      if (dir !== barDirSV.value) {
        barDirSV.value = dir;
        runOnJS(setBarDir)(dir === 1 ? "rtl" : "ltr");
      }

      const p = clamp01(Math.abs(tx) / MAX_PULL);
      dragProgress.value = p;

      if (p > 0.01 && !showSwipeBarSV.value) {
        showSwipeBarSV.value = 1;
        runOnJS(setShowSwipeBar)(true);
      }

      if (p >= COMPLETE_THRESHOLD) {
        if (tx < 0) commitTo(-1);
        else commitTo(1);
      }
    })
    .onEnd(() => {
      if (isCommitting.value) return;

      showSwipeBarSV.value = 0;
      runOnJS(setShowSwipeBar)(false);

      translateX.value = withSpring(0, SNAP_CFG);
      dragProgress.value = withTiming(0, { duration: 120 });
    });

  const isPointInDoor = (x: number, y: number) => {
    "worklet";
    return (
      x >= doorLeft &&
      x <= doorLeft + DOOR_W &&
      y >= DOOR_TOP &&
      y <= DOOR_TOP + DOOR_H
    );
  };

  const doorDoubleTap = Gesture.Tap()
    .enabled(!isOpen)
    .numberOfTaps(2)
    .maxDelay(250)
    .onStart((e) => {
      if (isPointInDoor(e.x, e.y)) {
        runOnJS(setIsOpen)(true);
      }
    });

  const closedGesture = Gesture.Simultaneous(pan, doorDoubleTap);

  /* -------------------- RENDER -------------------- */

  return (
    <View style={styles.screen}>
      <View style={styles.viewport}>
        <GestureDetector gesture={closedGesture}>
          <Animated.View style={[StyleSheet.absoluteFill, sceneZoomStyle]}>
            <Animated.View style={[styles.strip, stripStyle]}>
              <View style={[styles.page, { left: -2 * W }]}>
                <View style={artOffsetStyle}>
                  <Image
                    source={DOOR_BG}
                    resizeMode="stretch"
                    style={[
                      styles.bgImg,
                      { width: scaledW, height: scaledH, top: BG_TOP },
                    ]}
                  />
                </View>
              </View>

              <View style={[styles.page, { left: -W }]}>
                <View style={artOffsetStyle}>
                  <Image
                    source={WALL_BG}
                    resizeMode="stretch"
                    style={[
                      styles.bgImg,
                      { width: scaledW, height: scaledH, top: BG_TOP },
                    ]}
                  />
                </View>
              </View>

              <View style={[styles.page, { left: 0 }]}>
                <View style={artOffsetStyle}>
                  <Image
                    source={DOOR_BG}
                    resizeMode="stretch"
                    style={[
                      styles.bgImg,
                      { width: scaledW, height: scaledH, top: BG_TOP },
                    ]}
                  />
                </View>
              </View>

              <View style={[styles.page, { left: W }]}>
                <View style={artOffsetStyle}>
                  <Image
                    source={WALL_BG}
                    resizeMode="stretch"
                    style={[
                      styles.bgImg,
                      { width: scaledW, height: scaledH, top: BG_TOP },
                    ]}
                  />
                </View>
              </View>

              <View style={[styles.page, { left: 2 * W }]}>
                <View style={artOffsetStyle}>
                  <Image
                    source={DOOR_BG}
                    resizeMode="stretch"
                    style={[
                      styles.bgImg,
                      { width: scaledW, height: scaledH, top: BG_TOP },
                    ]}
                  />
                </View>
              </View>
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </View>

      <KnockHearts
        enabled={isOpen}
        onComplete={() => setIsOpen(false)}
      />

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topControls} pointerEvents="box-none">
          {isOpen && (
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.8}
              onPress={() => setIsOpen(false)}
            >
              <Text style={styles.backButtonText}>{"<"}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.modeToggleWrap} pointerEvents="auto">
            <View style={styles.modePill}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  styles.modeOption,
                  mode === "love" && { backgroundColor: "#FF5C8A" },
                ]}
                onPress={() => setMode("love")}
              >
                <Text
                  style={[
                    styles.modeText,
                    mode === "love" && styles.modeTextActive,
                  ]}
                >
                  Love
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  styles.modeOption,
                  mode === "friend" && { backgroundColor: "#C8A97E" },
                ]}
                onPress={() => setMode("friend")}
              >
                <Text
                  style={[
                    styles.modeText,
                    mode === "friend" && styles.modeTextActive,
                  ]}
                >
                  Friend
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View
          style={[styles.infoBubbleWrap, { bottom: bubbleBottom }]}
          pointerEvents="auto"
        >
          {profile && (
            <InfoBubble
              profile={{
                name: profile.name,
                age: profile.age,
                yearLabel: profile.yearLabel,
                quote: profile.quote,
                photoUri: (profile as any).photoUri,
              }}
              expandEnabled={isOpen}
              showHandle={isOpen}
              onClose={() => setIsOpen(false)}
            />
          )}
        </View>
      </View>

      {showSwipeBar && !isOpen && (
        <View
          style={[styles.holdBarWrap, { bottom: holdBarBottom }]}
          pointerEvents="none"
        >
          <ProgressBar progress={dragProgress} direction={barDir} />
        </View>
      )}
      <View style={styles.footerFixed}>
        <Footer />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFF5DB" },
  viewport: { flex: 1, overflow: "hidden" },

  strip: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0 },
  page: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: W,
    overflow: "hidden",
  },

  bgImg: { position: "absolute", left: 0 },

  overlay: { ...StyleSheet.absoluteFill },

  topControls: {
    position: "absolute",
    top: 61,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
  },

  backButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    height: 48,
    minWidth: 48,
    paddingHorizontal: 14,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  backButtonText: {
    fontSize: 32,
    lineHeight: 34,
    fontWeight: "700",
    color: "#002562",
    transform: [{ translateX: -1 }],
  },

  modeToggleWrap: {
    zIndex: 10,
  },

  modePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 4,
    height: 48,
  },

  modeOption: {
    minWidth: 82,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  modeText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7A869A",
  },

  modeTextActive: {
    color: "#FFFFFF",
  },

  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },

  loadingText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "600",
  },

  infoBubbleWrap: {
    position: "absolute",
    left: 13,
    right: 13,
    zIndex: 40,
  },

  holdBarWrap: { position: "absolute", left: 0, right: 0 },

  footerFixed: { position: "absolute", bottom: 0, left: 0, right: 0 },
});