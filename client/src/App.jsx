import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import IndividualRegistryPage from './pages/IndividualRegistryPage';
import HouseholdManagementPage from './pages/HouseholdManagementPage';
import PropertyRegistryPage from './pages/PropertyRegistryPage';
import SchemeDirectoryPage from './pages/SchemeDirectoryPage';
import BenefitApplicationPage from './pages/BenefitApplicationPage';
import DuplicateReviewCenterPage from './pages/DuplicateReviewCenterPage';
import ApplicationTrackingPage from './pages/ApplicationTrackingPage';
import DocumentVaultPage from './pages/DocumentVaultPage';
import AuditLogsPage from './pages/AuditLogsPage';
import ReportsAnalyticsPage from './pages/ReportsAnalyticsPage';
import SettingsAdminPage from './pages/SettingsAdminPage';
import ApiIntegrationsPage from './pages/ApiIntegrationsPage';
import PotentialBenefitsPage from './pages/PotentialBenefitsPage';
import HouseholdAllocationsPage from './pages/HouseholdAllocationsPage';
import BenefitRecordsExplorerPage from './pages/BenefitRecordsExplorerPage';
import IndividualHouseholdLookupPage from './pages/IndividualHouseholdLookupPage';
import MyApplicationsPage from './pages/MyApplicationsPage';
import ApplicationCalendarPage from './pages/ApplicationCalendarPage';
import ApplicantTrackerPage from './pages/ApplicantTrackerPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/track" element={<ApplicantTrackerPage />} />
          <Route path="/track-application" element={<ApplicantTrackerPage />} />

          {/* Protected Application Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/my-applications" element={<ApplicantTrackerPage />} />
              <Route path="/applicant-tracker" element={<ApplicantTrackerPage />} />
              <Route path="/calendar" element={<ApplicationCalendarPage />} />
              <Route path="/lookup" element={<IndividualHouseholdLookupPage />} />
              <Route path="/household-mapping" element={<IndividualHouseholdLookupPage />} />
              <Route path="/potential-benefits" element={<PotentialBenefitsPage />} />
              <Route path="/household-allocations" element={<HouseholdAllocationsPage />} />
              <Route path="/records-explorer" element={<BenefitRecordsExplorerPage />} />
              <Route path="/duplicate-review" element={<DuplicateReviewCenterPage />} />
              <Route path="/applications" element={<ApplicationTrackingPage />} />
              <Route path="/applications/:id" element={<ApplicationTrackingPage />} />
              <Route path="/apply" element={<BenefitApplicationPage />} />
              <Route path="/individuals" element={<IndividualRegistryPage />} />
              <Route path="/households" element={<HouseholdManagementPage />} />
              <Route path="/properties" element={<PropertyRegistryPage />} />
              <Route path="/schemes" element={<SchemeDirectoryPage />} />
              <Route path="/documents" element={<DocumentVaultPage />} />
              <Route path="/audit-logs" element={<AuditLogsPage />} />
              <Route path="/reports" element={<ReportsAnalyticsPage />} />
              <Route path="/api-integrations" element={<ApiIntegrationsPage />} />
              <Route path="/settings" element={<SettingsAdminPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
