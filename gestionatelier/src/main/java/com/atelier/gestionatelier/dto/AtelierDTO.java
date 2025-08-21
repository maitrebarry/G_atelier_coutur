package com.atelier.gestionatelier.dto;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

public class AtelierDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    // Pour la création
    private String nom;
    private String adresse;
    private String telephone;
    private LocalDateTime dateCreation;

    // Pour la réponse
    private UUID id;

    // Constructeurs
    public AtelierDTO() {}

    public AtelierDTO(String nom, String adresse, String telephone, LocalDateTime dateCreation) {
        this.nom = nom;
        this.adresse = adresse;
        this.telephone = telephone;
        this.dateCreation = dateCreation;
    }

    // Getters et Setters
    public static long getSerialversionuid() {
        return serialVersionUID;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public String getAdresse() {
        return adresse;
    }

    public void setAdresse(String adresse) {
        this.adresse = adresse;
    }

    public String getTelephone() {
        return telephone;
    }

    public void setTelephone(String telephone) {
        this.telephone = telephone;
    }

    public LocalDateTime getDateCreation() {
        return dateCreation;
    }

    public void setDateCreation(LocalDateTime dateCreation) {
        this.dateCreation = dateCreation;
    }
}