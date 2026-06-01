import React, {useEffect, useMemo, useState} from 'react';
import {Alert, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal, ActivityIndicator, FlatList, Image, ToastAndroid} from 'react-native';
import AppButton from '../components/AppButton';
import FormInput from '../components/FormInput';
import MeasureFields from '../components/MeasureFields';
import PhotoPicker from '../components/PhotoPicker';
import {takeLocalPhoto, pickLocalImage} from '../services/imageStorage';
import {addMeasure, createClientWithMeasureAndModel, getClientDetails, updateClient, updateMeasure} from '../services/clientService';
import {createModele, listAlbums, updateModele} from '../services/modelService';

const initialClient = {nom: '', prenom: '', contact: '', adresse: '', avance: ''};
const initialMeasure = {sexe: 'Femme', type_vetement: 'robe', habit_photo: ''};
const initialModel = {
  localId: 1,
  nom_modele: '',
  description: '',
  message_ia: '',
  prix: '',
  statut: 'EN_ATTENTE',
  categorie: 'ROBE',
  photo: '',
  mesure: initialMeasure,
};

const STEPS = [
  {key: 'client', label: 'Client'},
  {key: 'models', label: 'Modèles'},
  {key: 'measure', label: 'Mesures'},
  {key: 'summary', label: 'Résumé'},
];

function makeModel(index) {
  return {
    ...initialModel,
    localId: Date.now() + index,
    nom_modele: index === 0 ? '' : `Modèle ${index + 1}`,
    mesure: {...initialMeasure},
  };
}

function normalizeCategory(measure = {}) {
  if (measure.sexe === 'Homme') return 'HOMME';
  return String(measure.type_vetement || 'robe').toUpperCase();
}

function money(value) {
  return `${Number(value || 0).toLocaleString('fr-FR')} FCFA`;
}

export default function ClientFormScreen({route, navigation}) {
  const idClient = route.params?.idClient;
  const [client, setClient] = useState(initialClient);
  const [existingModels, setExistingModels] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState(null);
  const [step, setStep] = useState('client');
  const [saving, setSaving] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [albumModels, setAlbumModels] = useState([]);
  const [loadingAlbum, setLoadingAlbum] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedIndex = Math.max(models.findIndex(m => m.localId === selectedModelId), 0);
  const selectedModel = models.length > 0 ? models[selectedIndex] || models[0] : null;
  const currentStepIndex = STEPS.findIndex(s => s.key === step);

  useEffect(() => {
    if (!idClient) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const details = await getClientDetails(idClient);
        if (!mounted) return;
        if (!details) {
          Alert.alert('Erreur', 'Client introuvable');
          navigation.goBack();
          return;
        }
        setClient({
          nom: details.nom || '',
          prenom: details.prenom || '',
          contact: details.contact || '',
          adresse: details.adresse || '',
          email: details.email || '',
        });
        setExistingModels(Array.isArray(details.modeles) ? details.modeles : []);
        const mapped = (details.modeles || []).map((m, idx) => ({
          localId: m.id_modele || Date.now() + idx,
          id_modele: m.id_modele,
          nom_modele: m.nom_modele || '',
          description: m.description || '',
          message_ia: m.message_ia || '',
          prix: m.prix || '',
          statut: m.statut || 'EN_ATTENTE',
          categorie: m.categorie || normalizeCategory(m),
          photo: m.photo || '',
          mesure: (details.mesures || []).find(ms => ms.id_mesure === m.id_mesure) || {...initialMeasure},
        }));
        setModels(mapped);
        setSelectedModelId(mapped.length > 0 ? mapped[0].localId : null);
      } catch (e) {
        console.error('Error loading client details:', e);
        Alert.alert('Erreur', 'Impossible de charger le client');
        navigation.goBack();
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [idClient]);

  const totals = useMemo(() => {
    return models.reduce((acc, model) => {
      acc.prix += Number(model.prix || model.mesure?.prix || 0);
      return acc;
    }, {prix: 0});
  }, [models]);

  const setClientField = (field, value) => setClient(prev => ({...prev, [field]: value}));
  const updateModel = (localId, patch) => {
    setModels(prev => prev.map(model => {
      if (model.localId !== localId) return model;
      const next = {...model, ...patch};
      if (patch.mesure) {
        next.categorie = normalizeCategory(patch.mesure);
        next.prix = next.prix || patch.mesure.prix || '';
        next.description = next.description || patch.mesure.description || '';
      }
      return next;
    }));
  };

  const addModel = () => {
    const next = makeModel(models.length);
    setModels(prev => [...prev, next]);
    setSelectedModelId(next.localId);
    setStep('models');
  };

  const duplicateModel = localId => {
    const base = models.find(m => m.localId === localId);
    if (!base) return;
    const copy = {
      ...base,
      localId: Date.now(),
      nom_modele: `${base.nom_modele || 'Modèle'} copie`,
      mesure: {...base.mesure},
    };
    setModels(prev => [...prev, copy]);
    setSelectedModelId(copy.localId);
  };

  const removeModel = localId => {
    setModels(prev => {
      const next = prev.filter(m => m.localId !== localId);
      setSelectedModelId(next[0]?.localId || null);
      return next;
    });
  };

  const validateClient = () => {
    if (!client.nom.trim() || !client.prenom.trim() || !client.contact.trim()) {
      Alert.alert('Champs requis', 'Nom, prénom et contact sont obligatoires.');
      return false;
    }
    return true;
  };

  const validateModels = () => {
    if (!idClient && models.length === 0) {
      Alert.alert('Modèle requis', 'Ajoutez au moins un modèle pour ce client.');
      return false;
    }
    const missing = models.findIndex(model => !model.nom_modele.trim());
    if (missing >= 0) {
      Alert.alert('Modèle incomplet', `Renseignez le nom du modèle ${missing + 1}.`);
      setSelectedModelId(models[missing].localId);
      setStep('models');
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (step === 'client' && !validateClient()) return;
    if (step === 'models' && !validateModels()) return;
    if (currentStepIndex < STEPS.length - 1) {
      setStep(STEPS[currentStepIndex + 1].key);
    }
  };

  const goPrevious = () => {
    if (currentStepIndex > 0) {
      setStep(STEPS[currentStepIndex - 1].key);
    }
  };

  const save = async () => {
    if (saving) return;
    if (!validateClient() || !validateModels()) return;
    try {
      setSaving(true);
      if (idClient) {
        await updateClient(idClient, client);
        for (const model of models) {
          // handle mesure: update existing or add new
          let idMesure = model.mesure?.id_mesure;
          if (model.mesure) {
            if (model.mesure.id_mesure) {
              await updateMeasure(model.mesure.id_mesure, model.mesure);
              idMesure = model.mesure.id_mesure;
            } else {
              idMesure = await addMeasure(idClient, model.mesure);
            }
          }
          if (model.id_modele) {
            // existing modele -> update
            await updateModele(model.id_modele, {
              photo: model.photo,
              nom_modele: model.nom_modele,
              description: model.description || model.mesure?.description,
              message_ia: model.message_ia,
              prix: model.prix || model.mesure?.prix,
              statut: model.statut,
              categorie: model.categorie || normalizeCategory(model.mesure),
            });
          } else {
            // new modele -> create
            await createModele({
              ...model,
              id_client: idClient,
              id_mesure: idMesure,
              photo: model.photo,
              prix: model.prix || model.mesure?.prix,
              description: model.description || model.mesure?.description,
            });
          }
        }
        Alert.alert('Succès', 'Client mis à jour avec succès', [{ text: 'OK', onPress: () => navigation.replace('ClientDetail', {idClient}) }]);
        return;
      }

      const [first, ...rest] = models;
      const saved = await createClientWithMeasureAndModel({
        ...client,
        mesure: first.mesure,
        modele: {
          ...first,
          photo: first.photo,
          prix: first.prix || first.mesure?.prix,
          description: first.description || first.mesure?.description,
          avance: client.avance, // Set the global advance on the first model
        },
      });
      for (const model of rest) {
        const idMesure = await addMeasure(saved.id_client, model.mesure);
        await createModele({
          ...model,
          id_client: saved.id_client,
          id_mesure: idMesure,
          photo: model.photo,
          prix: model.prix || model.mesure?.prix,
          description: model.description || model.mesure?.description,
        });
      }
      Alert.alert('Succès', 'Client enregistré avec succès', [{ text: 'OK', onPress: () => {
        navigation.replace('Receipt', {receiptType: 'COMMANDE', idClient: saved.id_client, autoWhatsApp: true});
      } }]);
    } catch (e) {
      console.error('Error saving client:', e);
      Alert.alert('Erreur', e?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const renderStepTabs = () => (
    <View style={styles.stepTabs}>
      {STEPS.map((item, index) => {
        const active = item.key === step;
        const done = index < currentStepIndex;
        return (
          <Pressable key={item.key} style={[styles.stepTab, active && styles.stepTabActive]} onPress={() => setStep(item.key)}>
            <View style={[styles.stepDot, (active || done) && styles.stepDotActive]}>
              <Text style={[styles.stepDotText, (active || done) && styles.stepDotTextActive]}>{index + 1}</Text>
            </View>
            <Text style={[styles.stepLabel, active && styles.stepLabelActive]} numberOfLines={1}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderClientStep = () => (
    <View style={styles.card}>
      <Text style={styles.section}>Informations générales</Text>
      <Text style={styles.helper}>Identifiez le client avant d'ajouter ses habits à coudre.</Text>
      <FormInput label="Nom *" value={client.nom} onChangeText={v => setClientField('nom', v)} />
      <FormInput label="Prénom *" value={client.prenom} onChangeText={v => setClientField('prenom', v)} />
      <FormInput label="Contact *" value={client.contact} onChangeText={v => setClientField('contact', v)} numeric />
      <FormInput label="Adresse ou localité" value={client.adresse} onChangeText={v => setClientField('adresse', v)} />
    </View>
  );

  const renderModelsStep = () => (
    <View>
      {idClient && existingModels.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.section}>Modèles déjà enregistrés</Text>
          {existingModels.map((model, index) => (
            <View key={model.id_modele || index} style={styles.existingRow}>
              <Text style={styles.existingName}>{model.nom_modele || `Modèle ${index + 1}`}</Text>
              <Text style={styles.existingMeta}>{money(model.prix)} • avance {money(model.avance)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.headerRow}>
        <View>
          <Text style={styles.section}>Modèles à enregistrer</Text>
          <Text style={styles.helper}>Ajoutez un habit par carte: boubou, robe, pantalon, etc.</Text>
        </View>
        <View style={{flexDirection: 'row', gap: 8}}>
          <TouchableOpacity style={styles.addSmallBtn} onPress={addModel}>
            <Text style={styles.addSmallBtnText}>+ Ajouter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.addSmallBtn, {backgroundColor: '#eef6ff'}]} onPress={async () => {
            setShowImportModal(true);
            setLoadingAlbum(true);
            try {
              const list = await listAlbums('');
              setAlbumModels(list || []);
            } catch (e) {
              setAlbumModels([]);
            } finally {
              setLoadingAlbum(false);
            }
          }}>
            <Text style={[styles.addSmallBtnText, {color: '#0d6efd'}]}>Importer depuis Album</Text>
          </TouchableOpacity>
        </View>
      </View>

      {models.length === 0 ? (
        <View style={{gap: 12, marginTop: 10}}>
          <TouchableOpacity style={styles.emptyAdd} onPress={addModel}>
            <Text style={{fontSize: 24, marginBottom: 8}}>✂️</Text>
            <Text style={styles.emptyAddText}>Créer un modèle personnalisé</Text>
            <Text style={{fontSize: 12, color: '#6b7280', marginTop: 4, textAlign: 'center'}}>Saisir manuellement le nom, prix et photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.emptyAdd, {borderColor: '#198754', backgroundColor: '#eafaf1'}]} onPress={async () => {
            setShowImportModal(true);
            setLoadingAlbum(true);
            try {
              const list = await listAlbums('');
              setAlbumModels(list || []);
            } catch (e) {
              setAlbumModels([]);
            } finally {
              setLoadingAlbum(false);
            }
          }}>
            <Text style={{fontSize: 24, marginBottom: 8}}>🖼️</Text>
            <Text style={[styles.emptyAddText, {color: '#198754'}]}>Choisir depuis les Albums</Text>
            <Text style={{fontSize: 12, color: '#6b7280', marginTop: 4, textAlign: 'center'}}>Sélectionner un modèle existant du catalogue</Text>
          </TouchableOpacity>
        </View>
      ) : models.map((model, index) => (
        <Pressable
          key={model.localId}
          style={[styles.modelCard, selectedModelId === model.localId && styles.modelCardActive]}
          onPress={() => setSelectedModelId(model.localId)}>
          <View style={styles.modelHeader}>
            <View style={styles.modelBadge}>
              <Text style={styles.modelBadgeText}>{index + 1}</Text>
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.modelTitle}>{model.nom_modele || `Modèle ${index + 1}`}</Text>
              <Text style={styles.modelMeta}>{model.categorie || normalizeCategory(model.mesure)} • {money(model.prix || model.mesure?.prix)}</Text>
            </View>
          </View>
          <PhotoPicker label="Photo du modèle" value={model.photo} onChange={uri => updateModel(model.localId, {photo: uri})} prefix="modele" />
          <PhotoPicker
            label="Photo de l'habit à coudre"
            value={model.mesure?.habit_photo}
            onChange={uri => updateModel(model.localId, {mesure: {...model.mesure, habit_photo: uri}})}
            prefix="habit"
          />
          <FormInput label="Nom du modèle *" value={model.nom_modele} onChangeText={v => updateModel(model.localId, {nom_modele: v})} />
          <FormInput label="Description" value={model.description} onChangeText={v => updateModel(model.localId, {description: v})} multiline />
          <FormInput label="Prix du modèle" value={String(model.prix || '')} onChangeText={v => updateModel(model.localId, {prix: v})} numeric />
          <View style={styles.modelActions}>
            <AppButton label="Mesures" onPress={() => { setSelectedModelId(model.localId); setStep('measure'); }} variant="ghost" />
            <AppButton label="Dupliquer" onPress={() => duplicateModel(model.localId)} variant="muted" />
            <AppButton label="Supprimer" onPress={() => removeModel(model.localId)} variant="danger" />
          </View>
        </Pressable>
      ))}
    </View>
  );

  const renderMeasureStep = () => {
    if (!selectedModel) {
      return (
        <TouchableOpacity style={styles.emptyAdd} onPress={addModel}>
          <Text style={styles.emptyAddText}>Ajoutez d'abord un modèle</Text>
        </TouchableOpacity>
      );
    }
    return (
      <View style={styles.card}>
        <Text style={styles.section}>Mesures du modèle</Text>
        <Text style={styles.helper}>Chaque habit peut avoir ses propres mesures, comme sur la version web.</Text>
        <View style={styles.modelSelector}>
          {models.map((model, index) => (
            <Pressable
              key={model.localId}
              style={[styles.modelChip, selectedModelId === model.localId && styles.modelChipActive]}
              onPress={() => setSelectedModelId(model.localId)}>
              <Text style={[styles.modelChipText, selectedModelId === model.localId && styles.modelChipTextActive]}>
                {model.nom_modele || `Modèle ${index + 1}`}
              </Text>
            </Pressable>
          ))}
        </View>
        <MeasureFields value={selectedModel.mesure} onChange={next => updateModel(selectedModel.localId, {mesure: next})} />
      </View>
    );
  };

  // Import modal rendered at the end of the form
  

  const renderSummaryStep = () => (
    <View>
      <View style={styles.card}>
        <Text style={styles.section}>Résumé client</Text>
        <Text style={styles.summaryName}>{client.prenom} {client.nom}</Text>
        <Text style={styles.summaryMeta}>{client.contact || '-'}{client.adresse ? ` • ${client.adresse}` : ''}</Text>
        <View style={styles.totalRow}>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Modèles</Text>
            <Text style={styles.totalValue}>{models.length}</Text>
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{money(totals.prix)}</Text>
          </View>
        </View>
        {!idClient ? (
          <View style={{marginTop: 15}}>
            <FormInput label="Avance globale versée (FCFA)" value={client.avance} onChangeText={v => setClientField('avance', v)} numeric />
          </View>
        ) : null}
      </View>
      {models.map((model, index) => (
        <View key={model.localId} style={styles.summaryCard}>
          <Text style={styles.modelTitle}>{index + 1}. {model.nom_modele || 'Modèle sans nom'}</Text>
          <Text style={styles.summaryMeta}>{model.categorie || normalizeCategory(model.mesure)} • {model.mesure?.sexe || '-'} • {model.mesure?.type_vetement || '-'}</Text>
          <Text style={styles.summaryMeta}>Prix {money(model.prix || model.mesure?.prix)}</Text>
          {model.description || model.mesure?.description ? <Text style={styles.description}>{model.description || model.mesure?.description}</Text> : null}
        </View>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, {alignItems: 'center', justifyContent: 'center'}]}>
        <ActivityIndicator size="large" />
        <Text style={{marginTop: 8, color: '#6b7280'}}>Chargement...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{idClient ? 'Modifier client' : 'Nouveau client'}</Text>
      <Text style={styles.subtitle}>Enregistrement étape par étape: client, modèles, mesures, résumé.</Text>
      {renderStepTabs()}
      {step === 'client' ? renderClientStep() : null}
      {step === 'models' ? renderModelsStep() : null}
      {step === 'measure' ? renderMeasureStep() : null}
      {step === 'summary' ? renderSummaryStep() : null}
      <View style={styles.footerActions}>
        {currentStepIndex > 0 ? <AppButton label="Retour" onPress={goPrevious} variant="ghost" /> : null}
        {currentStepIndex < STEPS.length - 1 ? (
          <AppButton label="Continuer" onPress={goNext} />
        ) : (
          <AppButton label={saving ? 'Enregistrement...' : 'Enregistrer'} onPress={save} disabled={saving} />
        )}
      </View>
      <Modal visible={showImportModal} transparent animationType="slide">
        <View style={{flex:1, backgroundColor: 'rgba(10,18,35,0.45)', justifyContent: 'center', padding: 16}}>
          <View style={{backgroundColor:'#fff', borderRadius:12, maxHeight: '80%', padding: 12}}>
            <View style={{flexDirection: 'row', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
              <Text style={{fontWeight:'900', fontSize:16}}>Importer depuis l'album</Text>
              <TouchableOpacity onPress={() => setShowImportModal(false)}><Text style={{fontSize:18}}>✖</Text></TouchableOpacity>
            </View>
            {loadingAlbum ? <ActivityIndicator /> : (
              <FlatList
                data={albumModels}
                keyExtractor={item => String(item.id_album || item.id)}
                renderItem={({item}) => (
                  <View style={{paddingVertical:8, borderBottomWidth:1, borderBottomColor:'#eef2f7', flexDirection:'row', gap:8}}>
                    {item.photo ? <Image source={{uri: item.photo}} style={{width:64, height:64, borderRadius:8, backgroundColor:'#eef2f7'}} /> : <View style={{width:64, height:64, borderRadius:8, backgroundColor:'#f3f6fb', alignItems:'center', justifyContent:'center'}}><Text>🖼️</Text></View>}
                    <View style={{flex:1}}>
                      <Text style={{fontWeight:'900'}} numberOfLines={1}>{item.nom_modele || item.nom || 'Sans nom'}</Text>
                      <Text style={{color:'#6b7280'}} numberOfLines={2}>{item.description || item.desc || ''}</Text>
                      <View style={{flexDirection:'row', gap:8, marginTop:6}}>
                        <AppButton label="Importer" onPress={() => {
                          const imported = makeModel(models.length);
                          imported.nom_modele = item.nom_modele || item.nom || '';
                          imported.description = item.description || '';
                          imported.prix = item.prix || '';
                          imported.categorie = item.categorie || '';
                          imported.photo = item.photo || item.photoPath || '';
                          imported.mesure = {...initialMeasure};
                          setModels(prev => [...prev, imported]);
                          setSelectedModelId(imported.localId);
                          setShowImportModal(false);
                        }} variant="muted" />
                        <AppButton label="Voir" onPress={() => {/* future: view detail */}} variant="ghost" />
                      </View>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {padding: 16, backgroundColor: '#f8fafc', flexGrow: 1, paddingBottom: 34},
  title: {fontSize: 24, fontWeight: '900', color: '#1b2a4a'},
  subtitle: {fontSize: 13, color: '#6b7280', marginTop: 4, marginBottom: 14},
  stepTabs: {flexDirection: 'row', gap: 8, marginBottom: 14},
  stepTab: {flex: 1, minHeight: 70, borderRadius: 12, borderWidth: 1, borderColor: '#e5eaf3', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 6},
  stepTabActive: {borderColor: '#0d6efd', backgroundColor: '#e8f1ff'},
  stepDot: {width: 26, height: 26, borderRadius: 13, backgroundColor: '#eef2f7', alignItems: 'center', justifyContent: 'center', marginBottom: 5},
  stepDotActive: {backgroundColor: '#0d6efd'},
  stepDotText: {fontSize: 12, fontWeight: '900', color: '#64748b'},
  stepDotTextActive: {color: '#fff'},
  stepLabel: {fontSize: 11, color: '#475569', fontWeight: '800'},
  stepLabelActive: {color: '#0d6efd'},
  card: {padding: 14, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5eaf3', marginBottom: 12},
  section: {fontSize: 18, fontWeight: '900', color: '#1d2c4d', marginBottom: 6},
  helper: {fontSize: 12, color: '#6b7280', marginBottom: 12},
  headerRow: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10},
  addSmallBtn: {backgroundColor: '#0d6efd', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8},
  addSmallBtnText: {color: '#fff', fontWeight: '900', fontSize: 12},
  emptyAdd: {borderWidth: 1, borderStyle: 'dashed', borderColor: '#0d6efd', borderRadius: 12, padding: 18, alignItems: 'center', backgroundColor: '#eef6ff'},
  emptyAddText: {color: '#0d6efd', fontWeight: '900'},
  modelCard: {padding: 14, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5eaf3', marginBottom: 12},
  modelCardActive: {borderColor: '#0d6efd'},
  modelHeader: {flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10},
  modelBadge: {width: 34, height: 34, borderRadius: 11, backgroundColor: '#f1f4fa', alignItems: 'center', justifyContent: 'center'},
  modelBadgeText: {fontWeight: '900', color: '#0d6efd'},
  modelTitle: {fontSize: 16, fontWeight: '900', color: '#1d2c4d'},
  modelMeta: {fontSize: 12, color: '#6b7280', marginTop: 2},
  modelActions: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4},
  modelSelector: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12},
  modelChip: {borderWidth: 1, borderColor: '#ccd6eb', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#fff'},
  modelChipActive: {backgroundColor: '#0d6efd', borderColor: '#0d6efd'},
  modelChipText: {fontWeight: '800', color: '#344563', fontSize: 12},
  modelChipTextActive: {color: '#fff'},
  existingRow: {borderTopWidth: 1, borderTopColor: '#eef2f7', paddingTop: 10, marginTop: 8},
  existingName: {fontWeight: '900', color: '#1d2c4d'},
  existingMeta: {fontSize: 12, color: '#6b7280', marginTop: 2},
  summaryName: {fontSize: 18, fontWeight: '900', color: '#1d2c4d'},
  summaryMeta: {fontSize: 12, color: '#6b7280', marginTop: 3},
  totalRow: {flexDirection: 'row', gap: 8, marginTop: 12},
  totalBox: {flex: 1, backgroundColor: '#f8f9fc', borderRadius: 10, padding: 10},
  totalLabel: {fontSize: 11, color: '#64748b', fontWeight: '800'},
  totalValue: {fontSize: 14, color: '#0d6efd', fontWeight: '900', marginTop: 3},
  summaryCard: {padding: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5eaf3', marginBottom: 10},
  description: {color: '#1f2937', backgroundColor: '#f8f9fc', padding: 8, borderRadius: 8, marginTop: 8},
  footerActions: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6},
});
