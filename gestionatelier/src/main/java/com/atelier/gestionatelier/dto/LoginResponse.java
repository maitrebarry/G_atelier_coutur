//package com.atelier.gestionatelier.dto;
//
//import java.util.UUID;
//
//public class LoginResponse {
//    private String token;
//    private UUID id;
//    private String email;
//    private String prenom;
//    private String nom;
//    private String role;
//    private UUID atelierId; // Changé en UUID pour correspondre à votre entité Atelier
//
//    // Constructeurs
//    public LoginResponse() {}
//
//    public LoginResponse(String token, UUID id, String email, String prenom, String nom, String role, UUID atelierId) {
//        this.token = token;
//        this.id = id;
//        this.email = email;
//        this.prenom = prenom;
//        this.nom = nom;
//        this.role = role;
//        this.atelierId = atelierId;
//    }
//
//    // Getters et setters
//    public String getToken() {
//        return token;
//    }
//
//    public void setToken(String token) {
//        this.token = token;
//    }
//
//    public UUID getId() {
//        return id;
//    }
//
//    public void setId(UUID id) {
//        this.id = id;
//    }
//
//    public String getEmail() {
//        return email;
//    }
//
//    public void setEmail(String email) {
//        this.email = email;
//    }
//
//    public String getPrenom() {
//        return prenom;
//    }
//
//    public void setPrenom(String prenom) {
//        this.prenom = prenom;
//    }
//
//    public String getNom() {
//        return nom;
//    }
//
//    public void setNom(String nom) {
//        this.nom = nom;
//    }
//
//    public String getRole() {
//        return role;
//    }
//
//    public void setRole(String role) {
//        this.role = role;
//    }
//
//    public UUID getAtelierId() {
//        return atelierId;
//    }
//
//    public void setAtelierId(UUID atelierId) {
//        this.atelierId = atelierId;
//    }
//}

package com.atelier.gestionatelier.dto;

import java.util.Set;
import java.util.UUID;

public class LoginResponse {
    private String token;
    private UUID id;
    private String email;
    private String prenom;
    private String nom;
    private String role;
    private UUID atelierId;
    private Set<String> permissions; // <-- Champ permissions

    // Constructeur existant (gardez-le pour compatibilité)
    public LoginResponse(String token, UUID id, String email, String prenom, String nom, String role, UUID atelierId) {
        this.token = token;
        this.id = id;
        this.email = email;
        this.prenom = prenom;
        this.nom = nom;
        this.role = role;
        this.atelierId = atelierId;
    }

    // ✅ NOUVEAU constructeur avec permissions
    public LoginResponse(String token, UUID id, String email, String prenom, String nom, String role, UUID atelierId, Set<String> permissions) {
        this.token = token;
        this.id = id;
        this.email = email;
        this.prenom = prenom;
        this.nom = nom;
        this.role = role;
        this.atelierId = atelierId;
        this.permissions = permissions;
    }

    // Getters et Setters
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPrenom() { return prenom; }
    public void setPrenom(String prenom) { this.prenom = prenom; }

    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public UUID getAtelierId() { return atelierId; }
    public void setAtelierId(UUID atelierId) { this.atelierId = atelierId; }

    // ✅ Getter et Setter pour permissions
    public Set<String> getPermissions() { return permissions; }
    public void setPermissions(Set<String> permissions) { this.permissions = permissions; }
}