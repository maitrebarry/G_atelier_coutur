package com.atelier.gestionatelier.dto;

import java.util.UUID;

public class LoginResponse {
    private String token;
    private UUID id;
    private String email;
    private String prenom;
    private String nom;
    private String role;
    private UUID atelierId; // Changé en UUID pour correspondre à votre entité Atelier

    // Constructeurs
    public LoginResponse() {}

    public LoginResponse(String token, UUID id, String email, String prenom, String nom, String role, UUID atelierId) {
        this.token = token;
        this.id = id;
        this.email = email;
        this.prenom = prenom;
        this.nom = nom;
        this.role = role;
        this.atelierId = atelierId;
    }

    // Getters et setters
    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPrenom() {
        return prenom;
    }

    public void setPrenom(String prenom) {
        this.prenom = prenom;
    }

    public String getNom() {
        return nom;
    }

    public void setNom(String nom) {
        this.nom = nom;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public UUID getAtelierId() {
        return atelierId;
    }

    public void setAtelierId(UUID atelierId) {
        this.atelierId = atelierId;
    }
}