import React, { useState, useEffect, useRef, useCallback } from 'react';
import api, { getUserData } from '../api/api';
import Swal from 'sweetalert2';
import { buildMediaUrl } from '../config/api';

const Modeles = () => {
    const [modeles, setModeles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [currentAtelierId, setCurrentAtelierId] = useState(null);
    const [userRole, setUserRole] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingModele, setEditingModele] = useState(null);
    const [formData, setFormData] = useState({
        nom: '',
        categorie: '',
        prix: '',
        description: '',
        photo: null,
        video: null,
        photoURL: '',
        videoURL: ''
    });
    const [photoPreview, setPhotoPreview] = useState(null);
    const [videoPreview, setVideoPreview] = useState(null);
    const fileInputRef = useRef(null);
    const videoInputRef = useRef(null);
    const uploadRectangleRef = useRef(null);

    const toModelPhotoUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        const clean = path.replace(/^\/+/, '').replace('model_photo/', '');
        return buildMediaUrl(`model_photo/${clean}`);
    };

    const toModelVideoUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        const clean = path.replace(/^\/+/, '').replace('modeles/videos/', '');
        return buildMediaUrl(`modeles/videos/${clean}`);
    };

    const loadModeles = useCallback(async (atelierId) => {
        try {
            const response = await api.get(`/modeles/atelier/${atelierId}`);
            setModeles(response.data);
        } catch (error) {
            console.error('Erreur chargement modèles:', error);
            Swal.fire('Erreur', 'Erreur lors du chargement des modèles', 'error');
        }
    }, []);

    const initializeComponent = useCallback(async () => {
        try {
            let userData = getUserData() || {};
            let atelierId = userData.atelierId || userData.atelier?.id;
            const role = userData.role || '';

            // Fallback: try to fetch user profile if atelierId is missing
            if (!atelierId) {
                try {
                    const res = await api.get('/auth/me');
                    if (res.data && res.data.atelierId) {
                        atelierId = res.data.atelierId;
                        
                        // Update storage preserving existing data
                        userData.atelierId = atelierId;
                        
                        if (localStorage.getItem('userData')) {
                            localStorage.setItem('userData', JSON.stringify(userData));
                        } else if (sessionStorage.getItem('userData')) {
                            sessionStorage.setItem('userData', JSON.stringify(userData));
                        }
                    }
                } catch (e) {
                    console.warn("Could not fetch user profile for atelierId", e);
                }
            }

            if (!atelierId) {
                Swal.fire({
                    title: 'Erreur',
                    text: 'Atelier non configuré. Veuillez vous reconnecter.',
                    icon: 'error',
                    confirmButtonText: 'Se reconnecter'
                }).then((result) => {
                    if (result.isConfirmed) {
                        localStorage.clear();
                        sessionStorage.clear();
                        window.location.href = '/login';
                    }
                });
                return;
            }

            setCurrentAtelierId(atelierId);
            setUserRole(role);
            await loadModeles(atelierId);
        } catch (error) {
            console.error('Erreur initialisation:', error);
            Swal.fire('Erreur', 'Erreur lors de l\'initialisation', 'error');
        } finally {
            setLoading(false);
        }
    }, [loadModeles]);

    useEffect(() => {
        initializeComponent();
    }, [initializeComponent]);

    const handleSearch = async (term) => {
        if (!term.trim()) {
            await loadModeles(currentAtelierId);
            return;
        }

        try {
            const response = await api.get(`/modeles/atelier/${currentAtelierId}/search`, {
                params: { q: term }
            });
            setModeles(response.data);
        } catch (error) {
            console.error('Erreur recherche:', error);
            Swal.fire('Erreur', 'Erreur lors de la recherche', 'error');
        }
    };

    const handleFilterByCategory = async (category) => {
        if (!category) {
            await loadModeles(currentAtelierId);
            return;
        }

        try {
            const response = await api.get(`/modeles/atelier/${currentAtelierId}/categorie/${category}`);
            setModeles(response.data);
        } catch (error) {
            console.error('Erreur filtrage:', error);
            Swal.fire('Erreur', 'Erreur lors du filtrage', 'error');
        }
    };

    const handleFileUpload = (file) => {
        if (!file.type.startsWith('image/')) {
            Swal.fire('Erreur', 'Veuillez sélectionner une image valide (JPEG, PNG, etc.)', 'error');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            Swal.fire('Erreur', 'L\'image est trop volumineuse (max 5MB)', 'error');
            return;
        }

        setFormData(prev => ({ ...prev, photo: file, photoURL: '' }));

        const reader = new FileReader();
        reader.onload = (e) => {
            setPhotoPreview(e.target.result);
        };
        reader.readAsDataURL(file);
    };

    const handleVideoUpload = (file) => {
        if (!file.type.startsWith('video/')) {
            Swal.fire('Erreur', 'Veuillez sélectionner une vidéo valide', 'error');
            return;
        }
        if (file.size > 50 * 1024 * 1024) {
            Swal.fire('Erreur', 'La vidéo est trop volumineuse (max 50MB)', 'error');
            return;
        }
        setFormData(prev => ({ ...prev, video: file, videoURL: '' }));
        const url = URL.createObjectURL(file);
        setVideoPreview(url);
    };

    const handlePhotoURLChange = (url) => {
        setFormData(prev => ({ ...prev, photoURL: url, photo: null }));
        setPhotoPreview(url || null);
    };
    const handleVideoURLChange = (url) => {
        setFormData(prev => ({ ...prev, videoURL: url, video: null }));
        setVideoPreview(url || null);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        if (uploadRectangleRef.current) {
            uploadRectangleRef.current.classList.add('dragover');
        }
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        if (uploadRectangleRef.current && !uploadRectangleRef.current.contains(e.relatedTarget)) {
            uploadRectangleRef.current.classList.remove('dragover');
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        if (uploadRectangleRef.current) {
            uploadRectangleRef.current.classList.remove('dragover');
        }

        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('video/')) {
                handleVideoUpload(file);
            } else {
                handleFileUpload(file);
            }
        }
    };

    const resetForm = () => {
        setFormData({
            nom: '',
            categorie: '',
            prix: '',
            description: '',
            photo: null,
            video: null,
            photoURL: '',
            videoURL: ''
        });
        setPhotoPreview(null);
        setVideoPreview(null);
        setEditingModele(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        if (videoInputRef.current) {
            videoInputRef.current.value = '';
        }
    };

    const openModal = (modele = null) => {
        if (modele) {
            setEditingModele(modele);
            // Détecte si photoPath ou videoPath sont des URLs externes (http/https)
            const isPhotoURL = modele.photoPath && (modele.photoPath.startsWith('http://') || modele.photoPath.startsWith('https://'));
            const isVideoURL = modele.videoPath && (modele.videoPath.startsWith('http://') || modele.videoPath.startsWith('https://'));
            setFormData({
                nom: modele.nom || '',
                categorie: modele.categorie || '',
                prix: modele.prix || '',
                description: modele.description || '',
                photo: null,
                video: null,
                photoURL: isPhotoURL ? modele.photoPath : '',
                videoURL: isVideoURL ? modele.videoPath : ''
            });
            if (modele.photoPath) {
                setPhotoPreview(isPhotoURL ? modele.photoPath : toModelPhotoUrl(modele.photoPath));
            }
            if (modele.videoPath) {
                setVideoPreview(isVideoURL ? modele.videoPath : toModelVideoUrl(modele.videoPath));
            }
        } else {
            resetForm();
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        resetForm();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const { nom, categorie, prix, description } = formData;

        // Validation
        if (!nom.trim()) {
            Swal.fire('Erreur', 'Le nom du modèle est obligatoire', 'error');
            return;
        }
        if (!categorie) {
            Swal.fire('Erreur', 'La catégorie est obligatoire', 'error');
            return;
        }
        if (!prix || prix <= 0) {
            Swal.fire('Erreur', 'Le prix doit être supérieur à 0', 'error');
            return;
        }

        try {
            const formDataToSend = new FormData();
            const modeleData = {
                nom: nom.trim(),
                categorie,
                prix: parseFloat(prix),
                description: description.trim()
            };

            if (editingModele) {
                modeleData.id = editingModele.id;
            } else {
                modeleData.atelierId = currentAtelierId;
            }

            // inject urls if provided (files take precedence)
            if (!formData.photo && formData.photoURL) {
                modeleData.photoPath = formData.photoURL.trim();
            }
            if (!formData.video && formData.videoURL) {
                modeleData.videoPath = formData.videoURL.trim();
            }

            formDataToSend.append('modele', new Blob([JSON.stringify(modeleData)], {
                type: 'application/json'
            }));

            if (formData.photo) {
                formDataToSend.append('photo', formData.photo);
            }
            if (formData.video) {
                formDataToSend.append('video', formData.video);
            }

            if (editingModele) {
                await api.put(`/modeles/${editingModele.id}/atelier/${currentAtelierId}`, formDataToSend, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                Swal.fire('Succès', 'Modèle modifié avec succès !', 'success');
            } else {
                await api.post('/modeles', formDataToSend, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                Swal.fire('Succès', 'Modèle créé avec succès !', 'success');
            }

            closeModal();
            await loadModeles(currentAtelierId);
        } catch (error) {
            console.error('Erreur sauvegarde:', error);
            Swal.fire('Erreur', error.response?.data?.message || 'Erreur lors de la sauvegarde', 'error');
        }
    };

    const handleDelete = async (modeleId) => {
        const modele = modeles.find(m => m.id === modeleId);
        if (!modele) return;

        const result = await Swal.fire({
            title: 'Supprimer ce modèle ?',
            text: `"${modele.nom}" sera supprimé`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Oui, supprimer',
            cancelButtonText: 'Annuler',
            reverseButtons: true
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/modeles/${modeleId}/atelier/${currentAtelierId}`);
                await Swal.fire({
                    icon: 'success',
                    title: 'Modèle supprimé !',
                    timer: 3000,
                    showConfirmButton: false
                });
                await loadModeles(currentAtelierId);
            } catch (error) {
                console.error('Erreur suppression:', error);
                Swal.fire('Erreur', 'Erreur lors de la suppression', 'error');
            }
        }
    };

    const getCategorieDisplayName = (categorie) => {
        const categories = {
            'ROBE': 'Robe',
            'JUPE': 'Jupe',
            'HOMME': 'Homme',
            'ENFANT': 'Enfant',
            'AUTRE': 'Autre'
        };
        return categories[categorie] || categorie;
    };

    const getCategorieBadgeClass = (categorie) => {
        const classes = {
            'ROBE': 'bg-light-pink text-pink',
            'JUPE': 'bg-light-purple text-purple',
            'HOMME': 'bg-light-blue text-blue',
            'ENFANT': 'bg-light-orange text-orange',
            'AUTRE': 'bg-light-secondary text-secondary'
        };
        return classes[categorie] || 'bg-light-secondary text-secondary';
    };

    const canEdit = () => {
        return userRole !== 'TAILLEUR';
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Chargement...</span>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Breadcrumb */}
            <div className="page-breadcrumb d-flex flex-wrap align-items-center gap-2 mb-3">
                <div className="breadcrumb-title pe-3">Gestion des Modèles</div>
                <div className="ps-3">
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb mb-0 p-0">
                            <li className="breadcrumb-item"><a href="/home">Accueil</a></li>
                            <li className="breadcrumb-item active" aria-current="page">Modèles</li>
                        </ol>
                    </nav>
                </div>
                {canEdit() && (
                    <div className="ms-auto">
                        <button className="btn btn-primary" onClick={() => openModal()}>
                            <i className="bx bx-plus me-1"></i>Nouveau Modèle
                        </button>
                    </div>
                )}
            </div>

            {/* Filtres et Recherche */}
            <div className="row mb-4">
                <div className="col-md-8">
                    <div className="input-group">
                        <span className="input-group-text bg-light border-end-0">
                            <i className="bx bx-search"></i>
                        </span>
                        <input
                            type="text"
                            className="form-control border-start-0"
                            placeholder="Rechercher un modèle..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                handleSearch(e.target.value);
                            }}
                        />
                    </div>
                </div>
                <div className="col-md-4">
                    <select
                        className="form-select"
                        value={filterCategory}
                        onChange={(e) => {
                            setFilterCategory(e.target.value);
                            handleFilterByCategory(e.target.value);
                        }}
                    >
                        <option value="">Toutes les catégories</option>
                        <option value="ROBE">Robes</option>
                        <option value="JUPE">Jupes</option>
                        <option value="HOMME">Vêtements Homme</option>
                        <option value="ENFANT">Vêtements Enfant</option>
                    </select>
                </div>
            </div>

            {/* Grille des Modèles */}
            <div className="row" id="modelesGrid">
                {modeles.length === 0 ? (
                    <div className="text-center py-5" id="emptyState">
                        <i className="bx bx-t-shirt bx-lg text-muted mb-3"></i>
                        <h5 className="text-muted">Aucun modèle créé</h5>
                        <p className="text-muted">Commencez par créer votre premier modèle</p>
                        {canEdit() && (
                            <button className="btn btn-primary" onClick={() => openModal()}>
                                <i className="bx bx-plus me-1"></i>Créer un modèle
                            </button>
                        )}
                    </div>
                ) : (
                    modeles.map(modele => (
                        <div key={modele.id} className="col-xl-3 col-lg-4 col-md-6 mb-4">
                            <div className="card modele-card radius-10">
                                <div className="card-body p-0">
                                    <div className="modele-photo-container">
                                        {modele.videoPath ? (
                                            <video
                                                src={toModelVideoUrl(modele.videoPath)}
                                                className="modele-photo"
                                                controls
                                                onError={(e) => {
                                                    // fallback to image if video fails
                                                    e.target.outerHTML = `<img src='${
                                                        toModelPhotoUrl(modele.photoPath) || '/images/default_model.png'
                                                    }' class='modele-photo' />`;
                                                }}
                                            />
                                        ) : (
                                            <img
                                                src={toModelPhotoUrl(modele.photoPath) || '/images/default_model.png'}
                                                className="modele-photo"
                                                alt={modele.nom || 'Modèle'}
                                                onError={(e) => {
                                                    e.target.src = '/images/default_model.png';
                                                }}
                                            />
                                        )}
                                        {canEdit() && (
                                            <div className="modele-actions">
                                                <button
                                                    className="btn btn-sm btn-light"
                                                    onClick={() => openModal(modele)}
                                                    title="Modifier"
                                                >
                                                    <i className="bx bx-edit"></i>
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-light"
                                                    onClick={() => handleDelete(modele.id)}
                                                    title="Supprimer"
                                                >
                                                    <i className="bx bx-trash"></i>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-3">
                                        <h6 className="modele-nom fw-bold mb-1">{modele.nom || 'Modèle sans nom'}</h6>
                                        <p className="modele-description text-muted small mb-2">
                                            {modele.description || 'Aucune description'}
                                        </p>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <span className="modele-prix fw-bold text-primary">
                                                {new Intl.NumberFormat('fr-FR').format(modele.prix)} FCFA
                                            </span>
                                            <span className={`badge ${getCategorieBadgeClass(modele.categorie)}`}>
                                                {getCategorieDisplayName(modele.categorie)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal Ajouter/Modifier Modèle */}
            {showModal && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">{editingModele ? 'Modifier le Modèle' : 'Nouveau Modèle'}</h5>
                                <button type="button" className="btn-close" onClick={closeModal}></button>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="row">
                                        <div className="col-md-6">
                                            <div className="mb-3">
                                                <label className="form-label">Photo du modèle</label>
                                                <div
                                                    className="upload-container"
                                                    ref={uploadRectangleRef}
                                                    onClick={() => fileInputRef.current?.click()}
                                                    onDragOver={handleDragOver}
                                                    onDragLeave={handleDragLeave}
                                                    onDrop={handleDrop}
                                                    style={{
                                                        border: '2px dashed #dee2e6',
                                                        borderRadius: '8px',
                                                        padding: '20px',
                                                        textAlign: 'center',
                                                        cursor: 'pointer',
                                                        backgroundColor: photoPreview ? '#f8f9fa' : '#fff',
                                                        minHeight: '200px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    <input
                                                        type="file"
                                                        ref={fileInputRef}
                                                        accept="image/*"
                                                        style={{ display: 'none' }}
                                                        onChange={(e) => {
                                                            if (e.target.files.length > 0) {
                                                                handleFileUpload(e.target.files[0]);
                                                            }
                                                        }}
                                                    />

                                                    {photoPreview ? (
                                                        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                                            <img
                                                                src={photoPreview}
                                                                alt="Aperçu"
                                                                style={{
                                                                    maxWidth: '100%',
                                                                    maxHeight: '180px',
                                                                    objectFit: 'contain'
                                                                }}
                                                            />
                                                            <div style={{
                                                                position: 'absolute',
                                                                top: '10px',
                                                                right: '10px'
                                                            }}>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-light"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        fileInputRef.current?.click();
                                                                    }}
                                                                >
                                                                    <i className="bx bx-reset me-1"></i>Changer
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <i className="bx bx-cloud-upload display-4 text-muted mb-3"></i>
                                                            <p className="fw-semibold mb-1">Cliquez ou glissez votre image ici</p>
                                                            <p className="text-muted small mb-0">Formats: JPG, PNG, GIF • Max : 5 MB</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mb-3 col-md-12">
                                            <label className="form-label">Ou URL de l'image</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={formData.photoURL}
                                                onChange={(e) => handlePhotoURLChange(e.target.value)}
                                                placeholder="https://..."
                                            />
                                        </div>

                                        {/* video section start */}
                                        <div className="col-md-6">
                                            <div className="mb-3">
                                                <label className="form-label">Vidéo du modèle</label>
                                                <div
                                                    className="upload-container"
                                                    onClick={() => videoInputRef.current?.click()}
                                                    style={{
                                                        border: '2px dashed #dee2e6',
                                                        borderRadius: '8px',
                                                        padding: '20px',
                                                        textAlign: 'center',
                                                        cursor: 'pointer',
                                                        backgroundColor: videoPreview ? '#f8f9fa' : '#fff',
                                                        minHeight: '200px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    <input
                                                        type="file"
                                                        ref={videoInputRef}
                                                        accept="video/*"
                                                        style={{ display: 'none' }}
                                                        onChange={(e) => {
                                                            if (e.target.files.length > 0) {
                                                                handleVideoUpload(e.target.files[0]);
                                                            }
                                                        }}
                                                    />

                                                    {videoPreview ? (
                                                        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                                            <video
                                                                src={videoPreview}
                                                                controls
                                                                style={{
                                                                    maxWidth: '100%',
                                                                    maxHeight: '180px',
                                                                    objectFit: 'contain'
                                                                }}
                                                            />
                                                            <div style={{
                                                                position: 'absolute',
                                                                top: '10px',
                                                                right: '10px'
                                                            }}>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-light"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        videoInputRef.current?.click();
                                                                    }}
                                                                >
                                                                    <i className="bx bx-reset me-1"></i>Changer
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <i className="bx bx-cloud-upload display-4 text-muted mb-3"></i>
                                                            <p className="fw-semibold mb-1">Cliquez pour choisir une vidéo</p>
                                                            <p className="text-muted small mb-0">Formats: MP4, WEBM, OGG • Max : 50 MB</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mb-3 col-md-12">
                                                <label className="form-label">Ou URL de la vidéo</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={formData.videoURL}
                                                    onChange={(e) => handleVideoURLChange(e.target.value)}
                                                    placeholder="https://..."
                                                />
                                            </div>
                                        </div>
                                        {/* video section end */}
                                    </div> {/* end row with uploads */}

                                    <div className="row">
                                        <div className="col-md-6">
                                            <div className="mb-3">
                                                <label className="form-label">Nom du modèle (optionnel)</label>
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    value={formData.nom}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                                                    placeholder="Ex: Robe de soirée, Costume homme..."
                                                />
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="mb-3">
                                                <label className="form-label">Catégorie</label>
                                                <select
                                                    className="form-select"
                                                    value={formData.categorie}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, categorie: e.target.value }))}
                                                    required
                                                >
                                                    <option value="">Sélectionnez une catégorie</option>
                                                    <option value="ROBE">Robe</option>
                                                    <option value="JUPE">Jupe</option>
                                                    <option value="HOMME">Vêtement Homme</option>
                                                    <option value="ENFANT">Vêtement Enfant</option>
                                                    <option value="AUTRE">Autre</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="row">
                                        <div className="col-md-6">
                                            <div className="mb-3">
                                                <label className="form-label">Prix de convention (FCFA)</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={formData.prix}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, prix: e.target.value }))}
                                                    placeholder="5000"
                                                    min="0"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="mb-3">
                                                <label className="form-label">Description (optionnel)</label>
                                                <textarea
                                                    className="form-control"
                                                    value={formData.description}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                                    rows="3"
                                                    placeholder="Description du modèle..."
                                                ></textarea>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                        Annuler
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        <i className="bx bx-save me-1"></i>Enregistrer
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Modeles;
