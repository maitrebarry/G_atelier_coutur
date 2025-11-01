package com.atelier.gestionatelier.services;

import com.atelier.gestionatelier.dto.LoginRequest;
import com.atelier.gestionatelier.dto.LoginResponse;
import com.atelier.gestionatelier.entities.Utilisateur;
import com.atelier.gestionatelier.repositories.UtilisateurRepository;
import com.atelier.gestionatelier.security.JwtUtil;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.UUID;

@Service
public class AuthService {

    private final UtilisateurRepository utilisateurRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;

    public AuthService(UtilisateurRepository utilisateurRepository,
                      JwtUtil jwtUtil,
                      PasswordEncoder passwordEncoder,
                      AuthenticationManager authenticationManager) {
        this.utilisateurRepository = utilisateurRepository;
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
    }

//    public LoginResponse authenticateUser(LoginRequest loginRequest) {
//        // Vérifier manuellement les credentials
//        Utilisateur utilisateur = utilisateurRepository.findByEmail(loginRequest.getEmail())
//                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
//
//        // Vérifier le mot de passe
//        if (!passwordEncoder.matches(loginRequest.getPassword(), utilisateur.getMotDePasse())) {
//            throw new RuntimeException("Mot de passe incorrect");
//        }
//
//        // Authentification via Spring Security
//        Authentication authentication = authenticationManager.authenticate(
//            new UsernamePasswordAuthenticationToken(
//                loginRequest.getEmail(),
//                loginRequest.getPassword()
//            )
//        );
//
//        SecurityContextHolder.getContext().setAuthentication(authentication);
//
//        // Récupérer l'ID de l'atelier (en UUID)
//        UUID atelierId = null;
//        if (utilisateur.getAtelier() != null) {
//            atelierId = utilisateur.getAtelier().getId();
//        }
//
//        // Générer le token JWT avec l'atelierId
//        String jwt = jwtUtil.generateToken(authentication.getName(), atelierId);
//
//        return new LoginResponse(
//            jwt,
//            utilisateur.getId(),
//            utilisateur.getEmail(),
//            utilisateur.getPrenom(),
//            utilisateur.getNom(),
//            utilisateur.getRole().name(),
//            atelierId  // Ajouter l'atelierId dans la réponse
//        );
//    }

    public LoginResponse authenticateUser(LoginRequest loginRequest) {
        // Vérifier manuellement les credentials
        Utilisateur utilisateur = utilisateurRepository.findByEmail(loginRequest.getEmail())
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

        // Vérifier le mot de passe
        if (!passwordEncoder.matches(loginRequest.getPassword(), utilisateur.getMotDePasse())) {
            throw new RuntimeException("Mot de passe incorrect");
        }

        // Authentification via Spring Security
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getEmail(),
                        loginRequest.getPassword()
                )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        // Récupérer l'ID de l'atelier (en UUID)
        UUID atelierId = null;
        if (utilisateur.getAtelier() != null) {
            atelierId = utilisateur.getAtelier().getId();
        }

        // ✅ CORRECTION : RÉCUPÉRER LES PERMISSIONS
        Set<String> permissions = utilisateur.getPermissionCodes();

        // Générer le token JWT avec l'atelierId
        String jwt = jwtUtil.generateToken(authentication.getName(), atelierId);

        // ✅ CORRECTION : INCLURE LES PERMISSIONS DANS LA RÉPONSE
        return new LoginResponse(
                jwt,
                utilisateur.getId(),
                utilisateur.getEmail(),
                utilisateur.getPrenom(),
                utilisateur.getNom(),
                utilisateur.getRole().name(),
                atelierId,
                permissions  // <-- AJOUT DES PERMISSIONS
        );
    }
}