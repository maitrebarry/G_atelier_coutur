package com.atelier.gestionatelier.dto;

import lombok.*;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UtilisateurDTO {
    private UUID id;
    private String nom;
    private String prenom;
    private String email;
    private String motdepasse;
    private UUID atelierId;  // référence à Atelier
    private String role;
}
