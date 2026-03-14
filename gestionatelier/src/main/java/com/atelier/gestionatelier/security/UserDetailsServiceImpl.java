package com.atelier.gestionatelier.security;

import com.atelier.gestionatelier.entities.Utilisateur;
import com.atelier.gestionatelier.repositories.UtilisateurRepository;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Collections;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UtilisateurRepository utilisateurRepository;

    public UserDetailsServiceImpl(UtilisateurRepository utilisateurRepository) {
        this.utilisateurRepository = utilisateurRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        Utilisateur utilisateur = findByIdentifier(identifier);
        
        // Vérifier si l'utilisateur est actif
        if (utilisateur.getActif() != null && !utilisateur.getActif()) {
            throw new DisabledException("Utilisateur désactivé");
        }
        
        // Créer une liste d'autorités avec le préfixe ROLE_
        Collection<GrantedAuthority> authorities = Collections.singletonList(
            new SimpleGrantedAuthority("ROLE_" + utilisateur.getRole().name())
        );
        
        return new org.springframework.security.core.userdetails.User(
            utilisateur.getEmail(),
            utilisateur.getMotDePasse(),
            true, true, true, true, // enabled, accountNonExpired, credentialsNonExpired, accountNonLocked
            authorities
        );
    }

    private Utilisateur findByIdentifier(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            throw new UsernameNotFoundException("Identifiant vide");
        }

        String trimmed = identifier.trim();
        if (trimmed.contains("@")) {
            return utilisateurRepository.findByEmailIgnoreCase(trimmed)
                    .orElseThrow(() -> new UsernameNotFoundException("Utilisateur non trouvé"));
        }

        String normalized = normalizeTelephone(trimmed);
        if (normalized == null) {
            throw new UsernameNotFoundException("Téléphone invalide");
        }

        return utilisateurRepository.findByTelephone(normalized)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur non trouvé"));
    }

    private static String normalizeTelephone(String telephone) {
        if (telephone == null) {
            return null;
        }

        String value = telephone.trim();
        if (value.isEmpty()) {
            return null;
        }

        value = value.replaceAll("[\\s\\-().]", "");
        if (value.startsWith("00")) {
            value = "+" + value.substring(2);
        }

        if (value.startsWith("+")) {
            String digits = value.substring(1).replaceAll("\\D", "");
            if (digits.length() < 6) {
                return null;
            }
            return "+" + digits;
        }

        String digits = value.replaceAll("\\D", "");
        if (digits.length() < 6) {
            return null;
        }
        return digits;
    }
}