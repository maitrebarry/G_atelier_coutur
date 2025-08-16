package com.atelier.gestionatelier.entities;
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;
import java.time.LocalDateTime;

//-----------------------------------
// Entité Affectation (modele -> tailleur)
//-----------------------------------
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

   @Column(name = "date_paiement", nullable = false)
   private LocalDateTime datePaiement = LocalDateTime.now();

    @ManyToOne
    @JoinColumn(name = "id_modele", nullable = false)
    private Modele modele;

    @ManyToOne
    @JoinColumn(name = "id_tailleur", nullable = false)
    private Tailleur tailleur;

    @ManyToOne
    @JoinColumn(name = "id_atelier", nullable = false)
    private Atelier atelier;
}
