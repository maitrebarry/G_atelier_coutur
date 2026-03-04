import React from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const DocumentationScreen = () => {
  const navigation = useNavigation();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Documentation ATELIKO</Text>
        <Text style={styles.subtitle}>
          Guide complet d'utilisation de l'application
        </Text>
      </View>

      <View style={styles.introduction}>
        <Text style={styles.introductionTitle}>À propos d'ATELIKO</Text>
        <Text style={styles.introductionText}>
          ATELIKO est une application complète de gestion d'atelier de couture qui facilite la gestion des clients, des commandes, des rendez-vous et des paiements. Que vous soyez propriétaire d'atelier, secrétaire ou tailleur, cette plateforme vous offre tous les outils nécessaires pour optimiser votre activité et améliorer votre productivité.
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.downloadButton} onPress={() => alert('Téléchargement PDF - Contactez l\'administrateur')}>
          <Text style={styles.downloadButtonText}>📄 Télécharger PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.downloadButtonSecondary} onPress={() => alert('Téléchargement Word - Contactez l\'administrateur')}>
          <Text style={styles.downloadButtonTextSecondary}>📝 Télécharger Word</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          <Text style={styles.summaryBold}>Résumé :</Text> Cette documentation présente les étapes complètes pour utiliser l'application ATELIKO de gestion d'atelier de couture, depuis la connexion jusqu'aux fonctionnalités avancées.
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Guide d'utilisation complet</Text>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>1. Connexion à l'application</Text>
          <Text style={styles.step}>1. Ouvrez votre navigateur web ou l'application mobile ATELIKO</Text>
          <Text style={styles.step}>2. Sur la page/écran de connexion, saisissez votre adresse email</Text>
          <Text style={styles.step}>3. Saisissez votre mot de passe</Text>
          <Text style={styles.step}>4. Cliquez sur "Se connecter" ou appuyez sur le bouton de connexion</Text>
          <Text style={styles.step}>5. Vous serez redirigé vers le tableau de bord principal</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>2. Navigation dans l'application</Text>
          <Text style={styles.description}>
            Utilisez le menu de navigation pour accéder aux différentes sections :
          </Text>
          <Text style={styles.step}>• Tableau de bord : Vue d'ensemble des activités</Text>
          <Text style={styles.step}>• Liste des clients : Gestion de la base de clients</Text>
          <Text style={styles.step}>• Albums : Gestion des modèles et photos</Text>
          <Text style={styles.step}>• Affectations : Attribution des tâches aux tailleurs</Text>
          <Text style={styles.step}>• Rendez-vous : Planification et gestion des rendez-vous</Text>
          <Text style={styles.step}>• Paiements : Suivi des transactions financières</Text>
          <Text style={styles.step}>• Documentation : Ce guide d'utilisation</Text>
          <Text style={styles.step}>• Paramètres : Configuration de l'application</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>3. Gestion des clients</Text>

          <Text style={styles.subHeader}>Enregistrer un nouveau client avec ses mesures :</Text>
          <Text style={styles.step}>1. Allez dans "Liste des clients"</Text>
          <Text style={styles.step}>2. Cliquez sur "Ajouter un client"</Text>
          <Text style={styles.step}>3. Remplissez les informations personnelles : nom, prénom, email, téléphone, adresse</Text>
          <Text style={styles.step}>4. Passez directement à la section mesures dans le même formulaire</Text>
          <Text style={styles.step}>5. Saisissez toutes les mesures requises : tour de taille, longueur, épaules, etc.</Text>
          <Text style={styles.step}>6. Cliquez sur "Enregistrer"</Text>
          <Text style={styles.step}>7. Un message de confirmation apparaîtra : "Client et mesures enregistrés avec succès"</Text>

          <Text style={styles.subHeader}>Modifier un client existant :</Text>
          <Text style={styles.step}>1. Sélectionnez le client dans la liste</Text>
          <Text style={styles.step}>2. Cliquez sur "Modifier"</Text>
          <Text style={styles.step}>3. Modifiez les informations personnelles et/ou les mesures</Text>
          <Text style={styles.step}>4. Enregistrez les changements</Text>

          <Text style={styles.subHeader}>Voir l'historique des mesures :</Text>
          <Text style={styles.step}>1. Sélectionnez un client dans la liste</Text>
          <Text style={styles.step}>2. Allez dans l'onglet "Mesures" ou "Historique"</Text>
          <Text style={styles.step}>3. Consultez toutes les mesures enregistrées pour ce client</Text>
          <Text style={styles.step}>4. Vous pouvez modifier ou ajouter de nouvelles mesures</Text>
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>4. Gestion des rendez-vous</Text>

          <Text style={styles.subHeader}>Créer un rendez-vous :</Text>
          <Text style={styles.step}>1. Allez dans "Rendez-vous"</Text>
          <Text style={styles.step}>2. Cliquez sur "Nouveau rendez-vous" ou appuyez sur "Créer un rendez-vous"</Text>
          <Text style={styles.step}>3. Sélectionnez un client (qui doit avoir un email valide)</Text>
          <Text style={styles.step}>4. Choisissez la date et l'heure</Text>
          <Text style={styles.step}>5. Ajoutez une description ou des notes</Text>
          <Text style={styles.step}>6. Cliquez/appuyez sur "Créer"</Text>
          <Text style={styles.step}>7. Un email de confirmation sera envoyé au client</Text>

          <Text style={styles.note}>
            Note : Le client doit avoir un email valide pour recevoir la confirmation.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>5. Gestion des modèles et albums</Text>

          <Text style={styles.subHeader}>Créer un album :</Text>
          <Text style={styles.step}>1. Allez dans "Albums" ou "Modèles"</Text>
          <Text style={styles.step}>2. Cliquez sur "Créer un album" ou appuyez sur "Nouveau album"</Text>
          <Text style={styles.step}>3. Donnez un nom à l'album</Text>
          <Text style={styles.step}>4. Ajoutez une description</Text>
          <Text style={styles.step}>5. Téléchargez/sélectionnez les photos du modèle</Text>
          <Text style={styles.step}>6. Cliquez/appuyez sur "Enregistrer"</Text>

          <Text style={styles.subHeader}>Ajouter des photos à un album :</Text>
          <Text style={styles.step}>1. Sélectionnez un album existant</Text>
          <Text style={styles.step}>2. Cliquez sur "Ajouter des photos" ou appuyez sur l'icône d'ajout</Text>
          <Text style={styles.step}>3. Sélectionnez les fichiers images</Text>
          <Text style={styles.step}>4. Ajoutez des descriptions si nécessaire</Text>
          <Text style={styles.step}>5. Enregistrez les modifications</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>6. Gestion des affectations</Text>

          <Text style={styles.subHeader}>Créer une affectation :</Text>
          <Text style={styles.step}>1. Allez dans "Affectations"</Text>
          <Text style={styles.step}>2. Cliquez sur "Nouvelle affectation" ou appuyez sur "Créer une affectation"</Text>
          <Text style={styles.step}>3. Sélectionnez le tailleur et le client</Text>
          <Text style={styles.step}>4. Définissez la tâche et les dates d'échéance</Text>
          <Text style={styles.step}>5. Ajoutez des instructions spécifiques</Text>
          <Text style={styles.step}>6. Cliquez/appuyez sur "Enregistrer"</Text>

          <Text style={styles.subHeader}>Suivre l'état des affectations :</Text>
          <Text style={styles.step}>1. Consulter la liste des affectations en cours</Text>
          <Text style={styles.step}>2. Filtrer par statut : en attente, en cours, terminée</Text>
          <Text style={styles.step}>3. Mettre à jour le statut selon l'avancement</Text>
          <Text style={styles.step}>4. Ajouter des commentaires sur le travail réalisé</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>7. Gestion des paiements</Text>

          <Text style={styles.subHeader}>Enregistrer un paiement :</Text>
          <Text style={styles.step}>1. Allez dans "Paiements"</Text>
          <Text style={styles.step}>2. Cliquez sur "Nouveau paiement" ou appuyez sur "Ajouter un paiement"</Text>
          <Text style={styles.step}>3. Sélectionnez le client</Text>
          <Text style={styles.step}>4. Entrez le montant et la description</Text>
          <Text style={styles.step}>5. Choisissez le mode de paiement</Text>
          <Text style={styles.step}>6. Cliquez/appuyez sur "Enregistrer"</Text>

          <Text style={styles.subHeader}>Consulter l'historique :</Text>
          <Text style={styles.step}>1. Accédez à la section paiements</Text>
          <Text style={styles.step}>2. Filtrez par client, date ou statut</Text>
          <Text style={styles.step}>3. Consultez les détails de chaque transaction</Text>
          <Text style={styles.step}>4. Exportez les rapports si nécessaire</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>8. Gestion des permissions (Administrateurs seulement)</Text>

          <Text style={styles.subHeader}>Attribuer des permissions :</Text>
          <Text style={styles.step}>1. Allez dans "Permissions"</Text>
          <Text style={styles.step}>2. Sélectionnez un utilisateur</Text>
          <Text style={styles.step}>3. Cochez les permissions à attribuer</Text>
          <Text style={styles.step}>4. Cliquez/appuyez sur "Enregistrer"</Text>

          <Text style={styles.subHeader}>Créer de nouveaux utilisateurs :</Text>
          <Text style={styles.step}>1. Allez dans "Utilisateurs" ou "Gestion des utilisateurs"</Text>
          <Text style={styles.step}>2. Cliquez sur "Ajouter un utilisateur"</Text>
          <Text style={styles.step}>3. Remplissez les informations : nom, email, rôle</Text>
          <Text style={styles.step}>4. Définissez les permissions initiales</Text>
          <Text style={styles.step}>5. Envoyez l'invitation par email</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>9. Paramètres et configuration</Text>
          <Text style={styles.description}>
            Accessible uniquement aux administrateurs et propriétaires :
          </Text>
          <Text style={styles.step}>• Configuration générale de l'atelier</Text>
          <Text style={styles.step}>• Gestion des utilisateurs</Text>
          <Text style={styles.step}>• Paramètres système</Text>
          <Text style={styles.step}>• Configuration des notifications</Text>
          <Text style={styles.step}>• Préférences d'affichage</Text>

          <Text style={styles.step}>1. Allez dans "Paramètres"</Text>
          <Text style={styles.step}>2. Modifiez les informations souhaitées</Text>
          <Text style={styles.step}>3. Configurez les notifications et préférences</Text>
          <Text style={styles.step}>4. Cliquez/appuyez sur "Enregistrer"</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>10. Déconnexion</Text>
          <Text style={styles.step}>1. Cliquez sur votre nom en haut à droite (web) ou allez dans le menu principal (mobile)</Text>
          <Text style={styles.step}>2. Sélectionnez "Déconnexion" ou appuyez sur "Déconnexion"</Text>
          <Text style={styles.step}>3. Confirmez si demandé</Text>
          <Text style={styles.step}>4. Vous serez redirigé vers la page/écran de connexion</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Conseils d'utilisation</Text>
          <Text style={styles.step}>• Sécurité : Changez régulièrement votre mot de passe</Text>
          <Text style={styles.step}>• Sauvegarde : Les données sont automatiquement sauvegardées</Text>
          <Text style={styles.step}>• Email : Assurez-vous que les clients ont des emails valides pour les rendez-vous</Text>
          <Text style={styles.step}>• Permissions : Respectez les droits d'accès de chaque utilisateur</Text>
          <Text style={styles.step}>• Mises à jour : Vérifiez régulièrement les nouvelles fonctionnalités</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Support et assistance</Text>
          <Text style={styles.description}>En cas de problème :</Text>
          <Text style={styles.step}>• Consultez cette documentation</Text>
          <Text style={styles.step}>• Contactez l'administrateur système</Text>
          <Text style={styles.step}>• Vérifiez votre connexion internet</Text>
          <Text style={styles.step}>• Redémarrez l'application si nécessaire</Text>
        </View>

        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  introduction: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  introductionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: 8,
  },
  introductionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 20,
    marginBottom: 15,
  },
  downloadButton: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    flex: 1,
    marginRight: 5,
  },
  downloadButtonSecondary: {
    backgroundColor: '#28a745',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    flex: 1,
    marginLeft: 5,
  },
  downloadButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 14,
  },
  downloadButtonTextSecondary: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 14,
  },
  summary: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  summaryText: {
    fontSize: 14,
    color: '#1565c0',
    lineHeight: 20,
  },
  summaryBold: {
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 25,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#3498db',
    paddingBottom: 5,
  },
  subHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34495e',
    marginTop: 10,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#555',
    marginBottom: 10,
    lineHeight: 20,
  },
  step: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
    lineHeight: 20,
    paddingLeft: 10,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  note: {
    fontSize: 13,
    color: '#e74c3c',
    fontStyle: 'italic',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#fdf2f2',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#e74c3c',
  },
});

export default DocumentationScreen;