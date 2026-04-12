import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/api';
import Swal from 'sweetalert2';

const Paiements = () => {
    const [activeTab, setActiveTab] = useState('clients');
    const [clientsList, setClientsList] = useState([]);
    const [tailleursList, setTailleursList] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [selectedTailleur, setSelectedTailleur] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingRecouvrement, setLoadingRecouvrement] = useState(false);
    const [recouvrementMensuel, setRecouvrementMensuel] = useState(0);
    const [recouvrementMonth, setRecouvrementMonth] = useState(new Date().getMonth() + 1);
    const [recouvrementYear, setRecouvrementYear] = useState(new Date().getFullYear());
    
    const [filters, setFilters] = useState({
        statut: '',
        search: ''
    });

    const [paymentForm, setPaymentForm] = useState({
        montant: '',
        moyen: 'ESPECES',
        reference: '',
        datePaiement: new Date().toISOString().split('T')[0]
    });

    const [recuData, setRecuData] = useState(null);
    const [savingPayment, setSavingPayment] = useState(false);
    const [sharingReceipt, setSharingReceipt] = useState(false);
    const [loadingReceiptId, setLoadingReceiptId] = useState(null);

    useEffect(() => {
        loadData();
    }, [activeTab, filters]); // Reload when tab or filters change

    useEffect(() => {
        loadRecouvrementMensuel();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recouvrementMonth, recouvrementYear]);

    // Reset selection when tab changes
    useEffect(() => {
        setSelectedClient(null);
        setSelectedTailleur(null);
        setPaymentForm(prev => ({
            ...prev,
            montant: '',
            reference: `REF-${activeTab === 'clients' ? 'CLI' : 'TAI'}-${Date.now().toString().slice(-6)}`
        }));
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || sessionStorage.getItem('userData'));
            const atelierId = userData ? (userData.atelierId || (userData.atelier && userData.atelier.id)) : null;
            
            if (!atelierId) {
                console.error("Atelier ID not found in user data");
                return;
            }

            let url = activeTab === 'clients' 
                ? `/paiements/clients/recherche?atelierId=${atelierId}`
                : `/paiements/tailleurs/recherche?atelierId=${atelierId}`;

            if (filters.search) url += `&searchTerm=${encodeURIComponent(filters.search)}`;
            if (filters.statut) url += `&statutPaiement=${filters.statut}`;

            const response = await api.get(url);
            
            // Handle potential data wrapper
            const data = response.data.data || response.data;
            
            if (activeTab === 'clients') {
                setClientsList(data);
            } else {
                setTailleursList(data);
            }

        } catch (error) {
            console.error("Erreur chargement données:", error);
            Swal.fire('Erreur', 'Impossible de charger les données', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSelectClient = async (clientId) => {
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || sessionStorage.getItem('userData'));
            const atelierId = userData ? (userData.atelierId || (userData.atelier && userData.atelier.id)) : null;
            const response = await api.get(`/paiements/clients/${clientId}?atelierId=${atelierId}`);
            setSelectedClient(response.data);
            // Reset form for new selection
            setPaymentForm(prev => ({
                ...prev,
                montant: '',
                reference: `REF-CLI-${Date.now().toString().slice(-6)}`
            }));
        } catch (error) {
            console.error("Erreur chargement détails client:", error);
        }
    };

    const handleSelectTailleur = async (tailleurId) => {
        try {
            const userData = JSON.parse(localStorage.getItem('userData') || sessionStorage.getItem('userData'));
            const atelierId = userData ? (userData.atelierId || (userData.atelier && userData.atelier.id)) : null;
            const response = await api.get(`/paiements/tailleurs/${tailleurId}?atelierId=${atelierId}`);
            setSelectedTailleur(response.data);
            // Reset form for new selection
            setPaymentForm(prev => ({
                ...prev,
                montant: '',
                reference: `REF-TAI-${Date.now().toString().slice(-6)}`
            }));
        } catch (error) {
            console.error("Erreur chargement détails tailleur:", error);
        }
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        if (savingPayment) {
            return;
        }

        const userData = JSON.parse(localStorage.getItem('userData') || sessionStorage.getItem('userData'));
        const atelierId = userData ? (userData.atelierId || (userData.atelier && userData.atelier.id)) : null;
        const isClient = activeTab === 'clients';
        const entity = isClient ? selectedClient : selectedTailleur;
        const maxAmount = entity.resteAPayer || 0;

        if (parseFloat(paymentForm.montant) > maxAmount) {
            Swal.fire('Attention', `Le montant ne peut pas dépasser ${maxAmount.toLocaleString()} FCFA`, 'warning');
            return;
        }

        try {
            setSavingPayment(true);
            const payload = {
                ...paymentForm,
                montant: parseFloat(paymentForm.montant),
                atelierId: atelierId, // Removed parseInt
                [isClient ? 'clientId' : 'tailleurId']: isClient ? selectedClient.clientId : selectedTailleur.tailleurId
            };

            const endpoint = isClient ? '/paiements/clients' : '/paiements/tailleurs';
            const response = await api.post(endpoint, payload);

            Swal.fire('Succès', 'Paiement enregistré avec succès', 'success');
            
            // Load receipt data
            const recuResponse = await api.get(`/paiements/recu/${isClient ? 'client' : 'tailleur'}/${response.data.id}?atelierId=${atelierId}`);
            setRecuData(recuResponse.data);

            // Refresh data
            loadData();
            if (isClient) handleSelectClient(selectedClient.clientId);
            else handleSelectTailleur(selectedTailleur.tailleurId);

        } catch (error) {
            console.error("Erreur enregistrement paiement:", error);
            Swal.fire('Erreur', error?.response?.data || 'Impossible d\'enregistrer le paiement', 'error');
        } finally {
            setSavingPayment(false);
        }
    };

    const getCurrentAtelierId = () => {
        const userData = JSON.parse(localStorage.getItem('userData') || sessionStorage.getItem('userData'));
        return userData ? (userData.atelierId || (userData.atelier && userData.atelier.id)) : null;
    };

    const loadRecouvrementMensuel = async () => {
        const atelierId = getCurrentAtelierId();
        if (!atelierId) {
            setRecouvrementMensuel(0);
            return;
        }

        setLoadingRecouvrement(true);
        try {
            const response = await api.get(`/paiements/recouvrement-mensuel?atelierId=${atelierId}&month=${recouvrementMonth}&year=${recouvrementYear}`);
            setRecouvrementMensuel(response.data?.totalRecouvrement || 0);
        } catch (error) {
            console.error('Erreur chargement recouvrement mensuel:', error);
            setRecouvrementMensuel(0);
        } finally {
            setLoadingRecouvrement(false);
        }
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

    const handleOpenReceipt = async (paiementId, receiptType) => {
        const atelierId = getCurrentAtelierId();
        if (!atelierId || !paiementId) {
            Swal.fire('Erreur', 'Impossible de charger ce reçu.', 'error');
            return;
        }

        try {
            setLoadingReceiptId(paiementId);
            const recuResponse = await api.get(`/paiements/recu/${receiptType}/${paiementId}?atelierId=${atelierId}`);
            setRecuData(recuResponse.data);
        } catch (error) {
            console.error('Erreur chargement reçu historique:', error);
            Swal.fire('Erreur', 'Impossible de générer le reçu depuis l\'historique.', 'error');
        } finally {
            setLoadingReceiptId(null);
        }
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

    const handlePrint = async () => {
        if (!recuData) {
            Swal.fire('Erreur', 'Aucun reçu sélectionné pour impression.', 'error');
            return;
        }

        try {
            const blob = await fetchReceiptPdfBlob(recuData);
            const fileUrl = window.URL.createObjectURL(blob);
            const printWindow = window.open(fileUrl, '_blank');
            if (printWindow) {
                printWindow.focus();
                printWindow.onload = () => {
                    printWindow.print();
                };
            } else {
                downloadBlob(blob, buildReceiptFileName(recuData));
                Swal.fire('PDF prêt', 'Le reçu PDF a été téléchargé. Vous pouvez l’imprimer depuis votre PDF viewer.', 'info');
            }
        } catch (error) {
            console.error('Erreur impression reçu PDF:', error);
            Swal.fire('Erreur', 'Impossible de générer le reçu PDF pour impression.', 'error');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'PAYE': return <span className="badge bg-success">Payé</span>;
            case 'PARTIEL': return <span className="badge bg-warning text-dark">Partiel</span>;
            case 'EN_ATTENTE': return <span className="badge bg-danger">En attente</span>;
            default: return <span className="badge bg-secondary">{status}</span>;
        }
    };

    const getInitials = (nom, prenom) => {
        return `${(prenom || '').charAt(0)}${(nom || '').charAt(0)}`.toUpperCase();
    };

    return (
        <>
            {/* Breadcrumb */}
            <div className="page-breadcrumb d-none d-sm-flex align-items-center mb-3">
                <div className="breadcrumb-title pe-3">Paiements</div>
                <div className="ps-3">
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb mb-0 p-0">
                            <li className="breadcrumb-item"><Link to="/"><i className="bx bx-home-alt"></i></Link></li>
                            <li className="breadcrumb-item active" aria-current="page">Gestion des Paiements</li>
                        </ol>
                    </nav>
                </div>
            </div>

            {/* Tabs */}
            <ul className="nav nav-tabs mb-4">
                <li className="nav-item">
                    <button 
                        className={`nav-link ${activeTab === 'clients' ? 'active' : ''}`}
                        onClick={() => setActiveTab('clients')}
                    >
                        <i className="bx bx-user me-2"></i>Paiements Clients
                    </button>
                </li>
                <li className="nav-item">
                    <button 
                        className={`nav-link ${activeTab === 'tailleurs' ? 'active' : ''}`}
                        onClick={() => setActiveTab('tailleurs')}
                    >
                        <i className="bx bx-cut me-2"></i>Paiements Tailleurs
                    </button>
                </li>
            </ul>

            <div className="row">
                {/* Left Column: List */}
                <div className="col-md-8">
                    <div className="card mb-4">
                        <div className="card-body">
                            <div className="row g-3">
                                <div className="col-md-3">
                                    <select 
                                        className="form-select"
                                        value={filters.statut}
                                        onChange={(e) => setFilters(prev => ({ ...prev, statut: e.target.value }))}
                                    >
                                        <option value="">Tous les statuts</option>
                                        <option value="EN_ATTENTE">En attente</option>
                                        <option value="PARTIEL">Partiel</option>
                                        <option value="PAYE">Payé</option>
                                    </select>
                                </div>
                                <div className="col-md-3">
                                    <select
                                        className="form-select"
                                        value={recouvrementMonth}
                                        onChange={(e) => setRecouvrementMonth(Number(e.target.value))}
                                    >
                                        {Array.from({ length: 12 }, (_, idx) => idx + 1).map((month) => (
                                            <option key={month} value={month}>
                                                {new Date(0, month - 1).toLocaleString('fr-FR', { month: 'long' })}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-md-2">
                                    <select
                                        className="form-select"
                                        value={recouvrementYear}
                                        onChange={(e) => setRecouvrementYear(Number(e.target.value))}
                                    >
                                        {Array.from({ length: 2 }, (_, idx) => new Date().getFullYear() - 1 + idx).map((year) => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-md-4">
                                    <input 
                                        type="text" 
                                        className="form-control" 
                                        placeholder={`Rechercher un ${activeTab === 'clients' ? 'client' : 'tailleur'}...`}
                                        value={filters.search}
                                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div className="row mt-3">
                                <div className="col-12">
                                    <div className="alert alert-info d-flex align-items-center justify-content-between mb-0">
                                        <div>
                                            <div className="small text-uppercase text-muted">Recouvrement mensuel</div>
                                            <div className="h5 mb-0">
                                                {loadingRecouvrement ? 'Chargement...' : `${recouvrementMensuel?.toLocaleString('fr-FR')} FCFA`}
                                            </div>
                                        </div>
                                        <div className="small text-muted">
                                            {`${new Date(recouvrementYear, recouvrementMonth - 1).toLocaleString('fr-FR', { month: 'long' })} ${recouvrementYear}`}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="row">
                        {loading ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Chargement...</span>
                                </div>
                            </div>
                        ) : (activeTab === 'clients' ? clientsList : tailleursList).length === 0 ? (
                            <div className="col-12 text-center py-5">
                                <p className="text-muted">Aucun résultat trouvé.</p>
                            </div>
                        ) : (
                            (activeTab === 'clients' ? clientsList : tailleursList).map(item => {
                                const isClient = activeTab === 'clients';
                                const id = isClient ? item.clientId : item.tailleurId;
                                const nom = isClient ? item.clientNom : item.tailleurNom;
                                const prenom = isClient ? item.clientPrenom : item.tailleurPrenom;
                                const total = isClient ? item.prixTotal : item.totalDu;
                                const paye = item.montantPaye;
                                const reste = item.resteAPayer;
                                const percent = total > 0 ? (paye / total) * 100 : 0;

                                return (
                                    <div className="col-md-6 mb-3" key={id}>
                                        <div 
                                            className={`card h-100 cursor-pointer ${
                                                (isClient && selectedClient?.clientId === id) || (!isClient && selectedTailleur?.tailleurId === id) 
                                                ? 'border-primary' : ''
                                            }`}
                                            onClick={() => isClient ? handleSelectClient(id) : handleSelectTailleur(id)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="card-body">
                                                <div className="d-flex align-items-center mb-3">
                                                    <div className={`rounded-circle d-flex align-items-center justify-content-center text-white me-3 ${isClient ? 'bg-primary' : 'bg-warning'}`} style={{width: '40px', height: '40px'}}>
                                                        {getInitials(nom, prenom)}
                                                    </div>
                                                    <div className="flex-grow-1">
                                                        <h6 className="mb-0">{prenom} {nom}</h6>
                                                        <small className="text-muted">{isClient ? (item.modeleNom || 'Modèle personnalisé') : `${item.modelesCousus || 0} modèles`}</small>
                                                    </div>
                                                    {getStatusBadge(item.statutPaiement)}
                                                </div>

                                                <div className="mb-2">
                                                    <div className="d-flex justify-content-between small mb-1">
                                                        <span>Progression</span>
                                                        <span>{Math.round(percent)}%</span>
                                                    </div>
                                                    <div className="progress" style={{height: '5px'}}>
                                                        <div className={`progress-bar ${isClient ? 'bg-primary' : 'bg-warning'}`} role="progressbar" style={{width: `${percent}%`}}></div>
                                                    </div>
                                                </div>

                                                <div className="row text-center small">
                                                    <div className="col-4">
                                                        <div className="text-muted">Total</div>
                                                        <div className="fw-bold">{total?.toLocaleString()} F</div>
                                                    </div>
                                                    <div className="col-4">
                                                        <div className="text-muted">Payé</div>
                                                        <div className="fw-bold text-success">{paye?.toLocaleString()} F</div>
                                                    </div>
                                                    <div className="col-4">
                                                        <div className="text-muted">Reste</div>
                                                        <div className="fw-bold text-danger">{reste?.toLocaleString()} F</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Column: Details & Form */}
                <div className="col-md-4">
                    {/* Details Card */}
                    <div className="card mb-4">
                        <div className={`card-header text-white ${activeTab === 'clients' ? 'bg-primary' : 'bg-warning text-dark'}`}>
                            <h6 className="mb-0">Détails</h6>
                        </div>
                        <div className="card-body">
                            {((activeTab === 'clients' && selectedClient) || (activeTab === 'tailleurs' && selectedTailleur)) ? (
                                <>
                                    {(() => {
                                        const entity = activeTab === 'clients' ? selectedClient : selectedTailleur;
                                        const isClient = activeTab === 'clients';
                                        return (
                                            <>
                                                <h5 className="text-center mb-3">{entity.clientPrenom || entity.tailleurPrenom} {entity.clientNom || entity.tailleurNom}</h5>
                                                <div className="list-group list-group-flush mb-3">
                                                    <div className="list-group-item d-flex justify-content-between">
                                                        <span>Total</span>
                                                        <strong>{(isClient ? entity.prixTotal : entity.totalDu)?.toLocaleString()} F</strong>
                                                    </div>
                                                    <div className="list-group-item d-flex justify-content-between">
                                                        <span>Déjà payé</span>
                                                        <strong className="text-success">{entity.montantPaye?.toLocaleString()} F</strong>
                                                    </div>
                                                    <div className="list-group-item d-flex justify-content-between">
                                                        <span>Reste à payer</span>
                                                        <strong className="text-danger">{entity.resteAPayer?.toLocaleString()} F</strong>
                                                    </div>
                                                </div>

                                                {entity.historiquePaiements?.length > 0 && (
                                                    <div className="mt-3">
                                                        <h6 className="text-muted small text-uppercase">Historique</h6>
                                                        <div style={{maxHeight: '150px', overflowY: 'auto'}}>
                                                            {entity.historiquePaiements.map((p, idx) => (
                                                                <div key={p.id || idx} className="small mb-2 border-bottom pb-2">
                                                                    <div className="d-flex justify-content-between align-items-start gap-2">
                                                                        <div>
                                                                        <div>{new Date(p.datePaiement).toLocaleDateString()}</div>
                                                                        <div className="text-muted">{p.moyen}</div>
                                                                        </div>
                                                                        <div className="text-end">
                                                                            <div className="fw-bold">{p.montant?.toLocaleString()} F</div>
                                                                            <div className="text-muted">{p.reference}</div>
                                                                        </div>
                                                                    </div>
                                                                    {p.id && (
                                                                        <div className="mt-2 text-end">
                                                                            <button
                                                                                type="button"
                                                                                className="btn btn-sm btn-outline-primary"
                                                                                disabled={loadingReceiptId === p.id}
                                                                                onClick={() => handleOpenReceipt(p.id, isClient ? 'client' : 'tailleur')}
                                                                            >
                                                                                {loadingReceiptId === p.id ? (
                                                                                    <>
                                                                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                                                        Chargement...
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <i className="bx bx-receipt me-1"></i>Générer le reçu
                                                                                    </>
                                                                                )}
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </>
                            ) : (
                                <div className="text-center py-4 text-muted">
                                    <i className="bx bx-mouse fs-1 mb-2"></i>
                                    <p>Sélectionnez un élément dans la liste pour voir les détails.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payment Form */}
                    {((activeTab === 'clients' && selectedClient) || (activeTab === 'tailleurs' && selectedTailleur)) && (
                        <div className="card">
                            <div className={`card-header text-white ${activeTab === 'clients' ? 'bg-primary' : 'bg-warning text-dark'}`}>
                                <h6 className="mb-0">Nouveau Paiement</h6>
                            </div>
                            <div className="card-body">
                                <form onSubmit={handlePaymentSubmit}>
                                    <div className="mb-3">
                                        <label className="form-label">Montant (FCFA)</label>
                                        <input 
                                            type="number" 
                                            className="form-control" 
                                            required
                                            disabled={savingPayment}
                                            value={paymentForm.montant}
                                            onChange={(e) => setPaymentForm(prev => ({ ...prev, montant: e.target.value }))}
                                            max={activeTab === 'clients' ? selectedClient.resteAPayer : selectedTailleur.resteAPayer}
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Mode de paiement</label>
                                        <select 
                                            className="form-select"
                                            disabled={savingPayment}
                                            value={paymentForm.moyen}
                                            onChange={(e) => setPaymentForm(prev => ({ ...prev, moyen: e.target.value }))}
                                        >
                                            <option value="ESPECES">Espèces</option>
                                            <option value="MOBILE_MONEY">Mobile Money</option>
                                            <option value="VIREMENT">Virement</option>
                                            <option value="CARTE">Carte Bancaire</option>
                                        </select>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Référence</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            required
                                            disabled={savingPayment}
                                            value={paymentForm.reference}
                                            onChange={(e) => setPaymentForm(prev => ({ ...prev, reference: e.target.value }))}
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Date</label>
                                        <input 
                                            type="date" 
                                            className="form-control" 
                                            required
                                            disabled={savingPayment}
                                            value={paymentForm.datePaiement}
                                            onChange={(e) => setPaymentForm(prev => ({ ...prev, datePaiement: e.target.value }))}
                                        />
                                    </div>
                                    <button type="submit" disabled={savingPayment} className={`btn w-100 ${activeTab === 'clients' ? 'btn-primary' : 'btn-warning'}`}>
                                        {savingPayment ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                Enregistrement...
                                            </>
                                        ) : (
                                            'Enregistrer le paiement'
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Receipt Modal */}
            {recuData && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title">Reçu de Paiement</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setRecuData(null)}></button>
                            </div>
                            <div className="modal-body" id="printable-receipt">
                                <div className="header">
                                    <h2>{recuData.atelierNom}</h2>
                                    <p>{recuData.atelierAdresse}</p>
                                    <p>{recuData.atelierTelephone}</p>
                                </div>
                                
                                <div className="info-row">
                                    <span className="info-label">Référence</span>
                                    <span className="info-value">{recuData.reference}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Date</span>
                                    <span className="info-value">{new Date(recuData.datePaiement).toLocaleDateString()}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Client / Tailleur</span>
                                    <span className="info-value">{recuData.clientNom ? `${recuData.clientPrenom} ${recuData.clientNom}` : `${recuData.tailleurPrenom} ${recuData.tailleurNom}`}</span>
                                </div>

                                <div className="amount-box">
                                    <p className="amount-value">{recuData.montant?.toLocaleString()} FCFA</p>
                                    <p className="amount-label">{recuData.moyenPaiement}</p>
                                </div>

                                {recuData.qrCodeData && (
                                    <div className="text-center mt-4">
                                        <div className="p-2 border d-inline-block bg-white">
                                            <small>{recuData.qrCodeData}</small>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setRecuData(null)}>Fermer</button>
                                {recuData.clientContact && (
                                    <button type="button" className="btn btn-success" disabled={sharingReceipt} onClick={handleSendReceiptWhatsApp}>
                                        {sharingReceipt ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                Préparation du PDF...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bx bxl-whatsapp me-1"></i>Envoyer le PDF sur WhatsApp
                                            </>
                                        )}
                                    </button>
                                )}
                                <button type="button" className="btn btn-primary" onClick={handlePrint}>
                                    <i className="bx bx-printer me-1"></i>Imprimer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Paiements;
