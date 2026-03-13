import React, { useState, useEffect, useRef } from 'react';
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
  
  // Form State - Initialized with all fields to avoid uncontrolled input warnings
  const [formData, setFormData] = useState(createInitialFormData);

  const [photoFile, setPhotoFile] = useState(null);
  const [previewImage, setPreviewImage] = useState('assets/images/model4.jpg'); // Default female
  const [selectedModel, setSelectedModel] = useState(null);
  
  // Modal States
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [habitPhotoFile, setHabitPhotoFile] = useState(null);
  const [habitPreview, setHabitPreview] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [showModelPreviewModal, setShowModelPreviewModal] = useState(false);
  const [previewModelData, setPreviewModelData] = useState(null);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [existingClients, setExistingClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [prefilledClientInfo, setPrefilledClientInfo] = useState(null);
  const [hasPrefilledPreview, setHasPrefilledPreview] = useState(false);

  // Refs
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

  const handleRetakePhoto = () => {
    clearHabitPhoto();
    openCamera();
  };

  const resetFormState = () => {
    setFormData(createInitialFormData());
    setDescription('');
    setPrice('');
    clearHabitPhoto();
    setPhotoFile(null);
    setSelectedModel(null);
    setPrefilledClientInfo(null);
    setHasPrefilledPreview(false);
    setPreviewImage('assets/images/model4.jpg');
  };

  const getLatestMesure = (client) => {
    if (!client?.mesures || client.mesures.length === 0) {
      return null;
    }
    return client.mesures.reduce((latest, current) => {
      if (!latest) return current;
      const latestDate = latest.dateMesure ? new Date(latest.dateMesure) : null;
      const currentDate = current.dateMesure ? new Date(current.dateMesure) : null;
      if (!latestDate) return current;
      if (!currentDate) return latest;
      return currentDate > latestDate ? current : latest;
    }, null);
  };

  const closeClientPicker = () => {
    setShowClientPicker(false);
    setClientSearch('');
  };

  const fetchExistingClients = async () => {
    if (clientsLoading) return;
    setClientsLoading(true);
    try {
      const res = await api.get('/clients');
      setExistingClients(res.data || []);
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

  const handleSelectExistingClient = (client) => {
    if (!client) return;
    const latestMesure = getLatestMesure(client);
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

    if (latestMesure) {
      const type = (latestMesure.typeVetement || '').toLowerCase();
      if (nextData.sexe === 'Femme') {
        nextData.femme_type = type === 'jupe' ? 'jupe' : 'robe';
      } else {
        nextData.femme_type = type === 'jupe' || type === 'robe' ? type : '';
      }

      nextData.selectedModelId = latestMesure.modeleReferenceId || '';
      nextData.modeleNom = latestMesure.modeleNom || '';

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
    setSelectedModel(null);

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
    const typeValue = ((client.mesures && client.mesures[0]?.typeVetement) || '').toLowerCase();
    return (
      fullName.includes(normalizedSearch) ||
      contactValue.includes(normalizedSearch) ||
      emailValue.includes(normalizedSearch) ||
      typeValue.includes(normalizedSearch)
    );
  });

  useEffect(() => {
    fetchModels();
  }, []);

  useEffect(() => {
    // Filter models when category or models list changes
    if (categoryFilter === 'all') {
      setFilteredModels(models);
    } else {
      setFilteredModels(models.filter(m => m.categorie === categoryFilter));
    }
  }, [categoryFilter, models]);

  useEffect(() => {
    // Update avatar when gender preview changes, ONLY if no custom photo is uploaded, no model selected, and no prefilled preview
    if (!photoFile && !selectedModel && !hasPrefilledPreview) {
      updateAvatar(formData.genderPreview);
    }
  }, [formData.genderPreview, photoFile, selectedModel, hasPrefilledPreview]);

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
      // Reset femme type if switching to Homme
      femme_type: value === 'Homme' ? '' : prev.femme_type,
      genderPreview: value // Also update preview gender
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
      
      // Reset selected model when manually uploading
      setSelectedModel(null);
      setFormData(prev => ({
        ...prev,
        selectedModelId: '',
        modeleNom: ''
      }));
    }
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
      setPhotoFile(null); // Clear manual file
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
    if (!formData.email.trim()) errors.push("Le champ Email est obligatoire.");
    if (!formData.sexe) errors.push("Le champ Sexe est obligatoire.");

    if (formData.sexe === 'Femme' && !formData.femme_type) {
      errors.push("Veuillez sélectionner un type de vêtement (Robe ou Jupe).");
    }
    
    return errors;
  };

  const handlePreSubmit = (e) => {
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

    // clear previous modal fields only when aucune donnée pré-remplie n'est disponible
    if (!prefilledClientInfo) {
      setPrice('');
      setDescription('');
      clearHabitPhoto();
    }

    setShowPriceModal(true);
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
      setCameraStream(stream);
      setIsCameraOpen(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera access denied or not available', err);
      Swal.fire('Erreur', 'Impossible d\'accéder à la caméra. Assurez-vous d\'avoir autorisé l\'accès.', 'error');
    }
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      try { videoRef.current.pause(); videoRef.current.srcObject = null; } catch(e) {}
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const sourceWidth = video.videoWidth || 1280;
    const sourceHeight = video.videoHeight || 720;
    const aspectRatio = sourceWidth > 0 ? sourceHeight / sourceWidth : 0.75;
    const targetWidth = Math.max(960, sourceWidth);
    const targetHeight = Math.floor(targetWidth * aspectRatio);
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], `habit-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
      const previewUrl = URL.createObjectURL(file);
      setHabitPhotoFile(file);
      setHabitPreview(prev => {
        if (prev && prev.startsWith('blob:')) {
          URL.revokeObjectURL(prev);
        }
        return previewUrl;
      });
      closeCamera();
    }, 'image/jpeg', 0.92);
  };

  const handleFinalSubmit = async () => {
    if (!price || isNaN(price) || parseFloat(price) <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Prix invalide',
        text: 'Veuillez saisir un prix valide pour le modèle.',
      });
      return;
    }

    if (!habitPhotoFile) {
      Swal.fire({
        icon: 'error',
        title: 'Photo requise',
        text: 'Veuillez prendre/enregistrer une photo de l\'habit à coudre.',
      });
      return;
    }

    setShowPriceModal(false);
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    setLoading(true);

    try {
      const data = new FormData();
      
      // Append all text fields
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== undefined) {
           data.append(key, formData[key]);
        }
      });

      data.append('prix', price);
      // Description (optional) for the pricing note
      data.append('description', description.trim());
      
      if (photoFile) {
        data.append('photo', photoFile);
      }
      if (habitPhotoFile) {
        data.append('habitPhoto', habitPhotoFile);
      }

      await api.post('/clients/ajouter', data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      Swal.fire({
        icon: 'success',
        title: 'Succès',
        text: 'Client et mesures enregistrés avec succès',
        timer: 2500,
        showConfirmButton: false
      });

      // Reset form
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

  // Helper to render input field
  const renderInput = (label, name, required = false) => (
    <div className="col-md-6 mb-3">
      <label className="form-label">{label} {required && <span className="text-danger">*</span>}</label>
      <input 
        type="text" 
        className="form-control" 
        name={name} 
        value={formData[name]} 
        onChange={handleInputChange} 
      />
    </div>
  );

  return (
    <>
      <div className="page-header">
          <div className="container-fluid">
            <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
              <div className="breadcrumb-title pe-3">Mesure</div>
              <div className="ps-3">
                <nav aria-label="breadcrumb">
                  <ol className="breadcrumb mb-0 p-0">
                    <li className="breadcrumb-item"><a href="/"><i className="bx bx-home-alt"></i></a></li>
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
            <p className="mb-0">Remplissez tous les champs marqués d'un astérisque (<span className="text-danger">*</span>) qui sont obligatoires. Les mesures doivent être en centimètres. Cliquez sur l'image pour ajouter une photo du modèle.</p>
          </div>
          <div className="card-body">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
              <div className="text-muted">
                Sélectionnez un client existant pour pré-remplir les informations ou créez-en un nouveau.
              </div>
              <button type="button" className="btn btn-outline-primary" onClick={openClientPickerModal}>
                <i className="bx bx-user-plus me-1"></i> Sélectionner un client existant
              </button>
            </div>

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

            <form onSubmit={handlePreSubmit}>
              <div className="row">
                {/* Left Column: Photo & Models */}
                <div className="col-md-4">
                  <div className="d-flex flex-column align-items-center text-center">
                    <div className="image-preview-container mb-3 position-relative" style={{ cursor: 'pointer' }}>
                      <img 
                        src={previewImage} 
                        onClick={() => fileInputRef.current.click()}
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

                    <div className="divider mb-3 w-100 text-center border-bottom">
                      <span className="bg-white px-2 text-muted" style={{ position: 'relative', top: '10px' }}>OU</span>
                    </div>

                    {/* Existing Models Section */}
                    <div className="existing-models-section w-100">
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

                {/* Right Column: Form Fields */}
                <div className="col-md-8">
                  {/* General Info */}
                  <div className="form-section mb-4">
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
                        <label className="form-label">Email <span className="text-danger">*</span></label>
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
                        {renderInput('Épaule', 'robe_epaule', true)}
                        {renderInput('Manche', 'robe_manche', true)}
                      </div>
                      <div className="row">
                        {renderInput('Poitrine', 'robe_poitrine', true)}
                        {renderInput('Taille', 'robe_taille', true)}
                      </div>
                      <div className="row">
                        {renderInput('Longueur de robe', 'robe_longueur', true)}
                        {renderInput('Fesse', 'robe_fesse', true)}
                      </div>
                      <div className="row">
                        {renderInput('Tour de manche', 'robe_tour_manche')}
                        {renderInput('Longueur de poitrine', 'robe_longueur_poitrine')}
                      </div>
                      <div className="row">
                        {renderInput('Longueur de taille', 'robe_longueur_taille')}
                        {renderInput('Longueur de fesse', 'robe_longueur_fesse')}
                      </div>
                    </div>
                  )}

                  {/* Mesures Jupe */}
                  {formData.sexe === 'Femme' && formData.femme_type === 'jupe' && (
                    <div className="form-section mb-4">
                      <h5 className="border-bottom pb-2 mb-3"><i className="fas fa-ruler-combined me-2"></i> Mesures pour Jupe</h5>
                      <div className="row">
                        {renderInput('Épaule', 'jupe_epaule', true)}
                        {renderInput('Manche', 'jupe_manche', true)}
                      </div>
                      <div className="row">
                        {renderInput('Poitrine', 'jupe_poitrine', true)}
                        {renderInput('Taille', 'jupe_taille', true)}
                      </div>
                      <div className="row">
                        {renderInput('Longueur', 'jupe_longueur', true)}
                        {renderInput('Longueur de jupe', 'jupe_longueur_jupe', true)}
                      </div>
                      <div className="row">
                        {renderInput('Ceinture', 'jupe_ceinture', true)}
                        {renderInput('Fesse', 'jupe_fesse', true)}
                      </div>
                      <div className="row">
                        {renderInput('Tour de manche', 'jupe_tour_manche')}
                        {renderInput('Longueur de poitrine', 'jupe_longueur_poitrine')}
                      </div>
                      <div className="row">
                        {renderInput('Longueur de taille', 'jupe_longueur_taille')}
                        {renderInput('Longueur de fesse', 'jupe_longueur_fesse')}
                      </div>
                    </div>
                  )}

                  {/* Mesures Homme */}
                  {formData.sexe === 'Homme' && (
                    <div className="form-section mb-4">
                      <h5 className="border-bottom pb-2 mb-3"><i className="fas fa-ruler-combined me-2"></i> Mesures pour Homme</h5>
                      <div className="row">
                        {renderInput('Épaule', 'homme_epaule', true)}
                        {renderInput('Manche', 'homme_manche', true)}
                      </div>
                      <div className="row">
                        {renderInput('Longueur', 'homme_longueur', true)}
                        {renderInput('Longueur pantalon', 'homme_longueur_pantalon', true)}
                      </div>
                      <div className="row">
                        {renderInput('Ceinture', 'homme_ceinture', true)}
                        {renderInput('Cuisse', 'homme_cuisse', true)}
                      </div>
                      <div className="row">
                        {renderInput('Poitrine', 'homme_poitrine')}
                        {renderInput('Coude', 'homme_corps')}
                      </div>
                      <div className="row">
                        {renderInput('Tour de manche', 'homme_tour_manche')}
                      </div>
                    </div>
                  )}

                  <div className="row mt-4">
                    <div className="col-md-12 text-end">
                      <button type="submit" className="btn btn-primary px-4" disabled={loading}>
                        {loading ? <i className="fas fa-spinner fa-spin me-2"></i> : <i className="fas fa-save me-2"></i>}
                        Enregistrer
                      </button>
                    </div>
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

      {/* Price Modal */}
      {showPriceModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Prix du modèle</h5>
                <button type="button" className="btn-close" onClick={() => setShowPriceModal(false)}></button>
              </div>
              <div className="modal-body">
                {/* button to open camera */}
                <div className="mb-3 text-center">
                  {!isCameraOpen && (
                    <button type="button" className="btn btn-primary" onClick={openCamera}>
                      Ouvrir la caméra
                    </button>
                  )}
                  {isCameraOpen && (
                    <button type="button" className="btn btn-danger" onClick={closeCamera}>
                      Fermer la caméra
                    </button>
                  )}
                </div>
                {/* camera preview and capture */}
                {isCameraOpen && (
                  <div className="mb-3 text-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      style={{ width: '100%', maxHeight: '300px' }}
                    />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    <button type="button" className="btn btn-success mt-2" onClick={capturePhoto}>
                      Prendre la photo
                    </button>
                  </div>
                )}
                {!isCameraOpen && !cameraStream && (
                  <div className="mb-3 text-center text-muted">Caméra non ouverte</div>
                )}

                {habitPreview ? (
                  <div className="mb-3 text-center">
                    <label className="form-label d-block">Aperçu de l'habit à coudre</label>
                    <img
                      src={habitPreview}
                      alt="Aperçu de l'habit"
                      className="img-fluid rounded border"
                      style={{ maxHeight: '280px', objectFit: 'cover' }}
                    />
                    <div className="d-flex justify-content-center gap-2 mt-2">
                      <button type="button" className="btn btn-outline-primary" onClick={handleRetakePhoto}>
                        Reprendre la photo
                      </button>
                      <button type="button" className="btn btn-outline-secondary" onClick={clearHabitPhoto}>
                        Supprimer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-3 text-center text-muted small">
                    L'aperçu de la photo apparaîtra ici après la capture.
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label">Prix du modèle (FCFA) <span className="text-danger">*</span></label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={price} 
                    onChange={(e) => setPrice(e.target.value)} 
                    placeholder="Entrez le prix en FCFA" 
                    min="0" 
                  />
                </div>
                  <div className="mb-3">
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
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPriceModal(false)}>Annuler</button>
                <button type="button" className="btn btn-primary" onClick={handleFinalSubmit}>Confirmer l'enregistrement</button>
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
                {/* affiche la vidéo si le modèle en possède une, sinon la photo */}
                {previewModelData.videoPath ? (
                  <video
                    src={getVideoUrl(previewModelData.videoPath)}
                    className="img-fluid rounded mb-3"
                    controls
                    style={{ maxHeight: '400px' }}
                    onError={(e) => {
                      // en cas d'erreur vidéo, retomber sur l'image
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
