package com.atelier.gestionatelier.services;
import com.lowagie.text.Chunk;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Phrase;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Rectangle;
import com.lowagie.text.Image;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import java.awt.Color;
import java.awt.image.BufferedImage;
import com.atelier.gestionatelier.dto.*;
import com.atelier.gestionatelier.entities.*;
import com.atelier.gestionatelier.repositories.*;
import com.atelier.gestionatelier.security.Role;
import lombok.RequiredArgsConstructor;
import javax.imageio.ImageIO;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.Collections;
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
    private final RendezVousRepository rendezVousRepository;

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

    public PaiementClientResponseDto getPaiementsClient(UUID clientId, UUID atelierId, Integer month, Integer year) {
        log.info("👤 Récupération historique paiements CLIENT - Client: {}, Atelier: {}", clientId, atelierId);

        // Récupérer le client avec ses mesures et vérification d'atelier
        Client client = clientRepository.findByIdAndAtelierIdWithMesures(clientId, atelierId)
                .orElseThrow(() -> {
                    log.warn("❌ Client non trouvé dans cet atelier - Client: {}, Atelier: {}", clientId, atelierId);
                    return new RuntimeException("Client non trouvé dans cet atelier");
                });
        log.info("✅ Client récupéré: {} {}", client.getPrenom(), client.getNom());

        List<Mesure> mesures = client.getMesures() == null ? Collections.emptyList() : client.getMesures();
        if (month != null && year != null) {
            mesures = mesures.stream()
                    .filter(mesure -> mesure.getDateMesure() != null && mesure.getDateMesure().getMonthValue() == month && mesure.getDateMesure().getYear() == year)
                    .collect(Collectors.toList());
        }
        log.info("📏 {} mesure(s) trouvée(s) pour le client {} dans la période {}/{}", mesures.size(), clientId, month, year);

        // Récupérer les paiements du client
        List<Paiement> paiements = paiementRepository.findPaiementsByClientAndAtelier(clientId, atelierId);
        if (month != null && year != null) {
            paiements = paiements.stream()
                    .filter(p -> p.getDatePaiement() != null && p.getDatePaiement().getMonthValue() == month && p.getDatePaiement().getYear() == year)
                    .collect(Collectors.toList());
        }
        log.info("💰 {} paiements trouvés pour le client {} dans la période {}/{}", paiements.size(), clientId, month, year);

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

        // Utiliser les modèles sélectionnés par période pour le client.
        Double prixTotalModeles = mesures.stream()
                .mapToDouble(mesure -> mesure.getPrix() != null ? mesure.getPrix() : 0.0)
                .sum();

        Double resteAPayer = prixTotalModeles - totalPaiements;

        // Déterminer le statut
        String statutPaiement = determinerStatutPaiement(totalPaiements, prixTotalModeles);
        log.info("📊 Statut paiement client {}: {} (Total modèles: {} FCFA, Payé: {} FCFA, Reste: {} FCFA)",
                clientId, statutPaiement, prixTotalModeles, totalPaiements, resteAPayer);

        // Déterminer le nom du modèle principal
        String modeleNomPrincipal = "Aucun modèle";
        Mesure mesurePrincipale = mesures.stream()
                .sorted(Comparator.comparing(Mesure::getDateMesure,
                        Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .findFirst()
                .orElse(null);
        if (mesurePrincipale != null) {
            modeleNomPrincipal = mesurePrincipale.getModeleNom() != null && !mesurePrincipale.getModeleNom().trim().isEmpty()
                    ? mesurePrincipale.getModeleNom()
                    : (mesurePrincipale.getTypeVetement() != null ? mesurePrincipale.getTypeVetement() + " personnalisé" : "Modèle personnalisé");
        }

        // Construire la réponse
        PaiementClientResponseDto response = new PaiementClientResponseDto();
        response.setClientId(client.getId());
        response.setClientNom(client.getNom());
        response.setClientPrenom(client.getPrenom());
        response.setClientTelephone(client.getContact());
        response.setModeleNom(modeleNomPrincipal);
        response.setPrixTotal(prixTotalModeles);
        response.setNombreModeles(mesures.size());
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

    public PaiementTailleurResponseDto getPaiementsTailleur(UUID tailleurId, UUID atelierId, Integer month, Integer year) {
        // Récupérer le tailleur avec vérification d'atelier
        Utilisateur tailleur = utilisateurRepository.findTailleurByIdAndAtelier(tailleurId, atelierId)
                .orElseThrow(() -> new RuntimeException("Tailleur non trouvé dans cet atelier"));

        // Récupérer les paiements du tailleur
        List<Paiement> paiements = paiementRepository.findPaiementsByTailleurAndAtelier(tailleurId, atelierId);
        if (month != null && year != null) {
            paiements = paiements.stream()
                    .filter(p -> p.getDatePaiement() != null && p.getDatePaiement().getMonthValue() == month && p.getDatePaiement().getYear() == year)
                    .collect(Collectors.toList());
        }

        // Récupérer les affectations du tailleur
        List<Affectation> affectations = affectationRepository.findByTailleurIdAndAtelierIdWithRelations(tailleurId, atelierId);
        if (month != null && year != null) {
            affectations = affectations.stream()
                    .filter(a -> a.getDateEcheance() != null && a.getDateEcheance().getMonthValue() == month && a.getDateEcheance().getYear() == year)
                    .collect(Collectors.toList());
        }

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
    dto.setId(paiement.getId());
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

    public Double getRecouvrementMensuel(UUID atelierId, int year, int month, String statutPaiement) {
        if (statutPaiement == null || statutPaiement.isBlank()) {
            List<Paiement> paiements = paiementRepository.findByAtelierId(atelierId);
            return paiements.stream()
                    .filter(p -> p.getTypePaiement() == Paiement.TypePaiement.CLIENT)
                    .filter(p -> p.getDatePaiement() != null)
                    .filter(p -> p.getDatePaiement().getYear() == year)
                    .filter(p -> p.getDatePaiement().getMonthValue() == month)
                    .mapToDouble(Paiement::getMontant)
                    .sum();
        }

        List<Client> clients = clientRepository.findByAtelierIdWithMesures(atelierId);
        return clients.stream()
                .map(client -> getPaiementsClient(client.getId(), atelierId, null, null))
                .filter(dto -> statutPaiement.equals(dto.getStatutPaiement()))
                .flatMap(dto -> paiementRepository.findPaiementsByClientAndAtelier(dto.getClientId(), atelierId).stream())
                .filter(p -> p.getTypePaiement() == Paiement.TypePaiement.CLIENT)
                .filter(p -> p.getDatePaiement() != null)
                .filter(p -> p.getDatePaiement().getYear() == year)
                .filter(p -> p.getDatePaiement().getMonthValue() == month)
                .mapToDouble(Paiement::getMontant)
                .sum();
    }

    public Double getTotalModelesMensuel(UUID atelierId, int year, int month, String statutPaiement) {
        List<Client> clients = clientRepository.findByAtelierIdWithMesures(atelierId);
        return clients.stream()
                .filter(client -> statutPaiement == null || statutPaiement.isBlank() || statutPaiement.equals(getStatutPaiementClient(client.getId(), atelierId)))
                .flatMap(client -> client.getMesures() == null ? java.util.stream.Stream.empty() : client.getMesures().stream())
                .filter(mesure -> mesure.getDateMesure() != null)
                .filter(mesure -> mesure.getDateMesure().getYear() == year)
                .filter(mesure -> mesure.getDateMesure().getMonthValue() == month)
                .mapToDouble(mesure -> mesure.getPrix() != null ? mesure.getPrix() : 0.0)
                .sum();
    }

    public Integer getNombreModelesMensuel(UUID atelierId, int year, int month, String statutPaiement) {
        List<Client> clients = clientRepository.findByAtelierIdWithMesures(atelierId);
        return (int) clients.stream()
                .filter(client -> statutPaiement == null || statutPaiement.isBlank() || statutPaiement.equals(getStatutPaiementClient(client.getId(), atelierId)))
                .flatMap(client -> client.getMesures() == null ? java.util.stream.Stream.empty() : client.getMesures().stream())
                .filter(mesure -> mesure.getDateMesure() != null)
                .filter(mesure -> mesure.getDateMesure().getYear() == year)
                .filter(mesure -> mesure.getDateMesure().getMonthValue() == month)
                .count();
    }

            public Integer getNombreSortiesMensuel(UUID atelierId, int year, int month, String statutPaiement) {
            return (int) rendezVousRepository.findByAtelierIdOrderByDateRDVDesc(atelierId).stream()
                .filter(rendezVous -> rendezVous.getDateRDV() != null)
                .filter(rendezVous -> rendezVous.getDateRDV().getYear() == year)
                .filter(rendezVous -> rendezVous.getDateRDV().getMonthValue() == month)
                .filter(rendezVous -> "TERMINE".equalsIgnoreCase(rendezVous.getStatut()))
                .filter(rendezVous -> rendezVous.getTypeRendezVous() != null
                    && rendezVous.getTypeRendezVous().toUpperCase().contains("LIVRAISON"))
                .filter(rendezVous -> statutPaiement == null || statutPaiement.isBlank()
                    || (rendezVous.getClient() != null
                    && statutPaiement.equals(getStatutPaiementClient(rendezVous.getClient().getId(), atelierId))))
                .map(RendezVous::getMesure)
                .filter(java.util.Objects::nonNull)
                .map(Mesure::getId)
                .distinct()
                .count();
            }

    private String getStatutPaiementClient(UUID clientId, UUID atelierId) {
        try {
            PaiementClientResponseDto dto = getPaiementsClient(clientId, atelierId, null, null);
            return dto.getStatutPaiement();
        } catch (Exception e) {
            return "EN_ATTENTE";
        }
    }

    private String getStatutPaiementTailleur(UUID tailleurId, UUID atelierId) {
        try {
            PaiementTailleurResponseDto dto = getPaiementsTailleur(tailleurId, atelierId, null, null);
            return dto.getStatutPaiement();
        } catch (Exception e) {
            return "EN_ATTENTE";
        }
    }

    // ==================== MÉTHODES DE RECHERCHE ====================

    public List<PaiementClientResponseDto> rechercherPaiementsClients(RecherchePaiementDto criteres) {
        // Rechercher les clients ayant au moins une mesure enregistrée,
        // et éventuellement filtrer sur le mois/année sélectionné.
        List<Client> clients = clientRepository.findByAtelierIdWithMesures(criteres.getAtelierId());

        return clients.stream()
                .filter(client -> filtreParMoisAnneeClient(client, criteres.getMonth(), criteres.getYear()))
                .map(client -> getPaiementsClient(client.getId(), criteres.getAtelierId(), criteres.getMonth(), criteres.getYear()))
                .filter(dto -> filtreParStatut(dto, criteres.getStatutPaiement()))
                .filter(dto -> filtreParRecherche(dto, criteres.getSearchTerm()))
                .collect(Collectors.toList());
    }

    public List<PaiementTailleurResponseDto> rechercherPaiementsTailleurs(RecherchePaiementDto criteres) {
        List<Utilisateur> tailleurs = utilisateurRepository.findTailleursActifsByAtelier(criteres.getAtelierId());

        return tailleurs.stream()
                .filter(tailleur -> filtreParMoisAnneeTailleur(tailleur, criteres.getAtelierId(), criteres.getMonth(), criteres.getYear()))
                .map(tailleur -> getPaiementsTailleur(tailleur.getId(), criteres.getAtelierId(), criteres.getMonth(), criteres.getYear()))
                .filter(dto -> filtreParStatut(dto, criteres.getStatutPaiement()))
                .filter(dto -> filtreParRechercheTailleur(dto, criteres.getSearchTerm()))
                .collect(Collectors.toList());
    }

    private boolean filtreParMoisAnneeClient(Client client, Integer month, Integer year) {
        if (month == null || year == null) return true;
        return client.getMesures() != null && client.getMesures().stream()
                .filter(mesure -> mesure.getDateMesure() != null)
                .anyMatch(mesure -> mesure.getDateMesure().getMonthValue() == month && mesure.getDateMesure().getYear() == year);
    }

    private boolean filtreParMoisAnneeTailleur(Utilisateur tailleur, UUID atelierId, Integer month, Integer year) {
        if (month == null || year == null) return true;
        List<Paiement> paiements = paiementRepository.findPaiementsByTailleurAndAtelier(tailleur.getId(), atelierId);
        return paiements.stream()
                .filter(p -> p.getDatePaiement() != null)
                .anyMatch(p -> p.getDatePaiement().getMonthValue() == month && p.getDatePaiement().getYear() == year);
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

    public byte[] genererRecuPaiementClientPdf(UUID paiementId, UUID atelierId) {
        RecuPaiementDto recu = genererRecuPaiementClient(paiementId, atelierId);
        return buildPdfFromRecu(recu);
    }

    public byte[] genererRecuPaiementTailleurPdf(UUID paiementId, UUID atelierId) {
        RecuPaiementDto recu = genererRecuPaiementTailleur(paiementId, atelierId);
        return buildPdfFromRecu(recu);
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

        Utilisateur proprietaire = getProprietaireAtelier(atelier.getId());
        if (proprietaire != null) {
            recu.setProprietaireNom(proprietaire.getNom());
            recu.setProprietairePrenom(proprietaire.getPrenom());
        }
        recu.setMessageMarketing(buildMarketingMessage(atelier.getNom(), proprietaire));

        // Informations selon le type de paiement
        if (paiement.getTypePaiement() == Paiement.TypePaiement.CLIENT && paiement.getClient() != null) {
            Client client = paiement.getClient();
            recu.setClientNom(client.getNom());
            recu.setClientPrenom(client.getPrenom());
            recu.setClientContact(client.getContact());
            recu.setStatut("Reçu client");

            Client clientWithMesures = clientRepository.findByIdAndAtelierIdWithMesures(client.getId(), paiement.getAtelier().getId())
                    .orElse(client);
            double totalDu = clientWithMesures.getMesures() == null ? 0.0 : clientWithMesures.getMesures().stream()
                    .mapToDouble(m -> m.getPrix() != null ? m.getPrix() : 0.0)
                    .sum();
            double totalPaiements = paiementRepository.findPaiementsByClientAndAtelier(client.getId(), paiement.getAtelier().getId())
                    .stream()
                    .mapToDouble(Paiement::getMontant)
                    .sum();
            recu.setTotalDu(totalDu);
            recu.setResteAPayer(totalDu - totalPaiements);
        } else if (paiement.getTypePaiement() == Paiement.TypePaiement.TAILLEUR && paiement.getTailleur() != null) {
            Utilisateur tailleur = paiement.getTailleur();
            recu.setTailleurNom(tailleur.getNom());
            recu.setTailleurPrenom(tailleur.getPrenom());
            recu.setTailleurContact(tailleur.getEmail()); // ou téléphone si disponible
            recu.setStatut("Reçu tailleur");

            List<Affectation> affectations = affectationRepository.findByTailleurIdAndAtelierIdWithRelations(tailleur.getId(), paiement.getAtelier().getId());
            double totalDu = affectations.stream()
                    .mapToDouble(a -> a.getPrixTailleur() != null ? a.getPrixTailleur() : 0.0)
                    .sum();
            double totalPaiements = paiementRepository.findPaiementsByTailleurAndAtelier(tailleur.getId(), paiement.getAtelier().getId())
                    .stream()
                    .mapToDouble(Paiement::getMontant)
                    .sum();
            recu.setTotalDu(totalDu);
            recu.setResteAPayer(totalDu - totalPaiements);
        }

        // Générer un QR code simple avec les informations principales
        recu.setQrCodeData(genererQRCodeData(recu));

        return recu;
    }

    private String genererQRCodeData(RecuPaiementDto recu) {
        String beneficiaire = buildReceiptRecipient(recu);
        String contact = recu.getClientContact() != null ? recu.getClientContact() : recu.getTailleurContact();

        return String.join("\n",
            "TICKET DE PAIEMENT",
            "Atelier: " + safeText(recu.getAtelierNom()),
            "Reference: " + safeText(recu.getReference()),
            "Type: " + safeText(recu.getStatut()),
            "Beneficiaire: " + safeText(beneficiaire),
            "Montant: " + String.format("%.0f FCFA", recu.getMontant() != null ? recu.getMontant() : 0.0),
            "Date: " + formatReceiptDate(recu.getDatePaiement()),
            "Reglement: " + formatPaymentMethod(recu.getMoyenPaiement()),
            "Contact: " + safeText(contact)
        );
    }

    private byte[] buildPdfFromRecu(RecuPaiementDto recu) {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        Rectangle receiptPage = new Rectangle(226, 720);
        Document document = new Document(receiptPage, 14, 14, 16, 18);

        try {
            PdfWriter.getInstance(document, outputStream);
            document.open();

            Font brandFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 15, new Color(20, 20, 20));
            Font subtitleFont = FontFactory.getFont(FontFactory.HELVETICA, 8, new Color(90, 90, 90));
            Font badgeFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, Color.WHITE);
            Font sectionFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, new Color(30, 30, 30));
            Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, new Color(75, 75, 75));
            Font valueFont = FontFactory.getFont(FontFactory.HELVETICA, 8, Color.BLACK);
            Font amountFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 17, Color.BLACK);
            Font amountCaptionFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 7, new Color(95, 95, 95));
            Font footerFont = FontFactory.getFont(FontFactory.HELVETICA, 7, new Color(105, 105, 105));

            addCenteredText(document, safeText(recu.getAtelierNom()).toUpperCase(), brandFont, 0f, 2f);
            addCenteredText(document, safeText(recu.getAtelierAdresse()), subtitleFont, 0f, 1f);
            addCenteredText(document, safeText(recu.getAtelierTelephone()), subtitleFont, 0f, 8f);

            addBadge(document, safeText(recu.getStatut()).toUpperCase(), badgeFont);
            addDivider(document, subtitleFont, 6f, 6f);

            addSectionTitle(document, "DETAILS DU TICKET", sectionFont);
            addKeyValueTable(
                    document,
                    new String[][] {
                            {"Reference", safeText(recu.getReference())},
                            {"Date", formatReceiptDate(recu.getDatePaiement())},
                            {"Beneficiaire", buildReceiptRecipient(recu)},
                            {"Reglement", formatPaymentMethod(recu.getMoyenPaiement())}
                    },
                    labelFont,
                    valueFont
            );

            String contact = recu.getClientContact() != null ? recu.getClientContact() : recu.getTailleurContact();
            if (contact != null && !contact.isBlank()) {
                addKeyValueTable(
                        document,
                        new String[][] {
                                {"Contact", contact}
                        },
                        labelFont,
                        valueFont
                );
            }

            addKeyValueTable(
                    document,
                    new String[][] {
                            {"Total dû", String.format("%.0f FCFA", recu.getTotalDu() != null ? recu.getTotalDu() : 0.0)},
                            {"Reste à payer", String.format("%.0f FCFA", recu.getResteAPayer() != null ? recu.getResteAPayer() : 0.0)}
                    },
                    labelFont,
                    valueFont
            );

            addAmountBox(document, String.format("%.0f FCFA", recu.getMontant()), amountFont, amountCaptionFont);
            addDivider(document, subtitleFont, 8f, 6f);

            addSectionTitle(document, "VERIFICATION", sectionFont);
            addCenteredText(document, "Conservez ce ticket comme preuve de paiement.", subtitleFont, 0f, 3f);

            if (recu.getQrCodeData() != null && !recu.getQrCodeData().isBlank()) {
                addQrCodeBlock(document, recu.getQrCodeData(), footerFont);
            }

            String marketingMessage = buildMarketingMessage(recu);
            addDivider(document, subtitleFont, 2f, 6f);
            addCenteredText(document, "Merci pour votre confiance.", sectionFont, 0f, 2f);
            addCenteredText(document, marketingMessage, footerFont, 0f, 2f);
            addCenteredText(document, buildOwnerSignature(recu), footerFont, 0f, 0f);
        } catch (DocumentException e) {
            throw new RuntimeException("Impossible de generer le PDF du recu", e);
        } finally {
            document.close();
        }

        return outputStream.toByteArray();
    }

    private void addCenteredText(Document document, String text, Font font, float spacingBefore, float spacingAfter) throws DocumentException {
        Paragraph paragraph = new Paragraph(safeText(text), font);
        paragraph.setAlignment(Element.ALIGN_CENTER);
        paragraph.setSpacingBefore(spacingBefore);
        paragraph.setSpacingAfter(spacingAfter);
        document.add(paragraph);
    }

    private void addBadge(Document document, String text, Font badgeFont) throws DocumentException {
        PdfPTable badgeTable = new PdfPTable(1);
        badgeTable.setWidthPercentage(54f);
        badgeTable.setHorizontalAlignment(Element.ALIGN_CENTER);

        PdfPCell badgeCell = new PdfPCell(new Phrase(safeText(text), badgeFont));
        badgeCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        badgeCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        badgeCell.setPaddingTop(5f);
        badgeCell.setPaddingBottom(5f);
        badgeCell.setBackgroundColor(new Color(35, 35, 35));
        badgeCell.setBorder(Rectangle.NO_BORDER);
        badgeTable.addCell(badgeCell);
        badgeTable.setSpacingAfter(4f);
        document.add(badgeTable);
    }

    private void addSectionTitle(Document document, String title, Font font) throws DocumentException {
        Paragraph paragraph = new Paragraph(safeText(title), font);
        paragraph.setAlignment(Element.ALIGN_LEFT);
        paragraph.setSpacingBefore(2f);
        paragraph.setSpacingAfter(4f);
        document.add(paragraph);
    }

    private void addKeyValueTable(Document document, String[][] rows, Font labelFont, Font valueFont) throws DocumentException {
        PdfPTable table = new PdfPTable(new float[] { 1.2f, 1.8f });
        table.setWidthPercentage(100f);
        table.setSpacingAfter(4f);

        for (String[] row : rows) {
            PdfPCell labelCell = new PdfPCell(new Phrase(safeText(row[0]), labelFont));
            labelCell.setBorder(Rectangle.NO_BORDER);
            labelCell.setPaddingTop(2f);
            labelCell.setPaddingBottom(3f);
            labelCell.setPaddingLeft(0f);
            labelCell.setPaddingRight(4f);

            PdfPCell valueCell = new PdfPCell(new Phrase(safeText(row[1]), valueFont));
            valueCell.setBorder(Rectangle.NO_BORDER);
            valueCell.setPaddingTop(2f);
            valueCell.setPaddingBottom(3f);
            valueCell.setPaddingLeft(0f);
            valueCell.setPaddingRight(0f);
            valueCell.setHorizontalAlignment(Element.ALIGN_RIGHT);

            table.addCell(labelCell);
            table.addCell(valueCell);
        }

        document.add(table);
    }

    private void addAmountBox(Document document, String amount, Font amountFont, Font captionFont) throws DocumentException {
        PdfPTable amountTable = new PdfPTable(1);
        amountTable.setWidthPercentage(100f);
        amountTable.setSpacingBefore(8f);
        amountTable.setSpacingAfter(8f);

        PdfPCell amountCell = new PdfPCell();
        amountCell.setPaddingTop(10f);
        amountCell.setPaddingBottom(10f);
        amountCell.setPaddingLeft(6f);
        amountCell.setPaddingRight(6f);
        amountCell.setBorderWidth(1.2f);
        amountCell.setBorderColor(new Color(45, 45, 45));
        amountCell.setBackgroundColor(new Color(245, 245, 245));

        Paragraph caption = new Paragraph("MONTANT ENCAISSE", captionFont);
        caption.setAlignment(Element.ALIGN_CENTER);
        caption.setSpacingAfter(3f);
        amountCell.addElement(caption);

        Paragraph value = new Paragraph(safeText(amount), amountFont);
        value.setAlignment(Element.ALIGN_CENTER);
        amountCell.addElement(value);

        amountTable.addCell(amountCell);
        document.add(amountTable);
    }

    private void addQrCodeBlock(Document document, String qrData, Font footerFont) throws DocumentException {
        PdfPTable qrBox = new PdfPTable(1);
        qrBox.setWidthPercentage(100f);

        PdfPCell qrCell = new PdfPCell();
        qrCell.setHorizontalAlignment(Element.ALIGN_CENTER);
        qrCell.setPaddingTop(8f);
        qrCell.setPaddingBottom(8f);
        qrCell.setPaddingLeft(6f);
        qrCell.setPaddingRight(6f);
        qrCell.setBorderColor(new Color(180, 180, 180));
        qrCell.setBackgroundColor(new Color(250, 250, 250));

        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            BitMatrix bitMatrix = qrCodeWriter.encode(qrData, BarcodeFormat.QR_CODE, 92, 92);
            BufferedImage bufferedQr = MatrixToImageWriter.toBufferedImage(bitMatrix);
            ByteArrayOutputStream qrOutput = new ByteArrayOutputStream();
            ImageIO.write(bufferedQr, "png", qrOutput);

            Image qrImage = Image.getInstance(qrOutput.toByteArray());
            qrImage.setAlignment(Element.ALIGN_CENTER);
            qrImage.scaleToFit(92f, 92f);
            qrCell.addElement(qrImage);
        } catch (WriterException | java.io.IOException e) {
            throw new RuntimeException("Impossible de generer le QR code du recu", e);
        }

        Paragraph qrCaption = new Paragraph("Scannez pour verifier le recu", footerFont);
        qrCaption.setAlignment(Element.ALIGN_CENTER);
        qrCaption.setSpacingBefore(4f);
        qrCell.addElement(qrCaption);

        qrBox.addCell(qrCell);
        qrBox.setSpacingBefore(2f);
        qrBox.setSpacingAfter(8f);
        document.add(qrBox);
    }

    private void addDivider(Document document, Font font, float spacingBefore, float spacingAfter) throws DocumentException {
        Paragraph divider = new Paragraph("--------------------------------", font);
        divider.setAlignment(Element.ALIGN_CENTER);
        divider.setSpacingBefore(spacingBefore);
        divider.setSpacingAfter(spacingAfter);
        document.add(divider);
    }

    private String buildReceiptRecipient(RecuPaiementDto recu) {
        if (recu.getClientNom() != null) {
            return (safeText(recu.getClientPrenom()) + " " + safeText(recu.getClientNom())).trim();
        }
        return (safeText(recu.getTailleurPrenom()) + " " + safeText(recu.getTailleurNom())).trim();
    }

    private String formatReceiptDate(LocalDateTime datePaiement) {
        if (datePaiement == null) {
            return "";
        }
        return datePaiement.format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
    }

    private String formatPaymentMethod(String paymentMethod) {
        if (paymentMethod == null || paymentMethod.isBlank()) {
            return "";
        }
        return paymentMethod.replace('_', ' ');
    }

    private String buildMarketingMessage(RecuPaiementDto recu) {
        if (recu.getMessageMarketing() != null && !recu.getMessageMarketing().isBlank()) {
            return recu.getMessageMarketing();
        }
        return safeText(recu.getAtelierNom()) + " habille votre elegance.";
    }

    private String buildMarketingMessage(String atelierNom, Utilisateur proprietaire) {
        return safeText(atelierNom) + " habille votre elegance.";
    }

    private String buildOwnerSignature(RecuPaiementDto recu) {
        return safeText(recu.getAtelierNom());
    }

    private Utilisateur getProprietaireAtelier(UUID atelierId) {
        if (atelierId == null) {
            return null;
        }
        return utilisateurRepository.findByAtelierIdAndRole(atelierId, Role.PROPRIETAIRE)
                .stream()
                .findFirst()
                .orElse(null);
    }

    private String safeText(String value) {
        return value == null ? "" : value;
    }
}