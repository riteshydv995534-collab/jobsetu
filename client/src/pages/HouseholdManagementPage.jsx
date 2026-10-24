import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Home,
  Users,
  Search,
  Plus,
  ArrowRightLeft,
  Scissors,
  Building,
  CheckCircle2,
  Clock,
  Eye,
  AlertCircle
} from 'lucide-react';

const HouseholdManagementPage = () => {
  const { user } = useAuth();
  const [households, setHouseholds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedHh, setSelectedHh] = useState(null);
  const [hhDetail, setHhDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Split Household Modal State
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [splitForm, setSplitForm] = useState({
    originalHouseholdId: '',
    movingMemberIds: [],
    newAddressLine1: '',
    newDistrict: 'Jaipur',
    reason: 'Brother marriage and establishment of independent dwelling'
  });

  // Move Member Modal State
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [moveForm, setMoveForm] = useState({
    individualId: '',
    fromHouseholdId: '',
    toHouseholdId: '',
    relationshipToHead: 'OTHER',
    reason: 'Family relocation'
  });

  const fetchHouseholds = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      const res = await api.get('/households', { params });
      if (res.data.success) {
        setHouseholds(res.data.data);
      }
    } catch (err) {
      console.error('Failed fetching households:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHouseholds();
  }, []);

  const handleViewHousehold = async (hh) => {
    setSelectedHh(hh);
    try {
      setDetailLoading(true);
      const res = await api.get(`/households/${hh._id}`);
      if (res.data.success) {
        setHhDetail(res.data.data);
      }
    } catch (err) {
      console.error('Failed loading household details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenSplitModal = (hh) => {
    setSelectedHh(hh);
    // Fetch members first
    api.get(`/households/${hh._id}`).then((res) => {
      if (res.data.success) {
        setHhDetail(res.data.data);
        setSplitForm({
          originalHouseholdId: hh._id,
          movingMemberIds: [],
          newAddressLine1: '',
          newDistrict: hh.district,
          reason: 'Family division upon independent livelihood setup'
        });
        setSplitModalOpen(true);
      }
    });
  };

  const handleSplitSubmit = async (e) => {
    e.preventDefault();
    if (splitForm.movingMemberIds.length === 0) {
      alert('Select at least one member to migrate to the new household.');
      return;
    }

    try {
      const res = await api.post('/households/split', splitForm);
      if (res.data.success) {
        alert(res.data.message);
        setSplitModalOpen(false);
        fetchHouseholds();
        if (selectedHh) handleViewHousehold(selectedHh);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Split failed');
    }
  };

  const handleMoveSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/households/move-member', moveForm);
      if (res.data.success) {
        alert(res.data.message);
        setMoveModalOpen(false);
        fetchHouseholds();
        if (selectedHh) handleViewHousehold(selectedHh);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Move failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Family & Household Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Decoupled household rosters, historical membership tracking, and family split operations preserving complete audit lineage.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search household by Household ID (HH-100), address, or ration card..."
            className="w-full text-xs pl-8 pr-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-govTeal-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
        <button
          onClick={fetchHouseholds}
          className="px-4 py-2 bg-navy-800 text-white rounded-lg text-xs font-semibold hover:bg-navy-900"
        >
          Search
        </button>
      </div>

      {/* Household Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">Loading households...</div>
        ) : (
          households.map((hh) => (
            <div
              key={hh._id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-navy-800 bg-slate-100 px-2 py-0.5 rounded">
                    {hh.householdId}
                  </span>
                  <span className="text-[10px] font-bold text-govTeal-700 bg-govTeal-50 border border-govTeal-200 px-2 py-0.5 rounded">
                    {hh.memberCount || 0} Members
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900">{hh.addressLine1}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {hh.villageWard}, {hh.district}, {hh.state} - {hh.pincode}
                </p>

                <div className="mt-3 text-xs text-slate-600 space-y-1">
                  <div>
                    <span className="text-slate-400">Ration Card:</span>{' '}
                    <span className="font-mono font-medium">{hh.rationCardNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Household Head:</span>{' '}
                    <span className="font-semibold text-slate-800">{hh.headOfHousehold?.fullName || 'Not recorded'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleViewHousehold(hh)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Roster & History
                </button>

                {user?.role === 'RECORDS_ADMIN' && (
                  <button
                    onClick={() => handleOpenSplitModal(hh)}
                    className="px-3 py-1.5 bg-navy-800 hover:bg-navy-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
                    title="Split into independent household"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    Split Household
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Household Detail & Historical Roster Modal */}
      {selectedHh && !splitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="font-mono text-xs font-bold text-navy-800 bg-slate-100 px-2 py-0.5 rounded">
                  {selectedHh.householdId}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedHh.addressLine1}</h3>
              </div>
              <button onClick={() => setSelectedHh(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">
                &times;
              </button>
            </div>

            {detailLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading roster & history...</div>
            ) : !hhDetail ? null : (
              <div className="mt-4 space-y-4">
                {/* Active Members */}
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider mb-2 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-govTeal-600" />
                    Current Active Household Members ({hhDetail.currentMembers.length})
                  </h4>
                  <div className="space-y-2">
                    {hhDetail.currentMembers.map((m) => (
                      <div
                        key={m._id}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900">
                            {m.individual?.fullName}{' '}
                            <span className="text-slate-400 font-normal">({m.individual?.individualId})</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Role: <strong className="text-navy-800">{m.relationshipToHead}</strong> | Since:{' '}
                            {new Date(m.startDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">
                            {m.individual?.incomeCategory || 'BPL'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Historical Members Preserved */}
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    Historical Residence Records Preserved ({hhDetail.historicalMembers.length})
                  </h4>
                  {hhDetail.historicalMembers.length === 0 ? (
                    <div className="text-xs text-slate-400 italic p-2 bg-slate-50 rounded-lg">
                      No past moves or separations recorded. Roster is in its original registration state.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {hhDetail.historicalMembers.map((m) => (
                        <div key={m._id} className="p-2.5 bg-slate-50/60 rounded-xl border border-slate-200 text-xs">
                          <div className="font-bold text-slate-700">
                            {m.individual?.fullName} ({m.individual?.individualId})
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Period: {new Date(m.startDate).toLocaleDateString()} to{' '}
                            {m.endDate ? new Date(m.endDate).toLocaleDateString() : 'N/A'}
                          </div>
                          <div className="text-[11px] text-slate-600 italic mt-0.5">Ground: {m.reasonForChange}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Linked Properties */}
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider mb-2 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-slate-500" />
                    Associated Properties
                  </h4>
                  {hhDetail.linkedProperties.map((p) => (
                    <div key={p._id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between">
                      <div>
                        <span className="font-mono font-bold text-navy-800">{p.property?.propertyId}</span> —{' '}
                        {p.property?.addressLine1}
                        <div className="text-[11px] text-slate-500">Association: {p.associationType}</div>
                      </div>
                      <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded self-center">
                        {p.property?.propertyType}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Split Household Modal (Admin Only) */}
      {splitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                  Records Registrar Action
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Split Household: {selectedHh?.householdId}
                </h3>
              </div>
              <button onClick={() => setSplitModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">
                &times;
              </button>
            </div>

            <form onSubmit={handleSplitSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Select Members Migrating to New Independent Household *
                </label>
                <div className="space-y-1.5 border border-slate-200 p-2.5 rounded-xl bg-slate-50 max-h-40 overflow-y-auto">
                  {hhDetail?.currentMembers.map((m) => (
                    <label key={m._id} className="flex items-center gap-2 text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={splitForm.movingMemberIds.includes(m.individual?._id)}
                        onChange={(e) => {
                          const id = m.individual?._id;
                          if (e.target.checked) {
                            setSplitForm({ ...splitForm, movingMemberIds: [...splitForm.movingMemberIds, id] });
                          } else {
                            setSplitForm({
                              ...splitForm,
                              movingMemberIds: splitForm.movingMemberIds.filter((x) => x !== id)
                            });
                          }
                        }}
                        className="rounded text-govTeal-600"
                      />
                      <span>
                        <strong>{m.individual?.fullName}</strong> ({m.relationshipToHead})
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">New Household Address Line 1 *</label>
                <input
                  type="text"
                  value={splitForm.newAddressLine1}
                  onChange={(e) => setSplitForm({ ...splitForm, newAddressLine1: e.target.value })}
                  placeholder="e.g. House 44, New Colony"
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-govTeal-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">District *</label>
                <input
                  type="text"
                  value={splitForm.newDistrict}
                  onChange={(e) => setSplitForm({ ...splitForm, newDistrict: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mandatory Justification Reason *</label>
                <textarea
                  rows={2}
                  value={splitForm.reason}
                  onChange={(e) => setSplitForm({ ...splitForm, reason: e.target.value })}
                  placeholder="State ground (e.g. brother marriage, partition of ancestral residence, migration)..."
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSplitModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-navy-800 hover:bg-navy-900 text-white rounded-lg font-bold"
                >
                  Commit Household Split
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HouseholdManagementPage;
