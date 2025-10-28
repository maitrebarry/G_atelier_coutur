package com.atelier.gestionatelier.dto;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.Map;
import java.util.List;
import java.time.LocalDateTime;
import java.util.UUID;

// Ajouter ces annotations dans les DTOs
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardTailleurDTO {
    // Mes tâches
    private Long affectationsEnAttente;
    private Long affectationsEnCours;
    private Long affectationsTermineesSemaine;

    // Détails des affectations
    private List<AffectationTailleurDTO> affectationsEnCoursList;
    private List<AffectationTailleurDTO> affectationsEnAttenteList;

    // Mes performances
    private Double tauxCompletion;
    private Double moyenneTempsRealisation;
    private Integer retardCount;

    // Prochaines échéances
    private List<EcheanceDTO> prochainesEcheances;

    // Mes revenus
    private Double revenusMensuels;
    private Double revenusEnAttente;

    @Data
    public static class AffectationTailleurDTO {
        private UUID id;
        private String clientNom;
        private String typeVetement;
        private LocalDate dateEcheance;
        private String statut;
        private Double prixTailleur;
    }

    @Data
    public static class EcheanceDTO {
        private String clientNom;
        private String typeVetement;
        private LocalDate dateEcheance;
        private Integer joursRestants;
    }
}