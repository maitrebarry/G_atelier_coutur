package com.atelier.gestionatelier.repositories;

import com.atelier.gestionatelier.entities.Client;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ClientRepository extends JpaRepository<Client, UUID> {
    
}
