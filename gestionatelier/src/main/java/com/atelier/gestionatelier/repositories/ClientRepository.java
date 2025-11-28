package com.atelier.gestionatelier.repositories;

import com.atelier.gestionatelier.entities.Client;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClientRepository extends JpaRepository<Client, UUID> {

    // ✅ Trouver tous les clients d'un atelier spécifique
    List<Client> findByAtelierId(UUID atelierId);

    // ✅ Trouver un client spécifique par ID et atelier (pour la sécurité)
    Optional<Client> findByIdAndAtelierId(UUID id, UUID atelierId);

    // ✅ Alternative avec @Query (si les noms de méthodes ne fonctionnent pas)
    @Query("SELECT c FROM Client c WHERE c.atelier.id = :atelierId")
    List<Client> findByAtelier(@Param("atelierId") UUID atelierId);

    // ✅ Alternative avec @Query pour la recherche par ID et atelier
    @Query("SELECT c FROM Client c WHERE c.id = :id AND c.atelier.id = :atelierId")
    Optional<Client> findByIdAndAtelier(@Param("id") UUID id, @Param("atelierId") UUID atelierId);

    // ✅ Compter le nombre de clients par atelier (utile pour les statistiques)
    long countByAtelierId(UUID atelierId);

    // Trouver un client par ID et atelier


    // Trouver les clients avec leurs mesures non affectées
    @Query("SELECT DISTINCT c FROM Client c " +
            "LEFT JOIN FETCH c.mesures m " +
            "WHERE c.atelier.id = :atelierId " +
            "AND m.affecte = false " +
            "AND SIZE(c.mesures) > 0")
    List<Client> findByAtelierIdWithMesuresNonAffectees(@Param("atelierId") UUID atelierId);

    // ✅ Trouver les clients assignés à un tailleur spécifique
    @Query("SELECT DISTINCT c FROM Client c JOIN Affectation a ON a.client.id = c.id WHERE a.tailleur.id = :tailleurId")
    List<Client> findByTailleurId(@Param("tailleurId") UUID tailleurId);

    // ✅ Trouver un client spécifique assigné à un tailleur
    @Query("SELECT c FROM Client c JOIN Affectation a ON a.client.id = c.id WHERE c.id = :clientId AND a.tailleur.id = :tailleurId")
    Optional<Client> findByIdAndTailleurId(@Param("clientId") UUID clientId, @Param("tailleurId") UUID tailleurId);
}