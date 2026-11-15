import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  const [loaded, error] = useFonts({
    GwendolynBold: require("../../assets/fonts/Gwendolyn-Bold.ttf"),
    Faustina: require("../../assets/fonts/Faustina-VariableFont_wght.ttf"),
  });

  if (!loaded && !error) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}