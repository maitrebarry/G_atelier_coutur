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
  button: {minHeight: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 9},
  primary: {backgroundColor: '#0d6efd'},
  danger: {backgroundColor: '#dc3545'},
  muted: {backgroundColor: '#344563'},
  success: {backgroundColor: '#198754'},
  warning: {backgroundColor: '#f59f00'},
  info: {backgroundColor: '#0ea5e9'},
  ghost: {backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccd6eb'},
  soft: {backgroundColor: '#e8f1ff', borderWidth: 1, borderColor: '#cfe0ff'},
  disabled: {opacity: 0.45},
  pressed: {opacity: 0.84},
  text: {color: '#fff', fontWeight: '800'},
  lightText: {color: '#0d6efd'},
});
