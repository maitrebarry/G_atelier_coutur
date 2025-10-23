package com.atelier.gestionatelier.services;

import com.atelier.gestionatelier.dto.*;
import com.atelier.gestionatelier.entities.RendezVous;
import com.atelier.gestionatelier.entities.Client;
import com.atelier.gestionatelier.entities.Atelier;
import com.atelier.gestionatelier.repositories.RendezVousRepository;
import com.atelier.gestionatelier.repositories.ClientRepository;
import com.atelier.gestionatelier.repositories.AtelierRepository;
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

        // ✅ VÉRIFICATION PRÉALABLE : Le client a-t-il un email valide ?
        if (client.getAdresse() == null || !client.getAdresse().contains("@")) {
            throw new RuntimeException("Impossible de créer le rendez-vous : le client n'a pas d'email valide");
        }

        RendezVous rendezVous = new RendezVous();
        rendezVous.setDateRDV(dto.getDateRDV());
        rendezVous.setTypeRendezVous(dto.getTypeRendezVous());
        rendezVous.setNotes(dto.getNotes());
        rendezVous.setStatut("PLANIFIE");
        rendezVous.setClient(client);
        rendezVous.setAtelier(atelier);

        RendezVous savedRendezVous = rendezVousRepository.save(rendezVous);

        // ✅ NOTIFICATION : Bloquer si l'email échoue
        try {
            notificationService.envoyerNotificationCreationRendezVous(savedRendezVous);
        } catch (Exception e) {
            // ⚠️ SUPPRESSION du rendez-vous si l'email échoue
            rendezVousRepository.delete(savedRendezVous);
            throw new RuntimeException("Échec de l'envoi de la confirmation email. Le rendez-vous n'a pas été créé.", e);
        }

        return toRendezVousDTO(savedRendezVous);
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
        RendezVous rendezVous = rendezVousRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Rendez-vous non trouvé avec ID: " + id));

        boolean dateModifiee = false;

        if (dto.getDateRDV() != null) {
            validerDateRendezVous(dto.getDateRDV(), rendezVous.getAtelier().getId());
            rendezVous.setDateRDV(dto.getDateRDV());
            dateModifiee = true;
        }

        if (dto.getTypeRendezVous() != null) {
            rendezVous.setTypeRendezVous(dto.getTypeRendezVous());
        }

        if (dto.getNotes() != null) {
            rendezVous.setNotes(dto.getNotes());
        }

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
        RendezVous rendezVous = rendezVousRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Rendez-vous non trouvé"));

        rendezVous.setStatut("CONFIRME");
        RendezVous updatedRendezVous = rendezVousRepository.save(rendezVous);

        return toRendezVousDTO(updatedRendezVous);
    }

    @Transactional
    public RendezVousDTO annulerRendezVous(UUID id) {
        RendezVous rendezVous = rendezVousRepository.findById(id)
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
        RendezVous rendezVous = rendezVousRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Rendez-vous non trouvé"));

        rendezVous.setStatut("TERMINE");
        RendezVous updatedRendezVous = rendezVousRepository.save(rendezVous);

        return toRendezVousDTO(updatedRendezVous);
    }

    public RendezVousDTO getRendezVousById(UUID id) {
        RendezVous rendezVous = rendezVousRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Rendez-vous non trouvé"));
        return toRendezVousDTO(rendezVous);
    }

    public List<RendezVousListDTO> getRendezVousAVenir(UUID atelierId) {
        LocalDateTime aujourdhui = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0);
        List<RendezVous> rendezVous = rendezVousRepository.findRendezVousAVenir(atelierId, aujourdhui);
        return rendezVous.stream()
                .map(this::toRendezVousListDTO)
                .collect(Collectors.toList());
    }

    public List<RendezVousListDTO> getRendezVousAujourdhui(UUID atelierId) {
        List<RendezVous> rendezVous = rendezVousRepository.findRendezVousAujourdhui(atelierId);
        return rendezVous.stream()
                .map(this::toRendezVousListDTO)
                .collect(Collectors.toList());
    }

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
        clientInfo.setAdresse(rendezVous.getClient().getAdresse()); // ✅ Contient l'email
        clientInfo.setPhoto(rendezVous.getClient().getPhoto());
        dto.setClient(clientInfo);

        // Atelier Info
        RendezVousDTO.AtelierInfoDTO atelierInfo = new RendezVousDTO.AtelierInfoDTO();
        atelierInfo.setId(rendezVous.getAtelier().getId());
        atelierInfo.setNom(rendezVous.getAtelier().getNom());
        atelierInfo.setAdresse(rendezVous.getAtelier().getAdresse());
        dto.setAtelier(atelierInfo);

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
        return dto;
    }
}