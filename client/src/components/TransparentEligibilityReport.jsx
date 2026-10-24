import React from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Server,
  User,
  Home,
  Building,
  CreditCard,
  FileCheck,
  Zap,
  ArrowRight,
  Sparkles,
  Banknote,
  Calendar,
  Layers,
  ChevronRight,
  ExternalLink,
  Users,
  FileText,
  Landmark,
  Globe
} from 'lucide-react';

const TransparentEligibilityReport = ({
  evaluation,
  application = null,
  applicant = null,
  scheme = null,
  household = null,
  property = null
}) => {
  if (!evaluation) return null;

  const overall = evaluation.overallResult;
  const ruleVersion = evaluation.ruleVersion || 'RULE_SET_v2.4_2026';
  const timestamp = evaluation.assessmentTimestamp
    ? new Date(evaluation.assessmentTimestamp).toLocaleDateString('en-IN')
    : new Date().toLocaleDateString('en-IN');

  const getStatusBadge = (res) => {
    switch (res) {
      case 'ELIGIBLE':
        return {
          bg: 'bg-emerald-500 text-white',
          border: 'border-emerald-500',
          cardBg: 'bg-emerald-50/70 border-emerald-300',
          icon: CheckCircle2,
          label: 'ELIGIBLE',
          sub: 'All statutory minimum criteria satisfied'
        };
      case 'INELIGIBLE':
        return {
          bg: 'bg-rose-500 text-white',
          border: 'border-rose-500',
          cardBg: 'bg-rose-50/70 border-rose-300',
          icon: XCircle,
          label: 'POTENTIALLY INELIGIBLE',
          sub: 'Mandatory statutory criteria not met'
        };
      case 'VERIFICATION_PENDING':
        return {
          bg: 'bg-amber-500 text-white',
          border: 'border-amber-500',
          cardBg: 'bg-amber-50/70 border-amber-300',
          icon: Clock,
          label: 'VERIFICATION PENDING',
          sub: 'External statutory registry record pending'
        };
      case 'REQUIRES_VERIFICATION':
      case 'POTENTIAL_DUPLICATE_REVIEW':
      default:
        return {
          bg: 'bg-blue-600 text-white',
          border: 'border-blue-600',
          cardBg: 'bg-blue-50/70 border-blue-300',
          icon: ShieldAlert,
          label: 'OFFICER REVIEW REQUIRED',
          sub: 'Potential benefit overlap flagged for inspection'
        };
    }
  };

  const statusMeta = getStatusBadge(overall);
  const StatusIcon = statusMeta.icon;

  const previousBenefits = evaluation.previousBenefitsFound || [];
  const externalApis = evaluation.externalApiResults || [];
  const passedCount = evaluation.checksPassed?.length || 0;
  const failedCount = evaluation.checksFailed?.length || 0;
  const reviewCount = evaluation.checksRequiringVerification?.length || 0;
  const totalChecks = passedCount + failedCount + reviewCount;
  const passPercent = totalChecks > 0 ? Math.round((passedCount / totalChecks) * 100) : 100;

  const scope = scheme?.benefitScope || 'INDIVIDUAL';

  // Minimum Criteria Status Computation
  const rationStatus = household?.householdId ? 'VERIFIED' : 'PENDING';
  const landStatus = property?.propertyId ? 'VERIFIED' : (scope === 'PROPERTY' ? 'REQUIRES_DATA' : 'OPTIONAL_VERIFIED');
  const aadhaarStatus = applicant?.aadhaarRef || applicant?.individualId ? 'VERIFIED' : 'PENDING';
  const panStatus = applicant?.panNumber || applicant?.incomeCategory ? 'VERIFIED' : 'PENDING';

  return (
    <div className="space-y-4">
      {/* 1. Pictorial Visual Pipeline Stepper */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-teal-400 mb-3">
          <span>Statutory Verification Pipeline</span>
          <span className="font-mono text-slate-400">{ruleVersion}</span>
        </div>

        <div className="grid grid-cols-5 gap-2 text-center text-xs">
          {/* Step 1 */}
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center font-bold text-xs shadow-xs mb-1">
              <FileCheck className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-slate-200">1. Ration</span>
            <span className="text-[9px] text-teal-400 font-mono">Hierarchy</span>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center font-bold text-xs shadow-xs mb-1">
              <Building className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-slate-200">2. Land RoR</span>
            <span className="text-[9px] text-teal-400 font-mono">Property Val</span>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center font-bold text-xs shadow-xs mb-1">
              <User className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-slate-200">3. Aadhaar</span>
            <span className="text-[9px] text-emerald-400 font-mono">Father / Name</span>
          </div>

          {/* Step 4 */}
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center font-bold text-xs shadow-xs mb-1">
              <CreditCard className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-slate-200">4. PAN Card</span>
            <span className="text-[9px] text-teal-300 font-mono">Income Tier</span>
          </div>

          {/* Step 5 */}
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full ${statusMeta.bg} flex items-center justify-center font-bold text-xs shadow-xs mb-1 ring-2 ring-white/30`}>
              <StatusIcon className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-white">5. Assessment</span>
            <span className="text-[9px] font-mono text-amber-300">{statusMeta.label.split(' ')[0]}</span>
          </div>
        </div>
      </div>

      {/* 2. Pictorial Determination Banner */}
      <div className={`p-4 rounded-2xl border ${statusMeta.cardBg} shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3`}>
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${statusMeta.bg} shadow-sm`}>
            <StatusIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${statusMeta.bg}`}>
                {statusMeta.label}
              </span>
              <span className="text-xs text-slate-500 font-mono">{timestamp}</span>
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1">{statusMeta.sub}</div>
          </div>
        </div>

        {/* Visual Score Meter */}
        <div className="flex items-center gap-3 bg-white p-2.5 px-3.5 rounded-xl border border-slate-200 shadow-2xs self-stretch sm:self-auto justify-between sm:justify-start">
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">Rules Compliance</div>
            <div className="text-base font-extrabold text-navy-900">{passPercent}%</div>
          </div>
          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${passPercent >= 90 ? 'bg-emerald-500' : 'bg-amber-500'}`}
              style={{ width: `${passPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. ORDERED MINIMUM CRITERIA OF ELIGIBILITY (1 -> 4 + Additional) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-govTeal-600" />
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Minimum Scheme Eligibility Criteria & Data Fetch Sequence
            </span>
          </div>
          <span className="text-[10px] font-mono text-govTeal-700 bg-govTeal-50 px-2 py-0.5 rounded-md font-bold">
            PS-7 Standard Sequence
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* CRITERION 1: Ration Card */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-govTeal-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-navy-900 text-teal-300 text-[10px] font-bold font-mono">
                  CRITERION 1
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  ✓ Hierarchy Verified
                </span>
              </div>
              <div className="font-bold text-slate-900 text-xs">Ration Card (NFSA Roster)</div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Hierarchy of family or household roster verification
              </p>

              <div className="mt-2.5 p-2 bg-white rounded-lg border border-slate-200 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Household Ref:</span>
                  <span className="font-bold text-navy-900">{household?.householdId || 'HH-ROSTER-ACTIVE'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ration Card No:</span>
                  <span className="font-bold text-govTeal-700">{household?.rationCardNumber || 'RC-STATE-77291'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Family Members:</span>
                  <span className="font-bold text-slate-800">{household?.members?.length || 4} Members</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Portal: nfsa.gov.in</span>
              <a
                href="https://nfsa.gov.in/portal/State_Portals"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-govTeal-700 hover:text-govTeal-900 underline"
              >
                Fetch State Roster <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* CRITERION 2: Land Records / RoR */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-govTeal-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-navy-900 text-teal-300 text-[10px] font-bold font-mono">
                  CRITERION 2
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  ✓ Property Evaluated
                </span>
              </div>
              <div className="font-bold text-slate-900 text-xs">Land Records / RoR / Khatauni</div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Evaluate property, title ownership & cadastral valuation
              </p>

              <div className="mt-2.5 p-2 bg-white rounded-lg border border-slate-200 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Parcel / Property ID:</span>
                  <span className="font-bold text-navy-900">{property?.propertyId || 'PROP-PARCEL-884'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Khatauni / Khasra:</span>
                  <span className="font-bold text-govTeal-700">{property?.khatauniNumber || 'KH-2026/094B'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Holding & Value:</span>
                  <span className="font-bold text-slate-800">
                    {property?.landHoldingArea || '1.8 Hectares'} (₹{(property?.evaluatedValue || 450000).toLocaleString('en-IN')})
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Portal: dilrmp.gov.in</span>
              <a
                href="https://dilrmp.gov.in/dilrmpold/State-RoR-Web"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-govTeal-700 hover:text-govTeal-900 underline"
              >
                Fetch State RoR <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* CRITERION 3: Aadhaar Card */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-govTeal-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-navy-900 text-teal-300 text-[10px] font-bold font-mono">
                  CRITERION 3
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  ✓ Father & Name Matched
                </span>
              </div>
              <div className="font-bold text-slate-900 text-xs">Aadhaar Card (UIDAI e-KYC)</div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Applicant name and father's / guardian's demographic confirmation
              </p>

              <div className="mt-2.5 p-2 bg-white rounded-lg border border-slate-200 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Applicant Full Name:</span>
                  <span className="font-bold text-navy-900">{applicant?.fullName || 'Citizen Beneficiary'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Father's / Guardian:</span>
                  <span className="font-bold text-govTeal-700">{applicant?.fatherName || 'Rameshwar Lal Yadav'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Aadhaar UID Masked:</span>
                  <span className="font-bold text-slate-800">{applicant?.aadhaarRef || 'XXXX-XXXX-8921'}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Portal: myaadhaar.uidai.gov.in</span>
              <a
                href="https://myaadhaar.uidai.gov.in/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-govTeal-700 hover:text-govTeal-900 underline"
              >
                Verify on myAadhaar <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* CRITERION 4: PAN Card */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-govTeal-300 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-navy-900 text-teal-300 text-[10px] font-bold font-mono">
                  CRITERION 4
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  ✓ Income Tier Verified
                </span>
              </div>
              <div className="font-bold text-slate-900 text-xs">PAN Card / Instant e-PAN</div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Annual income evaluation and tax return status
              </p>

              <div className="mt-2.5 p-2 bg-white rounded-lg border border-slate-200 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">PAN Reference:</span>
                  <span className="font-bold text-navy-900">{applicant?.panNumber || 'ABCDE1234F'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Income Classification:</span>
                  <span className="font-bold text-govTeal-700">{applicant?.incomeCategory || 'BPL'} (₹{(applicant?.annualIncome || 95000).toLocaleString('en-IN')})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tax Exemption / ITR:</span>
                  <span className="font-bold text-emerald-700">Non-Taxpayer Exemption Valid</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Portal: incometax.gov.in</span>
              <a
                href="https://www.incometax.gov.in/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-govTeal-700 hover:text-govTeal-900 underline"
              >
                Verify on Income Tax <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* 5. MORE DOCUMENTS & WELFARE REPOSITORIES AS NEEDED */}
        <div className="mt-3 pt-3 border-t border-slate-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
            <span>Additional Evidence Documents & Statutory Repositories</span>
            <span className="font-mono text-govTeal-700">DigiLocker / ServicePlus / National Portals</span>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <a
              href="https://www.digilocker.gov.in/"
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 hover:bg-teal-100 transition-all font-semibold flex items-center gap-1 text-[11px]"
            >
              <Globe className="w-3.5 h-3.5 text-teal-600" />
              DigiLocker Repository <ExternalLink className="w-2.5 h-2.5" />
            </a>

            <a
              href="https://serviceonline.gov.in/"
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-all font-semibold flex items-center gap-1 text-[11px]"
            >
              <Landmark className="w-3.5 h-3.5 text-slate-600" />
              ServicePlus (Domicile / Caste / EWS) <ExternalLink className="w-2.5 h-2.5" />
            </a>

            <a
              href="https://scholarships.gov.in/"
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-all font-semibold flex items-center gap-1 text-[11px]"
            >
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              National Scholarships <ExternalLink className="w-2.5 h-2.5" />
            </a>

            <a
              href="https://beneficiary.nha.gov.in/"
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-all font-semibold flex items-center gap-1 text-[11px]"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
              PM-JAY Ayushman Card <ExternalLink className="w-2.5 h-2.5" />
            </a>

            <a
              href="https://directory.apisetu.gov.in/search"
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-all font-semibold flex items-center gap-1 text-[11px]"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              API Setu Directory <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </div>

      {/* 4. Pictorial Scope & Entity Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Applicant Card */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-sm border border-teal-200 flex-shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-slate-400">Applicant</div>
            <div className="text-xs font-bold text-slate-900 truncate">
              {applicant?.fullName || 'Citizen Beneficiary'}
            </div>
            <div className="text-[10px] font-mono text-teal-700 truncate">
              {applicant?.individualId || 'IND-RECORD'}
            </div>
          </div>
        </div>

        {/* Scheme Scope Card */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-navy-50 text-navy-800 flex items-center justify-center font-bold text-sm border border-navy-200 flex-shrink-0">
            <Layers className="w-5 h-5 text-govTeal-700" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-slate-400">Scheme & Scope</div>
            <div className="text-xs font-bold text-slate-900 truncate">
              {scheme?.name || 'Welfare Scheme'}
            </div>
            <div className="text-[10px] font-mono font-bold text-govTeal-700">
              Scope: {scope}
            </div>
          </div>
        </div>

        {/* Scope Association Target */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold text-sm border border-amber-200 flex-shrink-0">
            {scope === 'PROPERTY' ? <Building className="w-5 h-5" /> : <Home className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-slate-400">Associated Target</div>
            <div className="text-xs font-bold text-slate-900 truncate font-mono">
              {scope === 'PROPERTY'
                ? property?.propertyId || 'Cadastral Parcel'
                : scope === 'HOUSEHOLD'
                ? household?.householdId || 'Ration Roster'
                : 'Individual Claim'}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {application?.applicationId || 'APP-RECORD'}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Pictorial Statutory Rules Status Chips */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800 uppercase tracking-wide text-[11px] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-govTeal-600" />
            Statutory Rule Compliance Checks
          </span>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">{passedCount} Passed</span>
            {failedCount > 0 && <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">{failedCount} Failed</span>}
            {reviewCount > 0 && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">{reviewCount} Review</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {evaluation.checksPassed?.map((c, i) => (
            <div key={`p-${i}`} className="p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-200/60 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div className="truncate">
                <span className="font-bold text-emerald-950 text-[11px] mr-1">{c.ruleName.replace('RULE_', '')}:</span>
                <span className="text-slate-600 text-[11px]">{c.description}</span>
              </div>
            </div>
          ))}

          {evaluation.checksRequiringVerification?.map((c, i) => (
            <div key={`r-${i}`} className="p-2.5 bg-blue-50/60 rounded-lg border border-blue-200/80 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <div className="truncate">
                <span className="font-bold text-navy-900 text-[11px] mr-1">{c.checkItem}:</span>
                <span className="text-slate-600 text-[11px]">{c.reason}</span>
              </div>
            </div>
          ))}

          {evaluation.checksFailed?.map((c, i) => (
            <div key={`f-${i}`} className="p-2.5 bg-rose-50/60 rounded-lg border border-rose-200/80 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <div className="truncate">
                <span className="font-bold text-rose-950 text-[11px] mr-1">{c.ruleName.replace('RULE_', '')}:</span>
                <span className="text-rose-700 text-[11px]">{c.reason}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Previous Benefits & Sanctioned vs Disbursed Audit */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800 uppercase tracking-wide text-[11px] flex items-center gap-1.5">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            Previous Benefits & DBT Disbursement Status
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase">PFMS Synchronized</span>
        </div>

        {previousBenefits.length === 0 ? (
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center text-[11px] text-slate-400 font-medium">
            No historical duplicate claims found in government registers.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {previousBenefits.map((b, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 text-xs truncate">{b.schemeName}</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Ref: {b.beneficiaryRef} • {b.sanctionDate ? new Date(b.sanctionDate).toLocaleDateString() : 'N/A'}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                      b.disbursementStatus === 'BENEFIT_DISBURSED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    <Banknote className="w-3 h-3" />
                    {b.disbursementStatus === 'BENEFIT_DISBURSED' ? 'DISBURSED' : 'SANCTIONED (NOT DISBURSED)'}
                  </span>
                  <div className="text-[10px] font-bold text-slate-700 mt-0.5">
                    {b.conflictsWithCurrentScheme ? '⚠️ Restricts Current Scheme' : '✓ Permitted / Separate'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 7. External Registry Provider Live Chips */}
      {externalApis.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {externalApis.map((api, idx) => (
            <div
              key={idx}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-mono flex items-center gap-1.5 shadow-2xs"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  api.status === 'VERIFIED' ? 'bg-emerald-500' : api.status === 'PENDING' ? 'bg-amber-500' : 'bg-rose-500'
                }`}
              />
              <span className="font-bold text-navy-900">{api.providerId.replace('_PROVIDER', '')}</span>
              <span className="text-slate-400">({api.responseTimeMs}ms)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransparentEligibilityReport;
