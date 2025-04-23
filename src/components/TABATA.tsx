// Source: src/components/TABATA.tsx
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
  ROUNDS: "8",
  WORK_TIME: "20",
  REST_TIME: "10",
  COUNTDOWN: 10
} as const;

const TABATA: React.FC<TimerProps> = ({ onComplete }) => {
  // États initialisés avec les valeurs par défaut
  const [rounds, setRounds] = useState<string>(DEFAULT_VALUES.ROUNDS);
  const [workTime, setWorkTime] = useState<string>(DEFAULT_VALUES.WORK_TIME);
  const [restTime, setRestTime] = useState<string>(DEFAULT_VALUES.REST_TIME);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [currentTime, setCurrentTime] = useState<number>(parseInt(DEFAULT_VALUES.WORK_TIME));
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isResting, setIsResting] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(DEFAULT_VALUES.COUNTDOWN);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  
  // États pour NumberPicker
  const [pickerVisible, setPickerVisible] = useState<boolean>(false);
  const [pickerTarget, setPickerTarget] = useState<'rounds' | 'work' | 'rest' | null>(null);
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
  const modeRef = useRef<'countdown' | 'work' | 'rest' | 'idle'>('idle');
  // Utiliser une ref pour les fonctions timer pour briser les dépendances circulaires
  const timerFunctionsRef = useRef<{
    resetTimer: () => void;
    startInterval: () => void;
    stopAllTimers: () => void;
  }>({
    resetTimer: () => {},
    startInterval: () => {},
    stopAllTimers: () => {}
  });

  // Logger avec préfixe pour faciliter le débogage
  const log = (message: string, data?: any) => {
    console.log(`[TABATA] ${message}`, data !== undefined ? data : '');
  };

  // Fonction pour arrêter tous les timers - définie en premier
  const stopAllTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  
  // Mettre à jour la référence de la fonction
  timerFunctionsRef.current.stopAllTimers = stopAllTimers;

  const formatTime = useCallback((time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }, []);

  // Reset Timer (définie avant utilisation)
  const resetTimer = useCallback(() => {
    // Utiliser la fonction de la référence pour éviter les problèmes de dépendance
    timerFunctionsRef.current.stopAllTimers();
    
    stopAllSounds().catch(console.error);
    
    setIsRunning(false);
    setIsPaused(false);
    setCurrentRound(1);
    setCurrentTime(parseInt(workTime));
    setCountdown(DEFAULT_VALUES.COUNTDOWN);
    setIsResting(false);
    modeRef.current = 'idle';
  }, [workTime]);
  
  // Mettre à jour la référence de la fonction
  timerFunctionsRef.current.resetTimer = resetTimer;
  
  // Start Interval
  const startInterval = useCallback(() => {
    // Utiliser la fonction de la référence pour éviter les problèmes de dépendance
    timerFunctionsRef.current.stopAllTimers();
    
    // Déterminer le mode actuel
    const currentMode = modeRef.current;
    log(`Démarrage de l'intervalle en mode: ${currentMode}`);
    
    // Créer un nouvel intervalle selon le mode actuel
    intervalRef.current = setInterval(() => {
      if (currentMode === 'countdown') {
        setCountdown(prev => {
          const newValue = Math.max(0, prev - 1);
          
          // Sons pour les 3 dernières secondes
          if (newValue <= 3 && newValue > 0 && newValue !== lastCountdownRef.current) {
            playCountdownSound(newValue).catch(console.error);
            lastCountdownRef.current = newValue;
          }
          
          // Démarrer le timer principal quand le décompte atteint zéro
          if (newValue === 0 && prev > 0) {
            log('🔄 Décompte terminé, passage en mode travail');
            modeRef.current = 'work';
            timerFunctionsRef.current.startInterval(); // Redémarrer l'intervalle en mode work
            playAlertSound('midExercise', true).catch(console.error);
          }
          
          return newValue;
        });
      } 
      else if (currentMode === 'work' || currentMode === 'rest') {
        setCurrentTime(prev => {
          const currentPhaseTime = isResting ? parseInt(restTime) : parseInt(workTime);
          const midPoint = Math.floor(currentPhaseTime / 2);
          
          if (prev === midPoint && midPoint > 5) {
            playAlertSound('midExercise', true).catch(console.error);
          }
          
          if (prev === 5) {
            playAlertSound('fiveSecondsEnd', true).catch(console.error);
          }

          if (prev <= 0) {
            if (isResting) {
              // Fin d'une phase de repos
              if (currentRound >= parseInt(rounds)) {
                if (isComponentMountedRef.current) {
                  setTimeout(() => {
                    timerFunctionsRef.current.resetTimer();
                    onComplete?.();
                    Alert.alert('Terminé', 'Entraînement terminé !');
                  }, 100);
                }
                return 0;
              }
              
              // Passage à la série suivante
              setCurrentRound(r => r + 1);
              setIsResting(false);
              modeRef.current = 'work';
              return parseInt(workTime);
            } else {
              // Fin d'une phase de travail, passage au repos
              setIsResting(true);
              modeRef.current = 'rest';
              return parseInt(restTime);
            }
          }
          
          return prev - 1;
        });
      }
    }, 1000);
  }, [workTime, restTime, rounds, currentRound, isResting, onComplete]);
  
  // Mettre à jour la référence de la fonction
  timerFunctionsRef.current.startInterval = startInterval;

  const openNumberPicker = useCallback((target: 'rounds' | 'work' | 'rest') => {
    let config = {
      minValue: 1,
      maxValue: 99,
      initialValue: parseInt(DEFAULT_VALUES.ROUNDS)
    };
    
    switch (target) {
      case 'rounds':
        config = {
          minValue: 1,
          maxValue: 30,
          initialValue: parseInt(rounds)
        };
        break;
      case 'work':
        config = {
          minValue: 5,
          maxValue: 120,
          initialValue: parseInt(workTime)
        };
        break;
      case 'rest':
        config = {
          minValue: 5,
          maxValue: 120,
          initialValue: parseInt(restTime)
        };
        break;
    }
    
    setPickerConfig(config);
    setPickerTarget(target);
    setPickerVisible(true);
  }, [rounds, workTime, restTime]);

  const handlePickerConfirm = useCallback((value: number) => {
    switch (pickerTarget) {
      case 'rounds':
        setRounds(value.toString());
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

  const startTimer = useCallback(() => {
    const roundsValue = parseInt(rounds);
    const workValue = parseInt(workTime);
    const restValue = parseInt(restTime);
    
    if (!roundsValue || !workValue || !restValue || 
        roundsValue <= 0 || workValue <= 0 || restValue <= 0) {
      Alert.alert('Attention', 'Veuillez remplir tous les champs avec des valeurs valides');
      return;
    }
    
    log('▶️ Démarrage du timer TABATA');
    stopAllSounds().catch(console.error);
    lastCountdownRef.current = 0;
    
    setIsRunning(true);
    setCurrentRound(1);
    setCurrentTime(workValue);
    setIsResting(false);
    setCountdown(DEFAULT_VALUES.COUNTDOWN);
    setIsPaused(false);
    modeRef.current = 'countdown';
    
    // Démarrer l'intervalle
    timerFunctionsRef.current.startInterval();
  }, [rounds, workTime, restTime]);

  const pauseTimer = useCallback(() => {
    if (countdown === 0) {
      if (!isPaused) {
        stopAllSounds().catch(console.error);
        timerFunctionsRef.current.stopAllTimers();
      } else {
        timerFunctionsRef.current.startInterval();
      }
      setIsPaused(!isPaused);
    }
  }, [countdown, isPaused]);

  // Fonction auxiliaire pour gérer les transitions de phase en arrière-plan
  const handlePhaseTransitionInBackground = useCallback((timeAfterPhase: number) => {
    log(`Gestion d'une transition de phase en arrière-plan, temps après phase: ${timeAfterPhase}s`);
    
    if (isResting) {
      // Transition repos → travail
      console.log('┌───────────────────────────────────────┐');
      console.log(`│ [TABATA] 🔄 TRANSITION AUTOMATIQUE     │`);
      console.log(`│ REPOS → TRAVAIL                       │`);
      console.log('└───────────────────────────────────────┘');
      
      // Fin d'une phase de repos, passage à la série suivante ou fin du programme
      if (currentRound >= parseInt(rounds)) {
        log('🏁 Entraînement terminé en arrière-plan (fin du dernier repos)');
        timerFunctionsRef.current.resetTimer();
        if (onComplete) onComplete();
        
        setTimeout(() => {
          Alert.alert('Terminé', 'Entraînement terminé !');
        }, 100);
        
        return true; // Indique que l'entraînement est terminé
      }
      
      // Passage à la série suivante (travail)
      setCurrentRound(r => r + 1);
      setIsResting(false);
      modeRef.current = 'work';
      
      // Calculer le temps restant dans la nouvelle phase de travail
      const newWorkTime = Math.max(1, parseInt(workTime) - timeAfterPhase);
      log(`Nouveau temps de travail (round ${currentRound + 1}): ${newWorkTime}s`);
      setCurrentTime(newWorkTime);
      
      // Si ce temps de travail est déjà écoulé, gérer une nouvelle transition
      if (newWorkTime <= 1) {
        return handlePhaseTransitionInBackground(Math.abs(timeAfterPhase - parseInt(workTime)));
      }
      
      return false; // L'entraînement continue
    } else {
      // Transition travail → repos
      console.log('┌───────────────────────────────────────┐');
      console.log(`│ [TABATA] 🔄 TRANSITION AUTOMATIQUE     │`);
      console.log(`│ TRAVAIL → REPOS                       │`);
      console.log('└───────────────────────────────────────┘');
      
      setIsResting(true);
      modeRef.current = 'rest';
      
      // Calculer le temps restant dans la nouvelle phase de repos
      const newRestTime = Math.max(1, parseInt(restTime) - timeAfterPhase);
      log(`Nouveau temps de repos: ${newRestTime}s`);
      setCurrentTime(newRestTime);
      
      // Si ce temps de repos est déjà écoulé, gérer une nouvelle transition
      if (newRestTime <= 1) {
        return handlePhaseTransitionInBackground(Math.abs(timeAfterPhase - parseInt(restTime)));
      }
      
      return false; // L'entraînement continue
    }
  }, [isResting, workTime, restTime, rounds, currentRound, onComplete, resetTimer]);

  // Gestion du temps passé en arrière-plan
  const handleAppForeground = useCallback((timeInBackground: number) => {
    if (!isRunning || !isComponentMountedRef.current) return;
    
    // Logs d'entrée clairs et visibles
    console.log('┌─────────────────────────────────────────────────┐');
    console.log(`│ [TABATA] 🔄 RETOUR AU PREMIER PLAN               │`);
    console.log(`│ Temps passé en arrière-plan: ${(timeInBackground/1000).toFixed(1)}s │`);
    console.log('└─────────────────────────────────────────────────┘');
    log(`État avant ajustement: mode=${modeRef.current}, round=${currentRound}/${rounds}, isResting=${isResting}, time=${currentTime}, isPaused=${isPaused}`);
    
    if (isPaused) {
      log('⏸️ Timer en pause, pas de mise à jour nécessaire');
      return;
    }
    
    const secondsInBackground = Math.floor(timeInBackground / 1000);
    log(`Ajustement pour ${secondsInBackground} secondes écoulées en arrière-plan`);
    
    // Stopper l'intervalle actuel pendant les ajustements
    timerFunctionsRef.current.stopAllTimers();
    
    // Gérer différemment selon le mode
    if (countdown > 0) {
      // Si on est en décompte initial
      log(`Mode DÉCOMPTE: ${countdown}s restantes`);
      
      const newCountdown = Math.max(0, countdown - secondsInBackground);
      log(`Décompte ajusté: ${countdown} → ${newCountdown}`);
      
      if (newCountdown <= 0) {
        // Le décompte est terminé pendant l'arrière-plan
        console.log('┌─────────────────────────────────────┐');
        console.log(`│ [TABATA] 🔄 TRANSITION AUTOMATIQUE   │`);
        console.log(`│ DÉCOMPTE → TRAVAIL                  │`);
        console.log('└─────────────────────────────────────┘');
        
        // Mise à jour des états
        setCountdown(0);
        modeRef.current = 'work';
        
        // Calculer combien de temps s'est écoulé après le décompte
        const timeAfterCountdown = secondsInBackground - countdown;
        log(`Temps écoulé après le décompte: ${timeAfterCountdown}s`);
        
        // Vérifier si la première phase de travail est terminée
        if (timeAfterCountdown >= parseInt(workTime)) {
          // La première phase de travail est terminée, gérer les transitions suivantes
          const isFinished = handlePhaseTransitionInBackground(timeAfterCountdown - parseInt(workTime));
          if (isFinished) return; // Si l'entraînement est terminé
        } else {
          // Ajuster le temps de travail restant
          const adjustedWorkTime = parseInt(workTime) - timeAfterCountdown;
          log(`Premier travail ajusté: ${adjustedWorkTime}s restantes`);
          setCurrentTime(Math.max(1, adjustedWorkTime)); // Au moins 1 seconde
        }
      } else {
        // Le décompte n'est pas terminé
        setCountdown(newCountdown);
      }
    } else {
      // En phase de travail ou de repos
      const currentPhaseTime = isResting ? parseInt(restTime) : parseInt(workTime);
      
      // Si le temps écoulé en arrière-plan est inférieur au temps restant actuel
      if (secondsInBackground < currentTime) {
        // Simplement ajuster le temps restant dans la phase actuelle
        const newTime = currentTime - secondsInBackground;
        log(`Ajustement simple: ${currentTime}s → ${newTime}s`);
        setCurrentTime(Math.max(1, newTime)); // Au moins 1 seconde
      } else {
        // La phase actuelle est terminée, gérer les transitions suivantes
        const timeAfterPhase = secondsInBackground - currentTime;
        const isFinished = handlePhaseTransitionInBackground(timeAfterPhase);
        if (isFinished) return; // Si l'entraînement est terminé
      }
    }
    
    // Redémarrer l'intervalle après les ajustements
    setTimeout(() => {
      timerFunctionsRef.current.startInterval();
      
      // Log de sortie pour indiquer l'état final
      log(`État après ajustement: mode=${modeRef.current}, round=${currentRound}/${rounds}, isResting=${isResting}, time=${currentTime}`);
      log('▶️ Intervalle redémarré');
    }, 100);
    
  }, [isRunning, isPaused, countdown, currentRound, rounds, currentTime, isResting, workTime, restTime, handlePhaseTransitionInBackground]);

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
        timerFunctionsRef.current.stopAllTimers();
        stopAllSounds().catch(console.error);
      };
    }, [])
  );

  // Pour remplacer le useEffect original
  useEffect(() => {
    // Ce useEffect se déclenche uniquement pour les transitions de timer actif
    if (isRunning && !isPaused) {
      if (countdown <= 3 && countdown > 0 && countdown !== lastCountdownRef.current) {
        playCountdownSound(countdown).catch(console.error);
        lastCountdownRef.current = countdown;
      }

      // Redémarrer l'intervalle quand l'état change
      timerFunctionsRef.current.startInterval();
    }

    // Nettoyage lorsque le composant se démonte ou que l'effet est invalidé
    return () => {
      timerFunctionsRef.current.stopAllTimers();
    };
  }, [isRunning, isPaused, countdown, currentTime, isResting, currentRound]);

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
                <Text style={styles.seriesText}>{currentRound}/{rounds}</Text>
                <Text style={styles.timeDisplay}>
                  {countdown > 0 ? countdown : formatTime(currentTime)}
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
  formatAsTime={pickerTarget === 'work' || pickerTarget === 'rest'}
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
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    gap: 20,
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
  inputWrapper: {
    alignItems: 'center',
    width: '100%',
  },
});

export default TABATA;