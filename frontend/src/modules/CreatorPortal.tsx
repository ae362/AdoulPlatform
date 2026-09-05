import React from 'react';
import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CreatorPageBuilder } from './CreatorPageBuilder';
import { CreatorContentPortal } from './CreatorContentPortal';

export function CreatorPortal() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, logout } = useAuth();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-500">
        Loading Creator Studio...
      </div>
    );
  }

  if (!user || user.role !== 'creator') {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <div className="text-lg font-extrabold text-slate-900">Creator Studio</div>
            <div className="text-sm text-slate-600">Landing Page Builder + Content Portal</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { to: '', label: 'Landing Builder' },
              { to: 'content', label: 'Content Portal' },
            ].map((t) => (
              <NavLink
                key={t.label}
                to={`/creator/${t.to}`}
                end={t.to === ''}
                className={({ isActive }) =>
                  `rounded-xl px-4 py-2 text-sm font-extrabold transition ${
                    isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                  }`
                }
              >
                {t.label}
              </NavLink>
            ))}

            <div className="mx-1 h-6 w-px bg-slate-200" aria-hidden="true" />

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-rose-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-200"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <Routes>
        <Route index element={<CreatorPageBuilder />} />
        <Route path="content" element={<CreatorContentPortal />} />
      </Routes>
    </div>
  );
}
