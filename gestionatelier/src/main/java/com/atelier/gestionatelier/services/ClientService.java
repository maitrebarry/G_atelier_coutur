

package com.atelier.gestionatelier.services;

import com.atelier.gestionatelier.dto.ClientDTO;
import com.atelier.gestionatelier.entities.Atelier;
import com.atelier.gestionatelier.entities.Client;
import com.atelier.gestionatelier.entities.Mesure;
import com.atelier.gestionatelier.repositories.AtelierRepository;
import com.atelier.gestionatelier.repositories.ClientRepository;
import com.atelier.gestionatelier.repositories.MesureRepository;

import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ClientService {
    private final ClientRepository clientRepository;
    private final MesureRepository mesureRepository;
    private final AtelierRepository atelierRepository;
    public Client enregistrerClientAvecMesures(ClientDTO dto) {
        // Logs de debug
        System.out.println("=== ENREGISTREMENT CLIENT AVEC MESURES ===");
        System.out.println("Atelier ID reçu: " + dto.getAtelierId());

        Client client = new Client();
        client.setNom(dto.getNom());
        client.setPrenom(dto.getPrenom());
        client.setContact(dto.getContact());
        client.setAdresse(dto.getAdresse());

        // ✅ CORRECTION : Récupérer l'atelier existant depuis la base de données
        if (dto.getAtelierId() != null) {
            Atelier atelier = atelierRepository.findById(dto.getAtelierId())
                    .orElseThrow(() -> new EntityNotFoundException("Atelier non trouvé avec l'ID: " + dto.getAtelierId()));
            client.setAtelier(atelier);
            System.out.println("Atelier associé: " + atelier.getNom() + " (ID: " + atelier.getId() + ")");
        } else {
            client.setAtelier(null);
            System.out.println("Aucun atelier associé");
        }

        // Sauvegarder le client
        Client clientSauvegarde = clientRepository.save(client);
        System.out.println("Client sauvegardé avec ID: " + clientSauvegarde.getId());
        System.out.println("Atelier du client: " + (clientSauvegarde.getAtelier() != null ? clientSauvegarde.getAtelier().getId() : "null"));

        // Créer la mesure
        Mesure mesure = new Mesure();
        mesure.setClient(clientSauvegarde);

        // ✅ CORRECTION : Utiliser le même atelier que le client (déjà récupéré depuis la base)
        mesure.setAtelier(clientSauvegarde.getAtelier());

        mesure.setDateMesure(LocalDateTime.now());
        mesure.setSexe(dto.getSexe());

        // Déterminer le type de vêtement
        String type = (dto.getFemme_type() != null) ? dto.getFemme_type().trim().toLowerCase() : null;
        if (type == null || type.isBlank()) {
            // Si non fourni mais sexe=Homme, on force "homme"
            if ("homme".equalsIgnoreCase(dto.getSexe())) type = "homme";
        }
        mesure.setTypeVetement(type);
        System.out.println("Type de vêtement: " + type);

        // ====== MAPPINGS PAR TYPE ======
        if ("robe".equalsIgnoreCase(type)) {
            // génériques
            mesure.setEpaule(toDouble(dto.getRobe_epaule()));
            mesure.setManche(toDouble(dto.getRobe_manche()));
            mesure.setPoitrine(toDouble(dto.getRobe_poitrine()));
            mesure.setTaille(toDouble(dto.getRobe_taille()));
            mesure.setLongueur(toDouble(dto.getRobe_longueur()));
            mesure.setFesse(toDouble(dto.getRobe_fesse()));
            mesure.setTourManche(toDouble(dto.getRobe_tour_manche()));
            mesure.setLongueurPoitrine(toDouble(dto.getRobe_longueur_poitrine()));
            mesure.setLongueurTaille(toDouble(dto.getRobe_longueur_taille()));
            mesure.setLongueurFesse(toDouble(dto.getRobe_longueur_fesse()));
            // spécifiques robe
            mesure.setLongueurPoitrineRobe(toDouble(dto.getRobe_longueur_poitrine()));
            mesure.setLongueurTailleRobe(toDouble(dto.getRobe_longueur_taille()));
            mesure.setLongueurFesseRobe(toDouble(dto.getRobe_longueur_fesse()));

        } else if ("jupe".equalsIgnoreCase(type)) {
            // génériques (on mappe les équivalents "jupe_*" vers les champs communs)
            mesure.setEpaule(toDouble(dto.getJupe_epaule()));                // si tu mesures l'épaule pour jupe
            mesure.setManche(toDouble(dto.getJupe_manche()));                // idem
            mesure.setPoitrine(toDouble(dto.getJupe_poitrine()));            // idem
            mesure.setTaille(toDouble(dto.getJupe_taille()));
            mesure.setLongueur(toDouble(dto.getJupe_longueur()));
            mesure.setFesse(toDouble(dto.getJupe_fesse()));
            mesure.setTourManche(toDouble(dto.getJupe_tour_manche()));
            mesure.setLongueurPoitrine(toDouble(dto.getJupe_longueur_poitrine()));
            mesure.setLongueurTaille(toDouble(dto.getJupe_longueur_taille()));
            mesure.setLongueurFesse(toDouble(dto.getJupe_longueur_fesse()));
            // spécifiques jupe
            mesure.setLongueurJupe(toDouble(dto.getJupe_longueur_jupe()));
            mesure.setCeinture(toDouble(dto.getJupe_ceinture()));

        } else if ("homme".equalsIgnoreCase(type)) {
            // génériques depuis "homme_*"
            mesure.setEpaule(toDouble(dto.getHomme_epaule()));
            mesure.setManche(toDouble(dto.getHomme_manche()));
            mesure.setLongueur(toDouble(dto.getHomme_longueur()));
            mesure.setPoitrine(toDouble(dto.getHomme_poitrine()));
            // pour l'homme, "ceinture" est l'équivalent de la taille : on remplit les deux si tu veux
            Double ceint = toDouble(dto.getHomme_ceinture());
            mesure.setTaille(ceint);
            mesure.setCeinture(ceint);
            mesure.setTourManche(toDouble(dto.getHomme_tour_manche()));
            // spécifiques homme
            mesure.setLongueurPantalon(toDouble(dto.getHomme_longueur_pantalon()));
            mesure.setCuisse(toDouble(dto.getHomme_cuisse()));
            mesure.setCorps(toDouble(dto.getHomme_corps()));
        }

        // Gestion de l'upload photo
        MultipartFile photo = dto.getPhoto();
        if (photo != null && !photo.isEmpty()) {
            System.out.println("Photo reçue : " + photo.getOriginalFilename() + ", taille : " + photo.getSize());
            try {
                String uploadDir = "C:/dev/gestionatelier/uploads/model_photo/";
                File uploadDirFile = new File(uploadDir);
                if (!uploadDirFile.exists()) {
                    uploadDirFile.mkdirs();
                    System.out.println("Création dossier upload");
                }

                String originalFilename = photo.getOriginalFilename();
                String extension = "";
                if (originalFilename != null && originalFilename.contains(".")) {
                    extension = originalFilename.substring(originalFilename.lastIndexOf('.'));
                }
                String uniqueFileName = UUID.randomUUID().toString() + extension;
                Path filePath = Paths.get(uploadDir, uniqueFileName);

                Files.write(filePath, photo.getBytes());
                System.out.println("Photo enregistrée sous : " + filePath.toString());

                mesure.setPhotoPath(uniqueFileName);

            } catch (IOException e) {
                e.printStackTrace();
                throw new RuntimeException("Erreur lors de l'upload de la photo");
            }
        } else {
            System.out.println("Aucune photo reçue ou fichier vide");
            mesure.setPhotoPath(null);
        }

        // Sauvegarder la mesure
        Mesure mesureSauvegardee = mesureRepository.save(mesure);
        System.out.println("Mesure sauvegardée avec ID: " + mesureSauvegardee.getId());
        System.out.println("Atelier de la mesure: " + (mesureSauvegardee.getAtelier() != null ? mesureSauvegardee.getAtelier().getId() : "null"));
        System.out.println("=== FIN ENREGISTREMENT ===");

        return clientSauvegarde;
    }

    private Double toDouble(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        try {
            return Double.parseDouble(value.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
    // ✅ AJOUT : Récupérer les clients par atelier
    public List<Client> getClientsByAtelier(UUID atelierId) {
        return clientRepository.findByAtelierId(atelierId);
    }

    // ✅ AJOUT : Récupérer un client avec vérification d'atelier
    public Optional<Client> getClientByIdAndAtelier(UUID id, UUID atelierId) {
        return clientRepository.findByIdAndAtelierId(id, atelierId);
    }
    public List<Client> getAllClients() {
        return clientRepository.findAll();
    }

    public Optional<Client> getClientById(UUID id) {
        return clientRepository.findById(id);
    }
    public Client modifierClient(UUID id, ClientDTO dto) {
        System.out.println("=== DÉBUT MODIFICATION CLIENT DANS SERVICE ===");

        // 1. Récupérer le client existant
        Client client = clientRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Client non trouvé"));

        System.out.println("Client trouvé: " + client.getNom() + " " + client.getPrenom());
        System.out.println("Atelier actuel du client: " + (client.getAtelier() != null ? client.getAtelier().getId() : "null"));
        System.out.println("Atelier ID dans DTO: " + dto.getAtelierId());

        // 2. Mettre à jour les informations de base
        client.setNom(dto.getNom());
        client.setPrenom(dto.getPrenom());
        client.setContact(dto.getContact());
        client.setAdresse(dto.getAdresse());

        // 3. ✅ CORRECTION CRITIQUE : Gestion de l'atelier - PRÉSERVER l'atelier existant
        if (dto.getAtelierId() != null) {
            // Si un atelier est fourni dans le DTO, l'utiliser
            Atelier atelier = atelierRepository.findById(dto.getAtelierId())
                    .orElseThrow(() -> new EntityNotFoundException("Atelier non trouvé"));
            client.setAtelier(atelier);
            System.out.println("Atelier mis à jour avec: " + atelier.getId());
        } else {
            // ✅ IMPORTANT : Si aucun atelier n'est fourni dans le DTO, NE RIEN FAIRE
            // L'atelier existant est automatiquement préservé
            System.out.println("Aucun atelier fourni dans DTO - préservation de l'atelier existant");
            // ⚠️ NE PAS FAIRE : client.setAtelier(null);
        }

        // 4. Récupérer ou créer la mesure
        Mesure mesure = client.getMesures().isEmpty() ? new Mesure() : client.getMesures().get(0);
        mesure.setClient(client);
        mesure.setAtelier(client.getAtelier()); // ✅ Utiliser l'atelier du client
        mesure.setDateMesure(LocalDateTime.now());
        mesure.setSexe(dto.getSexe());

        // 5. Déterminer le type de vêtement
        String type = null;
        if (dto.getFemme_type() != null) {
            type = dto.getFemme_type().trim().toLowerCase();
        } else if (dto.getFemme_type_edit() != null) {
            type = dto.getFemme_type_edit().trim().toLowerCase();
        }

        if (type == null || type.isBlank()) {
            type = "homme".equalsIgnoreCase(dto.getSexe()) ? "homme" : null;
        }
        mesure.setTypeVetement(type);
        System.out.println("Type de vêtement: " + type);

        // 6. Gestion de la photo
        MultipartFile photo = dto.getPhoto();
        if (photo != null && !photo.isEmpty()) {
            // Nouvelle photo uploadée
            try {
                String uploadDir = "C:/dev/gestionatelier/uploads/model_photo/";
                File uploadDirFile = new File(uploadDir);
                if (!uploadDirFile.exists()) {
                    uploadDirFile.mkdirs();
                }

                String originalFilename = photo.getOriginalFilename();
                String extension = originalFilename != null && originalFilename.contains(".")
                        ? originalFilename.substring(originalFilename.lastIndexOf('.'))
                        : "";
                String uniqueFileName = UUID.randomUUID() + extension;
                Path filePath = Paths.get(uploadDir, uniqueFileName);

                Files.write(filePath, photo.getBytes());
                mesure.setPhotoPath(uniqueFileName);
                System.out.println("Nouvelle photo uploadée: " + uniqueFileName);

            } catch (IOException e) {
                throw new RuntimeException("Erreur lors de l'upload de la photo", e);
            }
        } else if (dto.getExisting_photo() == null || dto.getExisting_photo().isEmpty()) {
            // Aucune photo fournie et pas de photo existante spécifiée
            mesure.setPhotoPath(null);
            System.out.println("Aucune photo définie");
        } else {
            // Conserver la photo existante
            mesure.setPhotoPath(dto.getExisting_photo());
            System.out.println("Photo existante conservée: " + dto.getExisting_photo());
        }

        // 7. Mise à jour des mesures selon le type
        if ("robe".equalsIgnoreCase(type)) {
            updateMesureRobe(mesure, dto);
            System.out.println("Mesures robe mises à jour");
        } else if ("jupe".equalsIgnoreCase(type)) {
            updateMesureJupe(mesure, dto);
            System.out.println("Mesures jupe mises à jour");
        } else if ("homme".equalsIgnoreCase(type)) {
            updateMesureHomme(mesure, dto);
            System.out.println("Mesures homme mises à jour");
        }

        // 8. Sauvegarde
        if (client.getMesures().isEmpty()) {
            client.getMesures().add(mesure);
        }

        Client clientSauvegarde = clientRepository.save(client);

        System.out.println("Client sauvegardé avec ID: " + clientSauvegarde.getId());
        System.out.println("Atelier après modification: " + (clientSauvegarde.getAtelier() != null ? clientSauvegarde.getAtelier().getId() : "null"));
        System.out.println("=== FIN MODIFICATION CLIENT DANS SERVICE - SUCCÈS ===");

        return clientSauvegarde;
    }

    private void updateMesureRobe(Mesure mesure, ClientDTO dto) {
        mesure.setEpaule(toDouble(dto.getRobe_epaule()));
        mesure.setManche(toDouble(dto.getRobe_manche()));
        mesure.setPoitrine(toDouble(dto.getRobe_poitrine()));
        mesure.setTaille(toDouble(dto.getRobe_taille()));
        mesure.setLongueur(toDouble(dto.getRobe_longueur()));
        mesure.setFesse(toDouble(dto.getRobe_fesse()));
        mesure.setTourManche(toDouble(dto.getRobe_tour_manche()));
        mesure.setLongueurPoitrine(toDouble(dto.getRobe_longueur_poitrine()));
        mesure.setLongueurTaille(toDouble(dto.getRobe_longueur_taille()));
        mesure.setLongueurFesse(toDouble(dto.getRobe_longueur_fesse()));
        mesure.setLongueurPoitrineRobe(toDouble(dto.getRobe_longueur_poitrine()));
        mesure.setLongueurTailleRobe(toDouble(dto.getRobe_longueur_taille()));
        mesure.setLongueurFesseRobe(toDouble(dto.getRobe_longueur_fesse()));
    }

    private void updateMesureJupe(Mesure mesure, ClientDTO dto) {
        mesure.setEpaule(toDouble(dto.getJupe_epaule()));
        mesure.setManche(toDouble(dto.getJupe_manche()));
        mesure.setPoitrine(toDouble(dto.getJupe_poitrine()));
        mesure.setTaille(toDouble(dto.getJupe_taille()));
        mesure.setLongueur(toDouble(dto.getJupe_longueur()));
        mesure.setFesse(toDouble(dto.getJupe_fesse()));
        mesure.setTourManche(toDouble(dto.getJupe_tour_manche()));
        mesure.setLongueurPoitrine(toDouble(dto.getJupe_longueur_poitrine()));
        mesure.setLongueurTaille(toDouble(dto.getJupe_longueur_taille()));
        mesure.setLongueurFesse(toDouble(dto.getJupe_longueur_fesse()));
        mesure.setLongueurJupe(toDouble(dto.getJupe_longueur_jupe()));
        mesure.setCeinture(toDouble(dto.getJupe_ceinture()));
    }

    private void updateMesureHomme(Mesure mesure, ClientDTO dto) {
        mesure.setEpaule(toDouble(dto.getHomme_epaule()));
        mesure.setManche(toDouble(dto.getHomme_manche()));
        mesure.setLongueur(toDouble(dto.getHomme_longueur()));
        mesure.setPoitrine(toDouble(dto.getHomme_poitrine()));
        Double ceint = toDouble(dto.getHomme_ceinture());
        mesure.setTaille(ceint);
        mesure.setCeinture(ceint);
        mesure.setTourManche(toDouble(dto.getHomme_tour_manche()));
        mesure.setLongueurPantalon(toDouble(dto.getHomme_longueur_pantalon()));
        mesure.setCuisse(toDouble(dto.getHomme_cuisse()));
        mesure.setCorps(toDouble(dto.getHomme_corps()));
    }

    @Transactional
    public void supprimerClient(UUID id) {
        System.out.println("=== DÉBUT SUPPRESSION CLIENT ===");
        System.out.println("Client ID: " + id);

        // 1. Récupérer le client avec ses mesures
        Client client = clientRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Client non trouvé - ID: " + id));

        System.out.println("Client trouvé: " + client.getNom() + " " + client.getPrenom());
        System.out.println("Nombre de mesures: " + (client.getMesures() != null ? client.getMesures().size() : 0));

        // 2. ✅ CORRECTION : Supprimer les photos des MESURES associées
        supprimerPhotosMesures(client);

        // 3. ✅ CORRECTION : Supprimer d'abord les mesures manuellement (si orphanRemoval ne fonctionne pas)
        if (client.getMesures() != null && !client.getMesures().isEmpty()) {
            System.out.println("Suppression des mesures associées...");
            mesureRepository.deleteAll(client.getMesures());
        }

        // 4. Supprimer la photo du client (si elle existe)
        supprimerPhotoClient(client);

        // 5. Suppression du client
        clientRepository.delete(client);

        System.out.println("=== FIN SUPPRESSION CLIENT - SUCCÈS ===");
    }

    // ✅ NOUVELLE MÉTHODE : Supprimer les photos des mesures
    private void supprimerPhotosMesures(Client client) {
        if (client.getMesures() != null) {
            for (Mesure mesure : client.getMesures()) {
                if (mesure.getPhotoPath() != null && !mesure.getPhotoPath().isEmpty()) {
                    try {
                        String uploadDir = "C:/dev/gestionatelier/uploads/model_photo/";
                        Path photoPath = Paths.get(uploadDir, mesure.getPhotoPath());

                        boolean deleted = Files.deleteIfExists(photoPath);
                        if (deleted) {
                            System.out.println("Photo de mesure supprimée: " + photoPath);
                        } else {
                            System.out.println("Photo de mesure non trouvée: " + photoPath);
                        }
                    } catch (IOException e) {
                        System.err.println("Erreur lors de la suppression de la photo de mesure: " + e.getMessage());
                    }
                }
            }
        }
    }

    // Méthode existante pour la photo du client
    private void supprimerPhotoClient(Client client) {
        if (client.getPhoto() != null && !client.getPhoto().isEmpty()) {
            try {
                String uploadDir = "C:/dev/gestionatelier/uploads/model_photo/";
                Path photoPath = Paths.get(uploadDir, client.getPhoto());

                boolean deleted = Files.deleteIfExists(photoPath);
                if (deleted) {
                    System.out.println("Photo du client supprimée: " + photoPath);
                } else {
                    System.out.println("Photo du client non trouvée: " + photoPath);
                }
            } catch (IOException e) {
                System.err.println("Erreur lors de la suppression de la photo du client: " + e.getMessage());
            }
        }
    }
    }



