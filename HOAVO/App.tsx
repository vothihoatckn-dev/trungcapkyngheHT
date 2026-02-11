import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { SyncProvider } from './context/SyncContext'; // Import SyncProvider
import { UserRole } from './types';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import StudentAdmin from './pages/admin/StudentAdmin';
import ClassAdmin from './pages/admin/ClassAdmin';
import AcademicClassAdmin from './pages/admin/AcademicClassAdmin';
import TeacherAdmin from './pages/admin/TeacherAdmin';
import DepartmentAdmin from './pages/admin/DepartmentAdmin';
import ReportAdmin from './pages/admin/ReportAdmin';
import IntegrationReporting from './pages/admin/IntegrationReporting';
import AccountAdmin from './pages/admin/AccountAdmin';
import SystemSettings from './pages/admin/SystemSettings';
import UserDashboard from './pages/user/UserDashboard';
import ClassManagement from './pages/user/ClassManagement';
import Attendance from './pages/user/Attendance';
import BehaviorReport from './pages/user/BehaviorReport';
import StatisticsAdmin from './pages/admin/StatisticsAdmin';
import BehaviorAdmin from './pages/admin/BehaviorAdmin';

// Protected Route Wrapper for v6
const ProtectedRoute = ({ children, allowedRole }: { children?: React.ReactNode, allowedRole?: UserRole }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user?.role !== allowedRole) {
    return <Navigate to={user?.role === UserRole.ADMIN ? '/admin' : '/user'} replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <SyncProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Admin Routes */}
          <Route path="/admin/*" element={
            <ProtectedRoute allowedRole={UserRole.ADMIN}>
              <DashboardLayout>
                <Routes>
                  <Route index element={<AdminDashboard />} />
                  <Route path="classes" element={<ClassAdmin />} />
                  <Route path="academic-classes" element={<AcademicClassAdmin />} />
                  <Route path="departments" element={<DepartmentAdmin />} />
                  <Route path="teachers" element={<TeacherAdmin />} />
                  <Route path="students" element={<StudentAdmin />} />
                  <Route path="accounts" element={<AccountAdmin />} />
                  <Route path="reports" element={<ReportAdmin />} />
                  <Route path="behavior" element={<BehaviorAdmin />} />
                  <Route path="statistics" element={<StatisticsAdmin />} />
                  <Route path="integration" element={<IntegrationReporting />} />
                  <Route path="settings" element={<SystemSettings />} />
                  {/* Default redirect for /admin */}
                  <Route path="*" element={<Navigate to="/admin" replace />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* User (Teacher) Routes */}
          <Route path="/user/*" element={
            <ProtectedRoute allowedRole={UserRole.TEACHER}>
              <DashboardLayout>
                <Routes>
                  <Route index element={<UserDashboard />} />
                  <Route path="classes" element={<ClassManagement />} />
                  <Route path="attendance-select" element={<Navigate to="/user/classes" replace />} />
                  <Route path="attendance/:classId" element={<Attendance />} />
                  <Route path="reports" element={<BehaviorReport />} />
                  {/* Default redirect for /user */}
                  <Route path="*" element={<Navigate to="/user" replace />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </HashRouter>
    </SyncProvider>
  );
};

export default App;