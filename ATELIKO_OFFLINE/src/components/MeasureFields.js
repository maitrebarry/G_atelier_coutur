import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import FormInput from './FormInput';

const common = [
  ['E — Épaule', 'epaule'], ['M — Manche', 'manche'], ['P — Poitrine', 'poitrine'], ['Tm — Tour de manche', 'tour_manche'],
];
const mensCommon = [['L — Longueur', 'longueur']];
const robe = [['LR — Longueur robe', 'longueur'], ['Lp — Longueur de poitrine', 'longueur_poitrine'], ['Lt — Longueur de taille', 'longueur_taille'], ['Lf — Longueur de fesse', 'longueur_fesse']];
const jupe = [['L — Longueur', 'longueur'], ['LJ — Longueur jupe', 'longueur_jupe'], ['C — Ceinture', 'ceinture'], ...robe.slice(1)];
const homme = [['Lp — Longueur pantalon', 'longueur_pantalon'], ['C — Ceinture', 'ceinture'], ['Q — Cuisse', 'cuisse'], ['Cd — Cou / Corps', 'corps']];
const femmeOnlyFields = ['taille', 'fesse', 'longueur_poitrine', 'longueur_taille', 'longueur_fesse', 'longueur_jupe'];
const hommeOnlyFields = ['longueur_pantalon', 'cuisse', 'corps'];

function Choice({active, label, onPress}) {
  return (
    <Pressable onPress={onPress} style={[styles.choice, active && styles.choiceActive]}>
      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function MeasureFields({value, onChange}) {
  const set = (field, v) => onChange({...value, [field]: v});
  const switchGender = sexe => {
    const next = {...value, sexe};
    if (sexe === 'Femme') {
      next.type_vetement = ['robe', 'jupe'].includes(String(value.type_vetement || '').toLowerCase()) ? value.type_vetement : 'robe';
      hommeOnlyFields.forEach(field => { next[field] = ''; });
    } else {
      next.type_vetement = 'homme';
      femmeOnlyFields.forEach(field => { next[field] = ''; });
    }
    onChange(next);
  };
  const sexeValue = String(value.sexe || '').toLowerCase();
  const typeValue = String(value.type_vetement || '').toLowerCase();
  const fields = !sexeValue ? [] : sexeValue === 'homme' ? [...common, ...mensCommon, ...homme] : [...common, ...(typeValue === 'jupe' ? jupe : robe)];

  return (
    <View>
      <Text style={styles.section}>Mesures</Text>
      <View style={styles.row}>
        <Choice active={sexeValue === 'femme'} label="Femme" onPress={() => switchGender('Femme')} />
        <Choice active={sexeValue === 'homme'} label="Homme" onPress={() => switchGender('Homme')} />
      </View>
      {!sexeValue ? (
        <Text style={styles.help}>Sélectionnez un genre pour voir ses mesures.</Text>
      ) : null}
      {sexeValue === 'femme' ? (
        <View style={styles.row}>
          <Choice active={typeValue === 'robe'} label="Robe" onPress={() => set('type_vetement', 'robe')} />
          <Choice active={typeValue === 'jupe'} label="Jupe" onPress={() => set('type_vetement', 'jupe')} />
        </View>
      ) : null}
      {fields.length ? (
        <View style={styles.grid}>
          {fields.map(([label, field]) => (
            <View style={styles.cell} key={field}>
              <FormInput label={label} value={String(value[field] || '')} onChangeText={v => set(field, v)} numeric />
            </View>
          ))}
        </View>
      ) : null}
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
  help: {color: '#475569', fontSize: 13, marginBottom: 12},
});
