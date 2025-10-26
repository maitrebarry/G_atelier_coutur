//  - Pour les tableaux de bord
package com.atelier.gestionatelier.dto;

import lombok.Data;
import java.util.Map;

@Data
public class StatistiquesAffectationDTO {
    private Long totalAffectations;
    private Long affectationsEnAttente;
    private Long affectationsEnCours;
    private Long affectationsTerminees;
    private Long affectationsValidees;
    private Long affectationsAnnulees;

    private Double chiffreAffairesTotal;
    private Double chiffreAffairesEnCours;
    private Double chiffreAffairesTermine;

    private Map<String, Long> affectationsParTailleur;
    private Map<String, Long> affectationsParTypeVetement;

    // Méthodes utilitaires
    public Double getTauxCompletion() {
        if (totalAffectations == 0) return 0.0;
        return (affectationsValidees.doubleValue() / totalAffectations.doubleValue()) * 100;
    }

    public Double getTauxAvancement() {
        if (totalAffectations == 0) return 0.0;
        long enCoursEtPlus = affectationsEnCours + affectationsTerminees + affectationsValidees;
        return (enCoursEtPlus / totalAffectations.doubleValue()) * 100;
    }
}