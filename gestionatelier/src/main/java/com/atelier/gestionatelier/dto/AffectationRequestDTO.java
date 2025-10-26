//  - Pour la création d'affectation
package com.atelier.gestionatelier.dto;

import lombok.Data;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
public class AffectationRequestDTO {

    @NotNull(message = "L'ID du tailleur est obligatoire")
    private UUID tailleurId;

    @FutureOrPresent(message = "La date d'échéance doit être aujourd'hui ou dans le futur")
    private LocalDate dateEcheance;

    @NotNull(message = "La liste des affectations est obligatoire")
    @Size(min = 1, message = "Au moins une affectation doit être spécifiée")
    private List<AffectationItemDTO> affectations;

    @Data
    public static class AffectationItemDTO {
        @NotNull(message = "L'ID du client est obligatoire")
        private UUID clientId;

        @NotNull(message = "L'ID de la mesure est obligatoire")
        private UUID mesureId;

        @NotNull(message = "Le prix du tailleur est obligatoire")
        @Positive(message = "Le prix du tailleur doit être positif")
        @DecimalMin(value = "1000.0", message = "Le prix du tailleur doit être d'au moins 1000 FCFA")
        private Double prixTailleur;
    }
}