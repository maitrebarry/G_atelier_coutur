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
public class DashboardSecretaireDTO {
    // Vue d'ensemble
    private Long nouveauxClientsSemaine;
    private Long rendezVousAujourdhui;
    private Long affectationsEnAttente;
    private Long paiementsAttente;

    // Tâches du jour
    private List<TacheDTO> tachesDuJour;

    // Rendez-vous
    private List<RendezVousSecretaireDTO> rendezVousAujourdhuiList;
    private List<RendezVousSecretaireDTO> rendezVousSemaine;

    // Clients récents
    private List<ClientRecentDTO> clientsRecents;

    // Paiements en attente
    private List<PaiementAttenteDTO> paiementsEnAttente;

    @Data
    public static class TacheDTO {
        private String type;
        private String description;
        private Boolean termine;
        private LocalDateTime echeance;
    }

    @Data
    public static class RendezVousSecretaireDTO {
        private LocalDateTime dateHeure;
        private String clientNom;
        private String type;
        private String notes;
        private String statut;
    }

    @Data
    public static class ClientRecentDTO {
        private String nomComplet;
        private String contact;
        private LocalDateTime dateCreation;
        private Long totalCommandes;
    }

    @Data
    public static class PaiementAttenteDTO {
        private String clientNom;
        private Double montant;
        private String typeVetement;
        private LocalDateTime dateEcheance;
    }
}