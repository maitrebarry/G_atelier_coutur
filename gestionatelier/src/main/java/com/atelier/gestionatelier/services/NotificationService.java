package com.atelier.gestionatelier.services;

import com.atelier.gestionatelier.entities.RendezVous;
import com.atelier.gestionatelier.entities.Atelier;
import com.atelier.gestionatelier.entities.Client;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class NotificationService {
    private final EmailService emailService;

    public void envoyerNotificationCreationRendezVous(RendezVous rendezVous) {
        Client client = rendezVous.getClient();
        Atelier atelier = rendezVous.getAtelier();

        // ✅ EMAIL FONCTIONNEL - Utilisation du champ adresse comme email
        if (client.getAdresse() != null && client.getAdresse().contains("@")) {
            try {
                emailService.envoyerEmailConfirmationRendezVous(
                        client.getAdresse(), // ✅ Utilisation du champ adresse comme email
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
        if (client.getAdresse() != null && client.getAdresse().contains("@")) {
            try {
                emailService.envoyerEmailModificationRendezVous(
                        client.getAdresse(), // ✅ Utilisation du champ adresse comme email
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
        if (client.getAdresse() != null && client.getAdresse().contains("@")) {
            try {
                emailService.envoyerEmailAnnulationRendezVous(
                        client.getAdresse(), // ✅ Utilisation du champ adresse comme email
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