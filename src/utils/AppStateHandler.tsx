// src/utils/AppStateHandler.tsx
import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

// Interface pour les props du composant
interface AppStateHandlerProps {
  // Callback quand l'app revient au premier plan
  onForeground: (timeInBackground: number) => void;
  // Pour activer/désactiver le handler
  enabled: boolean;
}

/**
 * Composant qui gère les changements d'état de l'application
 * et permet d'exécuter un callback quand l'app revient au premier plan
 */
const AppStateHandler: React.FC<AppStateHandlerProps> = ({ onForeground, enabled }) => {
  // Référence pour stocker le timestamp quand l'app passe en arrière-plan
  const backgroundTimeRef = useRef<number>(0);
  
  // Fonction qui gère les changements d'état de l'application
  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    console.log(`[AppStateHandler] État de l'app: ${nextAppState}, enabled: ${enabled}`);
    
    if (!enabled) return;
    
    const now = Date.now();
    
    if (nextAppState === 'active' && backgroundTimeRef.current > 0) {
      // L'app revient au premier plan
      // Calculer le temps passé en arrière-plan
      const timeInBackground = now - backgroundTimeRef.current;
      console.log(`[AppStateHandler] Temps en arrière-plan: ${timeInBackground}ms = ${timeInBackground / 1000}s`);
      
      // Réinitialiser le timestamp
      backgroundTimeRef.current = 0;
      
      // Appeler le callback avec le temps passé en arrière-plan
      onForeground(timeInBackground);
    } else if (nextAppState === 'background') {
      // L'app passe en arrière-plan
      console.log('[AppStateHandler] Application en arrière-plan');
      backgroundTimeRef.current = now;
    }
  };
  
  // Effet pour gérer les changements d'état de l'application
  useEffect(() => {
    // Enregistrer le listener
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Nettoyer le listener
    return () => {
      subscription.remove();
    };
  }, [enabled, onForeground]);
  
  // Ce composant ne rend rien
  return null;
};

export default AppStateHandler;