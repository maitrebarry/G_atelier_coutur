package com.atelier.gestionatelier.controllers;

import com.atelier.gestionatelier.dto.*;
import com.atelier.gestionatelier.services.RendezVousService;
import com.atelier.gestionatelier.services.ClientService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/rendezvous")
@RequiredArgsConstructor
public class RendezVousController {
    private final RendezVousService rendezVousService;
    private final ClientService clientService;

    // Endpoints pour la gestion des clients (nécessaires pour le front-end)
    @GetMapping("/atelier/{atelierId}/clients")
    public ResponseEntity<List<ClientRechercheRendezVousDTO>> getClientsPourRendezVous(@PathVariable UUID atelierId) {
        List<ClientRechercheRendezVousDTO> clients = clientService.getClientsPourRendezVous(atelierId);
        return ResponseEntity.ok(clients);
    }

    @GetMapping("/clients/{clientId}/details")
    public ResponseEntity<ClientAvecMesuresDTO> getClientAvecMesures(@PathVariable UUID clientId) {
        ClientAvecMesuresDTO client = clientService.getClientAvecMesuresPourRendezVous(clientId);
        return ResponseEntity.ok(client);
    }

    // Endpoints pour la gestion des rendez-vous
    @PostMapping
    public ResponseEntity<RendezVousDTO> creerRendezVous(@Valid @RequestBody CreateRendezVousDTO dto) {
        RendezVousDTO rendezVous = rendezVousService.creerRendezVous(dto);
        return ResponseEntity.ok(rendezVous);
    }

    @PutMapping("/{id}")
    public ResponseEntity<RendezVousDTO> mettreAJourRendezVous(@PathVariable UUID id,
                                                               @Valid @RequestBody UpdateRendezVousDTO dto) {
        RendezVousDTO rendezVous = rendezVousService.mettreAJourRendezVous(id, dto);
        return ResponseEntity.ok(rendezVous);
    }

    @GetMapping("/atelier/{atelierId}/a-venir")
    public ResponseEntity<List<RendezVousListDTO>> getRendezVousAVenir(@PathVariable UUID atelierId) {
        List<RendezVousListDTO> rendezVous = rendezVousService.getRendezVousAVenir(atelierId);
        return ResponseEntity.ok(rendezVous);
    }

    @GetMapping("/atelier/{atelierId}/aujourdhui")
    public ResponseEntity<List<RendezVousListDTO>> getRendezVousAujourdhui(@PathVariable UUID atelierId) {
        List<RendezVousListDTO> rendezVous = rendezVousService.getRendezVousAujourdhui(atelierId);
        return ResponseEntity.ok(rendezVous);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RendezVousDTO> getRendezVousById(@PathVariable UUID id) {
        RendezVousDTO rendezVous = rendezVousService.getRendezVousById(id);
        return ResponseEntity.ok(rendezVous);
    }

    @PutMapping("/{id}/confirmer")
    public ResponseEntity<RendezVousDTO> confirmerRendezVous(@PathVariable UUID id) {
        RendezVousDTO rendezVous = rendezVousService.confirmerRendezVous(id);
        return ResponseEntity.ok(rendezVous);
    }

    @PutMapping("/{id}/annuler")
    public ResponseEntity<RendezVousDTO> annulerRendezVous(@PathVariable UUID id) {
        RendezVousDTO rendezVous = rendezVousService.annulerRendezVous(id);
        return ResponseEntity.ok(rendezVous);
    }

    @PutMapping("/{id}/terminer")
    public ResponseEntity<RendezVousDTO> terminerRendezVous(@PathVariable UUID id) {
        RendezVousDTO rendezVous = rendezVousService.terminerRendezVous(id);
        return ResponseEntity.ok(rendezVous);
    }
}