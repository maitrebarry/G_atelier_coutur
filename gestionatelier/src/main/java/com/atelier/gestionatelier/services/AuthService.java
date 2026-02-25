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
    private final com.atelier.gestionatelier.services.SubscriptionPaymentService subscriptionPaymentService;

    public AuthService(UtilisateurRepository utilisateurRepository,
                      JwtUtil jwtUtil,
                      PasswordEncoder passwordEncoder,
                      AuthenticationManager authenticationManager,
                      com.atelier.gestionatelier.services.SubscriptionPaymentService subscriptionPaymentService) {
        this.utilisateurRepository = utilisateurRepository;
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.subscriptionPaymentService = subscriptionPaymentService;
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

        // Récupérer l'ID de l'atelier (en UUID) et son nom
        UUID atelierId = null;
        String atelierName = null;
        if (utilisateur.getAtelier() != null) {
            atelierId = utilisateur.getAtelier().getId();
            atelierName = utilisateur.getAtelier().getNom();
        }

        // ✅ CORRECTION : RÉCUPÉRER LES PERMISSIONS
        Set<String> permissions = utilisateur.getPermissionCodes();

        // Générer le token JWT avec l'atelierId
        String jwt = jwtUtil.generateToken(authentication.getName(), atelierId);

        // Déterminer l'état d'abonnement (blocked + message) pour inclure dans la réponse de login
        boolean subscriptionBlocked = false;
        String subscriptionMessage = null;
        try {
            var current = subscriptionPaymentService.getCurrentForUser(utilisateur);
            if (current != null) {
                Object b = current.get("blocked");
                subscriptionBlocked = b instanceof Boolean && (Boolean) b;
                Object m = current.get("message");
                subscriptionMessage = m != null ? String.valueOf(m) : null;
            }
        } catch (Exception ignored) {
            // ne pas empêcher l'authentification si la vérification d'abonnement échoue
        }

        // ✅ CORRECTION : INCLURE LES PERMISSIONS, LE NOM D'ATELIER ET L'ÉTAT D'ABONNEMENT DANS LA RÉPONSE
        return new LoginResponse(
                jwt,
                utilisateur.getId(),
                utilisateur.getEmail(),
                utilisateur.getPrenom(),
                utilisateur.getNom(),
                utilisateur.getRole().name(),
                atelierId,
                atelierName, // include name for mobile UI
                permissions, // <-- AJOUT DES PERMISSIONS
                subscriptionBlocked,
                subscriptionMessage
        );
    }
}