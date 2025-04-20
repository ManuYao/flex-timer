// src/components/ForTime.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet, Alert, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES } from '../constants/theme';
import { stopAllSounds, playCountdownSound, playAlertSound } from '../utils/sound';
import NumberPicker from './common/NumberPicker';
import { TimerProps } from '../types';
import AppStateHandler from '../utils/AppStateHandler';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.75;

// Définition des valeurs par défaut
const DEFAULT_VALUES = {
  TOTAL_ROUNDS: "5",
  REST_TIME: "60",
  COUNTDOWN: 10
} as const;

// Type pour les modes du timer
type TimerMode = 'countdown' | 'work' | 'rest' | 'idle';

const ForTime = ({ onComplete }: TimerProps) => {
  // États de configuration
  const [totalRounds, setTotalRounds] = useState<string>(DEFAULT_VALUES.TOTAL_ROUNDS);
  const [restTime, setRestTime] = useState<string>(DEFAULT_VALUES.REST_TIME);
  
  // États du timer
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
  const isComponentMountedRef = useRef<boolean>(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const modeRef = useRef<TimerMode>('idle');
  const lastTickRef = useRef<number>(0);
  const backgroundStartRef = useRef<number>(0);
  
  // Logger
  const log = (msg: string, data?: any) => {
    console.log(`[ForTime] ${msg}`, data !== undefined ? data : '');
  };

  // Fonction pour formater le temps (MM:SS)
  const formatTime = useCallback((time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }, []);
  
  // Fonction pour arrêter tous les timers
  const stopAllTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  
  // Fonction simple pour démarrer un intervalle
  const startInterval = useCallback(() => {
    // D'abord nettoyer tout intervalle existant
    stopAllTimers();
    
    const now = Date.now();
    lastTickRef.current = now;
    
    // Créer un nouvel intervalle selon le mode actuel
    intervalRef.current = setInterval(() => {
      const currentMode = modeRef.current;
      
      if (currentMode === 'countdown') {
        setCountdown(prev => {
          const newValue = Math.max(0, prev - 1);
          
          // Sons pour les 3 dernières secondes
          if (newValue <= 3 && newValue > 0) {
            playCountdownSound(newValue).catch(console.error);
          }
          
          // Démarrer le timer principal quand le décompte atteint zéro
          if (newValue === 0 && prev > 0) {
            log('🔄 Décompte terminé, passage en mode travail');
            modeRef.current = 'work';
            playAlertSound('midExercise', true).catch(console.error);
          }
          
          return newValue;
        });
      } 
      else if (currentMode === 'work') {
        // Mode travail - INCRÉMENTER
        setCurrentTime(prev => {
          const newTime = prev + 1;
          
          // Son d'alerte toutes les minutes
          if (prev > 0 && prev % 60 === 0) {
            playAlertSound('midExercise', true).catch(console.error);
          }
          
          return newTime;
        });
      } 
      else if (currentMode === 'rest') {
        // Mode repos - DÉCRÉMENTER
        setCurrentTime(prev => {
          const newTime = Math.max(0, prev - 1);
          
          // Sons d'alertes à des moments clés
          if (prev === 5) {
            playAlertSound('fiveSecondsEnd', true).catch(console.error);
          }
          
          const midPoint = Math.floor(parseInt(restTime) / 2);
          if (prev === midPoint && midPoint > 5) {
            playAlertSound('midExercise', true).catch(console.error);
          }
          
          // Si on atteint zéro, passer à la phase suivante
          if (newTime === 0 && prev > 0) {
            log('⏱️ Temps de repos terminé');
            
            if (currentRound >= parseInt(totalRounds)) {
              // Si c'était la dernière série
              log('🏁 Dernière série terminée');
              if (isComponentMountedRef.current) {
                setTimeout(() => {
                  resetTimer();
                  if (onComplete) onComplete();
                  Alert.alert('Terminé', 'Entraînement terminé !');
                }, 100);
              }
            } else {
              // Passer à la série suivante
              log(`🔄 Passage à la série suivante: ${currentRound} → ${currentRound + 1}`);
              setIsResting(false);
              setCurrentTime(0);
              setCurrentRound(r => r + 1);
              modeRef.current = 'work';
            }
          }
          
          return newTime;
        });
      }
      
      lastTickRef.current = Date.now();
    }, 1000);
  }, [restTime, totalRounds, currentRound, stopAllTimers]);
  
  // Réinitialisation du timer
  const resetTimer = useCallback(() => {
    log('🔄 Réinitialisation du timer');
    
    // Arrêter l'intervalle
    stopAllTimers();
    
    // Arrêter tous les sons
    stopAllSounds().catch(console.error);
    
    // Réinitialiser les états
    setIsRunning(false);
    setIsPaused(false);
    setCurrentRound(1);
    setCurrentTime(0);
    setCountdown(DEFAULT_VALUES.COUNTDOWN);
    setIsResting(false);
    modeRef.current = 'idle';
  }, [stopAllTimers]);
  
  // Gestion du temps passé en arrière-plan avec transitions automatiques
  const handleAppForeground = useCallback((timeInBackground: number) => {
    if (!isRunning || !isComponentMountedRef.current) return;
    
    // Logs d'entrée clairs et visibles
    console.log('┌─────────────────────────────────────────────────┐');
    console.log(`│ [ForTime] 🔄 RETOUR AU PREMIER PLAN              │`);
    console.log(`│ Temps passé en arrière-plan: ${(timeInBackground/1000).toFixed(1)}s │`);
    console.log('└─────────────────────────────────────────────────┘');
    console.log(`[ForTime] État avant ajustement: mode=${modeRef.current}, round=${currentRound}/${totalRounds}, time=${currentTime}s, isResting=${isResting}, isPaused=${isPaused}`);
    
    if (isPaused) {
      console.log('[ForTime] ⏸️ Timer en pause, pas de mise à jour nécessaire');
      return;
    }
    
    const secondsInBackground = Math.floor(timeInBackground / 1000);
    console.log(`[ForTime] Ajustement pour ${secondsInBackground} secondes écoulées en arrière-plan`);
    
    // Stopper l'intervalle actuel pendant les ajustements
    stopAllTimers();
    
    // Gérer différemment selon le mode
    if (countdown > 0) {
      // Si on est en décompte initial
      console.log(`[ForTime] Mode DÉCOMPTE: ${countdown}s restantes`);
      
      let newCountdown = countdown - secondsInBackground;
      console.log(`[ForTime] Décompte ajusté: ${countdown} → ${Math.max(0, newCountdown)}`);
      
      if (newCountdown <= 0) {
        // Le décompte est terminé pendant l'arrière-plan
        console.log('┌─────────────────────────────────────┐');
        console.log(`│ [ForTime] 🔄 TRANSITION AUTOMATIQUE  │`);
        console.log(`│ DÉCOMPTE → TRAVAIL                  │`);
        console.log('└─────────────────────────────────────┘');
        
        // Calcul du temps de travail écoulé après la fin du décompte
        const workTimeElapsed = Math.abs(newCountdown);
        console.log(`[ForTime] Temps de travail déjà écoulé: ${workTimeElapsed}s`);
        
        // Mise à jour des états
        setCountdown(0);
        setCurrentTime(workTimeElapsed);
        modeRef.current = 'work';
        
        // Jouer le son de transition
        playAlertSound('midExercise', true).catch(console.error);
      } else {
        setCountdown(newCountdown);
      }
    } else if (isResting) {
      // Si on est en phase de repos (DÉCRÉMENTATION)
      console.log(`[ForTime] Mode REPOS: ${currentTime}s restantes`);
      
      let newRestTime = currentTime - secondsInBackground;
      console.log(`[ForTime] Temps de repos ajusté: ${currentTime} → ${Math.max(0, newRestTime)}`);
      
      if (newRestTime <= 0) {
        // Phase de repos terminée en arrière-plan
        console.log('┌─────────────────────────────────────┐');
        console.log(`│ [ForTime] 🔄 TRANSITION AUTOMATIQUE  │`);
        console.log(`│ REPOS → ${currentRound >= parseInt(totalRounds) ? 'FIN' : 'TRAVAIL'} │`);
        console.log('└─────────────────────────────────────┘');
        
        if (currentRound >= parseInt(totalRounds)) {
          // Entraînement terminé
          console.log('[ForTime] 🏁 Entraînement terminé en arrière-plan');
          resetTimer();
          if (onComplete) onComplete();
          
          // Afficher l'alerte avec un léger délai pour que l'interface ait le temps de se mettre à jour
          setTimeout(() => {
            Alert.alert('Terminé', 'Entraînement terminé !');
          }, 100);
          
          return; // Sortir de la fonction car le timer est réinitialisé
        } else {
          // Passer à la série suivante
          const workTimeElapsed = Math.abs(newRestTime);
          console.log(`[ForTime] Passage à la série suivante: ${currentRound} → ${currentRound + 1}`);
          console.log(`[ForTime] Temps de travail déjà écoulé dans la nouvelle série: ${workTimeElapsed}s`);
          
          // Mise à jour des états
          setIsResting(false);
          setCurrentTime(workTimeElapsed);
          setCurrentRound(prev => prev + 1);
          modeRef.current = 'work';
          
          // Jouer le son de transition
          playAlertSound('midExercise', true).catch(console.error);
        }
      } else {
        setCurrentTime(newRestTime);
      }
    } else {
      // Si on est en phase de travail (INCRÉMENTATION)
      console.log(`[ForTime] Mode TRAVAIL: ${currentTime}s écoulées`);
      
      let newWorkTime = currentTime + secondsInBackground;
      console.log(`[ForTime] Temps de travail ajusté: ${currentTime} → ${newWorkTime}`);
      setCurrentTime(newWorkTime);
    }
    
    // Redémarrer l'intervalle après les ajustements
    setTimeout(() => {
      startInterval();
      
      // Log de sortie pour indiquer l'état final
      console.log(`[ForTime] État après ajustement: mode=${modeRef.current}, round=${currentRound}/${totalRounds}, time=${currentTime}s, isResting=${isResting}`);
      console.log('[ForTime] ▶️ Intervalle redémarré');
    }, 100);
    
  }, [isRunning, isPaused, countdown, isResting, currentTime, currentRound, totalRounds, resetTimer, onComplete, startInterval, stopAllTimers]);
  
  // Démarrer l'entrainement
  const startTimer = useCallback(() => {
    const roundsValue = parseInt(totalRounds);
    const restValue = parseInt(restTime);
    
    if (!roundsValue || !restValue || roundsValue <= 0 || restValue <= 0) {
      Alert.alert('Attention', 'Veuillez entrer des valeurs valides pour les séries et le temps de repos');
      return;
    }
    
    log(`▶️ Démarrage de l'entrainement: ${roundsValue} séries, ${restValue}s de repos`);
    
    // Arrêter tous les sons
    stopAllSounds().catch(console.error);
    
    // Initialiser les états
    setIsRunning(true);
    setCurrentRound(1);
    setCurrentTime(0);
    setCountdown(DEFAULT_VALUES.COUNTDOWN);
    setIsPaused(false);
    setIsResting(false);
    
    // Définir le mode initial
    modeRef.current = 'countdown';
    
    // Démarrer l'intervalle
    startInterval();
    
  }, [totalRounds, restTime, startInterval]);
  
  // Pause/reprise du timer
  const pauseTimer = useCallback(() => {
    if (!isRunning || countdown > 0) return;
    
    if (!isPaused) {
      log('⏸️ Mise en pause');
      
      // Arrêter les sons
      stopAllSounds().catch(console.error);
      
      // Arrêter l'intervalle
      stopAllTimers();
      
      setIsPaused(true);
    } else {
      log('▶️ Reprise après pause');
      
      // Redémarrer l'intervalle
      startInterval();
      
      setIsPaused(false);
    }
  }, [isRunning, countdown, isPaused, stopAllTimers, startInterval]);
  
  // Passage manuel à la phase suivante
  const handleNextPhase = useCallback(() => {
    if (!isRunning || countdown > 0) return;
    
    log('🔄 Changement manuel de phase');
    stopAllSounds().catch(console.error);
    
    if (!isResting) {
      // Passage du travail au repos
      if (currentRound >= parseInt(totalRounds)) {
        // Si c'était la dernière série
        log('🏁 Entraînement terminé manuellement');
        resetTimer();
        if (onComplete) onComplete();
        Alert.alert('Terminé', 'Entraînement terminé !');
        return;
      }
      
      // Passer en phase de repos
      log('🔄 Passage manuel en phase de repos');
      const restTimeValue = parseInt(restTime);
      
      setIsResting(true);
      setCurrentTime(restTimeValue);
      modeRef.current = 'rest';
      
      // Redémarrer l'intervalle si pas en pause
      if (!isPaused) {
        startInterval();
      }
    } else {
      // Passage du repos au travail
      log('🔄 Passage manuel en phase de travail');
      
      setIsResting(false);
      setCurrentTime(0);
      setCurrentRound(prev => prev + 1);
      modeRef.current = 'work';
      
      // Redémarrer l'intervalle si pas en pause
      if (!isPaused) {
        startInterval();
      }
    }
  }, [isRunning, countdown, isResting, currentRound, totalRounds, restTime, resetTimer, onComplete, isPaused, startInterval]);
  
  // Fonction pour ouvrir le sélecteur de nombre
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
  
  // Gestionnaire de confirmation du sélecteur de nombre
  const handlePickerConfirm = useCallback((value: number) => {
    if (pickerTarget === 'rounds') {
      setTotalRounds(value.toString());
    } else if (pickerTarget === 'rest') {
      setRestTime(value.toString());
    }
    setPickerVisible(false);
  }, [pickerTarget]);
  
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
        
        // Nettoyer les timers
        stopAllTimers();
        
        stopAllSounds().catch(console.error);
      };
    }, [stopAllTimers])
  );
  
  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      {/* Gestionnaire d'état d'application pour le background */}
      <AppStateHandler 
        onForeground={handleAppForeground}
        enabled={isRunning} 
      />
      
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