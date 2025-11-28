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

        // Handler pour les assets statiques
        registry.addResourceHandler("/assets/**")
                .addResourceLocations("classpath:/static/assets/");
    }
}