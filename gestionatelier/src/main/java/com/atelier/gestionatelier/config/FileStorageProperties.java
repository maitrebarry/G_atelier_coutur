package com.atelier.gestionatelier.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.upload")
public class FileStorageProperties {

    private String dir = "./uploads/";
    private String userPhotoDir = "./uploads/user_photo/";
    private String modelPhotoDir = "./uploads/model_photo/";

    // Getters et Setters
    public String getDir() {
        return dir;
    }

    public void setDir(String dir) {
        this.dir = dir;
        // Met à jour automatiquement les sous-dossiers
        this.userPhotoDir = dir + "user_photo/";
        this.modelPhotoDir = dir + "model_photo/";
    }

    public String getUserPhotoDir() {
        return userPhotoDir;
    }

    public void setUserPhotoDir(String userPhotoDir) {
        this.userPhotoDir = userPhotoDir;
    }

    public String getModelPhotoDir() {
        return modelPhotoDir;
    }

    public void setModelPhotoDir(String modelPhotoDir) {
        this.modelPhotoDir = modelPhotoDir;
    }
}