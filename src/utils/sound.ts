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
 * Configuration audio sans ducking - Configuration stricte
 * Cette approche force la désactivation du ducking
 */
const configureSoundOptions = async (): Promise<void> => {
  try {
    // Configuration du mode audio global avec tous les paramètres possibles pour désactiver le ducking
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: true, // Garantit que l'audio reste actif en arrière-plan
      shouldDuckAndroid: false,      // Désactive explicitement le ducking
    });
    
    console.log('[Audio] Mode audio configuré sans ducking');
  } catch (error) {
    console.error('[Audio] Erreur lors de la configuration audio:', error);
  }
};

/**
 * Initialise le système audio et précharge les sons
 */
export const initializeAudio = async (): Promise<void> => {
  if (initialized) return;
  
  try {
    console.log('[Audio] Initialisation du système audio...');
    
    // Configuration audio sans ducking
    await configureSoundOptions();
    
    // Préchargement de tous les sons en parallèle
    const loadPromises = Object.entries(soundFiles).map(async ([key, source]) => {
      try {
        // Créer le son avec des options pour prévenir le ducking
        const { sound } = await Audio.Sound.createAsync(source, { 
          shouldPlay: false,
          volume: 0.8,           // Volume légèrement inférieur au max pour éviter la distorsion
        });
        
        // Configurer les sons pour qu'ils jouent sans ducking
        await sound.setIsLoopingAsync(false);
        
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
export const playSound = async (
  soundKey: string, 
  maxDuration: number = 1500, 
  allowParallel: boolean = false
): Promise<void> => {
  try {
    // Initialise si nécessaire
    if (!initialized) {
      await initializeAudio();
    } else {
      // Reconfigurer les options audio avant chaque lecture pour s'assurer que le ducking est désactivé
      await configureSoundOptions();
    }
    
    // Vérifie que la clé est valide
    if (!Object.keys(soundFiles).includes(soundKey)) {
      console.warn(`[Audio] Clé de son invalide: ${soundKey}`);
      return;
    }
    
    // Pour les sons comme fiveSecondsEnd, on permet la lecture parallèle
    // Pour les autres sons, on arrête s'ils sont déjà en cours
    let finalSoundKey = soundKey;
    if (!allowParallel) {
      await stopSound(soundKey);
    } else if (activeSounds.has(soundKey)) {
      // Si le son est déjà en cours et qu'on permet la lecture parallèle,
      // on crée un identifiant unique pour cette instance
      finalSoundKey = `${soundKey}_${Date.now()}`;
    }
    
    console.log(`[Audio] Lecture: ${finalSoundKey}`);
    
    // Récupère ou charge le son
    let soundToPlay = soundObjects[soundKey as SoundKey];
    if (!soundToPlay) {
      try {
        const source = soundFiles[soundKey as SoundKey];
        const { sound } = await Audio.Sound.createAsync(source, {
          shouldPlay: false,
          volume: 0.8,
        });
        
        // Configurer le son pour qu'il joue sans ducking
        await sound.setIsLoopingAsync(false);
        
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
      
      // Réconfigurer les options du son avant la lecture
      await soundToPlay.setVolumeAsync(0.8);
      
      // Lecture effective du son
      await soundToPlay.playAsync();
      
      // Configure un timeout pour arrêter le son après maxDuration
      const timeout = setTimeout(async () => {
        console.log(`[Audio] Arrêt automatique après délai: ${finalSoundKey}`);
        await stopSound(finalSoundKey);
      }, maxDuration);
      
      // Ajoute le son à la liste des sons actifs
      activeSounds.set(finalSoundKey, {
        sound: soundToPlay,
        timeout: timeout
      });
      
      // Configure le nettoyage automatique après la lecture
      soundToPlay.setOnPlaybackStatusUpdate((playbackStatus: AVPlaybackStatus) => {
        if (playbackStatus.isLoaded && 
            'didJustFinish' in playbackStatus && 
            playbackStatus.didJustFinish) {
          
          const activeSound = activeSounds.get(finalSoundKey);
          if (activeSound?.timeout) {
            clearTimeout(activeSound.timeout);
          }
          
          activeSounds.delete(finalSoundKey);
          console.log(`[Audio] Son terminé naturellement: ${finalSoundKey}`);
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
    // Reconfigurer l'audio avant ce son important
    await configureSoundOptions();
    
    // Utilise le son de décompte
    await playSound('countdown', 800, false);
  } catch (error) {
    console.error('[Audio] Erreur de lecture du décompte:', error);
  }
};

/**
 * Joue un son d'alerte (fin ou milieu) avec une configuration explicite pour éviter le ducking
 * @param soundKey - Identifiant du son à jouer
 * @param allowOverlap - Autoriser la superposition avec d'autres sons
 */
export const playAlertSound = async (soundKey: 'fiveSecondsEnd' | 'midExercise', allowOverlap: boolean = true): Promise<void> => {
  try {
    // Configuration explicite du mode audio - TRÈS IMPORTANT: doit être fait avant chaque alerte
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: true, // Garantit que l'audio reste actif en arrière-plan
      shouldDuckAndroid: false,      // Désactive le ducking de façon explicite
    });
    
    console.log(`[Audio] Mode audio explicitement reconfiguré pour son: ${soundKey}`);
    
    // Durée plus longue pour ces sons importants
    const duration = soundKey === 'fiveSecondsEnd' ? 5000 : 2000;
    
    // Création d'un nouvel objet son à chaque fois pour éviter les problèmes
    const soundSource = soundFiles[soundKey];
    const { sound } = await Audio.Sound.createAsync(soundSource, {
      shouldPlay: true,
      volume: 0.9, // Volume légèrement plus bas pour éviter la distorsion
    });
    
    // Jouer le son immédiatement
    await sound.playAsync();
    
    // Configuration du timeout pour décharger le son
    setTimeout(async () => {
      await sound.stopAsync();
      await sound.unloadAsync();
      console.log(`[Audio] Son d'alerte terminé et déchargé: ${soundKey}`);
    }, duration + 100);
    
    console.log(`[Audio] Son d'alerte joué avec configuration spéciale: ${soundKey}`);
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