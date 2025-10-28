package com.atelier.gestionatelier.dto;

import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
public class PaiementTailleurResponseDto {
    private UUID tailleurId; // ID de l'Utilisateur avec rôle TAILLEUR
    private String tailleurNom;
    private String tailleurPrenom;
    private String tailleurTelephone;
    private String tailleurEmail;
    private Integer modelesCousus;
    private Double totalDu;
    private Double montantPaye;
    private Double resteAPayer;
    private String statutPaiement; // EN_ATTENTE, PARTIEL, PAYE
    private List<HistoriquePaiementDto> historiquePaiements;
    private List<AffectationTailleurDto> affectationsEnCours;
}