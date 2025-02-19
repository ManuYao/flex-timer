import { TimerType } from './timer';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  AMRAP: {
    initialDuration?: number;
    initialWorkTime?: number;
    initialRestTime?: number;
  };
  'Basic Timer': {
    initialSeries?: number;
    initialRestTime?: number;
  };
  EMOM: {
    initialRounds?: number;
    initialIntervalTime?: number;
  };
  TABATA: {
    initialRounds?: number;
    initialWorkTime?: number;
    initialRestTime?: number;
  };
  MIX: {
    sequence?: Array<{
      type: TimerType;
      config: Record<string, number>;
    }>;
  };
};

export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;
