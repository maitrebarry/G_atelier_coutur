package com.atelier.gestionatelier.entities;

import lombok.*;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;

import java.util.HashSet;
import java.util.UUID;
import com.atelier.gestionatelier.security.Role;
import java.util.Set;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
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
    private String motDePasse;

    @Enumerated(EnumType.STRING)
    private Role role;
    @Column(name = "actif")
    private Boolean actif = true; // Par défaut actif
      @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "utilisateur_permissions",
        joinColumns = @JoinColumn(name = "utilisateur_id"),
        inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    private Set<Permission> permissions = new HashSet<>();
    public Boolean getActif() {
        return actif;
    }
    
    public void setActif(Boolean actif) {
        this.actif = actif;
    }
    @ManyToOne
    private Atelier atelier;
}
