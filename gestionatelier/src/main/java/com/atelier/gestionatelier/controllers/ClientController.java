package com.atelier.gestionatelier.controllers;

import com.atelier.gestionatelier.dto.ClientDTO;
import com.atelier.gestionatelier.dto.MesureDTO;
import com.atelier.gestionatelier.dto.MesureItemDTO;
import com.atelier.gestionatelier.dto.ModeleDTO;
import com.atelier.gestionatelier.dto.ModeleListDTO;
import com.atelier.gestionatelier.dto.SyntheseMensuelleDTO;
import com.atelier.gestionatelier.entities.Client;
import com.atelier.gestionatelier.entities.Mesure;
import com.atelier.gestionatelier.entities.Modele;
import com.atelier.gestionatelier.entities.RendezVous;
import com.atelier.gestionatelier.entities.Utilisateur;
import com.atelier.gestionatelier.repositories.ModeleRepository;
import com.atelier.gestionatelier.repositories.RendezVousRepository;
import com.atelier.gestionatelier.security.Role;
import com.atelier.gestionatelier.services.ClientService;
import com.atelier.gestionatelier.services.FileStorageService;
import com.atelier.gestionatelier.services.ModeleService;
import com.atelier.gestionatelier.services.UtilisateurService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/clients")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class ClientController {
    private final ClientService clientService;
    private final UtilisateurService utilisateurService;
    private final ModeleService modeleService;
    private final ModeleRepository modeleRepository;
    private final RendezVousRepository rendezVousRepository;


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
            System.out.println("Habit photo: " + (clientDTO.getHabitPhoto() != null ? clientDTO.getHabitPhoto().getOriginalFilename() : "null"));
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

            LocalDateTime dateRdvAttendue = LocalDateTime.now().plusWeeks(1).withHour(10).withMinute(0).withSecond(0).withNano(0);
            Optional<RendezVous> rendezVousAuto = rendezVousRepository.findTopByClientIdOrderByCreatedAtDesc(clientSauvegarde.getId())
                    .filter(rdv -> rdv.getCreatedAt() != null && rdv.getCreatedAt().isAfter(LocalDateTime.now().minusMinutes(2)))
                    .filter(rdv -> "LIVRAISON DE L'HABIT".equalsIgnoreCase(rdv.getTypeRendezVous()));

            if (rendezVousAuto.isPresent()) {
                RendezVous rdv = rendezVousAuto.get();
                response.put("rendezVousAuto", true);
                response.put("rendezVousAutoType", rdv.getTypeRendezVous());
                response.put("rendezVousAutoDate", rdv.getDateRDV());
                response.put("rendezVousAutoDecale", !dateRdvAttendue.equals(rdv.getDateRDV()));
            } else {
                response.put("rendezVousAuto", false);
            }

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

            if (authentication == null || authentication.getName() == null) {
                System.out.println("❌ Utilisateur non authentifié");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            String email = authentication.getName();
            Utilisateur currentUser = utilisateurService.findByEmail(email);

            List<Client> clients;

            // ✅ Vérifier le rôle de l'utilisateur
            if (Role.TAILLEUR.equals(currentUser.getRole())) {
                // TAILLEUR : voir seulement les clients qui lui sont assignés
                clients = clientService.getClientsByTailleur(currentUser.getId());
                System.out.println("Clients assignés au tailleur " + currentUser.getId() + ": " + clients.size());
            } else if (Role.SUPERADMIN.equals(currentUser.getRole()) || Role.PROPRIETAIRE.equals(currentUser.getRole()) || Role.SECRETAIRE.equals(currentUser.getRole())) {
                // SUPERADMIN, PROPRIETAIRE, SECRETAIRE : voir tous les clients de leur atelier
                if (currentUser.getAtelier() != null) {
                    clients = clientService.getClientsByAtelier(currentUser.getAtelier().getId());
                    System.out.println("Clients récupérés pour l'atelier " + currentUser.getAtelier().getId() + ": " + clients.size());
                } else {
                    clients = clientService.getAllClients();
                    System.out.println("Tous les clients récupérés (SUPERADMIN sans atelier): " + clients.size());
                }
            } else {
                // Rôle inconnu : aucun client
                clients = new ArrayList<>();
                System.out.println("Rôle inconnu, aucun client retourné");
            }

            return ResponseEntity.ok(clients);

        } catch (Exception e) {
            System.err.println("Erreur lors de la récupération des clients: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/synthese-mensuelle")
    public ResponseEntity<List<SyntheseMensuelleDTO>> getSyntheseMensuelle(Authentication authentication) {
        try {
            if (authentication == null || authentication.getName() == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            Utilisateur currentUser = utilisateurService.findByEmail(authentication.getName());
            UUID atelierId = currentUser.getAtelier() != null ? currentUser.getAtelier().getId() : null;

            if (atelierId == null) {
                return ResponseEntity.ok(Collections.emptyList());
            }

            return ResponseEntity.ok(clientService.getSyntheseMensuelle(atelierId));
        } catch (Exception e) {
            System.err.println("Erreur lors de la récupération de la synthèse mensuelle: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ✅ CORRECTION : Vérifier que l'utilisateur a accès à ce client
    @GetMapping("/{id}")
    public ResponseEntity<Client> getClientById(@PathVariable UUID id, Authentication authentication) {
        String email = authentication.getName();
        Utilisateur currentUser = utilisateurService.findByEmail(email);

        Optional<Client> clientOpt;

        if (Role.TAILLEUR.equals(currentUser.getRole())) {
            // TAILLEUR : vérifier si le client lui est assigné
            clientOpt = clientService.getClientByIdAndTailleur(id, currentUser.getId());
            System.out.println("Recherche client " + id + " pour le tailleur: " + currentUser.getId());
        } else if (currentUser.getAtelier() != null) {
            // Récupérer le client seulement s'il appartient à l'atelier de l'utilisateur
            clientOpt = clientService.getClientByIdAndAtelier(id, currentUser.getAtelier().getId());
            System.out.println("Recherche client " + id + " pour l'atelier: " + currentUser.getAtelier().getId());
        } else {
            // SUPERADMIN peut voir tous les clients
            clientOpt = clientService.getClientById(id);
            System.out.println("Recherche client " + id + " (SUPERADMIN)");
        }

        clientOpt.ifPresent(this::populateMissingModeleInfo);

        return clientOpt
                .map(ResponseEntity::ok)
                .orElseGet(() -> {
                    System.out.println("Client non trouvé ou accès refusé: " + id);
                    return ResponseEntity.notFound().build();
                });
    }

    @PutMapping("/{id}/infos")
    public ResponseEntity<?> modifierInfosClient(@PathVariable UUID id, @ModelAttribute ClientDTO clientDTO, Authentication authentication) {
        try {
            String email = authentication.getName();
            Utilisateur currentUser = utilisateurService.findByEmail(email);

            Optional<Client> clientOpt;
            if (Role.TAILLEUR.equals(currentUser.getRole())) {
                clientOpt = clientService.getClientByIdAndTailleur(id, currentUser.getId());
            } else if (currentUser.getAtelier() != null) {
                clientOpt = clientService.getClientByIdAndAtelier(id, currentUser.getAtelier().getId());
                clientDTO.setAtelierId(currentUser.getAtelier().getId());
            } else {
                clientOpt = clientService.getClientById(id);
            }

            if (clientOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                        "status", "error",
                        "message", "Client non trouvé ou accès refusé"
                ));
            }

            Client clientModifie = clientService.modifierInfosClient(id, clientDTO);
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", "Informations client mises à jour avec succès",
                    "clientId", clientModifie.getId()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", "error",
                    "message", e.getMessage() != null ? e.getMessage() : "Erreur serveur lors de la modification"
            ));
        }
    }

    private void populateMissingModeleInfo(Client client) {
        if (client.getMesures() == null) {
            return;
        }

        client.getMesures().forEach(mesure -> {
            if ((mesure.getModeleNom() == null || mesure.getModeleNom().trim().isEmpty())
                    && mesure.getModeleReferenceId() != null) {
                modeleRepository.findById(mesure.getModeleReferenceId()).ifPresent(modele -> {
                    mesure.setModeleNom(modele.getNom());
                    if ((mesure.getPhotoPath() == null || mesure.getPhotoPath().trim().isEmpty())
                            && modele.getPhotoPath() != null && !modele.getPhotoPath().trim().isEmpty()) {
                        mesure.setPhotoPath(modele.getPhotoPath());
                    }
                });
            }
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

            // ✅ CORRECTION : Vérifier l'existence du client et les permissions
            Optional<Client> clientOpt;
            if (Role.TAILLEUR.equals(currentUser.getRole())) {
                clientOpt = clientService.getClientByIdAndTailleur(id, currentUser.getId());
            } else if (currentUser.getAtelier() != null) {
                clientOpt = clientService.getClientByIdAndAtelier(id, currentUser.getAtelier().getId());
            } else {
                clientOpt = clientService.getClientById(id);
            }

            if (clientOpt.isEmpty()) {
                System.out.println("❌ Client non trouvé ou accès refusé: " + id);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                        "status", "error",
                        "message", "Client non trouvé ou accès refusé"
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
            System.out.println("Existing_habit_photo: " + clientDTO.getExisting_habit_photo());
            System.out.println("Photo: " + (clientDTO.getPhoto() != null ? clientDTO.getPhoto().getOriginalFilename() : "null"));
            System.out.println("Habit photo: " + (clientDTO.getHabitPhoto() != null ? clientDTO.getHabitPhoto().getOriginalFilename() : "null"));

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
            if (Role.TAILLEUR.equals(currentUser.getRole())) {
                clientOpt = clientService.getClientByIdAndTailleur(id, currentUser.getId());
                System.out.println("Recherche avec filtre tailleur");
            } else if (currentUser.getAtelier() != null) {
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

    @GetMapping("/{clientId}/mesures")
    public ResponseEntity<List<MesureDTO>> getMesuresDeClient(
            @PathVariable UUID clientId,
            Authentication authentication) {
        try {
            String email = authentication.getName();
            Utilisateur currentUser = utilisateurService.findByEmail(email);

            Optional<Client> clientOpt;
            if (Role.TAILLEUR.equals(currentUser.getRole())) {
                clientOpt = clientService.getClientByIdAndTailleur(clientId, currentUser.getId());
            } else if (currentUser.getAtelier() != null) {
                clientOpt = clientService.getClientByIdAndAtelier(clientId, currentUser.getAtelier().getId());
            } else {
                clientOpt = clientService.getClientById(clientId);
            }

            if (clientOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            List<MesureDTO> mesuresDTO = clientOpt.get().getMesures().stream()
                    .map(this::convertMesureToDTO)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(mesuresDTO);
        } catch (Exception e) {
            System.err.println("❌ Erreur récupération mesures: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private MesureDTO convertMesureToDTO(Mesure mesure) {
        MesureDTO dto = new MesureDTO();
        dto.setId(mesure.getId());
        dto.setDateMesure(mesure.getDateMesure());
        dto.setTypeVetement(mesure.getTypeVetement());
        dto.setModeleNom(mesure.getModeleNom());
        dto.setModeleReferenceId(mesure.getModeleReferenceId());
        dto.setPrix(mesure.getPrix());
        dto.setDescription(mesure.getDescription());
        dto.setSexe(mesure.getSexe());
        dto.setPhotoPath(mesure.getPhotoPath());
        dto.setHabitPhotoPath(mesure.getHabitPhotoPath());
        dto.setEpaule(mesure.getEpaule());
        dto.setManche(mesure.getManche());
        dto.setPoitrine(mesure.getPoitrine());
        dto.setTaille(mesure.getTaille());
        dto.setLongueur(mesure.getLongueur());
        dto.setFesse(mesure.getFesse());
        dto.setTourManche(mesure.getTourManche());
        dto.setLongueurPoitrine(mesure.getLongueurPoitrine());
        dto.setLongueurTaille(mesure.getLongueurTaille());
        dto.setLongueurFesse(mesure.getLongueurFesse());
        dto.setLongueurJupe(mesure.getLongueurJupe());
        dto.setCeinture(mesure.getCeinture());
        dto.setLongueurPoitrineRobe(mesure.getLongueurPoitrineRobe());
        dto.setLongueurTailleRobe(mesure.getLongueurTailleRobe());
        dto.setLongueurFesseRobe(mesure.getLongueurFesseRobe());
        dto.setLongueurPantalon(mesure.getLongueurPantalon());
        dto.setCuisse(mesure.getCuisse());
        dto.setCorps(mesure.getCorps());
        return dto;
    }

    @PostMapping("/{clientId}/mesures")
    public ResponseEntity<?> ajouterMesureAClient(
            @PathVariable UUID clientId,
            @RequestParam(value = "modeleNom", required = false) String modeleNom,
            @RequestParam(value = "selectedModelId", required = false) String selectedModelId,
            @RequestParam(value = "sexe", required = false) String sexe,
            @RequestParam(value = "typeVetement", required = false) String typeVetement,
            @RequestParam(value = "prix", required = false) String prix,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam Map<String, String> mesuresParams,
            @RequestParam(value = "photo", required = false) MultipartFile photoFile,
            @RequestParam(value = "habitPhoto", required = false) MultipartFile habitPhotoFile,
            Authentication authentication) {
        try {
            String email = authentication.getName();
            Utilisateur currentUser = utilisateurService.findByEmail(email);

            Optional<Client> clientOpt;
            if (Role.TAILLEUR.equals(currentUser.getRole())) {
                clientOpt = clientService.getClientByIdAndTailleur(clientId, currentUser.getId());
            } else if (currentUser.getAtelier() != null) {
                clientOpt = clientService.getClientByIdAndAtelier(clientId, currentUser.getAtelier().getId());
            } else {
                clientOpt = clientService.getClientById(clientId);
            }

            if (clientOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                        "status", "error",
                        "message", "Client non trouvé ou accès refusé"
                ));
            }

            MesureItemDTO mesureDTO = buildMesureItemDTO(modeleNom, selectedModelId, sexe, typeVetement, prix, description, mesuresParams);
            Mesure nouvelleMesure = clientService.ajouterMesureAClient(clientId, mesureDTO, photoFile, habitPhotoFile);

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", "Modèle ajouté avec succès",
                    "mesureId", nouvelleMesure.getId()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "error",
                    "message", e.getMessage()
            ));
        } catch (Exception e) {
            System.err.println("❌ Erreur ajout mesure: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", "error",
                    "message", e.getMessage()
            ));
        }
    }

    @PutMapping("/{clientId}/mesures/{mesureId}")
    public ResponseEntity<?> modifierMesureDeClient(
            @PathVariable UUID clientId,
            @PathVariable UUID mesureId,
            @RequestParam(value = "modeleNom", required = false) String modeleNom,
            @RequestParam(value = "selectedModelId", required = false) String selectedModelId,
            @RequestParam(value = "sexe", required = false) String sexe,
            @RequestParam(value = "typeVetement", required = false) String typeVetement,
            @RequestParam(value = "prix", required = false) String prix,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam Map<String, String> mesuresParams,
            @RequestParam(value = "photo", required = false) MultipartFile photoFile,
            @RequestParam(value = "habitPhoto", required = false) MultipartFile habitPhotoFile,
            Authentication authentication) {
        try {
            String email = authentication.getName();
            Utilisateur currentUser = utilisateurService.findByEmail(email);

            Optional<Client> clientOpt;
            if (Role.TAILLEUR.equals(currentUser.getRole())) {
                clientOpt = clientService.getClientByIdAndTailleur(clientId, currentUser.getId());
            } else if (currentUser.getAtelier() != null) {
                clientOpt = clientService.getClientByIdAndAtelier(clientId, currentUser.getAtelier().getId());
            } else {
                clientOpt = clientService.getClientById(clientId);
            }

            if (clientOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                        "status", "error",
                        "message", "Client non trouvé ou accès refusé"
                ));
            }

            MesureItemDTO mesureDTO = buildMesureItemDTO(modeleNom, selectedModelId, sexe, typeVetement, prix, description, mesuresParams);
            Mesure mesureModifiee = clientService.modifierMesureDeClient(clientId, mesureId, mesureDTO, photoFile, habitPhotoFile);

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", "Modèle modifié avec succès",
                    "mesureId", mesureModifiee.getId()
            ));
        } catch (IllegalArgumentException | EntityNotFoundException e) {
            HttpStatus status = e instanceof EntityNotFoundException ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
            return ResponseEntity.status(status).body(Map.of(
                    "status", "error",
                    "message", e.getMessage()
            ));
        } catch (Exception e) {
            System.err.println("❌ Erreur modification mesure: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", "error",
                    "message", e.getMessage()
            ));
        }
    }

    @DeleteMapping("/{clientId}/mesures/{mesureId}")
    public ResponseEntity<?> supprimerMesureDeClient(
            @PathVariable UUID clientId,
            @PathVariable UUID mesureId,
            Authentication authentication) {
        try {
            String email = authentication.getName();
            Utilisateur currentUser = utilisateurService.findByEmail(email);

            Optional<Client> clientOpt;
            if (Role.TAILLEUR.equals(currentUser.getRole())) {
                clientOpt = clientService.getClientByIdAndTailleur(clientId, currentUser.getId());
            } else if (currentUser.getAtelier() != null) {
                clientOpt = clientService.getClientByIdAndAtelier(clientId, currentUser.getAtelier().getId());
            } else {
                clientOpt = clientService.getClientById(clientId);
            }

            if (clientOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                        "status", "error",
                        "message", "Client non trouvé ou accès refusé"
                ));
            }

            clientService.supprimerMesureDeClient(clientId, mesureId);
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", "Modèle supprimé avec succès"
            ));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "status", "error",
                    "message", e.getMessage()
            ));
        } catch (Exception e) {
            System.err.println("❌ Erreur suppression mesure: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "status", "error",
                    "message", e.getMessage()
            ));
        }
    }

    private MesureItemDTO buildMesureItemDTO(
            String modeleNom,
            String selectedModelId,
            String sexe,
            String typeVetement,
            String prix,
            String description,
            Map<String, String> mesuresParams) {
        MesureItemDTO mesureDTO = new MesureItemDTO();
        mesureDTO.setModeleNom(modeleNom);
        if (selectedModelId != null && !selectedModelId.isEmpty()) {
            try {
                mesureDTO.setSelectedModelId(UUID.fromString(selectedModelId));
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("ID de modèle invalide");
            }
        }
        mesureDTO.setSexe(sexe);
        mesureDTO.setTypeVetement(typeVetement);
        mesureDTO.setPrix(prix);
        mesureDTO.setDescription(description);
        mesureDTO.setRobe_epaule(mesuresParams.get("robe_epaule"));
        mesureDTO.setRobe_manche(mesuresParams.get("robe_manche"));
        mesureDTO.setRobe_poitrine(mesuresParams.get("robe_poitrine"));
        mesureDTO.setRobe_taille(mesuresParams.get("robe_taille"));
        mesureDTO.setRobe_longueur(mesuresParams.get("robe_longueur"));
        mesureDTO.setRobe_fesse(mesuresParams.get("robe_fesse"));
        mesureDTO.setRobe_tour_manche(mesuresParams.get("robe_tour_manche"));
        mesureDTO.setRobe_longueur_poitrine(mesuresParams.get("robe_longueur_poitrine"));
        mesureDTO.setRobe_longueur_taille(mesuresParams.get("robe_longueur_taille"));
        mesureDTO.setRobe_longueur_fesse(mesuresParams.get("robe_longueur_fesse"));
        mesureDTO.setJupe_epaule(mesuresParams.get("jupe_epaule"));
        mesureDTO.setJupe_manche(mesuresParams.get("jupe_manche"));
        mesureDTO.setJupe_poitrine(mesuresParams.get("jupe_poitrine"));
        mesureDTO.setJupe_taille(mesuresParams.get("jupe_taille"));
        mesureDTO.setJupe_longueur(mesuresParams.get("jupe_longueur"));
        mesureDTO.setJupe_longueur_jupe(mesuresParams.get("jupe_longueur_jupe"));
        mesureDTO.setJupe_ceinture(mesuresParams.get("jupe_ceinture"));
        mesureDTO.setJupe_fesse(mesuresParams.get("jupe_fesse"));
        mesureDTO.setJupe_tour_manche(mesuresParams.get("jupe_tour_manche"));
        mesureDTO.setJupe_longueur_poitrine(mesuresParams.get("jupe_longueur_poitrine"));
        mesureDTO.setJupe_longueur_taille(mesuresParams.get("jupe_longueur_taille"));
        mesureDTO.setJupe_longueur_fesse(mesuresParams.get("jupe_longueur_fesse"));
        mesureDTO.setHomme_epaule(mesuresParams.get("homme_epaule"));
        mesureDTO.setHomme_manche(mesuresParams.get("homme_manche"));
        mesureDTO.setHomme_longueur(mesuresParams.get("homme_longueur"));
        mesureDTO.setHomme_longueur_pantalon(mesuresParams.get("homme_longueur_pantalon"));
        mesureDTO.setHomme_ceinture(mesuresParams.get("homme_ceinture"));
        mesureDTO.setHomme_cuisse(mesuresParams.get("homme_cuisse"));
        mesureDTO.setHomme_poitrine(mesuresParams.get("homme_poitrine"));
        mesureDTO.setHomme_corps(mesuresParams.get("homme_corps"));
        mesureDTO.setHomme_tour_manche(mesuresParams.get("homme_tour_manche"));
        return mesureDTO;
    }

    private String validerClientDTO(ClientDTO dto) {
        // Champs obligatoires
        if (dto.getNom() == null || dto.getNom().isBlank())
            return "Le nom est obligatoire";
        if (dto.getPrenom() == null || dto.getPrenom().isBlank())
            return "Le prénom est obligatoire";
        if (dto.getSexe() == null || dto.getSexe().isBlank())
            return "Le sexe est obligatoire";
        if (dto.getContact() == null || !dto.getContact().matches("\\d{8}"))
            return "Le contact doit contenir exactement 8 chiffres";

        if (dto.getMesuresJson() != null && !dto.getMesuresJson().isBlank()) {
            List<MesureItemDTO> items;
            try {
                ObjectMapper mapper = new ObjectMapper();
                items = Arrays.asList(mapper.readValue(dto.getMesuresJson(), MesureItemDTO[].class));
            } catch (Exception e) {
                return "Impossible de lire la liste des modèles";
            }

            if (items.isEmpty()) {
                return "Au moins un vêtement doit être ajouté au client";
            }
            return null;
        }

        // Le prix est désormais optionnel à la création.
        if (dto.getPrix() != null && !dto.getPrix().isBlank()) {
            try {
                Double prix = Double.parseDouble(dto.getPrix().trim());
                if (prix <= 0) {
                    return "Le prix doit être supérieur à 0";
                }
            } catch (NumberFormatException e) {
                return "Le prix doit être un nombre valide";
            }
        }

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
