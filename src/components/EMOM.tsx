// src/components/EMOM.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet, Alert, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES } from '../constants/theme';
import { stopAllSounds, unloadSound, playCountdownSound, playAlertSound } from '../utils/sound';
import NumberPicker from './common/NumberPicker';
import { TimerProps } from '../types';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.75;

const EMOM: React.FC<TimerProps> = ({ onComplete }) => {
  const [rounds, setRounds] = useState<string>('');
  const [intervalTime, setIntervalTime] = useState<string>('');
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(10);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  
  // États pour NumberPicker
  const [pickerVisible, setPickerVisible] = useState<boolean>(false);
  const [pickerTarget, setPickerTarget] = useState<'rounds' | 'interval' | null>(null);
  const [pickerConfig, setPickerConfig] = useState({
    minValue: 1,
    maxValue: 99,
    initialValue: 10
  });
  
  // Références
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isComponentMountedRef = useRef<boolean>(true);
  const lastCountdownRef = useRef<number>(0);

  // Fonction pour ouvrir le NumberPicker avec la configuration appropriée
  const openNumberPicker = useCallback((target: 'rounds' | 'interval') => {
    let config = {
      minValue: 1,
      initialValue: 10,
      maxValue: 99
    };
    
    if (target === 'rounds') {
      config = {
        minValue: 1,
        maxValue: 99,
        initialValue: parseInt(rounds) || 10
      };
    } else if (target === 'interval') {
      config = {
        minValue: 1,
        maxValue: 300,
        initialValue: parseInt(intervalTime) || 60
      };
    }
    
    setPickerConfig(config);
    setPickerTarget(target);
    setPickerVisible(true);
  }, [rounds, intervalTime]);

  // Gérer la confirmation du sélecteur
  const handlePickerConfirm = useCallback((value: number) => {
    if (pickerTarget === 'rounds') {
      setRounds(value.toString());
    } else if (pickerTarget === 'interval') {
      setIntervalTime(value.toString());
    }
    setPickerVisible(false);
  }, [pickerTarget]);

  // Formater le temps en MM:SS
  const formatTime = useCallback((time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }, []);

  // Démarrer le chronomètre avec validation
  const startTimer = useCallback(() => {
    const roundsValue = parseInt(rounds);
    const intervalValue = parseInt(intervalTime);
    
    if (!roundsValue || !intervalValue || roundsValue <= 0 || intervalValue <= 0) {
      Alert.alert('Attention', 'Veuillez entrer des valeurs valides pour les rounds et l\'intervalle');
      return;
    }
    
    stopAllSounds().catch(console.error);
    lastCountdownRef.current = 0;
    
    setIsRunning(true);
    setCurrentRound(1);
    setCurrentTime(parseInt(intervalTime));
    setCountdown(10);
    setIsPaused(false);
  }, [rounds, intervalTime]);

  // Réinitialiser le chronomètre et nettoyer
  const resetTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    stopAllSounds().catch(console.error);
    
    setIsRunning(false);
    setIsPaused(false);
    setCurrentRound(1);
    setCurrentTime(parseInt(intervalTime));
    setCountdown(10);
  }, [intervalTime]);

  // Basculer l'état de pause
  const handleCirclePress = useCallback(() => {
    if (isRunning && countdown === 0) {
      if (!isPaused) {
        stopAllSounds().catch(console.error);
      }
      setIsPaused(!isPaused);
    }
  }, [isRunning, countdown, isPaused]);

  // Assistants de style dynamique
  const getPhaseColor = useCallback(() => {
    if (countdown > 0) return COLORS.warning;
    return COLORS.success;
  }, [countdown]);

  const getBackgroundColor = useCallback(() => {
    // Utiliser une couleur de fond constante
    return COLORS.background;
  }, []);

  const getCircleBackground = useCallback(() => {
    if (countdown > 0) return 'rgba(255,255,255,0.1)';
    return 'rgba(0,255,0,0.1)';
  }, [countdown]);

  // Nettoyer à la perte de focus du composant
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

  // Logique principale du chronomètre
  useEffect(() => {
    if (isRunning && !isPaused) {
      // Sons pendant le décompte initial - uniquement pour les 3 dernières secondes
      if (countdown <= 3 && countdown > 0 && countdown !== lastCountdownRef.current) {
        playCountdownSound(countdown).catch(console.error);
        lastCountdownRef.current = countdown;
      }

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Logique du décompte initial
      if (countdown > 0) {
        intervalRef.current = setInterval(() => {
          setCountdown(prev => prev - 1);
        }, 1000);
      } 
      // Logique principale du chronomètre
      else {
        intervalRef.current = setInterval(() => {
          setCurrentTime(prev => {
            // Calculer le point médian pour jouer le son au milieu de l'intervalle
            const midPoint = Math.floor(parseInt(intervalTime) / 2);
            
            // Jouer le son midExercise à mi-parcours si l'intervalle est assez long
            if (prev === midPoint && midPoint > 5) {
              playAlertSound('midExercise', true).catch(console.error);
            }
            
            // Jouer le son 5 secondes avant la fin de l'intervalle
            if (prev === 5) {
              playAlertSound('fiveSecondsEnd', true).catch(console.error);
            }

            // Fin de l'intervalle actuel
            if (prev <= 1) {
              // Vérifier si tous les rounds sont terminés
              if (currentRound >= parseInt(rounds)) {
                if (isComponentMountedRef.current) {
                  setTimeout(() => {
                    resetTimer();
                    onComplete?.();
                    Alert.alert('Terminé', 'Entraînement terminé !');
                  }, 100);
                }
                return 0;
              }
              
              // Passer au round suivant
              setCurrentRound(r => r + 1);
              return parseInt(intervalTime);
            }
            
            return prev - 1;
          });
        }, 1000);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, countdown, isPaused, currentRound, rounds, intervalTime, resetTimer, onComplete]);

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor() }]}>
      <View style={styles.safeArea}>
        {!isRunning ? (
          <View style={styles.setup}>
            <View style={styles.circleContainer}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => openNumberPicker('rounds')}
              >
                <View style={[styles.circle, styles.setupCircle]}>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.phaseText}>ROUNDS</Text>
                    <View style={[styles.circleInputContainer, { width: '100%' }]}>
                      <Text style={styles.circleInput}>
                        {rounds || "10"}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.inputContainer}
              activeOpacity={0.8}
              onPress={() => openNumberPicker('interval')}
            >
              <Text style={styles.label}>INTERVALLE</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.input}>
                  {intervalTime || "60"}
                </Text>
              </View>
              <Text style={styles.unit}>SEC</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.startButton}
              onPress={startTimer}
            >
              <Text style={styles.startButtonText}>DÉMARRER</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.timerDisplay}>
            <Pressable onPress={handleCirclePress}>
              <View style={[
                styles.circle,
                { 
                  borderColor: getPhaseColor(),
                  backgroundColor: getCircleBackground()
                },
                isPaused && styles.circlePaused
              ]}>
                <Text style={styles.phaseText}>
                  {countdown > 0 ? 'PRÊT' : 'GO'}
                </Text>
                {countdown === 0 && (
                  <Text style={styles.seriesText}>{currentRound}/{rounds}</Text>
                )}
                <Text style={styles.timeDisplay}>
                  {countdown > 0 ? countdown : currentTime}
                </Text>
                {isPaused && <Text style={styles.pausedText}>PAUSE</Text>}
              </View>
            </Pressable>

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
  inputWrapper: {
    alignItems: 'center',
    width: '100%',
  },
});

export default EMOM;

//tmp