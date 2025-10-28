package com.atelier.gestionatelier.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class HistoriquePaiementDto {
    private Double montant;
    private String moyen;
    private String reference;
    private LocalDateTime datePaiement;
}