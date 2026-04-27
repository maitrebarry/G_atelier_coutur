// UpdateRendezVousDTO.java
package com.atelier.gestionatelier.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class UpdateRendezVousDTO {

    @NotNull(message = "La date du rendez-vous est obligatoire")
    @FutureOrPresent(message = "La date du rendez-vous doit être dans le présent ou le futur")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm")
    private LocalDateTime dateRDV;

    @NotNull(message = "Le type de rendez-vous est obligatoire")
    private String typeRendezVous;

    private String notes;

    private String statut; // Pour changer le statut directement

    private UUID mesureId;
}