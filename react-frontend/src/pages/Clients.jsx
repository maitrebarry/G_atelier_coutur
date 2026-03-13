import React, { useState, useEffect, useRef } from 'react';
import api, { getUserData } from '../api/api';
import { buildMediaUrl } from '../config/api';
import Swal from 'sweetalert2';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null); // For detail modal
  const [editingClient, setEditingClient] = useState(null); // For edit modal
  const [editFormData, setEditFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [habitPhotoPreview, setHabitPhotoPreview] = useState(null);
  const [habitPhotoFile, setHabitPhotoFile] = useState(null);
  const [habitPhotoCleared, setHabitPhotoCleared] = useState(false);
  
  const fileInputRef = useRef(null);
  const habitFileInputRef = useRef(null);
  const currentUser = getUserData();
  const isTailleur = currentUser?.role === 'TAILLEUR';
  const selectedClientMeasure = selectedClient?.mesures?.[0];

  const getClientPhotoUrl = (mesure) => {
    if (!mesure) return '/assets/images/default_femme.png';
    if (mesure.photoPath) {
      const cleanPath = mesure.photoPath.replace(/^\/+/, '').replace('model_photo/', '');
      return buildMediaUrl(`model_photo/${cleanPath}`);
    }
    return mesure.sexe === 'Homme' ? '/assets/images/default_homme.png' : '/assets/images/default_femme.png';
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

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await api.get('/clients');
      setClients(res.data);
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
      const mesure = client.mesures?.[0] || {};
      
      setEditingClient(client);
      
      // Initialize form data
      const initialData = {
        nom: client.nom || '',
        prenom: client.prenom || '',
        contact: client.contact || '',
        adresse: client.adresse || '',
        email: client.email || '',
        sexe: mesure.sexe || client.sexe || 'Femme',
        prix: mesure.prix || 0,
        description: mesure.description || '',
        typeVetement: mesure.typeVetement || '',
        // Measurements
        ...mesure
      };
      
      setEditFormData(initialData);
      
      // Handle photo preview
      let photoUrl = initialData.sexe === 'Homme' ? '/assets/images/model3.jpg' : '/assets/images/model4.jpg';
      if (mesure.photoPath) {
        const cleanPath = mesure.photoPath.replace(/^\/+/, '').replace('model_photo/', '');
        photoUrl = buildMediaUrl(`model_photo/${cleanPath}`);
      }
      setPhotoPreview(photoUrl);
      setHabitPhotoFile(null);
      setHabitPhotoCleared(false);
      setHabitPhotoPreview(getHabitPhotoUrl(mesure));

    } catch (err) {
      console.error(err);
      Swal.fire('Erreur', 'Impossible de charger les données pour modification', 'error');
    }
  };

  const closeEditModal = () => {
    setEditingClient(null);
    setPhotoPreview(null);
    setHabitPhotoPreview(null);
    setHabitPhotoFile(null);
    setHabitPhotoCleared(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
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
    if (!editFormData.nom || !editFormData.prenom || !editFormData.contact || !editFormData.sexe || !editFormData.prix) {
      Swal.fire('Erreur', 'Veuillez remplir les champs obligatoires', 'error');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      // Append basic fields
      ['nom', 'prenom', 'contact', 'adresse', 'email', 'sexe', 'prix', 'description'].forEach(key => {
        formData.append(key, editFormData[key]);
      });

      // Append photo if new one selected
      if (editFormData.photo instanceof File) {
        formData.append('photo', editFormData.photo);
      } else if (editingClient.mesures?.[0]?.photoPath) {
         const cleanPath = editingClient.mesures[0].photoPath.replace(/^\/+/, "").replace("model_photo/", "");
         formData.append('existing_photo', cleanPath);
      }

      if (habitPhotoFile instanceof File) {
        formData.append('habitPhoto', habitPhotoFile);
      } else if (!habitPhotoCleared && editingClient.mesures?.[0]?.habitPhotoPath) {
        const cleanHabitPath = editingClient.mesures[0].habitPhotoPath.replace(/^\/+/, "").replace("habit_photo/", "");
        formData.append('existing_habit_photo', cleanHabitPath);
      }

      // Append type specific fields
      if (editFormData.sexe === 'Femme') {
        if (!editFormData.typeVetement) {
            throw new Error("Veuillez sélectionner un type de vêtement");
        }
        formData.append('femme_type_edit', editFormData.typeVetement);
        
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
         ['epaule', 'manche', 'longueur', 'longueurPantalon', 'ceinture', 'cuisse', 'poitrine', 'corps', 'tourManche'].forEach(field => {
             formData.append(`homme_${field}`, editFormData[field] || '');
         });
      }

      await api.put(`/clients/${editingClient.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      Swal.fire('Succès', 'Client modifié avec succès', 'success');
      closeEditModal();
      fetchClients();

    } catch (err) {
      console.error(err);
      Swal.fire('Erreur', err.message || 'Impossible de sauvegarder', 'error');
    } finally {
      setSaving(false);
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
          <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
            <div className="breadcrumb-title pe-3">Clients</div>
            <div className="ps-3">
              <nav aria-label="breadcrumb">
                <ol className="breadcrumb mb-0 p-0">
                  <li className="breadcrumb-item"><a href="/"><i className="bx bx-home-alt"></i></a></li>
                  <li className="breadcrumb-item active" aria-current="page">Liste des clients</li>
                </ol>
              </nav>
            </div>
            <div className="ms-auto">
              <a href="/mesures" className="btn btn-primary">Ajouter un client</a>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-striped table-bordered" style={{ width: '100%' }}>
              <thead>
                <tr>
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
                  <tr><td colSpan="7" className="text-center">Chargement...</td></tr>
                ) : clients.length === 0 ? (
                  <tr><td colSpan="7" className="text-center">Aucun client trouvé</td></tr>
                ) : (
                  clients.map(client => {
                      const mesure = client.mesures?.[0] || {};
                      return (
                          <tr key={client.id}>
                              <td>{client.prenom}</td>
                              <td>{client.nom}</td>
                              <td>{client.contact}</td>
                              <td>{client.adresse}</td>
                              <td>{client.email}</td>
                              <td>
                                  {mesure.sexe}
                                  {mesure.typeVetement && <><br/><small className="text-muted">{mesure.typeVetement}</small></>}
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
                  <img 
                    src={getClientPhotoUrl(selectedClientMeasure)} 
                    alt="Client" 
                    className="img-fluid rounded" 
                    style={{ width: '100%', height: 'auto' }}
                  />
                </div>
                <div className="modal-body flex-grow-1 p-3" style={{ overflowY: 'auto', maxHeight: '500px' }}>
                  <div className="d-flex justify-content-between mb-3">
                    <h5>{selectedClient.prenom} {selectedClient.nom}</h5>
                    <button type="button" className="btn-close" onClick={() => setSelectedClient(null)}></button>
                  </div>
                  {selectedClientMeasure ? (
                    <ul className="list-group">
                      <li className="list-group-item fw-bold bg-light">
                        <div className="d-flex justify-content-between">
                          <span>Sexe: {selectedClientMeasure.sexe}</span>
                        </div>
                      </li>
                      {selectedClientMeasure.prix && (
                        <li className="list-group-item fw-bold bg-success text-white">
                          <div className="d-flex justify-content-between align-items-center">
                            <span>Prix du modèle:</span>
                            <span className="badge bg-light text-dark fs-6">{selectedClientMeasure.prix} FCFA</span>
                          </div>
                        </li>
                      )}
                      <li className="list-group-item">
                      <div>
                        <strong>Description:</strong>
                        <p className="text-muted small mb-0 text-wrap">
                        {selectedClientMeasure.description?.trim() || 'Aucune description fournie'}
                        </p>
                      </div>
                      </li>
                      {/* Dynamic Measurements Display */}
                      {(() => {
                        const m = selectedClientMeasure;
                        const renderItem = (label, val) => val ? (
                          <li className="list-group-item d-flex justify-content-between align-items-center">
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
                        } else {
                          // Homme
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
                        }
                      })()}

                      {/* Habit photo displayed after measurements */}
                      {selectedClientMeasure.habitPhotoPath && (
                        <li className="list-group-item">
                          <strong>Photo de l'habit:</strong>
                          <div className="mt-2 text-center">
                            <img
                              src={getHabitPhotoUrl(selectedClientMeasure)}
                              alt="Habit"
                              className="img-fluid"
                              style={{ maxWidth: '200px' }}
                            />
                          </div>
                        </li>
                      )}
                    </ul>
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
                                          <label className="form-label">Prix (FCFA) <span className="text-danger">*</span></label>
                                          <input type="number" className="form-control" name="prix" value={editFormData.prix} onChange={handleInputChange} />
                                      </div>
                                        <div className="col-md-12 mb-3">
                                          <label className="form-label">Description <small className="text-muted">(optionnel)</small></label>
                                          <textarea className="form-control" rows={3} name="description" value={editFormData.description || ''} onChange={handleInputChange} placeholder="Ajouter une description ou note pour ce prix..." />
                                        </div>
                                  </div>

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
                                              {renderMeasurementInput('Coude', 'corps')}
                                              {renderMeasurementInput('Tour de manche', 'tourManche')}
                                          </>
                                      )}
                                  </div>
                              </div>
                          </div>
                      </div>
                      <div className="modal-footer">
                          <button type="button" className="btn btn-secondary" onClick={() => setEditingClient(null)}>Annuler</button>
                          <button type="button" className="btn btn-primary" onClick={handleSaveEdit} disabled={saving}>
                              {saving ? 'Enregistrement...' : 'Enregistrer'}
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