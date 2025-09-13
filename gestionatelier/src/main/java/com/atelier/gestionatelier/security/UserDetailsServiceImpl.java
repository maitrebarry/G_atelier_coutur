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
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Utilisateur utilisateur = utilisateurRepository.findByEmail(email)
            .orElseThrow(() -> new UsernameNotFoundException("Utilisateur non trouvé avec l'email: " + email));
        
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
}