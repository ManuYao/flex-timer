import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet, Alert, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES } from '../constants/theme';
import { stopAllSounds, playCountdownSound, playAlertSound } from '../utils/sound';
import NumberPicker from './common/NumberPicker';
import { TimerProps } from '../types';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.75;

// Définition des valeurs par défaut
const DEFAULT_VALUES = {
  TOTAL_ROUNDS: "5",
  REST_TIME: "60",
  COUNTDOWN: 10
} as const;

const ForTime: React.FC<TimerProps> = ({ onComplete }) => {
  // États avec valeurs par défaut
  const [totalRounds, setTotalRounds] = useState<string>(DEFAULT_VALUES.TOTAL_ROUNDS);
  const [restTime, setRestTime] = useState<string>(DEFAULT_VALUES.REST_TIME);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isResting, setIsResting] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(DEFAULT_VALUES.COUNTDOWN);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  
  // États pour NumberPicker
  const [pickerVisible, setPickerVisible] = useState<boolean>(false);
  const [pickerTarget, setPickerTarget] = useState<'rounds' | 'rest' | null>(null);
  const [pickerConfig, setPickerConfig] = useState({
    minValue: 1,
    maxValue: 30,
    initialValue: parseInt(DEFAULT_VALUES.TOTAL_ROUNDS)
  });
  
  // Références
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isComponentMountedRef = useRef<boolean>(true);
  const lastCountdownRef = useRef<number>(0);

  // Fonction pour ouvrir le NumberPicker avec la configuration appropriée
  const openNumberPicker = useCallback((target: 'rounds' | 'rest') => {
    let config = {
      minValue: 1,
      maxValue: 30,
      initialValue: parseInt(DEFAULT_VALUES.TOTAL_ROUNDS)
    };
    
    if (target === 'rounds') {
      config = {
        minValue: 1,
        maxValue: 30,
        initialValue: parseInt(totalRounds)
      };
    } else if (target === 'rest') {
      config = {
        minValue: 5,
        maxValue: 300,
        initialValue: parseInt(restTime)
      };
    }
    
    setPickerConfig(config);
    setPickerTarget(target);
    setPickerVisible(true);
  }, [totalRounds, restTime]);

  // Gestionnaire de confirmation du NumberPicker
  const handlePickerConfirm = useCallback((value: number) => {
    if (pickerTarget === 'rounds') {
      setTotalRounds(value.toString());
    } else if (pickerTarget === 'rest') {
      setRestTime(value.toString());
    }
    setPickerVisible(false);
  }, [pickerTarget]);

  // Format du temps en MM:SS
  const formatTime = useCallback((time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }, []);

  // Démarrage du timer
  const startTimer = useCallback(() => {
    const roundsValue = parseInt(totalRounds);
    const restValue = parseInt(restTime);
    
    if (!roundsValue || !restValue || roundsValue <= 0 || restValue <= 0) {
      Alert.alert('Attention', 'Veuillez entrer des valeurs valides pour les séries et le temps de repos');
      return;
    }
    
    stopAllSounds().catch(console.error);
    lastCountdownRef.current = 0;
    
    setIsRunning(true);
    setCurrentRound(1);
    setCurrentTime(0);
    setCountdown(DEFAULT_VALUES.COUNTDOWN);
    setIsPaused(false);
    setIsResting(false);
  }, [totalRounds, restTime]);

  // Réinitialisation du timer
  const resetTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    stopAllSounds().catch(console.error);
    
    setIsRunning(false);
    setIsPaused(false);
    setCurrentRound(1);
    setCurrentTime(0);
    setCountdown(DEFAULT_VALUES.COUNTDOWN);
    setIsResting(false);
  }, []);

  // Pause/Reprise du timer
  const pauseTimer = useCallback(() => {
    if (isRunning && countdown === 0) {
      if (!isPaused) {
        stopAllSounds().catch(console.error);
      }
      setIsPaused(!isPaused);
    }
  }, [isRunning, countdown, isPaused]);

  // Passage à la phase suivante (travail/repos)
  const handleNextPhase = useCallback(() => {
    if (isRunning && countdown === 0) {
      stopAllSounds().catch(console.error);
      
      if (!isResting) {
        // Si on termine une phase de travail
        if (currentRound >= parseInt(totalRounds)) {
          // Si c'était la dernière série
          if (isComponentMountedRef.current) {
            setTimeout(() => {
              resetTimer();
              onComplete?.();
              Alert.alert('Terminé', 'Entraînement terminé !');
            }, 100);
          }
          return;
        }
        // Sinon on passe au repos
        setIsResting(true);
        setCurrentTime(parseInt(restTime));
      } else {
        // On passe du repos au travail
        setIsResting(false);
        setCurrentTime(0);
        setCurrentRound(prev => prev + 1);
      }
    }
  }, [isRunning, countdown, isResting, restTime, currentRound, totalRounds, resetTimer, onComplete]);

  // Couleurs dynamiques
  const getPhaseColor = useCallback((): string => {
    if (countdown > 0) return COLORS.warning;
    return isResting ? COLORS.warning : COLORS.success;
  }, [countdown, isResting]);

  const getCircleBackground = useCallback((): string => {
    if (countdown > 0) return 'rgba(255,255,255,0.1)';
    return isResting ? 'rgba(255,200,0,0.1)' : 'rgba(0,255,0,0.1)';
  }, [countdown, isResting]);

  // Nettoyage à la perte du focus
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

  // Effet principal de gestion du timer
  useEffect(() => {
    if (isRunning && !isPaused) {
      // Gestion du décompte initial
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
          if (isResting) {
            // Gestion du temps de repos (dégressif)
            setCurrentTime(prev => {
              if (prev === 5) {
                playAlertSound('fiveSecondsEnd', true).catch(console.error);
              }
              
              const midPoint = Math.floor(parseInt(restTime) / 2);
              if (prev === midPoint && midPoint > 5) {
                playAlertSound('midExercise', true).catch(console.error);
              }

              if (prev <= 1) {
                if (currentRound >= parseInt(totalRounds)) {
                  if (isComponentMountedRef.current) {
                    setTimeout(() => {
                      resetTimer();
                      onComplete?.();
                      Alert.alert('Terminé', 'Entraînement terminé !');
                    }, 100);
                  }
                  return 0;
                }
                
                setIsResting(false);
                setCurrentTime(0);
                setCurrentRound(prevRound => prevRound + 1);
                return 0;
              }
              return prev - 1;
            });
          } else {
            // Gestion du temps de travail (progressif)
            setCurrentTime(prev => {
              if (prev > 0 && prev % 60 === 0) {
                playAlertSound('midExercise', true).catch(console.error);
              }
              return prev + 1;
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
  }, [isRunning, countdown, isPaused, currentRound, totalRounds, currentTime, isResting, restTime, resetTimer, onComplete]);

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <View style={styles.safeArea}>
        {!isRunning ? (
          // Configuration initiale
          <View style={styles.setup}>
            <View style={styles.circleContainer}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => openNumberPicker('rounds')}
              >
                <View style={[styles.circle, styles.setupCircle]}>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.phaseText}>SÉRIES</Text>
                    <View style={[styles.circleInputContainer, { width: '100%' }]}>
                      <Text style={styles.circleInput}>
                        {totalRounds}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

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

            <TouchableOpacity
              style={styles.startButton}
              onPress={startTimer}
            >
              <Text style={styles.startButtonText}>START</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Affichage du timer en cours
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
                {countdown === 0 && (
                  <Text style={styles.seriesText}>{currentRound}/{totalRounds}</Text>
                )}
                <Text style={styles.timeDisplay}>
                  {countdown > 0 ? countdown : formatTime(currentTime)}
                </Text>
                {isPaused && <Text style={styles.pausedText}>PAUSE</Text>}
              </View>
            </Pressable>

            {countdown === 0 && (
              <TouchableOpacity
                style={[
                  styles.phaseButton, 
                  isResting && styles.phaseButtonActive,
                  (!isResting && currentRound >= parseInt(totalRounds)) && styles.terminateButton
                ]}
                onPress={handleNextPhase}
              >
                <Text style={styles.phaseButtonText}>
                  {isResting ? 'REPRENDRE' : 
                  (currentRound >= parseInt(totalRounds) ? 'TERMINER' : 'RÉCUPÉRATION')}
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
        formatAsTime={pickerTarget === 'rest'}
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
    fontSize: 72,
    fontWeight: '200',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  seriesText: {
    fontSize: 36,
    color: '#FFFFFF',
    marginBottom: 8,
    fontWeight: '300',
    opacity: 0.9,
    textAlign: 'center',
  },
  inputContainer: {
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    padding: 16,
    borderRadius: SIZES.radius,
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
  terminateButton: {
    backgroundColor: 'rgba(255, 69, 58, 0.2)',
    borderColor: COLORS.error,
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

export default ForTime;