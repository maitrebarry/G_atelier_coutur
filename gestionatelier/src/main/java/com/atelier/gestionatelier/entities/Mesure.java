package com.atelier.gestionatelier.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;
import com.fasterxml.jackson.annotation.JsonBackReference;

@Entity
@Table(name = "mesures")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class Mesure {
   @Id
@GeneratedValue(strategy = GenerationType.AUTO)
private UUID id;


    @Column(name = "date_mesure")
    private LocalDateTime dateMesure;
    // Type de vêtement (robe, jupe, homme)
    private String typeVetement;
    //  Prix du modèle ===
    @Column(name = "prix", nullable = false)
    private Double prix;
    // === Mesures communes ===
    private String sexe;
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

    // === Mesures spécifiques aux jupes ===
    private Double longueurJupe;
    private Double ceinture;

    // === Mesures spécifiques aux robes ===
    private Double longueurPoitrineRobe;
    private Double longueurTailleRobe;
    private Double longueurFesseRobe;

    // === Mesures spécifiques aux hommes ===
    private Double longueurPantalon;
    private Double cuisse;
    private Double corps;

    // Chemin d'accès de la photo
    private String photoPath;
    // NOUVEAU : Référence au modèle existant
    @Column(name = "modele_reference_id")
    private UUID modeleReferenceId;

    @Column(name = "modele_nom")
    private String modeleNom;
    @ManyToOne
    @JoinColumn(name = "id_client", nullable = false)
    @JsonBackReference
    private Client client;

    @ManyToOne
    @JoinColumn(name = "id_atelier", nullable = true)
    private Atelier atelier;
}