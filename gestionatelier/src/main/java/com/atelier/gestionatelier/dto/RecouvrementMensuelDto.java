package com.atelier.gestionatelier.dto;

import lombok.Data;

@Data
public class RecouvrementMensuelDto {
    private Integer mois;
    private Integer annee;
    private Double totalRecouvrement;
}
