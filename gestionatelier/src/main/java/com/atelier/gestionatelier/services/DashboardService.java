package com.atelier.gestionatelier.services;

import com.atelier.gestionatelier.dto.*;
import com.atelier.gestionatelier.entities.*;
import com.atelier.gestionatelier.repositories.*;
import com.atelier.gestionatelier.security.Role;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private final AffectationRepository affectationRepository;
    private final ClientRepository clientRepository;
    private final UtilisateurRepository utilisateurRepository;
    private final AtelierRepository atelierRepository;
    private final PaiementRepository paiementRepository;
    private final RendezVousRepository rendezVousRepository;
    private final MesureRepository mesureRepository;

    // ========== DASHBOARD SUPER ADMIN ==========
    public DashboardSuperAdminDTO getDashboardSuperAdmin() {
        log.info("Chargement dashboard SuperAdmin");

        DashboardSuperAdminDTO dashboard = new DashboardSuperAdminDTO();

        try {
            // Statistiques globales basiques
            dashboard.setTotalAteliers(atelierRepository.count());
            dashboard.setTotalUtilisateurs(utilisateurRepository.count());
            dashboard.setTotalClients(clientRepository.count());
            dashboard.setTotalAffectations(affectationRepository.count());

            // Calculs financiers basiques
            List<Paiement> tousPaiements = paiementRepository.findAll();
            Double chiffreAffairesTotal = calculerChiffreAffairesTotal(tousPaiements);
            Double paiementsTailleursTotal = calculerPaiementsTailleursTotal(tousPaiements);

            dashboard.setChiffreAffairesTotal(chiffreAffairesTotal);
            dashboard.setPaiementsTailleursTotal(paiementsTailleursTotal);
            dashboard.setBeneficeNet(chiffreAffairesTotal - paiementsTailleursTotal);

            // Pas besoin des données complexes pour SuperAdmin
            dashboard.setChiffreAffairesMensuel(new HashMap<>());
            dashboard.setNouveauxAteliersMensuel(new HashMap<>());
            dashboard.setAteliersPerformants(new ArrayList<>());
            dashboard.setAlertes(new ArrayList<>());

        } catch (Exception e) {
            log.error("Erreur lors du chargement du dashboard SuperAdmin", e);
            return creerDashboardSuperAdminVide();
        }

        return dashboard;
    }

    // ========== DASHBOARD PROPRIETAIRE ==========
    public DashboardProprietaireDTO getDashboardProprietaire(UUID atelierId) {
        log.info("Chargement dashboard propriétaire pour atelier: {}", atelierId);

        DashboardProprietaireDTO dashboard = new DashboardProprietaireDTO();

        try {
            // Vérifier l'existence de l'atelier
            if (!atelierRepository.existsById(atelierId)) {
                log.warn("Atelier non trouvé: {}", atelierId);
                return creerDashboardProprietaireVide();
            }

            // Statistiques de base
            chargerStatistiquesBase(dashboard, atelierId);

            // Statistiques financières
            chargerStatistiquesFinancieres(dashboard, atelierId);

            // Données détaillées
            chargerDonneesDetaillees(dashboard, atelierId);

        } catch (Exception e) {
            log.error("Erreur lors du chargement du dashboard propriétaire", e);
            return creerDashboardProprietaireVide();
        }

        return dashboard;
    }

    // ========== DASHBOARD TAILLEUR ==========
    public DashboardTailleurDTO getDashboardTailleur(UUID tailleurId) {
        log.info("Chargement dashboard tailleur: {}", tailleurId);

        DashboardTailleurDTO dashboard = new DashboardTailleurDTO();

        try {
            // Récupérer l'utilisateur tailleur
            Optional<Utilisateur> tailleurOpt = utilisateurRepository.findById(tailleurId);
            if (tailleurOpt.isEmpty() || tailleurOpt.get().getRole() != Role.TAILLEUR) {
                log.warn("Tailleur non trouvé ou n'est pas un tailleur: {}", tailleurId);
                return creerDashboardTailleurVide();
            }

            List<Affectation> affectationsTailleur = getAffectationsTailleur(tailleurId);

            // Mes tâches
            chargerTachesTailleur(dashboard, affectationsTailleur);

            // Performances
            chargerPerformancesTailleur(dashboard, affectationsTailleur);

            // Revenus
            chargerRevenusTailleur(dashboard, tailleurId, affectationsTailleur);

            // Détails des affectations
            chargerDetailsAffectationsTailleur(dashboard, affectationsTailleur);

        } catch (Exception e) {
            log.error("Erreur lors du chargement du dashboard tailleur", e);
            return creerDashboardTailleurVide();
        }

        return dashboard;
    }

    // ========== DASHBOARD SECRETAIRE ==========
    public DashboardSecretaireDTO getDashboardSecretaire(UUID atelierId) {
        log.info("Chargement dashboard secrétaire pour atelier: {}", atelierId);

        DashboardSecretaireDTO dashboard = new DashboardSecretaireDTO();

        try {
            // Vérifier l'existence de l'atelier
            if (!atelierRepository.existsById(atelierId)) {
                log.warn("Atelier non trouvé: {}", atelierId);
                return creerDashboardSecretaireVide();
            }

            // Vue d'ensemble
            chargerVueEnsembleSecretaire(dashboard, atelierId);

            // Rendez-vous
            chargerRendezVousSecretaire(dashboard, atelierId);

            // Clients récents
            chargerClientsRecents(dashboard, atelierId);

            // Tâches du jour
            chargerTachesDuJour(dashboard, atelierId);

        } catch (Exception e) {
            log.error("Erreur lors du chargement du dashboard secrétaire", e);
            return creerDashboardSecretaireVide();
        }

        return dashboard;
    }

    // ========== MÉTHODES PRIVÉES - PROPRIETAIRE ==========
    private void chargerStatistiquesBase(DashboardProprietaireDTO dashboard, UUID atelierId) {
        dashboard.setTotalClients(clientRepository.countByAtelierId(atelierId));

        // Compter les utilisateurs par rôle
        List<Utilisateur> utilisateursAtelier = utilisateurRepository.findByAtelierId(atelierId);
        dashboard.setTotalTailleurs(compterUtilisateursParRole(utilisateursAtelier, Role.TAILLEUR));
        dashboard.setTotalSecretaires(compterUtilisateursParRole(utilisateursAtelier, Role.SECRETAIRE));

        // Compter les affectations
        List<Affectation> affectationsAtelier = getAffectationsAtelier(atelierId);
        dashboard.setAffectationsEnCours(compterAffectationsParStatut(affectationsAtelier,
                Affectation.StatutAffectation.EN_COURS));
        dashboard.setAffectationsTerminees(compterAffectationsTerminees(affectationsAtelier));
    }

    private void chargerStatistiquesFinancieres(DashboardProprietaireDTO dashboard, UUID atelierId) {
        LocalDate debutMois = LocalDate.now().withDayOfMonth(1);
        LocalDate finMois = LocalDate.now().withDayOfMonth(LocalDate.now().lengthOfMonth());

        List<Paiement> paiementsAtelier = paiementRepository.findByAtelierId(atelierId);

        Double caMensuel = calculerCAMensuel(paiementsAtelier, debutMois, finMois);
        Double paiementsTailleursMensuel = calculerPaiementsTailleursMensuels(paiementsAtelier, debutMois, finMois);

        dashboard.setChiffreAffairesMensuel(caMensuel != null ? caMensuel : 0.0);
        dashboard.setPaiementsTailleursMensuel(paiementsTailleursMensuel != null ? paiementsTailleursMensuel : 0.0);
        dashboard.setBeneficeMensuel(dashboard.getChiffreAffairesMensuel() - dashboard.getPaiementsTailleursMensuel());
    }

    private void chargerDonneesDetaillees(DashboardProprietaireDTO dashboard, UUID atelierId) {
        List<Affectation> affectationsAtelier = getAffectationsAtelier(atelierId);

        dashboard.setAffectationsParStatut(calculerRepartitionStatut(affectationsAtelier));
        dashboard.setPerformanceTailleurs(calculerPerformanceTailleurs(atelierId, affectationsAtelier));
        dashboard.setRendezVousProchains(getRendezVousProchains(atelierId));
        dashboard.setTachesUrgentes(getTachesUrgentes(atelierId, affectationsAtelier));
    }

    // ========== MÉTHODES PRIVÉES - TAILLEUR ==========
    private void chargerTachesTailleur(DashboardTailleurDTO dashboard, List<Affectation> affectations) {
        dashboard.setAffectationsEnAttente(compterAffectationsParStatut(affectations,
                Affectation.StatutAffectation.EN_ATTENTE));
        dashboard.setAffectationsEnCours(compterAffectationsParStatut(affectations,
                Affectation.StatutAffectation.EN_COURS));

        LocalDate debutSemaine = LocalDate.now().minusDays(7);
        dashboard.setAffectationsTermineesSemaine(affectations.stream()
                .filter(a -> a.getStatut() == Affectation.StatutAffectation.TERMINE ||
                        a.getStatut() == Affectation.StatutAffectation.VALIDE)
                .filter(a -> a.getDateFinReelle() != null &&
                        a.getDateFinReelle().toLocalDate().isAfter(debutSemaine.minusDays(1)))
                .count());
    }

    private void chargerPerformancesTailleur(DashboardTailleurDTO dashboard, List<Affectation> affectations) {
        dashboard.setTauxCompletion(calculerTauxCompletion(affectations));
        dashboard.setMoyenneTempsRealisation(calculerMoyenneTempsRealisation(affectations));
        dashboard.setRetardCount(compterRetards(affectations));
    }

    private void chargerRevenusTailleur(DashboardTailleurDTO dashboard, UUID tailleurId, List<Affectation> affectations) {
        dashboard.setRevenusMensuels(calculerRevenusMensuels(tailleurId));
        dashboard.setRevenusEnAttente(calculerRevenusEnAttente(affectations));
    }

    private void chargerDetailsAffectationsTailleur(DashboardTailleurDTO dashboard, List<Affectation> affectations) {
        dashboard.setAffectationsEnCoursList(creerAffectationsTailleurDTO(
                affectations, Affectation.StatutAffectation.EN_COURS));
        dashboard.setAffectationsEnAttenteList(creerAffectationsTailleurDTO(
                affectations, Affectation.StatutAffectation.EN_ATTENTE));
        dashboard.setProchainesEcheances(creerEcheancesTailleur(affectations));
    }

    // ========== MÉTHODES PRIVÉES - SECRETAIRE ==========
    private void chargerVueEnsembleSecretaire(DashboardSecretaireDTO dashboard, UUID atelierId) {
        LocalDate debutSemaine = LocalDate.now().minusDays(7);

        dashboard.setNouveauxClientsSemaine(clientRepository.findByAtelierId(atelierId).stream()
                .filter(c -> c.getDateCreation().toLocalDate().isAfter(debutSemaine.minusDays(1)))
                .count());

        dashboard.setRendezVousAujourdhui((long) rendezVousRepository.findRendezVousAujourdhui(atelierId).size());

        List<Affectation> affectationsAtelier = getAffectationsAtelier(atelierId);
        dashboard.setAffectationsEnAttente(compterAffectationsParStatut(affectationsAtelier,
                Affectation.StatutAffectation.EN_ATTENTE));

        dashboard.setPaiementsAttente(affectationsAtelier.stream()
                .filter(a -> (a.getStatut() == Affectation.StatutAffectation.TERMINE ||
                        a.getStatut() == Affectation.StatutAffectation.VALIDE) &&
                        !estAffectationPayee(a))
                .count());
    }

    private void chargerRendezVousSecretaire(DashboardSecretaireDTO dashboard, UUID atelierId) {
        dashboard.setRendezVousAujourdhuiList(creerRendezVousAujourdhui(atelierId));
        dashboard.setRendezVousSemaine(creerRendezVousSemaine(atelierId));
    }

    private void chargerClientsRecents(DashboardSecretaireDTO dashboard, UUID atelierId) {
        dashboard.setClientsRecents(clientRepository.findByAtelierId(atelierId).stream()
                .sorted(Comparator.comparing(Client::getDateCreation).reversed())
                .limit(5)
                .map(this::creerClientRecentDTO)
                .collect(Collectors.toList()));
    }

    private void chargerTachesDuJour(DashboardSecretaireDTO dashboard, UUID atelierId) {
        dashboard.setTachesDuJour(creerTachesDuJour(atelierId));
        dashboard.setPaiementsEnAttente(creerPaiementsEnAttente(getAffectationsAtelier(atelierId)));
    }

    // ========== MÉTHODES MANQUANTES À IMPLÉMENTER ==========

    // Méthode pour calculer la répartition par statut
    private Map<String, Long> calculerRepartitionStatut(List<Affectation> affectations) {
        return affectations.stream()
                .collect(Collectors.groupingBy(
                        a -> a.getStatut().name(),
                        Collectors.counting()
                ));
    }

    // Méthode pour calculer le taux de completion
    private Double calculerTauxCompletion(List<Affectation> affectations) {
        long total = affectations.size();
        long terminees = compterAffectationsTerminees(affectations);
        return total > 0 ? (double) terminees / total * 100 : 0.0;
    }

    // Méthode pour calculer la moyenne de temps de réalisation
    private Double calculerMoyenneTempsRealisation(List<Affectation> affectations) {
        List<Affectation> affectationsAvecDates = affectations.stream()
                .filter(a -> a.getDateDebutReelle() != null && a.getDateFinReelle() != null)
                .collect(Collectors.toList());

        if (affectationsAvecDates.isEmpty()) return 0.0;

        double totalHeures = affectationsAvecDates.stream()
                .mapToDouble(a -> java.time.Duration.between(a.getDateDebutReelle(), a.getDateFinReelle()).toHours())
                .sum();

        return totalHeures / affectationsAvecDates.size();
    }

    // Méthode pour compter les retards
    private Integer compterRetards(List<Affectation> affectations) {
        return (int) affectations.stream()
                .filter(a -> a.getDateEcheance() != null &&
                        a.getDateEcheance().isBefore(LocalDate.now()) &&
                        (a.getStatut() == Affectation.StatutAffectation.EN_ATTENTE ||
                                a.getStatut() == Affectation.StatutAffectation.EN_COURS))
                .count();
    }

    // Méthode pour calculer les revenus mensuels du tailleur
    private Double calculerRevenusMensuels(UUID tailleurId) {
        LocalDate debutMois = LocalDate.now().withDayOfMonth(1);
        return paiementRepository.findAll().stream()
                .filter(p -> p.getTailleur() != null &&
                        p.getTailleur().getId().equals(tailleurId) &&
                        p.getTypePaiement() == Paiement.TypePaiement.TAILLEUR &&
                        p.getDatePaiement().toLocalDate().isAfter(debutMois.minusDays(1)))
                .mapToDouble(Paiement::getMontant)
                .sum();
    }

    // Méthode pour calculer les revenus en attente
    private Double calculerRevenusEnAttente(List<Affectation> affectations) {
        return affectations.stream()
                .filter(a -> (a.getStatut() == Affectation.StatutAffectation.TERMINE ||
                        a.getStatut() == Affectation.StatutAffectation.VALIDE) &&
                        !estAffectationPayee(a))
                .mapToDouble(Affectation::getPrixTailleur)
                .sum();
    }

    // Méthode pour créer les paiements en attente
    private List<DashboardSecretaireDTO.PaiementAttenteDTO> creerPaiementsEnAttente(List<Affectation> affectations) {
        return affectations.stream()
                .filter(a -> (a.getStatut() == Affectation.StatutAffectation.TERMINE ||
                        a.getStatut() == Affectation.StatutAffectation.VALIDE) &&
                        !estAffectationPayee(a))
                .map(a -> {
                    DashboardSecretaireDTO.PaiementAttenteDTO dto =
                            new DashboardSecretaireDTO.PaiementAttenteDTO();
                    dto.setClientNom(getNomClient(a.getClient()));
                    dto.setMontant(a.getPrixTailleur());
                    dto.setTypeVetement(a.getMesure() != null ? a.getMesure().getTypeVetement() : "Non spécifié");
                    dto.setDateEcheance(a.getDateEcheance() != null ?
                            a.getDateEcheance().atStartOfDay() : LocalDateTime.now());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    // Méthode utilitaire pour obtenir le nom du client
    private String getNomClient(Client client) {
        return client != null ? client.getPrenom() + " " + client.getNom() : "Client inconnu";
    }

    // ========== MÉTHODES DE CRÉATION D'OBJETS DTO ==========
    private List<DashboardTailleurDTO.AffectationTailleurDTO> creerAffectationsTailleurDTO(
            List<Affectation> affectations, Affectation.StatutAffectation statut) {

        return affectations.stream()
                .filter(a -> a.getStatut() == statut)
                .map(a -> {
                    DashboardTailleurDTO.AffectationTailleurDTO dto =
                            new DashboardTailleurDTO.AffectationTailleurDTO();
                    dto.setId(a.getId());
                    dto.setClientNom(getNomClient(a.getClient()));
                    dto.setTypeVetement(a.getMesure() != null ? a.getMesure().getTypeVetement() : "Non spécifié");
                    dto.setDateEcheance(a.getDateEcheance());
                    dto.setStatut(a.getStatut().name());
                    dto.setPrixTailleur(a.getPrixTailleur());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    private List<DashboardTailleurDTO.EcheanceDTO> creerEcheancesTailleur(List<Affectation> affectations) {
        return affectations.stream()
                .filter(a -> a.getDateEcheance() != null &&
                        a.getDateEcheance().isAfter(LocalDate.now().minusDays(1)) &&
                        (a.getStatut() == Affectation.StatutAffectation.EN_ATTENTE ||
                                a.getStatut() == Affectation.StatutAffectation.EN_COURS))
                .sorted(Comparator.comparing(Affectation::getDateEcheance))
                .limit(5)
                .map(a -> {
                    DashboardTailleurDTO.EcheanceDTO dto = new DashboardTailleurDTO.EcheanceDTO();
                    dto.setClientNom(getNomClient(a.getClient()));
                    dto.setTypeVetement(a.getMesure() != null ? a.getMesure().getTypeVetement() : "Non spécifié");
                    dto.setDateEcheance(a.getDateEcheance());
                    dto.setJoursRestants((int) java.time.temporal.ChronoUnit.DAYS.between(
                            LocalDate.now(), a.getDateEcheance()));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    private List<DashboardSecretaireDTO.RendezVousSecretaireDTO> creerRendezVousAujourdhui(UUID atelierId) {
        return rendezVousRepository.findRendezVousAujourdhui(atelierId).stream()
                .map(rdv -> {
                    DashboardSecretaireDTO.RendezVousSecretaireDTO dto =
                            new DashboardSecretaireDTO.RendezVousSecretaireDTO();
                    dto.setDateHeure(rdv.getDateRDV());
                    dto.setClientNom(getNomClient(rdv.getClient()));
                    dto.setType(rdv.getTypeRendezVous());
                    dto.setNotes(rdv.getNotes());
                    dto.setStatut(rdv.getStatut());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    private List<DashboardSecretaireDTO.RendezVousSecretaireDTO> creerRendezVousSemaine(UUID atelierId) {
        LocalDateTime debutSemaine = LocalDateTime.now().withHour(0).withMinute(0);
        LocalDateTime finSemaine = debutSemaine.plusDays(7);

        return rendezVousRepository.findByAtelierIdAndDateRDVBetween(atelierId, debutSemaine, finSemaine).stream()
                .map(rdv -> {
                    DashboardSecretaireDTO.RendezVousSecretaireDTO dto =
                            new DashboardSecretaireDTO.RendezVousSecretaireDTO();
                    dto.setDateHeure(rdv.getDateRDV());
                    dto.setClientNom(getNomClient(rdv.getClient()));
                    dto.setType(rdv.getTypeRendezVous());
                    dto.setNotes(rdv.getNotes());
                    dto.setStatut(rdv.getStatut());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    private DashboardSecretaireDTO.ClientRecentDTO creerClientRecentDTO(Client client) {
        DashboardSecretaireDTO.ClientRecentDTO dto = new DashboardSecretaireDTO.ClientRecentDTO();
        dto.setNomComplet(client.getPrenom() + " " + client.getNom());
        dto.setContact(client.getContact());
        dto.setDateCreation(client.getDateCreation());

        long totalCommandes = affectationRepository.findAll().stream()
                .filter(a -> a.getClient() != null && a.getClient().getId().equals(client.getId()))
                .count();
        dto.setTotalCommandes(totalCommandes);

        return dto;
    }

    private List<DashboardSecretaireDTO.TacheDTO> creerTachesDuJour(UUID atelierId) {
        List<DashboardSecretaireDTO.TacheDTO> taches = new ArrayList<>();

        try {
            // Tâche : Confirmer les rendez-vous
            List<RendezVous> rdvAujourdhui = rendezVousRepository.findRendezVousAujourdhui(atelierId);
            long rdvAConfirmer = rdvAujourdhui.stream()
                    .filter(rdv -> "PLANIFIE".equals(rdv.getStatut()))
                    .count();

            if (rdvAConfirmer > 0) {
                DashboardSecretaireDTO.TacheDTO tache = new DashboardSecretaireDTO.TacheDTO();
                tache.setType("CONFIRMER_RDV");
                tache.setDescription("Confirmer " + rdvAConfirmer + " rendez-vous aujourd'hui");
                tache.setTermine(false);
                tache.setEcheance(LocalDateTime.now().withHour(12).withMinute(0));
                taches.add(tache);
            }

            // Tâche : Affecter les mesures non affectées
            long mesuresNonAffectees = mesureRepository.findMesuresNonAffecteesByAtelier(atelierId).size();
            if (mesuresNonAffectees > 0) {
                DashboardSecretaireDTO.TacheDTO tache = new DashboardSecretaireDTO.TacheDTO();
                tache.setType("AFFECTER_MESURES");
                tache.setDescription("Affecter " + mesuresNonAffectees + " mesure(s) non affectée(s)");
                tache.setTermine(false);
                tache.setEcheance(LocalDateTime.now().withHour(16).withMinute(0));
                taches.add(tache);
            }

        } catch (Exception e) {
            log.warn("Erreur lors de la création des tâches du jour", e);
        }

        return taches;
    }

    // ========== MÉTHODES UTILITAIRES GÉNÉRALES ==========
    private long compterUtilisateursParRole(List<Utilisateur> utilisateurs, Role role) {
        return utilisateurs.stream()
                .filter(u -> u.getRole() == role && Boolean.TRUE.equals(u.getActif()))
                .count();
    }

    private long compterAffectationsParStatut(List<Affectation> affectations, Affectation.StatutAffectation statut) {
        return affectations.stream()
                .filter(a -> a.getStatut() == statut)
                .count();
    }

    private long compterAffectationsTerminees(List<Affectation> affectations) {
        return affectations.stream()
                .filter(a -> a.getStatut() == Affectation.StatutAffectation.TERMINE ||
                        a.getStatut() == Affectation.StatutAffectation.VALIDE)
                .count();
    }

    private List<Affectation> getAffectationsAtelier(UUID atelierId) {
        try {
            return affectationRepository.findByAtelierIdWithRelations(atelierId);
        } catch (Exception e) {
            log.warn("Erreur lors de la récupération des affectations, utilisation du fallback", e);
            // Fallback: récupérer toutes les affectations et filtrer
            return affectationRepository.findAll().stream()
                    .filter(a -> a.getAtelier() != null && a.getAtelier().getId().equals(atelierId))
                    .collect(Collectors.toList());
        }
    }

    private List<Affectation> getAffectationsTailleur(UUID tailleurId) {
        return affectationRepository.findAll().stream()
                .filter(a -> a.getTailleur() != null && a.getTailleur().getId().equals(tailleurId))
                .collect(Collectors.toList());
    }

    // ========== MÉTHODES DE CALCUL FINANCIER ==========
    private Double calculerChiffreAffairesTotal(List<Paiement> paiements) {
        return paiements.stream()
                .filter(p -> p.getTypePaiement() == Paiement.TypePaiement.CLIENT)
                .mapToDouble(Paiement::getMontant)
                .sum();
    }

    private Double calculerPaiementsTailleursTotal(List<Paiement> paiements) {
        return paiements.stream()
                .filter(p -> p.getTypePaiement() == Paiement.TypePaiement.TAILLEUR)
                .mapToDouble(Paiement::getMontant)
                .sum();
    }

    private Double calculerCAMensuel(List<Paiement> paiements, LocalDate debutMois, LocalDate finMois) {
        return paiements.stream()
                .filter(p -> estDansPeriode(p.getDatePaiement(), debutMois, finMois))
                .filter(p -> p.getTypePaiement() == Paiement.TypePaiement.CLIENT)
                .mapToDouble(Paiement::getMontant)
                .sum();
    }

    private Double calculerPaiementsTailleursMensuels(List<Paiement> paiements, LocalDate debutMois, LocalDate finMois) {
        return paiements.stream()
                .filter(p -> estDansPeriode(p.getDatePaiement(), debutMois, finMois))
                .filter(p -> p.getTypePaiement() == Paiement.TypePaiement.TAILLEUR)
                .mapToDouble(Paiement::getMontant)
                .sum();
    }

    private boolean estDansPeriode(LocalDateTime date, LocalDate debut, LocalDate fin) {
        if (date == null) return false;
        LocalDate dateOnly = date.toLocalDate();
        return !dateOnly.isBefore(debut) && !dateOnly.isAfter(fin);
    }

    private boolean estAffectationPayee(Affectation affectation) {
        // Logique simplifiée - à adapter selon votre modèle
        return paiementRepository.findAll().stream()
                .anyMatch(p -> p.getTailleur() != null &&
                        p.getTailleur().getId().equals(affectation.getTailleur().getId()) &&
                        Objects.equals(p.getMontant(), affectation.getPrixTailleur()));
    }

    // ========== MÉTHODES DE CRÉATION D'OBJETS DTO ==========
    private List<DashboardProprietaireDTO.TailleurPerformanceDTO> calculerPerformanceTailleurs(
            UUID atelierId, List<Affectation> affectations) {

        List<Utilisateur> tailleurs = utilisateurRepository.findByAtelierId(atelierId).stream()
                .filter(u -> u.getRole() == Role.TAILLEUR)
                .collect(Collectors.toList());

        return tailleurs.stream()
                .map(tailleur -> {
                    DashboardProprietaireDTO.TailleurPerformanceDTO perf =
                            new DashboardProprietaireDTO.TailleurPerformanceDTO();

                    perf.setNomTailleur(tailleur.getPrenom() + " " + tailleur.getNom());

                    List<Affectation> affectationsTailleur = affectations.stream()
                            .filter(a -> a.getTailleur() != null && a.getTailleur().getId().equals(tailleur.getId()))
                            .collect(Collectors.toList());

                    perf.setAffectationsTerminees(compterAffectationsTerminees(affectationsTailleur));

                    perf.setAffectationsEnRetard(affectationsTailleur.stream()
                            .filter(a -> a.getDateEcheance() != null &&
                                    a.getDateEcheance().isBefore(LocalDate.now()) &&
                                    (a.getStatut() == Affectation.StatutAffectation.EN_ATTENTE ||
                                            a.getStatut() == Affectation.StatutAffectation.EN_COURS))
                            .count());

                    long total = affectationsTailleur.size();
                    long terminees = perf.getAffectationsTerminees();
                    perf.setSatisfactionMoyenne(total > 0 ? (double) terminees / total * 100 : 0.0);

                    return perf;
                })
                .collect(Collectors.toList());
    }

    private List<DashboardProprietaireDTO.RendezVousDTO> getRendezVousProchains(UUID atelierId) {
        try {
            return rendezVousRepository.findRendezVousAVenir(atelierId, LocalDateTime.now()).stream()
                    .limit(5)
                    .map(rdv -> {
                        DashboardProprietaireDTO.RendezVousDTO dto =
                                new DashboardProprietaireDTO.RendezVousDTO();
                        dto.setDate(rdv.getDateRDV());
                        dto.setClientNom(getNomClient(rdv.getClient()));
                        dto.setType(rdv.getTypeRendezVous());
                        dto.setStatut(rdv.getStatut());
                        return dto;
                    })
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.warn("Erreur lors de la récupération des rendez-vous", e);
            return new ArrayList<>();
        }
    }

    private List<DashboardProprietaireDTO.TacheUrgenteDTO> getTachesUrgentes(
            UUID atelierId, List<Affectation> affectations) {

        List<DashboardProprietaireDTO.TacheUrgenteDTO> taches = new ArrayList<>();

        // Affectations en retard
        long retardCount = affectations.stream()
                .filter(a -> a.getDateEcheance() != null &&
                        a.getDateEcheance().isBefore(LocalDate.now()) &&
                        (a.getStatut() == Affectation.StatutAffectation.EN_ATTENTE ||
                                a.getStatut() == Affectation.StatutAffectation.EN_COURS))
                .count();

        if (retardCount > 0) {
            DashboardProprietaireDTO.TacheUrgenteDTO tache = new DashboardProprietaireDTO.TacheUrgenteDTO();
            tache.setType("RETARD");
            tache.setDescription(retardCount + " commande(s) en retard");
            tache.setPriorite("HAUTE");
            taches.add(tache);
        }

        return taches;
    }

    // ========== MÉTHODES DE CRÉATION DE DASHBOARDS VIDES ==========
    private DashboardSuperAdminDTO creerDashboardSuperAdminVide() {
        DashboardSuperAdminDTO dashboard = new DashboardSuperAdminDTO();
        dashboard.setTotalAteliers(0L);
        dashboard.setTotalUtilisateurs(0L);
        dashboard.setTotalClients(0L);
        dashboard.setTotalAffectations(0L);
        dashboard.setChiffreAffairesTotal(0.0);
        dashboard.setPaiementsTailleursTotal(0.0);
        dashboard.setBeneficeNet(0.0);
        dashboard.setChiffreAffairesMensuel(new HashMap<>());
        dashboard.setNouveauxAteliersMensuel(new HashMap<>());
        dashboard.setAteliersPerformants(new ArrayList<>());
        dashboard.setAlertes(new ArrayList<>());
        return dashboard;
    }

    private DashboardProprietaireDTO creerDashboardProprietaireVide() {
        DashboardProprietaireDTO dashboard = new DashboardProprietaireDTO();
        dashboard.setTotalClients(0L);
        dashboard.setTotalTailleurs(0L);
        dashboard.setTotalSecretaires(0L);
        dashboard.setAffectationsEnCours(0L);
        dashboard.setAffectationsTerminees(0L);
        dashboard.setChiffreAffairesMensuel(0.0);
        dashboard.setPaiementsTailleursMensuel(0.0);
        dashboard.setBeneficeMensuel(0.0);
        dashboard.setAffectationsParStatut(new HashMap<>());
        dashboard.setPerformanceTailleurs(new ArrayList<>());
        dashboard.setRendezVousProchains(new ArrayList<>());
        dashboard.setTachesUrgentes(new ArrayList<>());
        return dashboard;
    }

    private DashboardTailleurDTO creerDashboardTailleurVide() {
        DashboardTailleurDTO dashboard = new DashboardTailleurDTO();
        dashboard.setAffectationsEnAttente(0L);
        dashboard.setAffectationsEnCours(0L);
        dashboard.setAffectationsTermineesSemaine(0L);
        dashboard.setTauxCompletion(0.0);
        dashboard.setMoyenneTempsRealisation(0.0);
        dashboard.setRetardCount(0);
        dashboard.setRevenusMensuels(0.0);
        dashboard.setRevenusEnAttente(0.0);
        dashboard.setAffectationsEnCoursList(new ArrayList<>());
        dashboard.setAffectationsEnAttenteList(new ArrayList<>());
        dashboard.setProchainesEcheances(new ArrayList<>());
        return dashboard;
    }

    private DashboardSecretaireDTO creerDashboardSecretaireVide() {
        DashboardSecretaireDTO dashboard = new DashboardSecretaireDTO();
        dashboard.setNouveauxClientsSemaine(0L);
        dashboard.setRendezVousAujourdhui(0L);
        dashboard.setAffectationsEnAttente(0L);
        dashboard.setPaiementsAttente(0L);
        dashboard.setTachesDuJour(new ArrayList<>());
        dashboard.setRendezVousAujourdhuiList(new ArrayList<>());
        dashboard.setRendezVousSemaine(new ArrayList<>());
        dashboard.setClientsRecents(new ArrayList<>());
        dashboard.setPaiementsEnAttente(new ArrayList<>());
        return dashboard;
    }

    // Ajouter ces méthodes dans la classe DashboardService

    // ========== STATISTIQUES DÉTAILLÉES ==========
    public Map<String, Object> getStatistiquesDetaillees(UUID atelierId, LocalDate dateDebut, LocalDate dateFin) {
        log.info("Chargement statistiques détaillées pour atelier: {} - Période: {} à {}",
                atelierId, dateDebut, dateFin);

        Map<String, Object> statistiques = new HashMap<>();

        try {
            // Vérifier l'existence de l'atelier
            if (!atelierRepository.existsById(atelierId)) {
                log.warn("Atelier non trouvé pour statistiques: {}", atelierId);
                return creerStatistiquesVides();
            }

            // Récupérer les données de base
            List<Affectation> affectations = getAffectationsAtelier(atelierId);
            List<Paiement> paiements = paiementRepository.findByAtelierId(atelierId);
            List<Client> clients = clientRepository.findByAtelierId(atelierId);

            // Filtrer par période
            List<Affectation> affectationsPeriode = filtrerAffectationsParPeriode(affectations, dateDebut, dateFin);
            List<Paiement> paiementsPeriode = filtrerPaiementsParPeriode(paiements, dateDebut, dateFin);

            // Calculer les statistiques
            chargerStatistiquesBaseDetaillees(statistiques, affectationsPeriode, clients, dateDebut);
            chargerStatistiquesFinancieresDetaillees(statistiques, paiementsPeriode);
            chargerRepartitionsDetaillees(statistiques, affectationsPeriode);
            chargerPerformanceTailleursDetaillee(statistiques, atelierId, affectationsPeriode);

            statistiques.put("periode", Map.of("debut", dateDebut, "fin", dateFin));
            statistiques.put("timestamp", LocalDateTime.now());

        } catch (Exception e) {
            log.error("Erreur lors du chargement des statistiques détaillées", e);
            return creerStatistiquesVides();
        }

        return statistiques;
    }

    public Map<String, Object> getStatistiquesTailleur(UUID tailleurId) {
        log.info("Chargement statistiques tailleur: {}", tailleurId);

        Map<String, Object> statistiques = new HashMap<>();

        try {
            // Vérifier que c'est bien un tailleur
            Optional<Utilisateur> tailleurOpt = utilisateurRepository.findById(tailleurId);
            if (tailleurOpt.isEmpty() || tailleurOpt.get().getRole() != Role.TAILLEUR) {
                log.warn("Utilisateur non trouvé ou n'est pas un tailleur: {}", tailleurId);
                return creerStatistiquesTailleurVides();
            }

            List<Affectation> affectationsTailleur = getAffectationsTailleur(tailleurId);

            // Statistiques de base
            statistiques.put("totalAffectations", affectationsTailleur.size());
            statistiques.put("affectationsTerminees", compterAffectationsTerminees(affectationsTailleur));
            statistiques.put("affectationsEnCours", compterAffectationsParStatut(affectationsTailleur,
                    Affectation.StatutAffectation.EN_COURS));

            // Revenus
            Double revenusTotaux = affectationsTailleur.stream()
                    .mapToDouble(Affectation::getPrixTailleur)
                    .sum();
            statistiques.put("revenusTotaux", revenusTotaux);

            // Taux de satisfaction
            statistiques.put("tauxSatisfaction", calculerTauxSatisfactionTailleur(affectationsTailleur));

            // Temps moyen de réalisation
            statistiques.put("tempsMoyenRealisation", calculerMoyenneTempsRealisation(affectationsTailleur));

            // Détails supplémentaires
            statistiques.put("affectationsParStatut", calculerRepartitionStatut(affectationsTailleur));
            statistiques.put("dernieresAffectations", creerDernieresAffectationsTailleur(affectationsTailleur));
            statistiques.put("timestamp", LocalDateTime.now());

        } catch (Exception e) {
            log.error("Erreur lors du chargement des statistiques tailleur", e);
            return creerStatistiquesTailleurVides();
        }

        return statistiques;
    }

    // ========== MÉTHODES PRIVÉES POUR LES STATISTIQUES ==========
    private void chargerStatistiquesBaseDetaillees(Map<String, Object> statistiques,
                                                   List<Affectation> affectations,
                                                   List<Client> clients,
                                                   LocalDate dateDebut) {

        statistiques.put("totalAffectations", affectations.size());
        statistiques.put("totalClients", clients.size());
        statistiques.put("nouveauxClients", clients.stream()
                .filter(c -> c.getDateCreation().toLocalDate().isAfter(dateDebut.minusDays(1)))
                .count());
    }

    private void chargerStatistiquesFinancieresDetaillees(Map<String, Object> statistiques, List<Paiement> paiements) {
        Double chiffreAffaires = paiements.stream()
                .filter(p -> p.getTypePaiement() == Paiement.TypePaiement.CLIENT)
                .mapToDouble(Paiement::getMontant)
                .sum();

        Double paiementsTailleurs = paiements.stream()
                .filter(p -> p.getTypePaiement() == Paiement.TypePaiement.TAILLEUR)
                .mapToDouble(Paiement::getMontant)
                .sum();

        statistiques.put("chiffreAffaires", chiffreAffaires);
        statistiques.put("paiementsTailleurs", paiementsTailleurs);
        statistiques.put("beneficeNet", chiffreAffaires - paiementsTailleurs);
    }

    private void chargerRepartitionsDetaillees(Map<String, Object> statistiques, List<Affectation> affectations) {
        // Répartition par statut
        Map<String, Long> repartitionStatut = affectations.stream()
                .collect(Collectors.groupingBy(
                        a -> a.getStatut().name(),
                        Collectors.counting()
                ));
        statistiques.put("repartitionStatut", repartitionStatut);

        // Répartition par type de vêtement
        Map<String, Long> repartitionTypeVetement = affectations.stream()
                .collect(Collectors.groupingBy(
                        a -> a.getMesure() != null ? a.getMesure().getTypeVetement() : "Non spécifié",
                        Collectors.counting()
                ));
        statistiques.put("repartitionTypeVetement", repartitionTypeVetement);
    }

    private void chargerPerformanceTailleursDetaillee(Map<String, Object> statistiques,
                                                      UUID atelierId,
                                                      List<Affectation> affectations) {

        List<Utilisateur> tailleurs = utilisateurRepository.findByAtelierId(atelierId).stream()
                .filter(u -> u.getRole() == Role.TAILLEUR)
                .collect(Collectors.toList());

        List<Map<String, Object>> performanceTailleurs = tailleurs.stream()
                .map(tailleur -> {
                    Map<String, Object> perf = new HashMap<>();
                    perf.put("nom", tailleur.getPrenom() + " " + tailleur.getNom());

                    List<Affectation> affectationsTailleur = affectations.stream()
                            .filter(a -> a.getTailleur() != null && a.getTailleur().getId().equals(tailleur.getId()))
                            .collect(Collectors.toList());

                    perf.put("totalAffectations", affectationsTailleur.size());
                    perf.put("affectationsTerminees", compterAffectationsTerminees(affectationsTailleur));
                    perf.put("tauxCompletion", calculerTauxCompletion(affectationsTailleur));
                    perf.put("retardCount", compterRetards(affectationsTailleur));

                    return perf;
                })
                .collect(Collectors.toList());

        statistiques.put("performanceTailleurs", performanceTailleurs);
    }

    private List<Affectation> filtrerAffectationsParPeriode(List<Affectation> affectations,
                                                            LocalDate dateDebut,
                                                            LocalDate dateFin) {
        return affectations.stream()
                .filter(a -> a.getDateCreation().toLocalDate().isAfter(dateDebut.minusDays(1)) &&
                        a.getDateCreation().toLocalDate().isBefore(dateFin.plusDays(1)))
                .collect(Collectors.toList());
    }

    private List<Paiement> filtrerPaiementsParPeriode(List<Paiement> paiements,
                                                      LocalDate dateDebut,
                                                      LocalDate dateFin) {
        return paiements.stream()
                .filter(p -> p.getDatePaiement().toLocalDate().isAfter(dateDebut.minusDays(1)) &&
                        p.getDatePaiement().toLocalDate().isBefore(dateFin.plusDays(1)))
                .collect(Collectors.toList());
    }

    private Double calculerTauxSatisfactionTailleur(List<Affectation> affectations) {
        // Logique simplifiée - à adapter selon vos besoins
        long totalValidees = affectations.stream()
                .filter(a -> a.getStatut() == Affectation.StatutAffectation.VALIDE)
                .count();

        return affectations.size() > 0 ? (double) totalValidees / affectations.size() * 100 : 0.0;
    }

    private List<Map<String, Object>> creerDernieresAffectationsTailleur(List<Affectation> affectations) {
        return affectations.stream()
                .sorted(Comparator.comparing(Affectation::getDateCreation).reversed())
                .limit(10)
                .map(a -> {
                    Map<String, Object> affectationMap = new HashMap<>();
                    affectationMap.put("id", a.getId());
                    affectationMap.put("client", getNomClient(a.getClient()));
                    affectationMap.put("typeVetement", a.getMesure() != null ? a.getMesure().getTypeVetement() : "Non spécifié");
                    affectationMap.put("statut", a.getStatut().name());
                    affectationMap.put("dateCreation", a.getDateCreation());
                    affectationMap.put("prixTailleur", a.getPrixTailleur());
                    return affectationMap;
                })
                .collect(Collectors.toList());
    }

    // ========== MÉTHODES DE CRÉATION D'OBJETS VIDES ==========
    private Map<String, Object> creerStatistiquesVides() {
        Map<String, Object> statistiques = new HashMap<>();
        statistiques.put("totalAffectations", 0);
        statistiques.put("totalClients", 0);
        statistiques.put("nouveauxClients", 0);
        statistiques.put("chiffreAffaires", 0.0);
        statistiques.put("paiementsTailleurs", 0.0);
        statistiques.put("beneficeNet", 0.0);
        statistiques.put("repartitionStatut", new HashMap<>());
        statistiques.put("repartitionTypeVetement", new HashMap<>());
        statistiques.put("performanceTailleurs", new ArrayList<>());
        statistiques.put("periode", Map.of("debut", LocalDate.now(), "fin", LocalDate.now()));
        statistiques.put("timestamp", LocalDateTime.now());
        return statistiques;
    }

    private Map<String, Object> creerStatistiquesTailleurVides() {
        Map<String, Object> statistiques = new HashMap<>();
        statistiques.put("totalAffectations", 0);
        statistiques.put("affectationsTerminees", 0);
        statistiques.put("affectationsEnCours", 0);
        statistiques.put("revenusTotaux", 0.0);
        statistiques.put("tauxSatisfaction", 0.0);
        statistiques.put("tempsMoyenRealisation", 0.0);
        statistiques.put("affectationsParStatut", new HashMap<>());
        statistiques.put("dernieresAffectations", new ArrayList<>());
        statistiques.put("timestamp", LocalDateTime.now());
        return statistiques;
    }



}