package com.atelier.gestionatelier.repositories;

import com.atelier.gestionatelier.entities.Affectation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AffectationRepository extends JpaRepository<Affectation, UUID> {

    // ✅ NOUVELLE MÉTHODE : Trouver toutes les affectations d'un tailleur
    @Query("SELECT a FROM Affectation a WHERE a.tailleur.id = :tailleurId")
    List<Affectation> findByTailleurId(@Param("tailleurId") UUID tailleurId);

    // Pour TAILLEUR : ses propres affectations dans un atelier
    @Query("SELECT a FROM Affectation a " +
            "LEFT JOIN FETCH a.client " +
            "LEFT JOIN FETCH a.tailleur " +
            "LEFT JOIN FETCH a.mesure " +
            "LEFT JOIN FETCH a.atelier " +
            "WHERE a.tailleur.id = :tailleurId AND a.atelier.id = :atelierId " +
            "ORDER BY a.dateCreation DESC")
    List<Affectation> findByTailleurIdAndAtelierIdWithRelations(@Param("tailleurId") UUID tailleurId,
                                                                @Param("atelierId") UUID atelierId);

    // Pour PROPRIETAIRE/SECRETAIRE : toutes les affectations d'un atelier
    @Query("SELECT a FROM Affectation a " +
            "LEFT JOIN FETCH a.client " +
            "LEFT JOIN FETCH a.tailleur " +
            "LEFT JOIN FETCH a.mesure " +
            "LEFT JOIN FETCH a.atelier " +
            "WHERE a.atelier.id = :atelierId " +
            "ORDER BY a.dateCreation DESC")
    List<Affectation> findByAtelierIdWithRelations(@Param("atelierId") UUID atelierId);

    // Pour SUPERADMIN : toutes les affectations
    @Query("SELECT a FROM Affectation a " +
            "LEFT JOIN FETCH a.client " +
            "LEFT JOIN FETCH a.tailleur " +
            "LEFT JOIN FETCH a.mesure " +
            "LEFT JOIN FETCH a.atelier " +
            "ORDER BY a.dateCreation DESC")
    List<Affectation> findAllWithRelations();

    // Trouver une affectation avec toutes les relations
    @Query("SELECT a FROM Affectation a " +
            "LEFT JOIN FETCH a.client " +
            "LEFT JOIN FETCH a.tailleur " +
            "LEFT JOIN FETCH a.mesure " +
            "LEFT JOIN FETCH a.atelier " +
            "WHERE a.id = :id")
    Optional<Affectation> findByIdWithRelations(@Param("id") UUID id);
}