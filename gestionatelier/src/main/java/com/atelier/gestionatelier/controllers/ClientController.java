package com.atelier.gestionatelier.controllers;
import com.atelier.gestionatelier.dto.ClientDTO;
import com.atelier.gestionatelier.entities.Client;
import com.atelier.gestionatelier.services.ClientService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController
@RequestMapping("/api/clients")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class ClientController {
    private final ClientService clientService;
    @PostMapping("/ajouter")
    public ResponseEntity<?> ajouterClient(@ModelAttribute ClientDTO clientDTO) {
        try {
            // Validation des champs
            String erreur = validerClientDTO(clientDTO);
            if (erreur != null) {
                Map<String, Object> error = new HashMap<>();
                error.put("status", "error");
                error.put("message", erreur);
                return ResponseEntity.badRequest().body(error);
            }

            // Photo par défaut selon sexe si pas uploadée
            if (clientDTO.getPhoto() == null || clientDTO.getPhoto().isEmpty()) {
                if ("Homme".equalsIgnoreCase(clientDTO.getSexe())) {
                    clientDTO.setGenderPreview("default_homme.jpg");
                } else {
                    clientDTO.setGenderPreview("default_femme.jpg");
                }
            }
            afficherChamps(clientDTO);
            Client clientSauvegarde = clientService.enregistrerClientAvecMesures(clientDTO);

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Client '" + clientSauvegarde.getNom() + "' enregistré avec succès !");
            response.put("clientId", clientSauvegarde.getId());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> error = new HashMap<>();
            error.put("status", "error");
            error.put("message", e.getMessage() != null ? e.getMessage() : "Erreur serveur");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
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
    // Route GET pour récupérer la liste de tous les clients (sans "/clients" en suffixe)
    @GetMapping
    public ResponseEntity<List<Client>> getAllClients() {
        List<Client> clients = clientService.getAllClients();
        
        // Affichage dans le terminal pour debug
        clients.forEach(c -> System.out.println(c.getNom() + " " + c.getPrenom()));

        return ResponseEntity.ok(clients);
    }
    @GetMapping("/{id}")
    public ResponseEntity<Client> getClientById(@PathVariable UUID id) {
        Optional<Client> client = clientService.getClientById(id);
        return client
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }
   
    @PutMapping("/{id}")
    public ResponseEntity<?> modifierClient(@PathVariable UUID id, @ModelAttribute ClientDTO clientDTO) {
        try {
            // Validation des données
            String erreur = validerClientDTO(clientDTO);
            if (erreur != null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "status", "error",
                    "message", erreur
                ));
            }

            // Vérifier l'existence du client
            Optional<Client> clientOpt = clientService.getClientById(id);
            if (clientOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "status", "error",
                    "message", "Client non trouvé"
                ));
            }

            // Mise à jour du client
            Client clientModifie = clientService.modifierClient(id, clientDTO);

            return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Client '" + clientModifie.getNom() + "' modifié avec succès !",
                "clientId", clientModifie.getId()
            ));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "status", "error",
                "message", e.getMessage() != null ? e.getMessage() : "Erreur serveur"
            ));
        }
    }
   
    @DeleteMapping("/{id}")
    public ResponseEntity<?> supprimerClient(@PathVariable UUID id) {
        try {
            clientService.supprimerClient(id);
            return ResponseEntity.ok().body(Map.of(
                "status", "success",
                "message", "Client et ses mesures supprimés avec succès"
            ));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "status", "error",
                "message", e.getMessage()
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "status", "error",
                "message", "Erreur lors de la suppression: " + e.getMessage()
            ));
        }
    }
}
