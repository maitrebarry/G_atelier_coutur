import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { getUserData } from '../api/api';
import { buildMediaUrl } from '../config/api';
import Swal from 'sweetalert2';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableSearchTerm, setTableSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null); // For detail modal
  const [editingClient, setEditingClient] = useState(null); // For edit modal
  const [editFormData, setEditFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [habitPhotoPreview, setHabitPhotoPreview] = useState(null);
  const [habitPhotoFile, setHabitPhotoFile] = useState(null);
  const [habitPhotoCleared, setHabitPhotoCleared] = useState(false);
  const [editingMesureIndex, setEditingMesureIndex] = useState(0);
  const [isCreatingMesure, setIsCreatingMesure] = useState(false);
  const [recuData, setRecuData] = useState(null);
  const [sharingReceipt, setSharingReceipt] = useState(false);
  
  const fileInputRef = useRef(null);
  const habitFileInputRef = useRef(null);
  const [searchParams] = useSearchParams();
  const currentUser = getUserData();
  const isTailleur = currentUser?.role === 'TAILLEUR';

  const getDisplayModelName = (m, idx) => {
    if (m?.modeleNom?.trim()) return m.modeleNom.trim();
    if (m?.modeleReferenceId) return 'Ancien modèle';
    return `Modèle #${idx + 1}`;
  };

  const getClientPhotoUrl = (mesure) => {
    if (!mesure) return '/assets/images/default_femme.png';
    if (mesure.photoPath) {
      const cleanPath = mesure.photoPath.replace(/^\/+/, '').replace('model_photo/', '');
      return buildMediaUrl(`model_photo/${cleanPath}`);
    }
    return mesure.sexe === 'Homme' ? '/assets/images/default_homme.png' : '/assets/images/default_femme.png';
  };

  const getSortedMesures = (client) => {
    if (!client?.mesures || client.mesures.length === 0) return [];
    return [...client.mesures].sort((a, b) => {
      const aTime = a?.dateMesure ? new Date(a.dateMesure).getTime() : 0;
      const bTime = b?.dateMesure ? new Date(b.dateMesure).getTime() : 0;
      return bTime - aTime;
    });
  };

  const selectedClientMeasures = getSortedMesures(selectedClient);
  const selectedClientMeasure = selectedClientMeasures[0];

  const getEditingMesure = () => {
    if (isCreatingMesure) return {};
    const mesures = getSortedMesures(editingClient);
    if (mesures.length === 0) return {};
    const index = Math.min(Math.max(editingMesureIndex, 0), mesures.length - 1);
    return mesures[index] || mesures[0];
  };

  const buildEmptyMesureForm = (sexe = 'Femme') => ({
    sexe,
    typeVetement: sexe === 'Homme' ? 'homme' : '',
    prix: '',
    description: '',
    modeleNom: '',
    mesureId: null,
    selectedModelId: null,
    photo: null,
    epaule: '',
    manche: '',
    poitrine: '',
    taille: '',
    longueur: '',
    fesse: '',
    tourManche: '',
    longueurPoitrine: '',
    longueurTaille: '',
    longueurFesse: '',
    longueurJupe: '',
    ceinture: '',
    longueurPantalon: '',
    cuisse: '',
    corps: '',
    existing_photo: '',
    existing_habit_photo: '',
  });

  const buildMesureFormFromExisting = (mesure = {}, fallbackSexe = 'Femme') => ({
    sexe: mesure.sexe || fallbackSexe,
    typeVetement: mesure.typeVetement || (fallbackSexe === 'Homme' ? 'homme' : ''),
    prix: '',
    description: '',
    modeleNom: '',
    mesureId: null,
    selectedModelId: null,
    photo: null,
    epaule: mesure.epaule || '',
    manche: mesure.manche || '',
    poitrine: mesure.poitrine || '',
    taille: mesure.taille || '',
    longueur: mesure.longueur || '',
    fesse: mesure.fesse || '',
    tourManche: mesure.tourManche || '',
    longueurPoitrine: mesure.longueurPoitrine || '',
    longueurTaille: mesure.longueurTaille || '',
    longueurFesse: mesure.longueurFesse || '',
    longueurJupe: mesure.longueurJupe || '',
    ceinture: mesure.ceinture || '',
    longueurPantalon: mesure.longueurPantalon || '',
    cuisse: mesure.cuisse || '',
    corps: mesure.corps || '',
    existing_photo: '',
    existing_habit_photo: '',
  });

  const selectEditingMesure = (index, clientArg) => {
    const client = clientArg || editingClient;
    if (!client) return;
    const mesures = getSortedMesures(client);
    const mesure = mesures[index] || mesures[0] || {};
    setIsCreatingMesure(false);
    setEditingMesureIndex(index);
    setEditFormData(prev => ({
      ...prev,
      sexe: mesure.sexe || client.sexe || 'Femme',
      typeVetement: mesure.typeVetement || '',
      prix: mesure.prix != null ? String(mesure.prix) : '',
      description: mesure.description || '',
      modeleNom: mesure.modeleNom || '',
      mesureId: mesure.id || null,
      selectedModelId: mesure.modeleReferenceId || null,
      photo: null,
      epaule: mesure.epaule || '',
      manche: mesure.manche || '',
      poitrine: mesure.poitrine || '',
      taille: mesure.taille || '',
      longueur: mesure.longueur || '',
      fesse: mesure.fesse || '',
      tourManche: mesure.tourManche || '',
      longueurPoitrine: mesure.longueurPoitrine || '',
      longueurTaille: mesure.longueurTaille || '',
      longueurFesse: mesure.longueurFesse || '',
      longueurJupe: mesure.longueurJupe || '',
      ceinture: mesure.ceinture || '',
      longueurPantalon: mesure.longueurPantalon || '',
      cuisse: mesure.cuisse || '',
      corps: mesure.corps || '',
      existing_photo: mesure.photoPath ? mesure.photoPath.replace(/^\/+/, '').replace('model_photo/', '') : '',
      existing_habit_photo: mesure.habitPhotoPath ? mesure.habitPhotoPath.replace(/^\/+/, '').replace('habit_photo/', '') : '',
    }));
    setHabitPhotoFile(null);
    setHabitPhotoCleared(false);
    setHabitPhotoPreview(getHabitPhotoUrl(mesure));
    const photoUrl = mesure.photoPath ? getClientPhotoUrl(mesure) : (mesure.sexe === 'Homme' ? '/assets/images/model3.jpg' : '/assets/images/model4.jpg');
    setPhotoPreview(photoUrl);
  };

  const startNewMesure = () => {
    const currentMesure = getEditingMesure();
    const sexe = currentMesure.sexe || editFormData.sexe || 'Femme';
    setIsCreatingMesure(true);
    setEditingMesureIndex(-1);
    setEditFormData(prev => ({
      ...prev,
      ...(currentMesure && Object.keys(currentMesure).length > 0
        ? buildMesureFormFromExisting(currentMesure, sexe)
        : buildEmptyMesureForm(sexe)),
    }));
    setPhotoPreview(sexe === 'Homme' ? '/assets/images/model3.jpg' : '/assets/images/model4.jpg');
    setHabitPhotoPreview(null);
    setHabitPhotoFile(null);
    setHabitPhotoCleared(false);
  };

  // helper to build URL for habit photo stored on server
  const getHabitPhotoUrl = (mesure) => {
    if (!mesure || !mesure.habitPhotoPath) return null;
    if (mesure.habitPhotoPath.startsWith('http')) return mesure.habitPhotoPath;
    const cleanPath = mesure.habitPhotoPath.replace(/^\/+/, '').replace('habit_photo/', '');
    return buildMediaUrl(`habit_photo/${cleanPath}`);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    const clientId = searchParams.get('clientId');
    if (clientId) {
      handleDetailClick(clientId);
    }
  }, [searchParams]);

  const filteredClients = clients.filter((client) => {
    const latestMesure = getSortedMesures(client)[0] || {};
    const value = [
      client.prenom,
      client.nom,
      client.contact,
      client.adresse,
      client.email,
      latestMesure.sexe,
      latestMesure.typeVetement
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return value.includes(tableSearchTerm.toLowerCase());
  });

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await api.get('/clients');
      const sortedClients = (res.data || []).slice().sort((a, b) => {
        const nameA = `${a.nom || ''} ${a.prenom || ''}`.trim().toLowerCase();
        const nameB = `${b.nom || ''} ${b.prenom || ''}`.trim().toLowerCase();
        return nameA.localeCompare(nameB, 'fr', { sensitivity: 'base' });
      });
      setClients(sortedClients);
    } catch (err) {
      console.error(err);
      Swal.fire('Erreur', 'Impossible de charger les clients', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Êtes-vous sûr?',
      text: "Cette action est irréversible!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, supprimer!',
      cancelButtonText: 'Annuler'
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/clients/${id}`);
        Swal.fire('Supprimé!', 'Le client a été supprimé.', 'success');
        fetchClients();
      } catch (err) {
        console.error(err);
        Swal.fire('Erreur', 'Impossible de supprimer le client', 'error');
      }
    }
  };

  const handleDetailClick = async (id) => {
    try {
      const res = await api.get(`/clients/${id}`);
      setSelectedClient(res.data);
    } catch (err) {
      console.error(err);
      Swal.fire('Erreur', 'Impossible de charger les détails', 'error');
    }
  };

  const handleEditClick = async (id) => {
    try {
      const res = await api.get(`/clients/${id}`);
      const client = res.data;
      setEditingClient(client);
      setEditingMesureIndex(0);
      setIsCreatingMesure(false);
      setEditFormData({
        nom: client.nom || '',
        prenom: client.prenom || '',
        contact: client.contact || '',
        adresse: client.adresse || '',
        email: client.email || '',
      });
      selectEditingMesure(0, client);
    } catch (err) {
      console.error(err);
      Swal.fire('Erreur', 'Impossible de charger les données pour modification', 'error');
    }
  };

  const closeEditModal = () => {
    setEditingClient(null);
    setEditingMesureIndex(0);
    setIsCreatingMesure(false);
    setPhotoPreview(null);
    setHabitPhotoPreview(null);
    setHabitPhotoFile(null);
    setHabitPhotoCleared(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'sexe' && value === 'Homme') {
        next.typeVetement = 'homme';
      }
      if (name === 'sexe' && value === 'Femme' && prev.typeVetement === 'homme') {
        next.typeVetement = '';
      }
      return next;
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire('Erreur', 'La taille maximale est de 5MB', 'error');
        return;
      }
      setEditFormData(prev => ({ ...prev, photo: file }));
      
      const reader = new FileReader();
      reader.onload = (e) => setPhotoPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleHabitPhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('Erreur', 'La taille maximale est de 5MB', 'error');
      return;
    }
    setHabitPhotoCleared(false);
    setHabitPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setHabitPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSaveEdit = async () => {
    // Validation
    if (!editFormData.nom || !editFormData.prenom || !editFormData.contact || !editFormData.sexe) {
      Swal.fire('Erreur', 'Veuillez remplir les champs obligatoires', 'error');
      return;
    }

    if (!editFormData.modeleNom?.trim()) {
      Swal.fire('Erreur', 'Veuillez renseigner le nom du modèle', 'error');
      return;
    }

    setSaving(true);
    try {
      const infoFormData = new FormData();
      ['nom', 'prenom', 'contact', 'adresse', 'email'].forEach(key => {
        infoFormData.append(key, editFormData[key] || '');
      });

      await api.put(`/clients/${editingClient.id}/infos`, infoFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const formData = new FormData();
      formData.append('sexe', editFormData.sexe || '');
      formData.append('prix', editFormData.prix || '');
      formData.append('description', editFormData.description || '');
      formData.append('modeleNom', editFormData.modeleNom || '');

      if (editFormData.sexe === 'Femme') {
        if (!editFormData.typeVetement) {
            throw new Error("Veuillez sélectionner un type de vêtement");
        }
        formData.append('typeVetement', editFormData.typeVetement);
        
        if (editFormData.typeVetement === 'robe') {
            ['epaule', 'manche', 'poitrine', 'taille', 'longueur', 'fesse', 'tourManche', 'longueurPoitrine', 'longueurTaille', 'longueurFesse'].forEach(field => {
                formData.append(`robe_${field}`, editFormData[field] || '');
            });
        } else if (editFormData.typeVetement === 'jupe') {
             ['epaule', 'manche', 'poitrine', 'taille', 'longueur', 'longueurJupe', 'ceinture', 'fesse', 'tourManche', 'longueurPoitrine', 'longueurTaille', 'longueurFesse'].forEach(field => {
                formData.append(`jupe_${field}`, editFormData[field] || '');
            });
        }
      } else {
         formData.append('typeVetement', 'homme');
         ['epaule', 'manche', 'longueur', 'longueurPantalon', 'ceinture', 'cuisse', 'poitrine', 'corps', 'tourManche'].forEach(field => {
             formData.append(`homme_${field}`, editFormData[field] || '');
         });
      }

      const selectedMesure = getEditingMesure();
      if (editFormData.selectedModelId) {
        formData.append('selectedModelId', editFormData.selectedModelId);
      }

      if (editFormData.photo instanceof File) {
        formData.append('photo', editFormData.photo);
      } else if (!isCreatingMesure && selectedMesure?.photoPath) {
        const cleanPath = selectedMesure.photoPath.replace(/^\/+/,'').replace('model_photo/', '');
        formData.append('existing_photo', cleanPath);
      }

      if (habitPhotoFile instanceof File) {
        formData.append('habitPhoto', habitPhotoFile);
      } else if (!habitPhotoCleared && !isCreatingMesure && selectedMesure?.habitPhotoPath) {
        const cleanHabitPath = selectedMesure.habitPhotoPath.replace(/^\/+/,'').replace('habit_photo/', '');
        formData.append('existing_habit_photo', cleanHabitPath);
      }

      if (!habitPhotoFile && habitPhotoCleared) {
        formData.append('existing_habit_photo', '');
      }

      const endpoint = isCreatingMesure
        ? `/clients/${editingClient.id}/mesures`
        : `/clients/${editingClient.id}/mesures/${editFormData.mesureId}`;
      const method = isCreatingMesure ? 'post' : 'put';

      await api[method](endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      Swal.fire({
        title: 'Succès',
        text: isCreatingMesure ? 'Nouveau modèle ajouté avec succès' : 'Client modifié avec succès',
        icon: 'success',
        showCancelButton: true,
        confirmButtonText: 'Envoyer le reçu',
        cancelButtonText: 'Fermer'
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            const userData = JSON.parse(localStorage.getItem('userData') || sessionStorage.getItem('userData'));
            const atelierId = userData ? (userData.atelierId || (userData.atelier && userData.atelier.id)) : null;
            const response = await api.get(`/paiements/clients/${editingClient.id}?atelierId=${atelierId}&month=${new Date().getMonth() + 1}&year=${new Date().getFullYear()}`);
            const payments = response.data;
            if (payments && payments.length > 0) {
              const latestPayment = payments.sort((a, b) => new Date(b.datePaiement) - new Date(a.datePaiement))[0];
              const recuResponse = await api.get(`/paiements/recu/client/${latestPayment.id}?atelierId=${atelierId}`);
              setRecuData(recuResponse.data);
              await handleSendReceiptWhatsApp();
            } else {
              Swal.fire('Info', 'Aucun paiement trouvé pour ce client', 'info');
            }
          } catch (error) {
            console.error('Erreur chargement reçu:', error);
            Swal.fire('Erreur', 'Impossible de charger le reçu', 'error');
          }
        }
        closeEditModal();
        fetchClients();
      });

    } catch (err) {
      console.error(err);
      Swal.fire('Erreur', err.message || 'Impossible de sauvegarder', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMesure = async () => {
    const mesureId = editFormData.mesureId;
    if (!editingClient || !mesureId) {
      Swal.fire('Erreur', 'Sélectionnez un modèle existant à supprimer', 'error');
      return;
    }

    const result = await Swal.fire({
      title: 'Supprimer ce modèle ?',
      text: "Le client sera conservé, seul le modèle sélectionné sera supprimé.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, supprimer!',
      cancelButtonText: 'Annuler'
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await api.delete(`/clients/${editingClient.id}/mesures/${mesureId}`);
      Swal.fire('Supprimé!', 'Le modèle a été supprimé.', 'success');
      closeEditModal();
      fetchClients();
    } catch (err) {
      console.error(err);
      Swal.fire('Erreur', 'Impossible de supprimer le modèle', 'error');
    }
  };

  const getCurrentAtelierId = () => {
    const userData = JSON.parse(localStorage.getItem('userData') || sessionStorage.getItem('userData'));
    return userData ? (userData.atelierId || (userData.atelier && userData.atelier.id)) : null;
  };

  const buildReceiptFileName = (recu) => {
    const baseReference = String(recu?.reference || 'recu').replace(/[^a-zA-Z0-9_-]/g, '-');
    return `recu-${baseReference}.pdf`;
  };

  const downloadBlob = (blob, fileName) => {
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
  };

  const fetchReceiptPdfBlob = async (recu) => {
    if (!recu) {
      throw new Error('Reçu introuvable');
    }

    const atelierId = getCurrentAtelierId();
    if (!atelierId) {
      throw new Error('Atelier introuvable pour générer le PDF.');
    }

    const receiptType = recu.typePaiement === 'TAILLEUR' ? 'tailleur' : 'client';
    const response = await api.get(`/paiements/recu/${receiptType}/${recu.id}/pdf?atelierId=${atelierId}`, {
      responseType: 'blob'
    });

    return response.data instanceof Blob
      ? response.data
      : new Blob([response.data], { type: 'application/pdf' });
  };

  const handleSendReceiptWhatsApp = async () => {
    if (!recuData) {
      return;
    }

    const fileName = buildReceiptFileName(recuData);

    try {
      setSharingReceipt(true);
      const blob = await fetchReceiptPdfBlob(recuData);
      const file = new File([blob], fileName, { type: 'application/pdf' });
      const canShareFile = typeof navigator !== 'undefined'
        && typeof navigator.share === 'function'
        && (typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] }));

      if (canShareFile) {
        await navigator.share({
          files: [file],
          title: 'Reçu de paiement ATELIKO',
          text: 'Envoyer le reçu PDF via WhatsApp'
        });
        return;
      }

      downloadBlob(blob, fileName);
      Swal.fire(
        'PDF prêt',
        'Le reçu PDF a été téléchargé. Joignez-le maintenant dans WhatsApp si le partage direct n\'est pas pris en charge par ce navigateur.',
        'info'
      );
    } catch (error) {
      console.error('Erreur partage reçu PDF:', error);
      if (error?.name === 'AbortError') {
        return;
      }
      Swal.fire('Erreur', 'Impossible de générer ou partager le reçu PDF.', 'error');
    } finally {
      setSharingReceipt(false);
    }
  };

  // Helper to render measurement inputs
  const renderMeasurementInput = (label, name, required = false) => (
    <div className="col-md-6 mb-3">
      <label className="form-label">{label} {required && <span className="text-danger">*</span>}</label>
      <input 
        type="text" 
        className="form-control" 
        name={name} 
        value={editFormData[name] || ''} 
        onChange={handleInputChange} 
      />
    </div>
  );

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div className="container-fluid">
          <div className="page-breadcrumb d-flex flex-wrap align-items-center gap-2 mb-3">
            <div className="breadcrumb-title pe-3">Clients</div>
            <div className="ps-3">
              <nav aria-label="breadcrumb">
                <ol className="breadcrumb mb-0 p-0">
                  <li className="breadcrumb-item"><Link to="/"><i className="bx bx-home-alt"></i></Link></li>
                  <li className="breadcrumb-item active" aria-current="page">Liste des clients</li>
                </ol>
              </nav>
            </div>
            <div className="ms-auto">
              <Link to="/mesures" className="btn btn-primary">Ajouter un client</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body">
          <div className="row g-3 align-items-center mb-3">
            <div className="col-md-6 col-lg-5">
              <label className="form-label">Filtrer la liste</label>
              <input
                type="text"
                className="form-control"
                placeholder="Rechercher par nom, contact, email, sexe ou modèle..."
                value={tableSearchTerm}
                onChange={(e) => setTableSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-striped table-bordered align-middle mb-0" style={{ width: '100%' }}>
              <thead className="table-light">
                <tr>
                  <th style={{ width: '60px' }}>N</th>
                  <th>Prénom</th>
                  <th>Nom</th>
                  <th>Contact</th>
                  <th>Adresse</th>
                  <th>Email</th>
                  <th>Sexe/Modèle</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" className="text-center">Chargement...</td></tr>
                ) : filteredClients.length === 0 ? (
                  <tr><td colSpan="8" className="text-center">Aucun client trouvé</td></tr>
                ) : (
                  filteredClients.map((client, index) => {
                                      const sortedMesures = getSortedMesures(client);
                      const mesure = sortedMesures[0] || {};
                      return (
                          <tr key={client.id}>
                              <td className="fw-semibold text-muted">{index + 1}</td>
                              <td>{client.prenom}</td>
                              <td>{client.nom}</td>
                              <td>{client.contact}</td>
                              <td>{client.adresse}</td>
                              <td>{client.email}</td>
                              <td>
                                  {mesure.sexe}
                                  {mesure.typeVetement && <><br/><small className="text-muted">{mesure.typeVetement}</small></>}
                                  <br />
                                  <small className="text-muted">{client.mesures?.length || 0} modèle(s)</small>
                              </td>
                              <td>
                                  <button className="btn btn-sm btn-info me-1" onClick={() => handleDetailClick(client.id)} title="Détail">
                                      <i className="bx bx-show"></i>
                                  </button>
                                  {!isTailleur && (
                                      <>
                                          <button className="btn btn-sm btn-warning me-1" onClick={() => handleEditClick(client.id)} title="Modifier">
                                              <i className="bx bx-pencil"></i>
                                          </button>
                                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(client.id)} title="Supprimer">
                                              <i className="bx bx-trash"></i>
                                          </button>
                                      </>
                                  )}
                              </td>
                          </tr>
                      );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedClient && (
          <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
            <div className="modal-dialog modal-lg">
              <div className="modal-content d-flex flex-row">
                <div className="flex-shrink-0 p-3" style={{ maxWidth: '45%' }}>
                  {selectedClientMeasures.length > 0 ? (
                    <div className="d-flex flex-column gap-2">
                      {selectedClientMeasures.map((m, idx) => (
                        <div key={`preview-${m.id || idx}`} className="border rounded p-2">
                          <div className="small fw-bold mb-2 text-truncate">
                            {getDisplayModelName(m, idx)}
                          </div>
                          <img
                            src={getClientPhotoUrl(m)}
                            alt={`Modèle ${idx + 1}`}
                            className="img-fluid rounded"
                            style={{ width: '100%', height: 'auto', maxHeight: '160px', objectFit: 'cover' }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <img
                      src={getClientPhotoUrl(selectedClientMeasure)}
                      alt="Client"
                      className="img-fluid rounded"
                      style={{ width: '100%', height: 'auto' }}
                    />
                  )}
                </div>
                <div className="modal-body flex-grow-1 p-3" style={{ overflowY: 'auto', maxHeight: '500px' }}>
                  <div className="d-flex justify-content-between mb-3">
                    <h5>{selectedClient.prenom} {selectedClient.nom}</h5>
                    <button type="button" className="btn-close" onClick={() => setSelectedClient(null)}></button>
                  </div>
                  {selectedClientMeasures.length > 0 ? (
                    <>
                      <div className="alert alert-secondary mb-3">
                        <div className="d-flex justify-content-between align-items-center">
                          <div><strong>{selectedClientMeasures.length} modèle(s)</strong></div>
                          <div><strong>Total: {selectedClientMeasures.reduce((sum, m) => sum + (m.prix || 0), 0)} FCFA</strong></div>
                        </div>
                      </div>
                      {selectedClientMeasures.map((m, index) => (
                        <ul key={m.id || index} className="list-group mb-3">
                          <li className="list-group-item fw-bold bg-light">
                            <div className="d-flex justify-content-between">
                              <span>{getDisplayModelName(m, index)}</span>
                              <span>{m.sexe} {m.typeVetement ? `• ${m.typeVetement}` : ''}</span>
                            </div>
                          </li>
                          <li className="list-group-item d-flex justify-content-between align-items-center">
                            <span>Nom du modèle</span>
                            <span className="fw-bold">{getDisplayModelName(m, index)}</span>
                          </li>
                          {m.prix && (
                            <li className="list-group-item fw-bold bg-success text-white">
                              <div className="d-flex justify-content-between align-items-center">
                                <span>Prix du modèle:</span>
                                <span className="badge bg-light text-dark fs-6">{m.prix} FCFA</span>
                              </div>
                            </li>
                          )}
                          <li className="list-group-item">
                            <div>
                              <strong>Description:</strong>
                              <p className="text-muted small mb-0 text-wrap">
                                {m.description?.trim() || 'Aucune description fournie'}
                              </p>
                            </div>
                          </li>
                          {(() => {
                            const renderItem = (label, val) => val ? (
                              <li className="list-group-item d-flex justify-content-between align-items-center" key={label}>
                                <span>{label}</span>
                                <span className="fw-bold">{val}</span>
                              </li>
                            ) : null;

                            if (m.sexe === 'Femme') {
                              return (
                                <>
                                  {m.typeVetement && (
                                    <li className="list-group-item bg-light fw-bold">Type: {m.typeVetement}</li>
                                  )}
                                  {renderItem('Épaule', m.epaule)}
                                  {renderItem('Manche', m.manche)}
                                  {renderItem('Poitrine', m.poitrine)}
                                  {renderItem('Taille', m.taille)}
                                  {renderItem('Longueur', m.longueur)}
                                  {m.typeVetement === 'jupe' && (
                                    <>
                                      {renderItem('Longueur Jupe', m.longueurJupe)}
                                      {renderItem('Ceinture', m.ceinture)}
                                    </>
                                  )}
                                  {renderItem('Fesse', m.fesse)}
                                  {renderItem('Tour de manche', m.tourManche)}
                                  {renderItem('Longueur poitrine', m.longueurPoitrine)}
                                  {renderItem('Longueur taille', m.longueurTaille)}
                                  {renderItem('Longueur fesse', m.longueurFesse)}
                                </>
                              );
                            }
                            return (
                              <>
                                {renderItem('Épaule', m.epaule)}
                                {renderItem('Manche', m.manche)}
                                {renderItem('Longueur', m.longueur)}
                                {renderItem('Longueur Pantalon', m.longueurPantalon)}
                                {renderItem('Ceinture', m.ceinture)}
                                {renderItem('Cuisse', m.cuisse)}
                                {renderItem('Poitrine', m.poitrine)}
                                {renderItem('Coude', m.corps)}
                                {renderItem('Tour de manche', m.tourManche)}
                              </>
                            );
                          })()}
                          {m.habitPhotoPath && (
                            <li className="list-group-item">
                              <strong>Photo de l'habit:</strong>
                              <div className="mt-2 text-center">
                                <img
                                  src={getHabitPhotoUrl(m)}
                                  alt="Habit"
                                  className="img-fluid"
                                  style={{ maxWidth: '200px' }}
                                />
                              </div>
                            </li>
                          )}
                        </ul>
                      ))}
                    </>
                  ) : (
                    <div className="alert alert-info">Aucune mesure disponible</div>
                  )}
                </div>
              </div>
            </div>
          </div>
      )}

      {/* Edit Modal */}
      {editingClient && (
          <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
              <div className="modal-dialog modal-xl">
                  <div className="modal-content">
                      <div className="modal-header bg-primary text-white">
                          <h5 className="modal-title">Modification du Client</h5>
                          <button type="button" className="btn-close btn-close-white" onClick={closeEditModal}></button>
                      </div>
                      <div className="modal-body">
                          <div className="row">
                              {/* Photo Column */}
                              <div className="col-md-4 text-center">
                                  <div className="image-preview-container mb-3" onClick={() => fileInputRef.current.click()} style={{ cursor: 'pointer' }}>
                                      <img src={photoPreview} className="img-fluid rounded" alt="Preview" style={{ maxHeight: '300px', objectFit: 'cover' }} />
                                      <div className="mt-2 text-muted small">Cliquer pour modifier la photo</div>
                                  </div>
                                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
                                  
                                  <div className="mt-3">
                                      <div className="form-check form-check-inline">
                                          <input className="form-check-input" type="radio" name="sexe" value="Femme" checked={editFormData.sexe === 'Femme'} onChange={handleInputChange} />
                                          <label className="form-check-label">Femme</label>
                                      </div>
                                      <div className="form-check form-check-inline">
                                          <input className="form-check-input" type="radio" name="sexe" value="Homme" checked={editFormData.sexe === 'Homme'} onChange={handleInputChange} />
                                          <label className="form-check-label">Homme</label>
                                      </div>
                                  </div>

                                  <div className="mt-4 text-start w-100">
                                    <h6 className="fw-bold">Photo de l'habit à coudre</h6>
                                    <div className="border rounded p-2 text-center bg-light">
                                      {habitPhotoPreview ? (
                                        <img src={habitPhotoPreview} alt="Habit" className="img-fluid rounded" style={{ maxHeight: '220px', objectFit: 'cover' }} />
                                      ) : (
                                        <div className="text-muted small">Aucune photo enregistrée</div>
                                      )}
                                    </div>
                                    <div className="d-flex gap-2 mt-2">
                                      <button type="button" className="btn btn-sm btn-outline-primary flex-grow-1" onClick={() => habitFileInputRef.current?.click()}>
                                        {habitPhotoPreview ? 'Modifier la photo' : 'Ajouter une photo'}
                                      </button>
                                        {habitPhotoPreview && (
                                          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setHabitPhotoPreview(null); setHabitPhotoFile(null); setHabitPhotoCleared(true); }}>
                                          Effacer
                                        </button>
                                      )}
                                    </div>
                                    <input
                                      type="file"
                                      ref={habitFileInputRef}
                                      onChange={handleHabitPhotoChange}
                                      accept="image/*"
                                      style={{ display: 'none' }}
                                    />
                                  </div>
                              </div>

                              {/* Form Column */}
                              <div className="col-md-8">
                                  <h5 className="mb-3"><i className="bx bx-user"></i> Informations Générales</h5>
                                  <div className="row">
                                      <div className="col-md-6 mb-3">
                                          <label className="form-label">Nom <span className="text-danger">*</span></label>
                                          <input type="text" className="form-control" name="nom" value={editFormData.nom} onChange={handleInputChange} />
                                      </div>
                                      <div className="col-md-6 mb-3">
                                          <label className="form-label">Prénom <span className="text-danger">*</span></label>
                                          <input type="text" className="form-control" name="prenom" value={editFormData.prenom} onChange={handleInputChange} />
                                      </div>
                                      <div className="col-md-6 mb-3">
                                          <label className="form-label">Contact <span className="text-danger">*</span></label>
                                          <input type="text" className="form-control" name="contact" value={editFormData.contact} onChange={handleInputChange} />
                                      </div>
                                      <div className="col-md-6 mb-3">
                                          <label className="form-label">Adresse</label>
                                          <input type="text" className="form-control" name="adresse" value={editFormData.adresse} onChange={handleInputChange} />
                                      </div>
                                      <div className="col-md-6 mb-3">
                                          <label className="form-label">Email</label>
                                          <input type="email" className="form-control" name="email" value={editFormData.email} onChange={handleInputChange} />
                                      </div>
                                      <div className="col-md-6 mb-3">
                                          <label className="form-label">Prix (FCFA) <small className="text-muted">(à renseigner si disponible)</small></label>
                                          <input type="number" className="form-control" name="prix" value={editFormData.prix} onChange={handleInputChange} />
                                      </div>
                                      <div className="col-md-6 mb-3">
                                          <label className="form-label">Nom du modèle <span className="text-danger">*</span></label>
                                          <input type="text" className="form-control" name="modeleNom" value={editFormData.modeleNom || ''} onChange={handleInputChange} placeholder="Ex: Grand boubou, Jupe droite..." />
                                      </div>
                                        <div className="col-md-12 mb-3">
                                          <label className="form-label">Description <small className="text-muted">(optionnel)</small></label>
                                          <textarea
                                            className="form-control"
                                            rows={3}
                                            name="description"
                                            value={editFormData.description || ''}
                                            onChange={handleInputChange}
                                            placeholder="Ajouter une description ou note pour ce modèle..."
                                          />
                                        </div>
                                  </div>

                                  {editingClient && getSortedMesures(editingClient).length > 0 && (
                                    <div className="mb-4">
                                      <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h5 className="mb-0"><i className="bx bx-list-ul"></i> Modèles du client</h5>
                                        <div className="d-flex gap-2">
                                          <button type="button" className="btn btn-sm btn-outline-primary" onClick={startNewMesure}>
                                            <i className="bx bx-plus me-1"></i>Nouveau modèle
                                          </button>
                                          {!isCreatingMesure && (
                                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={handleDeleteMesure}>
                                              <i className="bx bx-trash me-1"></i>Supprimer
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      {isCreatingMesure && (
                                        <div className="alert alert-info py-2">
                                          Nouveau modèle en cours de création. Les mesures du modèle sélectionné ont été conservées ; il reste à choisir le nouveau modèle, son prix et la photo de l'habit.
                                        </div>
                                      )}
                                      <div className="list-group">
                                        {getSortedMesures(editingClient).map((m, index) => (
                                          <button
                                            key={m.id || index}
                                            type="button"
                                            className={`list-group-item list-group-item-action ${!isCreatingMesure && editingMesureIndex === index ? 'active' : ''}`}
                                            onClick={() => selectEditingMesure(index)}
                                          >
                                            <div className="d-flex justify-content-between align-items-center">
                                              <div>
                                                <strong>{getDisplayModelName(m, index)}</strong>
                                                <div className="small text-muted">{m.sexe} {m.typeVetement ? `• ${m.typeVetement}` : ''}</div>
                                              </div>
                                              <span className="badge bg-secondary rounded-pill">{m.prix || '0'} FCFA</span>
                                            </div>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Type Selection for Femme */}
                                  {editFormData.sexe === 'Femme' && (
                                      <div className="mb-4">
                                          <h5 className="mb-3"><i className="bx bx-closet"></i> Type de vêtement</h5>
                                          <div className="row">
                                              <div className="col-md-6">
                                                  <div className={`card p-3 ${editFormData.typeVetement === 'robe' ? 'border-primary bg-light' : ''}`} onClick={() => setEditFormData(prev => ({ ...prev, typeVetement: 'robe' }))} style={{ cursor: 'pointer' }}>
                                                      <h6><i className="bx bx-female"></i> Option Robe</h6>
                                                  </div>
                                              </div>
                                              <div className="col-md-6">
                                                  <div className={`card p-3 ${editFormData.typeVetement === 'jupe' ? 'border-primary bg-light' : ''}`} onClick={() => setEditFormData(prev => ({ ...prev, typeVetement: 'jupe' }))} style={{ cursor: 'pointer' }}>
                                                      <h6><i className="bx bx-female"></i> Option Jupe</h6>
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                  )}

                                  {/* Measurements Fields */}
                                  <h5 className="mb-3"><i className="bx bx-ruler"></i> Mesures</h5>
                                  <div className="row">
                                      {editFormData.sexe === 'Femme' && editFormData.typeVetement === 'robe' && (
                                          <>
                                              {renderMeasurementInput('Épaule', 'epaule', true)}
                                              {renderMeasurementInput('Manche', 'manche', true)}
                                              {renderMeasurementInput('Poitrine', 'poitrine', true)}
                                              {renderMeasurementInput('Taille', 'taille', true)}
                                              {renderMeasurementInput('Longueur', 'longueur', true)}
                                              {renderMeasurementInput('Fesse', 'fesse', true)}
                                              {renderMeasurementInput('Tour de manche', 'tourManche')}
                                              {renderMeasurementInput('Longueur poitrine', 'longueurPoitrine')}
                                              {renderMeasurementInput('Longueur taille', 'longueurTaille')}
                                              {renderMeasurementInput('Longueur fesse', 'longueurFesse')}
                                          </>
                                      )}
                                      {editFormData.sexe === 'Femme' && editFormData.typeVetement === 'jupe' && (
                                          <>
                                              {renderMeasurementInput('Épaule', 'epaule', true)}
                                              {renderMeasurementInput('Manche', 'manche', true)}
                                              {renderMeasurementInput('Poitrine', 'poitrine', true)}
                                              {renderMeasurementInput('Taille', 'taille', true)}
                                              {renderMeasurementInput('Longueur', 'longueur', true)}
                                              {renderMeasurementInput('Longueur Jupe', 'longueurJupe', true)}
                                              {renderMeasurementInput('Ceinture', 'ceinture', true)}
                                              {renderMeasurementInput('Fesse', 'fesse', true)}
                                              {renderMeasurementInput('Tour de manche', 'tourManche')}
                                              {renderMeasurementInput('Longueur poitrine', 'longueurPoitrine')}
                                              {renderMeasurementInput('Longueur taille', 'longueurTaille')}
                                              {renderMeasurementInput('Longueur fesse', 'longueurFesse')}
                                          </>
                                      )}
                                      {editFormData.sexe === 'Homme' && (
                                          <>
                                              {renderMeasurementInput('Épaule', 'epaule', true)}
                                              {renderMeasurementInput('Manche', 'manche', true)}
                                              {renderMeasurementInput('Longueur', 'longueur', true)}
                                              {renderMeasurementInput('Longueur Pantalon', 'longueurPantalon', true)}
                                              {renderMeasurementInput('Ceinture', 'ceinture', true)}
                                              {renderMeasurementInput('Cuisse', 'cuisse', true)}
                                              {renderMeasurementInput('Poitrine', 'poitrine')}
                                              {renderMeasurementInput('Cou', 'corps')}
                                              {renderMeasurementInput('Tour de manche', 'tourManche')}
                                          </>
                                      )}
                                  </div>
                              </div>
                          </div>
                      </div>
                      <div className="modal-footer">
                          <button type="button" className="btn btn-secondary" onClick={closeEditModal}>Annuler</button>
                          <button type="button" className="btn btn-primary" onClick={handleSaveEdit} disabled={saving || sharingReceipt}>
                            {saving ? <><i className="bx bx-loader-alt bx-spin me-1"></i>Enregistrement...</> : isCreatingMesure ? 'Ajouter le modèle' : 'Enregistrer'}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </>
  );
};

export default Clients;