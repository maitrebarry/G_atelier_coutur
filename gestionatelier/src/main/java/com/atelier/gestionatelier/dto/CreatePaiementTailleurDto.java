package com.atelier.gestionatelier.dto;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.util.UUID;

@Data
public class CreatePaiementTailleurDto {

    @NotNull(message = "Le montant est obligatoire")
    @Positive(message = "Le montant doit être positif")
    @DecimalMin(value = "100.0", message = "Le montant minimum est de 100 FCFA")
    private Double montant;

    @NotNull(message = "Le moyen de paiement est obligatoire")
    @Pattern(regexp = "ESPECES|MOBILE_MONEY", message = "Le moyen de paiement doit être ESPECES ou MOBILE_MONEY")
    private String moyen;

    @NotNull(message = "La référence est obligatoire")
    @Size(min = 3, max = 50, message = "La référence doit contenir entre 3 et 50 caractères")
    private String reference;

    @NotNull(message = "L'ID du tailleur est obligatoire")
    private UUID tailleurId;

    @NotNull(message = "L'ID de l'atelier est obligatoire")
    private UUID atelierId;
}