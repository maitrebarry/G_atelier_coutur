import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LogBox } from 'react-native';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import RendezvousScreen from './src/screens/RendezvousScreen';
import AbonnementScreen from './src/screens/AbonnementScreen';
import ClientListScreen from './src/screens/ClientListScreen';
import RendezvousCreateScreen from './src/screens/RendezvousCreateScreen';
import MesureAddScreen from './src/screens/MesureAddScreen';
import PaiementsScreen from './src/screens/PaiementsScreen';
import PaiementCreateScreen from './src/screens/PaiementCreateScreen';
import AlbumsScreen from './src/screens/AlbumsScreen';
import AffectationScreen from './src/screens/AffectationScreen';
import AtelierScreen from './src/screens/AtelierScreen';
import UtilisateursScreen from './src/screens/UtilisateursScreen';
import AssignerPermissionScreen from './src/screens/AssignerPermissionScreen';
import ListePermissionScreen from './src/screens/ListePermissionScreen';
import DocumentationScreen from './src/screens/DocumentationScreen';

LogBox.ignoreAllLogs(true);

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Abonnement" component={AbonnementScreen} />
        <Stack.Screen name="Clients" component={ClientListScreen} />
        <Stack.Screen name="Rendezvous" component={RendezvousScreen} />
        <Stack.Screen
          name="RendezvousCreate"
          component={RendezvousCreateScreen}
        />
        <Stack.Screen name="MesureAdd" component={MesureAddScreen} />
        <Stack.Screen name="Albums" component={AlbumsScreen} />
        <Stack.Screen name="Affectation" component={AffectationScreen} />
        <Stack.Screen name="Atelier" component={AtelierScreen} />
        <Stack.Screen name="Utilisateurs" component={UtilisateursScreen} />
        <Stack.Screen name="AssignerPermission" component={AssignerPermissionScreen} />
        <Stack.Screen name="ListePermission" component={ListePermissionScreen} />
        <Stack.Screen name="Paiements" component={PaiementsScreen} />
        <Stack.Screen
          name="PaiementCreate"
          component={PaiementCreateScreen}
          options={{ title: 'Enregistrer Paiement' }}
        />
        <Stack.Screen name="Documentation" component={DocumentationScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
