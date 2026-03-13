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
import java.util.regex.Pattern;

@Service
public class FileStorageService {

    private static final Pattern SAFE_SUBDIRECTORY = Pattern.compile("[a-zA-Z0-9_-]+");

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
        Path uploadDir = getUploadDirectoryPath(subDirectory);
        Files.createDirectories(uploadDir);

        Path targetLocation = uploadDir.resolve(fileName).normalize();
        if (!targetLocation.startsWith(uploadDir)) {
            throw new IllegalArgumentException("Chemin de destination invalide");
        }

        // 4. Copier le fichier vers la destination
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
            Path uploadDir = getUploadDirectoryPath(subDirectory);
            String cleaned = StringUtils.cleanPath(fileName);
            Path filePath = uploadDir.resolve(cleaned).normalize();
            if (!filePath.startsWith(uploadDir)) {
                throw new FileNotFoundException("Chemin invalide: " + fileName);
            }
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
            Path uploadDir = getUploadDirectoryPath(subDirectory);
            String cleaned = StringUtils.cleanPath(fileName);
            Path filePath = uploadDir.resolve(cleaned).normalize();
            if (!filePath.startsWith(uploadDir)) {
                return false;
            }
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

    public boolean isVideoFile(MultipartFile file) {
        String contentType = file.getContentType();
        return contentType != null && contentType.startsWith("video/");
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

    private Path getUploadDirectoryPath(String subDirectory) {
        if (subDirectory == null || subDirectory.isBlank() || !SAFE_SUBDIRECTORY.matcher(subDirectory).matches()) {
            throw new IllegalArgumentException("Sous-dossier invalide");
        }

        Path base = Paths.get(fileStorageProperties.getDir()).toAbsolutePath().normalize();
        Path dir = base.resolve(subDirectory).normalize();
        if (!dir.startsWith(base)) {
            throw new IllegalArgumentException("Sous-dossier invalide");
        }
        return dir;
    }

    private String getFileExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) {
            return "";
        }
        return fileName.substring(fileName.lastIndexOf("."));
    }
}