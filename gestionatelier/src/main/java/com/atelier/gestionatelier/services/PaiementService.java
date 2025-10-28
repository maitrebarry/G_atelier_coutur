package com.atelier.gestionatelier.services;
import com.atelier.gestionatelier.dto.*;
import com.atelier.gestionatelier.entities.*;
import com.atelier.gestionatelier.repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PaiementService {
    private static final Logger log = LoggerFactory.getLogger(PaiementService.class);
    private final PaiementRepository paiementRepository;
    private final ClientRepository clientRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final AffectationRepository affectationRepository;
    private final MesureRepository mesureRepository;
    private final AtelierRepository atelierRepository;

    // ==================== MÉTHODES POUR LES PAIEMENTS CLIENTS ====================

//    @Transactional
//    public Paiement creerPaiementClient(CreatePaiementClientDto dto) {
//        // Vérifier que la référence est unique
//        if (paiementRepository.existsByReference(dto.getReference())) {
//            throw new RuntimeException("La référence de paiement existe déjà");
//        }
//
//        // Vérifier et récupérer le client
//        Client client = clientRepository.findByIdAndAtelier(dto.getClientId(), dto.getAtelierId())
//                .orElseThrow(() -> new RuntimeException("Client non trouvé dans cet atelier"));
//
//        // Vérifier et récupérer l'atelier
//        Atelier atelier = atelierRepository.findById(dto.getAtelierId())
//                .orElseThrow(() -> new RuntimeException("Atelier non trouvé"));
//
//        // Créer le paiement
//        Paiement paiement = new Paiement();
//        paiement.setMontant(dto.getMontant());
//        paiement.setMoyen(dto.getMoyen());
//        paiement.setReference(dto.getReference());
//        paiement.setDatePaiement(LocalDateTime.now());
//        paiement.setTypePaiement(Paiement.TypePaiement.CLIENT);
//        paiement.setClient(client);
//        paiement.setAtelier(atelier);
//
//        return paiementRepository.save(paiement);
//    }

    @Transactional
    public Paiement creerPaiementClient(CreatePaiementClientDto dto) {
        log.info("💰 Création paiement CLIENT - Référence: {}, Client: {}, Atelier: {}",
                dto.getReference(), dto.getClientId(), dto.getAtelierId());

        // Vérifier que la référence est unique
        if (paiementRepository.existsByReference(dto.getReference())) {
            log.warn("❌ Référence de paiement CLIENT déjà existante: {}", dto.getReference());
            throw new RuntimeException("La référence de paiement existe déjà");
        }

        // Récupérer le client avec vérification d'atelier
        Client client = clientRepository.findByIdAndAtelierId(dto.getClientId(), dto.getAtelierId())
                .orElseThrow(() -> {
                    log.warn("❌ Client non trouvé pour paiement - Client: {}, Atelier: {}", dto.getClientId(), dto.getAtelierId());
                    return new RuntimeException("Client non trouvé dans cet atelier");
                });
        log.info("✅ Client trouvé: {} {}", client.getPrenom(), client.getNom());

        // Vérifier et récupérer l'atelier
        Atelier atelier = atelierRepository.findById(dto.getAtelierId())
                .orElseThrow(() -> {
                    log.warn("❌ Atelier non trouvé: {}", dto.getAtelierId());
                    return new RuntimeException("Atelier non trouvé");
                });

        // Créer le paiement
        Paiement paiement = new Paiement();
        paiement.setMontant(dto.getMontant());
        paiement.setMoyen(dto.getMoyen());
        paiement.setReference(dto.getReference());
        paiement.setDatePaiement(LocalDateTime.now());
        paiement.setTypePaiement(Paiement.TypePaiement.CLIENT);
        paiement.setClient(client);
        paiement.setAtelier(atelier);

        Paiement savedPaiement = paiementRepository.save(paiement);
        log.info("✅ Paiement CLIENT créé avec succès - ID: {}, Montant: {} FCFA, Référence: {}",
                savedPaiement.getId(), savedPaiement.getMontant(), savedPaiement.getReference());

        return savedPaiement;
    }

//    public PaiementClientResponseDto getPaiementsClient(UUID clientId, UUID atelierId) {
//        // Récupérer le client avec vérification d'atelier
//        Client client = clientRepository.findByIdAndAtelier(clientId, atelierId)
//                .orElseThrow(() -> new RuntimeException("Client non trouvé dans cet atelier"));
//
//        // Récupérer les paiements du client
//        List<Paiement> paiements = paiementRepository.findPaiementsByClientAndAtelier(clientId, atelierId);
//
//        // Récupérer les affectations du client
//        List<Affectation> affectations = affectationRepository.findByAtelierIdWithRelations(atelierId)
//                .stream()
//                .filter(a -> a.getClient().getId().equals(clientId))
//                .collect(Collectors.toList());
//
//        // Calculer les totaux
//        Double totalPaiements = paiements.stream()
//                .mapToDouble(Paiement::getMontant)
//                .sum();
//
//        Double prixTotalAffectations = affectations.stream()
//                .mapToDouble(Affectation::getPrixTailleur)
//                .sum();
//
//        Double resteAPayer = prixTotalAffectations - totalPaiements;
//
//        // Déterminer le statut
//        String statutPaiement = determinerStatutPaiement(totalPaiements, prixTotalAffectations);
//
//        // Construire la réponse
//        PaiementClientResponseDto response = new PaiementClientResponseDto();
//        response.setClientId(client.getId());
//        response.setClientNom(client.getNom());
//        response.setClientPrenom(client.getPrenom());
//        response.setClientTelephone(client.getContact());
//        response.setPrixTotal(prixTotalAffectations);
//        response.setMontantPaye(totalPaiements);
//        response.setResteAPayer(resteAPayer);
//        response.setStatutPaiement(statutPaiement);
//
//        // Historique des paiements
//        List<HistoriquePaiementDto> historique = paiements.stream()
//                .map(this::convertToHistoriqueDto)
//                .collect(Collectors.toList());
//        response.setHistoriquePaiements(historique);
//
//        // Affectations
//        List<AffectationInfoDto> affectationDtos = affectations.stream()
//                .map(this::convertToAffectationInfoDto)
//                .collect(Collectors.toList());
//        response.setAffectations(affectationDtos);
//
//        return response;
//    }

    public PaiementClientResponseDto getPaiementsClient(UUID clientId, UUID atelierId) {
        log.info("👤 Récupération historique paiements CLIENT - Client: {}, Atelier: {}", clientId, atelierId);

        // Récupérer le client avec vérification d'atelier
        Client client = clientRepository.findByIdAndAtelierId(clientId, atelierId)
                .orElseThrow(() -> {
                    log.warn("❌ Client non trouvé dans cet atelier - Client: {}, Atelier: {}", clientId, atelierId);
                    return new RuntimeException("Client non trouvé dans cet atelier");
                });
        log.info("✅ Client récupéré: {} {}", client.getPrenom(), client.getNom());

        // Récupérer les paiements du client
        List<Paiement> paiements = paiementRepository.findPaiementsByClientAndAtelier(clientId, atelierId);
        log.info("💰 {} paiements trouvés pour le client {}", paiements.size(), clientId);

        // Récupérer toutes les affectations de l'atelier et filtrer par client
        List<Affectation> affectations = affectationRepository.findByAtelierIdWithRelations(atelierId)
                .stream()
                .filter(affectation -> affectation.getClient().getId().equals(clientId))
                .collect(Collectors.toList());
        log.info("👕 {} affectations trouvées pour le client {}", affectations.size(), clientId);

        // Calculer les totaux - utiliser le prix de la mesure (prix du modèle)
        Double totalPaiements = paiements.stream()
                .mapToDouble(Paiement::getMontant)
                .sum();

        // Utiliser le prix du modèle depuis l'entité Mesure
        Double prixTotalModeles = affectations.stream()
                .mapToDouble(affectation -> {
                    Mesure mesure = affectation.getMesure();
                    return mesure.getPrix() != null ? mesure.getPrix() : 0.0;
                })
                .sum();

        Double resteAPayer = prixTotalModeles - totalPaiements;

        // Déterminer le statut
        String statutPaiement = determinerStatutPaiement(totalPaiements, prixTotalModeles);
        log.info("📊 Statut paiement client {}: {} (Total modèles: {} FCFA, Payé: {} FCFA, Reste: {} FCFA)",
                clientId, statutPaiement, prixTotalModeles, totalPaiements, resteAPayer);

        // CORRECTION: Déterminer le nom du modèle principal
        String modeleNomPrincipal = "Aucun modèle";
        if (!affectations.isEmpty()) {
            // Prendre le nom du modèle de la première affectation
            Mesure premiereMesure = affectations.get(0).getMesure();
            modeleNomPrincipal = premiereMesure.getModeleNom() != null ?
                    premiereMesure.getModeleNom() :
                    premiereMesure.getTypeVetement() + " personnalisé";
        }

        // Construire la réponse
        PaiementClientResponseDto response = new PaiementClientResponseDto();
        response.setClientId(client.getId());
        response.setClientNom(client.getNom());
        response.setClientPrenom(client.getPrenom());
        response.setClientTelephone(client.getContact());
        response.setModeleNom(modeleNomPrincipal); // CORRECTION: Ajouter le nom du modèle
        response.setPrixTotal(prixTotalModeles);
        response.setMontantPaye(totalPaiements);
        response.setResteAPayer(resteAPayer);
        response.setStatutPaiement(statutPaiement);

        // Historique des paiements
        List<HistoriquePaiementDto> historique = paiements.stream()
                .map(this::convertToHistoriqueDto)
                .collect(Collectors.toList());
        response.setHistoriquePaiements(historique);

        // Affectations avec informations détaillées des modèles
        List<AffectationInfoDto> affectationDtos = affectations.stream()
                .map(this::convertToAffectationInfoDto)
                .collect(Collectors.toList());
        response.setAffectations(affectationDtos);

        log.info("✅ Récupération paiements CLIENT terminée avec succès pour {} - Modèle: {}",
                client.getNom(), modeleNomPrincipal);
        return response;
    }
    // ==================== MÉTHODES POUR LES PAIEMENTS TAILLEURS ====================

    @Transactional
    public Paiement creerPaiementTailleur(CreatePaiementTailleurDto dto) {
        // Vérifier que la référence est unique
        if (paiementRepository.existsByReference(dto.getReference())) {
            throw new RuntimeException("La référence de paiement existe déjà");
        }

        // Vérifier et récupérer le tailleur (Utilisateur avec rôle TAILLEUR)
        Utilisateur tailleur = utilisateurRepository.findTailleurByIdAndAtelier(dto.getTailleurId(), dto.getAtelierId())
                .orElseThrow(() -> new RuntimeException("Tailleur non trouvé ou inactif dans cet atelier"));

        // Vérifier et récupérer l'atelier
        Atelier atelier = atelierRepository.findById(dto.getAtelierId())
                .orElseThrow(() -> new RuntimeException("Atelier non trouvé"));

        // Créer le paiement
        Paiement paiement = new Paiement();
        paiement.setMontant(dto.getMontant());
        paiement.setMoyen(dto.getMoyen());
        paiement.setReference(dto.getReference());
        paiement.setDatePaiement(LocalDateTime.now());
        paiement.setTypePaiement(Paiement.TypePaiement.TAILLEUR);
        paiement.setTailleur(tailleur);
        paiement.setAtelier(atelier);

        return paiementRepository.save(paiement);
    }

    public PaiementTailleurResponseDto getPaiementsTailleur(UUID tailleurId, UUID atelierId) {
        // Récupérer le tailleur avec vérification d'atelier
        Utilisateur tailleur = utilisateurRepository.findTailleurByIdAndAtelier(tailleurId, atelierId)
                .orElseThrow(() -> new RuntimeException("Tailleur non trouvé dans cet atelier"));

        // Récupérer les paiements du tailleur
        List<Paiement> paiements = paiementRepository.findPaiementsByTailleurAndAtelier(tailleurId, atelierId);

        // Récupérer les affectations du tailleur
        List<Affectation> affectations = affectationRepository.findByTailleurIdAndAtelierIdWithRelations(tailleurId, atelierId);

        // Calculer les totaux
        Double totalPaiements = paiements.stream()
                .mapToDouble(Paiement::getMontant)
                .sum();

        Double totalDuAffectations = affectations.stream()
                .mapToDouble(Affectation::getPrixTailleur)
                .sum();

        Double resteAPayer = totalDuAffectations - totalPaiements;
        Integer modelesCousus = (int) affectations.stream()
                .filter(a -> a.getStatut() == Affectation.StatutAffectation.TERMINE ||
                        a.getStatut() == Affectation.StatutAffectation.VALIDE)
                .count();

        // Déterminer le statut
        String statutPaiement = determinerStatutPaiement(totalPaiements, totalDuAffectations);

        // Construire la réponse
        PaiementTailleurResponseDto response = new PaiementTailleurResponseDto();
        response.setTailleurId(tailleur.getId());
        response.setTailleurNom(tailleur.getNom());
        response.setTailleurPrenom(tailleur.getPrenom());
        response.setTailleurTelephone(""); // À adapter si vous avez le téléphone dans Utilisateur
        response.setTailleurEmail(tailleur.getEmail());
        response.setModelesCousus(modelesCousus);
        response.setTotalDu(totalDuAffectations);
        response.setMontantPaye(totalPaiements);
        response.setResteAPayer(resteAPayer);
        response.setStatutPaiement(statutPaiement);

        // Historique des paiements
        List<HistoriquePaiementDto> historique = paiements.stream()
                .map(this::convertToHistoriqueDto)
                .collect(Collectors.toList());
        response.setHistoriquePaiements(historique);

        // Affectations en cours
        List<AffectationTailleurDto> affectationDtos = affectations.stream()
                .map(this::convertToAffectationTailleurDto)
                .collect(Collectors.toList());
        response.setAffectationsEnCours(affectationDtos);

        return response;
    }

    // ==================== MÉTHODES UTILITAIRES ====================

    private String determinerStatutPaiement(Double montantPaye, Double totalDu) {
        if (montantPaye == 0) {
            return "EN_ATTENTE";
        } else if (montantPaye < totalDu) {
            return "PARTIEL";
        } else {
            return "PAYE";
        }
    }

//    private HistoriquePaiementDto convertToHistoriqueDto(Paiement paiement) {
//        HistoriquePaiementDto dto = new HistoriquePaiementDto();
//        dto.setMontant(paiement.getMontant());
//        dto.setMoyen(paiement.getMoyen());
//        dto.setReference(paiement.getReference());
//        dto.setDatePaiement(paiement.getDatePaiement());
//        return dto;
//    }
private HistoriquePaiementDto convertToHistoriqueDto(Paiement paiement) {
    HistoriquePaiementDto dto = new HistoriquePaiementDto();
    dto.setMontant(paiement.getMontant());
    dto.setMoyen(paiement.getMoyen());
    dto.setReference(paiement.getReference());
    dto.setDatePaiement(paiement.getDatePaiement());
    return dto;
}
//    private AffectationInfoDto convertToAffectationInfoDto(Affectation affectation) {
//        AffectationInfoDto dto = new AffectationInfoDto();
//        dto.setAffectationId(affectation.getId());
//        dto.setModeleNom(affectation.getMesure().getModeleNom() != null ?
//                affectation.getMesure().getModeleNom() : "Modèle personnalisé");
//        dto.setPrixTailleur(affectation.getPrixTailleur());
//        dto.setStatutAffectation(affectation.getStatut().name());
//        dto.setDateEcheance(affectation.getDateEcheance());
//        dto.setTailleurNom(affectation.getTailleur().getNom());
//        dto.setTailleurPrenom(affectation.getTailleur().getPrenom());
//        return dto;
//    }
// CORRECTION de la méthode de conversion pour mieux gérer le nom du modèle
private AffectationInfoDto convertToAffectationInfoDto(Affectation affectation) {
    AffectationInfoDto dto = new AffectationInfoDto();
    dto.setAffectationId(affectation.getId());

    // Informations du modèle depuis Mesure
    Mesure mesure = affectation.getMesure();

    // CORRECTION: Meilleure gestion du nom du modèle
    String modeleNom = mesure.getModeleNom();
    if (modeleNom == null || modeleNom.trim().isEmpty()) {
        // Si pas de nom de modèle, utiliser le type de vêtement
        modeleNom = mesure.getTypeVetement() != null ?
                mesure.getTypeVetement() + " personnalisé" :
                "Modèle personnalisé";
    }
    dto.setModeleNom(modeleNom);

    // CORRECTION: Utiliser le prix du modèle (prix de vente au client)
    dto.setPrixTailleur(mesure.getPrix());

    dto.setStatutAffectation(affectation.getStatut().name());
    dto.setDateEcheance(affectation.getDateEcheance().atStartOfDay());

    // Informations du tailleur
    dto.setTailleurNom(affectation.getTailleur().getNom());
    dto.setTailleurPrenom(affectation.getTailleur().getPrenom());

    return dto;
}
    private AffectationTailleurDto convertToAffectationTailleurDto(Affectation affectation) {
        AffectationTailleurDto dto = new AffectationTailleurDto();
        dto.setAffectationId(affectation.getId());
        dto.setClientNom(affectation.getClient().getNom());
        dto.setClientPrenom(affectation.getClient().getPrenom());
        dto.setModeleNom(affectation.getMesure().getModeleNom() != null ?
                affectation.getMesure().getModeleNom() : "Modèle personnalisé");
        dto.setPrixTailleur(affectation.getPrixTailleur());
        dto.setStatutAffectation(affectation.getStatut().name());
        dto.setDateEcheance(affectation.getDateEcheance());
        return dto;
    }

    // ==================== MÉTHODES DE STATISTIQUES ====================

    public StatistiquesPaiementDto getStatistiquesPaiement(UUID atelierId) {
        Double totalPaiementsClients = paiementRepository.getTotalPaiementsClientsByAtelier(atelierId);
        Double totalPaiementsTailleurs = paiementRepository.getTotalPaiementsTailleursByAtelier(atelierId);
        Double beneficeNet = totalPaiementsClients - totalPaiementsTailleurs;

        // Compter les clients par statut (simplifié)
        List<Client> clients = clientRepository.findByAtelierId(atelierId);
        long clientsEnAttente = clients.stream()
                .filter(c -> getStatutPaiementClient(c.getId(), atelierId).equals("EN_ATTENTE"))
                .count();
        long clientsPartiellementPayes = clients.stream()
                .filter(c -> getStatutPaiementClient(c.getId(), atelierId).equals("PARTIEL"))
                .count();
        long clientsTotalementPayes = clients.stream()
                .filter(c -> getStatutPaiementClient(c.getId(), atelierId).equals("PAYE"))
                .count();

        // Compter les tailleurs par statut (simplifié)
        List<Utilisateur> tailleurs = utilisateurRepository.findTailleursActifsByAtelier(atelierId);
        long tailleursEnAttente = tailleurs.stream()
                .filter(t -> getStatutPaiementTailleur(t.getId(), atelierId).equals("EN_ATTENTE"))
                .count();
        long tailleursPartiellementPayes = tailleurs.stream()
                .filter(t -> getStatutPaiementTailleur(t.getId(), atelierId).equals("PARTIEL"))
                .count();
        long tailleursTotalementPayes = tailleurs.stream()
                .filter(t -> getStatutPaiementTailleur(t.getId(), atelierId).equals("PAYE"))
                .count();

        StatistiquesPaiementDto statistiques = new StatistiquesPaiementDto();
        statistiques.setTotalPaiementsClients(totalPaiementsClients);
        statistiques.setTotalPaiementsTailleurs(totalPaiementsTailleurs);
        statistiques.setBeneficeNet(beneficeNet);
        statistiques.setClientsEnAttente((int) clientsEnAttente);
        statistiques.setClientsPartiellementPayes((int) clientsPartiellementPayes);
        statistiques.setClientsTotalementPayes((int) clientsTotalementPayes);
        statistiques.setTailleursEnAttente((int) tailleursEnAttente);
        statistiques.setTailleursPartiellementPayes((int) tailleursPartiellementPayes);
        statistiques.setTailleursTotalementPayes((int) tailleursTotalementPayes);

        return statistiques;
    }

    private String getStatutPaiementClient(UUID clientId, UUID atelierId) {
        try {
            PaiementClientResponseDto dto = getPaiementsClient(clientId, atelierId);
            return dto.getStatutPaiement();
        } catch (Exception e) {
            return "EN_ATTENTE";
        }
    }

    private String getStatutPaiementTailleur(UUID tailleurId, UUID atelierId) {
        try {
            PaiementTailleurResponseDto dto = getPaiementsTailleur(tailleurId, atelierId);
            return dto.getStatutPaiement();
        } catch (Exception e) {
            return "EN_ATTENTE";
        }
    }

    // ==================== MÉTHODES DE RECHERCHE ====================

    public List<PaiementClientResponseDto> rechercherPaiementsClients(RecherchePaiementDto criteres) {
        // Implémentation de la recherche des clients avec filtres
        // Cette méthode peut être enrichie selon les besoins
        List<Client> clients = clientRepository.findByAtelierId(criteres.getAtelierId());

        return clients.stream()
                .map(client -> getPaiementsClient(client.getId(), criteres.getAtelierId()))
                .filter(dto -> filtreParStatut(dto, criteres.getStatutPaiement()))
                .filter(dto -> filtreParRecherche(dto, criteres.getSearchTerm()))
                .collect(Collectors.toList());
    }

    public List<PaiementTailleurResponseDto> rechercherPaiementsTailleurs(RecherchePaiementDto criteres) {
        // Implémentation de la recherche des tailleurs avec filtres
        List<Utilisateur> tailleurs = utilisateurRepository.findTailleursActifsByAtelier(criteres.getAtelierId());

        return tailleurs.stream()
                .map(tailleur -> getPaiementsTailleur(tailleur.getId(), criteres.getAtelierId()))
                .filter(dto -> filtreParStatut(dto, criteres.getStatutPaiement()))
                .filter(dto -> filtreParRechercheTailleur(dto, criteres.getSearchTerm()))
                .collect(Collectors.toList());
    }

    private boolean filtreParStatut(PaiementClientResponseDto dto, String statut) {
        if (statut == null || statut.isEmpty()) return true;
        return dto.getStatutPaiement().equals(statut);
    }

    private boolean filtreParStatut(PaiementTailleurResponseDto dto, String statut) {
        if (statut == null || statut.isEmpty()) return true;
        return dto.getStatutPaiement().equals(statut);
    }

    private boolean filtreParRecherche(PaiementClientResponseDto dto, String searchTerm) {
        if (searchTerm == null || searchTerm.isEmpty()) return true;
        String searchLower = searchTerm.toLowerCase();
        return dto.getClientNom().toLowerCase().contains(searchLower) ||
                dto.getClientPrenom().toLowerCase().contains(searchLower) ||
                dto.getClientTelephone().contains(searchTerm);
    }

    private boolean filtreParRechercheTailleur(PaiementTailleurResponseDto dto, String searchTerm) {
        if (searchTerm == null || searchTerm.isEmpty()) return true;
        String searchLower = searchTerm.toLowerCase();
        return dto.getTailleurNom().toLowerCase().contains(searchLower) ||
                dto.getTailleurPrenom().toLowerCase().contains(searchLower) ||
                dto.getTailleurEmail().toLowerCase().contains(searchLower);
    }

    // ==================== MÉTHODES POUR LES REÇUS ====================

    public RecuPaiementDto genererRecuPaiementClient(UUID paiementId, UUID atelierId) {
        Paiement paiement = paiementRepository.findById(paiementId)
                .orElseThrow(() -> new RuntimeException("Paiement non trouvé"));

        // Vérifier que le paiement appartient à l'atelier
        if (!paiement.getAtelier().getId().equals(atelierId)) {
            throw new RuntimeException("Paiement non trouvé dans cet atelier");
        }

        return buildRecuFromPaiement(paiement);
    }

    public RecuPaiementDto genererRecuPaiementTailleur(UUID paiementId, UUID atelierId) {
        Paiement paiement = paiementRepository.findById(paiementId)
                .orElseThrow(() -> new RuntimeException("Paiement non trouvé"));

        // Vérifier que le paiement appartient à l'atelier
        if (!paiement.getAtelier().getId().equals(atelierId)) {
            throw new RuntimeException("Paiement non trouvé dans cet atelier");
        }

        return buildRecuFromPaiement(paiement);
    }

    private RecuPaiementDto buildRecuFromPaiement(Paiement paiement) {
        RecuPaiementDto recu = new RecuPaiementDto();
        recu.setId(paiement.getId());
        recu.setTypePaiement(paiement.getTypePaiement().name());
        recu.setReference(paiement.getReference());
        recu.setDatePaiement(paiement.getDatePaiement());
        recu.setMontant(paiement.getMontant());
        recu.setMoyenPaiement(paiement.getMoyen());

        // Informations atelier
        Atelier atelier = paiement.getAtelier();
        recu.setAtelierNom(atelier.getNom());
        recu.setAtelierAdresse(atelier.getAdresse());
        recu.setAtelierTelephone(atelier.getTelephone());

        // Informations selon le type de paiement
        if (paiement.getTypePaiement() == Paiement.TypePaiement.CLIENT && paiement.getClient() != null) {
            Client client = paiement.getClient();
            recu.setClientNom(client.getNom());
            recu.setClientPrenom(client.getPrenom());
            recu.setClientContact(client.getContact());
            recu.setStatut("Reçu client");
        } else if (paiement.getTypePaiement() == Paiement.TypePaiement.TAILLEUR && paiement.getTailleur() != null) {
            Utilisateur tailleur = paiement.getTailleur();
            recu.setTailleurNom(tailleur.getNom());
            recu.setTailleurPrenom(tailleur.getPrenom());
            recu.setTailleurContact(tailleur.getEmail()); // ou téléphone si disponible
            recu.setStatut("Reçu tailleur");
        }

        // Générer un QR code simple avec les informations principales
        recu.setQrCodeData(genererQRCodeData(recu));

        return recu;
    }

    private String genererQRCodeData(RecuPaiementDto recu) {
        // Générer une string simple pour le QR code
        return String.format(
                "RECU:%s|REF:%s|MONTANT:%.0fF|DATE:%s",
                recu.getTypePaiement(),
                recu.getReference(),
                recu.getMontant(),
                recu.getDatePaiement().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))
        );
    }
}