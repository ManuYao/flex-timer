import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet, Alert, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES } from '../constants/theme';
import { stopAllSounds, unloadSound, playCountdownSound, playAlertSound } from '../utils/sound';
import NumberPicker from './common/NumberPicker';
import { TimerProps } from '../types';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.75;

// Définition des valeurs par défaut
const DEFAULT_VALUES = {
  DURATION: "20",
  WORK_TIME: "30",
  REST_TIME: "10",
  COUNTDOWN: 10
} as const;

const AmrapTimer: React.FC<TimerProps> = ({ onComplete }) => {
  // États initialisés avec les valeurs par défaut
  const [totalDuration, setTotalDuration] = useState<string>(DEFAULT_VALUES.DURATION);
  const [workTime, setWorkTime] = useState<string>(DEFAULT_VALUES.WORK_TIME);
  const [restTime, setRestTime] = useState<string>(DEFAULT_VALUES.REST_TIME);
  const [currentTime, setCurrentTime] = useState<number>(parseInt(DEFAULT_VALUES.WORK_TIME));
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isResting, setIsResting] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(DEFAULT_VALUES.COUNTDOWN);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isInfiniteMode, setIsInfiniteMode] = useState<boolean>(false);
  
  // États pour NumberPicker
  const [pickerVisible, setPickerVisible] = useState<boolean>(false);
  const [pickerTarget, setPickerTarget] = useState<'duration' | 'work' | 'rest' | null>(null);
  const [pickerConfig, setPickerConfig] = useState({
    minValue: 1,
    maxValue: 99,
    initialValue: parseInt(DEFAULT_VALUES.DURATION)
  });
  
  // Références
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isComponentMountedRef = useRef<boolean>(true);
  const lastCountdownRef = useRef<number>(0);

  const openNumberPicker = useCallback((target: 'duration' | 'work' | 'rest') => {
    let config = {
      minValue: 1,
      maxValue: 99,
      initialValue: parseInt(DEFAULT_VALUES.DURATION)
    };
    
    switch (target) {
      case 'duration':
        config = {
          minValue: 1,
          maxValue: 180,
          initialValue: parseInt(totalDuration)
        };
        break;
      case 'work':
        config = {
          minValue: 1,
          maxValue: 180,
          initialValue: parseInt(workTime)
        };
        break;
      case 'rest':
        config = {
          minValue: 1,
          maxValue: 120,
          initialValue: parseInt(restTime)
        };
        break;
    }
    
    setPickerConfig(config);
    setPickerTarget(target);
    setPickerVisible(true);
  }, [totalDuration, workTime, restTime]);

  const handlePickerConfirm = useCallback((value: number) => {
    switch (pickerTarget) {
      case 'duration':
        setTotalDuration(value.toString());
        break;
      case 'work':
        setWorkTime(value.toString());
        break;
      case 'rest':
        setRestTime(value.toString());
        break;
    }
    setPickerVisible(false);
  }, [pickerTarget]);

  const formatTime = useCallback((time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }, []);

  const pauseTimer = useCallback(() => {
    if (countdown === 0) {
      if (!isPaused) {
        stopAllSounds().catch(console.error);
      }
      setIsPaused(!isPaused);
    }
  }, [countdown, isPaused]);

  const resetTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    stopAllSounds().catch(console.error);
    
    setIsRunning(false);
    setIsPaused(false);
    setCurrentTime(parseInt(workTime));
    setElapsedTime(0);
    setCountdown(DEFAULT_VALUES.COUNTDOWN);
    setIsResting(false);
  }, [workTime]);

  const startTimer = useCallback(() => {
    if (isInfiniteMode) {
      const durationValue = parseInt(totalDuration);
      if (!durationValue || durationValue <= 0) {
        Alert.alert('Attention', 'Veuillez entrer une durée valide');
        return;
      }
    } else {
      const workValue = parseInt(workTime);
      const restValue = parseInt(restTime);
      
      if (!workValue || !restValue || workValue <= 0 || restValue <= 0) {
        Alert.alert('Attention', 'Veuillez entrer des temps valides pour le travail et le repos');
        return;
      }
    }
    
    stopAllSounds().catch(console.error);
    lastCountdownRef.current = 0;
    
    setIsRunning(true);
    setCurrentTime(isInfiniteMode ? parseInt(totalDuration) * 60 : parseInt(workTime));
    setElapsedTime(0);
    setIsPaused(false);
    setCountdown(DEFAULT_VALUES.COUNTDOWN);
    setIsResting(false);
  }, [isInfiniteMode, totalDuration, workTime, restTime]);

  const handleNextPhase = useCallback(() => {
    if (isRunning && countdown === 0 && !isInfiniteMode) {
      stopAllSounds().catch(console.error);
      
      setIsResting(!isResting);
      
      if (!isResting) {
        setCurrentTime(parseInt(restTime));
      } else {
        setCurrentTime(parseInt(workTime));
      }
    }
  }, [isRunning, countdown, isInfiniteMode, isResting, restTime, workTime]);

  const getPhaseColor = useCallback((): string => {
    if (countdown > 0) return COLORS.warning;
    return isResting ? COLORS.warning : COLORS.success;
  }, [countdown, isResting]);

  const getBackgroundColor = useCallback((): string => {
    return COLORS.background;
  }, []);

  const getCircleBackground = useCallback((): string => {
    if (countdown > 0) return 'rgba(255,255,255,0.1)';
    return isResting ? 'rgba(255,200,0,0.1)' : 'rgba(0,255,0,0.1)';
  }, [countdown, isResting]);

  useFocusEffect(
    React.useCallback(() => {
      isComponentMountedRef.current = true;
      
      return () => {
        isComponentMountedRef.current = false;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        
        stopAllSounds().catch(console.error);
      };
    }, [])
  );

  useEffect(() => {
    if (isRunning && !isPaused) {
      if (countdown <= 3 && countdown > 0 && countdown !== lastCountdownRef.current) {
        playCountdownSound(countdown).catch(console.error);
        lastCountdownRef.current = countdown;
      }

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      if (countdown > 0) {
        intervalRef.current = setInterval(() => {
          setCountdown(prev => prev - 1);
        }, 1000);
      } else {
        intervalRef.current = setInterval(() => {
          setCurrentTime(prev => {
            const currentPhaseTime = isInfiniteMode ? 
              parseInt(totalDuration) * 60 : 
              (isResting ? parseInt(restTime) : parseInt(workTime));
            const midPoint = Math.floor(currentPhaseTime / 2);
            
            if (prev === midPoint && midPoint > 5) {
              playAlertSound('midExercise', true).catch(console.error);
            }
            
            if (prev === 5) {
              playAlertSound('fiveSecondsEnd', true).catch(console.error);
            }

            if (prev <= 1) {
              if (isInfiniteMode) {
                if (isComponentMountedRef.current) {
                  setTimeout(() => {
                    resetTimer();
                    onComplete?.();
                    Alert.alert('Terminé', 'Entraînement terminé !');
                  }, 100);
                }
                return 0;
              }
              
              if (isResting) {
                setIsResting(false);
                return parseInt(workTime);
              } else {
                setIsResting(true);
                return parseInt(restTime);
              }
            }
            return prev - 1;
          });

          if (!isInfiniteMode) {
            setElapsedTime(prev => {
              const totalDurationSecs = parseInt(totalDuration) * 60;
              const newTime = prev + 1;
              if (newTime >= totalDurationSecs) {
                if (isComponentMountedRef.current) {
                  setTimeout(() => {
                    resetTimer();
                    onComplete?.();
                    Alert.alert('Terminé', 'Entraînement terminé !');
                  }, 100);
                }
                return totalDurationSecs;
              }
              return newTime;
            });
          }
        }, 1000);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, countdown, isPaused, isResting, workTime, restTime, isInfiniteMode, totalDuration, resetTimer, onComplete]);

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor() }]}>
      <View style={styles.safeArea}>
        {!isRunning ? (
          <View style={styles.setup}>
            <TouchableOpacity
              style={[styles.modeButton, isInfiniteMode && styles.modeButtonActive]}
              onPress={() => setIsInfiniteMode(!isInfiniteMode)}
            >
              <Text style={[styles.modeButtonText, isInfiniteMode && styles.modeButtonTextActive]}>
                {isInfiniteMode ? '∞ Mode Infini' : '⏱ Mode Minuté'}
              </Text>
            </TouchableOpacity>

            <View style={styles.circleContainer}>
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => openNumberPicker('duration')}
              >
                <View style={[styles.circle, styles.setupCircle]}>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.phaseText}>DURÉE</Text>
                    <View style={[styles.circleInputContainer, { width: '100%' }]}>
                      <Text style={styles.circleInput}>
                        {totalDuration}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {!isInfiniteMode && (
              <View style={styles.rowContainer}>
                <TouchableOpacity 
                  style={styles.inputContainer}
                  activeOpacity={0.8}
                  onPress={() => openNumberPicker('work')}
                >
                  <Text style={styles.label}>TRAVAIL</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.input}>
                      {workTime}
                    </Text>
                  </View>
                  <Text style={styles.unit}>SEC</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.inputContainer}
                  activeOpacity={0.8}
                  onPress={() => openNumberPicker('rest')}
                >
                  <Text style={styles.label}>REPOS</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.input}>
                      {restTime}
                    </Text>
                  </View>
                  <Text style={styles.unit}>SEC</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.startButton}
              onPress={startTimer}
            >
              <Text style={styles.startButtonText}>DÉMARRER</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.timerDisplay}>
            <Pressable onPress={pauseTimer}>
              <View style={[
                styles.circle,
                { 
                  borderColor: getPhaseColor(),
                  backgroundColor: getCircleBackground()
                },
                isPaused && styles.circlePaused
              ]}>
                <Text style={styles.phaseText}>
                  {countdown > 0 ? 'PRÊT' : (isResting ? 'REPOS' : 'GO')}
                </Text>
                {!isInfiniteMode && (
                  <Text style={styles.timeDisplay}>
                    {formatTime(elapsedTime)} / {formatTime(parseInt(totalDuration) * 60)}
                  </Text>
                )}
                <Text style={styles.currentTimeDisplay}>
                  {countdown > 0 ? countdown : formatTime(currentTime)}
                </Text>
                {isPaused && <Text style={styles.pausedText}>PAUSE</Text>}
              </View>
            </Pressable>

            {!isInfiniteMode && countdown === 0 && (
              <TouchableOpacity
                style={[styles.phaseButton, isResting && styles.phaseButtonActive]}
                onPress={handleNextPhase}
              >
                <Text style={styles.phaseButtonText}>
                  {isResting ? 'REPRENDRE' : 'RÉCUPÉRATION'}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.controls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={resetTimer}
              >
                <Text style={styles.controlButtonText}>↺</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
      
      <NumberPicker
        visible={pickerVisible}
        initialValue={pickerConfig.initialValue}
        minValue={pickerConfig.minValue}
        maxValue={pickerConfig.maxValue}
        onConfirm={handlePickerConfirm}
        formatAsTime={pickerTarget === 'work' || pickerTarget === 'rest' || pickerTarget === 'duration'}
        unit="SEC"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  setup: {
    width: '100%',
    alignItems: 'center',
    gap: 40,
  },
  circleContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerDisplay: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  setupCircle: {
    borderColor: 'rgba(255,255,255,0.3)',
  },
  circleInputContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleInput: {
    fontSize: 64,
    fontWeight: '300',
    color: '#FFFFFF',
    textAlign: 'center',
    height: 80,
    padding: 0,
    minWidth: 120,
  },
  timeDisplay: {
    fontSize: 36,
    fontWeight: '300',
    color: '#FFFFFF',
    marginBottom: 8,
    opacity: 0.9,
    textAlign: 'center',
  },
  currentTimeDisplay: {
    fontSize: 72,
    fontWeight: '200',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  inputContainer: {
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    padding: 16,
    borderRadius: SIZES.radius,
    flex: 1,
    maxWidth: width * 0.4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  label: {
    fontSize: SIZES.fontSize.body,
    color: '#FFFFFF',
    marginBottom: 8,
    fontWeight: '600',
    letterSpacing: 2,
  },
  input: {
    fontSize: 32,
    fontWeight: '300',
    color: '#FFFFFF',
    textAlign: 'center',
    height: 50,
    padding: 0,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
    minWidth: 100,
  },
  unit: {
    fontSize: SIZES.fontSize.small,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
    letterSpacing: 1,
  },
  startButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  startButtonText: {
    fontSize: SIZES.fontSize.body,
    color: COLORS.background,
    fontWeight: '500',
    letterSpacing: 3,
  },
  phaseText: {
    fontSize: SIZES.fontSize.title,
    color: '#FFFFFF',
    marginBottom: 16,
    fontWeight: '500',
    letterSpacing: 3,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    marginTop: 40,
    justifyContent: 'center',
    gap: 20,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  controlButtonText: {
    fontSize: 28,
    color: '#FFFFFF',
  },
  circlePaused: {
    opacity: 0.7,
    borderStyle: 'dashed',
  },
  pausedText: {
    position: 'absolute',
    fontSize: SIZES.fontSize.title,
    color: '#FFFFFF',
    opacity: 0.7,
    fontWeight: '600',
  },
  modeButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  modeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  modeButtonText: {
    fontSize: SIZES.fontSize.body,
    color: '#FFFFFF',
    fontWeight: '500',
    letterSpacing: 2,
  },
  modeButtonTextActive: {
    color: COLORS.background,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    width: '100%',
  },
  phaseButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    marginTop: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  phaseButtonActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: COLORS.success,
  },
  phaseButtonText: {
    fontSize: SIZES.fontSize.body,
    color: '#FFFFFF',
    fontWeight: '500',
    letterSpacing: 2,
    opacity: 0.9,
  },
  inputWrapper: {
    alignItems: 'center',
    width: '100%',
  },
});

export default AmrapTimer;