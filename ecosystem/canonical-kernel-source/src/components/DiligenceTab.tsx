import React from 'react';
import { FileText, Database, Radio, LockKeyhole, Activity } from 'lucide-react';

const evidence = [
  ['Enterprise boundary', 'OIDC/JWT authentication, tenant isolation, scope enforcement, correlation IDs'],
  ['Durable authority', 'PostgreSQL state, serializable commits, state-hash concurrency fencing, idempotency'],
  ['Distributed sessions', 'Redis-backed monotonic epochs reject stale workers at the commit boundary'],
  ['Runtime containment', 'Revocable execution lease, cancellation, verified checkpoints, rollback'],
  ['Integrity', 'Receipt verification and hash-chained durable journal'],
  ['Operational surface', 'Health/readiness endpoints, security headers, non-root production container'],
];

export const DiligenceTab: React.FC = () => (
  <div className="space-y-6">
    <section className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
      <div className="flex items-center gap-3">
        <FileText className="w-5 h-5 text-cyan-400" />
        <div>
          <h2 className="text-base font-bold text-white">Convertible Cranium · Enterprise Diligence</h2>
          <p className="text-xs text-slate-400 font-mono">Current engineering baseline</p>
        </div>
      </div>
      <div className="p-4 rounded-lg bg-slate-950 border border-cyan-900/50">
        <p className="text-sm text-slate-200 leading-relaxed">
          <strong className="text-cyan-400">Convertible Cranium</strong> is a cognitive-authority-bound
          dual-engine governance substrate for governing cognition, authority, execution, provenance,
          continuity, and evolution across heterogeneous intelligence systems.
        </p>
        <p className="mt-3 text-sm text-white font-semibold">
          Models may propose cognition. Only Cranium determines whether cognition acquires authority.
        </p>
      </div>
    </section>

    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-cyan-400">
          <Radio className="w-4 h-4" />
          <h3 className="text-xs font-bold uppercase tracking-wider">Canonical Flow</h3>
        </div>
        <p className="text-sm text-slate-200 leading-7 font-mono">
          Cognition → Assessment → Authority Determination → Governed Execution → Attestation/Receipt → Durable Continuity
        </p>
      </div>
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-emerald-400">
          <LockKeyhole className="w-4 h-4" />
          <h3 className="text-xs font-bold uppercase tracking-wider">Authority Boundary</h3>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Cognition sources do not become authority sources. The Kernel remains the canonical authority
          boundary while persistence stores state and evidence.
        </p>
      </div>
    </section>

    <section className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-cyan-400" />
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Enterprise Evidence Surface</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {evidence.map(([name, detail]) => (
          <div key={name} className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <p className="text-xs font-semibold text-white">{name}</p>
            <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">{detail}</p>
          </div>
        ))}
      </div>
    </section>

    <section className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-cyan-400" />
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Buyer Demonstration</h3>
      </div>
      <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300">
        <li>Submit cognition from an external intelligence source.</li>
        <li>Show Synapse assessment and provenance binding.</li>
        <li>Show Kernel authority determination.</li>
        <li>Attempt replay or forged evidence and show rejection.</li>
        <li>Fence a stale distributed worker and show commit denial.</li>
        <li>Trip the session circuit breaker and show cancellation and commit containment.</li>
        <li>Restart the service and verify durable receipt/journal continuity.</li>
        <li>Show tenant and authentication boundaries.</li>
      </ol>
    </section>

    <section className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/50">
      <p className="text-xs text-amber-200 leading-relaxed">
        <strong>Evidence discipline:</strong> repository tests demonstrate engineering behavior and integration
        readiness. They are not a substitute for third-party certifications such as SOC 2 or ISO 27001,
        nor for environment-specific production security, disaster recovery, observability, and operational controls.
      </p>
    </section>
  </div>
);
