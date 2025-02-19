import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from './navigation';

export interface TimerProps {
  onComplete?: () => void;
  navigation?: NativeStackNavigationProp<RootStackParamList, keyof RootStackParamList>;
}

export interface NumberPickerProps {
  minValue?: number;
  maxValue?: number;
  initialValue?: number;
  onConfirm: (value: number) => void;
  visible: boolean;
}