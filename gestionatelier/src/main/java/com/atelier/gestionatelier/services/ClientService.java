

package com.atelier.gestionatelier.services;

import com.atelier.gestionatelier.dto.ClientDTO;
import com.atelier.gestionatelier.dto.ClientAvecMesuresDTO;
import com.atelier.gestionatelier.dto.ClientRechercheRendezVousDTO;
import com.atelier.gestionatelier.dto.CreateRendezVousDTO;
import com.atelier.gestionatelier.entities.Affectation;
import com.atelier.gestionatelier.dto.MesureItemDTO;
import com.atelier.gestionatelier.dto.SyntheseMensuelleDTO;
import com.atelier.gestionatelier.entities.Atelier;
import com.atelier.gestionatelier.entities.Client;
import com.atelier.gestionatelier.entities.Mesure;
import com.atelier.gestionatelier.entities.Modele;
import com.atelier.gestionatelier.entities.RendezVous;
import com.atelier.gestionatelier.repositories.AffectationRepository;
import com.atelier.gestionatelier.repositories.AtelierRepository;
import com.atelier.gestionatelier.repositories.ClientRepository;
import com.atelier.gestionatelier.repositories.MesureRepository;
import com.atelier.gestionatelier.repositories.ModeleRepository;
import com.atelier.gestionatelier.repositories.RendezVousRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.time.LocalDateTime;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor

public class ClientService {
    private final ClientRepository clientRepository;
    private final MesureRepository mesureRepository;
    private final AtelierRepository atelierRepository;
    private final FileStorageService fileStorageService;
    private final ModeleRepository modeleRepository; // NOUVEAU
    private final RendezVousService rendezVousService;
    private final AffectationRepository affectationRepository;
    private final RendezVousRepository rendezVousRepository;

    public Client enregistrerClientAvecMesures(ClientDTO dto) {
        System.out.println("=== ENREGISTREMENT CLIENT AVEC MESURES ===");
        System.out.println("Atelier ID reçu: " + dto.getAtelierId());
        System.out.println("Modèles reçus JSON: " + dto.getMesuresJson());

        Client client = new Client();
        client.setNom(dto.getNom());
        client.setPrenom(dto.getPrenom());
        client.setContact(dto.getContact());
        client.setAdresse(dto.getAdresse());
        client.setEmail(dto.getEmail());

        if (dto.getAtelierId() != null) {
            Atelier atelier = atelierRepository.findById(dto.getAtelierId())
                    .orElseThrow(() -> new EntityNotFoundException("Atelier non trouvé avec l'ID: " + dto.getAtelierId()));
            client.setAtelier(atelier);
            System.out.println("Atelier associé: " + atelier.getNom() + " (ID: " + atelier.getId() + ")");
        } else {
            client.setAtelier(null);
            System.out.println("Aucun atelier associé");
        }

        Client clientSauvegarde = clientRepository.save(client);
        System.out.println("Client sauvegardé avec ID: " + clientSauvegarde.getId());

        if (clientSauvegarde.getMesures() == null) {
            clientSauvegarde.setMesures(new ArrayList<>());
        }

                List<MesureItemDTO> mesureItems = parseMesureItems(dto);
        List<MultipartFile> photoFiles = dto.getPhotos() != null ? Arrays.asList(dto.getPhotos()) : new ArrayList<>();
        List<MultipartFile> habitFiles = dto.getHabitPhotos() != null ? Arrays.asList(dto.getHabitPhotos()) : new ArrayList<>();
        List<MultipartFile> audioFiles = dto.getAudios() != null ? Arrays.asList(dto.getAudios()) : new ArrayList<>();

        if (mesureItems != null && !mesureItems.isEmpty()) {
            for (MesureItemDTO item : mesureItems) {
                Mesure mesure = createMesureFromItem(item, clientSauvegarde, photoFiles, habitFiles, audioFiles);
                clientSauvegarde.getMesures().add(mesure);
            }
        } else {
            Mesure mesure = createMesureFromDto(dto);
            if (mesure != null) {
                mesure.setClient(clientSauvegarde);
                mesure.setAtelier(clientSauvegarde.getAtelier());
                clientSauvegarde.getMesures().add(mesure);
            }
        }

        Client clientFinal = clientRepository.save(clientSauvegarde);

        if (clientFinal.getAtelier() != null && clientFinal.getMesures() != null && !clientFinal.getMesures().isEmpty()) {
            try {
                CreateRendezVousDTO rdvDTO = new CreateRendezVousDTO();
                rdvDTO.setDateRDV(LocalDateTime.now().plusWeeks(1).withHour(10).withMinute(0).withSecond(0).withNano(0));
                rdvDTO.setTypeRendezVous("LIVRAISON DE L'HABIT");
                rdvDTO.setNotes("Rendez-vous automatique pour la récupération de l'habit déjà cousu.");
                rdvDTO.setClientId(clientFinal.getId());
                rdvDTO.setAtelierId(clientFinal.getAtelier().getId());
                rendezVousService.creerRendezVousAuto(rdvDTO);
            } catch (Exception e) {
                System.err.println("⚠️ Impossible de créer le rendez-vous automatique : " + e.getMessage());
            }
        }

        System.out.println("=== FIN ENREGISTREMENT ===");
        return clientFinal;
    }

    private List<MesureItemDTO> parseMesureItems(ClientDTO dto) {
        if (dto.getMesuresJson() == null || dto.getMesuresJson().isBlank()) {
            return null;
        }
        try {
            ObjectMapper mapper = new ObjectMapper();
            MesureItemDTO[] items = mapper.readValue(dto.getMesuresJson(), MesureItemDTO[].class);
            return Arrays.asList(items);
        } catch (Exception e) {
            throw new RuntimeException("Impossible de parser les mesures JSON: " + e.getMessage(), e);
        }
    }

    private Mesure createMesureFromItem(MesureItemDTO item, Client client, List<MultipartFile> photoFiles, List<MultipartFile> habitFiles, List<MultipartFile> audioFiles) {
        if (item == null) {
            throw new IllegalArgumentException("Le modèle est invalide");
        }

        Mesure mesure = new Mesure();
        mesure.setClient(client);
        mesure.setAtelier(client.getAtelier());
        mesure.setDateMesure(LocalDateTime.now());
        mesure.setSexe(item.getSexe());
        mesure.setDescription(item.getDescription());
        mesure.setTypeVetement(item.getTypeVetement() != null ? item.getTypeVetement().trim().toLowerCase() : null);

        Double prix = parsePrix(item.getPrix());
        if (prix != null && prix <= 0) {
            throw new IllegalArgumentException("Le prix doit être supérieur à 0 lorsqu'il est renseigné");
        }
        mesure.setPrix(prix);

        if (item.getSelectedModelId() != null) {
            Modele modele = modeleRepository.findById(item.getSelectedModelId())
                    .orElseThrow(() -> new EntityNotFoundException("Modèle non trouvé avec l'ID: " + item.getSelectedModelId()));
            mesure.setModeleReferenceId(modele.getId());
            mesure.setModeleNom(modele.getNom());
            if ((item.getPhotoIndex() < 0 || item.getPhotoIndex() >= photoFiles.size()) && modele.getPhotoPath() != null) {
                mesure.setPhotoPath(modele.getPhotoPath());
            }
            System.out.println("Modèle existant sélectionné: " + modele.getNom());
        }

        if (item.getPhotoIndex() >= 0 && item.getPhotoIndex() < photoFiles.size()) {
            MultipartFile photo = photoFiles.get(item.getPhotoIndex());
            if (photo != null && !photo.isEmpty()) {
                try {
                    String uniqueFileName = fileStorageService.storeFile(photo, "model_photo");
                    mesure.setPhotoPath(uniqueFileName);
                    System.out.println("Photo personnalisée sauvegardée pour le modèle: " + uniqueFileName);
                } catch (Exception e) {
                    throw new RuntimeException("Erreur lors de l'upload de la photo du modèle", e);
                }
            }
        }

        if (item.getHabitPhotoIndex() >= 0 && item.getHabitPhotoIndex() < habitFiles.size()) {
            MultipartFile habitPhoto = habitFiles.get(item.getHabitPhotoIndex());
            if (habitPhoto != null && !habitPhoto.isEmpty()) {
                try {
                    String habitFileName = fileStorageService.storeFile(habitPhoto, "habit_photo");
                    mesure.setHabitPhotoPath(habitFileName);
                    System.out.println("Photo de l'habit sauvegardée pour le modèle: " + habitFileName);
                } catch (Exception e) {
                    throw new RuntimeException("Erreur lors de l'upload de la photo de l'habit", e);
                }
            }
        }

        if (item.getAudioIndex() >= 0 && item.getAudioIndex() < audioFiles.size()) {
            MultipartFile audioFile = audioFiles.get(item.getAudioIndex());
            if (audioFile != null && !audioFile.isEmpty()) {
                try {
                    String audioFileName = fileStorageService.storeFile(audioFile, "audio_descriptions");
                    mesure.setAudioDescriptionPath(audioFileName);
                    System.out.println("Audio description sauvegardée pour le modèle: " + audioFileName);
                } catch (Exception e) {
                    throw new RuntimeException("Erreur lors de l'upload de l'audio description", e);
                }
            }
        }

        fillMesureFromItem(mesure, item);
        return mesureRepository.save(mesure);
    }

    private Double parsePrix(String prix) {
        if (prix == null || prix.trim().isEmpty()) {
            return null;
        }
        try {
            return Double.parseDouble(prix.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Mesure createMesureFromDto(ClientDTO dto) {
        Mesure mesure = new Mesure();
        mesure.setDateMesure(LocalDateTime.now());
        mesure.setSexe(dto.getSexe());
        mesure.setDescription(dto.getDescription());

        if (dto.getSelectedModelId() != null) {
            Modele modele = modeleRepository.findById(dto.getSelectedModelId())
                    .orElseThrow(() -> new EntityNotFoundException("Modèle non trouvé avec l'ID: " + dto.getSelectedModelId()));
            mesure.setModeleReferenceId(modele.getId());
            mesure.setModeleNom(modele.getNom());
            if ((dto.getPhoto() == null || dto.getPhoto().isEmpty()) && modele.getPhotoPath() != null) {
                mesure.setPhotoPath(modele.getPhotoPath());
            }
            if (dto.getPrixAsDouble() == null && modele.getPrix() != null) {
                mesure.setPrix(modele.getPrix());
            }
        }

        if (mesure.getPrix() == null) {
            Double prix = dto.getPrixAsDouble();
            if (prix != null && prix <= 0) {
                throw new IllegalArgumentException("Le prix du modèle doit être supérieur à 0");
            }
            mesure.setPrix(prix);
        }

        String type = (dto.getFemme_type() != null) ? dto.getFemme_type().trim().toLowerCase() : null;
        if (type == null || type.isBlank()) {
            if ("homme".equalsIgnoreCase(dto.getSexe())) type = "homme";
        }
        mesure.setTypeVetement(type);

        MultipartFile photo = dto.getPhoto();
        if (photo != null && !photo.isEmpty()) {
            try {
                String uniqueFileName = fileStorageService.storeFile(photo, "model_photo");
                mesure.setPhotoPath(uniqueFileName);
            } catch (Exception e) {
                throw new RuntimeException("Erreur lors de l'upload de la photo du modèle", e);
            }
        }

        MultipartFile habitPhoto = dto.getHabitPhoto();
        if (habitPhoto != null && !habitPhoto.isEmpty()) {
            try {
                String habitFileName = fileStorageService.storeFile(habitPhoto, "habit_photo");
                mesure.setHabitPhotoPath(habitFileName);
            } catch (Exception e) {
                throw new RuntimeException("Erreur lors de l'upload de la photo de l'habit", e);
            }
        }

        fillMesureFromDto(mesure, dto);
        return mesureRepository.save(mesure);
    }

    private void fillMesureFromItem(Mesure mesure, MesureItemDTO item) {
        if (item == null) {
            return;
        }
        if ("robe".equalsIgnoreCase(item.getTypeVetement())) {
            mesure.setEpaule(toDouble(item.getRobe_epaule()));
            mesure.setManche(toDouble(item.getRobe_manche()));
            mesure.setPoitrine(toDouble(item.getRobe_poitrine()));
            mesure.setTaille(toDouble(item.getRobe_taille()));
            mesure.setLongueur(toDouble(item.getRobe_longueur()));
            mesure.setFesse(toDouble(item.getRobe_fesse()));
            mesure.setTourManche(toDouble(item.getRobe_tour_manche()));
            mesure.setLongueurPoitrine(toDouble(item.getRobe_longueur_poitrine()));
            mesure.setLongueurTaille(toDouble(item.getRobe_longueur_taille()));
            mesure.setLongueurFesse(toDouble(item.getRobe_longueur_fesse()));
            mesure.setLongueurPoitrineRobe(toDouble(item.getRobe_longueur_poitrine()));
            mesure.setLongueurTailleRobe(toDouble(item.getRobe_longueur_taille()));
            mesure.setLongueurFesseRobe(toDouble(item.getRobe_longueur_fesse()));
        } else if ("jupe".equalsIgnoreCase(item.getTypeVetement())) {
            mesure.setEpaule(toDouble(item.getJupe_epaule()));
            mesure.setManche(toDouble(item.getJupe_manche()));
            mesure.setPoitrine(toDouble(item.getJupe_poitrine()));
            mesure.setTaille(toDouble(item.getJupe_taille()));
            mesure.setLongueur(toDouble(item.getJupe_longueur()));
            mesure.setFesse(toDouble(item.getJupe_fesse()));
            mesure.setTourManche(toDouble(item.getJupe_tour_manche()));
            mesure.setLongueurPoitrine(toDouble(item.getJupe_longueur_poitrine()));
            mesure.setLongueurTaille(toDouble(item.getJupe_longueur_taille()));
            mesure.setLongueurFesse(toDouble(item.getJupe_longueur_fesse()));
            mesure.setLongueurJupe(toDouble(item.getJupe_longueur_jupe()));
            mesure.setCeinture(toDouble(item.getJupe_ceinture()));
        } else if ("homme".equalsIgnoreCase(item.getTypeVetement())) {
            mesure.setEpaule(toDouble(item.getHomme_epaule()));
            mesure.setManche(toDouble(item.getHomme_manche()));
            mesure.setLongueur(toDouble(item.getHomme_longueur()));
            mesure.setPoitrine(toDouble(item.getHomme_poitrine()));
            Double ceint = toDouble(item.getHomme_ceinture());
            mesure.setTaille(ceint);
            mesure.setCeinture(ceint);
            mesure.setTourManche(toDouble(item.getHomme_tour_manche()));
            mesure.setLongueurPantalon(toDouble(item.getHomme_longueur_pantalon()));
            mesure.setCuisse(toDouble(item.getHomme_cuisse()));
            mesure.setCorps(toDouble(item.getHomme_corps()));
        }
    }

    private void fillMesureFromDto(Mesure mesure, ClientDTO dto) {
        if (dto == null) {
            return;
        }
        String type = dto.getFemme_type() != null ? dto.getFemme_type().trim().toLowerCase() : null;
        if ("robe".equalsIgnoreCase(type)) {
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
        } else if ("jupe".equalsIgnoreCase(type)) {
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
        } else if ("homme".equalsIgnoreCase(dto.getSexe())) {
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

    public Client modifierInfosClient(UUID id, ClientDTO dto) {
        Client client = clientRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Client non trouvé"));

        client.setNom(dto.getNom());
        client.setPrenom(dto.getPrenom());
        client.setContact(dto.getContact());
        client.setAdresse(dto.getAdresse());
        client.setEmail(dto.getEmail());

        if (dto.getAtelierId() != null) {
            Atelier atelier = atelierRepository.findById(dto.getAtelierId())
                    .orElseThrow(() -> new EntityNotFoundException("Atelier non trouvé"));
            client.setAtelier(atelier);
        }

        return clientRepository.save(client);
    }

    public List<SyntheseMensuelleDTO> getSyntheseMensuelle(UUID atelierId) {
        Map<String, SyntheseMensuelleDTO> syntheseParMois = new LinkedHashMap<>();

        List<Client> clients = clientRepository.findByAtelierIdWithMesures(atelierId);
        for (Client client : clients) {
            if (client.getMesures() == null) {
                continue;
            }

            for (Mesure mesure : client.getMesures()) {
                LocalDateTime dateMesure = mesure.getDateMesure();
                if (dateMesure == null) {
                    continue;
                }
                SyntheseMensuelleDTO synthese = syntheseParMois.computeIfAbsent(
                        buildMonthKey(dateMesure),
                        key -> createSyntheseMensuelle(key, dateMesure)
                );
                synthese.setEntrees(synthese.getEntrees() + 1);
            }
        }

        List<RendezVous> rendezVousLivres = rendezVousRepository.findByAtelierIdOrderByDateRDVDesc(atelierId).stream()
                .filter(rendezVous -> rendezVous.getDateRDV() != null)
                .filter(rendezVous -> "TERMINE".equalsIgnoreCase(rendezVous.getStatut()))
                .filter(rendezVous -> rendezVous.getTypeRendezVous() != null
                        && rendezVous.getTypeRendezVous().toUpperCase(Locale.ROOT).contains("LIVRAISON"))
            .filter(rendezVous -> rendezVous.getMesure() != null)
                .collect(Collectors.toList());

        Map<String, Long> sortiesParMois = rendezVousLivres.stream()
            .collect(Collectors.groupingBy(
                rendezVous -> buildMonthKey(rendezVous.getDateRDV()),
                LinkedHashMap::new,
                Collectors.mapping(rendezVous -> rendezVous.getMesure().getId(), Collectors.collectingAndThen(Collectors.toSet(), mesures -> (long) mesures.size()))
            ));

        for (Map.Entry<String, Long> entry : sortiesParMois.entrySet()) {
            LocalDateTime dateLivraison = rendezVousLivres.stream()
                .filter(rendezVous -> buildMonthKey(rendezVous.getDateRDV()).equals(entry.getKey()))
                .map(RendezVous::getDateRDV)
                .findFirst()
                .orElse(null);
            if (dateLivraison == null) {
                continue;
            }
            SyntheseMensuelleDTO synthese = syntheseParMois.computeIfAbsent(
                entry.getKey(),
                key -> createSyntheseMensuelle(key, dateLivraison)
            );
            synthese.setSorties(entry.getValue().intValue());
        }

        return syntheseParMois.values().stream()
                .sorted((left, right) -> right.getMonthKey().compareTo(left.getMonthKey()))
                .collect(Collectors.toList());
    }

    private String buildMonthKey(LocalDateTime date) {
        return String.format("%d-%02d", date.getYear(), date.getMonthValue());
    }

    private SyntheseMensuelleDTO createSyntheseMensuelle(String monthKey, LocalDateTime date) {
        SyntheseMensuelleDTO dto = new SyntheseMensuelleDTO();
        dto.setMonthKey(monthKey);
        String monthName = date.getMonth().getDisplayName(TextStyle.FULL, Locale.FRANCE);
        dto.setLabel(monthName.substring(0, 1).toUpperCase(Locale.FRANCE) + monthName.substring(1) + " " + date.getYear());
        dto.setEntrees(0);
        dto.setSorties(0);
        return dto;
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
        Mesure mesure;
        if (dto.getSelectedMesureId() != null) {
            mesure = client.getMesures().stream()
                    .filter(m -> dto.getSelectedMesureId().equals(m.getId()))
                    .findFirst()
                    .orElse(null);
            if (mesure == null) {
                mesure = client.getMesures().isEmpty() ? new Mesure() : client.getMesures().get(0);
                System.out.println("⚠️ Mesure sélectionnée introuvable, utilisation du premier modèle existant");
            }
        } else {
            mesure = client.getMesures().isEmpty() ? new Mesure() : client.getMesures().get(0);
        }
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
            // Conserver les références existantes si aucune nouvelle sélection n'est fournie
            System.out.println("✅ Aucun nouveau modèle sélectionné - conservation des références existantes");
        }
        // === NOUVEAU : Mettre à jour le prix ===
        Double nouveauPrix = dto.getPrixAsDouble();
        if (nouveauPrix != null && nouveauPrix <= 0) {
            throw new IllegalArgumentException("Le prix du modèle doit être supérieur à 0");
        }
        mesure.setPrix(nouveauPrix);
        System.out.println("Prix mis à jour: " + (nouveauPrix != null ? nouveauPrix + " FCFA" : "non renseigné"));
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
            dto.setAdresse(client.getAdresse());
            dto.setEmail(client.getEmail()); // ✅ Email pour notifications
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

        java.util.Set<UUID> mesuresDejaLivrees = rendezVousRepository.findByClientIdOrderByDateRDVDesc(client.getId())
            .stream()
            .filter(rendezVous -> "TERMINE".equalsIgnoreCase(rendezVous.getStatut()))
            .filter(rendezVous -> rendezVous.getTypeRendezVous() != null
                && rendezVous.getTypeRendezVous().toUpperCase(Locale.ROOT).contains("LIVRAISON"))
            .map(RendezVous::getMesure)
            .filter(java.util.Objects::nonNull)
            .map(Mesure::getId)
            .collect(Collectors.toSet());

        Map<UUID, Affectation> affectationsParMesure = affectationRepository.findByClientIdOrderByDateCreationDesc(client.getId())
            .stream()
            .filter(affectation -> affectation.getMesure() != null)
            .collect(Collectors.toMap(
                affectation -> affectation.getMesure().getId(),
                affectation -> affectation,
                (existing, replacement) -> existing,
                LinkedHashMap::new
            ));

        // Convertir les mesures
        List<ClientAvecMesuresDTO.MesureDTO> mesureDTOs = client.getMesures().stream()
            .map(mesure -> toMesureDTO(mesure, affectationsParMesure.get(mesure.getId()), mesuresDejaLivrees.contains(mesure.getId())))
                .collect(Collectors.toList());
        dto.setMesures(mesureDTOs);

        return dto;
    }

        private ClientAvecMesuresDTO.MesureDTO toMesureDTO(Mesure mesure, Affectation affectation, boolean dejaLivree) {
        ClientAvecMesuresDTO.MesureDTO dto = new ClientAvecMesuresDTO.MesureDTO();
        dto.setId(mesure.getId());
        dto.setDateMesure(mesure.getDateMesure());
        dto.setTypeVetement(mesure.getTypeVetement());
        dto.setModeleNom(mesure.getModeleNom());
        dto.setPrix(mesure.getPrix());
        dto.setDescription(mesure.getDescription());
        dto.setSexe(mesure.getSexe());
        dto.setPhotoPath(mesure.getPhotoPath());
        dto.setHabitPhotoPath(mesure.getHabitPhotoPath());
        dto.setStatutProduction(getStatutProduction(affectation));
        dto.setPretPourLivraison(isPretPourLivraison(affectation));
        dto.setDejaLivree(dejaLivree);
        dto.setLibelle(buildMesureLibelle(mesure));

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

    private String getStatutProduction(Affectation affectation) {
        if (affectation == null || affectation.getStatut() == null) {
            return "NON_AFFECTE";
        }
        return affectation.getStatut().name();
    }

    private boolean isPretPourLivraison(Affectation affectation) {
        if (affectation == null || affectation.getStatut() == null) {
            return false;
        }
        return affectation.getStatut() == Affectation.StatutAffectation.TERMINE
                || affectation.getStatut() == Affectation.StatutAffectation.VALIDE;
    }

    private String buildMesureLibelle(Mesure mesure) {
        String base = mesure.getModeleNom() != null && !mesure.getModeleNom().isBlank()
                ? mesure.getModeleNom()
                : (mesure.getTypeVetement() != null && !mesure.getTypeVetement().isBlank() ? mesure.getTypeVetement() : "Vêtement");

        if (mesure.getDescription() != null && !mesure.getDescription().isBlank()) {
            return base + " - " + mesure.getDescription();
        }

        return base;
    }

    @Transactional
    public Mesure ajouterMesureAClient(UUID clientId, MesureItemDTO mesureDTO, MultipartFile photoFile, MultipartFile habitPhotoFile, MultipartFile audioFile) {
        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new EntityNotFoundException("Client non trouvé"));

        if (client.getMesures() == null) {
            client.setMesures(new ArrayList<>());
        }

        Mesure mesure = createMesureFromItem(
                mesureDTO,
                client,
                photoFile != null ? List.of(photoFile) : new ArrayList<>(),
                habitPhotoFile != null ? List.of(habitPhotoFile) : new ArrayList<>(),
                audioFile != null ? List.of(audioFile) : new ArrayList<>()
        );
        client.getMesures().add(mesure);
        clientRepository.save(client);
        return mesure;
    }

    @Transactional
    public Mesure modifierMesureDeClient(UUID clientId, UUID mesureId, MesureItemDTO mesureDTO, MultipartFile photoFile, MultipartFile habitPhotoFile, MultipartFile audioFile) {
        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new EntityNotFoundException("Client non trouvé"));

        Mesure mesure = client.getMesures().stream()
                .filter(item -> item.getId().equals(mesureId))
                .findFirst()
                .orElseThrow(() -> new EntityNotFoundException("Mesure non trouvée pour ce client"));

        updateMesureFromItem(mesure, mesureDTO, photoFile, habitPhotoFile, audioFile);
        return mesureRepository.save(mesure);
    }

    @Transactional
    public void supprimerMesureDeClient(UUID clientId, UUID mesureId) {
        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new EntityNotFoundException("Client non trouvé"));

        Mesure mesure = client.getMesures().stream()
                .filter(item -> item.getId().equals(mesureId))
                .findFirst()
                .orElseThrow(() -> new EntityNotFoundException("Mesure non trouvée pour ce client"));

        if (mesure.getPhotoPath() != null && !mesure.getPhotoPath().isBlank()) {
            fileStorageService.deleteFile(mesure.getPhotoPath(), "model_photo");
        }
        if (mesure.getHabitPhotoPath() != null && !mesure.getHabitPhotoPath().isBlank()) {
            fileStorageService.deleteFile(mesure.getHabitPhotoPath(), "habit_photo");
        }

        client.getMesures().remove(mesure);
        mesureRepository.delete(mesure);
        clientRepository.save(client);
    }

    private void updateMesureFromItem(Mesure mesure, MesureItemDTO item, MultipartFile photoFile, MultipartFile habitPhotoFile, MultipartFile audioFile) {
        mesure.setSexe(item.getSexe());
        mesure.setDescription(item.getDescription());
        mesure.setTypeVetement(item.getTypeVetement() != null ? item.getTypeVetement().trim().toLowerCase() : null);

        Double prix = parsePrix(item.getPrix());
        if (prix != null && prix <= 0) {
            throw new IllegalArgumentException("Le prix doit être supérieur à 0 lorsqu'il est renseigné");
        }
        mesure.setPrix(prix);

        if (item.getSelectedModelId() != null) {
            Modele modele = modeleRepository.findById(item.getSelectedModelId())
                    .orElseThrow(() -> new EntityNotFoundException("Modèle non trouvé avec l'ID: " + item.getSelectedModelId()));
            mesure.setModeleReferenceId(modele.getId());
            mesure.setModeleNom(modele.getNom());
            if ((photoFile == null || photoFile.isEmpty()) && modele.getPhotoPath() != null) {
                mesure.setPhotoPath(modele.getPhotoPath());
            }
        } else {
            mesure.setModeleNom(item.getModeleNom());
            mesure.setModeleReferenceId(null);
        }

        if (photoFile != null && !photoFile.isEmpty()) {
            try {
                if (mesure.getPhotoPath() != null && !mesure.getPhotoPath().isBlank()) {
                    fileStorageService.deleteFile(mesure.getPhotoPath(), "model_photo");
                }
                String uniqueFileName = fileStorageService.storeFile(photoFile, "model_photo");
                mesure.setPhotoPath(uniqueFileName);
            } catch (Exception e) {
                throw new RuntimeException("Erreur lors de l'upload de la photo du modèle", e);
            }
        }

        if (habitPhotoFile != null && !habitPhotoFile.isEmpty()) {
            try {
                if (mesure.getHabitPhotoPath() != null && !mesure.getHabitPhotoPath().isBlank()) {
                    fileStorageService.deleteFile(mesure.getHabitPhotoPath(), "habit_photo");
                }
                String habitFileName = fileStorageService.storeFile(habitPhotoFile, "habit_photo");
                mesure.setHabitPhotoPath(habitFileName);
            } catch (Exception e) {
                throw new RuntimeException("Erreur lors de l'upload de la photo de l'habit", e);
            }
        }

        if (audioFile != null && !audioFile.isEmpty()) {
            try {
                if (mesure.getAudioDescriptionPath() != null && !mesure.getAudioDescriptionPath().isBlank()) {
                    fileStorageService.deleteFile(mesure.getAudioDescriptionPath(), "audio_descriptions");
                }
                String audioFileName = fileStorageService.storeFile(audioFile, "audio_descriptions");
                mesure.setAudioDescriptionPath(audioFileName);
            } catch (Exception e) {
                throw new RuntimeException("Erreur lors de l'upload de l'audio description", e);
            }
        }

        fillMesureFromItem(mesure, item);
    }

    }





