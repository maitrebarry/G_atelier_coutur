import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';

const Layout = () => {
  return (
    <div className="wrapper">
      <Sidebar />
      <Header />
      <div className="page-wrapper">
        <div className="page-content">
          <Outlet />
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Layout;