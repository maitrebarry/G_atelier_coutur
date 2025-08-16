package com.atelier.gestionatelier.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;
@Entity
@Table(name = "tailleurs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Tailleur {
   @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "date_creation")
    private LocalDateTime dateCreation = LocalDateTime.now();
    private String nom;
    private String prenom;
    private String contact;
    private String specialite;

    @ManyToOne
    @JoinColumn(name = "id_atelier", nullable = false)
    private Atelier atelier;
}
