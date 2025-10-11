package com.atelier.gestionatelier.repositories;

import com.atelier.gestionatelier.entities.Permission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface PermissionRepository extends JpaRepository<Permission, UUID> {
    Optional<Permission> findByCode(String code);

    /**
     * Vérifier si une permission existe par son code
     */
    boolean existsByCode(String code);

    /**
     * NOUVELLE MÉTHODE : Compter le nombre d'utilisateurs ayant une permission spécifique
     */
    @Query("SELECT COUNT(u) FROM Utilisateur u WHERE :permission MEMBER OF u.permissions")
    long countByPermissionsContaining(@Param("permission") Permission permission);

}