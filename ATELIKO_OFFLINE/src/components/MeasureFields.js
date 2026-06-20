import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import FormInput from './FormInput';

// Champs communs aux deux genres (sans tour_manche qui est placé après les longueurs)
const common = [
  ['E — Épaule', 'epaule'],
  ['M — Manche', 'manche'],
  ['P — Poitrine', 'poitrine'],
];

// Robe : correspond exactement à la version web
const robe = [
  ['T — Taille', 'taille'],
  ['LR — Longueur robe', 'longueur'],
  ['F — Fesse', 'fesse'],
  ['Tm — Tour de manche', 'tour_manche'],
  ['Lp — Longueur de poitrine', 'longueur_poitrine'],
  ['Lt — Longueur de taille', 'longueur_taille'],
  ['Lf — Longueur de fesse', 'longueur_fesse'],
];

// Jupe : correspond exactement à la version web
const jupe = [
  ['T — Taille', 'taille'],
  ['L — Longueur', 'longueur'],
  ['LJ — Longueur jupe', 'longueur_jupe'],
  ['C — Ceinture', 'ceinture'],
  ['F — Fesse', 'fesse'],
  ['Tm — Tour de manche', 'tour_manche'],
  ['Lp — Longueur de poitrine', 'longueur_poitrine'],
  ['Lt — Longueur de taille', 'longueur_taille'],
  ['Lf — Longueur de fesse', 'longueur_fesse'],
];

// Homme : correspond à la version web
const homme = [
  ['L — Longueur', 'longueur'],
  ['Lp — Longueur pantalon', 'longueur_pantalon'],
  ['C — Ceinture', 'ceinture'],
  ['Q — Cuisse', 'cuisse'],
  ['Cd — Cou / Corps', 'corps'],
  ['Tm — Tour de manche', 'tour_manche'],
];

// Champs à vider quand on passe à Homme
const femmeOnlyFields = ['taille', 'fesse', 'longueur_poitrine', 'longueur_taille', 'longueur_fesse', 'longueur_jupe'];
// Champs à vider quand on passe à Femme
const hommeOnlyFields = ['longueur_pantalon', 'cuisse', 'corps'];

function Choice({active, label, onPress}) {
  return (
    <Pressable onPress={onPress} style={[styles.choice, active && styles.choiceActive]}>
      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function MeasureFields({value, onChange, prix = '', onPrixChange}) {
  const set = (field, v) => onChange({...value, [field]: v});

  const switchGender = sexe => {
    const next = {...value, sexe};
    if (sexe === 'Femme') {
      next.type_vetement = ['robe', 'jupe'].includes(String(value.type_vetement || '').toLowerCase())
        ? value.type_vetement
        : 'robe';
      hommeOnlyFields.forEach(field => { next[field] = ''; });
    } else {
      next.type_vetement = 'homme';
      femmeOnlyFields.forEach(field => { next[field] = ''; });
    }
    onChange(next);
  };

  const sexeValue = String(value.sexe || '').toLowerCase();
  const typeValue = String(value.type_vetement || '').toLowerCase();
  const fields = !sexeValue
    ? []
    : sexeValue === 'homme'
    ? [...common, ...homme]
    : [...common, ...(typeValue === 'jupe' ? jupe : robe)];

  return (
    <View>
      {/* Prix du modèle — affiché en premier pour ne pas l'oublier */}
      {onPrixChange ? (
        <View style={styles.prixBox}>
          <FormInput
            label="Prix du modèle (FCFA)"
            value={String(prix || '')}
            onChangeText={onPrixChange}
            numeric
          />
        </View>
      ) : null}

      <Text style={styles.section}>Mesures</Text>

      {/* Sélection du genre */}
      <View style={styles.row}>
        <Choice active={sexeValue === 'femme'} label="Femme" onPress={() => switchGender('Femme')} />
        <Choice active={sexeValue === 'homme'} label="Homme" onPress={() => switchGender('Homme')} />
      </View>

      {!sexeValue ? (
        <Text style={styles.help}>Sélectionnez un genre pour voir ses mesures.</Text>
      ) : null}

      {/* Sous-type femme : Robe / Jupe */}
      {sexeValue === 'femme' ? (
        <View style={styles.row}>
          <Choice active={typeValue === 'robe'} label="Robe" onPress={() => set('type_vetement', 'robe')} />
          <Choice active={typeValue === 'jupe'} label="Jupe" onPress={() => set('type_vetement', 'jupe')} />
        </View>
      ) : null}

      {/* Grille de champs de mesure */}
      {fields.length ? (
        <View style={styles.grid}>
          {fields.map(([label, field]) => (
            <View style={styles.cell} key={field}>
              <FormInput
                label={label}
                value={String(value[field] || '')}
                onChangeText={v => set(field, v)}
                numeric
              />
            </View>
          ))}
        </View>
      ) : null}

      <FormInput
        label="Description mesure"
        value={value.description || ''}
        onChangeText={v => set('description', v)}
        multiline
      />
    </View>
  );
}

const styles = StyleSheet.create({
  prixBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 10,
    marginBottom: 14,
  },
  section: {fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 10},
  row: {flexDirection: 'row', gap: 10, marginBottom: 12},
  choice: {
    flex: 1,
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  choiceActive: {backgroundColor: '#0f766e', borderColor: '#0f766e'},
  choiceText: {fontWeight: '800', color: '#334155'},
  choiceTextActive: {color: '#fff'},
  grid: {flexDirection: 'row', flexWrap: 'wrap', columnGap: 10},
  cell: {width: '48%'},
  help: {color: '#475569', fontSize: 13, marginBottom: 12},
});
