package com.atelier.gestionatelier.services;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import java.time.format.DateTimeFormatter;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.atelier.nom:Mon Atelier}")
    private String nomAtelier;

    public void envoyerEmail(String to, String subject, String text) {
        try {
            if (to == null || !to.contains("@")) {
                System.err.println("❌ Email invalide: " + to);
                return;
            }

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(text);

            mailSender.send(message);
            System.out.println("✅ Email envoyé à: " + to);
        } catch (Exception e) {
            System.err.println("❌ Erreur envoi email à " + to + ": " + e.getMessage());
            // Version de secours - affichage dans les logs
            System.out.println("📧 EMAIL SIMULÉ (erreur SMTP) - Destinataire: " + to);
            System.out.println("📧 Sujet: " + subject);
        }
    }



    public void envoyerEmailConfirmationRendezVous(String emailClient, String nomClient, String prenomClient,
                                                   LocalDateTime dateRendezVous, String typeRendezVous,
                                                   String nomAtelier, String notes) {
        String subject = "Date de récupération - " + nomAtelier;

        String text = "Bonjour " + prenomClient + ",\n" +
                "Vos vêtements seront prêts le :\n" + dateRendezVous.format(DateTimeFormatter.ofPattern("dd/MM/yyyy à HH'h'mm")) + "\n" +
                "Vous pouvez passer les récupérer à l'atelier.\n" +
                "Merci !\n" +
                nomAtelier;

        envoyerEmail(emailClient, subject, text);
    }
    public void envoyerEmailModificationRendezVous(String emailClient, String nomClient, String prenomClient,
                                                   LocalDateTime nouvelleDate, String typeRendezVous,
                                                   String nomAtelier, String notes) {
        String subject = "Modification de votre rendez-vous - " + nomAtelier;

        String text = "Bonjour " + prenomClient + " " + nomClient + ",\n" +
                "Votre rendez-vous a été modifié.\n\n" +
                "📅 Nouvelle date: " + nouvelleDate.format(DateTimeFormatter.ofPattern("dd/MM/yyyy à HH:mm")) + "\n" +
                "🏭 Atelier: " + nomAtelier + "\n" +
                "📋 Type: " + typeRendezVous + "\n" +
                (notes != null && !notes.isEmpty() ? "📝 Notes: " + notes + "\n" : "\n") +
                "Nous restons à votre disposition pour toute information complémentaire.\n\n" +
                "Cordialement,\nL'équipe " + nomAtelier;

        envoyerEmail(emailClient, subject, text);
    }

    public void envoyerEmailRappelProprietaire(String emailProprietaire, String nomClient, String prenomClient,
                                               String contactClient, LocalDateTime dateRendezVous,
                                               String typeRendezVous, String notes) {
        String subject = "🔔 Rappel: Rendez-vous demain - " + nomClient + " " + prenomClient;

        String text = "Bonjour,\n\n" +
                "RAPPEL - Vous avez un rendez-vous prévu demain:\n\n" +
                "👤 Client: " + prenomClient + " " + nomClient + "\n" +
                "📞 Contact: " + contactClient + "\n" +
                "📅 Date: " + dateRendezVous.format(DateTimeFormatter.ofPattern("dd/MM/yyyy à HH:mm")) + "\n" +
                "📋 Type: " + typeRendezVous + "\n" +
                (notes != null && !notes.isEmpty() ? "📝 Notes: " + notes + "\n\n" : "\n") +
                "Pensez à préparer le nécessaire pour ce rendez-vous.\n\n" +
                "Cordialement,\nSystème de gestion d'atelier";

        envoyerEmail(emailProprietaire, subject, text);
    }

    public void envoyerEmailAnnulationRendezVous(String emailClient, String nomClient, String prenomClient,
                                                 LocalDateTime dateRendezVous, String typeRendezVous,
                                                 String nomAtelier) {
        String subject = "Changement de votre rendez-vous - " + nomAtelier;

        String text = "Bonjour " + prenomClient + ",\n\n"
                + "Nous vous informons que votre rendez-vous pour " + typeRendezVous.toLowerCase()
                + " prévu le " + dateRendezVous.format(DateTimeFormatter.ofPattern("dd/MM/yyyy à HH:mm"))
                + " a été annulé.\n\n"
                + "Pas d’inquiétude, un nouveau rendez-vous vous sera proposé très prochainement.\n"
                + "Nous restons disponibles pour toute question ou ajustement.\n\n"
                + "Merci pour votre compréhension et votre confiance.\n\n"
                + "— L’équipe " + nomAtelier;

        envoyerEmail(emailClient, subject, text);
    }

    // Dans votre EmailService existant, ajoutez cette méthode:
    public void envoyerEmailAvecPieceJointe(String to, String subject, String text,
                                            byte[] pieceJointe, String nomFichier) {
        try {
            if (to == null || !to.contains("@")) {
                System.err.println("❌ Email invalide: " + to);
                return;
            }

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(text, false);

            // Ajouter la pièce jointe
            if (pieceJointe != null && nomFichier != null) {
                helper.addAttachment(nomFichier, new ByteArrayResource(pieceJointe));
            }

            mailSender.send(message);
            System.out.println("✅ Email avec pièce jointe envoyé à: " + to);

        } catch (MessagingException e) {
            System.err.println("❌ Erreur envoi email avec PJ à " + to + ": " + e.getMessage());
            // Version de secours
            System.out.println("📧 EMAIL AVEC PJ SIMULÉ (erreur SMTP) - Destinataire: " + to);
            System.out.println("📧 Sujet: " + subject);
            System.out.println("📧 Fichier: " + nomFichier);
        }
    }

}