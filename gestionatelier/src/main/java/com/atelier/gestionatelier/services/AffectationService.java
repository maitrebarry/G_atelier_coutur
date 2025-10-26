package com.atelier.gestionatelier.services;

import com.atelier.gestionatelier.dto.*;
import com.atelier.gestionatelier.entities.*;
import com.atelier.gestionatelier.repositories.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AffectationService {

    private final AffectationRepository affectationRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final ClientRepository clientRepository;
    private final MesureRepository mesureRepository;
    private final AtelierRepository atelierRepository;
    private final EmailService emailService;
    // === CRÉATION D'AFFECTATION ===
    @Transactional
    public List<AffectationDTO> creerAffectation(AffectationRequestDTO requestDTO, UUID atelierId, UUID createurId) {
        log.info("📝 Création d'affectation pour l'atelier: {} par l'utilisateur: {}", atelierId, createurId);

        // Vérifier les permissions du créateur
        Utilisateur createur = utilisateurRepository.findById(createurId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        if (!createur.getRole().equals(com.atelier.gestionatelier.security.Role.PROPRIETAIRE) &&
                !createur.getRole().equals(com.atelier.gestionatelier.security.Role.SECRETAIRE)) {
            throw new RuntimeException("❌ Seuls le propriétaire et le secrétaire peuvent créer des affectations");
        }

        // Vérifier le tailleur
        Utilisateur tailleur = utilisateurRepository
                .findTailleurByIdAndAtelier(requestDTO.getTailleurId(), atelierId)
                .orElseThrow(() -> new RuntimeException("❌ Tailleur non trouvé ou inactif dans cet atelier"));

        Atelier atelier = atelierRepository.findById(atelierId)
                .orElseThrow(() -> new RuntimeException("❌ Atelier non trouvé"));

        List<Affectation> nouvellesAffectations = new ArrayList<>();

        for (AffectationRequestDTO.AffectationItemDTO item : requestDTO.getAffectations()) {
            // Vérifier le client
            Client client = clientRepository.findByIdAndAtelierId(item.getClientId(), atelierId)
                    .orElseThrow(() -> new RuntimeException("❌ Client non trouvé dans cet atelier: " + item.getClientId()));

            // Vérifier la mesure
            Mesure mesure = mesureRepository.findById(item.getMesureId())
                    .orElseThrow(() -> new RuntimeException("❌ Mesure non trouvée: " + item.getMesureId()));

            if (mesure.getAffecte()) {
                throw new RuntimeException("❌ La mesure est déjà affectée: " + item.getMesureId());
            }

            if (!mesure.getClient().getId().equals(client.getId())) {
                throw new RuntimeException("❌ La mesure n'appartient pas au client spécifié");
            }

            // Créer l'affectation
            Affectation affectation = new Affectation();
            affectation.setTailleur(tailleur);
            affectation.setClient(client);
            affectation.setMesure(mesure);
            affectation.setAtelier(atelier);
            affectation.setPrixTailleur(item.getPrixTailleur());
            affectation.setDateEcheance(requestDTO.getDateEcheance());
            affectation.setStatut(Affectation.StatutAffectation.EN_ATTENTE);
            affectation.setCreateur(createur);

            // Marquer la mesure comme affectée
            mesure.setAffecte(true);
            mesureRepository.save(mesure);

            nouvellesAffectations.add(affectation);
        }

        List<Affectation> savedAffectations = affectationRepository.saveAll(nouvellesAffectations);
        log.info("✅ {} affectations créées avec succès pour le tailleur {}",
                savedAffectations.size(), tailleur.getPrenom() + " " + tailleur.getNom());

        return savedAffectations.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    // === RÉCUPÉRATION DES AFFECTATIONS AVEC PERMISSIONS ===
    public List<AffectationDTO> getAffectationsWithPermissions(UUID atelierId, UUID utilisateurId, String role) {
        log.info("📋 Récupération des affectations - Atelier: {}, Utilisateur: {}, Rôle: {}",
                atelierId, utilisateurId, role);

        List<Affectation> affectations;

        switch (role) {
            case "TAILLEUR":
                affectations = affectationRepository.findByTailleurIdAndAtelierIdWithRelations(utilisateurId, atelierId);
                log.info("👕 Tailleur voit {} affectations", affectations.size());
                break;

            case "PROPRIETAIRE":
            case "SECRETAIRE":
                affectations = affectationRepository.findByAtelierIdWithRelations(atelierId);
                log.info("👔 {} voit {} affectations", role, affectations.size());
                break;

            case "SUPERADMIN":
                affectations = affectationRepository.findAllWithRelations();
                log.info("👑 SuperAdmin voit {} affectations", affectations.size());
                break;

            default:
                throw new RuntimeException("❌ Rôle non autorisé à voir les affectations: " + role);
        }

        return affectations.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    // === MISE À JOUR DU STATUT ===
//    @Transactional
//    public AffectationDTO updateStatutAffectation(UUID affectationId, String nouveauStatut,
//                                                  UUID utilisateurId, String role) {
//        log.info("🔄 Mise à jour statut affectation: {} -> {} par {} ({})",
//                affectationId, nouveauStatut, utilisateurId, role);
//
//        Affectation affectation = affectationRepository.findByIdWithRelations(affectationId)
//                .orElseThrow(() -> new RuntimeException("❌ Affectation non trouvée"));
//
//        Affectation.StatutAffectation ancienStatut = affectation.getStatut();
//        Affectation.StatutAffectation newStatut = Affectation.StatutAffectation.valueOf(nouveauStatut);
//
//        // Vérifier les permissions
//        if (!peutChangerStatut(role, ancienStatut, newStatut, affectation.getTailleur().getId().equals(utilisateurId))) {
//            throw new RuntimeException("❌ Permission refusée: " + role + " ne peut pas changer " + ancienStatut + " à " + newStatut);
//        }
//
//        affectation.setStatut(newStatut);
//
//        // Mettre à jour les dates
//        LocalDateTime maintenant = LocalDateTime.now();
//        switch (newStatut) {
//            case EN_COURS:
//                affectation.setDateDebutReelle(maintenant);
//                break;
//            case TERMINE:
//                affectation.setDateFinReelle(maintenant);
//                break;
//            case VALIDE:
//                affectation.setDateValidation(maintenant);
//                break;
//
//        }
//
//        Affectation savedAffectation = affectationRepository.save(affectation);
//        log.info("✅ Statut mis à jour: {} -> {}", ancienStatut, newStatut);
//
//        return convertToDTO(savedAffectation);
//    }


    // === MISE À JOUR DU STATUT AVEC ENVOI D'EMAIL ===
    @Transactional
    public AffectationDTO updateStatutAffectation(UUID affectationId, String nouveauStatut,
                                                  UUID utilisateurId, String role) {
        log.info("🔄 Mise à jour statut affectation: {} -> {} par {} ({})",
                affectationId, nouveauStatut, utilisateurId, role);

        Affectation affectation = affectationRepository.findByIdWithRelations(affectationId)
                .orElseThrow(() -> new RuntimeException("❌ Affectation non trouvée"));

        Affectation.StatutAffectation ancienStatut = affectation.getStatut();
        Affectation.StatutAffectation newStatut = Affectation.StatutAffectation.valueOf(nouveauStatut);

        // Vérifier les permissions
        if (!peutChangerStatut(role, ancienStatut, newStatut, affectation.getTailleur().getId().equals(utilisateurId))) {
            throw new RuntimeException("❌ Permission refusée: " + role + " ne peut pas changer " + ancienStatut + " à " + newStatut);
        }

        affectation.setStatut(newStatut);

        // Mettre à jour les dates
        LocalDateTime maintenant = LocalDateTime.now();
        switch (newStatut) {
            case EN_COURS:
                affectation.setDateDebutReelle(maintenant);
                break;
            case TERMINE:
                affectation.setDateFinReelle(maintenant);
                break;
            case VALIDE:
                affectation.setDateValidation(maintenant);
                break;
        }

        Affectation savedAffectation = affectationRepository.save(affectation);
        log.info("✅ Statut mis à jour: {} -> {}", ancienStatut, newStatut);

        // ✅ ENVOYER L'EMAIL APRÈS LA SAUVEGARDE (pas dans le switch)
        if (newStatut == Affectation.StatutAffectation.VALIDE) {
            envoyerEmailValidationClient(affectation);
        }

        return convertToDTO(savedAffectation);
    }

    // ✅ MÉTHODE POUR ENVOYER L'EMAIL DE VALIDATION
    private void envoyerEmailValidationClient(Affectation affectation) {
        try {
            Client client = affectation.getClient();
            Mesure mesure = affectation.getMesure();

            // Vérifier que le client a un email
            if (client.getEmail() == null || client.getEmail().trim().isEmpty()) {
                log.warn("⚠️ Client {} n'a pas d'email, envoi impossible", client.getPrenom() + " " + client.getNom());
                return; // ⚠️ CORRECTION : return ici pour sortir de la méthode
            }

            String sujet = "🎉 Votre vêtement est prêt !";
            String message = String.format(
                    "Bonjour %s,\n\nVotre %s est prêt et vous attend à l'atelier.\n\nVous pouvez venir le récupérer aux heures d'ouverture.\n\nCordialement,\nVotre atelier de couture",
                    client.getPrenom(),
                    mesure.getTypeVetement().toLowerCase()
            );

            // Envoyer l'email
            emailService.envoyerEmail(client.getEmail(), sujet, message);

            log.info("✅ Email de validation envoyé à: {}", client.getEmail());

        } catch (Exception e) {
            log.error("❌ Erreur lors de l'envoi de l'email de validation: {}", e.getMessage());
            // Ne pas propager l'exception pour ne pas bloquer la validation
        }
    }
    // ✅ GÉNÉRER LE MESSAGE EMAIL COURT ET SIMPLE
    private String genererMessageEmail(Client client, Utilisateur tailleur, Mesure mesure) {
        return String.format(
                "Bonjour %s,\n\n" +
                        "Votre %s est prêt et vous attend à l'atelier.\n\n" +
                        "Vous pouvez venir le récupérer aux heures d'ouverture.\n\n" +
                        "Cordialement,\n" +
                        "Votre atelier de couture",
                client.getPrenom(),
                mesure.getTypeVetement().toLowerCase()
        );
    }
    // === VÉRIFICATION DES PERMISSIONS ===
    private boolean peutChangerStatut(String role, Affectation.StatutAffectation ancienStatut,
                                      Affectation.StatutAffectation nouveauStatut, boolean estSonTravail) {

        // TAILLEUR peut seulement démarrer et terminer son propre travail
        if (role.equals("TAILLEUR") && estSonTravail) {
            return (ancienStatut == Affectation.StatutAffectation.EN_ATTENTE && nouveauStatut == Affectation.StatutAffectation.EN_COURS) ||
                    (ancienStatut == Affectation.StatutAffectation.EN_COURS && nouveauStatut == Affectation.StatutAffectation.TERMINE);
        }

        // PROPRIETAIRE/SECRETAIRE peut valider ou annuler
        if (role.equals("PROPRIETAIRE") || role.equals("SECRETAIRE")) {
            return (ancienStatut == Affectation.StatutAffectation.TERMINE && nouveauStatut == Affectation.StatutAffectation.VALIDE) ||
                    (nouveauStatut == Affectation.StatutAffectation.ANNULE);
        }

        // SUPERADMIN peut tout faire
        return role.equals("SUPERADMIN");
    }

    // === ANNULATION D'AFFECTATION ===
    @Transactional
    public void annulerAffectation(UUID affectationId, UUID utilisateurId, String role) {
        log.info("🗑️ Annulation affectation: {} par {} ({})", affectationId, utilisateurId, role);

        // Vérifier les permissions
        if (!role.equals("PROPRIETAIRE") && !role.equals("SECRETAIRE") && !role.equals("SUPERADMIN")) {
            throw new RuntimeException("❌ Seuls le propriétaire, le secrétaire et le superadmin peuvent annuler des affectations");
        }

        Affectation affectation = affectationRepository.findByIdWithRelations(affectationId)
                .orElseThrow(() -> new RuntimeException("❌ Affectation non trouvée"));

        // Libérer la mesure
        Mesure mesure = affectation.getMesure();
        mesure.setAffecte(false);
        mesureRepository.save(mesure);

        affectationRepository.delete(affectation);
        log.info("✅ Affectation {} annulée", affectationId);
    }

    // === DONNÉES POUR FORMULAIRE ===
    public List<TailleurDTO> getTailleursActifs(UUID atelierId) {
        log.info("👕 Récupération des tailleurs actifs pour atelier: {}", atelierId);

        List<Utilisateur> tailleurs = utilisateurRepository.findTailleursActifsByAtelier(atelierId);
        log.info("✅ {} tailleurs trouvés", tailleurs.size());

        return tailleurs.stream()
                .map(this::convertToTailleurDTO)
                .collect(Collectors.toList());
    }

    public List<ClientAvecMesuresValideesDTO> getClientsAvecMesuresNonAffectees(UUID atelierId) {
        log.info("👥 Récupération clients avec mesures non affectées pour atelier: {}", atelierId);

        List<Client> clients = clientRepository.findByAtelierIdWithMesuresNonAffectees(atelierId);
        log.info("✅ {} clients avec mesures non affectées trouvés", clients.size());

        return clients.stream()
                .map(this::convertToClientAvecMesuresDTO)
                .collect(Collectors.toList());
    }

    // === MÉTHODES DE CONVERSION ===
    private AffectationDTO convertToDTO(Affectation affectation) {
        AffectationDTO dto = new AffectationDTO();
        dto.setId(affectation.getId());
        dto.setDateCreation(affectation.getDateCreation());
        dto.setDateEcheance(affectation.getDateEcheance());
        dto.setDateDebutReelle(affectation.getDateDebutReelle());
        dto.setDateFinReelle(affectation.getDateFinReelle());
        dto.setDateValidation(affectation.getDateValidation());
        dto.setPrixTailleur(affectation.getPrixTailleur());
        dto.setStatut(affectation.getStatut().name());

        // Client
        AffectationDTO.ClientInfoDTO clientInfo = new AffectationDTO.ClientInfoDTO();
        clientInfo.setId(affectation.getClient().getId());
        clientInfo.setNom(affectation.getClient().getNom());
        clientInfo.setPrenom(affectation.getClient().getPrenom());
        clientInfo.setContact(affectation.getClient().getContact());
        clientInfo.setPhoto(affectation.getClient().getPhoto());
        dto.setClient(clientInfo);

        // Tailleur
        AffectationDTO.TailleurInfoDTO tailleurInfo = new AffectationDTO.TailleurInfoDTO();
        tailleurInfo.setId(affectation.getTailleur().getId());
        tailleurInfo.setNom(affectation.getTailleur().getNom());
        tailleurInfo.setPrenom(affectation.getTailleur().getPrenom());
        tailleurInfo.setEmail(affectation.getTailleur().getEmail());
        dto.setTailleur(tailleurInfo);

        // Mesure
        AffectationDTO.MesureInfoDTO mesureInfo = new AffectationDTO.MesureInfoDTO();
        mesureInfo.setId(affectation.getMesure().getId());
        mesureInfo.setTypeVetement(affectation.getMesure().getTypeVetement());
        mesureInfo.setPrix(affectation.getMesure().getPrix());
        mesureInfo.setPhotoPath(affectation.getMesure().getPhotoPath());
        dto.setMesure(mesureInfo);

        return dto;
    }

    private TailleurDTO convertToTailleurDTO(Utilisateur utilisateur) {
        TailleurDTO dto = new TailleurDTO();
        dto.setId(utilisateur.getId());
        dto.setNom(utilisateur.getNom());
        dto.setPrenom(utilisateur.getPrenom());
        dto.setEmail(utilisateur.getEmail());
        dto.setActif(utilisateur.getActif());
        return dto;
    }

    private ClientAvecMesuresValideesDTO convertToClientAvecMesuresDTO(Client client) {
        ClientAvecMesuresValideesDTO dto = new ClientAvecMesuresValideesDTO();
        dto.setId(client.getId());
        dto.setNom(client.getNom());
        dto.setPrenom(client.getPrenom());
        dto.setContact(client.getContact());
        dto.setPhoto(client.getPhoto());

        // Filtrer SEULEMENT les mesures NON affectées
        List<ClientAvecMesuresValideesDTO.MesureValideeDTO> mesuresDTO = client.getMesures().stream()
                .filter(mesure -> !mesure.getAffecte())
                .map(this::convertToMesureValideeDTO)
                .collect(Collectors.toList());

        dto.setMesures(mesuresDTO);
        return dto;
    }

    private ClientAvecMesuresValideesDTO.MesureValideeDTO convertToMesureValideeDTO(Mesure mesure) {
        ClientAvecMesuresValideesDTO.MesureValideeDTO dto = new ClientAvecMesuresValideesDTO.MesureValideeDTO();
        dto.setId(mesure.getId());
        dto.setTypeVetement(mesure.getTypeVetement());
        dto.setPrix(mesure.getPrix());
        dto.setDateMesure(mesure.getDateMesure());
        dto.setAffecte(mesure.getAffecte());
        dto.setPhotoPath(mesure.getPhotoPath());
        dto.setEpaule(mesure.getEpaule());
        dto.setManche(mesure.getManche());
        dto.setPoitrine(mesure.getPoitrine());
        dto.setTaille(mesure.getTaille());
        dto.setLongueur(mesure.getLongueur());
        return dto;
    }
}