package com.atelier.gestionatelier.controllers;

import com.atelier.gestionatelier.dto.LoginRequest;
import com.atelier.gestionatelier.dto.LoginResponse;
import com.atelier.gestionatelier.entities.Utilisateur;
import com.atelier.gestionatelier.security.JwtUtil;
import com.atelier.gestionatelier.services.AuthService;
import com.atelier.gestionatelier.services.UtilisateurService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;
    private final JwtUtil jwtUtil;
    private final UtilisateurService utilisateurService;

    public AuthController(AuthService authService, JwtUtil jwtUtil, UtilisateurService utilisateurService) {
        this.authService = authService;
        this.jwtUtil = jwtUtil;
        this.utilisateurService = utilisateurService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest loginRequest, BindingResult result) {
        if (result.hasErrors()) {
            Map<String, String> errors = new HashMap<>();
            result.getFieldErrors().forEach(err -> {
                errors.put(err.getField(), err.getDefaultMessage());
            });
            return ResponseEntity.badRequest().body(errors);
        }

        try {
            LoginResponse response = authService.authenticateUser(loginRequest);
            
            System.out.println("=== JWT TOKEN GENERATED ===");
            System.out.println("Token: " + response.getToken());
            System.out.println("User: " + response.getEmail());
            System.out.println("Role: " + response.getRole());
            System.out.println("Atelier: " + response.getAtelierId());
            System.out.println("===========================");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        String token = extractTokenFromRequest(request);
        
        if (token != null) {
            jwtUtil.invalidateToken(token);
            return ResponseEntity.ok().body(Map.of("message", "Déconnexion réussie"));
        }
        
        return ResponseEntity.badRequest().body(Map.of("error", "Token non fourni"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(Map.of("error", "Non authentifié"));
        }
        
        try {
            String email = authentication.getName();
            Utilisateur utilisateur = utilisateurService.findByEmail(email);
            
            Map<String, Object> userInfo = new HashMap<>();
            userInfo.put("id", utilisateur.getId());
            userInfo.put("email", utilisateur.getEmail());
            userInfo.put("prenom", utilisateur.getPrenom());
            userInfo.put("nom", utilisateur.getNom());
            userInfo.put("role", utilisateur.getRole().name());
            userInfo.put("username", authentication.getName());
            userInfo.put("authorities", authentication.getAuthorities());
            
            if (utilisateur.getAtelier() != null) {
                userInfo.put("atelierId", utilisateur.getAtelier().getId());
                userInfo.put("atelierNom", utilisateur.getAtelier().getNom());
            }
            
            return ResponseEntity.ok(userInfo);
            
        } catch (Exception e) {
            return ResponseEntity.status(404).body(Map.of("error", "Utilisateur non trouvé"));
        }
    }

    private String extractTokenFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}