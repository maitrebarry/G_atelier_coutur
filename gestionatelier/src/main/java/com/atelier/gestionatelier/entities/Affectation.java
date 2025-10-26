package com.atelier.gestionatelier.entities;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;
import java.time.LocalDateTime;
import java.time.LocalDate;

@Entity
@Table(name = "affectations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Affectation {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "date_creation")
    private LocalDateTime dateCreation = LocalDateTime.now();

    @Column(name = "date_echeance")
    private LocalDate dateEcheance;

    @Column(name = "date_debut_reelle")
    private LocalDateTime dateDebutReelle;

    @Column(name = "date_fin_reelle")
    private LocalDateTime dateFinReelle;

    @Column(name = "date_validation")
    private LocalDateTime dateValidation;

    @Column(name = "prix_tailleur", nullable = false)
    private Double prixTailleur;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut", nullable = false)
    private StatutAffectation statut = StatutAffectation.EN_ATTENTE;

    // Relations
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_client", nullable = false)
    private Client client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_mesure", nullable = false)
    private Mesure mesure;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_tailleur", nullable = false)
    private Utilisateur tailleur;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_atelier", nullable = false)
    private Atelier atelier;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_createur", nullable = false)
    private Utilisateur createur;

    public enum StatutAffectation {
        EN_ATTENTE,    // Affectation créée, en attente du tailleur
        EN_COURS,      // Tailleur a démarré le travail
        TERMINE,       // Tailleur a terminé le travail
        VALIDE,        // Propriétaire a validé le travail
        ANNULE         // Affectation annulée
    }

    @PrePersist
    protected void onCreate() {
        if (dateCreation == null) {
            dateCreation = LocalDateTime.now();
        }
        if (statut == null) {
            statut = StatutAffectation.EN_ATTENTE;
        }
    }
}