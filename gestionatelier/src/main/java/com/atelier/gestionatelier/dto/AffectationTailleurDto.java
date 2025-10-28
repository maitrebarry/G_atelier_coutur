package com.atelier.gestionatelier.dto;

import lombok.Data;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class AffectationTailleurDto {
    private UUID affectationId;
    private String clientNom;
    private String clientPrenom;
    private String modeleNom;
    private Double prixTailleur;
    private String statutAffectation;
    private LocalDate dateEcheance;
}