package com.atelier.gestionatelier.dto;

import lombok.Data;

@Data
public class SyntheseMensuelleDTO {
    private String monthKey;
    private String label;
    private Integer entrees;
    private Integer sorties;
}