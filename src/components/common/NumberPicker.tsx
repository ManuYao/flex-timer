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
  formatAsTime?: boolean; // Propriété pour activer le format minutes/secondes
  unit?: string; // Pour afficher l'unité (SEC, MIN, etc.)
}

const NumberPicker = memo(({ 
  minValue = 1, 
  maxValue = 99, 
  initialValue = 5,
  onConfirm,
  visible = false,
  formatAsTime = false, // Par défaut, on n'applique pas le formatage de temps
  unit = "SEC"
}: NumberPickerProps) => {
  const [selectedValue, setSelectedValue] = useState(initialValue);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const numbers = React.useMemo(() => 
    Array.from(
      { length: maxValue - minValue + 1 },
      (_, i) => minValue + i
    ), [minValue, maxValue]);
  
  useEffect(() => {
    if (visible) {
      setSelectedValue(initialValue);
      
      setTimeout(() => {
        if (scrollViewRef.current) {
          const scrollToIndex = initialValue - minValue;
          scrollViewRef.current.scrollTo({
            y: scrollToIndex * ITEM_HEIGHT,
            animated: false
          });
        }
      }, 50);
    }
  }, [visible, initialValue, minValue]);
  
  const handleScroll = (event: { nativeEvent: { contentOffset: { y: number; }; }; }) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / ITEM_HEIGHT);
    
    if (index >= 0 && index < numbers.length) {
      const newValue = numbers[index];
      setSelectedValue(newValue);
    }
  };
  
  const handleConfirm = () => {
    onConfirm(selectedValue);
  };
  
  // Fonction pour formater la valeur en format numérique MM:SS
  const formatValue = (value: number): string => {
    if (formatAsTime && value >= 60) {
      const minutes = Math.floor(value / 60);
      const seconds = value % 60;
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
    return String(value);
  };

  // Gestion de l'affichage des unités - aucune unité affichée
  const getUnitDisplay = (value: number): string => {
    return ""; // Aucune unité affichée
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
              
              {numbers.map((num) => (
                <View key={num} style={styles.numberItem}>
                  <Text style={[
                    styles.numberText,
                    selectedValue === num && styles.selectedNumberText
                  ]}>
                    {formatValue(num)}
                  </Text>
                  {getUnitDisplay(num) && (
                    <Text style={[
                      styles.unitText,
                      selectedValue === num && styles.selectedUnitText
                    ]}>
                      {getUnitDisplay(num)}
                    </Text>
                  )}
                </View>
              ))}
              
              <View style={{height: ITEM_HEIGHT * 2}} />
            </ScrollView>
          </View>
          
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirm}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmButtonText}>OK</Text>
          </TouchableOpacity>
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
    marginRight: 8,
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
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '300',
  },
  selectedUnitText: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  confirmButton: {
    width: '100%',
    height: 60,
    backgroundColor: 'rgba(30,30,30,0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(100,100,100,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: COLORS.primary,
    fontSize: SIZES.fontSize.subtitle,
    fontWeight: '500',
    letterSpacing: 1,
  }
});

export default NumberPicker;