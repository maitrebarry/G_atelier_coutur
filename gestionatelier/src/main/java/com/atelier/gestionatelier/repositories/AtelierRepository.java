package com.atelier.gestionatelier.repositories;

import com.atelier.gestionatelier.entities.Atelier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AtelierRepository extends JpaRepository<Atelier, UUID> {
}
