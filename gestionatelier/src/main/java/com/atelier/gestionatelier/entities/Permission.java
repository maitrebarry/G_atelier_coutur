package com.atelier.gestionatelier.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.security.core.GrantedAuthority;
import java.util.UUID;
import java.util.Set;

@Entity
@Table(name = "permissions")
public class Permission implements GrantedAuthority {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(unique = true, nullable = false)
    @Pattern(regexp = "^[A-Z_]+$", message = "Le code doit contenir uniquement des lettres majuscules et des underscores")
    private String code;

    @NotBlank(message = "La description est obligatoire")
    private String description;

    @ManyToMany(mappedBy = "permissions")
    private Set<Utilisateur> utilisateurs;

    public Permission() {}

    public Permission(String code, String description) {
        this.code = code;
        this.description = description;
    }

    @Override
    public String getAuthority() {
        return code;
    }

    // Getters and setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Set<Utilisateur> getUtilisateurs() {
        return utilisateurs;
    }

    public void setUtilisateurs(Set<Utilisateur> utilisateurs) {
        this.utilisateurs = utilisateurs;
    }
}