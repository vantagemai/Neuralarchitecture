"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Save,
  RotateCcw,
} from "lucide-react";

interface CampaignData {
  name: string;
  region: string;
  budget: number;
  spent: number;
  cpmr: number;
  frequency: number;
  hookRate: number;
  holdRate: number;
  conversions: number;
  cpa: number;
  status: string;
}

interface CreativeData {
  name: string;
  pda: string;
  daysRunning: number;
  spent: number;
  hookRate: number;
  holdRate: number;
  conversions: number;
  cpa: number;
  status: string;
}

interface FunnelData {
  cliques: number;
  tbInicio: number;
  checkouts: number;
  compras: number;
  ticket: number;
  upsells: number;
}

interface GeoData {
  top1: string;
  top2: string;
  top3: string;
  geoCaro: string;
  excluidos: string;
}

interface DecisionsData {
  pausados: string;
  winners: string;
  budgetAdj: string;
  novos: string;
  obs: string;
}

interface FormData {
  date: string;
  gastoTotal: number;
  receitaTotal: number;
  emq: number;
  convTotal: number;
  campaigns: CampaignData[];
  creatives: CreativeData[];
  funnel: FunnelData;
  geo: GeoData;
  decisions: DecisionsData;
}

function getToday(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function defaultFormData(): FormData {
  return {
    date: getToday(),
    gastoTotal: 0,
    receitaTotal: 0,
    emq: 0,
    convTotal: 0,
    campaigns: [],
    creatives: [],
    funnel: {
      cliques: 0,
      tbInicio: 0,
      checkouts: 0,
      compras: 0,
      ticket: 0,
      upsells: 0,
    },
    geo: { top1: "", top2: "", top3: "", geoCaro: "", excluidos: "" },
    decisions: {
      pausados: "",
      winners: "",
      budgetAdj: "",
      novos: "",
      obs: "",
    },
  };
}

function newCampaign(): CampaignData {
  return {
    name: "",
    region: "",
    budget: 0,
    spent: 0,
    cpmr: 0,
    frequency: 0,
    hookRate: 0,
    holdRate: 0,
    conversions: 0,
    cpa: 0,
    status: "OK",
  };
}

function newCreative(): CreativeData {
  return {
    name: "",
    pda: "",
    daysRunning: 0,
    spent: 0,
    hookRate: 0,
    holdRate: 0,
    conversions: 0,
    cpa: 0,
    status: "Testing",
  };
}

const inputClass =
  "bg-surface border border-border rounded-lg px-3 py-2 text-text focus:border-accent focus:outline-none w-full";
const labelClass = "text-sm text-muted mb-1 block font-mono";
const autoFieldClass =
  "bg-bg border border-border rounded-lg px-3 py-2 text-accent font-mono w-full cursor-default";

function CollapseBlock({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-5 py-4 text-left text-text font-semibold text-lg hover:bg-surface transition-colors"
      >
        {open ? (
          <ChevronDown className="w-5 h-5 text-accent shrink-0" />
        ) : (
          <ChevronRight className="w-5 h-5 text-muted shrink-0" />
        )}
        {title}
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

function StatusPills({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const colorMap: Record<string, string> = {
    OK: "bg-green-600/20 text-green-400 border-green-500/40",
    "Aten\u00e7\u00e3o": "bg-yellow-600/20 text-yellow-400 border-yellow-500/40",
    "Cr\u00edtico": "bg-red-600/20 text-red-400 border-red-500/40",
    Testing: "bg-blue-600/20 text-blue-400 border-blue-500/40",
    Winner: "bg-green-600/20 text-green-400 border-green-500/40",
    Borderline: "bg-yellow-600/20 text-yellow-400 border-yellow-500/40",
    Pausar: "bg-red-600/20 text-red-400 border-red-500/40",
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((opt) => {
        const isActive = value === opt;
        const colors = colorMap[opt] || "bg-surface text-muted border-border";
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`px-3 py-1 rounded-full text-xs font-mono border transition-all ${
              isActive
                ? colors
                : "bg-surface/50 text-muted border-border/50 opacity-50 hover:opacity-75"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export default function PlanilhaPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(defaultFormData());
  const [openBlocks, setOpenBlocks] = useState<Record<string, boolean>>({
    conta: true,
    campanhas: true,
    criativos: true,
    funil: true,
    geo: true,
    decisoes: true,
  });
  const [toast, setToast] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  function toggle(block: string) {
    setOpenBlocks((prev) => ({ ...prev, [block]: !prev[block] }));
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function updateField<K extends keyof FormData>(key: K, val: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  function updateFunnel<K extends keyof FunnelData>(key: K, val: number) {
    setForm((prev) => ({
      ...prev,
      funnel: { ...prev.funnel, [key]: val },
    }));
  }

  function updateGeo<K extends keyof GeoData>(key: K, val: string) {
    setForm((prev) => ({
      ...prev,
      geo: { ...prev.geo, [key]: val },
    }));
  }

  function updateDecisions<K extends keyof DecisionsData>(
    key: K,
    val: string
  ) {
    setForm((prev) => ({
      ...prev,
      decisions: { ...prev.decisions, [key]: val },
    }));
  }

  function updateCampaign(
    idx: number,
    key: keyof CampaignData,
    val: string | number
  ) {
    setForm((prev) => {
      const campaigns = [...prev.campaigns];
      campaigns[idx] = { ...campaigns[idx], [key]: val };
      return { ...prev, campaigns };
    });
  }

  function removeCampaign(idx: number) {
    setForm((prev) => ({
      ...prev,
      campaigns: prev.campaigns.filter((_, i) => i !== idx),
    }));
  }

  function updateCreative(
    idx: number,
    key: keyof CreativeData,
    val: string | number
  ) {
    setForm((prev) => {
      const creatives = [...prev.creatives];
      creatives[idx] = { ...creatives[idx], [key]: val };
      return { ...prev, creatives };
    });
  }

  function removeCreative(idx: number) {
    setForm((prev) => ({
      ...prev,
      creatives: prev.creatives.filter((_, i) => i !== idx),
    }));
  }

  // Computed values
  const mer =
    form.gastoTotal > 0 ? form.receitaTotal / form.gastoTotal : 0;
  const merColor =
    mer >= 2.5
      ? "text-green-400"
      : mer >= 1.5
        ? "text-yellow-400"
        : "text-red-400";

  const taxaEntrada =
    form.funnel.cliques > 0
      ? (form.funnel.tbInicio / form.funnel.cliques) * 100
      : 0;
  const taxaCheckout =
    form.funnel.tbInicio > 0
      ? (form.funnel.checkouts / form.funnel.tbInicio) * 100
      : 0;
  const taxaConversao =
    form.funnel.checkouts > 0
      ? (form.funnel.compras / form.funnel.checkouts) * 100
      : 0;
  const taxaUpsell =
    form.funnel.compras > 0
      ? (form.funnel.upsells / form.funnel.compras) * 100
      : 0;

  async function handleSave() {
    setSaving(true);
    const payload = {
      ...form,
      mer,
      taxaEntrada,
      taxaCheckout,
      taxaConversao,
      taxaUpsell,
    };

    try {
      const res = await fetch("/api/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erro ao salvar");

      showToast("Registro salvo com sucesso!");
      setSaved(true);
    } catch {
      showToast("Erro ao salvar registro. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  function handleClear() {
    setForm(defaultFormData());
    setSaved(false);
  }

  return (
    <div className="min-h-screen bg-bg text-text p-4 md:p-8">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600/90 text-white px-5 py-3 rounded-lg shadow-lg font-mono text-sm animate-pulse">
          {toast}
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-text font-mono mb-6">
          Planilha de Registro Di\u00e1rio
        </h1>

        {/* Block 1 - Conta */}
        <CollapseBlock
          title="1 \u2014 Conta"
          open={openBlocks.conta}
          onToggle={() => toggle("conta")}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Data</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => updateField("date", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Gasto Total R$</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.gastoTotal || ""}
                onChange={(e) =>
                  updateField("gastoTotal", parseFloat(e.target.value) || 0)
                }
                className={inputClass}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className={labelClass}>Receita Total R$</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.receitaTotal || ""}
                onChange={(e) =>
                  updateField("receitaTotal", parseFloat(e.target.value) || 0)
                }
                className={inputClass}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className={labelClass}>MER</label>
              <div className={`${autoFieldClass} ${merColor}`}>
                {mer > 0 ? `${mer.toFixed(2)}x` : "\u2014"}
              </div>
            </div>
            <div>
              <label className={labelClass}>EMQ (0-10)</label>
              <input
                type="number"
                min={0}
                max={10}
                step={1}
                value={form.emq || ""}
                onChange={(e) =>
                  updateField("emq", parseFloat(e.target.value) || 0)
                }
                className={inputClass}
                placeholder="0"
              />
            </div>
            <div>
              <label className={labelClass}>Convers\u00f5es Totais</label>
              <input
                type="number"
                min={0}
                step={1}
                value={form.convTotal || ""}
                onChange={(e) =>
                  updateField("convTotal", parseInt(e.target.value) || 0)
                }
                className={inputClass}
                placeholder="0"
              />
            </div>
          </div>
        </CollapseBlock>

        {/* Block 2 - Campanhas */}
        <CollapseBlock
          title="2 \u2014 Campanhas"
          open={openBlocks.campanhas}
          onToggle={() => toggle("campanhas")}
        >
          <div className="space-y-4">
            {form.campaigns.map((camp, idx) => (
              <div
                key={idx}
                className="bg-surface/50 border border-border/50 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted font-mono">
                    Campanha {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCampaign(idx)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Nome</label>
                    <input
                      type="text"
                      value={camp.name}
                      onChange={(e) =>
                        updateCampaign(idx, "name", e.target.value)
                      }
                      className={inputClass}
                      placeholder="Nome da campanha"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Regi\u00e3o/Pa\u00eds</label>
                    <input
                      type="text"
                      value={camp.region}
                      onChange={(e) =>
                        updateCampaign(idx, "region", e.target.value)
                      }
                      className={inputClass}
                      placeholder="BR, US, etc."
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Budget R$</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={camp.budget || ""}
                      onChange={(e) =>
                        updateCampaign(
                          idx,
                          "budget",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className={inputClass}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Gasto R$</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={camp.spent || ""}
                      onChange={(e) =>
                        updateCampaign(
                          idx,
                          "spent",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className={inputClass}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>CPMr R$</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={camp.cpmr || ""}
                      onChange={(e) =>
                        updateCampaign(
                          idx,
                          "cpmr",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className={inputClass}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Frequency</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={camp.frequency || ""}
                      onChange={(e) =>
                        updateCampaign(
                          idx,
                          "frequency",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className={inputClass}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Hook Rate %</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={camp.hookRate || ""}
                      onChange={(e) =>
                        updateCampaign(
                          idx,
                          "hookRate",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className={inputClass}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Hold Rate %</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={camp.holdRate || ""}
                      onChange={(e) =>
                        updateCampaign(
                          idx,
                          "holdRate",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className={inputClass}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Convers\u00f5es</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={camp.conversions || ""}
                      onChange={(e) =>
                        updateCampaign(
                          idx,
                          "conversions",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className={inputClass}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>CPA R$</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={camp.cpa || ""}
                      onChange={(e) =>
                        updateCampaign(
                          idx,
                          "cpa",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className={inputClass}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <StatusPills
                    options={["OK", "Aten\u00e7\u00e3o", "Cr\u00edtico"]}
                    value={camp.status}
                    onChange={(v) => updateCampaign(idx, "status", v)}
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  campaigns: [...prev.campaigns, newCampaign()],
                }))
              }
              className="flex items-center gap-2 text-accent hover:text-text transition-colors font-mono text-sm"
            >
              <Plus className="w-4 h-4" />
              Adicionar campanha
            </button>
          </div>
        </CollapseBlock>

        {/* Block 3 - Criativos */}
        <CollapseBlock
          title="3 \u2014 Criativos"
          open={openBlocks.criativos}
          onToggle={() => toggle("criativos")}
        >
          <div className="space-y-4">
            {form.creatives.map((crt, idx) => (
              <div
                key={idx}
                className="bg-surface/50 border border-border/50 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted font-mono">
                    Criativo {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCreative(idx)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Nome/ID</label>
                    <input
                      type="text"
                      value={crt.name}
                      onChange={(e) =>
                        updateCreative(idx, "name", e.target.value)
                      }
                      className={inputClass}
                      placeholder="Nome ou ID do criativo"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>\u00c2ngulo P.D.A.</label>
                    <input
                      type="text"
                      value={crt.pda}
                      onChange={(e) =>
                        updateCreative(idx, "pda", e.target.value)
                      }
                      className={inputClass}
                      placeholder="Problema, Desejo, Autoridade"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Dias rodando</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={crt.daysRunning || ""}
                      onChange={(e) =>
                        updateCreative(
                          idx,
                          "daysRunning",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className={inputClass}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Gasto acumulado R$</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={crt.spent || ""}
                      onChange={(e) =>
                        updateCreative(
                          idx,
                          "spent",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className={inputClass}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Hook Rate %</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={crt.hookRate || ""}
                      onChange={(e) =>
                        updateCreative(
                          idx,
                          "hookRate",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className={inputClass}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Hold Rate %</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={crt.holdRate || ""}
                      onChange={(e) =>
                        updateCreative(
                          idx,
                          "holdRate",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className={inputClass}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Convers\u00f5es</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={crt.conversions || ""}
                      onChange={(e) =>
                        updateCreative(
                          idx,
                          "conversions",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className={inputClass}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>CPA R$</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={crt.cpa || ""}
                      onChange={(e) =>
                        updateCreative(
                          idx,
                          "cpa",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className={inputClass}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <StatusPills
                    options={["Testing", "Winner", "Borderline", "Pausar"]}
                    value={crt.status}
                    onChange={(v) => updateCreative(idx, "status", v)}
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  creatives: [...prev.creatives, newCreative()],
                }))
              }
              className="flex items-center gap-2 text-accent hover:text-text transition-colors font-mono text-sm"
            >
              <Plus className="w-4 h-4" />
              Adicionar criativo
            </button>
          </div>
        </CollapseBlock>

        {/* Block 4 - Funil */}
        <CollapseBlock
          title="4 \u2014 Funil"
          open={openBlocks.funil}
          onToggle={() => toggle("funil")}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Cliques totais</label>
              <input
                type="number"
                min={0}
                step={1}
                value={form.funnel.cliques || ""}
                onChange={(e) =>
                  updateFunnel("cliques", parseInt(e.target.value) || 0)
                }
                className={inputClass}
                placeholder="0"
              />
            </div>
            <div>
              <label className={labelClass}>TypeBot/LP In\u00edcio</label>
              <input
                type="number"
                min={0}
                step={1}
                value={form.funnel.tbInicio || ""}
                onChange={(e) =>
                  updateFunnel("tbInicio", parseInt(e.target.value) || 0)
                }
                className={inputClass}
                placeholder="0"
              />
            </div>
            <div>
              <label className={labelClass}>Taxa entrada %</label>
              <div className={autoFieldClass}>
                {taxaEntrada > 0 ? `${taxaEntrada.toFixed(2)}%` : "\u2014"}
              </div>
            </div>
            <div>
              <label className={labelClass}>Checkouts</label>
              <input
                type="number"
                min={0}
                step={1}
                value={form.funnel.checkouts || ""}
                onChange={(e) =>
                  updateFunnel("checkouts", parseInt(e.target.value) || 0)
                }
                className={inputClass}
                placeholder="0"
              />
            </div>
            <div>
              <label className={labelClass}>Taxa checkout %</label>
              <div className={autoFieldClass}>
                {taxaCheckout > 0 ? `${taxaCheckout.toFixed(2)}%` : "\u2014"}
              </div>
            </div>
            <div>
              <label className={labelClass}>Compras</label>
              <input
                type="number"
                min={0}
                step={1}
                value={form.funnel.compras || ""}
                onChange={(e) =>
                  updateFunnel("compras", parseInt(e.target.value) || 0)
                }
                className={inputClass}
                placeholder="0"
              />
            </div>
            <div>
              <label className={labelClass}>Taxa convers\u00e3o %</label>
              <div className={autoFieldClass}>
                {taxaConversao > 0 ? `${taxaConversao.toFixed(2)}%` : "\u2014"}
              </div>
            </div>
            <div>
              <label className={labelClass}>Ticket m\u00e9dio R$</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.funnel.ticket || ""}
                onChange={(e) =>
                  updateFunnel("ticket", parseFloat(e.target.value) || 0)
                }
                className={inputClass}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className={labelClass}>Upsells</label>
              <input
                type="number"
                min={0}
                step={1}
                value={form.funnel.upsells || ""}
                onChange={(e) =>
                  updateFunnel("upsells", parseInt(e.target.value) || 0)
                }
                className={inputClass}
                placeholder="0"
              />
            </div>
            <div>
              <label className={labelClass}>Taxa upsell %</label>
              <div className={autoFieldClass}>
                {taxaUpsell > 0 ? `${taxaUpsell.toFixed(2)}%` : "\u2014"}
              </div>
            </div>
          </div>
        </CollapseBlock>

        {/* Block 5 - Geo */}
        <CollapseBlock
          title="5 \u2014 Geo"
          open={openBlocks.geo}
          onToggle={() => toggle("geo")}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={labelClass}>Top 1 Pa\u00eds</label>
              <input
                type="text"
                value={form.geo.top1}
                onChange={(e) => updateGeo("top1", e.target.value)}
                className={inputClass}
                placeholder="Z\u00e2mbia \u00b7 R$18 \u00b7 12 conv"
              />
            </div>
            <div>
              <label className={labelClass}>Top 2 Pa\u00eds</label>
              <input
                type="text"
                value={form.geo.top2}
                onChange={(e) => updateGeo("top2", e.target.value)}
                className={inputClass}
                placeholder="Z\u00e2mbia \u00b7 R$18 \u00b7 12 conv"
              />
            </div>
            <div>
              <label className={labelClass}>Top 3 Pa\u00eds</label>
              <input
                type="text"
                value={form.geo.top3}
                onChange={(e) => updateGeo("top3", e.target.value)}
                className={inputClass}
                placeholder="Z\u00e2mbia \u00b7 R$18 \u00b7 12 conv"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Pa\u00edses com CPA acima de 2x target
              </label>
              <textarea
                value={form.geo.geoCaro}
                onChange={(e) => updateGeo("geoCaro", e.target.value)}
                className={`${inputClass} min-h-[80px] resize-y`}
                placeholder="Liste os pa\u00edses..."
              />
            </div>
            <div>
              <label className={labelClass}>Pa\u00edses exclu\u00eddos hoje</label>
              <textarea
                value={form.geo.excluidos}
                onChange={(e) => updateGeo("excluidos", e.target.value)}
                className={`${inputClass} min-h-[80px] resize-y`}
                placeholder="Liste os pa\u00edses exclu\u00eddos..."
              />
            </div>
          </div>
        </CollapseBlock>

        {/* Block 6 - Decisoes */}
        <CollapseBlock
          title="6 \u2014 Decis\u00f5es"
          open={openBlocks.decisoes}
          onToggle={() => toggle("decisoes")}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Criativos pausados</label>
              <textarea
                value={form.decisions.pausados}
                onChange={(e) => updateDecisions("pausados", e.target.value)}
                className={`${inputClass} min-h-[80px] resize-y`}
                placeholder="Quais criativos foram pausados..."
              />
            </div>
            <div>
              <label className={labelClass}>Winners identificados</label>
              <textarea
                value={form.decisions.winners}
                onChange={(e) => updateDecisions("winners", e.target.value)}
                className={`${inputClass} min-h-[80px] resize-y`}
                placeholder="Criativos com melhor performance..."
              />
            </div>
            <div>
              <label className={labelClass}>Budget ajustado</label>
              <textarea
                value={form.decisions.budgetAdj}
                onChange={(e) => updateDecisions("budgetAdj", e.target.value)}
                className={`${inputClass} min-h-[80px] resize-y`}
                placeholder="Ajustes de budget realizados..."
              />
            </div>
            <div>
              <label className={labelClass}>Novos criativos subidos</label>
              <textarea
                value={form.decisions.novos}
                onChange={(e) => updateDecisions("novos", e.target.value)}
                className={`${inputClass} min-h-[80px] resize-y`}
                placeholder="Novos criativos que entraram..."
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Observa\u00e7\u00e3o livre</label>
              <textarea
                value={form.decisions.obs}
                onChange={(e) => updateDecisions("obs", e.target.value)}
                className={`${inputClass} min-h-[100px] resize-y`}
                placeholder="Anota\u00e7\u00f5es gerais do dia..."
              />
            </div>
          </div>
        </CollapseBlock>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-accent hover:bg-accent/80 text-bg font-semibold px-6 py-3 rounded-lg transition-colors disabled:opacity-50 font-mono"
          >
            <Save className="w-4 h-4" />
            {saving ? "Salvando..." : "Salvar Registro"}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-2 bg-surface hover:bg-surface/80 text-muted font-semibold px-6 py-3 rounded-lg transition-colors border border-border font-mono"
          >
            <RotateCcw className="w-4 h-4" />
            Limpar
          </button>
          {saved && (
            <button
              type="button"
              onClick={() => router.push("/kyoto")}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors font-mono"
            >
              Analisar com Kyoto
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
