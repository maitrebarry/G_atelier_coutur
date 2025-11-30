package com.atelier.gestionatelier.repositories;

import com.atelier.gestionatelier.entities.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findByRecipientIdOrderByDateCreationDesc(UUID recipientId);
    List<Notification> findByRecipientIdAndIsReadFalseOrderByDateCreationDesc(UUID recipientId);
    long countByRecipientIdAndIsReadFalse(UUID recipientId);
}
