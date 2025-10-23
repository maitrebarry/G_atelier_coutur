// UpdateRendezVousDTO.java
package com.atelier.gestionatelier.dto;

import lombok.Data;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

@Data
public class UpdateRendezVousDTO {

    @NotNull(message = "La date du rendez-vous est obligatoire")
    @Future(message = "La date du rendez-vous doit être dans le futur")
    private LocalDateTime dateRDV;

    @NotNull(message = "Le type de rendez-vous est obligatoire")
    private String typeRendezVous;

    private String notes;

    private String statut; // Pour changer le statut directement
}