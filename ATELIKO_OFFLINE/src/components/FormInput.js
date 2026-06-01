import React from 'react';
import {StyleSheet, Text, TextInput, View} from 'react-native';

export default function FormInput({label, value, onChangeText, numeric = false, multiline = false, placeholder}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={numeric ? 'numeric' : 'default'}
        multiline={multiline}
        placeholder={placeholder || label}
        placeholderTextColor="#94a3b8"
        style={[styles.input, multiline && styles.multiline]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {gap: 8, marginBottom: 16},
  label: {fontSize: 13, color: '#475569', fontWeight: '700'},
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 16,
    paddingHorizontal: 16,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  multiline: {minHeight: 100, paddingTop: 12, textAlignVertical: 'top'},
});
