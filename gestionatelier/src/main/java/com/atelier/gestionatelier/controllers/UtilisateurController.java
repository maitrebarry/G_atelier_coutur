package com.atelier.gestionatelier.controllers;

import com.atelier.gestionatelier.dto.UtilisateurDTO;
import com.atelier.gestionatelier.entities.Utilisateur;
import com.atelier.gestionatelier.services.UtilisateurService;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/utilisateurs")
@CrossOrigin(origins = "*")  // pour CORS côté frontend
public class UtilisateurController {

    private final UtilisateurService utilisateurService;

    public UtilisateurController(UtilisateurService utilisateurService) {
        this.utilisateurService = utilisateurService;
    }

    // ✅ CREATE
    // @PostMapping
    // public ResponseEntity<?> createUtilisateur(@RequestBody UtilisateurDTO dto) {
    //     try {
    //         return ResponseEntity.ok(utilisateurService.createUtilisateur(dto));
    //     } catch (Exception e) {
    //         return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    //     }
    // }
    @PostMapping
    public ResponseEntity<?> createUtilisateur(@Valid @RequestBody UtilisateurDTO dto, BindingResult result) {
        if (result.hasErrors()) {
            // récupérer toutes les erreurs de validation
            Map<String, String> errors = new HashMap<>();
            result.getFieldErrors().forEach(err -> {
                errors.put(err.getField(), err.getDefaultMessage());
            });
            return ResponseEntity.badRequest().body(errors);
        }

        try {
            return ResponseEntity.ok(utilisateurService.createUtilisateur(dto));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    // ✅ READ - Liste
    @GetMapping
    public List<Utilisateur> getAllUtilisateurs() {
        return utilisateurService.getAllUtilisateurs();
    }

    // ✅ READ - Un seul
    @GetMapping("/{id}")
    public ResponseEntity<?> getUtilisateurById(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(utilisateurService.getUtilisateurById(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ✅ UPDATE
    @PutMapping("/{id}")
    public ResponseEntity<?> updateUtilisateur(@PathVariable UUID id, @RequestBody UtilisateurDTO dto) {
        try {
            return ResponseEntity.ok(utilisateurService.updateUtilisateur(id, dto));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ✅ DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUtilisateur(@PathVariable UUID id) {
        try {
            utilisateurService.deleteUtilisateur(id);
            return ResponseEntity.ok(Map.of("message", "Utilisateur supprimé avec succès"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    

}
