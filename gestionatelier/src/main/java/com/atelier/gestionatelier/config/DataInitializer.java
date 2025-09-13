package com.atelier.gestionatelier.config;

import com.atelier.gestionatelier.services.PermissionService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private final PermissionService permissionService;

    public DataInitializer(PermissionService permissionService) {
        this.permissionService = permissionService;
    }

    @Override
    public void run(String... args) throws Exception {
        // Initialiser les permissions par défaut au démarrage de l'application
        permissionService.initializeDefaultPermissions();
        System.out.println("Permissions par défaut initialisées avec succès");
    }
}