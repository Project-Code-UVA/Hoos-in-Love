import ChatIcon from "./icons/chatIcon";
import { usePathname, useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AccountIcon from "./icons/accountIcon";
import HeartIcon from "./icons/heartIcon";

export const FOOTER_HEIGHT = 65;

export default function Footer() {
  const router = useRouter();
  const pathname = usePathname();
  const { bottom } = useSafeAreaInsets();

  return (
    <View style={{
      height: FOOTER_HEIGHT + bottom,
      paddingBottom: bottom,
      flexDirection: "row",
      justifyContent: "space-evenly",
      alignItems: "center",
      backgroundColor: "#FFC77D",
    }}>
      <Pressable accessibilityLabel="Chats" hitSlop={10}
        onPress={() => { if (pathname !== "/messages") router.replace("/messages"); }}>
        <ChatIcon height={30.5} />
      </Pressable>
      <Pressable accessibilityLabel="Lawn" hitSlop={10}
        onPress={() => { if (pathname !== "/lawn") router.replace("/lawn"); }}>
        <HeartIcon size={43} />
      </Pressable>
      <Pressable accessibilityLabel="My Profile" hitSlop={10}
        onPress={() => { if (pathname !== "/profile") router.replace("/profile"); }}>
        <AccountIcon size={22} />
      </Pressable>
    </View>
  );
}