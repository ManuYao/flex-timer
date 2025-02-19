import React, { useState, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Alert,
  Dimensions 
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AMRAP from './AMRAP';
import EMOM from './EMOM';
import TABATA from './TABATA';
import ForTime from './ForTime';
import { COLORS, SIZES } from '../constants/theme';
import { unloadSound } from '../utils/sound';

const { width } = Dimensions.get('window');

type TimerType = 'AMRAP' | 'EMOM' | 'TABATA' | 'FOR TIME';

interface TimerSequenceItem {
  id: string;
  type: TimerType;
  completed: boolean;
}

const TimerComponents = {
  'AMRAP': AMRAP,
  'EMOM': EMOM,
  'TABATA': TABATA,
  'FOR TIME': ForTime,
} as const;

const MIX: React.FC = () => {
  const [sequence, setSequence] = useState<TimerSequenceItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isConfiguring, setIsConfiguring] = useState<boolean>(true);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  
  const currentTimerRef = useRef<number>(currentIndex);
  currentTimerRef.current = currentIndex;

  useFocusEffect(
    useCallback(() => {
      return () => {
        setIsRunning(false);
        setCurrentIndex(0);
        unloadSound().catch(console.error);
      };
    }, [])
  );

  const addTimer = useCallback((type: TimerType) => {
    setSequence(prev => [
      ...prev, 
      { 
        type, 
        id: `${type}-${Date.now()}`,
        completed: false 
      }
    ]);
  }, []);

  const removeTimer = useCallback((index: number) => {
    setSequence(prev => prev.filter((_, idx) => idx !== index));
  }, []);

  const moveTimer = useCallback((fromIndex: number, toIndex: number) => {
    setSequence(prev => {
      const newSequence = [...prev];
      const [movedItem] = newSequence.splice(fromIndex, 1);
      newSequence.splice(toIndex, 0, movedItem);
      return newSequence;
    });
  }, []);

  const startSequence = useCallback(() => {
    if (sequence.length === 0) {
      Alert.alert('Error', 'Please add at least one timer to the sequence');
      return;
    }
    
    setIsConfiguring(false);
    setIsRunning(true);
    setCurrentIndex(0);
    setSequence(prev => prev.map(timer => ({ ...timer, completed: false })));
  }, [sequence]);

  const resetSequence = useCallback(() => {
    setSequence([]);
    setCurrentIndex(0);
    setIsConfiguring(true);
    setIsRunning(false);
  }, []);

  const handleTimerComplete = useCallback(() => {
    setSequence(prev => {
      const newSequence = [...prev];
      if (newSequence[currentTimerRef.current]) {
        newSequence[currentTimerRef.current].completed = true;
      }
      return newSequence;
    });

    if (currentTimerRef.current < sequence.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      Alert.alert('Complete', 'Workout sequence finished!');
      resetSequence();
    }
  }, [sequence.length, resetSequence]);

  const renderTimerButtons = () => (
    <View style={styles.buttonContainer}>
      {(Object.keys(TimerComponents) as TimerType[]).map((type) => (
        <TouchableOpacity
          key={type}
          style={styles.addButton}
          onPress={() => addTimer(type)}
        >
          <Text style={styles.buttonText}>+ {type}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderSequenceList = () => (
    <ScrollView style={styles.sequenceContainer}>
      {sequence.map((timer, index) => (
        <View key={timer.id} style={styles.timerItem}>
          <Text style={styles.timerText}>
            {index + 1}. {timer.type}
          </Text>
          <View style={styles.timerControls}>
            {index > 0 && (
              <TouchableOpacity
                style={styles.moveButton}
                onPress={() => moveTimer(index, index - 1)}
              >
                <Text style={styles.moveButtonText}>↑</Text>
              </TouchableOpacity>
            )}
            {index < sequence.length - 1 && (
              <TouchableOpacity
                style={styles.moveButton}
                onPress={() => moveTimer(index, index + 1)}
              >
                <Text style={styles.moveButtonText}>↓</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeTimer(index)}
            >
              <Text style={styles.removeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );

  if (isConfiguring) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Create Your Mix</Text>
        {renderTimerButtons()}
        {renderSequenceList()}
        {sequence.length > 0 && (
          <TouchableOpacity
            style={styles.startButton}
            onPress={startSequence}
          >
            <Text style={styles.startButtonText}>START SEQUENCE</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const CurrentTimer = TimerComponents[sequence[currentIndex].type];
  
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.progressText}>
          Timer {currentIndex + 1} of {sequence.length}
        </Text>
        <Text style={styles.timerTypeText}>
          {sequence[currentIndex].type}
        </Text>
      </View>
      
      <CurrentTimer onComplete={handleTimerComplete} />
      
      <TouchableOpacity
        style={styles.resetButton}
        onPress={resetSequence}
      >
        <Text style={styles.resetButtonText}>RESET SEQUENCE</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SIZES.padding,
  },
  title: {
    fontSize: SIZES.fontSize.title,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SIZES.padding * 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: SIZES.padding * 2,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: SIZES.radius,
    minWidth: width * 0.4,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: COLORS.background,
    fontSize: SIZES.fontSize.body,
    fontWeight: '600',
    textAlign: 'center',
  },
  sequenceContainer: {
    flex: 1,
    marginBottom: SIZES.padding,
  },
  timerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  timerText: {
    color: COLORS.text,
    fontSize: SIZES.fontSize.body,
    flex: 1,
  },
  timerControls: {
    flexDirection: 'row',
    gap: 8,
  },
  moveButton: {
    backgroundColor: COLORS.primary + '40',
    padding: 8,
    borderRadius: SIZES.radius,
  },
  moveButtonText: {
    color: COLORS.text,
    fontSize: SIZES.fontSize.body,
  },
  removeButton: {
    backgroundColor: COLORS.error + '40',
    padding: 8,
    borderRadius: SIZES.radius,
  },
  removeButtonText: {
    color: COLORS.error,
    fontSize: SIZES.fontSize.body,
    fontWeight: 'bold',
  },
  startButton: {
    backgroundColor: COLORS.success,
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  startButtonText: {
    color: COLORS.background,
    fontSize: SIZES.fontSize.body,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
  resetButton: {
    backgroundColor: COLORS.error,
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    marginTop: SIZES.padding,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  resetButtonText: {
    color: COLORS.background,
    fontSize: SIZES.fontSize.body,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: SIZES.padding,
  },
  progressText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.fontSize.body,
    marginBottom: 4,
  },
  timerTypeText: {
    color: COLORS.primary,
    fontSize: SIZES.fontSize.subtitle,
    fontWeight: 'bold',
  },
});

export default MIX;