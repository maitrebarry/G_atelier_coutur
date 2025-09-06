package com.atelier.gestionatelier.services;

import com.atelier.gestionatelier.dto.UtilisateurDTO;
import com.atelier.gestionatelier.entities.Utilisateur;
import com.atelier.gestionatelier.entities.Atelier;
import com.atelier.gestionatelier.repositories.UtilisateurRepository;
import com.atelier.gestionatelier.repositories.AtelierRepository;
import com.atelier.gestionatelier.security.Role;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class UtilisateurService {

    private final UtilisateurRepository utilisateurRepository;
    private final AtelierRepository atelierRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    public UtilisateurService(UtilisateurRepository utilisateurRepository,
                              AtelierRepository atelierRepository) {
        this.utilisateurRepository = utilisateurRepository;
        this.atelierRepository = atelierRepository;
        this.passwordEncoder = new BCryptPasswordEncoder();
    }
  public Utilisateur findByEmail(String email) {
        return utilisateurRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec l'email: " + email));
    }
    // CREATE déjà fait
    public Utilisateur createUtilisateur(UtilisateurDTO dto) throws Exception {
        if (utilisateurRepository.findByEmail(dto.getEmail()).isPresent()) {
            throw new Exception("Email déjà utilisé !");
        }

        Utilisateur utilisateur = new Utilisateur();
        utilisateur.setNom(dto.getNom());
        utilisateur.setPrenom(dto.getPrenom());
        utilisateur.setEmail(dto.getEmail());
        utilisateur.setMotDePasse(passwordEncoder.encode(dto.getMotdepasse()));
        
        if (dto.getAtelierId() != null) {
            Atelier atelier = atelierRepository.findById(dto.getAtelierId())
                    .orElseThrow(() -> new Exception("Atelier non trouvé"));
            utilisateur.setAtelier(atelier);
        }

        utilisateur.setRole(Role.valueOf(dto.getRole().toUpperCase()));

        return utilisateurRepository.save(utilisateur);
    }

    // ✅ READ - Liste
    public List<Utilisateur> getAllUtilisateurs() {
        return utilisateurRepository.findAll();
    }

    // ✅ READ - Un seul
    public Utilisateur getUtilisateurById(UUID id) throws Exception {
        return utilisateurRepository.findById(id)
                .orElseThrow(() -> new Exception("Utilisateur non trouvé"));
    }

    // ✅ UPDATE
    public Utilisateur updateUtilisateur(UUID id, UtilisateurDTO dto) throws Exception {
        Utilisateur utilisateur = utilisateurRepository.findById(id)
                .orElseThrow(() -> new Exception("Utilisateur non trouvé"));

        utilisateur.setNom(dto.getNom());
        utilisateur.setPrenom(dto.getPrenom());
        utilisateur.setEmail(dto.getEmail());

        if (dto.getMotdepasse() != null && !dto.getMotdepasse().isBlank()) {
            utilisateur.setMotDePasse(passwordEncoder.encode(dto.getMotdepasse()));
        }

        if (dto.getAtelierId() != null) {
            Atelier atelier = atelierRepository.findById(dto.getAtelierId())
                    .orElseThrow(() -> new Exception("Atelier non trouvé"));
            utilisateur.setAtelier(atelier);
        }

        utilisateur.setRole(Role.valueOf(dto.getRole().toUpperCase()));

        return utilisateurRepository.save(utilisateur);
    }

    // ✅ DELETE
    public void deleteUtilisateur(UUID id) throws Exception {
        if (!utilisateurRepository.existsById(id)) {
            throw new Exception("Utilisateur non trouvé");
        }
        utilisateurRepository.deleteById(id);
    }
}

// @Service
// public class UtilisateurService {

//     private final UtilisateurRepository utilisateurRepository;
//     private final AtelierRepository atelierRepository;
//     private final BCryptPasswordEncoder passwordEncoder;

//     public UtilisateurService(UtilisateurRepository utilisateurRepository,
//                               AtelierRepository atelierRepository) {
//         this.utilisateurRepository = utilisateurRepository;
//         this.atelierRepository = atelierRepository;
//         this.passwordEncoder = new BCryptPasswordEncoder();
//     }

//     public Utilisateur createUtilisateur(UtilisateurDTO dto) throws Exception {

//         if (utilisateurRepository.findByEmail(dto.getEmail()).isPresent()) {
//             throw new Exception("Email déjà utilisé !");
//         }

//         Utilisateur utilisateur = new Utilisateur();
//         utilisateur.setNom(dto.getNom());
//         utilisateur.setPrenom(dto.getPrenom());
//         utilisateur.setEmail(dto.getEmail());
//         utilisateur.setMotDePasse(passwordEncoder.encode(dto.getMotdepasse()));

//         // récupérer atelier existant
//         if (dto.getAtelierId() != null) {
//             Atelier atelier = atelierRepository.findById(dto.getAtelierId())
//                     .orElseThrow(() -> new Exception("Atelier non trouvé"));
//             utilisateur.setAtelier(atelier);
//         }

//         // setter rôle
//         utilisateur.setRole(Role.valueOf(dto.getRole().toUpperCase()));

//         return utilisateurRepository.save(utilisateur);
//     }
// }
