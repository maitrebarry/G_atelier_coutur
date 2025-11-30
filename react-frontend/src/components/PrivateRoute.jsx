import React from 'react';
import { Navigate } from 'react-router-dom';
import { getUserData } from '../api/api';

export default function PrivateRoute({ children, roles, permission }) {
  const user = getUserData();
  console.log('PrivateRoute: Full user object:', user);

  if (!user) {
    console.log('PrivateRoute: No user found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Role Check
  if (roles && roles.length > 0) {
    const userRole = user.role;
    console.log(`PrivateRoute: Checking access for role '${userRole}' against allowed roles:`, roles);
    
    if (Array.isArray(roles)) {
      if (!roles.includes(userRole)) {
        console.log('PrivateRoute: Role mismatch, redirecting to home');
        return <Navigate to="/home" replace />;
      }
    } else if (roles !== userRole) {
       console.log('PrivateRoute: Role mismatch (single), redirecting to home');
       return <Navigate to="/home" replace />;
    }
  }

  // Permission Check
  if (permission) {
      const isSuperOrProp = ['SUPERADMIN', 'PROPRIETAIRE'].includes(user.role);
      if (!isSuperOrProp) {
          // Normalize permissions just in case they are objects
          const userPermissions = (user.permissions || []).map(p => 
              typeof p === 'string' ? p : (p.code || p.name)
          );
          
          if (!userPermissions.includes(permission)) {
              console.log(`PrivateRoute: Missing permission '${permission}', redirecting to home`);
              return <Navigate to="/home" replace />;
          }
      }
  }

  return children;
}
