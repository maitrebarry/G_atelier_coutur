import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import FormInput from './FormInput';

const common = [
  ['E — Épaule', 'epaule'], ['M — Manche', 'manche'], ['P — Poitrine', 'poitrine'], ['T — Taille', 'taille'],
  ['LR — Longueur robe', 'longueur'], ['F — Fesse', 'fesse'], ['Tm — Tour de manche', 'tour_manche'],
];
const robe = [['Lp — Longueur de poitrine', 'longueur_poitrine'], ['Lt — Longueur de taille', 'longueur_taille'], ['Lf — Longueur de fesse', 'longueur_fesse']];
const jupe = [['L — Longueur', 'longueur'], ['LJ — Longueur jupe', 'longueur_jupe'], ['C — Ceinture', 'ceinture'], ...robe];
const homme = [['Lp — Longueur pantalon', 'longueur_pantalon'], ['C — Ceinture', 'ceinture'], ['Q — Cuisse', 'cuisse'], ['Cd — Cou / Corps', 'corps']];

function Choice({active, label, onPress}) {
  return (
    <Pressable onPress={onPress} style={[styles.choice, active && styles.choiceActive]}>
      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function MeasureFields({value, onChange}) {
  const set = (field, v) => onChange({...value, [field]: v});
  const sexe = value.sexe || 'Femme';
  const type = value.type_vetement || (sexe === 'Homme' ? 'homme' : 'robe');
  const fields = sexe === 'Homme' ? [...common, ...homme] : [...common, ...(type === 'jupe' ? jupe : robe)];

  return (
    <View>
      <Text style={styles.section}>Mesures</Text>
      <View style={styles.row}>
        <Choice active={sexe === 'Femme'} label="Femme" onPress={() => onChange({...value, sexe: 'Femme', type_vetement: 'robe'})} />
        <Choice active={sexe === 'Homme'} label="Homme" onPress={() => onChange({...value, sexe: 'Homme', type_vetement: 'homme'})} />
      </View>
      {sexe === 'Femme' ? (
        <View style={styles.row}>
          <Choice active={type === 'robe'} label="Robe" onPress={() => set('type_vetement', 'robe')} />
          <Choice active={type === 'jupe'} label="Jupe" onPress={() => set('type_vetement', 'jupe')} />
        </View>
      ) : null}
      <View style={styles.grid}>
        {fields.map(([label, field]) => (
          <View style={styles.cell} key={field}>
            <FormInput label={label} value={String(value[field] || '')} onChangeText={v => set(field, v)} numeric />
          </View>
        ))}
      </View>
      <FormInput label="Description mesure" value={value.description || ''} onChangeText={v => set('description', v)} multiline />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 10},
  row: {flexDirection: 'row', gap: 10, marginBottom: 12},
  choice: {flex: 1, minHeight: 42, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff'},
  choiceActive: {backgroundColor: '#0f766e', borderColor: '#0f766e'},
  choiceText: {fontWeight: '800', color: '#334155'},
  choiceTextActive: {color: '#fff'},
  grid: {flexDirection: 'row', flexWrap: 'wrap', columnGap: 10},
  cell: {width: '48%'},
});
