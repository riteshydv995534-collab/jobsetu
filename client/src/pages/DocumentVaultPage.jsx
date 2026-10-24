import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  FolderOpen,
  Upload,
  FileText,
  Download,
  CheckCircle2,
  Lock,
  Info,
  Calendar,
  Search,
  ExternalLink,
  ShieldCheck,
  Globe,
  Building,
  User,
  CreditCard
} from 'lucide-react';

const DocumentVaultPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form State
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState('IDENTITY_PROOF');
  const [linkedEntityType, setLinkedEntityType] = useState('APPLICATION');
  const [linkedEntityId, setLinkedEntityId] = useState('APP-2026-001');

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/documents');
      if (res.data.success) {
        setDocuments(res.data.data);
      }
    } catch (err) {
      console.error('Failed fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('Please select a demonstration file to upload.');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      formData.append('linkedEntityType', linkedEntityType);
      formData.append('linkedEntityId', linkedEntityId);

      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        alert(res.data.message);
        setUploadModalOpen(false);
        setFile(null);
        fetchDocuments();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (doc) => {
    window.open(`${api.defaults.baseURL}/documents/${doc._id}/download`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Digital Document Evidence Vault</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Encrypted demonstration repository storing synthetic identity, income affidavits, and cadastral survey certificates.
          </p>
        </div>

        <button
          onClick={() => setUploadModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-navy-800 hover:bg-navy-900 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
        >
          <Upload className="w-4 h-4" />
          Upload Evidence Document
        </button>
      </div>

      {/* Official Government Data Fetch Portals (Minimum Criteria 1 -> 4 + Repositories) */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-teal-400">
              Statutory Public Documentation & Evidence Fetch Sequence
            </div>
            <h3 className="text-sm font-bold text-slate-100">
              Direct Government Source Portals (PS 7 Reference)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-teal-300 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
            Order: 1. Ration → 2. Land → 3. Aadhaar → 4. PAN → 5. Repositories
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Card 1 */}
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex flex-col justify-between hover:border-teal-400 transition-all">
            <div>
              <div className="flex items-center justify-between text-[10px] text-teal-400 font-bold mb-1">
                <span>CRITERION 1</span>
                <span className="font-mono text-slate-400">nfsa.gov.in</span>
              </div>
              <div className="font-bold text-slate-100 text-xs">Ration Card (NFSA)</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Hierarchy of family or household roster & BPL classification
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-700 flex justify-end">
              <a
                href="https://nfsa.gov.in/portal/State_Portals"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-teal-300 hover:text-teal-200 inline-flex items-center gap-1"
              >
                Fetch State Roster <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex flex-col justify-between hover:border-teal-400 transition-all">
            <div>
              <div className="flex items-center justify-between text-[10px] text-teal-400 font-bold mb-1">
                <span>CRITERION 2</span>
                <span className="font-mono text-slate-400">dilrmp.gov.in</span>
              </div>
              <div className="font-bold text-slate-100 text-xs">Land Records / RoR</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Evaluate property, title ownership, area & cadastral value
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-700 flex justify-end">
              <a
                href="https://dilrmp.gov.in/dilrmpold/State-RoR-Web"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-teal-300 hover:text-teal-200 inline-flex items-center gap-1"
              >
                Fetch State RoR <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex flex-col justify-between hover:border-teal-400 transition-all">
            <div>
              <div className="flex items-center justify-between text-[10px] text-teal-400 font-bold mb-1">
                <span>CRITERION 3</span>
                <span className="font-mono text-slate-400">uidai.gov.in</span>
              </div>
              <div className="font-bold text-slate-100 text-xs">Aadhaar Card (UIDAI)</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Applicant name and father's / guardian name verification
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-700 flex justify-end">
              <a
                href="https://myaadhaar.uidai.gov.in/"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-teal-300 hover:text-teal-200 inline-flex items-center gap-1"
              >
                Verify on myAadhaar <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          {/* Card 4 */}
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex flex-col justify-between hover:border-teal-400 transition-all">
            <div>
              <div className="flex items-center justify-between text-[10px] text-teal-400 font-bold mb-1">
                <span>CRITERION 4</span>
                <span className="font-mono text-slate-400">incometax.gov.in</span>
              </div>
              <div className="font-bold text-slate-100 text-xs">PAN Card / Income Tax</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Annual income assessment, ITR return & tax classification
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-700 flex justify-end">
              <a
                href="https://www.incometax.gov.in/"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-bold text-teal-300 hover:text-teal-200 inline-flex items-center gap-1"
              >
                Verify on Income Tax <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Repositories Row */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">More Repositories:</span>
          <a
            href="https://www.digilocker.gov.in/"
            target="_blank"
            rel="noreferrer"
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-teal-300 font-medium inline-flex items-center gap-1 text-[11px]"
          >
            DigiLocker <ExternalLink className="w-2.5 h-2.5" />
          </a>
          <a
            href="https://serviceonline.gov.in/"
            target="_blank"
            rel="noreferrer"
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium inline-flex items-center gap-1 text-[11px]"
          >
            ServicePlus (Caste/Domicile/Income) <ExternalLink className="w-2.5 h-2.5" />
          </a>
          <a
            href="https://directory.apisetu.gov.in/search"
            target="_blank"
            rel="noreferrer"
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium inline-flex items-center gap-1 text-[11px]"
          >
            API Setu Directory <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>

      {/* Synthetic Privacy Banner */}
      <div className="bg-slate-100 rounded-xl p-3 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
        <Lock className="w-4 h-4 text-govTeal-600 flex-shrink-0" />
        <span>
          <strong>Data Privacy Safeguard:</strong> Real Aadhaar, PAN, or bank credentials are never stored. Only demonstration synthetic files (up to 5MB) are accepted and routed through authenticated backend token streams.
        </span>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Doc ID</th>
                <th className="py-3 px-4">File Name</th>
                <th className="py-3 px-4">Document Type</th>
                <th className="py-3 px-4">Linked Entity</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Upload Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading evidence vault...
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No documents uploaded yet. Click "Upload Evidence Document" to attach demonstration files.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-navy-900">{doc.documentId}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        {doc.originalName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{doc.mimeType}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{doc.documentType}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-semibold text-govTeal-700 bg-govTeal-50 px-2 py-0.5 rounded">
                        {doc.linkedEntityType}: {doc.linkedEntityId}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{(doc.sizeBytes / 1024).toFixed(1)} KB</td>
                    <td className="py-3 px-4 text-slate-500">{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-xs space-y-3">
            <h3 className="text-base font-bold text-slate-900">Upload Demonstration Document</h3>
            <form onSubmit={handleUploadSubmit} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select File (PDF, PNG, JPG &lt; 5MB) *</label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                  accept=".pdf,.png,.jpg,.jpeg"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Classification *</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                >
                  <option value="IDENTITY_PROOF">Identity Proof (Demo Aadhaar/Voter)</option>
                  <option value="RATION_CARD">Ration Card Scan</option>
                  <option value="INCOME_CERTIFICATE">Tehsildar Income Certificate</option>
                  <option value="PROPERTY_TAX_RECEIPT">Property Tax Receipt / Deed</option>
                  <option value="AFFIDAVIT">Household Separation Affidavit</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Linked Entity Type</label>
                  <select
                    value={linkedEntityType}
                    onChange={(e) => setLinkedEntityType(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                  >
                    <option value="APPLICATION">Application</option>
                    <option value="INDIVIDUAL">Individual</option>
                    <option value="HOUSEHOLD">Household</option>
                    <option value="PROPERTY">Property</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Entity ID</label>
                  <input
                    type="text"
                    value={linkedEntityId}
                    onChange={(e) => setLinkedEntityId(e.target.value)}
                    placeholder="e.g. APP-2026-001"
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none font-mono"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-1.5 bg-navy-800 text-white rounded-lg font-bold"
                >
                  {uploading ? 'Uploading...' : 'Save Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentVaultPage;
