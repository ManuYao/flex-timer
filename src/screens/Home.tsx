// Source: src/screens/Home.tsx
import React, { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SIZES } from "../constants/theme";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type TimerType = {
  id: number;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
  disabled?: boolean;
};

type RootStackParamList = {
  Home: undefined;
  AMRAP: undefined;
  "Basic Timer": undefined;
  EMOM: undefined;
  TABATA: undefined;
  MIX: undefined;
};

type HomeProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Home">;
};

const TimerTypes: TimerType[] = [
  { id: 1, name: "AMRAP", icon: "infinite", description: "Mode : Maximum" },
  { id: 2, name: "Basic Timer", icon: "timer", description: "Mode : Normal" },
  {
    id: 3,
    name: "EMOM",
    icon: "repeat",
    description: "Mode : Chaque X - Pendant",
  },
  {
    id: 4,
    name: "TABATA",
    icon: "flash",
    description: "Mode : Tour - Travaill - Récup",
  },
  {
    id: 5,
    name: "MIX",
    icon: "shuffle",
    description: "Combinaisons personnalisées",
    disabled: true,
  },
];

const Home: React.FC<HomeProps> = ({ navigation }) => {
  const [activeTimer, setActiveTimer] = useState("Basic Timer");

  return (
    <View style={styles.mainContainer}>
      <View style={styles.centerContainer}>
        <Text style={styles.headerText}>⌛</Text>
        <View style={styles.menuContainer}>
          {TimerTypes.map((timer) => (
            <TouchableOpacity
              key={timer.id}
              style={[
                styles.card,
                activeTimer === timer.name && styles.activeCard,
                timer.disabled && styles.disabledCard,
              ]}
              onPress={() => {
                if (!timer.disabled) {
                  setActiveTimer(timer.name);
                  navigation.navigate(timer.name as keyof RootStackParamList);
                }
              }}
              disabled={timer.disabled}
            >
              <View style={styles.cardContent}>
                <Ionicons
                  name={timer.icon}
                  size={32}
                  color={timer.disabled ? COLORS.textSecondary : "#333"}
                />
                <View style={styles.textContainer}>
                  <Text style={[
                    styles.title,
                    timer.disabled && styles.disabledText
                  ]}>{timer.name}</Text>
                  <Text style={[
                    styles.description,
                    timer.disabled && styles.disabledText
                  ]}>{timer.description}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    fontSize: SIZES.fontSize.title,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: SIZES.padding * 2,
    color: COLORS.text,
  },
  menuContainer: {
    width: "100%",
    alignItems: "center",
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: 16,
    width: "90%",
    maxWidth: 400,
    alignItems: "center",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    justifyContent: "center",
  },
  textContainer: {
    marginLeft: 16,
    alignItems: "center",
  },
  title: {
    fontSize: SIZES.fontSize.subtitle,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
  },
  description: {
    fontSize: SIZES.fontSize.small,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  activeCard: {
    backgroundColor: COLORS.primary,
  },
  disabledCard: {
    opacity: 0.5,
    backgroundColor: COLORS.surface,
  },
  disabledText: {
    color: COLORS.textSecondary,
    opacity: 0.7,
  }
});

export default Home;