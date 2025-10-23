package com.atelier.gestionatelier.dto;

import lombok.*;
import org.springframework.web.multipart.MultipartFile;

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

    private MultipartFile photo;

    // getter et setter
    public MultipartFile getPhoto() {
        return photo;
    }

    public void setPhoto(MultipartFile photo) {
        this.photo = photo;
    }
}
