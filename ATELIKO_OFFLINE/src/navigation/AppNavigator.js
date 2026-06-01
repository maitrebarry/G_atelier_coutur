import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import ClientListScreen from '../screens/ClientListScreen';
import ClientDetailScreen from '../screens/ClientDetailScreen';
import ClientFormScreen from '../screens/ClientFormScreen';
import ModeleListScreen from '../screens/ModeleListScreen';
import ModeleFormScreen from '../screens/ModeleFormScreen';
import PaymentListScreen from '../screens/PaymentListScreen';
import PaymentDetailScreen from '../screens/PaymentDetailScreen';
import PaymentFormScreen from '../screens/PaymentFormScreen';
import RendezvousListScreen from '../screens/RendezvousListScreen';
import RendezvousFormScreen from '../screens/RendezvousFormScreen';
import TailleurListScreen from '../screens/TailleurListScreen';
import AffectationFormScreen from '../screens/AffectationFormScreen';
import ReceiptScreen from '../screens/ReceiptScreen';
import AlbumListScreen from '../screens/AlbumListScreen';
import AlbumFormScreen from '../screens/AlbumFormScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerTitleAlign: 'center'}}>
      <Stack.Screen name="Home" component={HomeScreen} options={{headerShown: false}} />
      <Stack.Screen name="Clients" component={ClientListScreen} options={{headerShown: false}} />
      <Stack.Screen name="ClientDetail" component={ClientDetailScreen} options={{headerShown: false}} />
      <Stack.Screen name="ClientForm" component={ClientFormScreen} options={{title: 'Client'}} />
      <Stack.Screen name="Modeles" component={ModeleListScreen} options={{headerShown: false}} />
      <Stack.Screen name="ModeleForm" component={ModeleFormScreen} options={{title: 'Modele'}} />
      <Stack.Screen name="Albums" component={AlbumListScreen} options={{headerShown: false}} />
      <Stack.Screen name="AlbumForm" component={AlbumFormScreen} options={{title: 'Album'}} />
      <Stack.Screen name="Payments" component={PaymentListScreen} options={{headerShown: false}} />
      <Stack.Screen name="PaymentDetail" component={PaymentDetailScreen} options={{title: 'Historique paiement'}} />
      <Stack.Screen name="PaymentForm" component={PaymentFormScreen} options={({route}) => ({title: route.params?.paymentId ? 'Modifier paiement' : 'Nouveau paiement'})} />
      <Stack.Screen name="Rendezvous" component={RendezvousListScreen} options={{headerShown: false}} />
      <Stack.Screen name="RendezvousForm" component={RendezvousFormScreen} options={({route}) => ({title: route.params?.idRendezvous ? 'Modifier rendez-vous' : 'Nouveau rendez-vous'})} />
      <Stack.Screen name="Tailleurs" component={TailleurListScreen} options={{headerShown: false}} />
      <Stack.Screen name="AffectationForm" component={AffectationFormScreen} options={{title: 'Affectation'}} />
      <Stack.Screen name="Receipt" component={ReceiptScreen} options={{title: 'Recu thermique'}} />
    </Stack.Navigator>
  );
}
