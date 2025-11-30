import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './layout/Layout';
import Home from './pages/Home';
import Clients from './pages/Clients';
import Mesures from './pages/Mesures';
import Modeles from './pages/Modeles';
import Affectations from './pages/Affectations';
import Rendezvous from './pages/Rendezvous';
import Paiements from './pages/Paiements';
import Permissions from './pages/Permissions';
import ListePermissions from './pages/ListePermissions';
import Parametres from './pages/Parametres';
// import Tailleurs from './pages/Tailleurs';
import Login from './pages/Login';
import Signup from './pages/Signup';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/*" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Home />} />
          <Route path="home" element={<Home />} />
          <Route path="signup" element={
            <PrivateRoute roles={['SUPERADMIN', 'PROPRIETAIRE']}>
              <Signup />
            </PrivateRoute>
          } />
          <Route path="clients" element={
            <PrivateRoute permission="CLIENT_VOIR">
              <Clients />
            </PrivateRoute>
          } />
          <Route path="mesures" element={
            <PrivateRoute permission="CLIENT_VOIR">
              <Mesures />
            </PrivateRoute>
          } />
          <Route path="modeles" element={
            <PrivateRoute permission="MODELE_VOIR">
              <Modeles />
            </PrivateRoute>
          } />
          <Route path="affectations" element={
            <PrivateRoute permission="AFFECTATION_VOIR">
              <Affectations />
            </PrivateRoute>
          } />
          <Route path="rendezvous" element={
            <PrivateRoute roles={['SUPERADMIN', 'PROPRIETAIRE', 'SECRETAIRE']} permission="RENDEZ_VOUS_VOIR">
              <Rendezvous />
            </PrivateRoute>
          } />
          <Route path="paiements" element={
            <PrivateRoute roles={['SUPERADMIN', 'PROPRIETAIRE', 'SECRETAIRE']} permission="PAIEMENT_VOIR">
              <Paiements />
            </PrivateRoute>
          } />
          <Route path="permissions" element={
            <PrivateRoute roles={['SUPERADMIN', 'PROPRIETAIRE']}>
              <Permissions />
            </PrivateRoute>
          } />
          <Route path="liste-permissions" element={
            <PrivateRoute roles={['SUPERADMIN', 'PROPRIETAIRE']}>
              <ListePermissions />
            </PrivateRoute>
          } />
          <Route path="parametres" element={
            <PrivateRoute roles={['SUPERADMIN', 'PROPRIETAIRE']}>
              <Parametres />
            </PrivateRoute>
          } />
          {/* <Route path="tailleurs" element={<Tailleurs />} /> */}
        </Route>
      </Routes>
    </Router>
  );
}

export default App;