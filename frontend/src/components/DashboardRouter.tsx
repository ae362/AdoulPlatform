import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { GovernmentAuthorityDashboard } from './dashboards/GovernmentAuthorityDashboard';
import { NationalNotaryAuthorityDashboard } from './dashboards/NationalNotaryAuthorityDashboard';
import { NotaryDashboard } from './dashboards/NotaryDashboard';

export const DashboardRouter: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Route to appropriate dashboard based on role
  switch (user.role) {
    case 'government_authority':
      return <GovernmentAuthorityDashboard />;
    case 'national_notary_authority':
      return <Navigate to="/national-council" replace />;
    case 'president_office':
      return <Navigate to="/president-office" replace />;
    case 'regional_adoul_council':
      return <Navigate to="/regional-council" replace />;
    case 'authentication_judge':
    case 'regional_judge':
    case 'supreme_judge':
      return <Navigate to="/judge" replace />;
    case 'society_member':
      return <Navigate to="/society" replace />;
    case 'creator':
      return <Navigate to="/creator" replace />;
    case 'notary':
      return <NotaryDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
};
