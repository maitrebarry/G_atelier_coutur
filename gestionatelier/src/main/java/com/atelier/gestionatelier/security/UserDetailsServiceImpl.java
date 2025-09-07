package com.atelier.gestionatelier.security;

import com.atelier.gestionatelier.entities.Utilisateur;
import com.atelier.gestionatelier.repositories.UtilisateurRepository;

import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

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
        
        return new org.springframework.security.core.userdetails.User(
            utilisateur.getEmail(),
            utilisateur.getMotDePasse(),
            Collections.singletonList(new SimpleGrantedAuthority(utilisateur.getRole().name()))
        );
    }
}