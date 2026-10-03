'use client';

import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Users, DollarSign, TrendingUp, CheckCircle } from 'lucide-react';

const mockData = [
  { stage: 'Novos Leads', leads: 42 },
  { stage: 'Contato Feito', leads: 28 },
  { stage: 'Proposta Enviada', leads: 15 },
  { stage: 'Fechados', leads: 9 }
];

export default function MetricasPage() {
  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Métricas Comerciais & Conversão</h1>
        <p className="text-xs text-slate-400">Indicadores gerais do pipeline de vendas</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex justify-between text-slate-400 text-xs">Total Leads <Users size={16} /></div>
          <p className="mt-2 text-2xl font-bold text-white">94</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex justify-between text-slate-400 text-xs">Pipeline Estimado <DollarSign size={16} /></div>
          <p className="mt-2 text-2xl font-bold text-emerald-400">R$ 206.000</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex justify-between text-slate-400 text-xs">Taxa Conversão <TrendingUp size={16} /></div>
          <p className="mt-2 text-2xl font-bold text-indigo-400">9.5%</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex justify-between text-slate-400 text-xs">Vendas Concluídas <CheckCircle size={16} /></div>
          <p className="mt-2 text-2xl font-bold text-blue-400">R$ 27.000</p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-sm font-semibold mb-4 text-slate-300">Volume de Leads por Fase do Funil</h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mockData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="stage" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} />
              <Bar dataKey="leads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
