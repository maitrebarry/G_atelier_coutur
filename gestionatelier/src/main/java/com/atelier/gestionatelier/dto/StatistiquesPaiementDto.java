package com.atelier.gestionatelier.dto;

import lombok.Data;

@Data
public class StatistiquesPaiementDto {
    private Double totalPaiementsClients;
    private Double totalPaiementsTailleurs;
    private Double beneficeNet;
    private Integer clientsEnAttente;
    private Integer clientsPartiellementPayes;
    private Integer clientsTotalementPayes;
    private Integer tailleursEnAttente;
    private Integer tailleursPartiellementPayes;
    private Integer tailleursTotalementPayes;
}