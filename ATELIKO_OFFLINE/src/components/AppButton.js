import React from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';

export default function AppButton({label, onPress, variant = 'primary', disabled = false}) {
  const lightVariant = ['ghost', 'soft'].includes(variant);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({pressed}) => [
        styles.button,
        styles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}>
      <Text style={[styles.text, lightVariant && styles.lightText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 6},
    elevation: 2,
  },
  primary: {backgroundColor: '#0d6efd'},
  danger: {backgroundColor: '#dc3545'},
  muted: {backgroundColor: '#334155'},
  success: {backgroundColor: '#198754'},
  warning: {backgroundColor: '#f59f00'},
  info: {backgroundColor: '#0ea5e9'},
  ghost: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    shadowColor: 'transparent',
    elevation: 0,
  },
  soft: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    shadowColor: 'transparent',
    elevation: 0,
  },
  disabled: {opacity: 0.45},
  pressed: {transform: [{scale: 0.98}]},
  text: {color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 0.2},
  lightText: {color: '#0d6efd'},
});
