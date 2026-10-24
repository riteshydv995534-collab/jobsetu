import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Building,
  Search,
  Plus,
  Eye,
  Home,
  CheckCircle2,
  Banknote,
  Link as LinkIcon
} from 'lucide-react';

const PropertyRegistryPage = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProp, setSelectedProp] = useState(null);
  const [propDetail, setPropDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Link Household State (Admin)
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [households, setHouseholds] = useState([]);
  const [linkForm, setLinkForm] = useState({
    householdId: '',
    associationType: 'RESIDENT',
    reason: 'Verified municipal survey residential dwelling occupancy'
  });

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      const res = await api.get('/properties', { params });
      if (res.data.success) {
        setProperties(res.data.data);
      }
    } catch (err) {
      console.error('Failed fetching properties:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
    api.get('/households?limit=50').then((r) => setHouseholds(r.data.data || []));
  }, []);

  const handleViewDetail = async (prop) => {
    setSelectedProp(prop);
    try {
      setDetailLoading(true);
      const res = await api.get(`/properties/${prop._id}`);
      if (res.data.success) {
        setPropDetail(res.data.data);
      }
    } catch (err) {
      console.error('Failed loading property detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleLinkSubmit = async (e) => {
    e.preventDefault();
    if (!linkForm.householdId || !linkForm.reason) {
      alert('Household and justification reason are required.');
      return;
    }

    try {
      const res = await api.post(`/properties/${selectedProp._id}/associate`, linkForm);
      if (res.data.success) {
        alert(res.data.message);
        setLinkModalOpen(false);
        handleViewDetail(selectedProp);
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Association failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900">Property & Asset Cadastral Registry</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Georeferenced property records with verified benefit allocation ceilings, distinguishing ownership from tenancy and domestic residency.
        </p>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search property by Property ID (PROP-100), address, or khasra survey number..."
            className="w-full text-xs pl-8 pr-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-govTeal-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
        <button
          onClick={fetchProperties}
          className="px-4 py-2 bg-navy-800 text-white rounded-lg text-xs font-semibold hover:bg-navy-900"
        >
          Search
        </button>
      </div>

      {/* Property Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400">Loading properties...</div>
        ) : (
          properties.map((p) => (
            <div
              key={p._id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-navy-800 bg-slate-100 px-2 py-0.5 rounded">
                    {p.propertyId}
                  </span>
                  <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded uppercase">
                    {p.propertyType}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900">{p.addressLine1}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {p.villageWard}, {p.district}, {p.state} - {p.pincode}
                </p>

                <div className="mt-3 text-xs text-slate-600 space-y-1">
                  <div>
                    <span className="text-slate-400">Cadastral Survey:</span>{' '}
                    <span className="font-mono font-medium text-slate-800">{p.surveyNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Associated Households:</span>{' '}
                    <span className="font-bold text-govTeal-700">{p.associatedHouseholdCount || 0}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between">
                <button
                  onClick={() => handleViewDetail(p)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View History
                </button>
                <span className="text-[11px] font-bold text-slate-500">
                  {p.totalSanctionedBenefits > 0 ? `₹${Number(p.totalSanctionedBenefits || 0).toLocaleString('en-IN')} Granted` : 'No Grants'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Property Detail Modal */}
      {selectedProp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="font-mono text-xs font-bold text-navy-800 bg-slate-100 px-2 py-0.5 rounded">
                  {selectedProp.propertyId}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedProp.addressLine1}</h3>
                <p className="text-xs text-slate-500">
                  Cadastral Khasra: {selectedProp.surveyNumber} | Plot: {selectedProp.plotNumber}
                </p>
              </div>
              <button onClick={() => setSelectedProp(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">
                &times;
              </button>
            </div>

            {detailLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading property associations...</div>
            ) : !propDetail ? null : (
              <div className="mt-4 space-y-4">
                {/* Associated Households */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                      <Home className="w-4 h-4 text-govTeal-600" />
                      Associated Households ({propDetail.associations?.length || 0})
                    </h4>
                    {user?.role === 'RECORDS_ADMIN' && (
                      <button
                        onClick={() => setLinkModalOpen(true)}
                        className="px-2.5 py-1 bg-govTeal-600 hover:bg-govTeal-700 text-white rounded text-[11px] font-bold flex items-center gap-1"
                      >
                        <LinkIcon className="w-3 h-3" />
                        Link Household
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {(propDetail.associations || []).map((a) => (
                      <div key={a._id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between">
                        <div>
                          <div className="font-bold text-navy-900">{a.household?.householdId} — {a.household?.addressLine1}</div>
                          <div className="text-[11px] text-slate-500">
                            Type: <strong className="text-slate-700">{a.associationType}</strong> | Since: {a.startDate && !isNaN(new Date(a.startDate).getTime()) ? new Date(a.startDate).toLocaleDateString() : 'N/A'}
                          </div>
                        </div>
                        <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded self-center">
                          {a.isCurrent ? 'Current Occupant' : 'Past'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Property Benefit History (Crucial for Property Scope schemes like Sanitation) */}
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider mb-2 flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-govTeal-600" />
                    Property Benefit Allocation History
                  </h4>
                  {!propDetail.benefitHistory || propDetail.benefitHistory.length === 0 ? (
                    <div className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl">
                      No property-level schemes sanctioned for this land plot yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(propDetail.benefitHistory || []).map((b) => (
                        <div key={b._id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between">
                          <div>
                            <div className="font-bold text-slate-900">{b.scheme?.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              Record: {b.recordId} | Recipient: {b.recipientIndividual?.fullName || 'Property Grant'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-govTeal-700 text-sm">₹{Number(b.benefitAmount || 0).toLocaleString('en-IN')}</div>
                            <span className="text-[10px] uppercase font-bold text-slate-500">{b.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Link Household Modal */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-xs space-y-3">
            <h3 className="text-base font-bold text-slate-900">Link Household to Property</h3>
            <form onSubmit={handleLinkSubmit} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Household *</label>
                <select
                  value={linkForm.householdId}
                  onChange={(e) => setLinkForm({ ...linkForm, householdId: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                  required
                >
                  <option value="">-- Choose Household --</option>
                  {households.map((hh) => (
                    <option key={hh._id} value={hh._id}>
                      {hh.householdId} — {hh.addressLine1}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Association Nature *</label>
                <select
                  value={linkForm.associationType}
                  onChange={(e) => setLinkForm({ ...linkForm, associationType: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                >
                  <option value="RESIDENT">Resident (Domicile)</option>
                  <option value="OWNER">Owner (Titleholder)</option>
                  <option value="TENANT">Tenant (Leaseholder)</option>
                  <option value="CARETAKER">Caretaker</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Justification Reason *</label>
                <textarea
                  rows={2}
                  value={linkForm.reason}
                  onChange={(e) => setLinkForm({ ...linkForm, reason: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setLinkModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-navy-800 text-white rounded-lg font-bold">
                  Save Association
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyRegistryPage;
