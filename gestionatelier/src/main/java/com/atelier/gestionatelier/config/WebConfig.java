package com.atelier.gestionatelier.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;


@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final FileStorageProperties fileStorageProperties;

    public WebConfig(FileStorageProperties fileStorageProperties) {
        this.fileStorageProperties = fileStorageProperties;
    }

    @Override
    public void addResourceHandlers(@NonNull ResourceHandlerRegistry registry) {
        Path base = Paths.get(fileStorageProperties.getDir()).toAbsolutePath().normalize();

        String baseLocation = base.toUri().toString();
        if (!baseLocation.endsWith("/")) {
            baseLocation += "/";
        }

        String userPhotoLocation = base.resolve("user_photo").toUri().toString();
        if (!userPhotoLocation.endsWith("/")) {
            userPhotoLocation += "/";
        }

        String modelPhotoLocation = base.resolve("model_photo").toUri().toString();
        if (!modelPhotoLocation.endsWith("/")) {
            modelPhotoLocation += "/";
        }

        String habitPhotoLocation = base.resolve("habit_photo").toUri().toString();
        if (!habitPhotoLocation.endsWith("/")) {
            habitPhotoLocation += "/";
        }

        String modelVideoLocation = base.resolve("model_video").toUri().toString();
        if (!modelVideoLocation.endsWith("/")) {
            modelVideoLocation += "/";
        }

        // Handler pour les photos de profil
        registry.addResourceHandler("/user_photo/**")
                .addResourceLocations(userPhotoLocation);

        // Handler pour les photos de modèles
        registry.addResourceHandler("/model_photo/**")
            .addResourceLocations(modelPhotoLocation);
        registry.addResourceHandler("/modeles/videos/**")
            .addResourceLocations(modelVideoLocation);

        // Handler pour les photos d'habit envoyées par les clients
        registry.addResourceHandler("/habit_photo/**")
            .addResourceLocations(habitPhotoLocation);

        // Handler pour les uploads génériques (ex: preuves d'abonnement)
        registry.addResourceHandler("/uploads/**")
            .addResourceLocations(baseLocation);

        // Handler pour les assets statiques
        registry.addResourceHandler("/assets/**")
                .addResourceLocations("classpath:/static/assets/");
    }
}