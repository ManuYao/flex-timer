// src/utils/sound.ts
import { Audio, AVPlaybackStatus } from 'expo-av';

// Fichiers sonores centralisés
const soundFiles = {
  fiveSecondsStart: require('../../assets/sound/mixkit-clock-countdown-bleeps-5sStart.wav'),
  fiveSecondsEnd: require('../../assets/sound/mixkit-tick-tock-clock-close-up-endexo-5s.wav'),
  midExercise: require('../../assets/sound/mixkit-censorship-beep-1082.wav'),
  countdown: require('../../assets/sound/mixkit-clock-countdown-bleeps-5sStart.wav') // Même fichier mais identifiant séparé
};

// Type pour les clés de son
type SoundKey = keyof typeof soundFiles;

// Registre des sons préchargés
const soundObjects: Record<SoundKey, Audio.Sound | null> = {
  fiveSecondsStart: null,
  fiveSecondsEnd: null,
  midExercise: null,
  countdown: null
};

// État du système audio
let initialized = false;
let activeSounds = new Map<string, {
  sound: Audio.Sound,
  timeout: NodeJS.Timeout | null
}>();

/**
 * Initialise le système audio et précharge les sons
 */
export const initializeAudio = async (): Promise<void> => {
  if (initialized) return;
  
  try {
    console.log('[Audio] Initialisation du système audio...');
    
    // Configuration du mode audio
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    
    // Préchargement de tous les sons en parallèle
    const loadPromises = Object.entries(soundFiles).map(async ([key, source]) => {
      try {
        const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: false });
        soundObjects[key as SoundKey] = sound;
        console.log(`[Audio] Son préchargé: ${key}`);
      } catch (err) {
        console.warn(`[Audio] Échec du préchargement: ${key}`, err);
      }
    });
    
    await Promise.all(loadPromises);
    initialized = true;
    console.log('[Audio] Initialisation terminée');
  } catch (error) {
    console.error('[Audio] Erreur d\'initialisation:', error);
  }
};

/**
 * Arrête un son spécifique s'il est en cours de lecture
 * @param soundKey - Identifiant du son à arrêter
 */
export const stopSound = async (soundKey: string): Promise<void> => {
  try {
    const activeSound = activeSounds.get(soundKey);
    if (activeSound) {
      console.log(`[Audio] Arrêt du son: ${soundKey}`);
      
      // Annule le timeout associé
      if (activeSound.timeout) {
        clearTimeout(activeSound.timeout);
      }
      
      // Arrête le son
      await activeSound.sound.stopAsync();
      await activeSound.sound.setPositionAsync(0);
      activeSounds.delete(soundKey);
    }
  } catch (error) {
    console.error(`[Audio] Erreur lors de l'arrêt du son ${soundKey}:`, error);
  }
};

/**
 * Joue un son spécifié par sa clé
 * @param soundKey - Identifiant du son à jouer
 * @param maxDuration - Durée maximale en ms après laquelle le son sera arrêté
 * @param allowParallel - Autoriser la lecture parallèle du même son
 */
export const playSound = async (soundKey: string, maxDuration: number = 1500, allowParallel: boolean = false): Promise<void> => {
  try {
    // Initialise si nécessaire
    if (!initialized) {
      await initializeAudio();
    }
    
    // Vérifie que la clé est valide
    if (!Object.keys(soundFiles).includes(soundKey)) {
      console.warn(`[Audio] Clé de son invalide: ${soundKey}`);
      return;
    }
    
    // Pour les sons comme fiveSecondsEnd, on permet la lecture parallèle
    // Pour les autres sons, on arrête s'ils sont déjà en cours
    if (!allowParallel) {
      await stopSound(soundKey);
    } else if (activeSounds.has(soundKey)) {
      // Si le son est déjà en cours et qu'on permet la lecture parallèle,
      // on crée un identifiant unique pour cette instance
      soundKey = `${soundKey}_${Date.now()}`;
    }
    
    console.log(`[Audio] Lecture: ${soundKey}`);
    
    // Récupère ou charge le son
    let soundToPlay = soundObjects[soundKey as SoundKey];
    if (!soundToPlay) {
      try {
        const source = soundFiles[soundKey as SoundKey];
        const { sound } = await Audio.Sound.createAsync(source);
        soundToPlay = sound;
        soundObjects[soundKey as SoundKey] = sound;
      } catch (err) {
        console.error(`[Audio] Erreur de chargement: ${soundKey}`, err);
        return;
      }
    }
    
    // Vérifie l'état et joue le son
    const status = await soundToPlay.getStatusAsync();
    if (status.isLoaded) {
      await soundToPlay.setPositionAsync(0);
      await soundToPlay.playAsync();
      
      // Configure un timeout pour arrêter le son après maxDuration
      const timeout = setTimeout(async () => {
        console.log(`[Audio] Arrêt automatique après délai: ${soundKey}`);
        await stopSound(soundKey);
      }, maxDuration);
      
      // Ajoute le son à la liste des sons actifs
      activeSounds.set(soundKey, {
        sound: soundToPlay,
        timeout: timeout
      });
      
      // Configure le nettoyage automatique après la lecture
      soundToPlay.setOnPlaybackStatusUpdate((playbackStatus: AVPlaybackStatus) => {
        if (playbackStatus.isLoaded && 
            'didJustFinish' in playbackStatus && 
            playbackStatus.didJustFinish) {
          
          const activeSound = activeSounds.get(soundKey);
          if (activeSound?.timeout) {
            clearTimeout(activeSound.timeout);
          }
          activeSounds.delete(soundKey);
          console.log(`[Audio] Son terminé naturellement: ${soundKey}`);
        }
      });
    } else {
      console.warn(`[Audio] Son non correctement chargé: ${soundKey}`);
    }
  } catch (error) {
    console.error(`[Audio] Erreur de lecture:`, error);
  }
};

/**
 * Arrête tous les sons en cours de lecture
 */
export const stopAllSounds = async (): Promise<void> => {
  try {
    console.log('[Audio] Arrêt de tous les sons...');
    
    // Copie des clés pour éviter les problèmes de modification pendant l'itération
    const soundKeys = Array.from(activeSounds.keys());
    
    // Arrête chaque son individuellement
    const stopPromises = soundKeys.map(key => stopSound(key));
    await Promise.all(stopPromises);
    
    console.log('[Audio] Tous les sons arrêtés');
  } catch (error) {
    console.error('[Audio] Erreur d\'arrêt général:', error);
  }
};

/**
 * Joue un son de décompte pour chaque seconde du décompte
 * @param second - Seconde actuelle du décompte
 */
export const playCountdownSound = async (second: number): Promise<void> => {
  try {
    // Identifiant unique pour chaque seconde
    const soundId = `countdown_${second}`;
    
    // Utilise le son de décompte mais avec un identifiant unique
    await playSound('countdown', 800, false);
  } catch (error) {
    console.error('[Audio] Erreur de lecture du décompte:', error);
  }
};

/**
 * Joue un son d'alerte (fin ou milieu) qui doit être complet
 * Garantit que le son sera joué entièrement sans être coupé
 * @param soundKey - Identifiant du son à jouer
 * @param allowOverlap - Autoriser la superposition avec d'autres sons
 */
export const playAlertSound = async (soundKey: 'fiveSecondsEnd' | 'midExercise', allowOverlap: boolean = true): Promise<void> => {
  try {
    // Durée plus longue pour ces sons importants
    const duration = soundKey === 'fiveSecondsEnd' ? 5000 : 2000;
    
    // Permettre la lecture parallèle pour garantir que le son sera joué entièrement
    await playSound(soundKey, duration, allowOverlap);
    
    console.log(`[Audio] Son d'alerte joué: ${soundKey} (lecture complète garantie)`);
  } catch (error) {
    console.error(`[Audio] Erreur de lecture du son d'alerte ${soundKey}:`, error);
  }
};

/**
 * Décharge temporairement les ressources sonores (à utiliser quand le composant se démonte)
 */
export const unloadSound = async (): Promise<void> => {
  try {
    await stopAllSounds();
  } catch (error) {
    console.error('[Audio] Erreur de déchargement:', error);
  }
};

/**
 * Nettoie complètement les ressources audio (à utiliser quand l'application se ferme)
 */
export const cleanupSounds = async (): Promise<void> => {
  try {
    console.log('[Audio] Nettoyage des ressources...');
    
    // Arrête d'abord tous les sons
    await stopAllSounds();
    
    // Décharge proprement chaque son
    const unloadPromises = Object.entries(soundObjects).map(async ([key, sound]) => {
      if (sound) {
        try {
          await sound.unloadAsync();
          soundObjects[key as SoundKey] = null;
        } catch (err) {
          console.warn(`[Audio] Erreur de déchargement: ${key}`, err);
        }
      }
    });
    
    await Promise.all(unloadPromises);
    initialized = false;
    activeSounds.clear();
    console.log('[Audio] Nettoyage terminé');
  } catch (error) {
    console.error('[Audio] Erreur de nettoyage:', error);
  }
};