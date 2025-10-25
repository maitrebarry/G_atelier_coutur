// ClientRechercheRendezVousDTO.java
package com.atelier.gestionatelier.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class ClientRechercheRendezVousDTO {
    private UUID id;
    private String nom;
    private String prenom;
    private String contact;
    private String adresse;
    private String email; // ✅ Contient l'email pour les notifications
    private String photo;
    private LocalDateTime dateCreation;

    // Dernière mesure pour affichage rapide dans la grille
    private MesureResumeDTO derniereMesure;
    private int nombreModelesEnCours;

    @Data
    public static class MesureResumeDTO {
        private UUID id;
        private LocalDateTime dateMesure;
        private String typeVetement;
        private Double prix;
        private String sexe;
    }
}