// - Pour les notifications de fin de couture
package com.atelier.gestionatelier.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class NotificationDTO {
    private UUID id;
    private String type; // TERMINAISON_COUTURE, AFFECTATION, etc.
    private String titre;
    private String message;
    private LocalDateTime dateCreation;
    private boolean lue;
    private UUID affectationId;
    private UUID tailleurId;
    private String tailleurNomComplet;
    private UUID clientId;
    private String clientNomComplet;
    private String typeVetement;
}