import React, { useState } from 'react';
import { Sparkles, ChevronDown, AlertTriangle, CheckCircle2, ArrowRight, RefreshCw } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchTicketInsights, clearInsights } from '@/redux/slices/aiSlice';
import type { Ticket } from '@/types/ticket';

interface Props {
  ticket: Ticket;
}

function InsightsSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 bg-surface-container-high rounded w-1/3" />
        <div className="h-4 bg-surface-container-high rounded w-full" />
        <div className="h-4 bg-surface-container-high rounded w-5/6" />
        <div className="h-4 bg-surface-container-high rounded w-4/6" />
      </div>
      <div className="h-10 bg-surface-container-high rounded" />
      <div className="space-y-2">
        <div className="h-3 bg-surface-container-high rounded w-1/4" />
        <div className="h-4 bg-surface-container-high rounded w-full" />
        <div className="h-4 bg-surface-container-high rounded w-3/4" />
      </div>
    </div>
  );
}

const RISK_CONFIG = {
  low: { label: 'Low Risk', bg: 'bg-green-500/10', text: 'text-green-700', dot: 'bg-green-500', icon: CheckCircle2 },
  medium: { label: 'Medium Risk', bg: 'bg-yellow-500/10', text: 'text-yellow-700', dot: 'bg-yellow-500', icon: AlertTriangle },
  high: { label: 'High Risk', bg: 'bg-error/10', text: 'text-error', dot: 'bg-error', icon: AlertTriangle },
};

export function TicketIntelligencePanel({ ticket }: Props) {
  const dispatch = useAppDispatch();
  const { insights } = useAppSelector((state) => state.ai);
  const [isOpen, setIsOpen] = useState(false);

  const isSameTicket = insights.lastTicketId === ticket._id;

  const handleGenerate = () => {
    if (!isSameTicket || !insights.data) {
      dispatch(clearInsights());
      dispatch(fetchTicketInsights(ticket));
    }
  };

  const handleToggle = () => {
    const opening = !isOpen;
    setIsOpen(opening);
    if (opening && !isSameTicket) {
      handleGenerate();
    }
  };

  const riskLevel = insights.data?.slaRisk?.level ?? 'low';
  const riskConfig = RISK_CONFIG[riskLevel];

  return (
    <div className="bg-surface-container-lowest rounded-[1rem] p-6">
      <button
        onClick={handleToggle}
        className="flex items-center justify-between w-full group"
        type="button"
      >
        <h3 className="label-technical flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-brand-500" />
          AI Insights
          {insights.loading && isSameTicket && (
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
          )}
        </h3>
        <ChevronDown
          className={`h-4 w-4 text-on-surface-variant transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="mt-4">
          {insights.loading && isSameTicket && <InsightsSkeleton />}

          {insights.error && isSameTicket && (
            <div className="space-y-3">
              <p className="text-xs text-on-surface-variant">{insights.error}</p>
              <button
                type="button"
                onClick={handleGenerate}
                className="flex items-center gap-1.5 text-xs font-medium text-brand-500 hover:text-brand-600 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          )}

          {insights.data && isSameTicket && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-on-surface-variant">Summary</p>
                <p className="text-sm text-on-surface leading-relaxed">{insights.data.summary}</p>
              </div>

              {/* SLA Risk */}
              <div className={`rounded-[0.75rem] p-3 ${riskConfig.bg}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${riskConfig.dot} shrink-0`} />
                  <span className={`text-xs font-bold uppercase tracking-[0.05em] ${riskConfig.text}`}>
                    {riskConfig.label}
                  </span>
                </div>
                <p className={`text-xs ${riskConfig.text} opacity-90`}>{insights.data.slaRisk.explanation}</p>
              </div>

              {/* Next Action */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-on-surface-variant">Suggested Next Action</p>
                <div className="flex items-start gap-2">
                  <ArrowRight className="h-3.5 w-3.5 text-brand-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-on-surface">{insights.data.nextAction.action}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{insights.data.nextAction.rationale}</p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                className="flex items-center gap-1.5 text-[11px] text-on-surface-variant hover:text-on-surface transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                Regenerate
              </button>
            </div>
          )}

          {!insights.loading && !insights.data && !insights.error && (
            <button
              type="button"
              onClick={handleGenerate}
              className="flex items-center gap-2 w-full justify-center py-3 rounded-[0.75rem] border border-dashed border-brand-200 text-sm text-brand-500 hover:bg-brand-50 transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              Generate Insights
            </button>
          )}
        </div>
      )}
    </div>
  );
}
