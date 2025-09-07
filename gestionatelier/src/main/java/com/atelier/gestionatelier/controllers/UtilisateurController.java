package com.atelier.gestionatelier.controllers;

import com.atelier.gestionatelier.dto.UtilisateurDTO;
import com.atelier.gestionatelier.entities.Utilisateur;
import com.atelier.gestionatelier.services.UtilisateurService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/utilisateurs")
@CrossOrigin(origins = "*")
public class UtilisateurController {

    private final UtilisateurService utilisateurService;

    public UtilisateurController(UtilisateurService utilisateurService) {
        this.utilisateurService = utilisateurService;
    }

    // ✅ CREATE avec permissions
    @PostMapping
    public ResponseEntity<?> createUtilisateur(@Valid @RequestBody UtilisateurDTO dto, 
                                              BindingResult result,
                                              Authentication authentication) {
        if (result.hasErrors()) {
            Map<String, String> errors = new HashMap<>();
            result.getFieldErrors().forEach(err -> {
                errors.put(err.getField(), err.getDefaultMessage());
            });
            return ResponseEntity.badRequest().body(errors);
        }

        try {
            String email = authentication.getName();
            Utilisateur createdUser = utilisateurService.createUtilisateurWithPermissions(dto, email);
            return ResponseEntity.ok(createdUser);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ✅ READ - Liste avec permissions
    @GetMapping
    public ResponseEntity<?> getAllUtilisateurs(Authentication authentication) {
        try {
            String email = authentication.getName();
            List<Utilisateur> utilisateurs = utilisateurService.getUtilisateursWithPermissions(email);
            return ResponseEntity.ok(utilisateurs);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ✅ READ - Un seul avec permissions
    @GetMapping("/{id}")
    public ResponseEntity<?> getUtilisateurById(@PathVariable UUID id, Authentication authentication) {
        try {
            String email = authentication.getName();
            Utilisateur utilisateur = utilisateurService.getUtilisateurByIdWithPermissions(id, email);
            return ResponseEntity.ok(utilisateur);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ✅ UPDATE avec permissions
    @PutMapping("/{id}")
    public ResponseEntity<?> updateUtilisateur(@PathVariable UUID id, 
                                              @RequestBody UtilisateurDTO dto,
                                              Authentication authentication) {
        try {
            String email = authentication.getName();
            Utilisateur updatedUser = utilisateurService.updateUtilisateurWithPermissions(id, dto, email);
            return ResponseEntity.ok(updatedUser);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ✅ DELETE avec permissions
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUtilisateur(@PathVariable UUID id, Authentication authentication) {
        try {
            String email = authentication.getName();
            utilisateurService.deleteUtilisateurWithPermissions(id, email);
            return ResponseEntity.ok(Map.of("message", "Utilisateur supprimé avec succès"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    @PatchMapping("/{id}/activate")
    public ResponseEntity<?> activateUser(@PathVariable UUID id) {
        try {
            Utilisateur utilisateur = utilisateurService.activateUser(id);
            return ResponseEntity.ok(utilisateur);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<?> deactivateUser(@PathVariable UUID id) {
        try {
            Utilisateur utilisateur = utilisateurService.deactivateUser(id);
            return ResponseEntity.ok(utilisateur);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    

}