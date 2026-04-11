package com.atelier.gestionatelier.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class HistoriquePaiementDto {
    private UUID id;
    private Double montant;
    private String moyen;
    private String reference;
    private LocalDateTime datePaiement;
}