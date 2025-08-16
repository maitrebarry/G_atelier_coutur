package com.atelier.gestionatelier.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "paiements")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class Paiement {

   @Id
@GeneratedValue(strategy = GenerationType.AUTO)
private UUID id;


    private Double montant;
    private String moyen;

    @Column(name = "date_paiement")
    private LocalDateTime datePaiement = LocalDateTime.now();

    @ManyToOne
    @JoinColumn(name = "id_client", nullable = false)
    private Client client;

    @ManyToOne
    @JoinColumn(name = "id_atelier", nullable = false)
    private Atelier atelier;
}
