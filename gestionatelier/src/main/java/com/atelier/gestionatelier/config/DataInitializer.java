package com.atelier.gestionatelier.config;

import com.atelier.gestionatelier.entities.Permission;
import com.atelier.gestionatelier.entities.Utilisateur;
import com.atelier.gestionatelier.repositories.PermissionRepository;
import com.atelier.gestionatelier.repositories.UtilisateurRepository;
import com.atelier.gestionatelier.security.Role;
import com.atelier.gestionatelier.services.PermissionService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;

@Component
public class DataInitializer implements CommandLineRunner {

    private final PermissionService permissionService;
    private final UtilisateurRepository utilisateurRepository;
    private final PermissionRepository permissionRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(PermissionService permissionService,
                           UtilisateurRepository utilisateurRepository,
                           PermissionRepository permissionRepository,
                           PasswordEncoder passwordEncoder) {
        this.permissionService = permissionService;
        this.utilisateurRepository = utilisateurRepository;
        this.permissionRepository = permissionRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        // 1. Initialiser les permissions par défaut
        permissionService.initializeDefaultPermissions();
        System.out.println("✅ Permissions par défaut initialisées avec succès");

        // 2. Créer l'utilisateur super admin par défaut
        createDefaultSuperAdmin();
    }

    private void createDefaultSuperAdmin() {
        Optional<Utilisateur> existingAdmin = utilisateurRepository.findByEmail("barrymoustapha485@gmail.com");
        if (existingAdmin.isPresent()) {
            System.out.println("✅ Utilisateur super admin existe déjà");
            return;
        }

        try {
            // Créer l'utilisateur super admin
            Utilisateur superAdmin = new Utilisateur();
            superAdmin.setPrenom("Moustapha");
            superAdmin.setNom("Barry");
            superAdmin.setEmail("barrymoustapha485@gmail.com");
            superAdmin.setMotDePasse(passwordEncoder.encode("admin123"));
            superAdmin.setRole(Role.SUPERADMIN);
            superAdmin.setActif(true);
            superAdmin.setAtelier(null);

            // Assigner toutes les permissions au SUPERADMIN
            List<Permission> allPermissions = permissionRepository.findAll();
            superAdmin.setPermissions(new HashSet<>(allPermissions));

            // Sauvegarder l'utilisateur
            utilisateurRepository.save(superAdmin);

            System.out.println("Utilisateur super admin créé avec succès");
            System.out.println("Email: barrymoustapha485@gmail.com");
            System.out.println("Mot de passe: admin123");
            System.out.println("Rôle: SUPERADMIN");
            System.out.println("Permissions: " + allPermissions.size() + " permissions assignées");
            System.out.println("URL de connexion: http://localhost:8081");
            System.out.println("Changez le mot de passe après la première connexion!");

        } catch (Exception e) {
            System.err.println("❌ Erreur lors de la création du super admin: " + e.getMessage());
            e.printStackTrace();
        }
    }
}