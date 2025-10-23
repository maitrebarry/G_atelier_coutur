package com.atelier.gestionatelier.services;

import com.atelier.gestionatelier.config.FileStorageProperties;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileStorageService {

    private final FileStorageProperties fileStorageProperties;

    public FileStorageService(FileStorageProperties fileStorageProperties) {
        this.fileStorageProperties = fileStorageProperties;
    }

    /**
     * MÉTHODE PRINCIPALE : Sauvegarder un fichier uploadé
     * Utilisation : fileStorageService.storeFile(fichier, "user_photo")
     */
    public String storeFile(MultipartFile file, String subDirectory) throws IOException {
        // 1. Vérifier que le fichier n'est pas vide
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Le fichier est vide");
        }

        // 2. Générer un nom de fichier unique
        String originalFileName = StringUtils.cleanPath(file.getOriginalFilename());
        String fileExtension = getFileExtension(originalFileName);
        String fileName = UUID.randomUUID().toString() + fileExtension;

        // 3. Obtenir le chemin de destination
        String uploadDir = getUploadDirectory(subDirectory);
        Path targetLocation = Paths.get(uploadDir).resolve(fileName);

        // 4. Créer le dossier s'il n'existe pas
        Files.createDirectories(targetLocation.getParent());

        // 5. Copier le fichier vers la destination
        Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

        System.out.println("✅ Fichier sauvegardé: " + targetLocation.toString());

        // 6. Retourner le nom du fichier (sans le chemin)
        return fileName;
    }

    /**
     * Charger un fichier pour l'affichage
     */
    public Resource loadFile(String fileName, String subDirectory) throws FileNotFoundException {
        try {
            String uploadDir = getUploadDirectory(subDirectory);
            Path filePath = Paths.get(uploadDir).resolve(fileName).normalize();
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new FileNotFoundException("Fichier non trouvé: " + fileName);
            }
        } catch (Exception ex) {
            throw new FileNotFoundException("Chemin invalide: " + fileName);
        }
    }

    /**
     * Supprimer un fichier
     */
    public boolean deleteFile(String fileName, String subDirectory) {
        try {
            String uploadDir = getUploadDirectory(subDirectory);
            Path filePath = Paths.get(uploadDir).resolve(fileName).normalize();
            return Files.deleteIfExists(filePath);
        } catch (IOException ex) {
            System.err.println("❌ Erreur suppression fichier: " + ex.getMessage());
            return false;
        }
    }

    /**
     * Vérifier si c'est une image
     */
    public boolean isImageFile(MultipartFile file) {
        String contentType = file.getContentType();
        return contentType != null && contentType.startsWith("image/");
    }

    /**
     * Valider la taille du fichier
     */
    public void validateFileSize(MultipartFile file, long maxSizeInBytes) {
        if (file.getSize() > maxSizeInBytes) {
            throw new IllegalArgumentException(
                    "Fichier trop volumineux. Taille max: " + (maxSizeInBytes / 1024 / 1024) + "MB"
            );
        }
    }

    // ==================== MÉTHODES PRIVÉES ====================

    private String getUploadDirectory(String subDirectory) {
        String baseDir = fileStorageProperties.getDir();

        // S'assurer que le chemin se termine par un séparateur
        if (!baseDir.endsWith("/") && !baseDir.endsWith("\\")) {
            baseDir += "/";
        }

        return baseDir + subDirectory + "/";
    }

    private String getFileExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) {
            return "";
        }
        return fileName.substring(fileName.lastIndexOf("."));
    }
}