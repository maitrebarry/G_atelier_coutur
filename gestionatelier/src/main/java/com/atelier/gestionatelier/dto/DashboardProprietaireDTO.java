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
public class DashboardProprietaireDTO {
    // Statistiques générales
    private Long totalClients;
    private Long totalTailleurs;
    private Long totalSecretaires;
    private Long affectationsEnCours;
    private Long affectationsTerminees;

    // Statistiques financières
    private Double chiffreAffairesMensuel;
    private Double chiffreAffairesAnnuel;
    private Double paiementsTailleursMensuel;
    private Double beneficeMensuel;

    // Répartition des affectations par statut
    private Map<String, Long> affectationsParStatut;

    // Performance des tailleurs
    private List<TailleurPerformanceDTO> performanceTailleurs;

    // Rendez-vous à venir
    private List<RendezVousDTO> rendezVousProchains;

    // Alertes et tâches urgentes
    private List<TacheUrgenteDTO> tachesUrgentes;

    @Data
    public static class TailleurPerformanceDTO {
        private String nomTailleur;
        private Long affectationsTerminees;
        private Long affectationsEnRetard;
        private Double satisfactionMoyenne;
    }

    @Data
    public static class RendezVousDTO {
        private LocalDateTime date;
        private String clientNom;
        private String type;
        private String statut;
    }

    @Data
    public static class TacheUrgenteDTO {
        private String type;
        private String description;
        private String priorite;
    }
}