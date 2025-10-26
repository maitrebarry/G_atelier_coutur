//  - Spécialisé pour l'affectation
package com.atelier.gestionatelier.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class ClientAvecMesuresValideesDTO {
    private UUID id;
    private String nom;
    private String prenom;
    private String contact;
    private String adresse;
    private String email;
    private String photo;
    private LocalDateTime dateCreation;

    private List<MesureValideeDTO> mesures;

    @Data
    public static class MesureValideeDTO {
        private UUID id;
        private String typeVetement;
        private Double prix;
        private LocalDateTime dateMesure;
        private Boolean affecte;
        private String photoPath;

        // Mesures principales pour l'affichage
        private Double epaule;
        private Double manche;
        private Double poitrine;
        private Double taille;
        private Double longueur;
        private Double fesse;

        // Référence au modèle
        private UUID modeleReferenceId;
        private String modeleNom;
    }
}