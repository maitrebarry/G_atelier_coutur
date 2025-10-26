//  - Pour filtrer les affectations
package com.atelier.gestionatelier.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class FiltreAffectationDTO {
    private String statut; // EN_ATTENTE, EN_COURS, TERMINE, VALIDE, ANNULE
    private UUID tailleurId;
    private UUID clientId;
    private String typeVetement;

    // Pagination
    private Integer page = 0;
    private Integer size = 20;
    private String sortBy = "dateCreation";
    private String sortDirection = "DESC";
}