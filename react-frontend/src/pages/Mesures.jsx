import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import api, { getUserData } from '../api/api';
import { buildMediaUrl } from '../config/api';

const CAMERA_CONSTRAINTS = {
  video: {
    facingMode: { ideal: 'environment' },
    width: { ideal: 1280 },
    height: { ideal: 720 }
  },
  audio: false
};

const buildHabitPhotoUrl = (photoPath) => {
  if (!photoPath) return null;
  if (photoPath.startsWith('http')) return photoPath;
  const cleanPath = photoPath.replace(/^\/+/, '').replace('habit_photo/', '');
  return buildMediaUrl(`habit_photo/${cleanPath}`);
};

const createInitialFormData = () => ({
  nom: '',
  prenom: '',
  contact: '',
  adresse: '',
  email: '',
  sexe: '',
  femme_type: '',
  robe_epaule: '',
  robe_manche: '',
  robe_poitrine: '',
  robe_taille: '',
  robe_longueur: '',
  robe_fesse: '',
  robe_tour_manche: '',
  robe_longueur_poitrine: '',
  robe_longueur_taille: '',
  robe_longueur_fesse: '',
  jupe_epaule: '',
  jupe_manche: '',
  jupe_poitrine: '',
  jupe_taille: '',
  jupe_longueur: '',
  jupe_longueur_jupe: '',
  jupe_ceinture: '',
  jupe_fesse: '',
  jupe_tour_manche: '',
  jupe_longueur_poitrine: '',
  jupe_longueur_taille: '',
  jupe_longueur_fesse: '',
  homme_epaule: '',
  homme_manche: '',
  homme_longueur: '',
  homme_longueur_pantalon: '',
  homme_ceinture: '',
  homme_cuisse: '',
  homme_poitrine: '',
  homme_corps: '',
  homme_tour_manche: '',
  selectedModelId: '',
  modeleNom: '',
  genderPreview: 'Femme'
});

const Mesures = () => {
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState([]);
  const [filteredModels, setFilteredModels] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showModels, setShowModels] = useState(false);
  const [activeTab, setActiveTab] = useState('client'); // 'client', 'photo', 'measurements', 'model'
  
  const [formData, setFormData] = useState(createInitialFormData);
  const [photoFile, setPhotoFile] = useState(null);
  const [previewImage, setPreviewImage] = useState('assets/images/model4.jpg');
  const [selectedModel, setSelectedModel] = useState(null);
  
  const [modelsToAdd, setModelsToAdd] = useState([]);
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [habitPhotoFile, setHabitPhotoFile] = useState(null);
  const [habitPreview, setHabitPreview] = useState(null);
  const [showModelPreviewModal, setShowModelPreviewModal] = useState(false);
  const [previewModelData, setPreviewModelData] = useState(null);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [existingClients, setExistingClients] = useState([]);
  const [monthlyModelCounts, setMonthlyModelCounts] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [prefilledClientInfo, setPrefilledClientInfo] = useState(null);
  const [hasPrefilledPreview, setHasPrefilledPreview] = useState(false);

  const fileInputRef = useRef(null);

  const clearHabitPhoto = () => {
    setHabitPhotoFile(null);
    setHabitPreview(prev => {
      if (prev && prev.startsWith('blob:')) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
  };

  const resetFormState = () => {
    setFormData(createInitialFormData());
    setDescription('');
    setPrice('');
    clearHabitPhoto();
    setPhotoFile(null);
    setSelectedModel(null);
    setModelsToAdd([]);
    setPrefilledClientInfo(null);
    setHasPrefilledPreview(false);
    setPreviewImage('assets/images/model4.jpg');
    setActiveTab('client');
  };

  const resetCurrentModelSection = () => {
    setSelectedModel(null);
    setFormData(prev => ({
      ...prev,
      selectedModelId: '',
      modeleNom: ''
    }));
    setPhotoFile(null);
    setPrice('');
    setDescription('');
    clearHabitPhoto();
    setHasPrefilledPreview(false);
    updateAvatar(formData.genderPreview || 'Femme');
  };

  const removeModelItem = (index) => {
    setModelsToAdd(prev => prev.filter((_, idx) => idx !== index));
  };

  const getSortedMesures = (client) => {
    if (!client?.mesures || client.mesures.length === 0) {
      return [];
    }
    return [...client.mesures].sort((a, b) => {
      const aTime = a?.dateMesure ? new Date(a.dateMesure).getTime() : 0;
      const bTime = b?.dateMesure ? new Date(b.dateMesure).getTime() : 0;
      return bTime - aTime;
    });
  };

  const getLatestMesure = (client) => {
    return getSortedMesures(client)[0] || null;
  };

  const closeClientPicker = () => {
    setShowClientPicker(false);
    setClientSearch('');
  };

  const computeMonthlyModelCounts = (clients) => {
    const counts = (clients || []).reduce((acc, client) => {
      if (!Array.isArray(client.mesures)) return acc;
      client.mesures.forEach((mesure) => {
        const dateString = mesure?.dateMesure || mesure?.dateCreation;
        if (!dateString) return;
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return;
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        acc[monthKey] = (acc[monthKey] || 0) + 1;
      });
      return acc;
    }, {});

    return Object.entries(counts)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([monthKey, count]) => {
        const [year, month] = monthKey.split('-').map(Number);
        const monthName = new Date(year, month - 1).toLocaleString('fr-FR', { month: 'long' });
        return {
          monthKey,
          label: `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`,
          count,
          sorties: 0,
        };
      });
  };

  const normalizeMonthlySummary = (items) => {
    return (items || []).map((item) => ({
      monthKey: item.monthKey,
      label: item.label,
      count: item.entrees ?? item.count ?? 0,
      sorties: item.sorties ?? 0,
    }));
  };

  const fetchExistingClients = async () => {
    if (clientsLoading) return;
    setClientsLoading(true);
    try {
      const [clientsRes, syntheseRes] = await Promise.all([
        api.get('/clients'),
        api.get('/clients/synthese-mensuelle').catch(() => ({ data: [] }))
      ]);
      const clients = clientsRes.data || [];
      setExistingClients(clients);
      if (Array.isArray(syntheseRes.data) && syntheseRes.data.length > 0) {
        setMonthlyModelCounts(normalizeMonthlySummary(syntheseRes.data));
      } else {
        setMonthlyModelCounts(computeMonthlyModelCounts(clients));
      }
    } catch (error) {
      console.error('Erreur chargement clients existants:', error);
      Swal.fire('Erreur', 'Impossible de charger les clients existants', 'error');
    } finally {
      setClientsLoading(false);
    }
  };

  const openClientPickerModal = () => {
    setShowClientPicker(true);
    if (!existingClients.length) {
      fetchExistingClients();
    }
  };

  const handleSelectExistingClient = async (client) => {
    if (!client) return;
    const mesures = getSortedMesures(client);
    let latestMesure = mesures[0] || null;

    if (mesures.length > 1) {
      const options = mesures.reduce((acc, mesure, index) => {
        const dateLabel = mesure?.dateMesure ? formatMesureDate(mesure.dateMesure) : 'Date inconnue';
        const typeLabel = mesure?.typeVetement || 'Type inconnu';
        const modeleLabel = mesure?.modeleNom || `Modèle ${index + 1}`;
        acc[String(index)] = `${modeleLabel} - ${typeLabel} (${dateLabel || 'Date inconnue'})`;
        return acc;
      }, {});

      const choice = await Swal.fire({
        title: 'Choisir le modèle à préremplir',
        text: `Ce client a ${mesures.length} modèles enregistrés.`,
        input: 'select',
        inputOptions: options,
        inputValue: '0',
        showCancelButton: true,
        confirmButtonText: 'Utiliser ce modèle',
        cancelButtonText: 'Annuler'
      });

      if (!choice.isConfirmed) return;
      const selectedIndex = Number(choice.value);
      if (!Number.isNaN(selectedIndex) && mesures[selectedIndex]) {
        latestMesure = mesures[selectedIndex];
      }
    }

    const nextData = createInitialFormData();
    const toFieldValue = (value) => (value === null || value === undefined ? '' : `${value}`);

    nextData.nom = client.nom || '';
    nextData.prenom = client.prenom || '';
    nextData.contact = client.contact || '';
    nextData.adresse = client.adresse || '';
    nextData.email = client.email || '';

    const mesureSexe = latestMesure?.sexe || client.sexe;
    if (mesureSexe) {
      nextData.sexe = mesureSexe;
      nextData.genderPreview = mesureSexe === 'Homme' ? 'Homme' : 'Femme';
    }

    let matchedModel = null;
    if (latestMesure) {
      const type = (latestMesure.typeVetement || '').toLowerCase();
      if (nextData.sexe === 'Femme') {
        nextData.femme_type = type === 'jupe' ? 'jupe' : 'robe';
      } else {
        nextData.femme_type = type === 'jupe' || type === 'robe' ? type : '';
      }

      matchedModel = models.find(m => String(m.id) === String(latestMesure.modeleReferenceId));
      nextData.selectedModelId = latestMesure.modeleReferenceId || '';
      nextData.modeleNom = latestMesure.modeleNom || matchedModel?.nom || '';
      if (matchedModel) {
        setSelectedModel(matchedModel);
      }

      if (type === 'robe') {
        nextData.robe_epaule = toFieldValue(latestMesure.epaule);
        nextData.robe_manche = toFieldValue(latestMesure.manche);
        nextData.robe_poitrine = toFieldValue(latestMesure.poitrine);
        nextData.robe_taille = toFieldValue(latestMesure.taille);
        nextData.robe_longueur = toFieldValue(latestMesure.longueur);
        nextData.robe_fesse = toFieldValue(latestMesure.fesse);
        nextData.robe_tour_manche = toFieldValue(latestMesure.tourManche);
        nextData.robe_longueur_poitrine = toFieldValue(latestMesure.longueurPoitrine)
          || toFieldValue(latestMesure.longueurPoitrineRobe);
        nextData.robe_longueur_taille = toFieldValue(latestMesure.longueurTaille)
          || toFieldValue(latestMesure.longueurTailleRobe);
        nextData.robe_longueur_fesse = toFieldValue(latestMesure.longueurFesse)
          || toFieldValue(latestMesure.longueurFesseRobe);
      } else if (type === 'jupe') {
        nextData.jupe_epaule = toFieldValue(latestMesure.epaule);
        nextData.jupe_manche = toFieldValue(latestMesure.manche);
        nextData.jupe_poitrine = toFieldValue(latestMesure.poitrine);
        nextData.jupe_taille = toFieldValue(latestMesure.taille);
        nextData.jupe_longueur = toFieldValue(latestMesure.longueur);
        nextData.jupe_longueur_jupe = toFieldValue(latestMesure.longueurJupe);
        nextData.jupe_ceinture = toFieldValue(latestMesure.ceinture);
        nextData.jupe_fesse = toFieldValue(latestMesure.fesse);
        nextData.jupe_tour_manche = toFieldValue(latestMesure.tourManche);
        nextData.jupe_longueur_poitrine = toFieldValue(latestMesure.longueurPoitrine);
        nextData.jupe_longueur_taille = toFieldValue(latestMesure.longueurTaille);
        nextData.jupe_longueur_fesse = toFieldValue(latestMesure.longueurFesse);
      } else {
        nextData.sexe = 'Homme';
        nextData.genderPreview = 'Homme';
        nextData.femme_type = '';
        nextData.homme_epaule = toFieldValue(latestMesure.epaule);
        nextData.homme_manche = toFieldValue(latestMesure.manche);
        nextData.homme_longueur = toFieldValue(latestMesure.longueur);
        nextData.homme_longueur_pantalon = toFieldValue(latestMesure.longueurPantalon);
        nextData.homme_ceinture = toFieldValue(latestMesure.ceinture || latestMesure.taille);
        nextData.homme_cuisse = toFieldValue(latestMesure.cuisse);
        nextData.homme_poitrine = toFieldValue(latestMesure.poitrine);
        nextData.homme_corps = toFieldValue(latestMesure.corps);
        nextData.homme_tour_manche = toFieldValue(latestMesure.tourManche);
      }
    }

    setFormData(nextData);

    const portraitUrl = latestMesure?.photoPath ? getImageUrl(latestMesure.photoPath) : null;
    if (portraitUrl) {
      setPreviewImage(portraitUrl);
      setHasPrefilledPreview(true);
    } else {
      setHasPrefilledPreview(false);
      updateAvatar(nextData.genderPreview || 'Femme');
    }

    setPhotoFile(null);
    if (!matchedModel) {
      setSelectedModel(null);
    }

    setHabitPhotoFile(null);
    setHabitPreview(prev => {
      if (prev && prev.startsWith('blob:')) {
        URL.revokeObjectURL(prev);
      }
      return latestMesure?.habitPhotoPath ? buildHabitPhotoUrl(latestMesure.habitPhotoPath) : null;
    });

    setPrice(latestMesure?.prix ? String(latestMesure.prix) : '');
    setDescription(latestMesure?.description || '');

    setPrefilledClientInfo({
      id: client.id,
      nomComplet: `${client.prenom || ''} ${client.nom || ''}`.trim() || client.nom || '',
      contact: client.contact || '',
      email: client.email || '',
      lastMesureDate: latestMesure?.dateMesure || null,
      lastMesureType: latestMesure?.typeVetement || ''
    });

    closeClientPicker();
  };

  const clearPrefilledClient = () => {
    setPrefilledClientInfo(null);
  };

  const formatMesureDate = (value) => {
    if (!value) return null;
    try {
      return new Date(value).toLocaleDateString('fr-FR');
    } catch (e) {
      return null;
    }
  };

  const normalizedSearch = clientSearch.trim().toLowerCase();
  const filteredExistingClients = existingClients.filter(client => {
    if (!normalizedSearch) return true;
    const fullName = `${client.prenom || ''} ${client.nom || ''}`.toLowerCase();
    const contactValue = String(client.contact || '').toLowerCase();
    const emailValue = (client.email || '').toLowerCase();
    const mesuresText = (client.mesures || [])
      .map((m) => `${m?.typeVetement || ''} ${m?.modeleNom || ''}`.toLowerCase())
      .join(' ');
    return (
      fullName.includes(normalizedSearch) ||
      contactValue.includes(normalizedSearch) ||
      emailValue.includes(normalizedSearch) ||
      mesuresText.includes(normalizedSearch)
    );
  });

  useEffect(() => {
    fetchModels();
  }, []);

  useEffect(() => {
    if (categoryFilter === 'all') {
      setFilteredModels(models);
    } else {
      setFilteredModels(models.filter(m => m.categorie === categoryFilter));
    }
  }, [categoryFilter, models]);

  useEffect(() => {
    if (!photoFile && !selectedModel && !hasPrefilledPreview) {
      updateAvatar(formData.genderPreview);
    }
  }, [formData.genderPreview, photoFile, selectedModel, hasPrefilledPreview]);

  useEffect(() => {
    if (!formData.sexe) return;
    const expectedPreview = formData.sexe === 'Homme' ? 'Homme' : 'Femme';
    if (formData.genderPreview !== expectedPreview) {
      setFormData(prev => ({
        ...prev,
        genderPreview: expectedPreview
      }));
    }
  }, [formData.sexe, formData.genderPreview]);

  const updateAvatar = (gender) => {
    setHasPrefilledPreview(false);
    if (gender === 'Femme') {
      setPreviewImage('assets/images/model4.jpg');
    } else {
      setPreviewImage('assets/images/model3.jpg');
    }
  };

  const getImageUrl = (photoPath) => {
    if (!photoPath) return 'assets/images/default-model.png';
    if (photoPath.startsWith('http')) return photoPath;
    const clean = photoPath.replace(/^\/+/, '').replace('model_photo/', '');
    return buildMediaUrl(`model_photo/${clean}`);
  };

  const getVideoUrl = (videoPath) => {
    if (!videoPath) return null;
    if (videoPath.startsWith('http')) return videoPath;
    const clean = videoPath.replace(/^\/+/, '').replace('modeles/videos/', '');
    return buildMediaUrl(`modeles/videos/${clean}`);
  };

  const fetchModels = async () => {
    try {
      const userData = getUserData();
      let atelierId = null;

      if (userData) {
        if (userData.atelierId) {
          atelierId = userData.atelierId;
        } else if (userData.id && userData.role === 'ATELIER') {
          atelierId = userData.id;
        }
      }

      if (!atelierId) {
        console.warn('Atelier ID not found');
        return;
      }

      const response = await api.get(`/clients/modeles/atelier/${atelierId}`);
      setModels(response.data);
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGenderChange = (e) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      sexe: value,
      femme_type: value === 'Homme' ? '' : prev.femme_type,
      genderPreview: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewImage(event.target.result);
      };
      reader.readAsDataURL(file);
      setHasPrefilledPreview(false);
      
      setSelectedModel(null);
      setFormData(prev => ({
        ...prev,
        selectedModelId: '',
        modeleNom: ''
      }));
    }
  };

  const capturePhotoWithCamera = async (title) => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      await Swal.fire('Caméra indisponible', 'Votre appareil ne permet pas la capture directe.', 'warning');
      return null;
    }

    let stream = null;
    try {
      const captureResult = await Swal.fire({
        title,
        html: `
          <div style="display:flex;flex-direction:column;gap:10px;align-items:center">
            <video id="swal-camera-video" autoplay playsinline style="width:100%;max-height:360px;background:#000;border:1px solid #ddd;border-radius:6px"></video>
            <small style="color:#666">Placez bien l'image, puis cliquez sur Capturer</small>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Capturer',
        cancelButtonText: 'Annuler',
        didOpen: async () => {
          const video = document.getElementById('swal-camera-video');
          stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
          if (video) {
            video.srcObject = stream;
            await video.play().catch(() => {});
          }
        },
        preConfirm: async () => {
          const video = document.getElementById('swal-camera-video');
          if (!video || !video.videoWidth || !video.videoHeight) {
            Swal.showValidationMessage('Impossible de capturer la photo.');
            return null;
          }

          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          const blob = await (await fetch(dataUrl)).blob();
          return new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
        },
        willClose: () => {
          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            stream = null;
          }
        }
      });

      return captureResult.isConfirmed ? captureResult.value : null;
    } catch (error) {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      await Swal.fire('Erreur caméra', 'Impossible d\'ouvrir la caméra.', 'error');
      return null;
    }
  };

  const openModelPhotoUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const openModelPhotoCamera = async () => {
    const file = await capturePhotoWithCamera('Prendre une photo du modèle');
    if (!file) return;

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewImage(event.target.result);
    };
    reader.readAsDataURL(file);
    setHasPrefilledPreview(false);

    setSelectedModel(null);
    setFormData(prev => ({
      ...prev,
      selectedModelId: '',
      modeleNom: ''
    }));
  };

  const openHabitPhotoCamera = async () => {
    const file = await capturePhotoWithCamera('Prendre une photo de l\'habit');
    if (!file) return;

    setHabitPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => setHabitPreview(event.target.result);
    reader.readAsDataURL(file);
  };

  const handleModelClick = (model) => {
    setPreviewModelData(model);
    setShowModelPreviewModal(true);
  };

  const confirmModelSelection = () => {
    if (previewModelData) {
      setSelectedModel(previewModelData);
      setFormData(prev => ({
        ...prev,
        selectedModelId: previewModelData.id,
        modeleNom: previewModelData.nom
      }));
      
      setPreviewImage(getImageUrl(previewModelData.photoPath));
      setHasPrefilledPreview(false);
      setPhotoFile(null);
      setShowModelPreviewModal(false);
      
      Swal.fire({
        icon: 'success',
        title: 'Modèle sélectionné',
        text: `Modèle "${previewModelData.nom}" sélectionné`,
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    }
  };

  const validateForm = () => {
    const errors = [];
    if (!formData.nom.trim()) errors.push("Le champ Nom est obligatoire.");
    if (!formData.prenom.trim()) errors.push("Le champ Prénom est obligatoire.");
    if (!formData.contact.trim()) errors.push("Le champ Contact est obligatoire.");
    if (formData.contact && !/^\d{8}$/.test(formData.contact)) errors.push("Le contact doit contenir exactement 8 chiffres.");
    if (!formData.sexe) errors.push("Le champ Sexe est obligatoire.");

    if (formData.sexe === 'Femme' && !formData.femme_type) {
      errors.push("Veuillez sélectionner un type de vêtement (Robe ou Jupe).");
    }
    
    return errors;
  };

  const handleAddModelToClient = () => {
    const errors = validateForm();
    if (errors.length > 0) {
      Swal.fire({
        icon: 'error',
        title: 'Erreur de validation',
        html: errors.join('<br>'),
      });
      return;
    }

    const requiredMeasurements = formData.sexe === 'Femme'
      ? formData.femme_type === 'jupe'
        ? ['jupe_epaule', 'jupe_manche', 'jupe_poitrine', 'jupe_taille', 'jupe_longueur', 'jupe_longueur_jupe', 'jupe_ceinture', 'jupe_fesse']
        : ['robe_epaule', 'robe_manche', 'robe_poitrine', 'robe_taille', 'robe_longueur', 'robe_fesse']
      : ['homme_epaule', 'homme_manche', 'homme_longueur', 'homme_longueur_pantalon', 'homme_ceinture', 'homme_cuisse'];

    const missingFields = requiredMeasurements.filter(field => !formData[field]);
    if (missingFields.length > 0) {
      Swal.fire({
        icon: 'error',
        title: 'Mesures manquantes',
        text: 'Veuillez remplir toutes les mesures obligatoires pour ce modèle.',
      });
      return;
    }

    const item = {
      selectedModelId: formData.selectedModelId || null,
      modeleNom: formData.modeleNom || (selectedModel ? selectedModel.nom : ''),
      sexe: formData.sexe,
      typeVetement: formData.sexe === 'Femme' ? formData.femme_type : 'homme',
      prix: price ? String(price) : '',
      description,
      robe_epaule: formData.robe_epaule,
      robe_manche: formData.robe_manche,
      robe_poitrine: formData.robe_poitrine,
      robe_taille: formData.robe_taille,
      robe_longueur: formData.robe_longueur,
      robe_fesse: formData.robe_fesse,
      robe_tour_manche: formData.robe_tour_manche,
      robe_longueur_poitrine: formData.robe_longueur_poitrine,
      robe_longueur_taille: formData.robe_longueur_taille,
      robe_longueur_fesse: formData.robe_longueur_fesse,
      jupe_epaule: formData.jupe_epaule,
      jupe_manche: formData.jupe_manche,
      jupe_poitrine: formData.jupe_poitrine,
      jupe_taille: formData.jupe_taille,
      jupe_longueur: formData.jupe_longueur,
      jupe_longueur_jupe: formData.jupe_longueur_jupe,
      jupe_ceinture: formData.jupe_ceinture,
      jupe_fesse: formData.jupe_fesse,
      jupe_tour_manche: formData.jupe_tour_manche,
      jupe_longueur_poitrine: formData.jupe_longueur_poitrine,
      jupe_longueur_taille: formData.jupe_longueur_taille,
      jupe_longueur_fesse: formData.jupe_longueur_fesse,
      homme_epaule: formData.homme_epaule,
      homme_manche: formData.homme_manche,
      homme_longueur: formData.homme_longueur,
      homme_longueur_pantalon: formData.homme_longueur_pantalon,
      homme_ceinture: formData.homme_ceinture,
      homme_cuisse: formData.homme_cuisse,
      homme_poitrine: formData.homme_poitrine,
      homme_corps: formData.homme_corps,
      homme_tour_manche: formData.homme_tour_manche,
      photoFile: photoFile || null,
      habitPhotoFile,
    };

    setModelsToAdd(prev => [...prev, item]);
    Swal.fire({
      icon: 'success',
      title: 'Vêtement ajouté',
      text: 'Le vêtement a été ajouté au client.',
      timer: 1800,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });

    resetCurrentModelSection();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (errors.length > 0) {
      Swal.fire({
        icon: 'error',
        title: 'Erreur de validation',
        html: errors.join('<br>'),
      });
      return;
    }

    if (modelsToAdd.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Vêtement requis',
        text: 'Au moins un vêtement doit être ajouté au client avant l\'enregistrement.',
      });
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      const clientFields = ['nom', 'prenom', 'contact', 'adresse', 'email', 'sexe', 'genderPreview', 'femme_type'];
      clientFields.forEach(key => {
        if (formData[key] !== null && formData[key] !== undefined) {
          data.append(key, formData[key]);
        }
      });

      const photoFiles = [];
      const habitFiles = [];
      const mesurePayload = modelsToAdd.map(item => {
        const payload = { ...item };
        if (item.photoFile) {
          payload.photoIndex = photoFiles.length;
          photoFiles.push(item.photoFile);
        } else {
          payload.photoIndex = -1;
        }
        if (item.habitPhotoFile) {
          payload.habitPhotoIndex = habitFiles.length;
          habitFiles.push(item.habitPhotoFile);
        } else {
          payload.habitPhotoIndex = -1;
        }
        delete payload.photoFile;
        delete payload.habitPhotoFile;
        return payload;
      });

      data.append('mesuresJson', JSON.stringify(mesurePayload));
      photoFiles.forEach(file => data.append('photos', file));
      habitFiles.forEach(file => data.append('habitPhotos', file));

      const response = await api.post('/clients/ajouter', data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const rendezVousAuto = response?.data?.rendezVousAuto;
      const rendezVousAutoDate = response?.data?.rendezVousAutoDate;
      const rendezVousAutoType = response?.data?.rendezVousAutoType;
      const rendezVousAutoDecale = response?.data?.rendezVousAutoDecale;

      let successHtml = 'Client et vêtements enregistrés avec succès';
      if (rendezVousAuto && rendezVousAutoDate) {
        const formattedDate = new Date(rendezVousAutoDate).toLocaleString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        successHtml += `<br><br><strong>Rendez-vous automatique :</strong> ${rendezVousAutoType || 'LIVRAISON DE L\'HABIT'}<br><strong>Date :</strong> ${formattedDate}`;
        if (rendezVousAutoDecale) {
          successHtml += '<br><span class="text-warning">Le créneau initial de 10:00 étant occupé, le rendez-vous a été décalé automatiquement.</span>';
        }
      }

      Swal.fire({
        icon: 'success',
        title: 'Succès',
        html: successHtml,
        timer: 2500,
        showConfirmButton: false
      });

      resetFormState();
    } catch (error) {
      console.error('Submission error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: error.response?.data?.message || "Une erreur est survenue lors de l'enregistrement.",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderMeasureInput = (shortLabel, description, name, required = false) => (
    <div className="col-md-6 mb-3">
      <label className="form-label">
        <span className="fw-bold">{shortLabel}</span>
        <br />
        <small className="text-muted">{description}</small>
        {required && <span className="text-danger"> *</span>}
      </label>
      <input 
        type="text" 
        className="form-control" 
        name={name} 
        value={formData[name]} 
        onChange={handleInputChange} 
      />
    </div>
  );

  // Vérifier si l'onglet peut être activé
  const canActivateTab = (tabName) => {
    if (tabName === 'client') return true;
    if (tabName === 'photo') {
      return formData.sexe && formData.nom && formData.prenom && formData.contact;
    }
    if (tabName === 'measurements') {
      return formData.sexe && formData.nom && formData.prenom && formData.contact;
    }
    if (tabName === 'model') {
      return formData.sexe && formData.nom && formData.prenom && formData.contact;
    }
    return true;
  };

  return (
    <>
      <div className="page-header">
        <div className="container-fluid">
          <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
            <div className="breadcrumb-title pe-3">Mesure</div>
            <div className="ps-3">
              <nav aria-label="breadcrumb">
                <ol className="breadcrumb mb-0 p-0">
                  <li className="breadcrumb-item"><Link to="/"><i className="bx bx-home-alt"></i></Link></li>
                  <li className="breadcrumb-item active" aria-current="page">Prise de mesure</li>
                </ol>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="instructions p-3 bg-light border-bottom">
          <h5><i className="fas fa-info-circle me-2"></i>Instructions</h5>
          <p className="mb-0">Remplissez toutes les étapes dans l'ordre. Les champs marqués d'un astérisque (<span className="text-danger">*</span>) sont obligatoires.</p>
        </div>

        {/* Onglets Bootstrap */}
       <style jsx>{`
  .nav-tabs-elegant {
    border-bottom: 1px solid #e0e0e0;
    background: linear-gradient(to bottom, #f8f9fa, #ffffff);
    border-radius: 10px 10px 0 0;
    padding: 0 10px;
  }
  
  .nav-tabs-elegant .nav-link {
    border: none;
    color: #6c757d;
    font-weight: 500;
    padding: 12px 24px;
    transition: all 0.3s ease;
    position: relative;
    background: transparent;
    margin: 0 5px;
  }
  
  .nav-tabs-elegant .nav-link:hover {
    color: #007bff;
    background: rgba(0, 123, 255, 0.05);
    border-radius: 8px 8px 0 0;
  }
  
  .nav-tabs-elegant .nav-link.active {
    color: #007bff;
    background: white;
  }
  
  .nav-tabs-elegant .nav-link.active::before {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #007bff, #00c6ff);
    border-radius: 3px;
    animation: slideWidth 0.3s ease;
  }
  
  @keyframes slideWidth {
    from {
      width: 0;
      left: 50%;
    }
    to {
      width: 100%;
      left: 0;
    }
  }
  
  .nav-tabs-elegant .nav-link i {
    margin-right: 8px;
    font-size: 1.1rem;
    transition: transform 0.2s ease;
  }
  
  .nav-tabs-elegant .nav-link:hover i {
    transform: translateY(-2px);
  }
  
  .nav-tabs-elegant .nav-link.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    color: #adb5bd;
  }
  
  .nav-tabs-elegant .nav-link.disabled:hover {
    background: transparent;
    transform: none;
  }
  
  @media (max-width: 768px) {
    .nav-tabs-elegant .nav-link {
      padding: 8px 12px;
      font-size: 12px;
    }
  }
`}</style>

<ul className="nav nav-tabs nav-tabs-elegant nav-justified" role="tablist">
  <li className="nav-item" role="presentation">
    <button 
      className={`nav-link ${activeTab === 'client' ? 'active' : ''} ${!canActivateTab('client') ? 'disabled' : ''}`}
      onClick={() => canActivateTab('client') && setActiveTab('client')}
      type="button"
      role="tab"
    >
      <i className="fas fa-user me-2"></i>
      Étape 1 : Client
    </button>
  </li>
  <li className="nav-item" role="presentation">
    <button 
      className={`nav-link ${activeTab === 'photo' ? 'active' : ''} ${!canActivateTab('photo') ? 'disabled' : ''}`}
      onClick={() => canActivateTab('photo') && setActiveTab('photo')}
      type="button"
      role="tab"
    >
      <i className="fas fa-camera me-2"></i>
      Étape 2 : Photo & Modèle
    </button>
  </li>
  <li className="nav-item" role="presentation">
    <button 
      className={`nav-link ${activeTab === 'measurements' ? 'active' : ''} ${!canActivateTab('measurements') ? 'disabled' : ''}`}
      onClick={() => canActivateTab('measurements') && setActiveTab('measurements')}
      type="button"
      role="tab"
    >
      <i className="fas fa-ruler-combined me-2"></i>
      Étape 3 : Mesures
    </button>
  </li>
  <li className="nav-item" role="presentation">
    <button 
      className={`nav-link ${activeTab === 'model' ? 'active' : ''} ${!canActivateTab('model') ? 'disabled' : ''}`}
      onClick={() => canActivateTab('model') && setActiveTab('model')}
      type="button"
      role="tab"
    >
      <i className="fas fa-tshirt me-2"></i>
      Étape 4 : Confirmation
    </button>
  </li>
</ul>

        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="tab-content pt-4">
            {/* Onglet 1 : Informations Client */}
            <div className={`tab-pane fade ${activeTab === 'client' ? 'show active' : ''}`}>
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-4">
                <div className="text-muted">
                  Sélectionnez un client existant pour pré-remplir les informations ou créez-en un nouveau.
                </div>
                <button type="button" className="btn btn-outline-primary" onClick={openClientPickerModal}>
                  <i className="bx bx-user-plus me-1"></i> Sélectionner un client existant
                </button>
              </div>

              {monthlyModelCounts.length > 0 && (
                <div className="row mb-3">
                  <div className="col-12">
                    <div className="card border-secondary bg-light">
                      <div className="card-body py-2 px-3">
                        <div className="d-flex flex-wrap align-items-center gap-2">
                          <strong className="text-secondary">Synthèse du mois :</strong>
                          {monthlyModelCounts.map(item => (
                            <span key={item.monthKey} className="badge bg-white border text-dark py-2 px-3">
                              <div className="fw-semibold">{item.label}</div>
                              <small>Entrée: {item.count} habit{item.count > 1 ? 's' : ''}</small>
                              <br />
                              <small>Sortie: {item.sorties || 0} habit{(item.sorties || 0) > 1 ? 's' : ''}</small>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {prefilledClientInfo && (
                <div className="alert alert-info d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
                  <div>
                    <strong>Client sélectionné :</strong> {prefilledClientInfo.nomComplet || '—'}
                    {prefilledClientInfo.contact && (
                      <span className="ms-2">• {prefilledClientInfo.contact}</span>
                    )}
                    {prefilledClientInfo.lastMesureDate && formatMesureDate(prefilledClientInfo.lastMesureDate) && (
                      <span className="ms-2 text-muted">
                        Dernière mesure le {formatMesureDate(prefilledClientInfo.lastMesureDate)}
                        {prefilledClientInfo.lastMesureType && ` · ${prefilledClientInfo.lastMesureType}`}
                      </span>
                    )}
                  </div>
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-sm btn-outline-dark" onClick={clearPrefilledClient}>
                      Effacer la sélection
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={resetFormState}>
                      Tout réinitialiser
                    </button>
                  </div>
                </div>
              )}

              <div className="form-section">
                <h5 className="border-bottom pb-2 mb-3"><i className="fas fa-user me-2"></i> Informations Générales</h5>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Nom <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" name="nom" value={formData.nom} onChange={handleInputChange} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Prénom <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" name="prenom" value={formData.prenom} onChange={handleInputChange} />
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Contact <span className="text-danger">*</span></label>
                    <input type="tel" className="form-control" name="contact" value={formData.contact} onChange={handleInputChange} placeholder="Ex: 76XXXXXXX" />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Adresse ou Localité</label>
                    <input type="text" className="form-control" name="adresse" value={formData.adresse} onChange={handleInputChange} />
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Email <small className="text-muted">(optionnel)</small></label>
                    <input type="email" className="form-control" name="email" value={formData.email} onChange={handleInputChange} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Sexe <span className="text-danger">*</span></label>
                    <select className="form-select" name="sexe" value={formData.sexe} onChange={handleGenderChange}>
                      <option value="">-- Sélectionner --</option>
                      <option value="Femme">Femme</option>
                      <option value="Homme">Homme</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-end">
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={() => canActivateTab('photo') && setActiveTab('photo')}
                  disabled={!canActivateTab('photo')}
                >
                  Étape suivante : Photo & Modèle <i className="fas fa-arrow-right ms-2"></i>
                </button>
              </div>
            </div>

            {/* Onglet 2 : Photo du client et sélection modèle */}
            <div className={`tab-pane fade ${activeTab === 'photo' ? 'show active' : ''}`}>
              <div className="row">
                <div className="col-md-6">
                  <div className="d-flex flex-column align-items-center text-center">
                    <div className="image-preview-container mb-3 position-relative" style={{ cursor: 'pointer' }}>
                      <img 
                        src={previewImage} 
                        onClick={openModelPhotoUpload}
                        className="img-fluid rounded" 
                        alt="Modèle" 
                        style={{ maxHeight: '300px', objectFit: 'cover', width: '100%' }}
                        onError={(e) => { e.target.src = 'assets/images/default-model.png'; }}
                      />
                      <div className="overlay-text position-absolute top-50 start-50 translate-middle text-white bg-dark bg-opacity-50 p-2 rounded" style={{ pointerEvents: 'none' }}>
                        Cliquer pour ajouter une photo
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*" 
                        style={{ display: 'none' }} 
                      />
                    </div>

                    <div className="d-flex flex-wrap gap-2 justify-content-center mb-3">
                      <button type="button" className="btn btn-outline-primary btn-sm" onClick={openModelPhotoCamera}>
                        <i className="fas fa-camera me-1"></i> Prendre photo du modèle
                      </button>
                    </div>

                    <div className="mt-3">
                      <div className="form-check form-check-inline">
                        <input 
                          className="form-check-input" 
                          type="radio" 
                          name="genderPreview" 
                          id="previewFemale" 
                          value="Femme" 
                          checked={formData.genderPreview === 'Femme'}
                          onChange={(e) => setFormData({...formData, genderPreview: e.target.value})}
                        />
                        <label className="form-check-label" htmlFor="previewFemale">Femme</label>
                      </div>
                      <div className="form-check form-check-inline">
                        <input 
                          className="form-check-input" 
                          type="radio" 
                          name="genderPreview" 
                          id="previewMale" 
                          value="Homme" 
                          checked={formData.genderPreview === 'Homme'}
                          onChange={(e) => setFormData({...formData, genderPreview: e.target.value})}
                        />
                        <label className="form-check-label" htmlFor="previewMale">Homme</label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="existing-models-section">
                    <button 
                      className="btn btn-light w-100 d-flex justify-content-between align-items-center mb-3" 
                      type="button" 
                      onClick={() => setShowModels(!showModels)}
                    >
                      <h6 className="mb-0">Choisir un modèle existant</h6>
                      <i className={`bx ${showModels ? 'bx-chevron-up' : 'bx-chevron-down'}`}></i>
                    </button>

                    {showModels && (
                      <div className="card card-body p-2">
                        <div className="mb-3">
                          <label className="form-label small">Catégorie:</label>
                          <select 
                            className="form-select form-select-sm" 
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                          >
                            <option value="all">Toutes les catégories</option>
                            <option value="ROBE">Robe</option>
                            <option value="JUPE">Jupe</option>
                            <option value="HOMME">Vêtement Homme</option>
                            <option value="ENFANT">Vêtement Enfant</option>
                            <option value="AUTRE">Autre</option>
                          </select>
                        </div>

                        <div className="models-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                          {filteredModels.length === 0 ? (
                            <div className="text-center py-3 col-span-2">Aucun modèle trouvé</div>
                          ) : (
                            filteredModels.map(model => (
                              <div 
                                key={model.id} 
                                className={`model-card border rounded p-2 ${selectedModel?.id === model.id ? 'border-primary bg-light' : ''}`}
                                onClick={() => handleModelClick(model)}
                                style={{ cursor: 'pointer' }}
                              >
                                <img 
                                  src={getImageUrl(model.photoPath)}
                                  className="img-fluid mb-2 rounded"
                                  style={{ height: '80px', width: '100%', objectFit: 'cover' }}
                                  onError={(e) => { e.target.src = 'assets/images/default-model.png'; }}
                                  alt={model.nom}
                                />
                                <div className="small text-truncate fw-bold">{model.nom}</div>
                                {model.prix && <div className="small text-success">{model.prix} FCFA</div>}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 d-flex justify-content-between">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setActiveTab('client')}
                >
                  <i className="fas fa-arrow-left me-2"></i> Étape précédente
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={() => canActivateTab('measurements') && setActiveTab('measurements')}
                  disabled={!canActivateTab('measurements')}
                >
                  Étape suivante : Mesures <i className="fas fa-arrow-right ms-2"></i>
                </button>
              </div>
            </div>

            {/* Onglet 3 : Mesures détaillées */}
            <div className={`tab-pane fade ${activeTab === 'measurements' ? 'show active' : ''}`}>
              {/* Femme Options */}
              {formData.sexe === 'Femme' && (
                <div className="form-section mb-4">
                  <h5 className="border-bottom pb-2 mb-3"><i className="fas fa-tshirt me-2"></i> Type de vêtement <span className="text-danger">*</span></h5>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <div 
                        className={`card p-3 cursor-pointer ${formData.femme_type === 'robe' ? 'border-primary bg-light' : ''}`}
                        onClick={() => setFormData({...formData, femme_type: 'robe'})}
                        style={{ cursor: 'pointer' }}
                      >
                        <h6><i className="fas fa-vest me-2"></i> Option Robe</h6>
                        <p className="small text-muted">Sélectionnez cette option pour les mesures de robe</p>
                        <div className="form-check">
                          <input 
                            className="form-check-input" 
                            type="radio" 
                            name="femme_type" 
                            checked={formData.femme_type === 'robe'} 
                            onChange={() => setFormData({...formData, femme_type: 'robe'})}
                          />
                          <label className="form-check-label">Choisir cette option</label>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <div 
                        className={`card p-3 cursor-pointer ${formData.femme_type === 'jupe' ? 'border-primary bg-light' : ''}`}
                        onClick={() => setFormData({...formData, femme_type: 'jupe'})}
                        style={{ cursor: 'pointer' }}
                      >
                        <h6><i className="fas fa-skating me-2"></i> Option Jupe</h6>
                        <p className="small text-muted">Sélectionnez cette option pour les mesures de jupe</p>
                        <div className="form-check">
                          <input 
                            className="form-check-input" 
                            type="radio" 
                            name="femme_type" 
                            checked={formData.femme_type === 'jupe'} 
                            onChange={() => setFormData({...formData, femme_type: 'jupe'})}
                          />
                          <label className="form-check-label">Choisir cette option</label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Mesures Robe */}
              {formData.sexe === 'Femme' && formData.femme_type === 'robe' && (
                <div className="form-section mb-4">
                  <h5 className="border-bottom pb-2 mb-3"><i className="fas fa-ruler-combined me-2"></i> Mesures pour Robe</h5>
                  <div className="row">
                    {renderMeasureInput('E', 'Épaule', 'robe_epaule', true)}
                    {renderMeasureInput('M', 'Manche', 'robe_manche', true)}
                  </div>
                  <div className="row">
                    {renderMeasureInput('P', 'Poitrine', 'robe_poitrine', true)}
                    {renderMeasureInput('T', 'Taille', 'robe_taille', true)}
                  </div>
                  <div className="row">
                    {renderMeasureInput('LR', 'Longueur robe', 'robe_longueur', true)}
                    {renderMeasureInput('F', 'Fesse', 'robe_fesse', true)}
                  </div>
                  <div className="row">
                    {renderMeasureInput('Tm', 'Tour de manche', 'robe_tour_manche')}
                    {renderMeasureInput('Lp', 'Longueur de poitrine', 'robe_longueur_poitrine')}
                  </div>
                  <div className="row">
                    {renderMeasureInput('Lt', 'Longueur de taille', 'robe_longueur_taille')}
                    {renderMeasureInput('Lf', 'Longueur de fesse', 'robe_longueur_fesse')}
                  </div>
                </div>
              )}

              {/* Mesures Jupe */}
              {formData.sexe === 'Femme' && formData.femme_type === 'jupe' && (
                <div className="form-section mb-4">
                  <h5 className="border-bottom pb-2 mb-3"><i className="fas fa-ruler-combined me-2"></i> Mesures pour Jupe</h5>
                  <div className="row">
                    {renderMeasureInput('E', 'Épaule', 'jupe_epaule', true)}
                    {renderMeasureInput('M', 'Manche', 'jupe_manche', true)}
                  </div>
                  <div className="row">
                    {renderMeasureInput('P', 'Poitrine', 'jupe_poitrine', true)}
                    {renderMeasureInput('T', 'Taille', 'jupe_taille', true)}
                  </div>
                  <div className="row">
                    {renderMeasureInput('L', 'Longueur', 'jupe_longueur', true)}
                    {renderMeasureInput('LJ', 'Longueur jupe', 'jupe_longueur_jupe', true)}
                  </div>
                  <div className="row">
                    {renderMeasureInput('C', 'Ceinture', 'jupe_ceinture', true)}
                    {renderMeasureInput('F', 'Fesse', 'jupe_fesse', true)}
                  </div>
                  <div className="row">
                    {renderMeasureInput('TM', 'Tour de manche', 'jupe_tour_manche')}
                    {renderMeasureInput('LP', 'Longueur de poitrine', 'jupe_longueur_poitrine')}
                  </div>
                  <div className="row">
                    {renderMeasureInput('Lt', 'Longueur de taille', 'jupe_longueur_taille')}
                    {renderMeasureInput('Lf', 'Longueur de fesse', 'jupe_longueur_fesse')}
                  </div>
                </div>
              )}

              {/* Mesures Homme */}
              {formData.sexe === 'Homme' && (
                <div className="form-section mb-4">
                  <h5 className="border-bottom pb-2 mb-3"><i className="fas fa-ruler-combined me-2"></i> Mesures pour Homme</h5>
                  <div className="row">
                    {renderMeasureInput('E', 'Épaule', 'homme_epaule', true)}
                    {renderMeasureInput('M', 'Manche', 'homme_manche', true)}
                  </div>
                  <div className="row">
                    {renderMeasureInput('L', 'Longueur', 'homme_longueur', true)}
                    {renderMeasureInput('Lp', 'Longueur pantalon', 'homme_longueur_pantalon', true)}
                  </div>
                  <div className="row">
                    {renderMeasureInput('C', 'Ceinture', 'homme_ceinture', true)}
                    {renderMeasureInput('Q', 'Cuisse', 'homme_cuisse', true)}
                  </div>
                  <div className="row">
                    {renderMeasureInput('P', 'Poitrine', 'homme_poitrine')}
                    {renderMeasureInput('Cd', 'Cou', 'homme_corps')}
                  </div>
                  <div className="row">
                    {renderMeasureInput('Tm', 'Tour de manche', 'homme_tour_manche')}
                  </div>
                </div>
              )}

              <div className="mt-4 d-flex justify-content-between">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setActiveTab('photo')}
                >
                  <i className="fas fa-arrow-left me-2"></i> Étape précédente
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={() => canActivateTab('model') && setActiveTab('model')}
                  disabled={!canActivateTab('model')}
                >
                  Étape suivante : Confirmation <i className="fas fa-arrow-right ms-2"></i>
                </button>
              </div>
            </div>

            {/* Onglet 4 : Détails du modèle et confirmation */}
            <div className={`tab-pane fade ${activeTab === 'model' ? 'show active' : ''}`}>
              <div className="form-section mb-4">
                <h5 className="border-bottom pb-2 mb-3"><i className="fas fa-tag me-2"></i> Détails du modèle</h5>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Prix du modèle (FCFA) <small className="text-muted">(optionnel)</small></label>
                    <input
                      type="number"
                      className="form-control"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="Entrez le prix en FCFA si disponible"
                      min="0"
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Photo de l'habit (caméra directe) <small className="text-muted">(optionnelle)</small></label>
                    <div className="d-flex flex-wrap gap-2">
                      <button type="button" className="btn btn-outline-primary btn-sm" onClick={openHabitPhotoCamera}>
                        <i className="fas fa-camera me-1"></i> Prendre photo directe
                      </button>
                    </div>
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-12 mb-3">
                    <label className="form-label">Description <small className="text-muted">(optionnel)</small></label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ajouter une description ou note pour ce modèle..."
                    />
                  </div>
                </div>
                {habitPreview && (
                  <div className="row mb-3">
                    <div className="col-md-12 text-center">
                      <img
                        src={habitPreview}
                        alt="Aperçu de l'habit"
                        className="img-fluid rounded border"
                        style={{ maxHeight: '220px', objectFit: 'cover' }}
                      />
                    </div>
                  </div>
                )}
                <div className="row mb-3">
                  <div className="col-md-12 text-end">
                    <button
                      type="button"
                      className="btn btn-primary px-4 py-2 fw-semibold shadow-sm"
                      onClick={handleAddModelToClient}
                    >
                      <i className="fas fa-check-circle me-2"></i> Ajouter ce vêtement au client
                    </button>
                  </div>
                </div>
              </div>

              {modelsToAdd.length > 0 && (
                <div className="card mb-4">
                  <div className="card-body">
                    <h5 className="mb-3">Vêtements ajoutés ({modelsToAdd.length})</h5>
                    <div className="list-group">
                      {modelsToAdd.map((item, index) => (
                        <div key={index} className="list-group-item d-flex justify-content-between align-items-start gap-3">
                          <div>
                            <div className="fw-semibold">{item.modeleNom || `Modèle ${index + 1}`}</div>
                            <div className="small text-muted">
                              {item.typeVetement ? `${item.typeVetement.toUpperCase()} •` : ''} {item.sexe}
                            </div>
                            <div className="small text-success">{item.prix ? `${item.prix} FCFA` : 'Prix à définir'}</div>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeModelItem(index)}>
                              Supprimer
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-end">
                      <strong>Total:</strong> {modelsToAdd.reduce((sum, item) => sum + Number(item.prix || 0), 0)} FCFA
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 d-flex justify-content-between">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setActiveTab('measurements')}
                >
                  <i className="fas fa-arrow-left me-2"></i> Étape précédente
                </button>
                <button type="submit" className="btn btn-primary px-4" disabled={loading}>
                  {loading ? <i className="fas fa-spinner fa-spin me-2"></i> : <i className="fas fa-save me-2"></i>}
                  Enregistrer le client
                </button>
              </div>
            </div>
            </div>
          </form>
        </div>
      </div>

      {/* Existing Client Picker Modal */}
      {showClientPicker && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Sélectionner un client existant</h5>
                <button type="button" className="btn-close" onClick={closeClientPicker}></button>
              </div>
              <div className="modal-body">
                <div className="row g-2 mb-3">
                  <div className="col-md-8">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Rechercher par nom, contact ou email..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                    />
                  </div>
                  <div className="col-md-4 d-grid d-md-flex justify-content-md-end">
                    <button type="button" className="btn btn-outline-secondary w-100" onClick={fetchExistingClients}>
                      <i className="bx bx-refresh me-1"></i> Actualiser
                    </button>
                  </div>
                </div>

                {monthlyModelCounts.length > 0 && (
                  <div className="row mb-3">
                    <div className="col-12">
                      <div className="bg-light border rounded p-3">
                        <div className="fw-semibold mb-2">Synthèse du mois</div>
                        <div className="d-flex flex-wrap gap-2">
                          {monthlyModelCounts.map(item => (
                            <div key={item.monthKey} className="badge bg-white border text-dark py-2 px-3">
                              <div>{item.label}</div>
                              <small>Entrée: {item.count} habit{item.count > 1 ? 's' : ''}</small>
                              <br />
                              <small>Sortie: {item.sorties || 0} habit{(item.sorties || 0) > 1 ? 's' : ''}</small>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {clientsLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Chargement...</span>
                    </div>
                  </div>
                ) : filteredExistingClients.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    Aucun client trouvé. Essayez un autre critère ou créez un nouveau client.
                  </div>
                ) : (
                  <div className="list-group" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {filteredExistingClients.map(client => {
                      const lastMesure = getLatestMesure(client);
                      return (
                        <div key={client.id} className="list-group-item list-group-item-action">
                          <div className="d-flex justify-content-between align-items-start gap-3">
                            <div>
                              <div className="fw-semibold">{client.prenom} {client.nom}</div>
                              <div className="text-muted small">{client.contact || '—'} • {client.email || '—'}</div>
                              <div className="small text-muted">Modèles enregistrés : {Array.isArray(client.mesures) ? client.mesures.length : 0}</div>
                              {lastMesure && (
                                <div className="small mt-1">
                                  Dernier modèle : <strong>{lastMesure.typeVetement || 'N/A'}</strong>
                                  {lastMesure.dateMesure && (
                                    <span className="ms-1 text-muted">({formatMesureDate(lastMesure.dateMesure)})</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => handleSelectExistingClient(client)}
                            >
                              Utiliser ces informations
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeClientPicker}>Fermer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Model Preview Modal */}
      {showModelPreviewModal && previewModelData && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Détails du modèle</h5>
                <button type="button" className="btn-close" onClick={() => setShowModelPreviewModal(false)}></button>
              </div>
              <div className="modal-body text-center">
                {previewModelData.videoPath ? (
                  <video
                    src={getVideoUrl(previewModelData.videoPath)}
                    className="img-fluid rounded mb-3"
                    controls
                    style={{ maxHeight: '400px' }}
                    onError={(e) => {
                      const img = document.createElement('img');
                      img.src = getImageUrl(previewModelData.photoPath);
                      img.className = 'img-fluid rounded mb-3';
                      img.style.maxHeight = '400px';
                      e.target.replaceWith(img);
                    }}
                  />
                ) : (
                  <img 
                    src={getImageUrl(previewModelData.photoPath)}
                    className="img-fluid rounded mb-3" 
                    alt="Modèle" 
                    style={{ maxHeight: '400px' }}
                    onError={(e) => { e.target.src = 'assets/images/default-model.png'; }}
                  />
                )}
                <h6>{previewModelData.nom}</h6>
                <p className="text-muted small">{previewModelData.description || 'Modèle de l\'atelier'}</p>
                <div className="model-details">
                  <span className="badge bg-primary me-1">{previewModelData.categorie || 'Non spécifiée'}</span>
                  <span className="badge bg-secondary">{previewModelData.prix ? `${previewModelData.prix} FCFA` : 'Non spécifié'}</span>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModelPreviewModal(false)}>Fermer</button>
                <button type="button" className="btn btn-primary" onClick={confirmModelSelection}>Sélectionner ce modèle</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Mesures;