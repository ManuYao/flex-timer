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
import { NumberPickerProps } from '../../types';

const { width } = Dimensions.get('window');
const ITEM_HEIGHT = 80;

const NumberPicker = memo(({ 
  minValue = 1, 
  maxValue = 99, 
  initialValue = 5,
  onConfirm,
  visible = false
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
                    {num}
                  </Text>
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
    backgroundColor: 'rgba(25,25,25,0.85)', // Plus transparent
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
    backgroundColor: 'rgba(50,50,50,0.5)', // Plus transparent
    borderRadius: SIZES.radius / 2,
    borderWidth: 1,
    borderColor: 'rgba(100,100,100,0.5)', // Bordure plus visible
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
  },
  numberText: {
    fontSize: 40,
    color: 'rgba(255,255,255,0.5)', // Texte non sélectionné plus clair
    fontWeight: '300',
    textAlign: 'center',
  },
  selectedNumberText: {
    fontSize: 48,
    color: COLORS.primary,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 5,
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