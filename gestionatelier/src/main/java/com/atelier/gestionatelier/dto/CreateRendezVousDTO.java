// CreateRendezVousDTO.java
package com.atelier.gestionatelier.dto;

import lombok.Data;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Future;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class CreateRendezVousDTO {

    @NotNull(message = "La date du rendez-vous est obligatoire")
    @Future(message = "La date du rendez-vous doit être dans le futur")
    private LocalDateTime dateRDV;

    @NotNull(message = "Le type de rendez-vous est obligatoire")
    private String typeRendezVous; // LIVRAISON, RETOUCHE

    private String notes;

    @NotNull(message = "L'ID du client est obligatoire")
    private UUID clientId;

    @NotNull(message = "L'ID de l'atelier est obligatoire")
    private UUID atelierId;
}