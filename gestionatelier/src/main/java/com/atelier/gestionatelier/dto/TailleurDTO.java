//  - Pour la liste des tailleurs
package com.atelier.gestionatelier.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class TailleurDTO {
    private UUID id;
    private String nom;
    private String prenom;
    private String email;
    private String role = "TAILLEUR";
    private Boolean actif;
    private String photoPath;

    // Statistiques (optionnel)
    private Long nombreAffectationsEnCours;
    private Long nombreAffectationsTerminees;
}