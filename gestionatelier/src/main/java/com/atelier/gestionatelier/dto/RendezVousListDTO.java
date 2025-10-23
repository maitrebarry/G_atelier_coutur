// RendezVousListDTO.java
package com.atelier.gestionatelier.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class RendezVousListDTO {
    private UUID id;
    private LocalDateTime dateRDV;
    private String typeRendezVous;
    private String statut;
    private LocalDateTime createdAt;

    // Informations essentielles du client pour la liste
    private String clientNomComplet;
    private String clientContact;

    // Informations de l'atelier
    private String atelierNom;

    // Méthode utilitaire pour le nom complet
    public String getClientNomComplet() {
        return clientNomComplet;
    }
}