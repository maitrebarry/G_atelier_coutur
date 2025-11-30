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
        Notification notification = new Notification();
        notification.setMessage(message);
        notification.setRecipient(recipient);
        notification.setType(type);
        notification.setRelatedEntityId(relatedEntityId);
        return notificationRepository.save(notification);
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
        LocalDateTime startWindow = now.plusHours(47);
        LocalDateTime endWindow = now.plusHours(49); // Fenêtre de 2h pour attraper les RDV proches de 48h

        // On cherche les RDV confirmés qui sont dans environ 48h
        List<RendezVous> upcomingRendezVous = rendezVousRepository.findRendezVousConfirmesDans24h(startWindow, endWindow);

        for (RendezVous rdv : upcomingRendezVous) {
            // 1. Identifier le client
            Client client = rdv.getClient();
            Atelier atelier = rdv.getAtelier();

            // 2. Trouver les affectations actives pour ce client
            List<Affectation> activeAffectations = affectationRepository.findByClientIdAndStatutIn(
                    client.getId(),
                    Arrays.asList(Affectation.StatutAffectation.EN_ATTENTE, Affectation.StatutAffectation.EN_COURS)
            );

            String message = "Rappel : Rendez-vous avec " + client.getNom() + " " + client.getPrenom() + 
                             " prévu le " + rdv.getDateRDV().toLocalDate() + " à " + rdv.getDateRDV().toLocalTime();

            // 3. Notifier les tailleurs concernés
            for (Affectation affectation : activeAffectations) {
                Utilisateur tailleur = affectation.getTailleur();
                if (tailleur != null) {
                    createNotification(message, tailleur, "RENDEZ_VOUS", rdv.getId());
                }
            }

            // 4. Notifier le propriétaire de l'atelier
            List<Utilisateur> proprietaires = utilisateurRepository.findByAtelierIdAndRole(atelier.getId(), Role.PROPRIETAIRE);
            for (Utilisateur proprietaire : proprietaires) {
                createNotification(message, proprietaire, "RENDEZ_VOUS", rdv.getId());
            }
            
            // 5. Envoyer aussi un email au propriétaire (fonctionnalité existante)
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