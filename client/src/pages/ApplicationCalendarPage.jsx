import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  CreditCard,
  Building,
  User,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Search,
  Eye,
  FileText
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const ApplicationCalendarPage = () => {
  const { user } = useAuth();

  // Current calendar viewing month
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed

  // Filters
  const [schemes, setSchemes] = useState([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState('ALL');
  const [activityData, setActivityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Selected date for detail drawer
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayDetails, setDayDetails] = useState(null);
  const [dayLoading, setDayLoading] = useState(false);

  useEffect(() => {
    fetchSchemes();
  }, []);

  useEffect(() => {
    fetchCalendarActivity();
  }, [currentYear, currentMonth, selectedSchemeId]);

  const fetchSchemes = async () => {
    try {
      const res = await api.get('/schemes');
      if (res.data.success) {
        // If user is scheme officer, filter down to their assigned schemes
        let availableSchemes = res.data.data;
        if (user && user.assignedSchemes && user.assignedSchemes.length > 0 && !['SUPER_ADMIN', 'RECORDS_ADMIN'].includes(user.role)) {
          const assignedIds = user.assignedSchemes.map((s) => (s && s._id ? s._id : s).toString());
          availableSchemes = availableSchemes.filter((s) => assignedIds.includes(s._id.toString()));
        }
        setSchemes(availableSchemes);
      }
    } catch (err) {
      console.error('Error fetching schemes for calendar filter:', err);
    }
  };

  const fetchCalendarActivity = async () => {
    try {
      setLoading(true);
      setError('');
      const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
      let url = `/calendar/activity?month=${monthStr}`;
      if (selectedSchemeId && selectedSchemeId !== 'ALL') {
        url += `&schemeId=${selectedSchemeId}`;
      }

      const res = await api.get(url);
      if (res.data.success) {
        setActivityData(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load calendar activity.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDate = async (dateStr) => {
    setSelectedDate(dateStr);
    try {
      setDayLoading(true);
      let url = `/calendar/date/${dateStr}`;
      if (selectedSchemeId && selectedSchemeId !== 'ALL') {
        url += `&schemeId=${selectedSchemeId}`;
      }
      const res = await api.get(url);
      if (res.data.success) {
        setDayDetails(res.data.data);
      }
    } catch (err) {
      console.error('Error loading day details:', err);
    } finally {
      setDayLoading(false);
    }
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  // Generate calendar grid
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Map daily stats by date string
  const dailyStatsMap = {};
  if (activityData && activityData.days) {
    activityData.days.forEach((d) => {
      dailyStatsMap[d.date] = d;
    });
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Metrics Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-bold">
              <CalendarIcon className="w-3.5 h-3.5 text-teal-600" />
              Departmental Intake & Clearance Ledger
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
              Application Activity Calendar
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Interactive timeline of daily received applications, clearance throughput, and DBT disbursements.
            </p>
          </div>

          {/* Month Controls & Today Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToday}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
            >
              Today
            </button>
            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition-all"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs font-bold text-slate-800 min-w-[120px] text-center">
                {monthNames[currentMonth]} {currentYear}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-white rounded-lg text-slate-700 transition-all"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-700">Scheme Filter:</span>
            <select
              value={selectedSchemeId}
              onChange={(e) => setSelectedSchemeId(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-slate-800 font-medium focus:ring-2 focus:ring-govTeal-500 outline-hidden"
            >
              <option value="ALL">All Authorized Schemes</option>
              {schemes.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Summary Chips */}
          {activityData && activityData.summary && (
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-bold">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Submitted: {activityData.summary.totalSubmitted}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Cleared: {activityData.summary.totalCleared}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 font-bold">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                Disbursed: {activityData.summary.totalDisbursed}
              </span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Calendar Grid */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center text-xs font-bold text-slate-500 py-3">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
          {/* Empty cells before month start */}
          {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
            <div key={`empty-${idx}`} className="min-h-[110px] bg-slate-50/40 p-2" />
          ))}

          {/* Month Days */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const stats = dailyStatsMap[dateStr] || { submitted: 0, cleared: 0, pending: 0, disbursed: 0 };
            const isToday =
              today.getFullYear() === currentYear &&
              today.getMonth() === currentMonth &&
              today.getDate() === dayNum;
            const isSelected = selectedDate === dateStr;
            const hasActivity = stats.submitted > 0 || stats.cleared > 0 || stats.disbursed > 0;

            return (
              <div
                key={dateStr}
                onClick={() => handleSelectDate(dateStr)}
                className={`min-h-[115px] p-2 transition-all cursor-pointer relative group flex flex-col justify-between ${
                  isSelected
                    ? 'bg-teal-50/90 ring-2 ring-govTeal-600 z-10'
                    : isToday
                    ? 'bg-amber-50/40'
                    : 'hover:bg-slate-50'
                }`}
              >
                {/* Date Header */}
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      isToday
                        ? 'bg-amber-500 text-white'
                        : isSelected
                        ? 'bg-govTeal-600 text-white'
                        : 'text-slate-700'
                    }`}
                  >
                    {dayNum}
                  </span>
                  {hasActivity && (
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                  )}
                </div>

                {/* Day Metric Chips */}
                <div className="space-y-1 mt-1 text-[10px]">
                  {stats.submitted > 0 && (
                    <div className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 font-bold truncate flex items-center justify-between">
                      <span>Recv:</span>
                      <span>{stats.submitted}</span>
                    </div>
                  )}
                  {stats.cleared > 0 && (
                    <div className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold truncate flex items-center justify-between">
                      <span>Clear:</span>
                      <span>{stats.cleared}</span>
                    </div>
                  )}
                  {stats.pending > 0 && (
                    <div className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold truncate flex items-center justify-between">
                      <span>Pend:</span>
                      <span>{stats.pending}</span>
                    </div>
                  )}
                  {stats.disbursed > 0 && (
                    <div className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-900 font-bold truncate flex items-center justify-between">
                      <span>DBT:</span>
                      <span>{stats.disbursed}</span>
                    </div>
                  )}
                </div>

                <div className="text-[9px] text-slate-400 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                  Inspect &rarr;
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Date Detail Drawer / Modal */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold">
                    {new Date(selectedDate).toLocaleDateString('en-IN', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mt-1">
                  Activity Detail for {selectedDate}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {dayLoading ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-3 border-govTeal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <div className="text-xs font-bold text-slate-600">Retrieving applications for this date...</div>
              </div>
            ) : dayDetails ? (
              <div className="space-y-6">
                {/* Scheme Breakdown Table */}
                {dayDetails.byScheme && dayDetails.byScheme.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Scheme Performance on {selectedDate}
                    </h4>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                          <tr>
                            <th className="p-2.5">Scheme</th>
                            <th className="p-2.5 text-center">Submitted</th>
                            <th className="p-2.5 text-center">Approved</th>
                            <th className="p-2.5 text-center">Rejected</th>
                            <th className="p-2.5 text-center">In Review</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {dayDetails.byScheme.map((item, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="p-2.5 font-bold text-slate-900">{item.schemeName} ({item.schemeCode})</td>
                              <td className="p-2.5 text-center font-bold text-blue-600">{item.submitted}</td>
                              <td className="p-2.5 text-center font-bold text-emerald-600">{item.approved}</td>
                              <td className="p-2.5 text-center font-bold text-rose-600">{item.rejected}</td>
                              <td className="p-2.5 text-center font-bold text-amber-600">{item.underReview}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Application Records List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Applications ({dayDetails.applications?.length || 0})
                    </h4>
                  </div>

                  {!dayDetails.applications || dayDetails.applications.length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 rounded-xl text-xs text-slate-500">
                      No applications submitted or decided on this date.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {(dayDetails.applications || []).map((app) => (
                        <div
                          key={app._id}
                          className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-teal-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                {app.applicationId}
                              </span>
                              <span className="font-bold text-slate-900">
                                {app.applicantIndividual?.fullName || 'Citizen Applicant'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {app.applicantIndividual?.demoIdentifier}
                              </span>
                            </div>
                            <div className="text-slate-500 text-[11px]">
                              {app.scheme?.name} • ₹{Number(app.requestedAmount || 0).toLocaleString('en-IN')}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              app.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                              app.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                              app.status === 'BENEFIT_DISBURSED' ? 'bg-purple-100 text-purple-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {app.status}
                            </span>
                            <NavLink
                              to={`/applications/${app._id}`}
                              className="inline-flex items-center gap-1 text-govTeal-600 hover:text-govTeal-700 font-bold text-xs"
                            >
                              <span>Review</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </NavLink>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationCalendarPage;
