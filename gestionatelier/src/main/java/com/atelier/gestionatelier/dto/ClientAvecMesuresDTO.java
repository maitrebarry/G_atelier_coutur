// ClientAvecMesuresDTO.java
package com.atelier.gestionatelier.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
public class ClientAvecMesuresDTO {
    private UUID id;
    private String nom;
    private String prenom;
    private String contact;
    private String adresse;
    private String photo;
    private LocalDateTime dateCreation;

    // Liste des mesures (comme dans votre entité Mesure)
    private List<MesureDTO> mesures;

    @Data
    public static class MesureDTO {
        private UUID id;
        private LocalDateTime dateMesure;
        private String typeVetement;
        private Double prix;
        private String sexe;

        // Mesures communes
        private Double epaule;
        private Double manche;
        private Double poitrine;
        private Double taille;
        private Double longueur;
        private Double fesse;
        private Double tourManche;
        private Double longueurPoitrine;
        private Double longueurTaille;
        private Double longueurFesse;

        // Mesures spécifiques aux jupes
        private Double longueurJupe;
        private Double ceinture;

        // Mesures spécifiques aux robes
        private Double longueurPoitrineRobe;
        private Double longueurTailleRobe;
        private Double longueurFesseRobe;

        // Mesures spécifiques aux hommes
        private Double longueurPantalon;
        private Double cuisse;
        private Double corps;

        private String photoPath;
    }
}