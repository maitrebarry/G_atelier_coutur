//  - Réponse standard de l'API
package com.atelier.gestionatelier.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ApiResponseDTO<T> {
    private boolean success;
    private String message;
    private T data;
    private LocalDateTime timestamp;
    private String path;

    public ApiResponseDTO(boolean success, String message, T data) {
        this.success = success;
        this.message = message;
        this.data = data;
        this.timestamp = LocalDateTime.now();
    }

    public static <T> ApiResponseDTO<T> success(T data, String message) {
        return new ApiResponseDTO<>(true, message, data);
    }

    public static <T> ApiResponseDTO<T> success(T data) {
        return success(data, "Opération réussie");
    }

    public static <T> ApiResponseDTO<T> error(String message) {
        return new ApiResponseDTO<>(false, message, null);
    }
}