import React, { useEffect, useState } from 'react';
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

LogBox.ignoreAllLogs(true);

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Abonnement" component={AbonnementScreen} />
        <Stack.Screen name="Clients" component={ClientListScreen} />
        <Stack.Screen name="Rendezvous" component={RendezvousScreen} />
        <Stack.Screen name="RendezvousCreate" component={RendezvousCreateScreen} options={{ title: 'Nouveau rendez-vous' }} />
        <Stack.Screen name="MesureAdd" component={MesureAddScreen} options={{ title: 'Créer Client & Mesures' }} />
        <Stack.Screen name="Paiements" component={PaiementsScreen} />
        <Stack.Screen name="PaiementCreate" component={PaiementCreateScreen} options={{ title: 'Enregistrer Paiement' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
