import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import api, { getUserData } from '../api/api';

const Mesures = () => {
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState([]);
  const [filteredModels, setFilteredModels] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showModels, setShowModels] = useState(false);
  
  // Form State - Initialized with all fields to avoid uncontrolled input warnings
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    contact: '',
    adresse: '',
    email: '',
    sexe: '',
    femme_type: '', // 'robe' or 'jupe'
    
    // Robe measurements
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

    // Jupe measurements
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

    // Homme measurements
    homme_epaule: '',
    homme_manche: '',
    homme_longueur: '',
    homme_longueur_pantalon: '',
    homme_ceinture: '',
    homme_cuisse: '',
    homme_poitrine: '',
    homme_corps: '', // Coude in UI
    homme_tour_manche: '',

    // Hidden fields for model selection
    selectedModelId: '',
    modeleNom: '',
    genderPreview: 'Femme'
  });

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

  // Refs
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchModels();
    // Set default image based on gender preview
    updateAvatar(formData.genderPreview);
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
    // Update avatar when gender preview changes, ONLY if no custom photo is uploaded and no model selected
    if (!photoFile && !selectedModel) {
      updateAvatar(formData.genderPreview);
    }
  }, [formData.genderPreview]);

  const updateAvatar = (gender) => {
    if (gender === 'Femme') {
      setPreviewImage('assets/images/model4.jpg');
    } else {
      setPreviewImage('assets/images/model3.jpg');
    }
  };

  const getImageUrl = (photoPath) => {
    if (!photoPath) return 'assets/images/default-model.png';
    if (photoPath.startsWith('http')) return photoPath;
    return `http://localhost:8081/model_photo/${photoPath}`;
  };

  const getVideoUrl = (videoPath) => {
    if (!videoPath) return null;
    if (videoPath.startsWith('http')) return videoPath;
    return `http://localhost:8081/modeles/videos/${videoPath}`;
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
      
      // Reset selected model when manually uploading
      setSelectedModel(null);
      setFormData(prev => ({
        ...prev,
        selectedModelId: '',
        modeleNom: ''
      }));
    }
  };


  const captureFromCamera = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], 'habit.jpg', { type: 'image/jpeg' });
        setHabitPhotoFile(file);
        setHabitPreview(URL.createObjectURL(blob));
      }
    }, 'image/jpeg');
    // stop stream
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
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

    // clear previous modal fields
    setPrice('');
    setDescription('');
    setHabitPhotoFile(null);
    setHabitPreview(null);


    setShowPriceModal(true);
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
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
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], `habit-${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
      setHabitPhotoFile(file);
      setHabitPreview(URL.createObjectURL(file));
      closeCamera();
    }, 'image/jpeg', 0.9);
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
      setFormData({
        nom: '', prenom: '', contact: '', adresse: '', email: '', sexe: '', femme_type: '',
        robe_epaule: '', robe_manche: '', robe_poitrine: '', robe_taille: '', robe_longueur: '', robe_fesse: '', robe_tour_manche: '', robe_longueur_poitrine: '', robe_longueur_taille: '', robe_longueur_fesse: '',
        jupe_epaule: '', jupe_manche: '', jupe_poitrine: '', jupe_taille: '', jupe_longueur: '', jupe_longueur_jupe: '', jupe_ceinture: '', jupe_fesse: '', jupe_tour_manche: '', jupe_longueur_poitrine: '', jupe_longueur_taille: '', jupe_longueur_fesse: '',
        homme_epaule: '', homme_manche: '', homme_longueur: '', homme_longueur_pantalon: '', homme_ceinture: '', homme_cuisse: '', homme_poitrine: '', homme_corps: '', homme_tour_manche: '',
        selectedModelId: '', modeleNom: '', genderPreview: 'Femme'
      });
      setDescription('');
      setHabitPhotoFile(null);
      setHabitPreview(null);
      setPhotoFile(null);
      setPrice('');
      setSelectedModel(null);
      updateAvatar('Femme');

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
