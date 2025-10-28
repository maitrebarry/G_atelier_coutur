package com.atelier.gestionatelier.dto;

import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
public class PaiementClientResponseDto {
    private UUID clientId;
    private String clientNom;
    private String clientPrenom;
    private String clientTelephone;
    private String modeleNom;
    private Double prixTotal;
    private Double montantPaye;
    private Double resteAPayer;
    private String statutPaiement; // EN_ATTENTE, PARTIEL, PAYE
    private List<HistoriquePaiementDto> historiquePaiements;
    private List<AffectationInfoDto> affectations;


}