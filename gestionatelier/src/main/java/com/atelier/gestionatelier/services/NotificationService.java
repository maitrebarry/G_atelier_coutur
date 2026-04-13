package com.atelier.gestionatelier.services;

import com.atelier.gestionatelier.entities.*;
import com.atelier.gestionatelier.repositories.*;
import com.atelier.gestionatelier.security.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {
    private final EmailService emailService;
    private final NotificationRepository notificationRepository;
    private final RendezVousRepository rendezVousRepository;
    private final AffectationRepository affectationRepository;
    private final UtilisateurRepository utilisateurRepository;

    /**
     * Créer une notification interne
     */
    public Notification createNotification(String message, Utilisateur recipient, String type, UUID relatedEntityId) {
        return createNotification(message, recipient, type, relatedEntityId, null);
    }

    public Notification createNotification(String message, Utilisateur recipient, String type, UUID relatedEntityId, String relatedEntityType) {
        Notification notification = new Notification();
        notification.setMessage(message);
        notification.setRecipient(recipient);
        notification.setType(type);
        notification.setRelatedEntityId(relatedEntityId);
        notification.setRelatedEntityType(relatedEntityType);
        return notificationRepository.save(notification);
    }

    public void notifyEquipeRendezVousCreated(RendezVous rendezVous) {
        Client client = rendezVous.getClient();
        Atelier atelier = rendezVous.getAtelier();

        String message = "Nouveau rendez-vous automatique pour " + client.getPrenom() + " " + client.getNom() +
                " le " + rendezVous.getDateRDV().toLocalDate() + " à " + rendezVous.getDateRDV().toLocalTime() +
                " (" + rendezVous.getTypeRendezVous() + ")";

        List<Utilisateur> proprietaires = utilisateurRepository.findByAtelierIdAndRole(atelier.getId(), Role.PROPRIETAIRE);
        for (Utilisateur proprietaire : proprietaires) {
            createNotification(message, proprietaire, "RENDEZ_VOUS", rendezVous.getId(), "RENDEZVOUS");
        }

        List<Utilisateur> secretaires = utilisateurRepository.findByAtelierIdAndRole(atelier.getId(), Role.SECRETAIRE);
        for (Utilisateur secretaire : secretaires) {
            createNotification(message, secretaire, "RENDEZ_VOUS", rendezVous.getId(), "RENDEZVOUS");
        }
    }

    /**
     * Récupérer les notifications non lues d'un utilisateur
     */
    public List<Notification> getUnreadNotifications(UUID userId) {
        return notificationRepository.findByRecipientIdAndIsReadFalseOrderByDateCreationDesc(userId);
    }

    /**
     * Marquer une notification comme lue
     */
    public void markAsRead(UUID notificationId) {
        notificationRepository.findById(notificationId).ifPresent(notification -> {
            notification.setIsRead(true);
            notificationRepository.save(notification);
        });
    }

    /**
     * Tâche planifiée : Vérifier les rendez-vous à venir (dans 48h)
     * S'exécute toutes les heures
     */
    @Scheduled(cron = "0 0 * * * *") // Toutes les heures
    @Transactional
    public void checkUpcomingAppointments() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startWindow = now.plusHours(71);
        LocalDateTime endWindow = now.plusHours(73); // Fenêtre de 2h pour attraper les RDV proches de 72h

        // On cherche les RDV confirmés ou planifiés qui sont dans environ 72h
        List<RendezVous> upcomingRendezVous = rendezVousRepository.findRendezVousDansFenetre(startWindow, endWindow);

        for (RendezVous rdv : upcomingRendezVous) {
            Client client = rdv.getClient();
            Atelier atelier = rdv.getAtelier();

            String message = "Rappel : Rendez-vous avec " + client.getPrenom() + " " + client.getNom() +
                    " prévu le " + rdv.getDateRDV().toLocalDate() + " à " + rdv.getDateRDV().toLocalTime();

            // Notifier le propriétaire et la secrétaire via notifications internes
            notifierEquipeRendezVousProcheParNotification(rdv, message);

            // Envoyer aussi un email au propriétaire (fonctionnalité existante)
            notifierProprietaireRendezVousProche(rdv);
        }
    }

    public void envoyerNotificationCreationRendezVous(RendezVous rendezVous) {
        Client client = rendezVous.getClient();
        Atelier atelier = rendezVous.getAtelier();

        // ✅ EMAIL FONCTIONNEL - Utilisation du champ adresse comme email
        if (client.getEmail() != null && client.getEmail().contains("@")) {
            try {
                emailService.envoyerEmailConfirmationRendezVous(
                        client.getEmail(), // ✅ Utilisation du champ adresse comme email
                        client.getNom(),
                        client.getPrenom(),
                        rendezVous.getDateRDV(),
                        rendezVous.getTypeRendezVous(),
                        atelier.getNom(),
                        rendezVous.getNotes()
                );
            } catch (Exception e) {
                System.err.println("❌ Erreur envoi email création RDV: " + e.getMessage());
            }
        } else {
            System.err.println("⚠️ Email client non valide pour l'envoi: " + client.getAdresse());
        }
    }

    public void envoyerNotificationModificationRendezVous(RendezVous rendezVous) {
        Client client = rendezVous.getClient();
        Atelier atelier = rendezVous.getAtelier();

        // ✅ EMAIL FONCTIONNEL - Utilisation du champ adresse comme email
        if (client.getEmail() != null && client.getEmail().contains("@")) {
            try {
                emailService.envoyerEmailModificationRendezVous(
                        client.getEmail(), // ✅ Utilisation du champ adresse comme email
                        client.getNom(),
                        client.getPrenom(),
                        rendezVous.getDateRDV(),
                        rendezVous.getTypeRendezVous(),
                        atelier.getNom(),
                        rendezVous.getNotes()
                );
            } catch (Exception e) {
                System.err.println("❌ Erreur envoi email modification RDV: " + e.getMessage());
            }
        }
    }

    public void envoyerNotificationAnnulationRendezVous(RendezVous rendezVous) {
        Client client = rendezVous.getClient();
        Atelier atelier = rendezVous.getAtelier();

        // ✅ EMAIL FONCTIONNEL - Utilisation du champ adresse comme email
        if (client.getEmail() != null && client.getEmail().contains("@")) {
            try {
                emailService.envoyerEmailAnnulationRendezVous(
                        client.getEmail(), // ✅ Utilisation du champ adresse comme email
                        client.getNom(),
                        client.getPrenom(),
                        rendezVous.getDateRDV(),
                        rendezVous.getTypeRendezVous(),
                        atelier.getNom()
                );
            } catch (Exception e) {
                System.err.println("❌ Erreur envoi email annulation RDV: " + e.getMessage());
            }
        }
    }

    public void notifierEquipeRendezVousProcheParNotification(RendezVous rendezVous, String message) {
        Atelier atelier = rendezVous.getAtelier();

        List<Utilisateur> proprietaires = utilisateurRepository.findByAtelierIdAndRole(atelier.getId(), Role.PROPRIETAIRE);
        for (Utilisateur proprietaire : proprietaires) {
            createNotification(message, proprietaire, "RENDEZ_VOUS", rendezVous.getId(), "RENDEZVOUS");
        }

        List<Utilisateur> secretaires = utilisateurRepository.findByAtelierIdAndRole(atelier.getId(), Role.SECRETAIRE);
        for (Utilisateur secretaire : secretaires) {
            createNotification(message, secretaire, "RENDEZ_VOUS", rendezVous.getId(), "RENDEZVOUS");
        }
    }

    public void notifierProprietaireRendezVousProche(RendezVous rendezVous) {
        Client client = rendezVous.getClient();
        Atelier atelier = rendezVous.getAtelier();

        // ✅ EMAIL FONCTIONNEL pour le propriétaire
        // Vérification que l'atelier a un email
        if (atelier.getEmail() != null && atelier.getEmail().contains("@")) {
            try {
                emailService.envoyerEmailRappelProprietaire(
                        atelier.getEmail(), // ✅ Utilisation du champ email de l'atelier
                        client.getNom(),
                        client.getPrenom(),
                        client.getContact(), // Utilisation du champ contact pour le téléphone
                        rendezVous.getDateRDV(),
                        rendezVous.getTypeRendezVous(),
                        rendezVous.getNotes()
                );
            } catch (Exception e) {
                System.err.println("❌ Erreur notification propriétaire RDV proche: " + e.getMessage());
            }
        } else {
            System.err.println("⚠️ Email atelier non configuré: " + atelier.getEmail());
        }

        System.out.println("🔔 Rappel RDV: " + client.getPrenom() + " " + client.getNom() +
                " - " + rendezVous.getDateRDV());
    }
}