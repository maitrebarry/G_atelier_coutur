package com.atelier.gestionatelier.entities;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "modeles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Modele {

   @Id
@GeneratedValue(strategy = GenerationType.AUTO)
private UUID id;


    private String nom;
    private String description;

    @Column(name = "prix_model")
    private Double prix;

    @ManyToOne
    @JoinColumn(name = "id_atelier", nullable = false)
    private Atelier atelier;
}
