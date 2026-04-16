import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';
import { buildMediaUrl } from '../config/api';
import Swal from 'sweetalert2';

const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildHabitPhotoUrl = (photoPath) => {
    if (!photoPath) return null;
    if (photoPath.startsWith('http')) return photoPath;
    const cleanPath = photoPath.replace(/^\/+/, '').replace('habit_photo/', '');
    return buildMediaUrl(`habit_photo/${cleanPath}`);
};

const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
};

const getInitialFormData = () => ({
    clientId: '',
    dateRendezVous: getTomorrowDate(),
    heureRendezVous: '10:00',
    motif: 'Essayage',
    notes: '',
    mesureId: ''
});

const Rendezvous = () => {
    const [rendezvousList, setRendezvousList] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingRendezvousId, setEditingRendezvousId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [tableSearchTerm, setTableSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState(null);
    const [clientDetails, setClientDetails] = useState(null);
    const [formData, setFormData] = useState(getInitialFormData());

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || sessionStorage.getItem('userData'));
            const atelierId = userData ? (userData.atelierId || (userData.atelier && userData.atelier.id)) : null;

            if (!atelierId) {
                Swal.fire('Erreur', 'Atelier non identifié', 'error');
                return;
            }

            const rvResponse = await api.get(`/rendezvous/atelier/${atelierId}/a-venir`);
            const rvData = rvResponse.data.data || rvResponse.data;

            const rawList = Array.isArray(rvData) ? rvData : [];

            const mappedList = rawList.map(rdv => ({
                id: rdv.id,
                clientId: rdv.clientId || rdv.client?.id || '',
                clientNom: rdv.clientNom || (rdv.clientNomComplet ? rdv.clientNomComplet.split(' ').slice(1).join(' ') : ''),
                clientPrenom: rdv.clientPrenom || (rdv.clientNomComplet ? rdv.clientNomComplet.split(' ')[0] : 'Client'),
                clientTelephone: rdv.clientTelephone || rdv.clientContact || '',
                dateRendezVous: rdv.dateRDV || rdv.dateRendezVous,
                heureRendezVous: rdv.heureRendezVous || (rdv.dateRDV ? new Date(rdv.dateRDV).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'}) : ''),
                motif: rdv.typeRendezVous || rdv.motif,
                motifLabel: formatMotifLabel(rdv.typeRendezVous || rdv.motif),
                statut: rdv.statut,
                selectedMeasureId: rdv.mesureId || '',
                selectedMeasureLabel: rdv.mesureLibelle || '',
                selectedMeasureStatus: rdv.mesureStatutProduction || '',
                selectedMeasureReady: Boolean(rdv.mesurePretPourLivraison),
                remainingMeasuresToDeliver: Number(rdv.mesuresRestantesALivrer || 0)
            }));

            setRendezvousList(mappedList);

            const clientsResponse = await api.get(`/rendezvous/atelier/${atelierId}/clients`);
            const clientsData = clientsResponse.data.data || clientsResponse.data;
            setClients(Array.isArray(clientsData) ? clientsData : []);

        } catch (error) {
            console.error("Erreur chargement données:", error);
            Swal.fire('Erreur', 'Impossible de charger les données', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const isEditing = Boolean(editingRendezvousId);

    const isLivraisonMotif = (motif) => String(motif || '').toUpperCase().includes('LIVRAISON');

    const formatMotifLabel = (type) => {
        const normalized = String(type || '').toUpperCase();
        if (normalized.includes('LIVRAISON')) return 'Livraison';
        if (normalized === 'RETOUCHE') return 'Essayage';
        if (normalized === 'MESURE') return 'Prise de mesures';
        if (!normalized) return 'Autre';
        return type;
    };

    const mapMotifToTypeRendezVous = (motif) => {
        const normalized = String(motif || '').toUpperCase();
        if (normalized === 'ESSAYAGE') return 'RETOUCHE';
        if (normalized === 'PRISE DE MESURES') return 'MESURE';
        return normalized;
    };

    const mapTypeRendezVousToMotif = (type) => {
        const normalized = String(type || '').toUpperCase();
        if (normalized.includes('LIVRAISON')) return 'Livraison';
        if (normalized === 'RETOUCHE') return 'Essayage';
        if (normalized === 'MESURE') return 'Prise de mesures';
        return 'Autre';
    };

    const resetModalState = () => {
        setShowModal(false);
        setEditingRendezvousId(null);
        setSelectedClient(null);
        setClientDetails(null);
        setSearchTerm('');
        setFormData(getInitialFormData());
    };

    const openCreateModal = () => {
        setEditingRendezvousId(null);
        setSelectedClient(null);
        setClientDetails(null);
        setSearchTerm('');
        setFormData(getInitialFormData());
        setShowModal(true);
    };

    const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

    const isValidEmail = (value) => {
        if (!value || typeof value !== 'string') return false;
        const v = value.trim();
        return EMAIL_REGEX.test(v);
    };

    const findEmailInObject = (obj) => {
        if (!obj || typeof obj !== 'object') return '';
        const queue = [obj];
        const visited = new Set();
        while (queue.length) {
            const cur = queue.shift();
            if (!cur || typeof cur !== 'object' || visited.has(cur)) continue;
            visited.add(cur);
            Object.values(cur).forEach((val) => {
                if (typeof val === 'string') {
                    const match = val.match(EMAIL_REGEX);
                    if (match && match[0]) {
                        throw new Error(`__EMAIL__${match[0]}`);
                    }
                } else if (val && typeof val === 'object') {
                    queue.push(val);
                }
            });
        }
        return '';
    };

    const getClientEmail = (client, details) => {
        const direct = (
            client?.email ||
            client?.emailClient ||
            client?.mail ||
            client?.email_client ||
            details?.email ||
            details?.client?.email ||
            details?.client?.mail ||
            details?.client?.email_client ||
            ''
        );
        if (isValidEmail(direct)) return direct;
        try {
            findEmailInObject(client);
        } catch (e) {
            if (String(e?.message || '').startsWith('__EMAIL__')) {
                return String(e.message).replace('__EMAIL__', '');
            }
        }
        try {
            findEmailInObject(details);
        } catch (e) {
            if (String(e?.message || '').startsWith('__EMAIL__')) {
                return String(e.message).replace('__EMAIL__', '');
            }
        }
        return '';
    };

    const handleClientSelect = async (client) => {
        let detailsData = null;
        try {
            const details = await api.get(`/rendezvous/clients/${client.id}/details`);
            detailsData = details.data;
            setClientDetails(details.data);
        } catch (error) {
            console.error("Erreur chargement détails client:", error);
            setClientDetails(null);
        }

        const emailValue = getClientEmail(client, detailsData);

        setSelectedClient({ ...client, email: emailValue || client?.email || '' });
        setFormData(prev => ({
            ...prev,
            clientId: client.id,
            mesureId: prev.clientId === client.id ? prev.mesureId : ''
        }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
            mesureId: name === 'motif' && !isLivraisonMotif(value) ? '' : prev.mesureId
        }));
    };

    const handleEditRendezVous = async (id) => {
        try {
            const response = await api.get(`/rendezvous/${id}`);
            const rdv = response.data.data || response.data;
            const client = rdv.client || {};

            await handleClientSelect({
                id: client.id,
                nom: client.nom,
                prenom: client.prenom,
                contact: client.contact,
                email: client.email,
                photo: client.photo
            });

            const rdvDate = new Date(rdv.dateRDV);
            const dateValue = rdv.dateRDV ? rdv.dateRDV.split('T')[0] : getTomorrowDate();
            const heureValue = rdv.dateRDV
                ? rdvDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false })
                : '10:00';

            setEditingRendezvousId(id);
            setFormData({
                clientId: client.id || '',
                dateRendezVous: dateValue,
                heureRendezVous: heureValue,
                motif: mapTypeRendezVousToMotif(rdv.typeRendezVous),
                notes: rdv.notes || '',
                mesureId: rdv.mesure?.id || ''
            });
            setShowModal(true);
        } catch (error) {
            console.error('Erreur chargement rendez-vous:', error);
            Swal.fire('Erreur', 'Impossible de charger ce rendez-vous pour modification.', 'error');
        }
    };

    const getAvailableMesures = () => {
        const mesures = Array.isArray(clientDetails?.mesures) ? clientDetails.mesures : [];
        return [...mesures]
            .filter((mesure) => !mesure.dejaLivree || mesure.id === formData.mesureId)
            .sort((left, right) => Number(Boolean(right.pretPourLivraison)) - Number(Boolean(left.pretPourLivraison)));
    };

    const getMesureStatusLabel = (mesure) => {
        if (mesure.pretPourLivraison) {
            return 'Prêt pour livraison';
        }
        switch (mesure.statutProduction) {
            case 'TERMINE':
                return 'Terminé';
            case 'VALIDE':
                return 'Validé';
            case 'EN_COURS':
                return 'En cours';
            case 'EN_ATTENTE':
                return 'En attente';
            case 'ANNULE':
                return 'Annulé';
            default:
                return 'Non affecté';
        }
    };

    const getMesurePriceLabel = (mesure) => (
        mesure.prix != null ? `${mesure.prix} FCFA` : 'Prix à définir'
    );

    const getMesureImageUrl = (mesure) => (
        buildHabitPhotoUrl(mesure.habitPhotoPath) || '/assets/images/default-model.png'
    );

    const renderMesureCard = (mesure, options = {}) => {
        const { selected = false, onSelect = null } = options;
        const statusLabel = getMesureStatusLabel(mesure);
        const priceLabel = getMesurePriceLabel(mesure);
        const title = mesure.libelle || mesure.modeleNom || mesure.typeVetement || 'Vêtement';

        return (
            <button
                key={mesure.id}
                type="button"
                className={`btn p-0 text-start border rounded-3 overflow-hidden w-100 ${selected ? 'border-primary shadow-sm' : 'border-light-subtle'}`}
                onClick={() => onSelect?.(mesure.id)}
            >
                <div className="d-flex align-items-stretch">
                    <img
                        src={getMesureImageUrl(mesure)}
                        alt={title}
                        style={{ width: '92px', height: '92px', objectFit: 'cover', backgroundColor: '#f8f9fa' }}
                        onError={(e) => { e.target.src = '/assets/images/default-model.png'; }}
                    />
                    <div className="flex-grow-1 p-3">
                        <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
                            <div className="fw-semibold text-dark">{title}</div>
                            {selected && <span className="badge bg-primary">Sélectionné</span>}
                        </div>
                        <div className={`small fw-semibold ${mesure.pretPourLivraison ? 'text-success' : 'text-secondary'}`}>{statusLabel}</div>
                        <div className="small text-dark mt-1">{priceLabel}</div>
                        {mesure.dejaLivree && <div className="small text-primary mt-1">Déjà livrée</div>}
                        {mesure.description && (
                            <div className="small text-muted mt-1" style={{ lineHeight: 1.3 }}>{mesure.description}</div>
                        )}
                    </div>
                </div>
            </button>
        );
    };

    const ensureMesureSelectedForDeliveryAction = async (rendezvousId) => {
        const rdvResponse = await api.get(`/rendezvous/${rendezvousId}`);
        const rdv = rdvResponse.data.data || rdvResponse.data;

        if (!isLivraisonMotif(rdv.typeRendezVous)) {
            return true;
        }

        if (rdv.mesure?.id) {
            return true;
        }

        return selectDeliveryMeasureForClient(rdv.client.id);
    };

    const selectDeliveryMeasureForClient = async (clientId) => {
        const detailsResponse = await api.get(`/rendezvous/clients/${clientId}/details`);
        const details = detailsResponse.data;
        const allMesures = Array.isArray(details?.mesures) ? details.mesures : [];
        const mesuresDisponibles = allMesures.filter((mesure) => !mesure.dejaLivree);
        if (mesuresDisponibles.length === 0) {
            Swal.fire('Vêtement introuvable', 'Tous les vêtements de ce client ont déjà été livrés.', 'info');
            return null;
        }

        const mesuresPretes = mesuresDisponibles.filter(mesure => mesure.pretPourLivraison);
        const mesuresChoisissables = mesuresPretes.length > 0 ? mesuresPretes : mesuresDisponibles;
        let selectedMesureId = mesuresChoisissables.length === 1 ? mesuresChoisissables[0].id : '';

        const selectionHtml = `
            <div id="delivery-measure-grid" style="display:grid;gap:12px;max-height:420px;overflow-y:auto;padding:4px 2px;">
                ${mesuresChoisissables.map((mesure) => {
                    const title = escapeHtml(mesure.libelle || mesure.modeleNom || mesure.typeVetement || 'Vêtement');
                    const description = mesure.description ? `<div style="font-size:12px;color:#6c757d;margin-top:6px;line-height:1.35;">${escapeHtml(mesure.description)}</div>` : '';
                    return `
                        <button
                            type="button"
                            class="delivery-measure-card"
                            data-mesure-id="${mesure.id}"
                            style="display:flex;align-items:stretch;width:100%;padding:0;border:1px solid ${selectedMesureId === mesure.id ? '#0d6efd' : '#dee2e6'};border-radius:14px;overflow:hidden;background:#fff;box-shadow:${selectedMesureId === mesure.id ? '0 0 0 3px rgba(13,110,253,.12)' : 'none'};cursor:pointer;"
                        >
                            <img src="${escapeHtml(getMesureImageUrl(mesure))}" alt="${title}" style="width:96px;height:96px;object-fit:cover;background:#f8f9fa;flex-shrink:0;" onerror="this.src='/assets/images/default-model.png'" />
                            <div style="padding:12px;flex:1;text-align:left;">
                                <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">
                                    <strong style="color:#212529;">${title}</strong>
                                    ${selectedMesureId === mesure.id ? '<span style="font-size:11px;background:#0d6efd;color:#fff;border-radius:999px;padding:4px 8px;">Sélectionné</span>' : ''}
                                </div>
                                <div style="font-size:13px;font-weight:600;margin-top:6px;color:${mesure.pretPourLivraison ? '#198754' : '#6c757d'};">${escapeHtml(getMesureStatusLabel(mesure))}</div>
                                <div style="font-size:13px;color:#212529;margin-top:4px;">${escapeHtml(getMesurePriceLabel(mesure))}</div>
                                ${description}
                            </div>
                        </button>`;
                }).join('')}
            </div>
        `;

        const selection = await Swal.fire({
            title: 'Choisir le vêtement à livrer',
            html: `<div style="text-align:left;margin-bottom:12px;color:#6c757d;">${mesuresPretes.length > 0
                ? 'Sélectionnez le vêtement prêt pour cette livraison.'
                : 'Aucun vêtement n\'est marqué prêt. Sélectionnez quand même le vêtement concerné.'}</div>${selectionHtml}`,
            showCancelButton: true,
            confirmButtonText: 'Valider',
            cancelButtonText: 'Annuler',
            didOpen: () => {
                const cards = Array.from(document.querySelectorAll('.delivery-measure-card'));
                const updateSelection = (mesureId) => {
                    selectedMesureId = mesureId;
                    cards.forEach((card) => {
                        const isSelected = card.getAttribute('data-mesure-id') === mesureId;
                        card.style.borderColor = isSelected ? '#0d6efd' : '#dee2e6';
                        card.style.boxShadow = isSelected ? '0 0 0 3px rgba(13,110,253,.12)' : 'none';
                        const badge = card.querySelector('.delivery-measure-selected-badge');
                        if (badge) {
                            badge.remove();
                        }
                        if (isSelected) {
                            const header = card.querySelector('.delivery-measure-header');
                            if (header) {
                                const span = document.createElement('span');
                                span.className = 'delivery-measure-selected-badge';
                                span.textContent = 'Sélectionné';
                                span.style.fontSize = '11px';
                                span.style.background = '#0d6efd';
                                span.style.color = '#fff';
                                span.style.borderRadius = '999px';
                                span.style.padding = '4px 8px';
                                header.appendChild(span);
                            }
                        }
                    });
                };

                cards.forEach((card) => {
                    const titleNode = card.querySelector('strong');
                    if (titleNode && titleNode.parentElement) {
                        titleNode.parentElement.classList.add('delivery-measure-header');
                    }
                    card.addEventListener('click', () => updateSelection(card.getAttribute('data-mesure-id')));
                });

                if (selectedMesureId) {
                    updateSelection(selectedMesureId);
                }
            },
            preConfirm: () => {
                if (!selectedMesureId) {
                    Swal.showValidationMessage('Veuillez sélectionner un vêtement.');
                    return false;
                }
                return selectedMesureId;
            }
        });

        if (!selection.isConfirmed || !selection.value) {
            return null;
        }

        return selection.value;
    };

    const handleCreateFollowUpDelivery = async (rv) => {
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || sessionStorage.getItem('userData'));
            const atelierId = userData ? (userData.atelierId || (userData.atelier && userData.atelier.id)) : null;
            const rdvResponse = await api.get(`/rendezvous/${rv.id}`);
            const rdv = rdvResponse.data.data || rdvResponse.data;
            const mesureId = await selectDeliveryMeasureForClient(rdv.client.id);

            if (!mesureId) {
                return;
            }

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(10, 0, 0, 0);

            await api.post('/rendezvous', {
                clientId: rdv.client.id,
                atelierId,
                dateRDV: tomorrow.toISOString().slice(0, 19),
                typeRendezVous: rdv.typeRendezVous,
                notes: rdv.notes || 'Rendez-vous ajouté pour un autre vêtement restant à livrer.',
                mesureId
            });

            Swal.fire('Succès', 'Un nouveau rendez-vous de livraison a été créé pour un autre vêtement restant.', 'success');
            loadData();
        } catch (error) {
            console.error('Erreur création livraison complémentaire:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Impossible de créer une livraison complémentaire';
            Swal.fire('Erreur', errorMessage, 'error');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (saving) {
            return;
        }
        setSaving(true);
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || sessionStorage.getItem('userData'));
            const atelierId = userData ? (userData.atelierId || (userData.atelier && userData.atelier.id)) : null;

            // Combine date and time for dateRDV
            const dateRDV = `${formData.dateRendezVous}T${formData.heureRendezVous}`;

            const availableMesures = getAvailableMesures();
            let selectedMesureId = formData.mesureId || '';

            if (isLivraisonMotif(formData.motif)) {
                if (!selectedMesureId && availableMesures.length === 1) {
                    selectedMesureId = availableMesures[0].id;
                }
                if (!selectedMesureId && availableMesures.length > 1) {
                    Swal.fire('Vêtement requis', 'Veuillez sélectionner le vêtement concerné par cette livraison.', 'warning');
                    return;
                }
            }

            const typeRendezVous = mapMotifToTypeRendezVous(formData.motif);

            const payload = {
                dateRDV: dateRDV,
                typeRendezVous: typeRendezVous,
                notes: formData.notes,
                mesureId: isLivraisonMotif(formData.motif) ? (selectedMesureId || null) : null
            };

            if (isEditing) {
                await api.put(`/rendezvous/${editingRendezvousId}`, payload);
            } else {
                await api.post('/rendezvous', {
                    ...payload,
                    clientId: formData.clientId,
                    atelierId: atelierId
                });
            }
            
            Swal.fire(
                'Succès',
                isEditing
                    ? 'Rendez-vous modifié avec succès.'
                    : 'Rendez-vous créé avec succès ! Un email de confirmation a été envoyé au client.',
                'success'
            );
            resetModalState();
            loadData(); // Recharger la liste

        } catch (error) {
            console.error("Erreur création rendez-vous:", error);
            const errorMessage = error.response?.data?.message || error.message || `Impossible de ${isEditing ? 'modifier' : 'créer'} le rendez-vous`;
            Swal.fire('Erreur', errorMessage, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleStatusChange = async (rv, action) => {
        try {
            if ((action === 'confirmer' || action === 'terminer') && isLivraisonMotif(rv.motif)) {
                const mesureSelectionnee = await ensureMesureSelectedForDeliveryAction(rv.id);
                if (!mesureSelectionnee) {
                    return;
                }

                if (!rv.selectedMeasureId) {
                    const rdvResponse = await api.get(`/rendezvous/${rv.id}`);
                    const rdv = rdvResponse.data.data || rdvResponse.data;
                    await api.put(`/rendezvous/${rv.id}`, {
                        dateRDV: rdv.dateRDV,
                        typeRendezVous: rdv.typeRendezVous,
                        notes: rdv.notes || '',
                        mesureId: mesureSelectionnee
                    });
                }
            }

            const result = await Swal.fire({
                title: 'Êtes-vous sûr ?',
                text: `Voulez-vous vraiment ${action} ce rendez-vous ?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Oui',
                cancelButtonText: 'Non'
            });

            if (result.isConfirmed) {
                await api.put(`/rendezvous/${rv.id}/${action}`);
                Swal.fire('Succès', `Rendez-vous ${action === 'confirmer' ? 'confirmé' : action === 'annuler' ? 'annulé' : 'terminé'}. Le client a été notifié par email.`, 'success');
                loadData();
            }
        } catch (error) {
            console.error(`Erreur ${action} rendez-vous:`, error);
            Swal.fire('Erreur', `Impossible de changer le statut`, 'error');
        }
    };

    const handleDeleteRendezVous = async (id) => {
        try {
            const result = await Swal.fire({
                title: 'Supprimer ce rendez-vous ?',
                text: 'Cette action est irréversible et aucune notification ne sera envoyée.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonText: 'Annuler',
                confirmButtonText: 'Supprimer'
            });

            if (result.isConfirmed) {
                await api.delete(`/rendezvous/${id}`);
                Swal.fire('Supprimé', 'Le rendez-vous a été supprimé.', 'success');
                loadData();
            }
        } catch (error) {
            console.error('Erreur suppression rendez-vous:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Impossible de supprimer ce rendez-vous';
            Swal.fire('Erreur', errorMessage, 'error');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'CONFIRME': return <span className="badge bg-success">Confirmé</span>;
            case 'EN_ATTENTE': return <span className="badge bg-warning text-dark">En attente</span>;
            case 'PLANIFIE': return <span className="badge bg-info text-dark">Planifié</span>;
            case 'ANNULE': return <span className="badge bg-danger">Annulé</span>;
            case 'TERMINE': return <span className="badge bg-secondary">Terminé</span>;
            default: return <span className="badge bg-secondary">{status}</span>;
        }
    };

    const filteredClients = clients.filter((client) => {
        const value = `${client.prenom || ''} ${client.nom || ''} ${client.contact || ''}`.toLowerCase();
        return value.includes(searchTerm.toLowerCase());
    });

    const filteredRendezvousList = rendezvousList.filter((rv) => {
        const value = [
            rv.clientNom,
            rv.clientPrenom,
            rv.clientTelephone,
            rv.motifLabel,
            rv.selectedMeasureLabel,
            rv.statut
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        return value.includes(tableSearchTerm.toLowerCase());
    });

    return (
        <>
            {/* Breadcrumb */}
            <div className="page-breadcrumb d-flex flex-wrap align-items-center gap-2 mb-3">
                <div className="breadcrumb-title pe-3">Rendez-vous</div>
                <div className="ps-3">
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb mb-0 p-0">
                            <li className="breadcrumb-item"><Link to="/"><i className="bx bx-home-alt"></i></Link></li>
                            <li className="breadcrumb-item active" aria-current="page">Gestion des Rendez-vous</li>
                        </ol>
                    </nav>
                </div>
                <div className="ms-auto">
                    <button className="btn btn-primary" onClick={openCreateModal}>
                        <i className="bx bx-plus"></i> Nouveau Rendez-vous
                    </button>
                </div>
            </div>

            <div className="row">
                <div className="col-12">
                    <div className="card">
                        <div className="card-body">
                            <div className="d-flex align-items-center mb-4">
                                <div>
                                    <h5 className="mb-0">Rendez-vous à venir</h5>
                                    <p className="mb-0 text-secondary">Gérez vos essayages et livraisons</p>
                                </div>
                            </div>

                            <div className="row g-3 align-items-center mb-3">
                                <div className="col-md-6 col-lg-5">
                                    <label className="form-label">Filtrer les rendez-vous</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Rechercher par client, téléphone, motif ou statut..."
                                        value={tableSearchTerm}
                                        onChange={(e) => setTableSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            {loading ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-primary" role="status">
                                        <span className="visually-hidden">Chargement...</span>
                                    </div>
                                </div>
                            ) : filteredRendezvousList.length === 0 ? (
                                <div className="text-center py-5">
                                    <i className="bx bx-calendar-x fs-1 text-muted mb-3"></i>
                                    <p className="text-muted">Aucun rendez-vous prévu prochainement.</p>
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover table-bordered align-middle mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th style={{ width: '60px' }}>N</th>
                                                <th>Client</th>
                                                <th>Date & Heure</th>
                                                <th>Motif</th>
                                                <th>Statut</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredRendezvousList.map((rv, index) => (
                                                <tr key={rv.id}>
                                                    <td className="fw-semibold text-muted">{index + 1}</td>
                                                    <td>
                                                        <div className="d-flex align-items-center">
                                                            <div>
                                                                <h6 className="mb-1 font-14">{rv.clientNom} {rv.clientPrenom}</h6>
                                                                <small className="text-secondary">{rv.clientTelephone}</small>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex flex-column">
                                                            <span className="fw-bold">{new Date(rv.dateRendezVous).toLocaleDateString('fr-FR')}</span>
                                                            <small className="text-secondary">{rv.heureRendezVous}</small>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex flex-column">
                                                            <span>{rv.motifLabel}</span>
                                                            {rv.selectedMeasureLabel && (
                                                                <small className={`text-${rv.selectedMeasureReady ? 'success' : 'secondary'}`}>
                                                                    {rv.selectedMeasureLabel}
                                                                </small>
                                                            )}
                                                            {isLivraisonMotif(rv.motif) && rv.remainingMeasuresToDeliver > 0 && (
                                                                <small className="text-primary">
                                                                    {rv.remainingMeasuresToDeliver} vêtement(s) restant(s) à livrer
                                                                </small>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>{getStatusBadge(rv.statut)}</td>
                                                    <td>
                                                        <div className="d-flex gap-2">
                                                            {rv.statut !== 'TERMINE' && (
                                                                <button
                                                                    className="btn btn-sm btn-outline-primary"
                                                                    onClick={() => handleEditRendezVous(rv.id)}
                                                                    title="Modifier"
                                                                >
                                                                    <i className="bx bx-edit"></i>
                                                                </button>
                                                            )}
                                                            {(rv.statut === 'EN_ATTENTE' || rv.statut === 'PLANIFIE') && (
                                                                <>
                                                                    <button 
                                                                        className="btn btn-sm btn-success"
                                                                        onClick={() => handleStatusChange(rv, 'confirmer')}
                                                                        title="Confirmer"
                                                                    >
                                                                        <i className="bx bx-check"></i>
                                                                    </button>
                                                                    <button 
                                                                        className="btn btn-sm btn-danger"
                                                                        onClick={() => handleStatusChange(rv, 'annuler')}
                                                                        title="Annuler"
                                                                    >
                                                                        <i className="bx bx-x"></i>
                                                                    </button>
                                                                </>
                                                            )}
                                                            {rv.statut === 'CONFIRME' && (
                                                                <button 
                                                                    className="btn btn-sm btn-primary"
                                                                    onClick={() => handleStatusChange(rv, 'terminer')}
                                                                    title="Marquer comme terminé"
                                                                >
                                                                    <i className="bx bx-check-double"></i>
                                                                </button>
                                                            )}
                                                            {isLivraisonMotif(rv.motif) && rv.remainingMeasuresToDeliver > 0 && (rv.statut === 'CONFIRME' || rv.statut === 'TERMINE') && (
                                                                <button
                                                                    className="btn btn-sm btn-outline-primary"
                                                                    onClick={() => handleCreateFollowUpDelivery(rv)}
                                                                    title="Planifier un autre vêtement restant"
                                                                >
                                                                    <i className="bx bx-plus-medical"></i>
                                                                </button>
                                                            )}
                                                            {(rv.statut !== 'CONFIRME' && rv.statut !== 'TERMINE') && (
                                                                <button
                                                                    className="btn btn-sm btn-outline-danger"
                                                                    onClick={() => handleDeleteRendezVous(rv.id)}
                                                                    title="Supprimer"
                                                                >
                                                                    <i className="bx bx-trash"></i>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Nouveau Rendez-vous */}
            {showModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">{isEditing ? 'Modifier le rendez-vous' : 'Nouveau Rendez-vous'}</h5>
                                <button type="button" className="btn-close" onClick={resetModalState}></button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="row">
                                        {/* Colonne Gauche : Sélection Client */}
                                        <div className="col-md-6 border-end">
                                            <h6 className="mb-3">1. Sélectionner un client</h6>
                                            <div className="mb-3">
                                                <input 
                                                    type="text" 
                                                    className="form-control mb-2" 
                                                    placeholder="Rechercher un client..." 
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    disabled={isEditing}
                                                />
                                                <div className="list-group" style={{maxHeight: '300px', overflowY: 'auto'}}>
                                                    {filteredClients.map(client => (
                                                        <button
                                                            key={client.id}
                                                            type="button"
                                                            className={`list-group-item list-group-item-action ${selectedClient?.id === client.id ? 'active' : ''}`}
                                                            onClick={() => handleClientSelect(client)}
                                                            disabled={isEditing && selectedClient?.id !== client.id}
                                                        >
                                                            <div className="d-flex w-100 justify-content-between">
                                                                <h6 className="mb-1">
                                                                    {client.prenom} {client.nom}
                                                                    {isValidEmail(getClientEmail(client, clientDetails)) ? 
                                                                        <i className="bx bx-envelope text-success ms-2" title="Email valide"></i> : 
                                                                        <i className="bx bx-error-circle text-danger ms-2" title="Email manquant"></i>
                                                                    }
                                                                </h6>
                                                            </div>
                                                            <small>{client.contact}</small>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Colonne Droite : Détails RDV */}
                                        <div className="col-md-6">
                                            <h6 className="mb-3">2. Détails du rendez-vous</h6>
                                            
                                            {selectedClient ? (
                                                <>
                                                    <div className="alert alert-info py-2 mb-3">
                                                        <small><i className="bx bx-user me-1"></i>Client: <strong>{selectedClient.prenom} {selectedClient.nom}</strong></small>
                                                    </div>

                                                    <div className="mb-3">
                                                        <label className="form-label">Date</label>
                                                        <input 
                                                            type="date" 
                                                            className="form-control" 
                                                            name="dateRendezVous" 
                                                            value={formData.dateRendezVous} 
                                                            onChange={handleInputChange}
                                                            required 
                                                        />
                                                    </div>
                                                    <div className="mb-3">
                                                        <label className="form-label">Heure</label>
                                                        <input 
                                                            type="time" 
                                                            className="form-control" 
                                                            name="heureRendezVous" 
                                                            value={formData.heureRendezVous} 
                                                            onChange={handleInputChange}
                                                            required 
                                                        />
                                                    </div>
                                                    <div className="mb-3">
                                                        <label className="form-label">Motif</label>
                                                        <select 
                                                            className="form-select" 
                                                            name="motif" 
                                                            value={formData.motif} 
                                                            onChange={handleInputChange}
                                                        >
                                                            <option value="Essayage">Essayage</option>
                                                            <option value="Livraison">Livraison</option>
                                                            <option value="Prise de mesures">Prise de mesures</option>
                                                            <option value="Autre">Autre</option>
                                                        </select>
                                                    </div>
                                                    {isLivraisonMotif(formData.motif) && (
                                                        <div className="mb-3">
                                                            <label className="form-label">
                                                                Vêtement concerné
                                                                {getAvailableMesures().length > 1 ? ' *' : ''}
                                                            </label>
                                                            <div className="d-grid gap-2">
                                                                {getAvailableMesures().length === 0 && (
                                                                    <div className="alert alert-warning mb-0">
                                                                        Aucun vêtement n'est encore disponible pour ce client.
                                                                    </div>
                                                                )}
                                                                {getAvailableMesures().map((mesure) => (
                                                                    <div key={mesure.id}>
                                                                        {renderMesureCard(mesure, {
                                                                            selected: formData.mesureId === mesure.id,
                                                                            onSelect: (mesureId) => setFormData((prev) => ({ ...prev, mesureId }))
                                                                        })}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <small className="text-secondary d-block mt-1">
                                                                Sélectionnez le vêtement attendu pour ce rendez-vous de livraison.
                                                            </small>
                                                        </div>
                                                    )}
                                                    <div className="mb-3">
                                                        <label className="form-label">Notes (Optionnel)</label>
                                                        <textarea 
                                                            className="form-control"
                                                            name="notes"
                                                            rows="2"
                                                            value={formData.notes}
                                                            onChange={handleInputChange}
                                                        ></textarea>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-center py-5 text-muted">
                                                    <i className="bx bx-left-arrow-alt mb-2"></i>
                                                    <p>Veuillez sélectionner un client à gauche</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={resetModalState}>Annuler</button>
                                    <button type="submit" className="btn btn-primary" disabled={!selectedClient || saving}>
                                        {saving ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                Enregistrement...
                                            </>
                                        ) : (
                                            isEditing ? 'Enregistrer les modifications' : 'Enregistrer'
                                        )}
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

export default Rendezvous;
