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
  field: {gap: 6, marginBottom: 12},
  label: {fontSize: 13, color: '#334155', fontWeight: '700'},
  input: {minHeight: 44, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, color: '#0f172a', backgroundColor: '#fff'},
  multiline: {minHeight: 88, paddingTop: 10, textAlignVertical: 'top'},
});
