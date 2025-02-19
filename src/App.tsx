import { LinkingOptions, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { useEffect } from "react";
import { COLORS } from "@/constants/theme";
import { linking } from "@/navigation/linking";
import { RootStackParamList } from "@/types/navigation";
import Home from "@/screens/Home";
import AmrapTimer from "@/components/AMRAP";
import ForTime from "@/components/ForTime";
import EMOM from "@/components/EMOM";
import TABATA from "@/components/TABATA";
import MIX from "@/components/MIX";
import { initializeAudio, cleanupSounds } from "@/utils/sound";
import ErrorBoundary from "@/components/common/ErrorBoundary";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  useEffect(() => {
    initializeAudio();
    return () => {
      cleanupSounds();
    };
  }, []);

  return (
    <ErrorBoundary>
      <NavigationContainer linking={linking}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: isDark ? COLORS.background : COLORS.surface,
            },
            headerTintColor: isDark ? COLORS.text : COLORS.textSecondary,
            headerTitleStyle: {
              fontWeight: "bold",
            },
            headerShadowVisible: false,
            contentStyle: {
              backgroundColor: isDark ? COLORS.background : COLORS.surface,
            },
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen
            name="Home"
            component={Home}
            options={{
              title: "Timer Selection",
              headerLargeTitle: true,
              headerTransparent: true,
            }}
          />
          <Stack.Screen
            name="AMRAP"
            component={AmrapTimer}
            options={{ title: "AMRAP Timer" }}
          />
          <Stack.Screen
            name="Basic Timer"
            component={ForTime}
            options={{ title: "Timer" }}
          />
          <Stack.Screen
            name="EMOM"
            component={EMOM}
            options={{ title: "EMOM Timer" }}
          />
          <Stack.Screen
            name="TABATA"
            component={TABATA}
            options={{ title: "Tabata Timer" }}
          />
          <Stack.Screen
            name="MIX"
            component={MIX}
            options={{ title: "Mix Timer" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
}
