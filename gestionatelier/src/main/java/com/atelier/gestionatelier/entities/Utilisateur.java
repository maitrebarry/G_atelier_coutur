//package com.atelier.gestionatelier.entities;
//
//import lombok.*;
//import jakarta.persistence.*;
//import jakarta.validation.constraints.*;
//import com.fasterxml.jackson.annotation.JsonIgnore;
//import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
//import com.fasterxml.jackson.annotation.JsonManagedReference;
//
//import java.util.HashSet;
//import java.util.UUID;
//import com.atelier.gestionatelier.security.Role;
//import java.util.Set;
//
//@Entity
//@Getter
//@Setter
//@NoArgsConstructor
//@AllArgsConstructor
//@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"}) // Ajout pour éviter les problèmes de sérialisation
//public class Utilisateur {
//    @Id
//    @GeneratedValue(strategy = GenerationType.AUTO)
//    private UUID id;
//
//    @NotBlank(message = "Le prénom est obligatoire")
//    @Size(min = 2, max = 50, message = "Le prénom doit avoir entre 2 et 50 caractères")
//    @Pattern(regexp = "^[A-Za-zÀ-ÿ\\s'-]+$", message = "Le prénom ne doit contenir que des lettres")
//    private String prenom;
//
//    @NotBlank(message = "Le nom est obligatoire")
//    @Size(min = 2, max = 50, message = "Le nom doit avoir entre 2 et 50 caractères")
//    @Pattern(regexp = "^[A-Za-zÀ-ÿ\\s'-]+$", message = "Le nom ne doit contenir que des lettres")
//    private String nom;
//
//    @Email(message = "Email invalide")
//    @NotBlank(message = "L'email est obligatoire")
//    @Column(unique = true)
//    private String email;
//
//    @NotBlank(message = "Le mot de passe est obligatoire")
//    @Size(min = 6, message = "Le mot de passe doit avoir au moins 6 caractères")
//    @JsonIgnore // Important : ne jamais exposer le mot de passe dans le JSON
//    private String motDePasse;
//
//    @Enumerated(EnumType.STRING)
//    private Role role;
//
//    @Column(name = "actif")
//    private Boolean actif = true; // Par défaut actif
//
//    @ManyToMany(fetch = FetchType.LAZY)
//    @JoinTable(
//            name = "utilisateur_permissions",
//            joinColumns = @JoinColumn(name = "utilisateur_id"),
//            inverseJoinColumns = @JoinColumn(name = "permission_id")
//    )
//    @JsonIgnore
////    @JsonIgnoreProperties("utilisateurs") // CORRECTION : Évite la récursion
//    private Set<Permission> permissions = new HashSet<>();
//
//    @ManyToOne(fetch = FetchType.LAZY) // CORRECTION : Utiliser LAZY loading
//    @JsonIgnoreProperties({"utilisateurs", "hibernateLazyInitializer"}) // CORRECTION : Évite la récursion
//    private Atelier atelier;
//
//    // Supprimer les getters/setters Lombok et les remplacer par des méthodes personnalisées si nécessaire
//    public Boolean getActif() {
//        return actif;
//    }
//
//    public void setActif(Boolean actif) {
//        this.actif = actif;
//    }
//
//    @Column(name = "photo_path")
//    private String photoPath;
//
//    // getters et setters
//    public String getPhotoPath() {
//        return photoPath;
//    }
//
//    public void setPhotoPath(String photoPath) {
//        this.photoPath = photoPath;
//    }
//}



package com.atelier.gestionatelier.entities;

import lombok.*;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.HashSet;
import java.util.UUID;
import com.atelier.gestionatelier.security.Role;
import java.util.Set;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Utilisateur {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @NotBlank(message = "Le prénom est obligatoire")
    @Size(min = 2, max = 50, message = "Le prénom doit avoir entre 2 et 50 caractères")
    @Pattern(regexp = "^[A-Za-zÀ-ÿ\\s'-]+$", message = "Le prénom ne doit contenir que des lettres")
    private String prenom;

    @NotBlank(message = "Le nom est obligatoire")
    @Size(min = 2, max = 50, message = "Le nom doit avoir entre 2 et 50 caractères")
    @Pattern(regexp = "^[A-Za-zÀ-ÿ\\s'-]+$", message = "Le nom ne doit contenir que des lettres")
    private String nom;

    @Email(message = "Email invalide")
    @NotBlank(message = "L'email est obligatoire")
    @Column(unique = true)
    private String email;

    @NotBlank(message = "Le mot de passe est obligatoire")
    @Size(min = 6, message = "Le mot de passe doit avoir au moins 6 caractères")
    @JsonIgnore
    private String motDePasse;

    @Enumerated(EnumType.STRING)
    private Role role;

    @Column(name = "actif")
    private Boolean actif = true;

    // ✅ CORRECTION CRITIQUE : Enlever JsonIgnore et utiliser EAGER loading
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "utilisateur_permissions",
            joinColumns = @JoinColumn(name = "utilisateur_id"),
            inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    @JsonIgnoreProperties({"utilisateurs", "hibernateLazyInitializer"})
    private Set<Permission> permissions = new HashSet<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JsonIgnoreProperties({"utilisateurs", "hibernateLazyInitializer"})
    private Atelier atelier;

    @Column(name = "photo_path")
    private String photoPath;

    // Méthode utilitaire pour obtenir les codes de permissions
    @JsonInclude
    public Set<String> getPermissionCodes() {
        Set<String> codes = new HashSet<>();
        if (permissions != null) {
            for (Permission permission : permissions) {
                codes.add(permission.getCode());
            }
        }
        return codes;
    }
}