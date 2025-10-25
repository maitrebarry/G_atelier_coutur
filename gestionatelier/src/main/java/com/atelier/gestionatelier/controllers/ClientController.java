package com.atelier.gestionatelier.controllers;

import com.atelier.gestionatelier.dto.ClientDTO;
import com.atelier.gestionatelier.dto.ModeleDTO;
import com.atelier.gestionatelier.dto.ModeleListDTO;
import com.atelier.gestionatelier.entities.Client;
import com.atelier.gestionatelier.entities.Modele;
import com.atelier.gestionatelier.entities.Utilisateur;
import com.atelier.gestionatelier.services.ClientService;
import com.atelier.gestionatelier.services.FileStorageService;
import com.atelier.gestionatelier.services.ModeleService;
import com.atelier.gestionatelier.services.UtilisateurService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@RestController
@RequestMapping("/api/clients")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class ClientController {
    private final ClientService clientService;
    private final UtilisateurService utilisateurService;
    private final ModeleService modeleService;


    @PostMapping("/ajouter")
    public ResponseEntity<?> ajouterClient(@ModelAttribute ClientDTO clientDTO, Authentication authentication) {
        try {
            System.out.println("=== DÉBUT AJOUT CLIENT ===");

            // Récupérer l'utilisateur connecté et injecter l'atelier
            String email = authentication.getName();
            System.out.println("Utilisateur connecté: " + email);

            Utilisateur currentUser = utilisateurService.findByEmail(email);
            System.out.println("Rôle utilisateur: " + currentUser.getRole());
            System.out.println("Atelier utilisateur: " + (currentUser.getAtelier() != null ? currentUser.getAtelier().getId() : "null"));

            // ✅ CORRECTION CRITIQUE : Vérifier et forcer l'atelier
            if (currentUser.getAtelier() == null) {
                System.out.println("❌ ERREUR: Aucun atelier associé à l'utilisateur connecté");
                Map<String, Object> error = new HashMap<>();
                error.put("status", "error");
                error.put("message", "Aucun atelier n'est associé à votre compte. Contactez l'administrateur.");
                return ResponseEntity.badRequest().body(error);
            }

            // ✅ FORCER l'atelier ID
            clientDTO.setAtelierId(currentUser.getAtelier().getId());
            System.out.println("✅ Atelier injecté dans DTO: " + clientDTO.getAtelierId());

            // ✅ CORRECTION : Nettoyer genderPreview si duplication
            if (clientDTO.getGenderPreview() != null && clientDTO.getGenderPreview().contains(",")) {
                String cleanedGender = clientDTO.getGenderPreview().split(",")[0];
                clientDTO.setGenderPreview(cleanedGender);
                System.out.println("✅ GenderPreview nettoyé: '" + cleanedGender + "'");
            }

            // ✅ CORRECTION : Log détaillé pour debug
            System.out.println("=== DONNÉES REÇUES ===");
            System.out.println("Nom: " + clientDTO.getNom());
            System.out.println("Prénom: " + clientDTO.getPrenom());
            System.out.println("Sexe: " + clientDTO.getSexe());
            System.out.println("AtelierId: " + clientDTO.getAtelierId());
            System.out.println("GenderPreview: " + clientDTO.getGenderPreview());
            System.out.println("Femme_type: " + clientDTO.getFemme_type());
            System.out.println("Photo: " + (clientDTO.getPhoto() != null ? clientDTO.getPhoto().getOriginalFilename() : "null"));
            System.out.println("Homme_tour_manche: " + clientDTO.getHomme_tour_manche());
            // ✅ AJOUT : LOGGING POUR MODÈLE
            System.out.println("=== INFORMATIONS MODÈLE ===");
            System.out.println("Modèle sélectionné ID: " + clientDTO.getSelectedModelId());
            System.out.println("Nom modèle: " + clientDTO.getModeleNom());
            System.out.println("Photo fournie: " + (clientDTO.getPhoto() != null ? clientDTO.getPhoto().getOriginalFilename() : "null"));

            // Validation des champs
            String erreur = validerClientDTO(clientDTO);
            if (erreur != null) {
                System.out.println("❌ Validation échouée: " + erreur);
                Map<String, Object> error = new HashMap<>();
                error.put("status", "error");
                error.put("message", erreur);
                return ResponseEntity.badRequest().body(error);
            }

            System.out.println("✅ Validation réussie");

            // ✅ CORRECTION : Photo par défaut selon sexe SI PAS UPLOADÉE
            if (clientDTO.getPhoto() == null || clientDTO.getPhoto().isEmpty()) {
                if ("Homme".equalsIgnoreCase(clientDTO.getSexe())) {
                    clientDTO.setGenderPreview("default_homme.jpg");
                } else {
                    clientDTO.setGenderPreview("default_femme.jpg");
                }
                System.out.println("✅ Photo par défaut définie: " + clientDTO.getGenderPreview());
            }

            // Appel du service
            System.out.println("🔄 Appel du service d'enregistrement...");
            Client clientSauvegarde = clientService.enregistrerClientAvecMesures(clientDTO);

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Client '" + clientSauvegarde.getNom() + "' enregistré avec succès !");
            response.put("clientId", clientSauvegarde.getId());

            System.out.println("=== FIN AJOUT CLIENT - SUCCÈS ===");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("💥 ERREUR CRITIQUE DANS LE CONTROLEUR: " + e.getMessage());
            e.printStackTrace();
            Map<String, Object> error = new HashMap<>();
            error.put("status", "error");
            error.put("message", e.getMessage() != null ? e.getMessage() : "Erreur serveur lors de l'enregistrement");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    // ✅ CORRECTION : Récupérer seulement les clients de l'atelier de l'utilisateur connecté

    @GetMapping
    public ResponseEntity<List<Client>> getAllClients(Authentication authentication) {
        try {
            System.out.println("=== RÉCUPÉRATION DES CLIENTS ===");

            String email = authentication.getName();
            Utilisateur currentUser = utilisateurService.findByEmail(email);

            List<Client> clients;

            if (currentUser.getAtelier() != null) {
                // ✅ CORRECTION : Utiliser la méthode qui filtre par atelier
                clients = clientService.getClientsByAtelier(currentUser.getAtelier().getId());
                System.out.println("Clients récupérés pour l'atelier " + currentUser.getAtelier().getId() + ": " + clients.size());
            } else {
                clients = clientService.getAllClients();
                System.out.println("Tous les clients récupérés (SUPERADMIN): " + clients.size());
            }

            return ResponseEntity.ok(clients);

        } catch (Exception e) {
            System.err.println("Erreur lors de la récupération des clients: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ✅ CORRECTION : Vérifier que l'utilisateur a accès à ce client
    @GetMapping("/{id}")
    public ResponseEntity<Client> getClientById(@PathVariable UUID id, Authentication authentication) {
        String email = authentication.getName();
        Utilisateur currentUser = utilisateurService.findByEmail(email);

        Optional<Client> clientOpt;

        if (currentUser.getAtelier() != null) {
            // Récupérer le client seulement s'il appartient à l'atelier de l'utilisateur
            clientOpt = clientService.getClientByIdAndAtelier(id, currentUser.getAtelier().getId());
            System.out.println("Recherche client " + id + " pour l'atelier: " + currentUser.getAtelier().getId());
        } else {
            // SUPERADMIN peut voir tous les clients
            clientOpt = clientService.getClientById(id);
            System.out.println("Recherche client " + id + " (SUPERADMIN)");
        }

        return clientOpt
                .map(ResponseEntity::ok)
                .orElseGet(() -> {
                    System.out.println("Client non trouvé ou accès refusé: " + id);
                    return ResponseEntity.notFound().build();
                });
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> modifierClient(@PathVariable UUID id, @ModelAttribute ClientDTO clientDTO, Authentication authentication) {
        try {
            System.out.println("=== DÉBUT MODIFICATION CLIENT ===");
            System.out.println("Client ID: " + id);

            String email = authentication.getName();
            Utilisateur currentUser = utilisateurService.findByEmail(email);

            System.out.println("Utilisateur connecté: " + email);
            System.out.println("Atelier utilisateur: " + (currentUser.getAtelier() != null ? currentUser.getAtelier().getId() : "null"));

            // ✅ CORRECTION : Vérifier l'existence du client
            Optional<Client> clientOpt = clientService.getClientById(id);
            if (clientOpt.isEmpty()) {
                System.out.println("❌ Client non trouvé: " + id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                        "status", "error",
                        "message", "Client non trouvé"
                ));
            }

            Client clientExist = clientOpt.get();
            System.out.println("✅ Client trouvé: " + clientExist.getNom() + " " + clientExist.getPrenom());
            System.out.println("Atelier actuel du client: " + (clientExist.getAtelier() != null ? clientExist.getAtelier().getId() : "null"));

            // ✅ CORRECTION CRITIQUE : Toujours utiliser l'atelier de l'utilisateur connecté
            if (currentUser.getAtelier() != null) {
                clientDTO.setAtelierId(currentUser.getAtelier().getId());
                System.out.println("✅ Atelier injecté dans DTO: " + clientDTO.getAtelierId());
            } else {
                System.out.println("❌ ERREUR: Aucun atelier associé à l'utilisateur connecté");
                return ResponseEntity.badRequest().body(Map.of(
                        "status", "error",
                        "message", "Aucun atelier associé à votre compte"
                ));
            }

            // ✅ CORRECTION : Nettoyer genderPreview si duplication
            if (clientDTO.getGenderPreview() != null && clientDTO.getGenderPreview().contains(",")) {
                String cleanedGender = clientDTO.getGenderPreview().split(",")[0];
                clientDTO.setGenderPreview(cleanedGender);
                System.out.println("✅ GenderPreview nettoyé: '" + cleanedGender + "'");
            }

            // ✅ CORRECTION : Déterminer le type de vêtement pour femme
            if ("Femme".equalsIgnoreCase(clientDTO.getSexe())) {
                if (clientDTO.getFemme_type_edit() != null && !clientDTO.getFemme_type_edit().trim().isEmpty()) {
                    clientDTO.setFemme_type(clientDTO.getFemme_type_edit());
                    System.out.println("✅ Type vêtement femme défini: " + clientDTO.getFemme_type());
                }
            }

            // ✅ CORRECTION : Log détaillé pour debug
            System.out.println("=== DONNÉES REÇUES POUR MODIFICATION ===");
            System.out.println("Nom: " + clientDTO.getNom());
            System.out.println("Prénom: " + clientDTO.getPrenom());
            System.out.println("Sexe: " + clientDTO.getSexe());
            System.out.println("AtelierId: " + clientDTO.getAtelierId());
            System.out.println("GenderPreview: " + clientDTO.getGenderPreview());
            System.out.println("Femme_type: " + clientDTO.getFemme_type());
            System.out.println("Femme_type_edit: " + clientDTO.getFemme_type_edit());
            System.out.println("Existing_photo: " + clientDTO.getExisting_photo());
            System.out.println("Photo: " + (clientDTO.getPhoto() != null ? clientDTO.getPhoto().getOriginalFilename() : "null"));

            // Validation des données
            String erreur = validerClientDTO(clientDTO);
            if (erreur != null) {
                System.out.println("❌ Validation échouée: " + erreur);
                return ResponseEntity.badRequest().body(Map.of(
                        "status", "error",
                        "message", erreur
                ));
            }

            System.out.println("✅ Validation réussie, début modification...");

            // Mise à jour du client
            Client clientModifie = clientService.modifierClient(id, clientDTO);

            System.out.println("✅ Client modifié avec succès: " + clientModifie.getNom());
            System.out.println("Atelier après modification: " + (clientModifie.getAtelier() != null ? clientModifie.getAtelier().getId() : "null"));
            System.out.println("=== FIN MODIFICATION CLIENT - SUCCÈS ===");

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", "Client '" + clientModifie.getNom() + "' modifié avec succès !",
                    "clientId", clientModifie.getId()
            ));

        } catch (Exception e) {
            System.err.println("💥 ERREUR MODIFICATION CLIENT ===");
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", "error",
                    "message", e.getMessage() != null ? e.getMessage() : "Erreur serveur lors de la modification"
            ));
        }
    }
    // ✅ CORRECTION : Vérifier les permissions pour la suppression
    @DeleteMapping("/{id}")
    public ResponseEntity<?> supprimerClient(@PathVariable UUID id, Authentication authentication) {
        try {
            System.out.println("=== DÉBUT SUPPRESSION CLIENT CONTROLEUR ===");
            System.out.println("Client ID: " + id);

            String email = authentication.getName();
            Utilisateur currentUser = utilisateurService.findByEmail(email);

            System.out.println("Utilisateur connecté: " + email);
            System.out.println("Atelier utilisateur: " + (currentUser.getAtelier() != null ? currentUser.getAtelier().getId() : "null"));

            // Vérifier l'existence du client ET les permissions
            Optional<Client> clientOpt;
            if (currentUser.getAtelier() != null) {
                clientOpt = clientService.getClientByIdAndAtelier(id, currentUser.getAtelier().getId());
                System.out.println("Recherche avec filtre atelier");
            } else {
                clientOpt = clientService.getClientById(id);
                System.out.println("Recherche sans filtre (SUPERADMIN)");
            }

            if (clientOpt.isEmpty()) {
                System.out.println("Client non trouvé ou accès refusé: " + id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                        "status", "error",
                        "message", "Client non trouvé ou accès refusé"
                ));
            }

            System.out.println("Client trouvé, début suppression...");
            clientService.supprimerClient(id);

            System.out.println("=== FIN SUPPRESSION CLIENT CONTROLEUR - SUCCÈS ===");
            return ResponseEntity.ok().body(Map.of(
                    "status", "success",
                    "message", "Client et ses mesures supprimés avec succès"
            ));

        } catch (EntityNotFoundException e) {
            System.err.println("=== ERREUR SUPPRESSION - CLIENT NON TROUVÉ ===");
            System.err.println(e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "status", "error",
                    "message", e.getMessage()
            ));
        } catch (Exception e) {
            System.err.println("=== ERREUR SUPPRESSION ===");
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of(
                    "status", "error",
                    "message", "Erreur lors de la suppression: " + e.getMessage()
            ));
        }
    }

    // ========== ENDPOINTS MODÈLES POUR CLIENTS ==========

    // NOUVEAU : Endpoint pour récupérer les modèles par catégorie
    @GetMapping("/modeles/atelier/{atelierId}")
    public ResponseEntity<List<ModeleListDTO>> getModelesByAtelier(
            @PathVariable UUID atelierId,
            @RequestParam(required = false) Modele.CategorieModele categorie,
            Authentication authentication) {
        try {
            String email = authentication.getName();
            System.out.println("🔍 Récupération modèles pour atelier: " + atelierId + ", catégorie: " + categorie);

            List<ModeleListDTO> modeles;
            if (categorie != null) {
                modeles = modeleService.getModelesByCategorie(atelierId, categorie);
            } else {
                modeles = modeleService.getModelesByAtelier(atelierId);
            }

            System.out.println("✅ " + modeles.size() + " modèles trouvés");
            return ResponseEntity.ok(modeles);

        } catch (Exception e) {
            System.err.println("❌ Erreur récupération modèles: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().build();
        }
    }

    // NOUVEAU : Endpoint pour récupérer un modèle spécifique
    @GetMapping("/modeles/{modeleId}/atelier/{atelierId}")
    public ResponseEntity<ModeleDTO> getModeleById(
            @PathVariable UUID modeleId,
            @PathVariable UUID atelierId,
            Authentication authentication) {
        try {
            String email = authentication.getName();
            System.out.println("🔍 Récupération modèle: " + modeleId + " pour atelier: " + atelierId);

            ModeleDTO modele = modeleService.getModeleById(modeleId, atelierId);

            System.out.println("✅ Modèle trouvé: " + modele.getNom());
            return ResponseEntity.ok(modele);

        } catch (Exception e) {
            System.err.println("❌ Erreur récupération modèle: " + e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }
    private String validerClientDTO(ClientDTO dto) {
        // Champs obligatoires
        if (dto.getNom() == null || dto.getNom().isBlank())
            return "Le nom est obligatoire";
        if (dto.getPrenom() == null || dto.getPrenom().isBlank())
            return "Le prénom est obligatoire";
        if (dto.getAdresse() == null || dto.getAdresse().isBlank())
            return "L'adresse est obligatoire";
        if (dto.getSexe() == null || dto.getSexe().isBlank())
            return "Le sexe est obligatoire";
        // === NOUVEAU : Validation du prix ===
        if (dto.getPrix() == null || dto.getPrix().isBlank())
            return "Le prix du modèle est obligatoire";

        try {
            Double prix = Double.parseDouble(dto.getPrix().trim());
            if (prix <= 0) {
                return "Le prix doit être supérieur à 0";
            }
        } catch (NumberFormatException e) {
            return "Le prix doit être un nombre valide";
        }
        // Validation contact : exactement 8 chiffres
        if (dto.getContact() == null || !dto.getContact().matches("\\d{8}"))
            return "Le contact doit contenir exactement 8 chiffres";

        // Validation mesures numériques facultatives
        String[] mesures = {
                dto.getRobe_epaule(), dto.getRobe_manche(), dto.getRobe_poitrine(),
                dto.getRobe_taille(), dto.getRobe_longueur(), dto.getRobe_fesse(),
                dto.getRobe_tour_manche(), dto.getRobe_longueur_poitrine(),
                dto.getRobe_longueur_taille(), dto.getRobe_longueur_fesse(),
                dto.getJupe_epaule(), dto.getJupe_manche(), dto.getJupe_poitrine(),
                dto.getJupe_taille(), dto.getJupe_longueur(), dto.getJupe_longueur_jupe(),
                dto.getJupe_ceinture(), dto.getJupe_fesse(), dto.getJupe_tour_manche(),
                dto.getJupe_longueur_poitrine(), dto.getJupe_longueur_taille(),
                dto.getJupe_longueur_fesse(), dto.getHomme_epaule(), dto.getHomme_manche(),
                dto.getHomme_longueur(), dto.getHomme_longueur_pantalon(),
                dto.getHomme_ceinture(), dto.getHomme_cuisse(), dto.getHomme_poitrine(),
                dto.getHomme_corps(), dto.getHomme_tour_manche()
        };

        for (String mesure : mesures) {
            if (mesure != null && !mesure.isBlank()) {
                try {
                    Double.parseDouble(mesure);
                } catch (NumberFormatException e) {
                    return "Les mesures doivent être des nombres valides";
                }
            }
        }
        return null; // Validation OK
    }

    void afficherChamps(ClientDTO dto) {
        Arrays.stream(dto.getClass().getDeclaredFields()).forEach(field -> {
            field.setAccessible(true);
            try {
                System.out.println(field.getName() + " = " + field.get(dto));
            } catch (IllegalAccessException e) {
                System.err.println("Erreur d'accès au champ : " + field.getName());
            }
        });
    }

    @RestController
    @RequestMapping("/api/modeles")
    @CrossOrigin(origins = "*")
    @RequiredArgsConstructor
    public class ModeleController {

        private final FileStorageService fileStorageService;
        @PostMapping("/{id}/photo")
        public ResponseEntity<?> updateModelePhoto(@PathVariable UUID id,
                                                   @RequestParam("photo") MultipartFile photo) {
            try {
                // 1. Valider le fichier
                if (!fileStorageService.isImageFile(photo)) {
                    return ResponseEntity.badRequest().body("Le fichier doit être une image");
                }

                fileStorageService.validateFileSize(photo, 5 * 1024 * 1024); // 5MB

                // 2. Sauvegarder le fichier - APPEL SIMPLE !
                String fileName = fileStorageService.storeFile(photo, "model_photo");

                // 3. Ici vous pouvez mettre à jour votre entité Mesure
                // Mesure mesure = mesureRepository.findById(id).orElseThrow(...);
                // mesure.setPhotoPath(fileName);
                // mesureRepository.save(mesure);

                return ResponseEntity.ok(Map.of(
                        "fileName", fileName,
                        "message", "Photo du modèle mise à jour avec succès"
                ));

            } catch (Exception e) {
                return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
            }
        }
    }

}
