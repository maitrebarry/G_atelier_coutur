import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Button, ScrollView, StyleSheet,
  TouchableOpacity, Alert, Animated, Dimensions, Platform, Image, Modal, FlatList, ActivityIndicator
} from 'react-native';
import api from '../api/backend';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons'; // npm install react-native-vector-icons

const { width } = Dimensions.get('window');

export default function MesureAddScreen({ navigation }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [showModelsModal, setShowModelsModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);
  const [clientPhotoFile, setClientPhotoFile] = useState(null);
  const [clientPhotoPreview, setClientPhotoPreview] = useState(null);
  const [habitPhotoFile, setHabitPhotoFile] = useState(null);
  const [habitPhotoPreview, setHabitPhotoPreview] = useState(null);
  const [formData, setFormData] = useState({
    nom: '', prenom: '', contact: '', adresse: '', email: '',
    sexe: 'Femme', femme_type: 'robe',
    prix: '', description: '',
    selectedModelId: '', modeleNom: '',
    // Mesures communes / spécifiques
    robe_epaule: '', robe_manche: '', robe_poitrine: '', robe_taille: '', robe_longueur: '',
    robe_fesse: '', robe_tour_manche: '', robe_longueur_poitrine: '', robe_longueur_taille: '', robe_longueur_fesse: '',
    jupe_epaule: '', jupe_manche: '', jupe_poitrine: '', jupe_taille: '', jupe_longueur: '', jupe_longueur_jupe: '', jupe_ceinture: '', jupe_fesse: '', jupe_tour_manche: '', jupe_longueur_poitrine: '', jupe_longueur_taille: '', jupe_longueur_fesse: '',
    homme_epaule: '', homme_manche: '', homme_longueur: '', homme_longueur_pantalon: '', homme_ceinture: '', homme_cuisse: '', homme_poitrine: '', homme_corps: '', homme_tour_manche: '',
  });

  const steps = [
    { id: 1, title: 'Infos client', icon: 'person' },
    { id: 2, title: 'Type & Prix', icon: 'style' },
    { id: 3, title: 'Mesures', icon: 'straighten' },
    { id: 4, title: 'Récapitulatif', icon: 'check-circle' },
  ];

  useEffect(() => {
    fetchModels();
  }, []);

  const getImageMediaTypeOption = () => {
    const imageType = ImagePicker?.MediaType?.images || ImagePicker?.MediaType?.Images || 'images';
    return [imageType];
  };

  const buildServerFileUrl = (filePath) => {
    if (!filePath) return null;
    if (String(filePath).startsWith('http')) return filePath;
    const base = (api?.defaults?.baseURL || '').replace(/\/api$/i, '');
    const normalized = String(filePath).replace(/^\/+/, '');
    if (!base) return null;
    if (normalized.startsWith('model_photo/')) return `${base}/${normalized}`;
    return `${base}/model_photo/${normalized}`;
  };

  const fetchModels = async () => {
    try {
      setModelsLoading(true);
      const userRaw = await AsyncStorage.getItem('userData');
      const user = userRaw ? JSON.parse(userRaw) : null;
      const atelierId = user?.atelierId || user?.atelier?.id || null;
      if (!atelierId) {
        setModels([]);
        return;
      }
      const res = await api.get(`/clients/modeles/atelier/${atelierId}`);
      setModels(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setModels([]);
      console.log('Erreur chargement modèles:', e?.response?.data || e?.message || e);
    } finally {
      setModelsLoading(false);
    }
  };

  const toUploadFile = (asset, fallbackName) => {
    if (!asset?.uri) return null;
    const ext = asset?.fileName?.split('.').pop() || 'jpg';
    const type = asset?.mimeType || 'image/jpeg';
    const name = asset?.fileName || `${fallbackName}.${ext}`;
    return {
      uri: asset.uri,
      type,
      name,
    };
  };

  const pickImage = async (target = 'client') => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission refusée', 'Autorisez l’accès à la galerie pour sélectionner une photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: getImageMediaTypeOption(),
        allowsEditing: true,
        quality: 0.85,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      const file = toUploadFile(asset, target === 'client' ? 'client-photo' : 'habit-photo');
      if (!file) return;

      if (target === 'client') {
        setClientPhotoFile(file);
        setClientPhotoPreview(asset.uri);
        setSelectedModel(null);
        setFormData((prev) => ({ ...prev, selectedModelId: '', modeleNom: '' }));
      } else {
        setHabitPhotoFile(file);
        setHabitPhotoPreview(asset.uri);
      }
    } catch (error) {
      console.log('Erreur ouverture galerie:', error?.message || error);
      Alert.alert('Erreur', 'Impossible d’ouvrir la galerie sur cet appareil.');
    }
  };

  const takePhoto = async (target = 'client') => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission refusée', 'Autorisez l’accès à la caméra pour prendre une photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.85,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      const file = toUploadFile(asset, target === 'client' ? 'client-photo' : 'habit-photo');
      if (!file) return;

      if (target === 'client') {
        setClientPhotoFile(file);
        setClientPhotoPreview(asset.uri);
        setSelectedModel(null);
        setFormData((prev) => ({ ...prev, selectedModelId: '', modeleNom: '' }));
      } else {
        setHabitPhotoFile(file);
        setHabitPhotoPreview(asset.uri);
      }
    } catch (error) {
      console.log('Erreur ouverture caméra:', error?.message || error);
      Alert.alert('Erreur', 'Impossible d’ouvrir la caméra sur cet appareil.');
    }
  };

  const chooseExistingModel = (model) => {
    setSelectedModel(model);
    setFormData((prev) => ({
      ...prev,
      selectedModelId: model?.id ? String(model.id) : '',
      modeleNom: model?.nom || '',
    }));
    setClientPhotoFile(null);
    setClientPhotoPreview(buildServerFileUrl(model?.photoPath));
    setShowModelsModal(false);
  };

  const handleChange = (name, value) => setFormData(prev => ({ ...prev, [name]: value }));

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.nom || !formData.prenom || !formData.contact) {
          Alert.alert('Erreur', 'Nom, Prénom et Contact requis');
          return false;
        }
        if (!/^\d{8}$/.test(String(formData.contact))) {
          Alert.alert('Erreur', 'Le contact doit contenir exactement 8 chiffres');
          return false;
        }
        return true;
      case 2:
        if (!formData.prix || Number(formData.prix) <= 0) {
          Alert.alert('Erreur', 'Veuillez renseigner un prix valide');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) return;
    if (!habitPhotoFile) {
      Alert.alert('Photo requise', 'Veuillez ajouter la photo de l’habit à coudre.');
      return;
    }
    
    try {
      const payload = new FormData();
      Object.keys(formData).forEach(k => {
        if (formData[k] !== null && formData[k] !== undefined) payload.append(k, String(formData[k]));
      });

      if (clientPhotoFile?.uri) {
        payload.append('photo', clientPhotoFile);
      }
      if (habitPhotoFile?.uri) {
        payload.append('habitPhoto', habitPhotoFile);
      }

      await api.post('/clients/ajouter', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
      Alert.alert('Succès', 'Client et mesures enregistrés');
      navigation.navigate('Clients');
    } catch (e) {
      Alert.alert('Erreur', e?.response?.data?.message || 'Échec de l\'enregistrement');
    }
  };

  const renderInput = (label, field, numeric = false) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={formData[field]}
        onChangeText={t => handleChange(field, t)}
        keyboardType={numeric ? 'numeric' : 'default'}
        placeholderTextColor="#999"
      />
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>📋 Informations personnelles</Text>
      {renderInput('Nom *', 'nom')}
      {renderInput('Prénom *', 'prenom')}
      {renderInput('Contact *', 'contact', true)}
      {renderInput('Adresse', 'adresse')}
      {renderInput('Email', 'email')}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>👔 Type de vêtement & Prix</Text>
      
      <View style={styles.field}>
        <Text style={styles.label}>Sexe</Text>
        <View style={styles.row}>
          <TouchableOpacity
            onPress={() => handleChange('sexe', 'Femme')}
            style={[styles.choiceChip, formData.sexe === 'Femme' && styles.selectedChip]}>
            <Icon name="woman" size={20} color={formData.sexe === 'Femme' ? '#fff' : '#666'} />
            <Text style={[styles.choiceText, formData.sexe === 'Femme' && styles.selectedText]}>Femme</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleChange('sexe', 'Homme')}
            style={[styles.choiceChip, formData.sexe === 'Homme' && styles.selectedChip]}>
            <Icon name="man" size={20} color={formData.sexe === 'Homme' ? '#fff' : '#666'} />
            <Text style={[styles.choiceText, formData.sexe === 'Homme' && styles.selectedText]}>Homme</Text>
          </TouchableOpacity>
        </View>
      </View>

      {formData.sexe === 'Femme' && (
        <View style={styles.field}>
          <Text style={styles.label}>Type de tenue</Text>
          <View style={styles.row}>
            <TouchableOpacity
              onPress={() => handleChange('femme_type', 'robe')}
              style={[styles.choiceChip, formData.femme_type === 'robe' && styles.selectedChip]}>
              <Icon name="checkroom" size={20} color={formData.femme_type === 'robe' ? '#fff' : '#666'} />
              <Text style={[styles.choiceText, formData.femme_type === 'robe' && styles.selectedText]}>Robe</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleChange('femme_type', 'jupe')}
              style={[styles.choiceChip, formData.femme_type === 'jupe' && styles.selectedChip]}>
              <Icon name="checkroom" size={20} color={formData.femme_type === 'jupe' ? '#fff' : '#666'} />
              <Text style={[styles.choiceText, formData.femme_type === 'jupe' && styles.selectedText]}>Jupe</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {renderInput('Prix du modèle (FCFA) *', 'prix', true)}
      {renderInput('Description (optionnel)', 'description')}

      <View style={styles.photoSection}>
        <Text style={styles.photoSectionTitle}>Modèle du client</Text>
        <Text style={styles.photoHint}>Choisissez un modèle existant ou ajoutez une photo personnalisée.</Text>

        <View style={styles.photoActionsRow}>
          <TouchableOpacity style={styles.photoActionBtn} onPress={() => setShowModelsModal(true)}>
            <Icon name="view-module" size={18} color="#0d6efd" />
            <Text style={styles.photoActionText}>Choisir un modèle</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.photoActionsRow}>
          <TouchableOpacity style={styles.photoActionBtn} onPress={() => takePhoto('client')}>
            <Icon name="photo-camera" size={18} color="#0d6efd" />
            <Text style={styles.photoActionText}>Prendre photo modèle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoActionBtn} onPress={() => pickImage('client')}>
            <Icon name="photo-library" size={18} color="#0d6efd" />
            <Text style={styles.photoActionText}>Galerie modèle</Text>
          </TouchableOpacity>
        </View>

        {selectedModel?.nom ? (
          <Text style={styles.selectedModelText}>Modèle sélectionné: {selectedModel.nom}</Text>
        ) : null}

        {clientPhotoPreview ? (
          <Image source={{ uri: clientPhotoPreview }} style={styles.photoPreview} />
        ) : null}
      </View>

      <View style={styles.photoSection}>
        <Text style={styles.photoSectionTitle}>Photo de l'habit à coudre *</Text>
        <View style={styles.photoActionsRow}>
          <TouchableOpacity style={styles.photoActionBtn} onPress={() => takePhoto('habit')}>
            <Icon name="photo-camera" size={18} color="#0d6efd" />
            <Text style={styles.photoActionText}>Prendre photo habit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoActionBtn} onPress={() => pickImage('habit')}>
            <Icon name="photo-library" size={18} color="#0d6efd" />
            <Text style={styles.photoActionText}>Galerie habit</Text>
          </TouchableOpacity>
        </View>
        {habitPhotoPreview ? <Image source={{ uri: habitPhotoPreview }} style={styles.photoPreview} /> : null}
      </View>
    </View>
  );

  const renderStep3 = () => {
    const mesures = [];
    
    if (formData.sexe === 'Femme' && formData.femme_type === 'robe') {
      mesures.push(
        { short: 'E', label: 'Épaule', field: 'robe_epaule' },
        { short: 'M', label: 'Manche', field: 'robe_manche' },
        { short: 'P', label: 'Poitrine', field: 'robe_poitrine' },
        { short: 'T', label: 'Taille', field: 'robe_taille' },
        { short: 'LR', label: 'Longueur robe', field: 'robe_longueur' },
        { short: 'F', label: 'Fesse', field: 'robe_fesse' },
        { short: 'Tm', label: 'Tour de manche', field: 'robe_tour_manche' },
        { short: 'Lp', label: 'Longueur poitrine', field: 'robe_longueur_poitrine' },
        { short: 'Lt', label: 'Longueur taille', field: 'robe_longueur_taille' },
        { short: 'Lf', label: 'Longueur fesse', field: 'robe_longueur_fesse' }
      );
    } else if (formData.sexe === 'Femme' && formData.femme_type === 'jupe') {
      mesures.push(
        { short: 'E', label: 'Épaule', field: 'jupe_epaule' },
        { short: 'M', label: 'Manche', field: 'jupe_manche' },
        { short: 'P', label: 'Poitrine', field: 'jupe_poitrine' },
        { short: 'T', label: 'Taille', field: 'jupe_taille' },
        { short: 'L', label: 'Longueur', field: 'jupe_longueur' },
        { short: 'LJ', label: 'Longueur jupe', field: 'jupe_longueur_jupe' },
        { short: 'C', label: 'Ceinture', field: 'jupe_ceinture' },
        { short: 'F', label: 'Fesse', field: 'jupe_fesse' },
        { short: 'TM', label: 'Tour de manche', field: 'jupe_tour_manche' },
        { short: 'LP', label: 'Longueur poitrine', field: 'jupe_longueur_poitrine' },
        { short: 'Lt', label: 'Longueur taille', field: 'jupe_longueur_taille' },
        { short: 'Lf', label: 'Longueur fesse', field: 'jupe_longueur_fesse' }
      );
    } else if (formData.sexe === 'Homme') {
      mesures.push(
        { short: 'E', label: 'Épaule', field: 'homme_epaule' },
        { short: 'M', label: 'Manche', field: 'homme_manche' },
        { short: 'L', label: 'Longueur', field: 'homme_longueur' },
        { short: 'Lp', label: 'Longueur pantalon', field: 'homme_longueur_pantalon' },
        { short: 'C', label: 'Ceinture', field: 'homme_ceinture' },
        { short: 'Q', label: 'Cuisse', field: 'homme_cuisse' },
        { short: 'P', label: 'Poitrine', field: 'homme_poitrine' },
        { short: 'Cd', label: 'Cou', field: 'homme_corps' },
        { short: 'Tm', label: 'Tour de manche', field: 'homme_tour_manche' }
      );
    }

    return (
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>📏 Mesures {formData.sexe === 'Femme' ? formData.femme_type : 'Homme'}</Text>
        <View style={styles.mesuresGrid}>
          {mesures.map((mesure, index) => (
            <View key={index} style={styles.mesureItem}>
              <Text style={styles.mesureLabelShort}>{mesure.short}</Text>
              <Text style={styles.mesureLabel}>{mesure.label}</Text>
              <TextInput
                style={styles.mesureInput}
                value={formData[mesure.field]}
                onChangeText={t => handleChange(mesure.field, t)}
                keyboardType="numeric"
                placeholder="cm"
                placeholderTextColor="#999"
              />
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>✅ Récapitulatif</Text>
      
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Client</Text>
        <Text style={styles.summaryText}>👤 {formData.prenom} {formData.nom}</Text>
        <Text style={styles.summaryText}>📞 {formData.contact}</Text>
        {formData.email ? <Text style={styles.summaryText}>✉️ {formData.email}</Text> : null}
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Commande</Text>
        <Text style={styles.summaryText}>👔 {formData.sexe} - {formData.sexe === 'Femme' ? formData.femme_type : 'Complet'}</Text>
        <Text style={styles.summaryText}>💰 {formData.prix} FCFA</Text>
        <Text style={styles.summaryText}>🧩 Modèle: {formData.modeleNom || (clientPhotoFile ? 'Photo personnalisée' : 'Non défini')}</Text>
        <Text style={styles.summaryText}>📸 Photo habit: {habitPhotoFile ? 'Ajoutée' : 'Non ajoutée'}</Text>
        {formData.description ? <Text style={styles.summaryText}>📝 {formData.description}</Text> : null}
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Icon name="save" size={24} color="#fff" />
        <Text style={styles.submitButtonText}>Enregistrer</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header avec progression */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouvelle mesure</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Progress Tabs */}
      <View style={styles.progressContainer}>
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <TouchableOpacity
              style={styles.stepIndicator}
              onPress={() => setCurrentStep(step.id)}
              disabled={step.id > currentStep}>
              <View style={[
                styles.stepCircle,
                step.id === currentStep && styles.activeStepCircle,
                step.id < currentStep && styles.completedStepCircle
              ]}>
                {step.id < currentStep ? (
                  <Icon name="check" size={16} color="#fff" />
                ) : (
                  <Text style={[
                    styles.stepNumber,
                    step.id === currentStep && styles.activeStepNumber
                  ]}>{step.id}</Text>
                )}
              </View>
              <Text style={[
                styles.stepTitle,
                step.id === currentStep && styles.activeStepTitle,
                step.id < currentStep && styles.completedStepTitle
              ]}>{step.title}</Text>
            </TouchableOpacity>
            {index < steps.length - 1 && (
              <View style={[
                styles.progressLine,
                index + 1 < currentStep && styles.completedLine
              ]} />
            )}
          </React.Fragment>
        ))}
      </View>

      {/* Contenu de l'étape */}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {renderStep()}
      </ScrollView>

      <Modal visible={showModelsModal} transparent animationType="slide" onRequestClose={() => setShowModelsModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Choisir un modèle existant</Text>
              <TouchableOpacity onPress={() => setShowModelsModal(false)}>
                <Text style={styles.modalClose}>Fermer</Text>
              </TouchableOpacity>
            </View>

            {modelsLoading ? (
              <ActivityIndicator style={{ marginTop: 18 }} />
            ) : (
              <FlatList
                data={models}
                keyExtractor={(item, idx) => String(item?.id || idx)}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.modelItem} onPress={() => chooseExistingModel(item)}>
                    {buildServerFileUrl(item?.photoPath) ? (
                      <Image source={{ uri: buildServerFileUrl(item.photoPath) }} style={styles.modelThumb} />
                    ) : (
                      <View style={[styles.modelThumb, styles.modelThumbFallback]}>
                        <Icon name="image" size={20} color="#888" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modelName}>{item?.nom || 'Modèle'}</Text>
                      <Text style={styles.modelMeta}>{item?.categorie || 'Catégorie non définie'}</Text>
                      {item?.prix ? <Text style={styles.modelPrice}>{item.prix} FCFA</Text> : null}
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={{ color: '#666' }}>Aucun modèle disponible pour cet atelier.</Text>}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Boutons de navigation */}
      <View style={styles.navigationButtons}>
        {currentStep > 1 && (
          <TouchableOpacity style={styles.prevButton} onPress={prevStep}>
            <Icon name="arrow-back-ios" size={16} color="#666" />
            <Text style={styles.prevButtonText}>Précédent</Text>
          </TouchableOpacity>
        )}
        
        {currentStep < steps.length ? (
          <TouchableOpacity 
            style={[styles.nextButton, currentStep === 1 && styles.nextButtonFull]} 
            onPress={nextStep}>
            <Text style={styles.nextButtonText}>Suivant</Text>
            <Icon name="arrow-forward-ios" size={16} color="#fff" />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f3f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  headerRight: {
    width: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  stepIndicator: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e9ecef',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  activeStepCircle: {
    backgroundColor: '#0d6efd',
  },
  completedStepCircle: {
    backgroundColor: '#198754',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  activeStepNumber: {
    color: '#fff',
  },
  stepTitle: {
    fontSize: 11,
    color: '#6c757d',
    textAlign: 'center',
  },
  activeStepTitle: {
    color: '#0d6efd',
    fontWeight: '600',
  },
  completedStepTitle: {
    color: '#198754',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#e9ecef',
    marginHorizontal: 4,
  },
  completedLine: {
    backgroundColor: '#198754',
  },
  scrollContent: {
    padding: 16,
  },
  stepContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  choiceChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    gap: 8,
    backgroundColor: '#fff',
  },
  selectedChip: {
    backgroundColor: '#0d6efd',
    borderColor: '#0d6efd',
  },
  choiceText: {
    fontSize: 14,
    color: '#495057',
  },
  selectedText: {
    color: '#fff',
  },
  mesuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mesureItem: {
    width: (width - 56) / 2,
  },
  mesureLabelShort: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 2,
  },
  mesureLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 6,
  },
  mesureInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  summaryCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 8,
  },
  photoSection: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eef0f2',
  },
  photoSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
    marginBottom: 6,
  },
  photoHint: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#cfe2ff',
    backgroundColor: '#f8fbff',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  photoActionText: {
    color: '#0d6efd',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedModelText: {
    fontSize: 13,
    color: '#198754',
    marginBottom: 6,
    fontWeight: '500',
  },
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 14,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    maxHeight: '82%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  modalClose: {
    color: '#dc3545',
    fontWeight: '600',
  },
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modelThumb: {
    width: 58,
    height: 58,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  modelThumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  modelMeta: {
    fontSize: 12,
    color: '#6b7280',
  },
  modelPrice: {
    fontSize: 12,
    color: '#198754',
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#198754',
    padding: 16,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  navigationButtons: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    gap: 12,
  },
  prevButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: '#f1f3f5',
    borderRadius: 8,
    gap: 4,
  },
  prevButtonText: {
    color: '#495057',
    fontSize: 14,
    fontWeight: '500',
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: '#0d6efd',
    borderRadius: 8,
    gap: 4,
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});