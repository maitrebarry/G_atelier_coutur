package com.atelier.gestionatelier.repositories;

import com.atelier.gestionatelier.entities.Atelier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface AtelierRepository extends JpaRepository<Atelier, UUID> {
    
    // Méthode 1: Avec le naming convention Spring Data
    boolean existsByNom(String nom);
    
    // Méthode 2: Avec requête custom pour plus de contrôle
    @Query("SELECT COUNT(a) > 0 FROM Atelier a WHERE a.telephone = :telephone")
    boolean existsByTelephone(@Param("telephone") String telephone);
    
    // Méthode alternative si le naming convention pose problème
    @Query("SELECT COUNT(a) > 0 FROM Atelier a WHERE LOWER(a.nom) = LOWER(:nom)")
    boolean existsByNomIgnoreCase(@Param("nom") String nom);

    // Vérifie si un numéro de téléphone dépasse 8 chiffres (en ignorant les espaces)
    @Query("SELECT COUNT(a) > 0 FROM Atelier a WHERE LENGTH(REPLACE(a.telephone, ' ', '')) > 8")
    boolean existsTelephoneWithMoreThan8Digits();
}