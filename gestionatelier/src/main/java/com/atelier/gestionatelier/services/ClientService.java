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
        Client client = new Client();
        client.setNom(dto.getNom());
        client.setPrenom(dto.getPrenom());
        client.setContact(dto.getContact());
        client.setAdresse(dto.getAdresse());

        // Lien vers l'atelier (si fourni)
         if (dto.getAtelierId() != null) {
            Atelier atelier = new Atelier();
            atelier.setId(dto.getAtelierId());
            client.setAtelier(atelier);
        } else {
            client.setAtelier(null); // ou ne rien faire, par défaut ce sera null
        }

        Client clientSauvegarde = clientRepository.save(client);
        Mesure mesure = new Mesure();
        mesure.setClient(clientSauvegarde);
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
            mesure.setEpaule(toDouble(dto.getJupe_epaule()));                // si tu mesures l’épaule pour jupe
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
            // pour l’homme, "ceinture" est l’équivalent de la taille : on remplit les deux si tu veux
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

                // mesure.setPhotoPath("/model_photo/" + uniqueFileName);
                mesure.setPhotoPath(uniqueFileName);

            } catch (IOException e) {
                e.printStackTrace();
                throw new RuntimeException("Erreur lors de l'upload de la photo");
            }
        } else {
            System.out.println("Aucune photo reçue ou fichier vide");
            mesure.setPhotoPath(null);
        }


        mesureRepository.save(mesure);

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

    public List<Client> getAllClients() {
        return clientRepository.findAll();
    }
    
    public Optional<Client> getClientById(UUID id) {
        return clientRepository.findById(id);
    }
    public Client modifierClient(UUID id, ClientDTO dto) {
        // 1. Récupérer le client existant
        Client client = clientRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Client non trouvé"));

        // 2. Mettre à jour les informations de base
        client.setNom(dto.getNom());
        client.setPrenom(dto.getPrenom());
        client.setContact(dto.getContact());
        client.setAdresse(dto.getAdresse());

        // 3. Gestion de l'atelier
        if (dto.getAtelierId() != null) {
            Atelier atelier = atelierRepository.findById(dto.getAtelierId())
                .orElseThrow(() -> new EntityNotFoundException("Atelier non trouvé"));
            client.setAtelier(atelier);
        } else {
            client.setAtelier(null);
        }

        // 4. Récupérer ou créer la mesure
        Mesure mesure = client.getMesures().isEmpty() ? new Mesure() : client.getMesures().get(0);
        mesure.setClient(client);
        mesure.setAtelier(client.getAtelier());
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

            } catch (IOException e) {
                throw new RuntimeException("Erreur lors de l'upload de la photo", e);
            }
        } else if (dto.getExisting_photo() == null || dto.getExisting_photo().isEmpty()) {
            // Aucune photo fournie et pas de photo existante spécifiée
            mesure.setPhotoPath(null);
        } else {
            // Conserver la photo existante
            mesure.setPhotoPath(dto.getExisting_photo());
        }

        // 7. Mise à jour des mesures selon le type
        if ("robe".equalsIgnoreCase(type)) {
            updateMesureRobe(mesure, dto);
        } else if ("jupe".equalsIgnoreCase(type)) {
            updateMesureJupe(mesure, dto);
        } else if ("homme".equalsIgnoreCase(type)) {
            updateMesureHomme(mesure, dto);
        }

        // 8. Sauvegarde
        if (client.getMesures().isEmpty()) {
            client.getMesures().add(mesure);
        }

        return clientRepository.save(client);
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
        // 1. Récupérer le client avec ses mesures
        Client client = clientRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Client non trouvé - ID: " + id));

        // 2. Supprimer la photo associée si elle existe
        supprimerPhotoClient(client);

        // 3. Suppression du client (les mesures seront supprimées automatiquement grâce à orphanRemoval=true)
        clientRepository.delete(client);
    }

    private void supprimerPhotoClient(Client client) {
        if (client.getPhoto() != null && !client.getPhoto().isEmpty()) {
            try {
                String uploadDir = "C:/dev/gestionatelier/uploads/model_photo/";
                Path photoPath = Paths.get(uploadDir, client.getPhoto());

                boolean deleted = Files.deleteIfExists(photoPath);
                if (deleted) {
                    System.out.println("Photo supprimée: " + photoPath);
                }
            } catch (IOException e) {
                System.err.println("Erreur lors de la suppression de la photo: " + e.getMessage());
            }
        }
    }

    }



