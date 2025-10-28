package com.atelier.gestionatelier.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class RecuPaiementDto {
    private UUID id;
    private String typePaiement; // CLIENT ou TAILLEUR
    private String reference;
    private LocalDateTime datePaiement;
    private Double montant;
    private String moyenPaiement;

    // Informations client (si paiement client)
    private String clientNom;
    private String clientPrenom;
    private String clientContact;

    // Informations tailleur (si paiement tailleur)
    private String tailleurNom;
    private String tailleurPrenom;
    private String tailleurContact;

    // Informations atelier
    private String atelierNom;
    private String atelierAdresse;
    private String atelierTelephone;

    // Statut
    private String statut;

    // QR Code (optionnel)
    private String qrCodeData;
}