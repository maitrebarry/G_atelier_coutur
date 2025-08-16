package com.atelier.gestionatelier.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "rendezvous")
@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class RendezVous {

    @Id
@GeneratedValue(strategy = GenerationType.AUTO)
private UUID id;


    @Column(name = "date_rdv")
    private LocalDateTime dateRDV;

    private String motif;

    @ManyToOne
    @JoinColumn(name = "id_client", nullable = false)
    private Client client;

    @ManyToOne
    @JoinColumn(name = "id_atelier", nullable = false)
    private Atelier atelier;
}
