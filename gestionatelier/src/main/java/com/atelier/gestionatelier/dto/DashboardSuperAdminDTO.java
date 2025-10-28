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
public class DashboardSuperAdminDTO {
    private Long totalAteliers;
    private Long totalUtilisateurs;
    private Long totalClients;
    private Long totalAffectations;

    // Statistiques financières
    private Double chiffreAffairesTotal;
    private Double paiementsTailleursTotal;
    private Double beneficeNet;

    // Évolution mensuelle
    private Map<String, Double> chiffreAffairesMensuel;
    private Map<String, Long> nouveauxAteliersMensuel;

    // Ateliers les plus performants
    private List<AtelierPerformanceDTO> ateliersPerformants;

    // Alertes et notifications
    private List<AlerteDTO> alertes;

    @Data
    public static class AtelierPerformanceDTO {
        private String nomAtelier;
        private Long totalAffectations;
        private Double chiffreAffaires;
        private Double tauxCompletion;
    }

    @Data
    public static class AlerteDTO {
        private String type;
        private String message;
        private String severite;
        private LocalDateTime date;
    }
}