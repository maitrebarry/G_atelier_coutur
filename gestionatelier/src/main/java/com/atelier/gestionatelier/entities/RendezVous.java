// RendezVous.java
package com.atelier.gestionatelier.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "rendezvous")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class RendezVous {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "date_rdv", nullable = false)
    private LocalDateTime dateRDV;

    @Column(nullable = false)
    private String typeRendezVous; // LIVRAISON, RETOUCHE, ESSAYAGE, etc.

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false)
    private String statut = "PLANIFIE"; // PLANIFIE, CONFIRME, ANNULE, TERMINE

    // Relation avec le client
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_client", nullable = false)
    private Client client;

    // Relation avec l'atelier
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_atelier", nullable = false)
    private Atelier atelier;

    // Timestamps
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}