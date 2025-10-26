package com.atelier.gestionatelier.repositories;

import com.atelier.gestionatelier.entities.Mesure;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;


@Repository
public interface MesureRepository extends JpaRepository<Mesure, UUID> {

    // Trouver les mesures validées non affectées pour un atelier
    @Query("SELECT m FROM Mesure m WHERE m.affecte = false AND m.atelier.id = :atelierId")
    List<Mesure> findMesuresNonAffecteesByAtelier(@Param("atelierId") UUID atelierId);

    // Trouver les mesures d'un client non affectées
    @Query("SELECT m FROM Mesure m WHERE m.client.id = :clientId AND m.affecte = false")
    List<Mesure> findMesuresNonAffecteesByClient(@Param("clientId") UUID clientId);

    // Vérifier si un client a des mesures non affectées
    @Query("SELECT COUNT(m) > 0 FROM Mesure m WHERE m.client.id = :clientId AND m.affecte = false")
    boolean clientHasMesuresNonAffectees(@Param("clientId") UUID clientId);
}
