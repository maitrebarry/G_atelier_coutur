package com.atelier.gestionatelier.entities;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;
import java.time.LocalDateTime;

@Entity
@Table(name = "ateliers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Atelier {

   @Id
@GeneratedValue(strategy = GenerationType.AUTO)
private UUID id;


    @Column(name = "date_creation", nullable = false)
    private LocalDateTime dateCreation = LocalDateTime.now();

    @Column(nullable = false)
    private String nom;

    private String adresse;

    private String telephone;
}
