package com.atelier.gestionatelier.repositories;

import com.atelier.gestionatelier.entities.RendezVous;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface RendezVousRepository extends JpaRepository<RendezVous, UUID> {

    // Rendez-vous par atelier avec pagination pour l'affichage liste
    List<RendezVous> findByAtelierIdOrderByDateRDVDesc(UUID atelierId);

    // Rendez-vous à venir (date >= aujourd'hui)
    @Query("SELECT r FROM RendezVous r WHERE r.atelier.id = :atelierId AND r.dateRDV >= :aujourdhui ORDER BY r.dateRDV ASC")
    List<RendezVous> findRendezVousAVenir(@Param("atelierId") UUID atelierId, @Param("aujourdhui") LocalDateTime aujourdhui);

    // Rendez-vous d'un client spécifique
    List<RendezVous> findByClientIdOrderByDateRDVDesc(UUID clientId);

    // Rendez-vous par statut
    List<RendezVous> findByAtelierIdAndStatutOrderByDateRDVAsc(UUID atelierId, String statut);

    // Rendez-vous aujourd'hui pour un atelier
    @Query("SELECT r FROM RendezVous r WHERE r.atelier.id = :atelierId AND DATE(r.dateRDV) = CURRENT_DATE ORDER BY r.dateRDV")
    List<RendezVous> findRendezVousAujourdhui(@Param("atelierId") UUID atelierId);

    // Rendez-vous dans une période
    List<RendezVous> findByAtelierIdAndDateRDVBetween(UUID atelierId, LocalDateTime start, LocalDateTime end);

    // Pour les notifications : rendez-vous confirmés dans les 24h
    @Query("SELECT r FROM RendezVous r WHERE r.statut = 'CONFIRME' AND r.dateRDV BETWEEN :start AND :end")
    List<RendezVous> findRendezVousConfirmesDans24h(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    // Compter les rendez-vous par statut
    @Query("SELECT COUNT(r) FROM RendezVous r WHERE r.atelier.id = :atelierId AND r.statut = :statut")
    long countByAtelierIdAndStatut(@Param("atelierId") UUID atelierId, @Param("statut") String statut);

    // Vérifier les conflits de rendez-vous
    @Query("SELECT COUNT(r) FROM RendezVous r WHERE r.atelier.id = :atelierId AND r.dateRDV = :dateRDV AND r.statut IN ('PLANIFIE', 'CONFIRME')")
    long countConflitsRendezVous(@Param("atelierId") UUID atelierId, @Param("dateRDV") LocalDateTime dateRDV);

    // Trouver les anciens rendez-vous pour le nettoyage
    List<RendezVous> findByDateRDVBefore(LocalDateTime date);
}