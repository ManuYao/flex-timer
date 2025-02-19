export type TimerType = 'AMRAP' | 'EMOM' | 'TABATA' | 'FOR TIME';

export interface TimerProps {
  onComplete?: () => void;
}

export interface NumberPickerProps {
  visible: boolean;
  initialValue: number;
  minValue: number;
  maxValue: number;
  onConfirm: (value: number) => void;
  onCancel?: () => void;
}

export interface SoundConfig {
  fiveSecondsStart: NodeRequire;
  fiveSecondsEnd: NodeRequire;
  midExercise: NodeRequire;
}

export interface FontSizes {
  title: number;
  subtitle: number;
  body: number;
  small: number;
}

export interface Sizes {
  padding: number;
  radius: number;
  fontSize: FontSizes;
}

export interface Shadow {
  shadowColor: string;
  shadowOffset: {
    width: number;
    height: number;
  };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}