import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import AppButton from './AppButton';
import {pickLocalImage, takeLocalPhoto} from '../services/imageStorage';

export default function PhotoPicker({label, value, onChange, prefix = 'ateliko'}) {
  const selectGallery = async () => {
    const uri = await pickLocalImage(prefix);
    if (uri) onChange(uri);
  };

  const selectCamera = async () => {
    const uri = await takeLocalPhoto(prefix);
    if (uri) onChange(uri);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {value ? <Image source={{uri: value}} style={styles.photo} /> : <View style={styles.empty}><Text style={styles.emptyText}>Aucune photo</Text></View>}
      <View style={styles.row}>
        <AppButton label="Camera" onPress={selectCamera} variant="muted" />
        <AppButton label="Galerie" onPress={selectGallery} variant="ghost" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {gap: 8, marginBottom: 14},
  label: {fontSize: 13, color: '#334155', fontWeight: '800'},
  photo: {width: '100%', height: 190, borderRadius: 8, backgroundColor: '#e2e8f0'},
  empty: {height: 116, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc'},
  emptyText: {color: '#64748b', fontWeight: '700'},
  row: {flexDirection: 'row', gap: 10},
});
