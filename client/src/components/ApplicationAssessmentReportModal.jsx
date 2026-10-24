import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  ShieldCheck,
  Printer,
  Download,
  X,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Building,
  Home,
  User,
  Scale,
  CreditCard,
  Lock,
  Info
} from 'lucide-react';

const ApplicationAssessmentReportModal = ({ applicationId, onClose }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [minimizedMode, setMinimizedMode] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get(`/applications/${applicationId}/report`);
        if (res.data.success) {
          setReport(res.data.data);
        } else {
          setError(res.data.message || 'Failed to fetch assessment report.');
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Error generating assessment report.');
      } finally {
        setLoading(false);
      }
    };

    if (applicationId) {
      fetchReport();
    }
  }, [applicationId]);

  const handlePrint = () => {
    window.print();
  };

  if (!applicationId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] print:max-h-none overflow-y-auto print:overflow-visible flex flex-col font-sans">
        {/* Printable & Screen Header Bar */}
        <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between print:bg-white print:text-black print:border-b-2 print:border-black flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-md print:hidden">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] sm:text-xs font-mono tracking-widest uppercase text-teal-400 print:text-slate-700 font-bold">
                Government Scheme Verification & Eligibility Intelligence Platform
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white print:text-black">
                APPLICATION ASSESSMENT REPORT
              </h2>
              <div className="text-[11px] text-slate-300 print:text-slate-600">
                Official Consolidated Verification, Eligibility & Allocation Intelligence File
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={() => setMinimizedMode(!minimizedMode)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700"
              title="Apply Data Minimisation rules (masks sensitive identifiers)"
            >
              {minimizedMode ? 'Disable Masking' : 'Data Minimisation Mode'}
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div className="p-4 sm:p-8 space-y-6 flex-1 text-slate-800 text-xs">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-500">
                Compiling database records, statutory criteria explanations, and provenance history...
              </p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-center space-y-2">
              <AlertTriangle className="w-6 h-6 text-rose-600 mx-auto" />
              <p className="font-bold text-sm">Report Generation Error</p>
              <p className="text-xs">{error}</p>
            </div>
          ) : !report ? null : (
            <div className="space-y-6 print:space-y-4">
              {/* Official Notice */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2.5 print:border-slate-300">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5 print:hidden" />
                <div className="text-[11px] leading-relaxed">
                  <strong>Statutory Notice:</strong> This report is dynamically generated from authorised JanSetu database records.
                  JanSetu serves as an eligibility verification intelligence bridge. Final statutory grant and fund disbursement remain under the lawful jurisdiction of the competent government treasury.
                </div>
              </div>

              {/* SECTION A — Application Overview */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3 print:bg-white print:border-slate-300">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-600" />
                    {report.sectionA.title}
                  </h3>
                  <span className="font-mono text-[10px] bg-slate-200 px-2 py-0.5 rounded font-bold text-slate-700">
                    STATUS: {report.sectionA.currentProcessingStatus}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Internal Application ID:</span>
                    <strong className="font-mono text-slate-900 text-xs">{report.sectionA.internalApplicationReference}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Source Reference:</span>
                    <strong className="font-mono text-slate-800">
                      {minimizedMode ? 'EXT-***-MASKED' : report.sectionA.sourceSystemApplicationReference}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Scheme Name:</span>
                    <strong className="text-slate-900">{report.sectionA.schemeName}</strong>
                    <span className="text-slate-400 font-mono text-[10px] block">({report.sectionA.schemeCode})</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Competent Department:</span>
                    <strong className="text-slate-900">{report.sectionA.sourceDepartment}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Received Timestamp:</span>
                    <span>{new Date(report.sectionA.receivedTimestamp).toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Assessment Timestamp:</span>
                    <span>{new Date(report.sectionA.lastAssessmentTimestamp).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* SECTION B — Data Verification */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3 print:border-slate-300">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    {report.sectionB.title}
                  </h3>
                  <span className="font-bold text-[11px] text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded">
                    Completeness: {report.sectionB.dataCompleteness}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                    <span className="text-slate-500 block font-semibold">Individual Demographic Verification</span>
                    <div className="font-bold text-teal-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                      {report.sectionB.individualVerificationStatus}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                    <span className="text-slate-500 block font-semibold">Household Membership Verification</span>
                    <div className={`font-bold flex items-center gap-1.5 ${
                      report.sectionB.householdVerificationStatus === 'VERIFIED' ? 'text-teal-800' : 'text-amber-800'
                    }`}>
                      {report.sectionB.householdVerificationStatus === 'VERIFIED' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                      )}
                      {report.sectionB.householdVerificationStatus}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                    <span className="text-slate-500 block font-semibold">Property Cadastral Verification</span>
                    <div className="font-bold text-slate-700">
                      {report.sectionB.propertyVerificationStatus}
                    </div>
                  </div>
                </div>

                {report.sectionB.missingInformation.length > 0 && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px]">
                    <strong>Missing Evidence Identified:</strong> {report.sectionB.missingInformation.join(', ')}
                  </div>
                )}
              </div>

              {/* SECTION C — Eligibility Analysis */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3 print:border-slate-300">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div>
                    <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      {report.sectionC.title}
                    </h3>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Rule Engine Version: <strong>{report.sectionC.schemeRuleVersion}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-black text-white ${
                      report.sectionC.overallEligibilityResult === 'ELIGIBLE' ? 'bg-emerald-600' : 'bg-rose-600'
                    }`}>
                      {report.sectionC.overallEligibilityResult}
                    </span>
                  </div>
                </div>

                {/* Criteria Completion Bar */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{report.sectionC.completionSummary}</div>
                    <div className="text-[10px] text-slate-500">
                      Measures assessment data completeness — not probability of entitlement.
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-700 font-bold">{report.sectionC.numberPassed} Passed</span>
                    <span className="text-rose-700 font-bold">{report.sectionC.numberFailed} Failed</span>
                    <span className="text-amber-700 font-bold">{report.sectionC.numberPendingVerification} Pending</span>
                  </div>
                </div>

                {/* Explanations Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">Statutory Criterion</th>
                        <th className="p-2.5">Determination</th>
                        <th className="p-2.5">Rule Explanation & Database Provenance</th>
                        <th className="p-2.5">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.sectionC.criterionByCriterionExplanation.map((c, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2.5 font-bold text-slate-900">{c.criterion}</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.result === 'PASSED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : c.result === 'FAILED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {c.result}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-700">{c.explanation}</td>
                          <td className="p-2.5 text-[10px] font-mono text-slate-500">
                            {c.mandatory ? 'MANDATORY' : 'OPTIONAL'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION D — Duplicate and Benefit History */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3 print:border-slate-300">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-600" />
                    {report.sectionD.title}
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Previous Approvals: <strong>{report.sectionD.previousApprovals}</strong> | Confirmed Disbursements:{' '}
                    <strong>{report.sectionD.confirmedDisbursements.length}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div className="space-y-1.5">
                    <span className="font-bold text-slate-700 block">Confirmed Disbursements</span>
                    {report.sectionD.confirmedDisbursements.length === 0 ? (
                      <div className="text-slate-400 italic bg-slate-50 p-2 rounded">
                        No previous confirmed fund disbursements on record.
                      </div>
                    ) : (
                      report.sectionD.confirmedDisbursements.map((d, idx) => (
                        <div key={idx} className="p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-950 font-mono">
                          ₹{Number(d.amount).toLocaleString('en-IN')} via DBT ({d.transactionRef})
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <span className="font-bold text-slate-700 block">Duplicate & Overlap Review Alerts</span>
                    {report.sectionD.potentialDuplicateApplications.length === 0 ? (
                      <div className="text-emerald-700 font-semibold bg-emerald-50/50 p-2 rounded flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        No overlapping claims or duplicate alerts found.
                      </div>
                    ) : (
                      report.sectionD.potentialDuplicateApplications.map((al, idx) => (
                        <div key={idx} className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-900">
                          <span className="font-bold">[{al.severity}]</span> {al.reason}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION E — Allocation Assessment */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3 print:border-slate-300">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    {report.sectionE.title}
                  </h3>
                  <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-bold">
                    {report.sectionE.isRestrictedScheme ? 'RESTRICTED ALLOCATION POLICY' : 'STANDARD SCHEME'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Competing Household Claims:</span>
                    <strong>{report.sectionE.competingApplicationsCount} application(s) in current benefit cycle</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Documented Priority Criteria:</span>
                    <span className="text-slate-800">{report.sectionE.documentedPriorityCriteria}</span>
                  </div>
                  <div className="sm:col-span-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase font-bold block">Engine Recommendation</span>
                      <strong className="text-teal-900 font-bold">{report.sectionE.recommendation}</strong>
                    </div>
                    {report.sectionE.reasonForHumanReview && (
                      <span className="text-amber-800 bg-amber-100 font-bold px-2 py-1 rounded text-[10px]">
                        {report.sectionE.reasonForHumanReview}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION F — Final Administrative Workflow */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3 print:border-slate-300">
                <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                  <span className="w-2 h-2 rounded-full bg-purple-600" />
                  {report.sectionF.title}
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-[10px] text-center">
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 block">1. Verification</span>
                    <strong className="text-slate-800">{report.sectionF.stages.verificationCompleted.status}</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 block">2. Assessment</span>
                    <strong className="text-slate-800">{report.sectionF.stages.assessmentCompleted.status}</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 block">3. Officer Review</span>
                    <strong className="text-slate-800">{report.sectionF.stages.officerReview.status}</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 block">4. Recommendation</span>
                    <strong className="text-slate-800">{report.sectionF.stages.recommendationRecorded.status}</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 block">5. Final Decision</span>
                    <strong className="text-slate-800">{report.sectionF.stages.finalDecisionRecorded.status}</strong>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 block">6. Disbursement</span>
                    <strong className="text-teal-800">{report.sectionF.stages.disbursementConfirmed.status}</strong>
                  </div>
                </div>
              </div>

              {/* SECTION G — Audit and Provenance */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3 print:border-slate-300 text-[11px]">
                <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2">
                  <span className="w-2 h-2 rounded-full bg-slate-800" />
                  {report.sectionG.title}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-500 block">Assessment Audit ID:</span>
                    <span className="font-mono text-slate-800">{report.sectionG.assessmentId}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Reviewing Authority Officer:</span>
                    <strong className="text-slate-900">{report.sectionG.authorisedReviewingOfficer}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Data Provenance Source:</span>
                    <span className="text-slate-800 font-mono">{report.sectionG.sourceReferences.sourceSystem}</span>
                  </div>
                </div>

                {report.sectionG.auditEvents.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="font-bold text-slate-700 block text-[10px] uppercase mb-1">
                      Recent Provenance Audit Events:
                    </span>
                    <div className="space-y-1">
                      {report.sectionG.auditEvents.slice(0, 4).map((a, idx) => (
                        <div key={idx} className="text-[10px] text-slate-600 flex items-center justify-between bg-slate-50 p-1.5 rounded">
                          <span><strong>{a.action}</strong> by {a.actingUser}</span>
                          <span className="text-slate-400">{new Date(a.timestamp).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 print:hidden flex-shrink-0">
          <span>JanSetu Assessment Report &bull; Cryptographically Verified Record</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApplicationAssessmentReportModal;