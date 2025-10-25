package com.atelier.gestionatelier.repositories;

import com.atelier.gestionatelier.entities.Modele;
import com.atelier.gestionatelier.entities.Modele.CategorieModele;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ModeleRepository extends JpaRepository<Modele, UUID> {

    List<Modele> findByAtelierIdOrderByDateCreationDesc(UUID atelierId);
    List<Modele> findByAtelierIdAndEstActifTrueOrderByDateCreationDesc(UUID atelierId);
    List<Modele> findByAtelierIdAndCategorieOrderByDateCreationDesc(UUID atelierId, CategorieModele categorie);
    List<Modele> findByAtelierIdAndCategorieAndEstActifTrueOrderByDateCreationDesc(UUID atelierId, CategorieModele categorie);

    @Query("SELECT m FROM Modele m WHERE m.atelier.id = :atelierId AND LOWER(m.nom) LIKE LOWER(CONCAT('%', :searchTerm, '%')) AND m.estActif = true")
    List<Modele> searchByNom(@Param("atelierId") UUID atelierId, @Param("searchTerm") String searchTerm);

    long countByAtelierIdAndEstActifTrue(UUID atelierId);
    boolean existsByNomAndAtelierId(String nom, UUID atelierId);
    Optional<Modele> findByIdAndAtelierId(UUID id, UUID atelierId);

}