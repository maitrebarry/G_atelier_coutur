// ClientRechercheDTO.java
package com.atelier.gestionatelier.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class ClientRechercheDTO {
    private UUID id;
    private String nom;
    private String prenom;
    private String contact;
    private String photo;
    private LocalDateTime dateCreation;

    // Statistiques pour l'affichage dans la liste
    private int nombreMesures;
    private int nombreModeles; // Si vous avez une entité Modele séparée

    // Dernière mesure (pour affichage rapide)
    private MesureResumeDTO derniereMesure;

    @Data
    public static class MesureResumeDTO {
        private LocalDateTime dateMesure;
        private String typeVetement;
        private Double prix;
    }
}