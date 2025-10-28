package com.atelier.gestionatelier.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "paiements")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class Paiement {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false)
    private Double montant;

    @Column(nullable = false)
    private String moyen; // ESPECES, MOBILE_MONEY

    @Column(nullable = false, unique = true)
    private String reference;

    @Column(name = "date_paiement", nullable = false)
    private LocalDateTime datePaiement = LocalDateTime.now();

    // Pour identifier si c'est un paiement client ou tailleur
    @Enumerated(EnumType.STRING)
    @Column(name = "type_paiement", nullable = false)
    private TypePaiement typePaiement;

    // Relation avec Client (pour les paiements clients)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_client")
    private Client client;

    // Relation avec Utilisateur ayant le rôle TAILLEUR (pour les paiements tailleurs)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_utilisateur_tailleur")
    private Utilisateur tailleur;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_atelier", nullable = false)
    private Atelier atelier;

    public enum TypePaiement {
        CLIENT,    // Paiement reçu d'un client
        TAILLEUR   // Paiement versé à un tailleur (Utilisateur avec rôle TAILLEUR)
    }
}