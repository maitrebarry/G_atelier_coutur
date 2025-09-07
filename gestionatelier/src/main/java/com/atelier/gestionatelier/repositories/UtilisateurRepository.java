package com.atelier.gestionatelier.repositories;
import com.atelier.gestionatelier.entities.Utilisateur;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;
import java.util.List;

public interface UtilisateurRepository extends JpaRepository<Utilisateur, UUID> {
    Optional<Utilisateur> findByEmail(String email);
    List<Utilisateur> findByAtelierId(UUID atelierId); // ← Ajouter cette méthode
}
