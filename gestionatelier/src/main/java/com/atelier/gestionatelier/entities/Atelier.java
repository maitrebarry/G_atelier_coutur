package com.atelier.gestionatelier.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.UUID;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "ateliers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"}) // Ajout pour éviter les problèmes de sérialisation
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

    private String email;
    // CORRECTION : Si vous avez une relation OneToMany avec Utilisateur
    @OneToMany(mappedBy = "atelier", fetch = FetchType.LAZY)
    @JsonIgnore // Important : éviter la récursion
    private List<Utilisateur> utilisateurs;
}