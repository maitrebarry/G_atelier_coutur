package com.atelier.gestionatelier.services;

import com.atelier.gestionatelier.dto.*;
import com.atelier.gestionatelier.entities.RendezVous;
import com.atelier.gestionatelier.entities.Client;
import com.atelier.gestionatelier.entities.Atelier;
import com.atelier.gestionatelier.entities.Affectation;
import com.atelier.gestionatelier.entities.Mesure;
import com.atelier.gestionatelier.repositories.AffectationRepository;
import com.atelier.gestionatelier.repositories.RendezVousRepository;
import com.atelier.gestionatelier.repositories.ClientRepository;
import com.atelier.gestionatelier.repositories.AtelierRepository;
import com.atelier.gestionatelier.repositories.MesureRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RendezVousService {
    private final RendezVousRepository rendezVousRepository;
    private final ClientRepository clientRepository;
    private final AtelierRepository atelierRepository;
    private final MesureRepository mesureRepository;
    private final AffectationRepository affectationRepository;
    private final NotificationService notificationService;

//    @Transactional
//    public RendezVousDTO creerRendezVous(CreateRendezVousDTO dto) {
//        Client client = clientRepository.findById(dto.getClientId())
//                .orElseThrow(() -> new EntityNotFoundException("Client non trouvé avec ID: " + dto.getClientId()));
//
//        Atelier atelier = atelierRepository.findById(dto.getAtelierId())
//                .orElseThrow(() -> new EntityNotFoundException("Atelier non trouvé avec ID: " + dto.getAtelierId()));
//
//        // Validation de la date
//        validerDateRendezVous(dto.getDateRDV(), atelier.getId());
//
//        RendezVous rendezVous = new RendezVous();
//        rendezVous.setDateRDV(dto.getDateRDV());
//        rendezVous.setTypeRendezVous(dto.getTypeRendezVous());
//        rendezVous.setNotes(dto.getNotes());
//        rendezVous.setStatut("PLANIFIE");
//        rendezVous.setClient(client);
//        rendezVous.setAtelier(atelier);
//
//        RendezVous savedRendezVous = rendezVousRepository.save(rendezVous);
//
//        // ✅ NOTIFICATION : Envoyer un email de confirmation au client
//        try {
//            notificationService.envoyerNotificationCreationRendezVous(savedRendezVous);
//        } catch (Exception e) {
//            System.err.println("Erreur lors de l'envoi de la notification: " + e.getMessage());
//            // On ne bloque pas la création du rendez-vous si la notification échoue
//        }
//
//        return toRendezVousDTO(savedRendezVous);
//    }

    @Transactional
    public RendezVousDTO creerRendezVous(CreateRendezVousDTO dto) {
        Client client = clientRepository.findById(dto.getClientId())
                .orElseThrow(() -> new EntityNotFoundException("Client non trouvé avec ID: " + dto.getClientId()));

        Atelier atelier = atelierRepository.findById(dto.getAtelierId())
                .orElseThrow(() -> new EntityNotFoundException("Atelier non trouvé avec ID: " + dto.getAtelierId()));

        // Validation de la date
        validerDateRendezVous(dto.getDateRDV(), atelier.getId());

        RendezVous rendezVous = new RendezVous();
        rendezVous.setDateRDV(dto.getDateRDV());
        rendezVous.setTypeRendezVous(dto.getTypeRendezVous());
        rendezVous.setNotes(dto.getNotes());
        rendezVous.setStatut("PLANIFIE");
        rendezVous.setClient(client);
        rendezVous.setAtelier(atelier);
        rendezVous.setMesure(resolveMesureForRendezVous(client, dto.getMesureId()));

        RendezVous savedRendezVous = rendezVousRepository.save(rendezVous);

        // L'envoi d'email ne doit jamais empêcher la création du rendez-vous.
        try {
            notificationService.envoyerNotificationCreationRendezVous(savedRendezVous);
        } catch (Exception e) {
            System.err.println("Erreur notification email création RDV: " + e.getMessage());
        }

        return toRendezVousDTO(savedRendezVous);
    }

    @Transactional
    public RendezVousDTO creerRendezVousAuto(CreateRendezVousDTO dto) {
        Client client = clientRepository.findById(dto.getClientId())
                .orElseThrow(() -> new EntityNotFoundException("Client non trouvé avec ID: " + dto.getClientId()));

        Atelier atelier = atelierRepository.findById(dto.getAtelierId())
                .orElseThrow(() -> new EntityNotFoundException("Atelier non trouvé avec ID: " + dto.getAtelierId()));

        LocalDateTime dateRendezVous = trouverProchainCreneauDisponible(dto.getDateRDV(), atelier.getId());

        RendezVous rendezVous = new RendezVous();
        rendezVous.setDateRDV(dateRendezVous);
        rendezVous.setTypeRendezVous(dto.getTypeRendezVous());
        rendezVous.setNotes(dto.getNotes());
        rendezVous.setStatut("PLANIFIE");
        rendezVous.setClient(client);
        rendezVous.setAtelier(atelier);
        rendezVous.setMesure(resolveMesureForRendezVous(client, dto.getMesureId()));

        RendezVous savedRendezVous = rendezVousRepository.save(rendezVous);

        try {
            notificationService.envoyerNotificationCreationRendezVous(savedRendezVous);
        } catch (Exception e) {
            System.err.println("Erreur notification email création RDV automatique: " + e.getMessage());
        }

        try {
            notificationService.notifyEquipeRendezVousCreated(savedRendezVous);
        } catch (Exception e) {
            System.err.println("Erreur notification interne création RDV automatique: " + e.getMessage());
        }

        return toRendezVousDTO(savedRendezVous);
    }

    private LocalDateTime trouverProchainCreneauDisponible(LocalDateTime dateSouhaitee, UUID atelierId) {
        LocalDateTime creneau = dateSouhaitee;
        if (creneau == null) {
            throw new IllegalArgumentException("La date du rendez-vous est obligatoire");
        }

        if (creneau.isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("La date du rendez-vous doit être dans le futur");
        }

        for (int tentative = 0; tentative < 24; tentative++) {
            long conflits = rendezVousRepository.countConflitsRendezVous(atelierId, creneau);
            if (conflits == 0) {
                return creneau;
            }
            creneau = creneau.plusMinutes(30);
        }

        throw new IllegalStateException("Aucun créneau disponible n'a été trouvé pour ce jour");
    }

    private void validerDateRendezVous(LocalDateTime dateRDV, UUID atelierId) {
        if (dateRDV.isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("La date du rendez-vous doit être dans le futur");
        }

        // Vérifier les conflits de rendez-vous (optionnel)
        long conflits = rendezVousRepository.countConflitsRendezVous(atelierId, dateRDV);
        if (conflits > 0) {
            throw new IllegalArgumentException("Un rendez-vous existe déjà à cette date et heure");
        }
    }

    @Transactional
    public RendezVousDTO mettreAJourRendezVous(UUID id, UpdateRendezVousDTO dto) {
        RendezVous rendezVous = rendezVousRepository.findByIdWithRelations(id)
                .orElseThrow(() -> new EntityNotFoundException("Rendez-vous non trouvé avec ID: " + id));

        boolean dateModifiee = false;

        if (dto.getDateRDV() != null) {
            validerDateRendezVous(dto.getDateRDV(), rendezVous.getAtelier().getId(), rendezVous.getId());
            rendezVous.setDateRDV(dto.getDateRDV());
            dateModifiee = true;
        }

        if (dto.getTypeRendezVous() != null) {
            rendezVous.setTypeRendezVous(dto.getTypeRendezVous());
        }

        if (dto.getNotes() != null) {
            rendezVous.setNotes(dto.getNotes());
        }

        rendezVous.setMesure(resolveMesureForRendezVous(rendezVous.getClient(), dto.getMesureId()));

        if (dto.getStatut() != null) {
            rendezVous.setStatut(dto.getStatut());
        }

        RendezVous updatedRendezVous = rendezVousRepository.save(rendezVous);

        // ✅ NOTIFICATION : Envoyer un email si la date a été modifiée
        if (dateModifiee) {
            try {
                notificationService.envoyerNotificationModificationRendezVous(updatedRendezVous);
            } catch (Exception e) {
                System.err.println("Erreur notification modification RDV: " + e.getMessage());
            }
        }

        return toRendezVousDTO(updatedRendezVous);
    }

    @Transactional
    public RendezVousDTO confirmerRendezVous(UUID id) {
        RendezVous rendezVous = rendezVousRepository.findByIdWithRelations(id)
                .orElseThrow(() -> new EntityNotFoundException("Rendez-vous non trouvé"));

        rendezVous.setStatut("CONFIRME");
        RendezVous updatedRendezVous = rendezVousRepository.save(rendezVous);

        return toRendezVousDTO(updatedRendezVous);
    }

    @Transactional
    public RendezVousDTO annulerRendezVous(UUID id) {
        RendezVous rendezVous = rendezVousRepository.findByIdWithRelations(id)
                .orElseThrow(() -> new EntityNotFoundException("Rendez-vous non trouvé"));

        rendezVous.setStatut("ANNULE");
        RendezVous updatedRendezVous = rendezVousRepository.save(rendezVous);

        // ✅ NOTIFICATION : Envoyer un email d'annulation
        try {
            notificationService.envoyerNotificationAnnulationRendezVous(updatedRendezVous);
        } catch (Exception e) {
            System.err.println("Erreur notification annulation RDV: " + e.getMessage());
        }

        return toRendezVousDTO(updatedRendezVous);
    }

    @Transactional
    public RendezVousDTO terminerRendezVous(UUID id) {
        RendezVous rendezVous = rendezVousRepository.findByIdWithRelations(id)
                .orElseThrow(() -> new EntityNotFoundException("Rendez-vous non trouvé"));

        rendezVous.setStatut("TERMINE");
        RendezVous updatedRendezVous = rendezVousRepository.save(rendezVous);

        return toRendezVousDTO(updatedRendezVous);
    }

    @Transactional
    public void supprimerRendezVous(UUID id) {
        RendezVous rendezVous = rendezVousRepository.findByIdWithRelations(id)
                .orElseThrow(() -> new EntityNotFoundException("Rendez-vous non trouvé"));

        String statut = rendezVous.getStatut();
        if ("CONFIRME".equalsIgnoreCase(statut) || "TERMINE".equalsIgnoreCase(statut)) {
            throw new IllegalStateException("Impossible de supprimer un rendez-vous déjà confirmé ou terminé");
        }

        rendezVousRepository.delete(rendezVous);
    }

    @Transactional(readOnly = true)
    public RendezVousDTO getRendezVousById(UUID id) {
        RendezVous rendezVous = rendezVousRepository.findByIdWithRelations(id)
                .orElseThrow(() -> new EntityNotFoundException("Rendez-vous non trouvé"));
        return toRendezVousDTO(rendezVous);
    }

    @Transactional(readOnly = true)
    public List<RendezVousListDTO> getRendezVousAVenir(UUID atelierId) {
        LocalDateTime aujourdhui = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0);
        List<RendezVous> rendezVous = rendezVousRepository.findRendezVousAVenir(atelierId, aujourdhui);
        return rendezVous.stream()
                .map(this::toRendezVousListDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RendezVousListDTO> getRendezVousAujourdhui(UUID atelierId) {
        List<RendezVous> rendezVous = rendezVousRepository.findRendezVousAujourdhui(atelierId);
        return rendezVous.stream()
                .map(this::toRendezVousListDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RendezVousListDTO> getRendezVousByStatut(UUID atelierId, String statut) {
        List<RendezVous> rendezVous = rendezVousRepository.findByAtelierIdAndStatutOrderByDateRDVAsc(atelierId, statut);
        return rendezVous.stream()
                .map(this::toRendezVousListDTO)
                .collect(Collectors.toList());
    }

    // 🔔 PLANIFICATION : Vérifier les rendez-vous proches toutes les heures
    @Scheduled(cron = "0 0 * * * *") // Toutes les heures
    public void verifierRendezVousProches() {
        LocalDateTime maintenant = LocalDateTime.now();
        LocalDateTime dans24h = maintenant.plusHours(24);

        // Récupérer les rendez-vous confirmés dans les 24 prochaines heures
        List<RendezVous> rendezVousProches = rendezVousRepository
                .findRendezVousConfirmesDans24h(maintenant.plusHours(23), dans24h);

        for (RendezVous rdv : rendezVousProches) {
            // ✅ NOTIFICATION : Notifier le propriétaire 24h à l'avance
            try {
                notificationService.notifierProprietaireRendezVousProche(rdv);
            } catch (Exception e) {
                System.err.println("Erreur notification propriétaire pour RDV " + rdv.getId() + ": " + e.getMessage());
            }
        }

        System.out.println("🔔 Vérification RDV proches: " + rendezVousProches.size() + " RDV à notifier");
    }

    // Méthodes de conversion DTO
    private RendezVousDTO toRendezVousDTO(RendezVous rendezVous) {
        RendezVousDTO dto = new RendezVousDTO();
        dto.setId(rendezVous.getId());
        dto.setDateRDV(rendezVous.getDateRDV());
        dto.setTypeRendezVous(rendezVous.getTypeRendezVous());
        dto.setNotes(rendezVous.getNotes());
        dto.setStatut(rendezVous.getStatut());
        dto.setCreatedAt(rendezVous.getCreatedAt());
        dto.setUpdatedAt(rendezVous.getUpdatedAt());

        // Client Info
        RendezVousDTO.ClientInfoDTO clientInfo = new RendezVousDTO.ClientInfoDTO();
        clientInfo.setId(rendezVous.getClient().getId());
        clientInfo.setNom(rendezVous.getClient().getNom());
        clientInfo.setPrenom(rendezVous.getClient().getPrenom());
        clientInfo.setContact(rendezVous.getClient().getContact());
        clientInfo.setAdresse(rendezVous.getClient().getAdresse());
        // ✅ Contient l'email
        clientInfo.setEmail(rendezVous.getClient().getEmail());
        clientInfo.setPhoto(rendezVous.getClient().getPhoto());
        dto.setClient(clientInfo);

        // Atelier Info
        RendezVousDTO.AtelierInfoDTO atelierInfo = new RendezVousDTO.AtelierInfoDTO();
        atelierInfo.setId(rendezVous.getAtelier().getId());
        atelierInfo.setNom(rendezVous.getAtelier().getNom());
        atelierInfo.setAdresse(rendezVous.getAtelier().getAdresse());
        dto.setAtelier(atelierInfo);

        dto.setMesure(toMesureInfoDTO(rendezVous.getMesure()));
        dto.setMesuresRestantesALivrer(countMesuresRestantesALivrer(rendezVous.getClient().getId()));

        return dto;
    }

    private RendezVousListDTO toRendezVousListDTO(RendezVous rendezVous) {
        RendezVousListDTO dto = new RendezVousListDTO();
        dto.setId(rendezVous.getId());
        dto.setDateRDV(rendezVous.getDateRDV());
        dto.setTypeRendezVous(rendezVous.getTypeRendezVous());
        dto.setStatut(rendezVous.getStatut());
        dto.setCreatedAt(rendezVous.getCreatedAt());
        dto.setClientNomComplet(rendezVous.getClient().getPrenom() + " " + rendezVous.getClient().getNom());
        dto.setClientContact(rendezVous.getClient().getContact());
        dto.setAtelierNom(rendezVous.getAtelier().getNom());
        dto.setMesuresRestantesALivrer(countMesuresRestantesALivrer(rendezVous.getClient().getId()));
        if (rendezVous.getMesure() != null) {
            dto.setMesureId(rendezVous.getMesure().getId());
            dto.setMesureLibelle(buildMesureLibelle(rendezVous.getMesure()));
            dto.setMesureStatutProduction(getStatutProduction(rendezVous.getClient().getId(), rendezVous.getMesure().getId()));
            dto.setMesurePretPourLivraison(isPretPourLivraison(rendezVous.getClient().getId(), rendezVous.getMesure().getId()));
        }
        return dto;
    }

    private Mesure resolveMesureForRendezVous(Client client, UUID mesureId) {
        if (mesureId == null) {
            return null;
        }

        return client.getMesures().stream()
                .filter(mesure -> mesure.getId().equals(mesureId))
                .findFirst()
                .orElseGet(() -> mesureRepository.findById(mesureId)
                        .filter(mesure -> mesure.getClient() != null && mesure.getClient().getId().equals(client.getId()))
                        .orElseThrow(() -> new IllegalArgumentException("Le vêtement sélectionné n'appartient pas à ce client")));
    }

    private void validerDateRendezVous(LocalDateTime dateRDV, UUID atelierId, UUID rendezVousId) {
        if (dateRDV.isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("La date du rendez-vous doit être dans le futur");
        }

        long conflits = rendezVousId == null
                ? rendezVousRepository.countConflitsRendezVous(atelierId, dateRDV)
                : rendezVousRepository.countConflitsRendezVousExcludingId(atelierId, dateRDV, rendezVousId);
        if (conflits > 0) {
            throw new IllegalArgumentException("Un rendez-vous existe déjà à cette date et heure");
        }
    }

    private RendezVousDTO.MesureInfoDTO toMesureInfoDTO(Mesure mesure) {
        if (mesure == null) {
            return null;
        }

        RendezVousDTO.MesureInfoDTO dto = new RendezVousDTO.MesureInfoDTO();
        dto.setId(mesure.getId());
        dto.setTypeVetement(mesure.getTypeVetement());
        dto.setModeleNom(mesure.getModeleNom());
        dto.setDescription(mesure.getDescription());
        dto.setPrix(mesure.getPrix());
        dto.setLibelle(buildMesureLibelle(mesure));
        if (mesure.getClient() != null) {
            dto.setStatutProduction(getStatutProduction(mesure.getClient().getId(), mesure.getId()));
            dto.setPretPourLivraison(isPretPourLivraison(mesure.getClient().getId(), mesure.getId()));
        }
        return dto;
    }

    private String getStatutProduction(UUID clientId, UUID mesureId) {
        Affectation affectation = findLatestAffectation(clientId, mesureId);
        if (affectation == null || affectation.getStatut() == null) {
            return "NON_AFFECTE";
        }
        return affectation.getStatut().name();
    }

    private boolean isPretPourLivraison(UUID clientId, UUID mesureId) {
        Affectation affectation = findLatestAffectation(clientId, mesureId);
        return affectation != null && affectation.getStatut() != null
                && (affectation.getStatut() == Affectation.StatutAffectation.TERMINE
                || affectation.getStatut() == Affectation.StatutAffectation.VALIDE);
    }

    private Affectation findLatestAffectation(UUID clientId, UUID mesureId) {
        return affectationRepository.findByClientIdOrderByDateCreationDesc(clientId)
                .stream()
                .filter(affectation -> affectation.getMesure() != null && affectation.getMesure().getId().equals(mesureId))
                .findFirst()
                .orElse(null);
    }

    private String buildMesureLibelle(Mesure mesure) {
        String base = mesure.getModeleNom() != null && !mesure.getModeleNom().isBlank()
                ? mesure.getModeleNom()
                : (mesure.getTypeVetement() != null && !mesure.getTypeVetement().isBlank() ? mesure.getTypeVetement() : "Vêtement");

        if (mesure.getDescription() != null && !mesure.getDescription().isBlank()) {
            return base + " - " + mesure.getDescription();
        }

        return base;
    }

    private int countMesuresRestantesALivrer(UUID clientId) {
        java.util.Set<UUID> toutesLesMesures = mesureRepository.findByClientId(clientId)
                .stream()
                .map(Mesure::getId)
                .collect(Collectors.toSet());

        java.util.Set<UUID> mesuresDejaLivrees = rendezVousRepository.findByClientIdOrderByDateRDVDesc(clientId)
                .stream()
                .filter(rendezVous -> "TERMINE".equalsIgnoreCase(rendezVous.getStatut()))
                .filter(rendezVous -> rendezVous.getTypeRendezVous() != null
                        && rendezVous.getTypeRendezVous().toUpperCase().contains("LIVRAISON"))
                .map(RendezVous::getMesure)
                .filter(java.util.Objects::nonNull)
                .map(Mesure::getId)
                .collect(Collectors.toSet());

        toutesLesMesures.removeAll(mesuresDejaLivrees);
        return toutesLesMesures.size();
    }
}