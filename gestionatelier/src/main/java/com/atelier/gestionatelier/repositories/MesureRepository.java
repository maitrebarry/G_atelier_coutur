package com.atelier.gestionatelier.repositories;

import com.atelier.gestionatelier.entities.Mesure;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface MesureRepository extends JpaRepository<Mesure, UUID> {
}
