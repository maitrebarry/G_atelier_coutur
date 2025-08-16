package com.atelier.gestionatelier.entities;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;
import java.util.UUID;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonManagedReference;

@Entity
@Table(name = "clients")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Client {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;
    private String nom;
    private String prenom;
    private String contact;
    private String adresse;
    private String photo; // Nom du fichier photo (ex: "photo.jpg")
    @Column(name = "date_creation")
    private LocalDateTime dateCreation = LocalDateTime.now();

    @ManyToOne
    @JoinColumn(name = "id_atelier", nullable = true)
    private Atelier atelier;
    
    // Liste des mesures liées à ce client
    @OneToMany(mappedBy = "client", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<Mesure> mesures;

     // Getters et setters
    public String getPhoto() {
        return photo;
    }
    public void setPhoto(String photo) {
        this.photo = photo;
    }
    
}
