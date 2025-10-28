package com.atelier.gestionatelier.dto;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Map;
import java.util.List;
import java.time.LocalDateTime;
import java.util.UUID;

// Ajouter ces annotations dans les DTOs
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardClientDTO {
    // Mes commandes
    private Long commandesEnCours;
    private Long commandesTerminees;
    private Long commandesAnnulees;

    // Détails des commandes
    private List<CommandeClientDTO> commandesRecentes;

    // Mes rendez-vous
    private List<RendezVousClientDTO> rendezVousProchains;

    // Mes paiements
    private List<PaiementClientDTO> historiquePaiements;

    // Mes mesures
    private List<MesureClientDTO> dernieresMesures;

    @Data
    public static class CommandeClientDTO {
        private UUID id;
        private String typeVetement;
        private LocalDateTime dateCreation;
        private String statut;
        private Double prix;
        private String tailleurNom;
    }

    @Data
    public static class RendezVousClientDTO {
        private LocalDateTime dateHeure;
        private String type;
        private String statut;
        private String notes;
    }

    @Data
    public static class PaiementClientDTO {
        private LocalDateTime date;
        private Double montant;
        private String moyen;
        private String reference;
        private String statut;
    }

    @Data
    public static class MesureClientDTO {
        private LocalDateTime date;
        private String typeVetement;
        private Double prix;
        private Boolean affecte;
    }
}