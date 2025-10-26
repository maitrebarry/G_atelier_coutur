//  Pour mettre à jour le statut
package com.atelier.gestionatelier.dto;

import lombok.Data;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

@Data
public class UpdateStatutAffectationDTO {

    @NotNull(message = "Le statut est obligatoire")
    @Pattern(regexp = "EN_ATTENTE|EN_COURS|TERMINE|VALIDE|ANNULE",
            message = "Le statut doit être: EN_ATTENTE, EN_COURS, TERMINE, VALIDE ou ANNULE")
    private String statut;
}