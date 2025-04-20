// src/utils/backgroundTimer.ts
import { AppState, AppStateStatus } from 'react-native';

/**
 * Timer robuste qui fonctionne même en arrière-plan
 * - Gère correctement les transitions entre premier plan/arrière-plan
 * - Supporte les modes pause/reprise
 * - Calcule précisément le temps écoulé entre les transitions d'état
 */
export const createBackgroundAwareTimer = (callback: () => void, interval = 1000) => {
  // Variables d'état
  let timerId: NodeJS.Timeout | null = null;
  let startTimestamp = 0;              // Horodatage de démarrage initial
  let lastTickTimestamp = 0;           // Dernier tick exécuté
  let lastForegroundTimestamp = 0;     // Dernier retour au premier plan
  let backgroundEnterTimestamp = 0;    // Dernier passage en arrière-plan
  let isActive = false;                // Timer actif
  let isPaused = false;                // Timer en pause
  let pauseStartTimestamp = 0;         // Horodatage de début de pause
  let totalPausedTime = 0;             // Temps total en pause
  let currentMode = '';                // Mode actuel (pour le débogage)
  
  // Logger avec préfixe pour faciliter le débogage
  const log = (message: string, data?: any) => {
    console.log(`[BackgroundTimer] ${message}`, data !== undefined ? data : '');
  };
  
  log('Timer créé');
  
  // Gestionnaire des changements d'état de l'application
  const appStateListener = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
    log(`AppState changé à: ${nextAppState}, isActive: ${isActive}, isPaused: ${isPaused}, mode: ${currentMode}`);
    
    if (!isActive) return;
    
    const now = Date.now();
    
    if (nextAppState === 'active') {
      // L'application revient au premier plan
      if (backgroundEnterTimestamp > 0) {
        const timeInBackground = now - backgroundEnterTimestamp;
        log(`Retour au premier plan après ${timeInBackground}ms (${timeInBackground / 1000}s)`);
        
        // Recalculer le temps qui s'est écoulé en arrière-plan
        if (!isPaused) {
          // Si le timer était actif (non pausé), calculer combien de temps s'est écoulé
          const missedTicks = Math.floor(timeInBackground / interval);
          log(`Rattrapage de ${missedTicks} ticks manqués`);
          
          // Limiter le nombre de ticks à rattraper pour éviter de bloquer l'UI
          // et éviter que l'application ne semble "gelée"
          const maxTicksToExecute = Math.min(missedTicks, 60);
          
          for (let i = 0; i < maxTicksToExecute; i++) {
            callback();
          }
          
          // Mettre à jour les horodatages
          lastTickTimestamp = now;
        }
        
        // Réinitialiser le timestamp d'entrée en arrière-plan
        backgroundEnterTimestamp = 0;
        lastForegroundTimestamp = now;
      }
      
      // Redémarrer l'intervalle si le timer n'est pas pausé
      if (!isPaused) {
        if (timerId) clearInterval(timerId);
        
        timerId = setInterval(() => {
          const currentTime = Date.now();
          lastTickTimestamp = currentTime;
          callback();
        }, interval);
        
        log('Intervalle redémarré au premier plan');
      }
    } else if (nextAppState === 'background') {
      // L'application passe en arrière-plan
      backgroundEnterTimestamp = now;
      log(`Passage en arrière-plan à ${new Date(backgroundEnterTimestamp).toISOString()}`);
      
      // Arrêter l'intervalle quand l'app est en arrière-plan pour économiser la batterie
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
        log('Intervalle arrêté en arrière-plan');
      }
    }
  });
  
  // Démarrer le timer
  const start = (mode = 'work') => {
    if (isActive) return;
    
    currentMode = mode;
    log(`Démarrage du timer en mode "${mode}"`);
    
    const now = Date.now();
    startTimestamp = now;
    lastTickTimestamp = now;
    lastForegroundTimestamp = now;
    backgroundEnterTimestamp = 0;
    totalPausedTime = 0;
    isActive = true;
    isPaused = false;
    
    // Nettoyer tout timer existant
    if (timerId) clearInterval(timerId);
    
    // Créer un nouveau timer
    timerId = setInterval(() => {
      const currentTime = Date.now();
      lastTickTimestamp = currentTime;
      callback();
    }, interval);
    
    log('Timer démarré avec intervalle');
  };
  
  // Arrêter le timer
  const stop = () => {
    if (!isActive) return;
    
    log('Arrêt du timer');
    
    isActive = false;
    isPaused = false;
    currentMode = '';
    
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  };
  
  // Mettre en pause le timer
  const pauseTimer = (mode = 'pause') => {
    if (!isActive || isPaused) return;
    
    currentMode = mode;
    log(`Mise en pause du timer en mode "${mode}"`);
    
    isPaused = true;
    pauseStartTimestamp = Date.now();
    
    // Stopper l'intervalle pendant la pause
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  };
  
  // Reprendre le timer
  const resumeTimer = (mode = 'work') => {
    if (!isActive || !isPaused) return;
    
    currentMode = mode;
    log(`Reprise du timer en mode "${mode}"`);
    
    const now = Date.now();
    totalPausedTime += (now - pauseStartTimestamp);
    lastTickTimestamp = now;
    isPaused = false;
    
    // Redémarrer l'intervalle
    if (timerId) clearInterval(timerId);
    
    timerId = setInterval(() => {
      const currentTime = Date.now();
      lastTickTimestamp = currentTime;
      callback();
    }, interval);
  };
  
  // Changer le mode sans affecter l'état de pause
  const changeMode = (mode: string) => {
    currentMode = mode;
    log(`Mode changé à "${mode}", pausé: ${isPaused}`);
  };
  
  // Fonction pour forcer la vérification du temps écoulé et rattraper si nécessaire
  const checkElapsedTime = () => {
    if (!isActive || isPaused) return 0;
    
    const now = Date.now();
    const elapsed = now - lastTickTimestamp;
    
    // Si plus d'un intervalle s'est écoulé, rattraper
    if (elapsed >= interval) {
      const missedTicks = Math.floor(elapsed / interval);
      log(`Rattrapage forcé: ${missedTicks} ticks`);
      
      for (let i = 0; i < Math.min(missedTicks, 60); i++) {
        callback();
      }
      
      lastTickTimestamp = now;
    }
    
    return elapsed;
  };
  
  // Obtenir l'état actuel du timer
  const getStatus = () => {
    return {
      isActive,
      isPaused,
      currentMode,
      elapsedSinceStart: Date.now() - startTimestamp - totalPausedTime,
      totalPausedTime
    };
  };
  
  // Nettoyer les ressources
  const cleanup = () => {
    log('Nettoyage des ressources');
    
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    
    appStateListener.remove();
    isActive = false;
    isPaused = false;
    currentMode = '';
  };
  
  // API publique
  return {
    start,
    stop,
    pauseTimer,
    resumeTimer,
    changeMode,
    isPaused: () => isPaused,
    isRunning: () => isActive && !isPaused,
    getMode: () => currentMode,
    checkElapsedTime,
    getStatus,
    cleanup
  };
};

// Pour compatibilité avec l'API existante
export const initBackgroundTimer = async () => true;
export const cleanupBackgroundTimer = async () => {};