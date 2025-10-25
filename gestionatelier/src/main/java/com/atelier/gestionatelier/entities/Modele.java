package com.atelier.gestionatelier.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "modeles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Modele {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false)
    private String nom;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "prix_model", nullable = false)
    private Double prix;

    @Column(name = "photo_path")
    private String photoPath; // Chemin de la photo du modèle

    @Column(name = "categorie")
    @Enumerated(EnumType.STRING)
    private CategorieModele categorie;

    @Column(name = "est_actif")
    private Boolean estActif;

    @Column(name = "date_creation")
    private LocalDateTime dateCreation;

    @Column(name = "date_modification")
    private LocalDateTime dateModification;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_atelier", nullable = false)
    private Atelier atelier;

    // Enum pour les catégories
    public enum CategorieModele {
        ROBE,
        JUPE,
        HOMME,
        ENFANT,
        AUTRE
    }

    @PrePersist
    protected void onCreate() {
        dateCreation = LocalDateTime.now();
        dateModification = LocalDateTime.now();
        if (estActif == null) {
            estActif = true;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        dateModification = LocalDateTime.now();
    }
}