package com.atelier.gestionatelier.controllers;

import com.atelier.gestionatelier.dto.AtelierDTO;
import com.atelier.gestionatelier.services.AtelierService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;
import java.util.List;

@RestController
@RequestMapping("/api/ateliers")
@CrossOrigin(origins = "*")
public class AtelierController {

    private final AtelierService atelierService;

    public AtelierController(AtelierService atelierService) {
        this.atelierService = atelierService;
    }

    @PostMapping
    public ResponseEntity<?> createAtelier(@RequestBody AtelierDTO atelierDTO) {
        try {
            AtelierDTO savedAtelier = atelierService.createAtelier(atelierDTO);
            return ResponseEntity.ok(savedAtelier);
            
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }



    @GetMapping
    public ResponseEntity<?> getAllAteliers() {
        try {
            List<AtelierDTO> ateliers = atelierService.getAllAteliers();
            return ResponseEntity.ok(ateliers);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getAtelierById(@PathVariable UUID id) {
        try {
            AtelierDTO atelier = atelierService.getAtelierById(id);
            return ResponseEntity.ok(atelier);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    // update atelier
    @PutMapping("/{id}")
    public ResponseEntity<?> updateAtelier(@PathVariable UUID id, @RequestBody AtelierDTO atelierDTO) {
        try {
            // Vérifier que l'ID dans le path correspond à l'ID dans le DTO
            if (!id.equals(atelierDTO.getId())) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "ID incohérent"));
            }
            
            AtelierDTO updatedAtelier = atelierService.updateAtelier(id, atelierDTO);
            return ResponseEntity.ok(updatedAtelier);
            
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAtelier(@PathVariable UUID id) {
        try {
            atelierService.deleteAtelier(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
}