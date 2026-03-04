import React from 'react';

const Documentation = () => {
  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h4 className="card-title">Documentation de l'Application ATELIKO</h4>
              <p className="card-title-desc">
                Guide complet d'utilisation de l'application de gestion d'atelier de couture
              </p>
            </div>
            <div className="card-body">
              <div className="documentation-content">
                <div className="alert alert-primary">
                  <h5>À propos d'ATELIKO</h5>
                  <p>ATELIKO est une application complète de gestion d'atelier de couture qui facilite la gestion des clients, des commandes, des rendez-vous et des paiements. Que vous soyez propriétaire d'atelier, secrétaire ou tailleur, cette plateforme vous offre tous les outils nécessaires pour optimiser votre activité et améliorer votre productivité.</p>
                </div>

                <div className="d-flex justify-content-end mb-3">
                  <button className="btn btn-outline-primary me-2" onClick={() => alert('Téléchargement PDF - Contactez l\'administrateur')}>
                    <i className="bx bx-file"></i> Télécharger PDF
                  </button>
                  <button className="btn btn-outline-success" onClick={() => alert('Téléchargement Word - Contactez l\'administrateur')}>
                    <i className="bx bx-file-blank"></i> Télécharger Word
                  </button>
                </div>

                <div className="alert alert-info">
                  <strong>Résumé :</strong> Cette documentation présente les étapes complètes pour utiliser l'application ATELIKO de gestion d'atelier de couture, depuis la connexion jusqu'aux fonctionnalités avancées.
                </div>

                <h2>Guide d'utilisation complet</h2>

                <div className="section">
                  <h3>1. Connexion à l'application</h3>
                  <ol>
                    <li>Ouvrez votre navigateur web ou l'application mobile ATELIKO</li>
                    <li>Sur la page/écran de connexion, saisissez votre adresse email</li>
                    <li>Saisissez votre mot de passe</li>
                    <li>Cliquez sur "Se connecter" ou appuyez sur le bouton de connexion</li>
                    <li>Vous serez redirigé vers le tableau de bord principal</li>
                  </ol>
                </div>

                <div className="section">
                  <h3>2. Navigation dans l'application</h3>
                  <p>Utilisez le menu de navigation pour accéder aux différentes sections :</p>
                  <ul>
                    <li><strong>Tableau de bord</strong> : Vue d'ensemble des activités</li>
                    <li><strong>Liste des clients</strong> : Gestion de la base de clients</li>
                    <li><strong>Albums</strong> : Gestion des modèles et photos</li>
                    <li><strong>Affectations</strong> : Attribution des tâches aux tailleurs</li>
                    <li><strong>Rendez-vous</strong> : Planification et gestion des rendez-vous</li>
                    <li><strong>Paiements</strong> : Suivi des transactions financières</li>
                    <li><strong>Documentation</strong> : Ce guide d'utilisation</li>
                    <li><strong>Paramètres</strong> : Configuration de l'application</li>
                  </ul>
                </div>

                <div className="section">
                  <h3>3. Gestion des clients</h3>
                  <h4>Enregistrer un nouveau client avec ses mesures :</h4>
                  <ol>
                    <li>Allez dans "Liste des clients"</li>
                    <li>Cliquez sur "Ajouter un client"</li>
                    <li>Remplissez les informations personnelles : nom, prénom, email, téléphone, adresse</li>
                    <li>Passez directement à la section mesures dans le même formulaire</li>
                    <li>Saisissez toutes les mesures requises : tour de taille, longueur, épaules, etc.</li>
                    <li>Cliquez sur "Enregistrer"</li>
                    <li>Un message de confirmation apparaîtra : "Client et mesures enregistrés avec succès"</li>
                  </ol>

                  <h4>Modifier un client existant :</h4>
                  <ol>
                    <li>Sélectionnez le client dans la liste</li>
                    <li>Cliquez sur "Modifier"</li>
                    <li>Modifiez les informations personnelles et/ou les mesures</li>
                    <li>Enregistrez les changements</li>
                  </ol>

                  <h4>Voir l'historique des mesures :</h4>
                  <ol>
                    <li>Sélectionnez un client dans la liste</li>
                    <li>Allez dans l'onglet "Mesures" ou "Historique"</li>
                    <li>Consultez toutes les mesures enregistrées pour ce client</li>
                    <li>Vous pouvez modifier ou ajouter de nouvelles mesures</li>
                  </ol>
                </div>

                <div className="section">
                  <h3>4. Gestion des rendez-vous</h3>
                  <h4>Créer un rendez-vous :</h4>
                  <ol>
                    <li>Allez dans "Rendez-vous"</li>
                    <li>Cliquez sur "Nouveau rendez-vous"</li>
                    <li>Sélectionnez un client (qui doit avoir un email valide)</li>
                    <li>Choisissez la date et l'heure</li>
                    <li>Ajoutez une description</li>
                    <li>Cliquez sur "Créer"</li>
                    <li>Un email de confirmation sera envoyé au client</li>
                  </ol>

                  <h4>Voir les rendez-vous :</h4>
                  <p>L'application affiche un calendrier avec tous les rendez-vous planifiés.</p>
                </div>

                <div className="section">
                  <h3>5. Gestion des modèles et albums</h3>
                  <h4>Créer un album :</h4>
                  <ol>
                    <li>Allez dans "Albums"</li>
                    <li>Cliquez sur "Créer un album"</li>
                    <li>Donnez un nom à l'album</li>
                    <li>Ajoutez une description</li>
                    <li>Téléchargez les photos du modèle</li>
                    <li>Cliquez sur "Enregistrer"</li>
                  </ol>

                  <h4>Ajouter des photos à un album :</h4>
                  <ol>
                    <li>Sélectionnez un album existant</li>
                    <li>Cliquez sur "Ajouter des photos"</li>
                    <li>Sélectionnez les fichiers images</li>
                    <li>Ajoutez des descriptions si nécessaire</li>
                    <li>Enregistrez les modifications</li>
                  </ol>
                </div>

                <div className="section">
                  <h3>6. Gestion des affectations</h3>
                  <h4>Créer une affectation :</h4>
                  <ol>
                    <li>Allez dans "Affectations"</li>
                    <li>Cliquez sur "Nouvelle affectation"</li>
                    <li>Sélectionnez le tailleur et le client</li>
                    <li>Définissez la tâche et les dates d'échéance</li>
                    <li>Ajoutez des instructions spécifiques</li>
                    <li>Cliquez sur "Enregistrer"</li>
                  </ol>

                  <h4>Suivre l'état des affectations :</h4>
                  <ol>
                    <li>Consultez la liste des affectations en cours</li>
                    <li>Filtrez par statut : en attente, en cours, terminée</li>
                    <li>Mettez à jour le statut selon l'avancement</li>
                    <li>Ajoutez des commentaires sur le travail réalisé</li>
                  </ol>
                </div>

                <div className="section">
                  <h3>7. Gestion des paiements</h3>
                  <h4>Enregistrer un paiement :</h4>
                  <ol>
                    <li>Allez dans "Paiements"</li>
                    <li>Cliquez sur "Nouveau paiement"</li>
                    <li>Sélectionnez le client</li>
                    <li>Entrez le montant et la description</li>
                    <li>Choisissez le mode de paiement</li>
                    <li>Cliquez sur "Enregistrer"</li>
                  </ol>

                  <h4>Consulter l'historique :</h4>
                  <ol>
                    <li>Accédez à la section paiements</li>
                    <li>Filtrez par client, date ou statut</li>
                    <li>Consultez les détails de chaque transaction</li>
                    <li>Exportez les rapports si nécessaire</li>
                  </ol>
                </div>

                <div className="section">
                  <h3>8. Gestion des permissions (Administrateurs seulement)</h3>
                  <h4>Attribuer des permissions :</h4>
                  <ol>
                    <li>Allez dans "Permissions"</li>
                    <li>Sélectionnez un utilisateur</li>
                    <li>Cochez les permissions à attribuer</li>
                    <li>Cliquez sur "Enregistrer"</li>
                  </ol>

                  <h4>Créer de nouveaux utilisateurs :</h4>
                  <ol>
                    <li>Allez dans "Utilisateurs" ou "Gestion des utilisateurs"</li>
                    <li>Cliquez sur "Ajouter un utilisateur"</li>
                    <li>Remplissez les informations : nom, email, rôle</li>
                    <li>Définissez les permissions initiales</li>
                    <li>Envoyez l'invitation par email</li>
                  </ol>
                </div>

                <div className="section">
                  <h3>9. Paramètres et configuration</h3>
                  <p>Accessible uniquement aux administrateurs et propriétaires :</p>
                  <ul>
                    <li>Configuration générale de l'atelier</li>
                    <li>Gestion des utilisateurs</li>
                    <li>Paramètres système</li>
                    <li>Configuration des notifications</li>
                    <li>Préférences d'affichage</li>
                  </ul>
                  <ol>
                    <li>Allez dans "Paramètres"</li>
                    <li>Modifiez les informations souhaitées</li>
                    <li>Configurez les notifications et préférences</li>
                    <li>Cliquez sur "Enregistrer"</li>
                  </ol>
                </div>

                <div className="section">
                  <h3>10. Déconnexion</h3>
                  <ol>
                    <li>Cliquez sur votre nom en haut à droite</li>
                    <li>Sélectionnez "Déconnexion"</li>
                    <li>Confirmez si demandé</li>
                    <li>Vous serez redirigé vers la page de connexion</li>
                  </ol>
                </div>

                <div className="section">
                  <h3>Conseils d'utilisation</h3>
                  <ul>
                    <li><strong>Sécurité</strong> : Changez régulièrement votre mot de passe</li>
                    <li><strong>Sauvegarde</strong> : Les données sont automatiquement sauvegardées</li>
                    <li><strong>Email</strong> : Assurez-vous que les clients ont des emails valides pour les rendez-vous</li>
                    <li><strong>Permissions</strong> : Respectez les droits d'accès de chaque utilisateur</li>
                    <li><strong>Mises à jour</strong> : Vérifiez régulièrement les nouvelles fonctionnalités</li>
                  </ul>
                </div>

                <div className="section">
                  <h3>Support et assistance</h3>
                  <p>En cas de problème :</p>
                  <ul>
                    <li>Consultez cette documentation</li>
                    <li>Contactez l'administrateur système</li>
                    <li>Vérifiez votre connexion internet</li>
                    <li>Redémarrez l'application si nécessaire</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Documentation;