

package com.atelier.gestionatelier.services;

import com.atelier.gestionatelier.dto.ClientDTO;
import com.atelier.gestionatelier.dto.ClientRechercheRendezVousDTO;
import com.atelier.gestionatelier.entities.Atelier;
import com.atelier.gestionatelier.entities.Client;
import com.atelier.gestionatelier.entities.Mesure;
import com.atelier.gestionatelier.entities.Modele;
import com.atelier.gestionatelier.repositories.AtelierRepository;
import com.atelier.gestionatelier.repositories.ClientRepository;
import com.atelier.gestionatelier.repositories.MesureRepository;

import com.atelier.gestionatelier.repositories.ModeleRepository;
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
import com.atelier.gestionatelier.dto.ClientAvecMesuresDTO;
import com.atelier.gestionatelier.dto.ClientRechercheRendezVousDTO;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor

public class ClientService {
    private final ClientRepository clientRepository;
    private final MesureRepository mesureRepository;
    private final AtelierRepository atelierRepository;
    private final FileStorageService fileStorageService;
    private final ModeleRepository modeleRepository; // NOUVEAU

    public Client enregistrerClientAvecMesures(ClientDTO dto) {
        System.out.println("=== ENREGISTREMENT CLIENT AVEC MESURES ===");
        System.out.println("Atelier ID reçu: " + dto.getAtelierId());
        System.out.println("Prix reçu: " + dto.getPrix());
        System.out.println("Modèle sélectionné ID: " + dto.getSelectedModelId());
        System.out.println("Nom modèle: " + dto.getModeleNom()); // NOUVEAU

        Client client = new Client();
        client.setNom(dto.getNom());
        client.setPrenom(dto.getPrenom());
        client.setContact(dto.getContact());
        client.setAdresse(dto.getAdresse());
        client.setEmail(dto.getEmail());

        // ✅ Récupérer l'atelier existant
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

        // Créer la mesure
        Mesure mesure = new Mesure();
        mesure.setClient(clientSauvegarde);
        mesure.setAtelier(clientSauvegarde.getAtelier());
        mesure.setDateMesure(LocalDateTime.now());
        mesure.setSexe(dto.getSexe());
        mesure.setDescription(dto.getDescription());

        // === CORRECTION CRITIQUE : GESTION MODÈLE EXISTANT ===
        if (dto.getSelectedModelId() != null) {
            // Récupérer le modèle existant
            Modele modele = modeleRepository.findById(dto.getSelectedModelId())
                    .orElseThrow(() -> new EntityNotFoundException("Modèle non trouvé avec l'ID: " + dto.getSelectedModelId()));

            // ✅ CORRECTION : Stocker TOUS les champs du modèle
            mesure.setModeleReferenceId(modele.getId());
            mesure.setModeleNom(modele.getNom()); // ← Utiliser le nom du modèle, pas du DTO
            System.out.println("✅ Modèle existant sélectionné: " + modele.getNom() + " (ID: " + modele.getId() + ")");

            // ✅ Utiliser la photo du modèle si aucune photo personnelle n'est uploadée
            if ((dto.getPhoto() == null || dto.getPhoto().isEmpty()) && modele.getPhotoPath() != null) {
                mesure.setPhotoPath(modele.getPhotoPath());
                System.out.println("✅ Photo du modèle utilisée: " + modele.getPhotoPath());
            }

            // ✅ OPTIONNEL : Copier le prix du modèle si pas de prix spécifié
            if (dto.getPrixAsDouble() == null && modele.getPrix() != null) {
                mesure.setPrix(modele.getPrix());
                System.out.println("✅ Prix du modèle utilisé: " + modele.getPrix() + " FCFA");
            }
        }

        // === PRIX (si pas déjà défini par le modèle) ===
        if (mesure.getPrix() == null) {
            Double prix = dto.getPrixAsDouble();
            if (prix == null || prix <= 0) {
                throw new IllegalArgumentException("Le prix du modèle est obligatoire et doit être supérieur à 0");
            }
            mesure.setPrix(prix);
            System.out.println("Prix défini manuellement: " + prix + " FCFA");
        }

        // Déterminer le type de vêtement
        String type = (dto.getFemme_type() != null) ? dto.getFemme_type().trim().toLowerCase() : null;
        if (type == null || type.isBlank()) {
            if ("homme".equalsIgnoreCase(dto.getSexe())) type = "homme";
        }
        mesure.setTypeVetement(type);
        System.out.println("Type de vêtement: " + type);

        // === GESTION PHOTO (Modèle existant vs Upload) ===
        MultipartFile photo = dto.getPhoto();
        if (photo != null && !photo.isEmpty()) {
            // Upload d'une photo personnelle (écrase la photo du modèle si elle existe)
            try {
                String uniqueFileName = fileStorageService.storeFile(photo, "model_photo");
                mesure.setPhotoPath(uniqueFileName);
                System.out.println("✅ Photo personnelle sauvegardée: " + uniqueFileName);
            } catch (Exception e) {
                System.err.println("❌ Erreur upload photo personnelle: " + e.getMessage());
                throw new RuntimeException("Erreur lors de l'upload de la photo: " + e.getMessage());
            }
        }

        // Nouvelle photo de l'habit
        MultipartFile habitPhoto = dto.getHabitPhoto();
        if (habitPhoto != null && !habitPhoto.isEmpty()) {
            try {
                String habitFileName = fileStorageService.storeFile(habitPhoto, "habit_photo");
                mesure.setHabitPhotoPath(habitFileName);
                System.out.println("✅ Photo de l'habit sauvegardée: " + habitFileName);
            } catch (Exception e) {
                System.err.println("❌ Erreur upload photo habit: " + e.getMessage());
                throw new RuntimeException("Erreur lors de l'upload de la photo de l'habit: " + e.getMessage());
            }
        }

        // Si pas de photo uploadée et pas de modèle sélectionné avec photo, photoPath reste null
        if (mesure.getPhotoPath() == null) {
            System.out.println("Aucune photo définie (ni upload, ni modèle avec photo)");
        }

        // ====== MAPPINGS PAR TYPE (votre code existant) ======
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

        // Sauvegarder la mesure
        Mesure mesureSauvegardee = mesureRepository.save(mesure);
        System.out.println("Mesure sauvegardée avec ID: " + mesureSauvegardee.getId());
        System.out.println("Atelier de la mesure: " + (mesureSauvegardee.getAtelier() != null ? mesureSauvegardee.getAtelier().getId() : "null"));
        System.out.println("Prix de la mesure: " + mesureSauvegardee.getPrix() + " FCFA");
        System.out.println("Modèle référence ID: " + mesureSauvegardee.getModeleReferenceId());
        System.out.println("Modèle nom: " + mesureSauvegardee.getModeleNom());
        System.out.println("Photo path: " + mesureSauvegardee.getPhotoPath());
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

    // ✅ AJOUT : Récupérer les clients assignés à un tailleur
    public List<Client> getClientsByTailleur(UUID tailleurId) {
        return clientRepository.findByTailleurId(tailleurId);
    }

    // ✅ AJOUT : Récupérer un client assigné à un tailleur
    public Optional<Client> getClientByIdAndTailleur(UUID id, UUID tailleurId) {
        return clientRepository.findByIdAndTailleurId(id, tailleurId);
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
        System.out.println("Prix reçu pour modification: " + dto.getPrix());
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
        client.setEmail(dto.getEmail());

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
        mesure.setDescription(dto.getDescription());
        // === NOUVEAU : GESTION MODÈLE EXISTANT POUR MODIFICATION ===
        if (dto.getSelectedModelId() != null) {
            // Récupérer le modèle existant
            Modele modele = modeleRepository.findById(dto.getSelectedModelId())
                    .orElseThrow(() -> new EntityNotFoundException("Modèle non trouvé avec l'ID: " + dto.getSelectedModelId()));

            // ✅ CORRECTION : Stocker la référence au modèle dans la mesure
            mesure.setModeleReferenceId(modele.getId());
            mesure.setModeleNom(modele.getNom());
            System.out.println("✅ Modèle existant sélectionné pour modification: " + modele.getNom() + " (ID: " + modele.getId() + ")");
        } else {
            // Si aucun modèle n'est sélectionné, effacer les références
            mesure.setModeleReferenceId(null);
            mesure.setModeleNom(null);
            System.out.println("✅ Aucun modèle sélectionné - références effacées");
        }
        // === NOUVEAU : Mettre à jour le prix ===
        Double nouveauPrix = dto.getPrixAsDouble();
        if (nouveauPrix == null || nouveauPrix <= 0) {
            throw new IllegalArgumentException("Le prix du modèle est obligatoire et doit être supérieur à 0");
        }
        mesure.setPrix(nouveauPrix);
        System.out.println("Prix mis à jour: " + nouveauPrix + " FCFA");
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

        // 6. Gestion de la photo AVEC SERVICE GLOBAL
        MultipartFile photo = dto.getPhoto();
        if (photo != null && !photo.isEmpty()) {
            try {
                // Supprimer l'ancienne photo si elle existe
                if (mesure.getPhotoPath() != null) {
                    fileStorageService.deleteFile(mesure.getPhotoPath(), "model_photo");
                    System.out.println("🗑️ Ancienne photo supprimée: " + mesure.getPhotoPath());
                }

                // ✅ UTILISATION DU SERVICE GLOBAL - UNE SEULE LIGNE !
                String uniqueFileName = fileStorageService.storeFile(photo, "model_photo");
                mesure.setPhotoPath(uniqueFileName);
                System.out.println("✅ Nouvelle photo sauvegardée: " + uniqueFileName);

            } catch (Exception e) {
                System.err.println("❌ Erreur upload photo: " + e.getMessage());
                throw new RuntimeException("Erreur lors de l'upload de la photo: " + e.getMessage());
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

        MultipartFile habitPhoto = dto.getHabitPhoto();
        if (habitPhoto != null && !habitPhoto.isEmpty()) {
            try {
                if (mesure.getHabitPhotoPath() != null) {
                    fileStorageService.deleteFile(mesure.getHabitPhotoPath(), "habit_photo");
                    System.out.println("🗑️ Ancienne photo habit supprimée: " + mesure.getHabitPhotoPath());
                }
                String habitFileName = fileStorageService.storeFile(habitPhoto, "habit_photo");
                mesure.setHabitPhotoPath(habitFileName);
                System.out.println("✅ Nouvelle photo habit sauvegardée: " + habitFileName);
            } catch (Exception e) {
                System.err.println("❌ Erreur upload photo habit: " + e.getMessage());
                throw new RuntimeException("Erreur lors de l'upload de la photo de l'habit: " + e.getMessage());
            }
        } else if (dto.getExisting_habit_photo() != null && !dto.getExisting_habit_photo().isBlank()) {
            mesure.setHabitPhotoPath(dto.getExisting_habit_photo());
            System.out.println("Photo habit existante conservée: " + dto.getExisting_habit_photo());
        } else {
            mesure.setHabitPhotoPath(null);
            System.out.println("Aucune photo habit définie");
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

        // 2. ✅ CORRECTION : Supprimer les photos des MESURES avec SERVICE GLOBAL
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

    // ✅ NOUVELLE MÉTHODE : Supprimer les photos des mesures avec SERVICE GLOBAL
    private void supprimerPhotosMesures(Client client) {
        if (client.getMesures() != null) {
            for (Mesure mesure : client.getMesures()) {
                if (mesure.getPhotoPath() != null && !mesure.getPhotoPath().isEmpty()) {
                    try {
                        // ✅ UTILISATION DU SERVICE GLOBAL - UNE SEULE LIGNE !
                        boolean deleted = fileStorageService.deleteFile(mesure.getPhotoPath(), "model_photo");
                        if (deleted) {
                            System.out.println("✅ Photo de mesure supprimée: " + mesure.getPhotoPath());
                        } else {
                            System.out.println("⚠️ Photo de mesure non trouvée: " + mesure.getPhotoPath());
                        }
                    } catch (Exception e) {
                        System.err.println("❌ Erreur suppression photo mesure: " + e.getMessage());
                    }
                }
            }
        }
    }
    // ✅ MÉTHODE AMÉLIORÉE : Supprimer la photo du client avec SERVICE GLOBAL
    private void supprimerPhotoClient(Client client) {
        if (client.getPhoto() != null && !client.getPhoto().isEmpty()) {
            try {
                // ✅ UTILISATION DU SERVICE GLOBAL - UNE SEULE LIGNE !
                boolean deleted = fileStorageService.deleteFile(client.getPhoto(), "model_photo");
                if (deleted) {
                    System.out.println("✅ Photo du client supprimée: " + client.getPhoto());
                } else {
                    System.out.println("⚠️ Photo du client non trouvée: " + client.getPhoto());
                }
            } catch (Exception e) {
                System.err.println("❌ Erreur suppression photo client: " + e.getMessage());
            }
        }
    }

    // === MÉTHODES POUR LES RENDEZ-VOUS ===
    public List<ClientRechercheRendezVousDTO> getClientsPourRendezVous(UUID atelierId) {
        List<Client> clients = clientRepository.findByAtelierId(atelierId);

        return clients.stream().map(client -> {
            ClientRechercheRendezVousDTO dto = new ClientRechercheRendezVousDTO();
            dto.setId(client.getId());
            dto.setNom(client.getNom());
            dto.setPrenom(client.getPrenom());
            dto.setContact(client.getContact());
            dto.setAdresse(client.getAdresse()); // ✅ Email pour notifications
            dto.setPhoto(client.getPhoto());
            dto.setDateCreation(client.getDateCreation());

            // Dernière mesure
            if (!client.getMesures().isEmpty()) {
                Mesure derniereMesure = client.getMesures().get(client.getMesures().size() - 1);
                ClientRechercheRendezVousDTO.MesureResumeDTO mesureResume = new ClientRechercheRendezVousDTO.MesureResumeDTO();
                mesureResume.setId(derniereMesure.getId());
                mesureResume.setDateMesure(derniereMesure.getDateMesure());
                mesureResume.setTypeVetement(derniereMesure.getTypeVetement());
                mesureResume.setPrix(derniereMesure.getPrix());
                mesureResume.setSexe(derniereMesure.getSexe());
                dto.setDerniereMesure(mesureResume);
            }

            // Compter les "modèles" (mesures avec prix)
            dto.setNombreModelesEnCours((int) client.getMesures().stream()
                    .filter(m -> m.getPrix() != null && m.getPrix() > 0)
                    .count());

            return dto;
        }).collect(Collectors.toList());
    }

    public ClientAvecMesuresDTO getClientAvecMesuresPourRendezVous(UUID clientId) {
        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new EntityNotFoundException("Client non trouvé"));

        return toClientAvecMesuresDTO(client);
    }

    private ClientAvecMesuresDTO toClientAvecMesuresDTO(Client client) {
        ClientAvecMesuresDTO dto = new ClientAvecMesuresDTO();
        dto.setId(client.getId());
        dto.setNom(client.getNom());
        dto.setPrenom(client.getPrenom());
        dto.setContact(client.getContact());
        dto.setAdresse(client.getAdresse());
        dto.setPhoto(client.getPhoto());
        dto.setDateCreation(client.getDateCreation());

        // Convertir les mesures
        List<ClientAvecMesuresDTO.MesureDTO> mesureDTOs = client.getMesures().stream()
                .map(this::toMesureDTO)
                .collect(Collectors.toList());
        dto.setMesures(mesureDTOs);

        return dto;
    }

    private ClientAvecMesuresDTO.MesureDTO toMesureDTO(Mesure mesure) {
        ClientAvecMesuresDTO.MesureDTO dto = new ClientAvecMesuresDTO.MesureDTO();
        dto.setId(mesure.getId());
        dto.setDateMesure(mesure.getDateMesure());
        dto.setTypeVetement(mesure.getTypeVetement());
        dto.setPrix(mesure.getPrix());
        dto.setDescription(mesure.getDescription());
        dto.setSexe(mesure.getSexe());
        dto.setPhotoPath(mesure.getPhotoPath());
        dto.setHabitPhotoPath(mesure.getHabitPhotoPath());

        // Mesures communes
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

        // Mesures spécifiques
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

    }





