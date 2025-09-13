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
import java.util.Optional;
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

    // ==================== MÉTHODES AVEC PERMISSIONS ====================

    public Utilisateur createUtilisateurWithPermissions(UtilisateurDTO dto, String emailCurrentUser) throws Exception {
        Utilisateur currentUser = findByEmail(emailCurrentUser);
        
        // SUPERADMIN peut créer tout le monde
        if (Role.SUPERADMIN.equals(currentUser.getRole())) {
            return createUtilisateur(dto);
        }
        
        // PROPRIETAIRE peut créer SECRETAIRE et TAILLEUR pour son atelier
        if (Role.PROPRIETAIRE.equals(currentUser.getRole())) {
            if (!List.of("SECRETAIRE", "TAILLEUR").contains(dto.getRole().toUpperCase())) {
                throw new Exception("Vous ne pouvez créer que des secrétaires ou tailleurs");
            }
            
            // Vérifier que le propriétaire a un atelier
            if (currentUser.getAtelier() == null) {
                throw new Exception("Vous n'êtes associé à aucun atelier");
            }
            
            // Forcer l'atelier de l'employé à être le même que le propriétaire
            dto.setAtelierId(currentUser.getAtelier().getId());
            return createUtilisateur(dto);
        }
        
        throw new Exception("Permission refusée");
    }

    public List<Utilisateur> getUtilisateursWithPermissions(String emailCurrentUser) {
        Utilisateur currentUser = findByEmail(emailCurrentUser);
        
        // SUPERADMIN voit tout
        if (Role.SUPERADMIN.equals(currentUser.getRole())) {
            return utilisateurRepository.findAll();
        }
        
        // PROPRIETAIRE voit seulement les utilisateurs de son atelier
        if (Role.PROPRIETAIRE.equals(currentUser.getRole())) {
            if (currentUser.getAtelier() == null) {
                return List.of();
            }
            return utilisateurRepository.findByAtelierId(currentUser.getAtelier().getId());
        }
        
        // Autres rôles ne voient que leur propre compte
        return List.of(currentUser);
    }

    public Utilisateur getUtilisateurByIdWithPermissions(UUID id, String emailCurrentUser) throws Exception {
        Utilisateur currentUser = findByEmail(emailCurrentUser);
        Utilisateur targetUser = getUtilisateurById(id);
        
        // SUPERADMIN peut tout voir
        if (Role.SUPERADMIN.equals(currentUser.getRole())) {
            return targetUser;
        }
        
        // PROPRIETAIRE peut voir les utilisateurs de son atelier
        if (Role.PROPRIETAIRE.equals(currentUser.getRole())) {
            if (currentUser.getAtelier() != null && 
                currentUser.getAtelier().getId().equals(targetUser.getAtelier().getId())) {
                return targetUser;
            }
        }
        
        // Chacun peut voir son propre compte
        if (currentUser.getId().equals(id)) {
            return targetUser;
        }
        
        throw new Exception("Accès non autorisé");
    }

    public Utilisateur updateUtilisateurWithPermissions(UUID id, UtilisateurDTO dto, String emailCurrentUser) throws Exception {
        Utilisateur currentUser = findByEmail(emailCurrentUser);
        Utilisateur existingUser = getUtilisateurById(id);
        
        // SUPERADMIN peut tout modifier
        if (Role.SUPERADMIN.equals(currentUser.getRole())) {
            return updateUtilisateur(id, dto);
        }
        
        // PROPRIETAIRE peut modifier les employés de son atelier
        if (Role.PROPRIETAIRE.equals(currentUser.getRole())) {
            if (currentUser.getAtelier() != null && 
                currentUser.getAtelier().getId().equals(existingUser.getAtelier().getId())) {
                
                // Empêcher de changer le rôle en PROPRIETAIRE ou SUPERADMIN
                if (dto.getRole() != null && 
                    List.of("PROPRIETAIRE", "SUPERADMIN").contains(dto.getRole().toUpperCase())) {
                    throw new Exception("Vous ne pouvez pas attribuer ce rôle");
                }
                
                return updateUtilisateur(id, dto);
            }
        }
        
        // Chacun peut modifier son propre compte (sauf son rôle)
        if (currentUser.getId().equals(id)) {
            if (dto.getRole() != null && !dto.getRole().equalsIgnoreCase(currentUser.getRole().name())) {
                throw new Exception("Vous ne pouvez pas modifier votre propre rôle");
            }
            return updateUtilisateur(id, dto);
        }
        
        throw new Exception("Permission refusée");
    }

    public void deleteUtilisateurWithPermissions(UUID id, String emailCurrentUser) throws Exception {
        Utilisateur currentUser = findByEmail(emailCurrentUser);
        Utilisateur targetUser = getUtilisateurById(id);
        
        // SUPERADMIN peut tout supprimer
        if (Role.SUPERADMIN.equals(currentUser.getRole())) {
            deleteUtilisateur(id);
            return;
        }
        
        // PROPRIETAIRE peut supprimer les employés de son atelier
        if (Role.PROPRIETAIRE.equals(currentUser.getRole())) {
            if (currentUser.getAtelier() != null && 
                currentUser.getAtelier().getId().equals(targetUser.getAtelier().getId()) &&
                !Role.PROPRIETAIRE.equals(targetUser.getRole())) {
                deleteUtilisateur(id);
                return;
            }
        }
        
        throw new Exception("Permission refusée");
    }

    // ==================== MÉTHODES ORIGINALES (INTERNES) ====================

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

    public List<Utilisateur> getAllUtilisateurs() {
        return utilisateurRepository.findAll();
    }

    public Utilisateur getUtilisateurById(UUID id) throws Exception {
        return utilisateurRepository.findById(id)
                .orElseThrow(() -> new Exception("Utilisateur non trouvé"));
    }

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

    public void deleteUtilisateur(UUID id) throws Exception {
        if (!utilisateurRepository.existsById(id)) {
            throw new Exception("Utilisateur non trouvé");
        }
        utilisateurRepository.deleteById(id);
    }

    public Utilisateur activateUser(UUID id) throws Exception {
        Utilisateur utilisateur = utilisateurRepository.findById(id)
                .orElseThrow(() -> new Exception("Utilisateur non trouvé"));
        utilisateur.setActif(true);
        return utilisateurRepository.save(utilisateur);
    }

    public Utilisateur deactivateUser(UUID id) throws Exception {
        Utilisateur utilisateur = utilisateurRepository.findById(id)
                .orElseThrow(() -> new Exception("Utilisateur non trouvé"));
        utilisateur.setActif(false);
        return utilisateurRepository.save(utilisateur);
    }
    public Optional<Utilisateur> findById(UUID id) {
        return utilisateurRepository.findById(id);
    }
}