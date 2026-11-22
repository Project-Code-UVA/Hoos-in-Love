/**
 * A decoration placed on a user's door.
 *
 * Positions and sizes are stored relative to the door canvas (not in pixels)
 * so the same door renders correctly at any size: full screen in the editor,
 * or small on the Lawn.
 *
 * Layer order is the array order: index 0 is the back, the last item is the front.
 */
type DoorItemBase = {
  id: string;
  /** Center X as a fraction of the door width (0 = left edge, 1 = right edge). */
  x: number;
  /** Center Y as a fraction of the door height (0 = top edge, 1 = bottom edge). */
  y: number;
  /** Multiplier on the item's base size. */
  scale: number;
  /** Rotation in radians. */
  rotation: number;
};

export type DoorTextFont = "classic" | "script" | "bold";

export type DoorTextItem = DoorItemBase & {
  type: "text";
  text: string;
  color: string;
  font: DoorTextFont;
  /** Draw a rounded pill behind the text (like Instagram's "A" toggle). */
  background: boolean;
};

export type DoorImageItem = DoorItemBase & {
  type: "image";
  uri: string;
  /** width / height of the source image. */
  aspectRatio: number;
};

export type DoorStickerItem = DoorItemBase & {
  type: "sticker";
  emoji: string;
};

export type DoorItem = DoorTextItem | DoorImageItem | DoorStickerItem;

export type DoorTransform = Pick<DoorItemBase, "x" | "y" | "scale" | "rotation">;

/** Base sizes as a fraction of the door canvas width (before `scale`). */
export const BASE_SIZE = {
  image: 0.55,
  sticker: 0.2,
  textFont: 0.085,
  textMaxWidth: 0.85,
} as const;

export const MIN_SCALE = 0.25;
export const MAX_SCALE = 5;
