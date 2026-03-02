import React, { useMemo, useState } from "react";

const ORANGE = "rgb(255 109 0)";
const AGENT_SHARE = 0.2;
const CURRENCY = "USD";

// Finassets fee tiers based on monthly volume (USD)
function getFinassetsFeeRate(turnover) {
  const t = Number(turnover);
  if (!Number.isFinite(t) || t <= 0) return 0.004; // default to first tier if empty/invalid
  if (t <= 1_000_000) return 0.0040;
  if (t <= 6_000_000) return 0.0030;
  if (t <= 10_000_000) return 0.0025;
  return 0.0020;
}

function clampInt(v, min, max) {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function clampNonNegativeNumber(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function formatMoney(n, currency = "USD") {
  if (!Number.isFinite(n)) n = 0;
  return n.toLocaleString(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const Card = ({ children, accent = false }) => (
  <div
    className={`rounded-2xl border shadow-sm ${accent ? "bg-orange-50" : "bg-white"}`}
    style={accent ? { borderColor: ORANGE, backgroundColor: "rgba(255,109,0,0.08)" } : { borderColor: "#e5e7eb" }}
  >
    <div className="p-4 sm:p-6">{children}</div>
  </div>
);

const Field = ({ label, value, onChange, hint, placeholder }) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-semibold text-gray-900">{label}</label>
    <input
      type="number"
      inputMode="decimal"
      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      min={0}
      step="any"
    />
    {hint ? <div className="text-xs text-gray-500">{hint}</div> : null}
  </div>
);

const Stat = ({ label, value }) => (
  <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
    <div className="text-xs text-gray-500">{label}</div>
    <div className="text-lg font-semibold text-gray-900">{value}</div>
  </div>
);

export default function AgentQuickCalculator() {
  const [turnover, setTurnover] = useState("");
  const [referrals, setReferrals] = useState("1");

  const turnoverNum = useMemo(() => clampNonNegativeNumber(turnover), [turnover]);
  const referralsNum = useMemo(() => clampInt(referrals, 1, 9999), [referrals]);

  const feeRate = useMemo(() => getFinassetsFeeRate(turnoverNum), [turnoverNum]);

  const maxProfit = useMemo(() => {
    // "maximum profit" for the given exact turnover input (not a range)
    // profit = turnover * feeRate * 20% * referrals
    const p = turnoverNum * feeRate * AGENT_SHARE * referralsNum;
    return round2(p);
  }, [turnoverNum, feeRate, referralsNum]);

  const canShow = turnover.trim() !== "";

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: ORANGE }}>
          Finassets Agent Calculator
        </h1>
        <p className="text-gray-600">Calculate your profit</p>
        <p className="text-gray-600">Let&apos;s check how much you can earn</p>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Total monthly transaction volume"
            value={turnover}
            onChange={setTurnover}
            hint="USD"
            placeholder="e.g. 800000"
          />
          <Field
            label="Number of referrals"
            value={referrals}
            onChange={setReferrals}
            hint="Enter 1, 2, 3, 4, 5…"
            placeholder="e.g. 3"
          />
        </div>

        <div className="mt-4 text-xs text-gray-500">
          Fee tier is applied automatically from your monthly volume. Your revenue share is 20% of Finassets fee.
        </div>
      </Card>

      <div className="mt-6">
        <Card accent>
          <div className="flex flex-col gap-4">
            <div className="text-sm text-gray-700">
              Applied fee rate: <span className="font-semibold">{(feeRate * 100).toFixed(2)}%</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="text-xs text-gray-600">
  <span className="font-bold text-orange-600">20% lifetime</span> commission per active client. Earnings shown are monthly and scale with client volume.
</div>
              <Stat
                label="Your maximum monthly profit 🎉"
                value={canShow ? formatMoney(maxProfit, CURRENCY) : "-"}
              />
              <Stat
                label="Referrals used"
                value={String(referralsNum)}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}