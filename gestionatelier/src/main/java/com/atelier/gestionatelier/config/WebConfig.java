package com.atelier.gestionatelier.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;


@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final FileStorageProperties fileStorageProperties;

    public WebConfig(FileStorageProperties fileStorageProperties) {
        this.fileStorageProperties = fileStorageProperties;
    }

    @Override
    public void addResourceHandlers(@NonNull ResourceHandlerRegistry registry) {
        // Handler pour les photos de profil
        registry.addResourceHandler("/user_photo/**")
                .addResourceLocations("file:" + fileStorageProperties.getUserPhotoDir());

        // Handler pour les photos de modèles
        registry.addResourceHandler("/model_photo/**")
                .addResourceLocations("file:" + fileStorageProperties.getModelPhotoDir());
        registry.addResourceHandler("/modeles/videos/**")
                .addResourceLocations("file:" + fileStorageProperties.getDir() + "model_video/");

        // Handler pour les photos d'habit envoyées par les clients
        registry.addResourceHandler("/habit_photo/**")
            .addResourceLocations("file:" + fileStorageProperties.getHabitPhotoDir());

        // Handler pour les uploads génériques (ex: preuves d'abonnement)
        registry.addResourceHandler("/uploads/**")
            .addResourceLocations("file:" + fileStorageProperties.getDir());

        // Handler pour les assets statiques
        registry.addResourceHandler("/assets/**")
                .addResourceLocations("classpath:/static/assets/");
    }
}