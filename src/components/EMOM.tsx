// Source: src/components/EMOM.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet, Alert, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES } from '../constants/theme';
import { stopAllSounds, unloadSound, playCountdownSound, playAlertSound } from '../utils/sound';
import NumberPicker from './common/NumberPicker';
import { TimerProps } from '../types';
import AppStateHandler from '../utils/AppStateHandler';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.75;

// Définition des valeurs par défaut
const DEFAULT_VALUES = {
  ROUNDS: "10",
  INTERVAL: "60",
  COUNTDOWN: 10
} as const;

const EMOM: React.FC<TimerProps> = ({ onComplete }) => {
  // États initialisés avec les valeurs par défaut
  const [rounds, setRounds] = useState<string>(DEFAULT_VALUES.ROUNDS);
  const [intervalTime, setIntervalTime] = useState<string>(DEFAULT_VALUES.INTERVAL);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState<number>(parseInt(DEFAULT_VALUES.INTERVAL));
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(DEFAULT_VALUES.COUNTDOWN);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  
  // États pour NumberPicker
  const [pickerVisible, setPickerVisible] = useState<boolean>(false);
  const [pickerTarget, setPickerTarget] = useState<'rounds' | 'interval' | null>(null);
  const [pickerConfig, setPickerConfig] = useState({
    minValue: 1,
    maxValue: 99,
    initialValue: parseInt(DEFAULT_VALUES.ROUNDS)
  });
  
  // Références
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isComponentMountedRef = useRef<boolean>(true);
  const lastCountdownRef = useRef<number>(0);
  // Référence pour le mode actuel
  const modeRef = useRef<'countdown' | 'exercise' | 'idle'>('idle');

  // Logger avec préfixe pour faciliter le débogage
  const log = (message: string, data?: any) => {
    console.log(`[EMOM] ${message}`, data !== undefined ? data : '');
  };

  // Fonction pour déterminer l'unité à afficher en fonction de la valeur
  const getDisplayUnit = useCallback((timeStr: string): string => {
    const value = parseInt(timeStr);
    return value >= 60 ? "MIN" : "SEC";
  }, []);

  const openNumberPicker = useCallback((target: 'rounds' | 'interval') => {
    let config = {
      minValue: 1,
      maxValue: 99,
      initialValue: parseInt(DEFAULT_VALUES.ROUNDS)
    };
    
    if (target === 'rounds') {
      config = {
        minValue: 1,
        maxValue: 99,
        initialValue: parseInt(rounds)
      };
    } else if (target === 'interval') {
      config = {
        minValue: 10,
        maxValue: 300,
        initialValue: parseInt(intervalTime)
      };
    }
    
    setPickerConfig(config);
    setPickerTarget(target);
    setPickerVisible(true);
  }, [rounds, intervalTime]);

  const handlePickerConfirm = useCallback((value: number) => {
    if (pickerTarget === 'rounds') {
      setRounds(value.toString());
    } else if (pickerTarget === 'interval') {
      setIntervalTime(value.toString());
    }
    setPickerVisible(false);
  }, [pickerTarget]);

  const formatTime = useCallback((time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }, []);

  // Fonction pour formater les valeurs d'affichage (pour l'interface utilisateur)
  const formatDisplayValue = useCallback((timeStr: string): string => {
    const value = parseInt(timeStr);
    if (value >= 60) {
      const minutes = Math.floor(value / 60);
      const seconds = value % 60;
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
    return timeStr;
  }, []);

  // Fonction pour arrêter tous les timers
  const stopAllTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    stopAllTimers();
    
    stopAllSounds().catch(console.error);
    
    setIsRunning(false);
    setIsPaused(false);
    setCurrentRound(1);
    setCurrentTime(parseInt(intervalTime));
    setCountdown(DEFAULT_VALUES.COUNTDOWN);
    modeRef.current = 'idle';
  }, [intervalTime, stopAllTimers]);

  const startTimer = useCallback(() => {
    const roundsValue = parseInt(rounds);
    const intervalValue = parseInt(intervalTime);
    
    if (!roundsValue || !intervalValue || roundsValue <= 0 || intervalValue <= 0) {
      Alert.alert('Attention', 'Veuillez entrer des valeurs valides pour les rounds et l\'intervalle');
      return;
    }
    
    log('▶️ Démarrage du timer EMOM');
    stopAllSounds().catch(console.error);
    lastCountdownRef.current = 0;
    
    setIsRunning(true);
    setCurrentRound(1);
    setCurrentTime(intervalValue);
    setCountdown(DEFAULT_VALUES.COUNTDOWN);
    setIsPaused(false);
    modeRef.current = 'countdown';
  }, [rounds, intervalTime, stopAllTimers]);

  const handleCirclePress = useCallback(() => {
    if (isRunning && countdown === 0) {
      if (!isPaused) {
        stopAllSounds().catch(console.error);
        stopAllTimers();
      }
      setIsPaused(!isPaused);
    }
  }, [isRunning, countdown, isPaused, stopAllTimers]);

  // Gestion du temps passé en arrière-plan
  const handleAppForeground = useCallback((timeInBackground: number) => {
    if (!isRunning || !isComponentMountedRef.current) return;
    
    // Logs d'entrée clairs et visibles
    console.log('┌─────────────────────────────────────────────────┐');
    console.log(`│ [EMOM] 🔄 RETOUR AU PREMIER PLAN                 │`);
    console.log(`│ Temps passé en arrière-plan: ${(timeInBackground/1000).toFixed(1)}s │`);
    console.log('└─────────────────────────────────────────────────┘');
    log(`État avant ajustement: mode=${modeRef.current}, round=${currentRound}/${rounds}, time=${currentTime}, isPaused=${isPaused}`);
    
    if (isPaused) {
      log('⏸️ Timer en pause, pas de mise à jour nécessaire');
      return;
    }
    
    const secondsInBackground = Math.floor(timeInBackground / 1000);
    log(`Ajustement pour ${secondsInBackground} secondes écoulées en arrière-plan`);
    
    // Stopper l'intervalle actuel pendant les ajustements
    stopAllTimers();
    
    // Gérer différemment selon le mode
    if (countdown > 0) {
      // Si on est en décompte initial
      log(`Mode DÉCOMPTE: ${countdown}s restantes`);
      
      const newCountdown = Math.max(0, countdown - secondsInBackground);
      log(`Décompte ajusté: ${countdown} → ${newCountdown}`);
      
      if (newCountdown <= 0) {
        // Le décompte est terminé pendant l'arrière-plan
        console.log('┌─────────────────────────────────────┐');
        console.log(`│ [EMOM] 🔄 TRANSITION AUTOMATIQUE     │`);
        console.log(`│ DÉCOMPTE → EXERCICE                 │`);
        console.log('└─────────────────────────────────────┘');
        
        // Mise à jour des états
        setCountdown(0);
        modeRef.current = 'exercise';
        
        // Calculer combien de temps s'est écoulé après le décompte
        const timeAfterCountdown = secondsInBackground - countdown;
        log(`Temps écoulé après le décompte: ${timeAfterCountdown}s`);
        
        // Ajuster l'intervalle actuel
        const intervalValue = parseInt(intervalTime);
        const newTime = Math.max(1, intervalValue - timeAfterCountdown);
        
        log(`Premier intervalle ajusté: ${newTime}s restantes`);
        setCurrentTime(newTime);
        
        // Si le premier intervalle s'est terminé
        if (timeAfterCountdown >= intervalValue) {
          // Calculer combien d'intervalles complets se sont écoulés
          const completedIntervals = Math.floor(timeAfterCountdown / intervalValue);
          const newRound = Math.min(parseInt(rounds), 1 + completedIntervals);
          log(`${completedIntervals} intervalles complets écoulés, nouveau round: ${newRound}`);
          
          // Vérifier si l'entraînement est terminé
          if (newRound > parseInt(rounds)) {
            log('🏁 Entraînement terminé en arrière-plan');
            resetTimer();
            if (onComplete) onComplete();
            
            setTimeout(() => {
              Alert.alert('Terminé', 'Entraînement terminé !');
            }, 100);
            
            return;
          }
          
          // Mettre à jour le round et calculer le temps restant dans ce round
          setCurrentRound(newRound);
          const timeInCurrentInterval = timeAfterCountdown % intervalValue;
          const timeLeftInCurrentInterval = intervalValue - timeInCurrentInterval;
          log(`Temps restant dans l'intervalle actuel: ${timeLeftInCurrentInterval}s`);
          setCurrentTime(Math.max(1, timeLeftInCurrentInterval)); // Au moins 1 seconde pour éviter 0
        }
      } else {
        // Le décompte n'est pas terminé
        setCountdown(newCountdown);
      }
    } else {
      // En mode exercise - Gérer les intervalles
      const intervalValue = parseInt(intervalTime);
      
      // Si le temps écoulé en arrière-plan est inférieur au temps restant actuel
      if (secondsInBackground < currentTime) {
        // Simplement ajuster le temps restant dans l'intervalle actuel
        const newTime = currentTime - secondsInBackground;
        log(`Ajustement simple: ${currentTime}s → ${newTime}s`);
        setCurrentTime(Math.max(1, newTime)); // Au moins 1 seconde
      } else {
        // Des intervalles complets ont pu s'écouler
        
        // Calculer combien d'intervalles complets (rounds) ont été parcourus
        const timeNeededToFinishCurrentInterval = currentTime;
        const remainingTime = secondsInBackground - timeNeededToFinishCurrentInterval;
        const additionalCompletedIntervals = Math.floor(remainingTime / intervalValue);
        
        // Nouveau round total
        const newRound = Math.min(parseInt(rounds), currentRound + additionalCompletedIntervals + 1);
        log(`Round ${currentRound} terminé + ${additionalCompletedIntervals} intervalles supplémentaires = Round ${newRound}`);
        
        // Vérifier si l'entraînement est terminé
        if (newRound > parseInt(rounds)) {
          log('🏁 Entraînement terminé en arrière-plan');
          resetTimer();
          if (onComplete) onComplete();
          
          setTimeout(() => {
            Alert.alert('Terminé', 'Entraînement terminé !');
          }, 100);
          
          return;
        }
        
        // Mettre à jour le round et calculer le temps restant dans ce round
        setCurrentRound(newRound);
        
        // Calculer le temps écoulé dans l'intervalle actuel
        const timeInCurrentInterval = remainingTime % intervalValue;
        const timeLeftInCurrentInterval = intervalValue - timeInCurrentInterval;
        log(`Temps restant dans l'intervalle actuel: ${timeLeftInCurrentInterval}s`);
        setCurrentTime(Math.max(1, timeLeftInCurrentInterval)); // Au moins 1 seconde
      }
    }
  }, [isRunning, isPaused, countdown, currentRound, currentTime, rounds, intervalTime, resetTimer, onComplete, stopAllTimers]);

  const getPhaseColor = useCallback(() => {
    if (countdown > 0) return COLORS.warning;
    return COLORS.success;
  }, [countdown]);

  const getBackgroundColor = useCallback(() => {
    return COLORS.background;
  }, []);

  const getCircleBackground = useCallback(() => {
    if (countdown > 0) return 'rgba(255,255,255,0.1)';
    return 'rgba(0,255,0,0.1)';
  }, [countdown]);

  useFocusEffect(
    React.useCallback(() => {
      isComponentMountedRef.current = true;
      
      return () => {
        isComponentMountedRef.current = false;
        stopAllTimers();
        stopAllSounds().catch(console.error);
      };
    }, [stopAllTimers])
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
        log('Démarrage du décompte initial');
        intervalRef.current = setInterval(() => {
          setCountdown(prev => prev - 1);
        }, 1000);
      } else {
        log(`Démarrage du timer EMOM: Round ${currentRound}/${rounds}, temps: ${currentTime}s`);
        intervalRef.current = setInterval(() => {
          setCurrentTime(prev => {
            const midPoint = Math.floor(parseInt(intervalTime) / 2);
            
            if (prev === midPoint && midPoint > 5) {
              playAlertSound('midExercise', true).catch(console.error);
            }
            
            if (prev === 5) {
              playAlertSound('fiveSecondsEnd', true).catch(console.error);
            }

            if (prev <= 1) {
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
      {/* Gestionnaire d'état d'application pour le background */}
      <AppStateHandler 
        onForeground={handleAppForeground} 
        enabled={isRunning}
      />
      
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
                        {rounds}
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
                  {formatDisplayValue(intervalTime)}
                </Text>
              </View>
              <Text style={styles.unit}>{getDisplayUnit(intervalTime)}</Text>
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
  formatAsTime={pickerTarget === 'interval'}
  unit={pickerTarget === 'rounds' ? '' : 'SEC'}
  stepValue={pickerTarget === 'rounds' ? 1 : undefined}
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