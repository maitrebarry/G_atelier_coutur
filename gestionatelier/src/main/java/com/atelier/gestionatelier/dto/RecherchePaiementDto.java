package com.atelier.gestionatelier.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class RecherchePaiementDto {
    private String searchTerm;
    private String statutPaiement; // EN_ATTENTE, PARTIEL, PAYE
    private String type; // CLIENT, TAILLEUR
    private UUID atelierId;
}