// CreateRendezVousDTO.java
package com.atelier.gestionatelier.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.FutureOrPresent;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class CreateRendezVousDTO {

    @NotNull(message = "La date du rendez-vous est obligatoire")
    @FutureOrPresent(message = "La date du rendez-vous doit être dans le présent ou le futur")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm")
    private LocalDateTime dateRDV;

    @NotNull(message = "Le type de rendez-vous est obligatoire")
    private String typeRendezVous; // LIVRAISON, RETOUCHE

    private String notes;

    @NotNull(message = "L'ID du client est obligatoire")
    private UUID clientId;

    private UUID mesureId;

    @NotNull(message = "L'ID de l'atelier est obligatoire")
    private UUID atelierId;
}