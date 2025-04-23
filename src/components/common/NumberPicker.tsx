// src/components/common/NumberPicker.tsx
import React, { useState, useRef, useEffect, memo } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Modal,
  ScrollView,
  Dimensions
} from 'react-native';
import { COLORS, SIZES } from '../../constants/theme';

const { width } = Dimensions.get('window');
const ITEM_HEIGHT = 80;

interface NumberPickerProps {
  minValue?: number;
  maxValue?: number;
  initialValue?: number;
  onConfirm: (value: number) => void;
  visible: boolean;
  formatAsTime?: boolean;
  unit?: string;
  stepValue?: number; // Nouvelle propriété pour incrément personnalisé
  onCancel?: () => void; // Optionnel, pour gérer l'annulation
}

const NumberPicker = memo(({ 
  minValue = 1, 
  maxValue = 99, 
  initialValue = 5,
  onConfirm,
  visible = false,
  formatAsTime = false,
  unit = "SEC",
  stepValue,
  onCancel
}: NumberPickerProps) => {
  const [selectedValue, setSelectedValue] = useState(initialValue);
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Générer les valeurs avec soit un incrément fixe (stepValue) soit des incréments variables
  const generateValues = React.useMemo(() => {
    const values = [];
    
    // Si stepValue est défini, on utilise cet incrément spécifique
    if (stepValue) {
      for (let i = minValue; i <= maxValue; i += stepValue) {
        values.push(i);
      }
      return values;
    }
    
    // Sinon on garde la logique actuelle
    // Moins d'une minute: incrément de 5s
    for (let i = Math.max(5, minValue); i <= Math.min(60, maxValue); i += 5) {
      values.push(i);
    }
    
    // 1-2 minutes: incrément de 10s
    for (let i = Math.max(60, minValue); i <= Math.min(120, maxValue); i += 10) {
      if (!values.includes(i)) values.push(i);
    }
    
    // 2-5 minutes: incrément de 15s
    for (let i = Math.max(120, minValue); i <= Math.min(300, maxValue); i += 15) {
      if (!values.includes(i)) values.push(i);
    }
    
    // 5-10 minutes: incrément de 30s
    for (let i = Math.max(300, minValue); i <= Math.min(600, maxValue); i += 30) {
      if (!values.includes(i)) values.push(i);
    }
    
    // Plus de 10 minutes: incrément de 60s
    for (let i = Math.max(600, minValue); i <= maxValue; i += 60) {
      if (!values.includes(i)) values.push(i);
    }
    
    // Assurer que minValue et maxValue sont inclus
    if (minValue < values[0]) {
      values.unshift(minValue);
    }
    
    if (maxValue > values[values.length - 1]) {
      values.push(maxValue);
    }
    
    return values.sort((a, b) => a - b);
  }, [minValue, maxValue, stepValue]);
  
  const findClosestValueIndex = React.useCallback((value: number) => {
    if (generateValues.includes(value)) {
      return generateValues.indexOf(value);
    }
    
    let closestValue = generateValues[0];
    let closestDiff = Math.abs(value - closestValue);
    let closestIndex = 0;
    
    for (let i = 1; i < generateValues.length; i++) {
      const diff = Math.abs(value - generateValues[i]);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestValue = generateValues[i];
        closestIndex = i;
      }
    }
    
    return closestIndex;
  }, [generateValues]);
  
  useEffect(() => {
    if (visible) {
      setSelectedValue(initialValue);
      
      setTimeout(() => {
        if (scrollViewRef.current) {
          const index = findClosestValueIndex(initialValue);
          scrollViewRef.current.scrollTo({
            y: index * ITEM_HEIGHT,
            animated: false
          });
        }
      }, 50);
    }
  }, [visible, initialValue, findClosestValueIndex]);
  
  const handleScroll = (event: { nativeEvent: { contentOffset: { y: number; }; }; }) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    
    if (index >= 0 && index < generateValues.length) {
      const newValue = generateValues[index];
      setSelectedValue(newValue);
    }
  };
  
  const handleConfirm = () => {
    onConfirm(selectedValue);
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
  };
  
  // Formater le temps en MM:SS dès qu'on dépasse 60 secondes
  const formatTimeValue = (value: number): string => {
    if (formatAsTime && value >= 60) {
      const minutes = Math.floor(value / 60);
      const seconds = value % 60;
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
    return String(value);
  };

  // Fonction pour déterminer dynamiquement l'unité à afficher
  const getDisplayUnit = (value: number): string => {
    if (formatAsTime && value >= 60) {
      return "MIN";
    }
    return unit;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.modalContainer}>
        <View style={styles.pickerContainer}>
          <View style={styles.pickerContent}>
            <View style={styles.selectionHighlightContainer}>
              <View style={styles.selectionHighlight} />
            </View>
            
            <ScrollView
              ref={scrollViewRef}
              showsVerticalScrollIndicator={false}
              snapToInterval={ITEM_HEIGHT}
              decelerationRate="fast"
              onMomentumScrollEnd={handleScroll}
              contentContainerStyle={styles.scrollContent}
              scrollEventThrottle={16}
            >
              <View style={{height: ITEM_HEIGHT * 2}} />
              
              {generateValues.map((num) => (
                <View key={num} style={styles.numberItem}>
                  <Text style={[
                    styles.numberText,
                    selectedValue === num && styles.selectedNumberText
                  ]}>
                    {formatTimeValue(num)}
                  </Text>
                  {selectedValue === num && (
                    <Text style={styles.unitText}>
                      {getDisplayUnit(num)}
                    </Text>
                  )}
                </View>
              ))}
              
              <View style={{height: ITEM_HEIGHT * 2}} />
            </ScrollView>
          </View>
          
          <View style={styles.buttonContainer}>
            {onCancel && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    width: width * 0.8,
    height: 400,
    backgroundColor: 'rgba(25,25,25,0.85)', 
    borderRadius: SIZES.radius,
    overflow: 'hidden',
  },
  pickerContent: {
    flex: 1,
    position: 'relative',
  },
  selectionHighlightContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
    zIndex: 10,
  },
  selectionHighlight: {
    height: ITEM_HEIGHT,
    width: '90%',
    backgroundColor: 'rgba(50,50,50,0.5)', 
    borderRadius: SIZES.radius / 2,
    borderWidth: 1,
    borderColor: 'rgba(100,100,100,0.5)', 
    marginTop: 64,
  },
  scrollContent: {
    alignItems: 'center',
  },
  numberItem: {
    height: ITEM_HEIGHT,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 10,
  },
  numberText: {
    fontSize: 32,
    color: 'rgba(255,255,255,0.5)', 
    fontWeight: '300',
    textAlign: 'center',
  },
  selectedNumberText: {
    fontSize: 40,
    color: COLORS.primary,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 5,
  },
  unitText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginLeft: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    height: 60,
    backgroundColor: 'rgba(30,30,30,0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(100,100,100,0.3)',
  },
  confirmButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: COLORS.primary,
    fontSize: SIZES.fontSize.subtitle,
    fontWeight: '500',
    letterSpacing: 1,
  },
  cancelButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(100,100,100,0.3)',
  },
  cancelButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: SIZES.fontSize.subtitle,
    fontWeight: '400',
  }
});

export default NumberPicker;