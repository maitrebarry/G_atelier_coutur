package com.atelier.gestionatelier.repositories;
import com.atelier.gestionatelier.entities.Permission;
import com.atelier.gestionatelier.entities.Utilisateur;
import com.atelier.gestionatelier.security.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

public interface UtilisateurRepository extends JpaRepository<Utilisateur, UUID> {
    Optional<Utilisateur> findByEmail(String email);
    List<Utilisateur> findByAtelierId(UUID atelierId); // ← Ajouter cette méthode

    long countByPermissionsContaining(Permission permission);

    // Trouver tous les tailleurs actifs d'un atelier
    @Query("SELECT u FROM Utilisateur u WHERE u.role = 'TAILLEUR' AND u.actif = true AND u.atelier.id = :atelierId")
    List<Utilisateur> findTailleursActifsByAtelier(@Param("atelierId") UUID atelierId);

    // Trouver un tailleur par ID et atelier
    @Query("SELECT u FROM Utilisateur u WHERE u.id = :tailleurId AND u.role = 'TAILLEUR' AND u.actif = true AND u.atelier.id = :atelierId")
    Optional<Utilisateur> findTailleurByIdAndAtelier(@Param("tailleurId") UUID tailleurId, @Param("atelierId") UUID atelierId);

    // Vérifier si un utilisateur est un tailleur actif
    @Query("SELECT COUNT(u) > 0 FROM Utilisateur u WHERE u.id = :userId AND u.role = 'TAILLEUR' AND u.actif = true")
    boolean isTailleurActif(@Param("userId") UUID userId);
    // Ajouter dans UtilisateurRepository
    @Query("SELECT u FROM Utilisateur u WHERE u.atelier.id = :atelierId AND u.role = :role AND u.actif = true")
    List<Utilisateur> findByAtelierIdAndRole(@Param("atelierId") UUID atelierId, @Param("role") Role role);
}
