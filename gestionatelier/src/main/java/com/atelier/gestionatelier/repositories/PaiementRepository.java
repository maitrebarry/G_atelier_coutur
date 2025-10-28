package com.atelier.gestionatelier.repositories;

import com.atelier.gestionatelier.entities.Paiement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaiementRepository extends JpaRepository<Paiement, UUID> {

    // Trouver tous les paiements d'un atelier
    List<Paiement> findByAtelierId(UUID atelierId);

    // Trouver les paiements clients d'un atelier
    @Query("SELECT p FROM Paiement p WHERE p.atelier.id = :atelierId AND p.typePaiement = 'CLIENT'")
    List<Paiement> findPaiementsClientsByAtelier(@Param("atelierId") UUID atelierId);

    // Trouver les paiements tailleurs d'un atelier
    @Query("SELECT p FROM Paiement p WHERE p.atelier.id = :atelierId AND p.typePaiement = 'TAILLEUR'")
    List<Paiement> findPaiementsTailleursByAtelier(@Param("atelierId") UUID atelierId);

    // Trouver les paiements d'un client spécifique
    @Query("SELECT p FROM Paiement p WHERE p.client.id = :clientId AND p.atelier.id = :atelierId AND p.typePaiement = 'CLIENT'")
    List<Paiement> findPaiementsByClientAndAtelier(@Param("clientId") UUID clientId, @Param("atelierId") UUID atelierId);

    // Trouver les paiements d'un tailleur spécifique
    @Query("SELECT p FROM Paiement p WHERE p.tailleur.id = :tailleurId AND p.atelier.id = :atelierId AND p.typePaiement = 'TAILLEUR'")
    List<Paiement> findPaiementsByTailleurAndAtelier(@Param("tailleurId") UUID tailleurId, @Param("atelierId") UUID atelierId);

    // Vérifier si une référence existe déjà
    boolean existsByReference(String reference);

    // Calculer le total des paiements clients pour un atelier
    @Query("SELECT COALESCE(SUM(p.montant), 0) FROM Paiement p WHERE p.atelier.id = :atelierId AND p.typePaiement = 'CLIENT'")
    Double getTotalPaiementsClientsByAtelier(@Param("atelierId") UUID atelierId);

    // Calculer le total des paiements tailleurs pour un atelier
    @Query("SELECT COALESCE(SUM(p.montant), 0) FROM Paiement p WHERE p.atelier.id = :atelierId AND p.typePaiement = 'TAILLEUR'")
    Double getTotalPaiementsTailleursByAtelier(@Param("atelierId") UUID atelierId);

    // Trouver le dernier paiement d'un client
    @Query("SELECT p FROM Paiement p WHERE p.client.id = :clientId ORDER BY p.datePaiement DESC LIMIT 1")
    Optional<Paiement> findLastPaiementByClient(@Param("clientId") UUID clientId);

    // Trouver le dernier paiement d'un tailleur
    @Query("SELECT p FROM Paiement p WHERE p.tailleur.id = :tailleurId ORDER BY p.datePaiement DESC LIMIT 1")
    Optional<Paiement> findLastPaiementByTailleur(@Param("tailleurId") UUID tailleurId);
}