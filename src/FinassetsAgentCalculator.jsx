import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ORANGE = "rgb(255 109 0)";
const AGENT_SHARE = 0.2;
const CURRENCY = "USD";

const SIZE_OPTIONS = [
  { id: "startup", label: "Startup / Early stage", volumeMinUSD: 0, volumeMaxUSD: 1_000_000, feeRate: 0.004 },
  { id: "small", label: "Small / Growing", volumeMinUSD: 1_000_000, volumeMaxUSD: 6_000_000, feeRate: 0.003 },
  { id: "mid", label: "Mid-market / Scaled", volumeMinUSD: 6_000_000, volumeMaxUSD: 10_000_000, feeRate: 0.0025 },
  { id: "enterprise", label: "Enterprise / Large operator", volumeMinUSD: 10_000_000, volumeMaxUSD: null, feeRate: 0.002 },
];

const BUSINESS_TYPES = [
  { id: "casino", label: "Offshore casino" },
  { id: "ecom", label: "E-commerce & digital goods" },
  { id: "marketplaces", label: "Online platforms & marketplaces" },
  { id: "other", label: "Other legal entities (may be considered)" },
];

const MERCHANT_COUNT_OPTIONS = [
  { id: "1", label: "1", value: 1 },
  { id: "2", label: "2", value: 2 },
  { id: "3", label: "3", value: 3 },
  { id: "4", label: "4", value: 4 },
  { id: "5plus", label: "5+", value: 5 }, // conservative minimum
];

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function formatMoney(n, currency = "USD") {
  if (!Number.isFinite(n)) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(0);
  }
  return n.toLocaleString(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPct(rate) {
  if (!Number.isFinite(rate)) return "0.00%";
  return (rate * 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
}

function midToMaxLabel(min, max, currency) {
  if (!Number.isFinite(min)) min = 0;
  if (max == null || !Number.isFinite(max)) return `From ${formatMoney(min, currency)}+`;
  const mid = round2((min + max) / 2);
  return `From ${formatMoney(mid, currency)} to ${formatMoney(max, currency)}`;
}

function isValidOptionalContact(s) {
  const v = String(s || "").trim();
  if (!v) return true; // optional
  return v.length >= 3;
}

const Card = ({ children, accent = false }) => (
  <div
    className={`rounded-2xl border shadow-sm ${accent ? "bg-orange-50" : "bg-white"}`}
    style={accent ? { borderColor: ORANGE, backgroundColor: "rgba(255,109,0,0.08)" } : { borderColor: "#e5e7eb" }}
  >
    <div className="p-4 sm:p-6">{children}</div>
  </div>
);

const StepWrap = ({ title, children, stepKey }) => (
  <motion.div
    key={stepKey}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25, ease: "easeOut" }}
  >
    <h3 className="text-base sm:text-lg font-semibold mb-3" style={{ color: ORANGE }}>
      {title}
    </h3>
    {children}
  </motion.div>
);

const Button = ({ active, children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-medium transition shadow-sm focus:outline-none focus:ring-2 ${
      active ? "bg-orange-50" : "bg-white"
    }`}
    style={active ? { borderColor: ORANGE, backgroundColor: "rgba(255,109,0,0.08)" } : { borderColor: "#e5e7eb" }}
  >
    {children}
  </button>
);

const Stat = ({ label, value }) => (
  <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
    <div className="text-xs text-gray-500">{label}</div>
    <div className="text-lg font-semibold text-gray-900">{value}</div>
  </div>
);

async function sendToGoogleSheets(payload) {
  const url = import.meta.env.VITE_SHEETS_WEBHOOK_URL;
  const token = import.meta.env.VITE_SHEETS_TOKEN;

  if (!url || !token) {
    throw new Error("Missing VITE_SHEETS_WEBHOOK_URL or VITE_SHEETS_TOKEN in .env");
  }

  const body = JSON.stringify({ ...payload, token });

  await fetch(url, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

export default function FinassetsAgentCalculator() {
  const [started, setStarted] = useState(false);

  const [sizeId, setSizeId] = useState(null);
  const [businessId, setBusinessId] = useState(null);
  const [merchantCountId, setMerchantCountId] = useState(null);

  const [contact, setContact] = useState("");
  const [showResult, setShowResult] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const selectedSize = useMemo(() => SIZE_OPTIONS.find((s) => s.id === sizeId) || null, [sizeId]);
  const selectedBusiness = useMemo(() => BUSINESS_TYPES.find((b) => b.id === businessId) || null, [businessId]);
  const selectedCount = useMemo(() => MERCHANT_COUNT_OPTIONS.find((m) => m.id === merchantCountId) || null, [merchantCountId]);

  const step2Ready = started && !!selectedSize;
  const step3Ready = started && !!selectedSize && !!selectedBusiness;
  const step4Ready = started && !!selectedSize && !!selectedBusiness && !!selectedCount;

  const calc = useMemo(() => {
    if (!selectedSize || !selectedCount) return null;

    const vMin = selectedSize.volumeMinUSD;
    const vMax = selectedSize.volumeMaxUSD;
    const rate = selectedSize.feeRate;

    const minFee = round2(vMin * rate);
    const maxFee = vMax == null ? null : round2(vMax * rate);

    const minCommissionPerMerchant = round2(minFee * AGENT_SHARE);
    const maxCommissionPerMerchant = maxFee == null ? null : round2(maxFee * AGENT_SHARE);

    const merchantsMin = selectedCount.value;

    const minCommissionTotal = round2(minCommissionPerMerchant * merchantsMin);
    const maxCommissionTotal = maxCommissionPerMerchant == null ? null : round2(maxCommissionPerMerchant * merchantsMin);

    return {
      feeRate: rate,
      share: AGENT_SHARE,
      merchantsMin,
      isOpenEnded: vMax == null,

      turnover: {
        min: round2(vMin),
        max: vMax == null ? null : round2(vMax),
      },

      commissionPerMerchant: {
        min: round2(minCommissionPerMerchant),
        max: maxCommissionPerMerchant == null ? null : round2(maxCommissionPerMerchant),
      },

      commissionTotal: {
        min: round2(minCommissionTotal),
        max: maxCommissionTotal == null ? null : round2(maxCommissionTotal),
      },
    };
  }, [selectedSize, selectedCount]);

  function resetAll() {
    setStarted(false);
    setSizeId(null);
    setBusinessId(null);
    setMerchantCountId(null);
    setContact("");
    setShowResult(false);
    setSaveMsg("");
    setSaving(false);
  }

  async function onCalculateAndSave() {
    setSaveMsg("");
    if (!calc || !selectedSize || !selectedBusiness || !selectedCount) return;

    const c = String(contact || "").trim();
    if (!isValidOptionalContact(c)) {
      setSaveMsg("Please enter a valid contact (or leave it empty).");
      return;
    }

    setShowResult(true);
    setSaving(true);

    try {
      // IMPORTANT: send ALWAYS (even if contact empty) so you log all selections.
      // Also keep field names that Apps Script expects.
      const payload = {
        timestamp_iso: new Date().toISOString(),

        // Apps Script expects `email`, so we map contact -> email to keep backend unchanged.
        email: c,

        company_size_id: selectedSize.id,
        company_size_label: selectedSize.label,

        business_type_id: selectedBusiness.id,
        business_type_label: selectedBusiness.label,

        merchants_label: selectedCount.label,
        merchants_min_count: selectedCount.value,

        fee_rate: calc.feeRate,
        agent_share: calc.share,

        currency: CURRENCY,
        fx_rate: 1,

        turnover_min: calc.turnover.min,
        turnover_max: calc.turnover.max,

        commission_per_merchant_min: calc.commissionPerMerchant.min,
        commission_per_merchant_max: calc.commissionPerMerchant.max,

        commission_total_min: calc.commissionTotal.min,
        commission_total_max: calc.commissionTotal.max,

        user_agent: navigator.userAgent,
        page_url: window.location.href,
      };

      await sendToGoogleSheets(payload);
      setSaveMsg("Successfully calculated. Showing results below.");
    } catch (e) {
      setSaveMsg(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: ORANGE }}>
          Finassets Agent Calculator
        </h1>
        <p className="text-gray-600">Estimate your monthly commission based on merchant size and how many businesses you can refer.</p>
      </div>

      <Card>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-gray-500">
              Agent commission is <span className="font-semibold">20% lifetime revenue share</span> of Finassets fees. All estimates are shown in{" "}
              <span className="font-semibold">USD</span>.
            </div>
            <button
              type="button"
              onClick={resetAll}
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
        </div>
      </Card>

      <div className="mt-8 space-y-8">
        <Card>
          <AnimatePresence mode="wait">
            {!started ? (
              <StepWrap title="Welcome" stepKey="welcome">
                <p className="text-gray-700">
                  Hi! I’m the Finassets Agent Calculator. I’ll estimate your monthly commission based on merchant size and how many businesses you can refer.
                </p>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setStarted(true)}
                    className="rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-sm"
                    style={{ backgroundColor: ORANGE }}
                  >
                    Start
                  </button>
                </div>
              </StepWrap>
            ) : (
              <StepWrap title="Step 1 — Company size" stepKey="step1">
                <p className="text-gray-700 mb-4">Specify the size of the company you typically work with:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SIZE_OPTIONS.map((opt) => (
                    <Button
                      key={opt.id}
                      active={sizeId === opt.id}
                      onClick={() => {
                        setSizeId(opt.id);
                        setBusinessId(null);
                        setMerchantCountId(null);
                        setContact("");
                        setShowResult(false);
                        setSaveMsg("");
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{opt.label}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Estimated monthly volume:{" "}
                            {opt.volumeMaxUSD == null
                              ? "$10,000,000+"
                              : `$${opt.volumeMinUSD.toLocaleString()} – $${opt.volumeMaxUSD.toLocaleString()}`}
                          </div>
                        </div>
                        <div className="text-sm font-semibold" style={{ color: ORANGE }}>
                          {formatPct(opt.feeRate)}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>

                {selectedSize ? (
                  <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                    Applied merchant fee tier: <span className="font-semibold">{formatPct(selectedSize.feeRate)}</span>
                  </div>
                ) : null}
              </StepWrap>
            )}
          </AnimatePresence>
        </Card>

        <AnimatePresence>
          {step2Ready ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.25, ease: "easeOut" }}>
              <Card>
                <StepWrap title="Step 2 — Business type" stepKey="step2">
                  <p className="text-gray-700 mb-4">What type of business is it?</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {BUSINESS_TYPES.map((opt) => (
                      <Button
                        key={opt.id}
                        active={businessId === opt.id}
                        onClick={() => {
                          setBusinessId(opt.id);
                          setMerchantCountId(null);
                          setContact("");
                          setShowResult(false);
                          setSaveMsg("");
                        }}
                      >
                        <div className="text-sm font-semibold text-gray-900">{opt.label}</div>
                        <div className="text-xs text-gray-500 mt-1">Used for lead qualification (does not change the estimate).</div>
                      </Button>
                    ))}
                  </div>
                </StepWrap>
              </Card>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {step3Ready ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.25, ease: "easeOut" }}>
              <Card>
                <StepWrap title="Step 3 — Number of referrals" stepKey="step3">
                  <p className="text-gray-700 mb-4">How many businesses are you ready to recommend?</p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {MERCHANT_COUNT_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setMerchantCountId(opt.id);
                          setContact("");
                          setShowResult(false);
                          setSaveMsg("");
                        }}
                        className={`rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-2 ${
                          merchantCountId === opt.id ? "bg-orange-50" : "bg-white"
                        }`}
                        style={merchantCountId === opt.id ? { borderColor: ORANGE, backgroundColor: "rgba(255,109,0,0.08)" } : { borderColor: "#e5e7eb" }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {merchantCountId === "5plus" ? (
                    <div className="mt-4 text-xs text-gray-500">
                      “5+” uses a conservative minimum of <span className="font-semibold">5 merchants</span> for the estimate.
                    </div>
                  ) : null}
                </StepWrap>
              </Card>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {step4Ready ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.25, ease: "easeOut" }}>
              <Card>
                <StepWrap title="Step 4 — Your contact (optional)" stepKey="step4">
                  <p className="text-gray-700 mb-4">Leave your contact so we can reach you.</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-700">Contact (email / Telegram / phone)</label>
                      <input
                        type="text"
                        inputMode="text"
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2"
                        value={contact}
                        onChange={(e) => {
                          setContact(e.target.value);
                          setSaveMsg("");
                        }}
                        placeholder="Optional"
                      />
                     
                    </div>

                    <button
                      type="button"
                      onClick={onCalculateAndSave}
                      disabled={saving || !isValidOptionalContact(contact)}
                      className="rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: ORANGE }}
                    >
                      {saving ? "Calculating…" : "Calculate profit"}
                    </button>
                  </div>

                  {saveMsg ? (
                    <div className="mt-3 text-sm" style={{ color: saveMsg.toLowerCase().includes("saved") ? "rgb(22 163 74)" : "rgb(220 38 38)" }}>
                      {saveMsg}
                    </div>
                  ) : null}
                </StepWrap>
              </Card>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {showResult && calc ? (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.28, ease: "easeOut" }}>
              <Card accent>
                <div className="flex flex-col gap-4">
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: ORANGE }}>
                      Your possible income
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Stat
                      label="Possible monthly profit (your commission)"
                      value={midToMaxLabel(calc.commissionTotal.min, calc.commissionTotal.max, CURRENCY)}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-xs text-gray-600">
                      Want a more precise estimate? Ask the merchant for a volume band and we’ll refine the range.
                    </div>
                    <a
                      href="https://www.finassets.io/en/contact/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-sm"
                      style={{ backgroundColor: ORANGE }}
                    >
                      Contact Finassets
                    </a>
                  </div>
                </div>
              </Card>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}