

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dbService } from '../services/db';
import { Work, Step, Expense, Material, WorkPhoto, StepStatus, ExpenseCategory, WorkStatus } from '../types';
import { Recharts } from '../components/RechartsWrapper';
import { STANDARD_MATERIAL_CATALOG, STANDARD_PHASES, STANDARD_EXPENSE_CATALOG } from '../services/standards';

// --- Componentes Reutilizáveis ---

// Modal de Confirmação Genérico
interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 print:hidden">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-200 dark:border-slate-700 transform scale-100 transition-all">
        <div className="mb-4 text-center">
          <div className="w-12 h-12 bg-warning/20 text-warning rounded-full flex items-center justify-center mx-auto mb-4">
             <i className="fa-solid fa-triangle-exclamation text-xl"></i>
          </div>
          <h3 className="text-lg font-bold text-text-main dark:text-white mb-2">{title}</h3>
          <p className="text-text-muted dark:text-slate-400 text-sm">{message}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-text-muted font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente Donut Chart para Visão Geral (Compacto)
const OverallProgressDonut: React.FC<{ progress: number }> = ({ progress }) => {
    const data = [
        { name: 'Concluído', value: progress, fill: '#2BB86B' }, // Success color
        { name: 'Pendente', value: 100 - progress, fill: '#E2E8F0' } // Slate-200
    ];

    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors flex flex-col items-center justify-center relative h-full min-h-[350px] print:border print:border-slate-300">
            <h3 className="absolute top-6 left-6 text-xs text-text-muted dark:text-slate-400 uppercase font-bold tracking-wider">
                Progresso Físico Total
            </h3>
            <div className="w-full h-56 relative">
                <Recharts.ResponsiveContainer width="100%" height="100%">
                    <Recharts.PieChart>
                        <Recharts.Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={90}
                            startAngle={90}
                            endAngle={-270}
                            dataKey="value"
                            stroke="none"
                        >
                             <Recharts.Label 
                                value={`${progress}%`} 
                                position="center" 
                                className="text-3xl font-bold fill-slate-800 dark:fill-white"
                                style={{ fontSize: '32px', fontWeight: 'bold' }}
                            />
                        </Recharts.Pie>
                    </Recharts.PieChart>
                </Recharts.ResponsiveContainer>
            </div>
            <p className="text-sm text-text-muted dark:text-slate-500 mt-2">da obra concluída</p>
        </div>
    );
};

// --- TABS ---

// Modified OverviewTab to accept onGoToSteps prop
const OverviewTab: React.FC<{ work: Work, stats: any, onGoToSteps: () => void }> = ({ work, stats, onGoToSteps }) => {
  const budgetUsage = work.budgetPlanned > 0 ? (stats.totalSpent / work.budgetPlanned) * 100 : 0;
  
  // Data for PieChart (Expenses)
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const expenses = dbService.getExpenses(work.id);
    const catTotals: Record<string, number> = {};
    expenses.forEach(e => {
        // Use paidAmount for stats, fallback to amount
        const paid = e.paidAmount ?? e.amount;
        catTotals[e.category] = (catTotals[e.category] || 0) + paid;
    });
    setData(Object.keys(catTotals).map(key => ({ name: key, value: catTotals[key] })));
  }, [work.id]);

  const COLORS = ['#1E3A45', '#2BB86B', '#FACC15', '#EF4444'];

  return (
    <div className="space-y-6">
      
      {/* 1. SEÇÃO DE GRÁFICOS (TOPO) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
        
        {/* A. Gráfico Donut para Progresso Físico Total */}
        <div className="h-full">
            <OverallProgressDonut progress={stats.progress} />
        </div>

        {/* B. Gráfico de Despesas (Pizza) */}
        <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors flex flex-col h-full print:border print:border-slate-300">
            <h3 className="text-lg font-bold text-text-main dark:text-white mb-4">Detalhamento de Gastos (Pago)</h3>
            
            <div className="flex-1 flex flex-col justify-center">
                <div className="h-48 md:h-56 w-full">
                    {data.length > 0 && data.some(d => d.value > 0) ? (
                        <Recharts.ResponsiveContainer width="100%" height="100%">
                            <Recharts.PieChart>
                                <Recharts.Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.map((_, index) => (
                                        <Recharts.Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                    ))}
                                </Recharts.Pie>
                                <Recharts.Tooltip 
                                    formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                            </Recharts.PieChart>
                        </Recharts.ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center">
                            <div className="bg-surface dark:bg-slate-800 w-12 h-12 rounded-full flex items-center justify-center mb-2 text-slate-300 dark:text-slate-600">
                                <i className="fa-solid fa-chart-pie text-xl"></i>
                            </div>
                            <p className="text-sm text-text-muted dark:text-slate-400">Sem gastos registrados.</p>
                        </div>
                    )}
                </div>

                {/* Legenda Customizada HTML (Evita sobreposição) */}
                {data.length > 0 && data.some(d => d.value > 0) && (
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        {data.map((entry, index) => (
                            <div key={`legend-${index}`} className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                                <span className="text-text-muted dark:text-slate-400 truncate">{entry.name}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Valores Totais em Destaque (Rodapé do Card) */}
            <div className="mt-6 text-center pt-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[10px] text-text-muted dark:text-slate-400 uppercase font-bold tracking-wider mb-1">
                    Consumo do Orçamento
                </p>
                <div className="flex flex-col items-center">
                    <span className="text-2xl md:text-3xl font-bold text-text-main dark:text-white">
                        R$ {stats.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs md:text-sm text-text-muted dark:text-slate-500 mt-1">
                        de R$ {work.budgetPlanned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                </div>
            </div>
        </div>

      </div>

      {/* 2. CARDS DE RESUMO (BAIXO) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm text-center relative overflow-hidden transition-colors print:border print:border-slate-300">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
          <p className="text-text-muted dark:text-slate-400 text-xs uppercase font-bold tracking-wider mb-2">Custo por m²</p>
          <p className="text-2xl lg:text-3xl font-bold text-text-main dark:text-white">R$ {(work.area > 0 ? stats.totalSpent / work.area : 0).toFixed(2)}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm text-center relative overflow-hidden transition-colors print:border print:border-slate-300">
          <div className={`absolute top-0 left-0 w-full h-1 ${budgetUsage > 100 ? 'bg-danger' : 'bg-primary'}`}></div>
          <p className="text-text-muted dark:text-slate-400 text-xs uppercase font-bold tracking-wider mb-2">Orçamento</p>
          <p className={`text-2xl lg:text-3xl font-bold ${budgetUsage > 100 ? 'text-danger' : 'text-text-main dark:text-white'}`}>
            {budgetUsage.toFixed(1)}%
          </p>
        </div>
        
        {/* CARD DE ATRASOS - CLICÁVEL */}
        <div 
          onClick={() => {
              if (stats.delayedSteps > 0) onGoToSteps();
          }}
          className={`bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm text-center relative overflow-hidden transition-all print:border print:border-slate-300 ${stats.delayedSteps > 0 ? 'cursor-pointer hover:shadow-md hover:bg-slate-50 dark:hover:bg-slate-800' : ''}`}
        >
          <div className={`absolute top-0 left-0 w-full h-1 ${stats.delayedSteps > 0 ? 'bg-danger' : 'bg-success'}`}></div>
          <p className="text-text-muted dark:text-slate-400 text-xs uppercase font-bold tracking-wider mb-2">Atrasos</p>
          <div className="flex items-center justify-center gap-2">
            <p className={`text-2xl lg:text-3xl font-bold ${stats.delayedSteps > 0 ? 'text-danger' : 'text-success'}`}>
                {stats.delayedSteps}
            </p>
            {stats.delayedSteps > 0 && <i className="fa-solid fa-chevron-right text-danger text-sm animate-pulse"></i>}
          </div>
          {stats.delayedSteps > 0 && <p className="text-[10px] text-danger mt-1">Clique para ver</p>}
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm text-center relative overflow-hidden transition-colors print:border print:border-slate-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-warning"></div>
            <p className="text-text-muted dark:text-slate-400 text-xs uppercase font-bold tracking-wider mb-2">Fim Previsto</p>
            <p className="text-lg lg:text-xl font-bold text-text-main dark:text-white mt-1">
                {new Date(work.endDate).toLocaleDateString('pt-BR')}
            </p>
        </div>
      </div>
      
    </div>
  );
};

const StepsTab: React.FC<{ workId: string, refreshWork: () => void }> = ({ workId, refreshWork }) => {
  const [phases, setPhases] = useState<Record<string, Step[]>>({});
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({});
  const [sortedPhaseNames, setSortedPhaseNames] = useState<string[]>([]);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStepName, setNewStepName] = useState('');
  const [newStepCategory, setNewStepCategory] = useState('');
  const [newStepStart, setNewStepStart] = useState('');
  const [newStepEnd, setNewStepEnd] = useState('');

  const loadSteps = () => {
    const s = dbService.getSteps(workId);
    
    // Group by Phase
    const grouped: Record<string, Step[]> = {};
    s.forEach(step => {
      let phaseName = 'Geral';
      if (step.name.includes(' - ')) {
        phaseName = step.name.split(' - ')[0];
      } else {
          phaseName = 'Personalizadas';
      }
      if (!grouped[phaseName]) grouped[phaseName] = [];
      grouped[phaseName].push(step);
    });
    setPhases(grouped);
    
    // Sort logic
    const standardOrderMap: Record<string, number> = {};
    STANDARD_PHASES.forEach((p, index) => {
        standardOrderMap[p.category] = index;
    });
    standardOrderMap['Personalizadas'] = 999;
    standardOrderMap['Geral'] = 1000;

    const sortedKeys = Object.keys(grouped).sort((a, b) => {
        const idxA = standardOrderMap[a] !== undefined ? standardOrderMap[a] : 999;
        const idxB = standardOrderMap[b] !== undefined ? standardOrderMap[b] : 999;
        return idxA - idxB;
    });
    setSortedPhaseNames(sortedKeys);
  };

  useEffect(loadSteps, [workId]);

  const updateStatus = (step: Step, newStatus: StepStatus) => {
    dbService.updateStep({ ...step, status: newStatus });
    loadSteps();
    refreshWork(); 
  };
  
  const updateStepDates = (step: Step, field: 'start' | 'end', value: string) => {
      const updatedStep = { ...step };
      if (field === 'start') updatedStep.startDate = value;
      if (field === 'end') updatedStep.endDate = value;
      
      dbService.updateStep(updatedStep);
      loadSteps();
      refreshWork();
  };

  const togglePhase = (phase: string) => {
    setExpandedPhases(prev => ({ ...prev, [phase]: !prev[phase] }));
  };

  const calculatePhaseProgress = (phaseSteps: Step[]) => {
    if (!phaseSteps.length) return 0;
    const completed = phaseSteps.filter(s => s.status === StepStatus.COMPLETED).length;
    return Math.round((completed / phaseSteps.length) * 100);
  };

  const handleCreateStep = (e: React.FormEvent) => {
      e.preventDefault();
      const fullName = newStepCategory && newStepCategory !== 'Personalizadas' ? `${newStepCategory} - ${newStepName}` : newStepName;
      
      dbService.addStep({
          workId,
          name: fullName,
          startDate: newStepStart,
          endDate: newStepEnd,
          status: StepStatus.NOT_STARTED
      });
      
      setIsModalOpen(false);
      setNewStepName('');
      setNewStepCategory('');
      setNewStepStart('');
      setNewStepEnd('');
      loadSteps();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 print:hidden">
          <h2 className="text-xl font-bold text-text-main dark:text-white">Cronograma de Execução</h2>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full md:w-auto bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl text-sm font-bold shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2"
          >
              <i className="fa-solid fa-plus"></i> Nova Etapa
          </button>
      </div>

      <div className="relative space-y-4 before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-100 before:dark:bg-slate-800 before:z-0">
        {sortedPhaseNames.map((phase) => {
          const phaseSteps = phases[phase];
          const progress = calculatePhaseProgress(phaseSteps);
          const isExpanded = expandedPhases[phase];
          const isComplete = progress === 100;
          
          // VERIFICA SE HÁ ATRASO NA FASE (Qualquer etapa atrasada)
          const now = new Date();
          const hasPhaseDelay = phaseSteps.some(step => 
              step.status !== StepStatus.COMPLETED && new Date(step.endDate) < now
          );

          // DEFINIR CORES DO INDICADOR BASEADO NO STATUS
          let indicatorClasses = "";
          let titleClasses = "text-text-main dark:text-white";
          let iconContent = null;

          if (isComplete) {
              // 100% Concluído: Verde Sólido + Check
              indicatorClasses = "bg-success text-white border-transparent";
              titleClasses = "text-success";
              iconContent = <i className="fa-solid fa-check"></i>;
          } else if (hasPhaseDelay) {
              // Atrasado: Borda Vermelha + Texto Vermelho
              indicatorClasses = "bg-white dark:bg-slate-900 text-danger border-2 border-danger";
              titleClasses = "text-danger";
              iconContent = `${progress}%`;
          } else if (progress > 0) {
              // Em andamento (No prazo): Borda Verde + Texto Verde
              indicatorClasses = "bg-white dark:bg-slate-900 text-success border-2 border-success";
              titleClasses = "text-success";
              iconContent = `${progress}%`;
          } else {
              // Não iniciado: Padrão Cinza
              indicatorClasses = "bg-surface dark:bg-slate-800 text-text-body dark:text-slate-400 border border-slate-200 dark:border-slate-700";
              iconContent = `${progress}%`;
          }

          return (
            <div key={phase} className={`relative z-10 bg-white dark:bg-slate-900 rounded-2xl border transition-all ${isComplete ? 'border-success/30' : (hasPhaseDelay ? 'border-danger/30' : 'border-slate-100 dark:border-slate-800')}`}>
               <button 
                 onClick={() => togglePhase(phase)}
                 className="w-full flex items-center justify-between p-5 focus:outline-none"
               >
                 <div className="flex items-center gap-4">
                    {/* Indicador Visual da Fase */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm transition-colors ${indicatorClasses}`}>
                        {iconContent}
                    </div>
                    <div className="text-left">
                        <h4 className={`font-bold text-lg ${titleClasses}`}>{phase}</h4>
                        <p className={`text-xs ${hasPhaseDelay ? 'text-danger font-bold' : 'text-text-muted dark:text-slate-500'}`}>
                            {hasPhaseDelay ? 'Fase com atrasos!' : `${phaseSteps.length} atividades`}
                        </p>
                    </div>
                 </div>
                 <i className={`fa-solid fa-chevron-down text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}></i>
               </button>
               
               {isExpanded && (
                 <div className="px-5 pb-5 pt-0 border-t border-slate-50 dark:border-slate-800/50">
                     <div className="space-y-3 pt-4 pl-14">
                        {phaseSteps.map(step => {
                            const stepNameDisplay = step.name.includes(' - ') ? step.name.split(' - ')[1] : step.name;
                            const isStepComplete = step.status === StepStatus.COMPLETED;
                            const now = new Date();
                            const endDate = new Date(step.endDate);
                            const isLate = !isStepComplete && now > endDate;

                            return (
                                <div key={step.id} className={`flex flex-col xl:flex-row xl:items-center justify-between p-3 rounded-xl border transition-colors group ${isLate ? 'bg-danger-light/10 border-danger/20' : 'bg-surface/30 dark:bg-slate-800/30 border-transparent hover:bg-surface dark:hover:bg-slate-800'}`}>
                                    <div className="mb-3 xl:mb-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <p className={`font-medium ${isStepComplete ? 'text-text-muted line-through decoration-slate-400' : 'text-text-main dark:text-white'}`}>
                                                {stepNameDisplay}
                                            </p>
                                            {isLate && <span className="text-[10px] font-bold bg-danger text-white px-1.5 py-0.5 rounded">ATRASADO</span>}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4 text-xs">
                                            <div className="flex items-center gap-2">
                                                <label className="text-text-muted dark:text-slate-500">Início:</label>
                                                <input 
                                                    type="date" 
                                                    value={step.startDate}
                                                    onChange={(e) => updateStepDates(step, 'start', e.target.value)}
                                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-text-body dark:text-slate-300 focus:ring-1 focus:ring-primary outline-none"
                                                />
                                            </div>
                                            <i className="fa-solid fa-arrow-right text-[10px] opacity-30"></i>
                                            <div className="flex items-center gap-2">
                                                <label className="text-text-muted dark:text-slate-500">Fim:</label>
                                                <input 
                                                    type="date" 
                                                    value={step.endDate}
                                                    onChange={(e) => updateStepDates(step, 'end', e.target.value)}
                                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-text-body dark:text-slate-300 focus:ring-1 focus:ring-primary outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 self-start xl:self-auto print:hidden">
                                        {step.status === StepStatus.NOT_STARTED && (
                                            <button 
                                                onClick={() => updateStatus(step, StepStatus.IN_PROGRESS)}
                                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-text-body dark:text-slate-200 text-xs font-bold hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm"
                                            >
                                                <i className="fa-solid fa-play"></i> Iniciar
                                            </button>
                                        )}
                                        {step.status === StepStatus.IN_PROGRESS && (
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => updateStatus(step, StepStatus.COMPLETED)}
                                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-warning-light text-warning-dark dark:bg-yellow-900/30 dark:text-yellow-200 border border-warning/20 text-xs font-bold hover:bg-success hover:text-white hover:border-success transition-all shadow-sm"
                                                >
                                                    <i className="fa-solid fa-spinner fa-spin"></i> Em andamento
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        updateStatus(step, StepStatus.NOT_STARTED);
                                                    }}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 text-text-muted hover:text-danger hover:bg-danger-light transition-all"
                                                    title="Cancelar início"
                                                >
                                                    <i className="fa-solid fa-xmark"></i>
                                                </button>
                                            </div>
                                        )}
                                        {step.status === StepStatus.COMPLETED && (
                                            <div className="flex items-center gap-2 text-success font-bold text-xs bg-success-light dark:bg-green-900/30 px-3 py-1.5 rounded-lg">
                                                <i className="fa-solid fa-check-double"></i> Feito
                                            </div>
                                        )}
                                        {isStepComplete && (
                                            <button 
                                                onClick={() => updateStatus(step, StepStatus.IN_PROGRESS)}
                                                className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-primary text-xs px-2 py-1 transition-opacity"
                                                title="Reabrir etapa"
                                            >
                                                <i className="fa-solid fa-rotate-left"></i>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                     </div>
                 </div>
               )}
            </div>
          );
        })}
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-bold text-text-main dark:text-white mb-4">Adicionar Etapa Manual</h3>
                  <form onSubmit={handleCreateStep} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-text-muted dark:text-slate-400 mb-1">Fase / Categoria</label>
                          <select 
                             className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary outline-none"
                             value={newStepCategory}
                             onChange={e => setNewStepCategory(e.target.value)}
                             required
                          >
                              <option value="">Selecione...</option>
                              {STANDARD_PHASES.map(p => (
                                  <option key={p.category} value={p.category}>{p.category}</option>
                              ))}
                              <option value="Personalizadas">Outra / Personalizada</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-text-muted dark:text-slate-400 mb-1">Nome da Atividade</label>
                          <input 
                             type="text"
                             className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary outline-none"
                             placeholder="Ex: Instalar Ar Condicionado"
                             value={newStepName}
                             onChange={e => setNewStepName(e.target.value)}
                             required
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-text-muted dark:text-slate-400 mb-1">Início</label>
                              <input 
                                 type="date"
                                 className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary outline-none"
                                 value={newStepStart}
                                 onChange={e => setNewStepStart(e.target.value)}
                                 required
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-text-muted dark:text-slate-400 mb-1">Término</label>
                              <input 
                                 type="date"
                                 className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary outline-none"
                                 value={newStepEnd}
                                 onChange={e => setNewStepEnd(e.target.value)}
                                 required
                              />
                          </div>
                      </div>
                      <div className="flex gap-3 pt-4">
                          <button 
                            type="button" 
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-text-muted font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                              Cancelar
                          </button>
                          <button 
                            type="submit" 
                            className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20"
                          >
                              Adicionar
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

const ExpensesTab: React.FC<{ workId: string, onUpdate: () => void }> = ({ workId, onUpdate }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  
  // State for New Expense
  const [newExp, setNewExp] = useState({ 
      description: '', 
      amount: '', 
      paidAmount: '', 
      quantity: '', 
      category: ExpenseCategory.MATERIAL, 
      date: '' 
  });
  
  // Custom Catalog State
  const [isCustom, setIsCustom] = useState(false);
  const [categorySel, setCategorySel] = useState('');
  const [subCategorySel, setSubCategorySel] = useState('');
  const [itemSel, setItemSel] = useState('');

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Expense>>({});

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const loadExpenses = () => setExpenses(dbService.getExpenses(workId));
  useEffect(loadExpenses, [workId]);

  // Catalog Helpers
  const expenseCategories = Object.keys(STANDARD_EXPENSE_CATALOG);
  const expenseSubCategories = categorySel && !isCustom ? Object.keys(STANDARD_EXPENSE_CATALOG[categorySel] || {}) : [];
  const expenseItems = categorySel && subCategorySel && !isCustom ? STANDARD_EXPENSE_CATALOG[categorySel][subCategorySel] || [] : [];

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const finalDescription = isCustom ? newExp.description : `${categorySel} - ${itemSel}`;
    
    dbService.addExpense({
      workId,
      description: finalDescription,
      amount: Number(newExp.amount),
      // CHANGE: Default paidAmount to 0 if empty/undefined. User must explicitly set it if paid.
      paidAmount: newExp.paidAmount ? Number(newExp.paidAmount) : 0, 
      quantity: newExp.quantity ? Number(newExp.quantity) : 1,
      category: newExp.category,
      date: newExp.date || new Date().toISOString().split('T')[0]
    });
    
    setNewExp({ description: '', amount: '', paidAmount: '', quantity: '', category: ExpenseCategory.MATERIAL, date: '' });
    // Reset Catalog
    setCategorySel('');
    setSubCategorySel('');
    setItemSel('');
    
    loadExpenses();
    onUpdate();
  };

  const autoSelectCategory = (catName: string) => {
      setCategorySel(catName);
      setSubCategorySel('');
      // Auto-map catalog category to System ExpenseCategory
      if (catName === 'Mão de Obra') setNewExp(prev => ({ ...prev, category: ExpenseCategory.LABOR }));
      else if (catName === 'Taxas e Projetos') setNewExp(prev => ({ ...prev, category: ExpenseCategory.PERMITS }));
      else if (catName === 'Equipamentos') setNewExp(prev => ({ ...prev, category: ExpenseCategory.OTHER }));
      else setNewExp(prev => ({ ...prev, category: ExpenseCategory.MATERIAL }));
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setConfirmModal({
          isOpen: true,
          title: "Excluir Despesa",
          message: "Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.",
          onConfirm: () => {
              dbService.deleteExpense(id);
              loadExpenses();
              onUpdate();
              setConfirmModal(prev => ({ ...prev, isOpen: false }));
          }
      });
  };

  const handleEditClick = (exp: Expense, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingId(exp.id);
      // Ensure paidAmount is properly set to 0 if undefined during edit
      setEditData({ ...exp, paidAmount: exp.paidAmount ?? 0 });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
      e.preventDefault();
      setConfirmModal({
          isOpen: true,
          title: "Salvar Alterações",
          message: "Deseja confirmar as alterações nesta despesa?",
          onConfirm: () => {
              if(editingId && editData) {
                  dbService.updateExpense(editData as Expense);
                  setEditingId(null);
                  loadExpenses();
                  onUpdate();
              }
              setConfirmModal(prev => ({ ...prev, isOpen: false }));
          }
      });
  };

  const getPaymentStatus = (exp: Expense) => {
      const paid = exp.paidAmount ?? 0; // Default to 0 for status check
      if (paid >= exp.amount) return { label: 'PAGO', color: 'bg-success-light text-success-dark dark:bg-green-900/50 dark:text-green-200' };
      if (paid > 0) return { label: 'PARCIAL', color: 'bg-warning-light text-warning-dark dark:bg-yellow-900/50 dark:text-yellow-200' };
      return { label: 'PENDENTE', color: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300' };
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors print:hidden">
        <div className="flex justify-between items-center mb-5">
           <h3 className="font-bold text-text-main dark:text-white">Adicionar Despesa</h3>
           <button 
             type="button" 
             onClick={() => { setIsCustom(!isCustom); setCategorySel(''); setSubCategorySel(''); }}
             className="text-sm text-primary dark:text-primary-light font-semibold hover:underline"
           >
             {isCustom ? "Usar Catálogo" : "Cadastro Manual"}
           </button>
        </div>

        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* CATALOG SELECTION OR MANUAL INPUT */}
          {!isCustom ? (
             <>
               <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                   <select 
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none" 
                      value={categorySel} 
                      onChange={e => autoSelectCategory(e.target.value)}
                      required
                   >
                     <option value="">Categoria</option>
                     {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                   <select 
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none" 
                      value={subCategorySel} 
                      onChange={e => setSubCategorySel(e.target.value)}
                      disabled={!categorySel}
                      required
                   >
                     <option value="">Subcategoria</option>
                     {expenseSubCategories.map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                   <select 
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none" 
                      value={itemSel} 
                      onChange={e => setItemSel(e.target.value)}
                      disabled={!subCategorySel}
                      required
                   >
                     <option value="">Item</option>
                     {expenseItems.map(i => <option key={i} value={i}>{i}</option>)}
                   </select>
               </div>
             </>
          ) : (
            <div className="md:col-span-2">
              <input 
                  placeholder="Descrição da despesa" 
                  required
                  value={newExp.description}
                  onChange={e => setNewExp({...newExp, description: e.target.value})}
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none placeholder:text-text-muted dark:placeholder:text-slate-500"
              />
            </div>
          )}
          
          <select 
            value={newExp.category}
            onChange={e => setNewExp({...newExp, category: e.target.value as ExpenseCategory})}
            className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
          >
            {Object.values(ExpenseCategory).map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <input 
             type="date"
             value={newExp.date}
             onChange={e => setNewExp({...newExp, date: e.target.value})}
             className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
          />

          {/* Row 2: Values */}
          <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
               <div>
                  <label className="block text-xs font-bold text-text-muted dark:text-slate-500 mb-1 uppercase">Quantidade</label>
                  <input 
                      type="number" 
                      placeholder="Ex: 1" 
                      value={newExp.quantity}
                      onChange={e => setNewExp({...newExp, quantity: e.target.value})}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
               </div>
               <div className="relative">
                 <label className="block text-xs font-bold text-text-muted dark:text-slate-500 mb-1 uppercase">Valor Total (R$)</label>
                 <span className="absolute left-4 top-9 text-text-muted dark:text-slate-500 text-sm">R$</span>
                 <input 
                    type="number" 
                    placeholder="0,00" 
                    required
                    value={newExp.amount}
                    onChange={e => setNewExp({...newExp, amount: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                 />
               </div>
               <div className="relative">
                 <label className="block text-xs font-bold text-text-muted dark:text-slate-500 mb-1 uppercase">Valor Pago (Opcional)</label>
                 <span className="absolute left-4 top-9 text-text-muted dark:text-slate-500 text-sm">R$</span>
                 <input 
                    type="number" 
                    placeholder="0,00 (Se vazio = 0)" 
                    value={newExp.paidAmount}
                    onChange={e => setNewExp({...newExp, paidAmount: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                 />
               </div>
          </div>

          <div className="lg:col-span-4 text-right">
             <button type="submit" className="w-full md:w-auto bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md shadow-primary/20">
               Adicionar Despesa
             </button>
          </div>
        </form>
      </div>

      {/* Lista de Despesas em Grid (Cards) - Layout Atualizado */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 print:grid-cols-2 print:gap-4">
        {expenses.map(exp => {
            const status = getPaymentStatus(exp);
            const paidVal = exp.paidAmount ?? 0;
            const progress = Math.min((paidVal / exp.amount) * 100, 100);

            return (
                <div key={exp.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative group hover:shadow-md transition-all print:border-slate-300 print:break-inside-avoid">
                    
                    {/* Ações (Topo Direito) */}
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                        <button 
                            onClick={(e) => handleEditClick(exp, e)}
                            className="text-slate-300 dark:text-slate-600 hover:text-primary dark:hover:text-primary-light"
                            title="Editar"
                        >
                            <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button 
                            onClick={(e) => handleDeleteClick(exp.id, e)}
                            className="text-slate-300 dark:text-slate-600 hover:text-danger"
                            title="Excluir"
                        >
                            <i className="fa-solid fa-trash"></i>
                        </button>
                    </div>

                    {/* Cabeçalho */}
                    <div className="mb-3 pr-16">
                        <h4 className="font-bold text-text-main dark:text-white text-sm truncate" title={exp.description}>
                            {exp.description}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-text-muted dark:text-slate-500">
                                {new Date(exp.date).toLocaleDateString('pt-BR')}
                            </span>
                            {exp.quantity && exp.quantity > 1 && (
                                <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 rounded text-text-muted dark:text-slate-400">
                                    x{exp.quantity}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Categoria & Status Badge */}
                    <div className="mb-4 flex gap-2">
                        <span className="bg-surface dark:bg-slate-800 text-text-body dark:text-slate-300 px-2.5 py-1 rounded-md text-[10px] font-medium border border-slate-200 dark:border-slate-700">
                            {exp.category}
                        </span>
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide ${status.color}`}>
                            {status.label}
                        </span>
                    </div>

                    {/* Rodapé do Card (Valores e Progresso) */}
                    <div className="pt-3 border-t border-slate-50 dark:border-slate-800">
                        <div className="flex justify-between items-end mb-1">
                            <div className="text-xs text-text-muted dark:text-slate-500">
                                <p>Total: R$ {exp.amount.toFixed(2)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-text-muted dark:text-slate-500 uppercase">Pago</p>
                                <p className={`font-bold text-base ${paidVal >= exp.amount ? 'text-success' : 'text-text-main dark:text-white'}`}>
                                    R$ {paidVal.toFixed(2)}
                                </p>
                            </div>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-success transition-all duration-500" style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                </div>
            );
        })}

        {expenses.length === 0 && (
          <div className="col-span-full text-center py-12 text-text-muted dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
             <i className="fa-solid fa-receipt text-3xl mb-3 opacity-30"></i>
             <p>Nenhuma despesa lançada.</p>
          </div>
        )}
      </div>

      {/* Modal de Edição de Despesa */}
      {editingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:hidden">
              <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-bold text-text-main dark:text-white mb-4">Editar Despesa</h3>
                  <form onSubmit={handleSaveEdit} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-text-muted dark:text-slate-400 mb-1">Descrição</label>
                          <input 
                             type="text"
                             className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary outline-none"
                             value={editData.description || ''}
                             onChange={e => setEditData({...editData, description: e.target.value})}
                             required
                          />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-muted dark:text-slate-400 mb-1">Valor Total (R$)</label>
                            <input 
                                type="number"
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary outline-none"
                                value={editData.amount || ''}
                                onChange={e => setEditData({...editData, amount: Number(e.target.value)})}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-muted dark:text-slate-400 mb-1">Valor Pago (R$)</label>
                            <input 
                                type="number"
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary outline-none"
                                value={editData.paidAmount !== undefined ? editData.paidAmount : 0}
                                onChange={e => setEditData({...editData, paidAmount: Number(e.target.value)})}
                                required
                            />
                        </div>
                      </div>

                       {/* Remaining Calculation Visual Aid */}
                       {editData.amount !== undefined && (editData.paidAmount !== undefined ? editData.paidAmount : 0) < editData.amount && (
                           <div className="p-3 bg-warning-light/30 border border-warning/30 rounded-lg text-center">
                               <p className="text-xs text-text-muted dark:text-slate-400 uppercase font-bold">Restante a Pagar</p>
                               <p className="text-lg font-bold text-warning-dark dark:text-yellow-400">
                                   R$ {(editData.amount - (editData.paidAmount || 0)).toFixed(2)}
                               </p>
                           </div>
                       )}

                      <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-text-muted dark:text-slate-400 mb-1">Data</label>
                            <input 
                                type="date"
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary outline-none"
                                value={editData.date || ''}
                                onChange={e => setEditData({...editData, date: e.target.value})}
                                required
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-text-muted dark:text-slate-400 mb-1">Quantidade</label>
                            <input 
                                type="number"
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary outline-none"
                                value={editData.quantity || 1}
                                onChange={e => setEditData({...editData, quantity: Number(e.target.value)})}
                            />
                        </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-text-muted dark:text-slate-400 mb-1">Categoria</label>
                          <select 
                            value={editData.category}
                            onChange={e => setEditData({...editData, category: e.target.value as ExpenseCategory})}
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary outline-none"
                          >
                            {Object.values(ExpenseCategory).map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                      </div>

                      <div className="flex gap-3 pt-4">
                          <button 
                            type="button" 
                            onClick={() => setEditingId(null)}
                            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-text-muted font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                              Cancelar
                          </button>
                          <button 
                            type="submit" 
                            className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20"
                          >
                              Salvar
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Modal de Confirmação */}
      <ConfirmModal 
         isOpen={confirmModal.isOpen}
         title={confirmModal.title}
         message={confirmModal.message}
         onConfirm={confirmModal.onConfirm}
         onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

const MaterialsTab: React.FC<{ workId: string, onUpdate: () => void }> = ({ workId, onUpdate }) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [materialName, setMaterialName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('un');
  
  // Steps for linking
  const [steps, setSteps] = useState<Step[]>([]);
  const [selectedStep, setSelectedStep] = useState('');
  
  // Custom Material
  const [isCustom, setIsCustom] = useState(false);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: '', planned: 0, purchased: 0, unit: '', cost: '', stepId: '' });

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const loadMaterials = () => setMaterials(dbService.getMaterials(workId));
  
  useEffect(() => {
     loadMaterials();
     setSteps(dbService.getSteps(workId));
  }, [workId]);

  const categories = Object.keys(STANDARD_MATERIAL_CATALOG);
  const subCategories = category && !isCustom ? Object.keys(STANDARD_MATERIAL_CATALOG[category] || {}) : [];
  const items = category && subCategory && !isCustom ? STANDARD_MATERIAL_CATALOG[category][subCategory] || [] : [];

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    dbService.addMaterial({
      workId,
      name: isCustom ? materialName : `${category} - ${materialName}`,
      plannedQty: Number(qty),
      purchasedQty: 0, // Inicia com 0 comprado
      unit,
      stepId: selectedStep || undefined
    });
    setMaterialName('');
    setQty('');
    setSelectedStep('');
    loadMaterials();
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({
        isOpen: true,
        title: "Excluir Material",
        message: "Tem certeza que deseja remover este material da lista?",
        onConfirm: () => {
            dbService.deleteMaterial(id);
            loadMaterials();
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
    });
  }

  const handleEditClick = (mat: Material, e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingId(mat.id);
      setEditData({ 
          name: mat.name, 
          planned: mat.plannedQty, 
          purchased: mat.purchasedQty, 
          unit: mat.unit, 
          cost: '',
          stepId: mat.stepId || ''
      });
  }

  const handleSaveEdit = (e: React.FormEvent) => {
      e.preventDefault();
      
      setConfirmModal({
        isOpen: true,
        title: "Salvar Alterações",
        message: "Confirma a atualização deste material? Se houver custo lançado, será criada uma despesa automaticamente.",
        onConfirm: () => {
            if (!editingId) return;

            const purchasedQty = Number(editData.purchased);

            // 1. Atualizar Material
            dbService.updateMaterial({
                id: editingId,
                workId,
                name: editData.name,
                plannedQty: Number(editData.planned),
                purchasedQty: purchasedQty,
                unit: editData.unit,
                stepId: editData.stepId || undefined
            });

            // 2. Se a quantidade comprada for zero, remove despesas associadas
            if (purchasedQty === 0) {
                dbService.deleteExpensesByMaterialId(editingId);
            } else {
                // 3. Lançar Despesa Automática (se houver valor)
                const costValue = Number(editData.cost);
                if (costValue > 0) {
                    dbService.addExpense({
                        workId,
                        description: `Compra: ${editData.name}`,
                        amount: costValue,
                        paidAmount: costValue, // Assuming material purchase is paid immediately
                        category: ExpenseCategory.MATERIAL,
                        date: new Date().toISOString().split('T')[0],
                        relatedMaterialId: editingId // Vínculo com material
                    });
                }
            }

            setEditingId(null);
            loadMaterials();
            onUpdate(); // Atualiza o orçamento global da obra
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
    });
  }

  const getStatus = (m: Material) => {
    if (m.purchasedQty === 0) return { label: 'FALTANDO', color: 'bg-danger-light text-danger dark:bg-red-900/50 dark:text-red-200' };
    if (m.purchasedQty >= m.plannedQty) return { label: 'COMPLETO', color: 'bg-success-light text-success-dark dark:bg-green-900/50 dark:text-green-200' };
    return { label: 'PARCIAL', color: 'bg-warning-light text-warning-dark dark:bg-yellow-900/50 dark:text-yellow-200' };
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors print:hidden">
        <div className="flex justify-between items-center mb-5">
           <h3 className="font-bold text-text-main dark:text-white">Adicionar Material</h3>
           <button 
             type="button" 
             onClick={() => { setIsCustom(!isCustom); setCategory(''); setSubCategory(''); }}
             className="text-sm text-primary dark:text-primary-light font-semibold hover:underline"
           >
             {isCustom ? "Usar Catálogo" : "Cadastro Manual"}
           </button>
        </div>

        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {!isCustom ? (
            <>
              <select 
                className="px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none" 
                value={category} 
                onChange={e => { setCategory(e.target.value); setSubCategory(''); }}
                required
              >
                <option value="">Selecione Categoria</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              
              <select 
                className="px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none" 
                value={subCategory} 
                onChange={e => setSubCategory(e.target.value)}
                disabled={!category}
                required
              >
                <option value="">Selecione Subcategoria</option>
                {subCategories.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <select 
                className="px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none" 
                value={materialName} 
                onChange={e => setMaterialName(e.target.value)}
                disabled={!subCategory}
                required
              >
                <option value="">Selecione Material</option>
                {items.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </>
          ) : (
             <input 
               placeholder="Nome do Material" 
               className="md:col-span-3 px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none placeholder:text-text-muted dark:placeholder:text-slate-500"
               value={materialName}
               onChange={e => setMaterialName(e.target.value)}
               required
             />
          )}

          <div className="flex gap-2">
            <input 
              type="number" 
              placeholder="Qtd" 
              className="w-2/3 px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none placeholder:text-text-muted dark:placeholder:text-slate-500"
              value={qty}
              onChange={e => setQty(e.target.value)}
              required
            />
             <input 
              type="text" 
              placeholder="Un" 
              className="w-1/3 px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none placeholder:text-text-muted dark:placeholder:text-slate-500"
              value={unit}
              onChange={e => setUnit(e.target.value)}
              required
            />
          </div>

          <div className="md:col-span-2 lg:col-span-4">
              <label className="block text-xs font-bold text-text-muted dark:text-slate-500 mb-1 uppercase">Vincular a Etapa (Opcional)</label>
              <select 
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none" 
                value={selectedStep} 
                onChange={e => setSelectedStep(e.target.value)}
              >
                <option value="">Sem vínculo</option>
                {steps.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
          </div>

          <div className="md:col-span-4 text-right">
             <button type="submit" className="bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md shadow-primary/20">
               Adicionar à Lista
             </button>
          </div>
        </form>
      </div>

      {/* Lista de Materiais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 print:grid-cols-2 print:gap-4">
        {materials.map(mat => {
           const status = getStatus(mat);
           const stepName = steps.find(s => s.id === mat.stepId)?.name;

           return (
             <div key={mat.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative group hover:shadow-md transition-all print:border-slate-300 print:break-inside-avoid">
                {/* Ações */}
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                    <button 
                        onClick={(e) => handleEditClick(mat, e)}
                        className="text-slate-300 dark:text-slate-600 hover:text-primary dark:hover:text-primary-light"
                        title="Editar / Lançar Compra"
                    >
                        <i className="fa-solid fa-pen-to-square"></i>
                    </button>
                    <button 
                        onClick={(e) => handleDeleteClick(mat.id, e)}
                        className="text-slate-300 dark:text-slate-600 hover:text-danger"
                        title="Excluir"
                    >
                        <i className="fa-solid fa-trash"></i>
                    </button>
                </div>

                <div className="flex justify-between items-start mb-2">
                   <h4 className="font-bold text-text-main dark:text-white text-sm pr-16 truncate w-full" title={mat.name}>{mat.name}</h4>
                </div>
                
                {stepName && (
                   <div className="mb-3">
                       <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-text-muted dark:text-slate-400 px-2 py-0.5 rounded flex items-center gap-1 w-fit max-w-full truncate">
                           <i className="fa-solid fa-link text-[8px]"></i> {stepName}
                       </span>
                   </div>
                )}
                
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide ${status.color}`}>
                     {status.label}
                  </span>
                </div>
                
                <div className="flex justify-between text-xs text-text-muted dark:text-slate-500 pt-3 border-t border-slate-50 dark:border-slate-800">
                   <div>
                      <p>Planejado</p>
                      <p className="font-bold text-text-body dark:text-slate-300">{mat.plannedQty} {mat.unit}</p>
                   </div>
                   <div className="text-right">
                      <p>Comprado</p>
                      <p className="font-bold text-text-body dark:text-slate-300">{mat.purchasedQty} {mat.unit}</p>
                   </div>
                </div>
             </div>
           )
        })}
        {materials.length === 0 && (
          <div className="col-span-full text-center py-12 text-text-muted dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
             <i className="fa-solid fa-box-open text-3xl mb-3 opacity-30"></i>
             <p>Nenhum material cadastrado.</p>
          </div>
        )}
      </div>

      {/* Modal de Edição */}
      {editingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:hidden">
              <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
                  <h3 className="text-lg font-bold text-text-main dark:text-white mb-4">Editar / Lançar Compra</h3>
                  <form onSubmit={handleSaveEdit} className="space-y-4">
                      
                      <div>
                          <label className="block text-sm font-medium text-text-muted dark:text-slate-400 mb-1">Nome do Material</label>
                          <input 
                             type="text"
                             className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary outline-none"
                             value={editData.name}
                             onChange={e => setEditData({...editData, name: e.target.value})}
                             required
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-text-muted dark:text-slate-400 mb-1">Planejado ({editData.unit})</label>
                              <input 
                                 type="number"
                                 className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary outline-none"
                                 value={editData.planned}
                                 onChange={e => setEditData({...editData, planned: Number(e.target.value)})}
                                 required
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-text-muted dark:text-slate-400 mb-1">Comprado ({editData.unit})</label>
                              <input 
                                 type="number"
                                 className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary outline-none"
                                 value={editData.purchased}
                                 onChange={e => setEditData({...editData, purchased: Number(e.target.value)})}
                                 required
                              />
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-text-muted dark:text-slate-400 mb-1">Etapa Vinculada</label>
                          <select 
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary outline-none" 
                            value={editData.stepId} 
                            onChange={e => setEditData({...editData, stepId: e.target.value})}
                          >
                            <option value="">Sem vínculo</option>
                            {steps.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                      </div>

                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                          <label className="block text-sm font-bold text-primary dark:text-primary-light mb-1">
                              <i className="fa-solid fa-receipt mr-1"></i> Lançar Valor como Despesa?
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-2.5 text-text-muted dark:text-slate-500">R$</span>
                            <input 
                                type="number"
                                className="w-full pl-10 pr-4 py-2 rounded-xl border border-primary/30 dark:border-primary/50 bg-primary/5 dark:bg-primary/10 text-text-main dark:text-white focus:ring-2 focus:ring-primary outline-none placeholder:text-text-muted/50"
                                placeholder="0,00 (Opcional)"
                                value={editData.cost}
                                onChange={e => setEditData({...editData, cost: e.target.value})}
                            />
                          </div>
                          <p className="text-[10px] text-text-muted dark:text-slate-500 mt-1">
                              Se preenchido, cria um registro automático na aba Despesas.
                          </p>
                      </div>

                      <div className="flex gap-3 pt-4">
                          <button 
                            type="button" 
                            onClick={() => setEditingId(null)}
                            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-text-muted font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                              Cancelar
                          </button>
                          <button 
                            type="submit" 
                            className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20"
                          >
                              Salvar
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Modal de Confirmação */}
      <ConfirmModal 
         isOpen={confirmModal.isOpen}
         title={confirmModal.title}
         message={confirmModal.message}
         onConfirm={confirmModal.onConfirm}
         onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

const ReportsTab: React.FC<{ work: Work, stats: any }> = ({ work, stats }) => {
  const downloadCSV = (data: any[], filename: string) => {
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(obj => Object.values(obj).map(v => `"${v}"`).join(',')).join('\n');
      const csvContent = "data:text/csv;charset=utf-8," + headers + '\n' + rows;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  }

  const exportExpenses = () => {
      const expenses = dbService.getExpenses(work.id).map(e => ({
          Data: new Date(e.date).toLocaleDateString('pt-BR'),
          Descricao: e.description,
          Categoria: e.category,
          Valor: e.amount.toFixed(2)
      }));
      if (expenses.length > 0) downloadCSV(expenses, `despesas_${work.name.replace(/\s+/g, '_')}.csv`);
      else alert("Não há despesas para exportar.");
  };

  const exportMaterials = () => {
      const materials = dbService.getMaterials(work.id).map(m => ({
          Material: m.name,
          Planejado: m.plannedQty,
          Comprado: m.purchasedQty,
          Unidade: m.unit,
          Status: m.purchasedQty >= m.plannedQty ? 'OK' : 'Faltando'
      }));
      if (materials.length > 0) downloadCSV(materials, `materiais_${work.name.replace(/\s+/g, '_')}.csv`);
      else alert("Não há materiais para exportar.");
  };

  const materials = dbService.getMaterials(work.id);
  const missingMaterials = materials.filter(m => m.purchasedQty < m.plannedQty).length;

  return (
    <div className="space-y-8 print:block print:space-y-4">
        <div className="flex justify-between items-center print:hidden">
            <h2 className="text-xl font-bold text-text-main dark:text-white">Relatórios da Obra</h2>
            <button 
                onClick={() => window.print()} 
                className="bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-primary/20 transition-all flex items-center gap-2"
            >
                <i className="fa-solid fa-print"></i> Imprimir PDF
            </button>
        </div>

        {/* Resumo Financeiro - Layout Ajustado para Mobile */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-8 shadow-sm print:shadow-none print:border-slate-300 print:break-inside-avoid">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-lg font-bold text-text-main dark:text-white flex items-center gap-2">
                        <i className="fa-solid fa-coins text-warning"></i> Relatório Financeiro
                    </h3>
                    <p className="text-sm text-text-muted dark:text-slate-400">Resumo consolidado do orçamento.</p>
                </div>
                <button onClick={exportExpenses} className="text-primary hover:underline text-sm font-bold print:hidden">
                    <i className="fa-solid fa-file-csv mr-1"></i> Baixar CSV
                </button>
            </div>
            
            {/* Grid ajustado: 1 coluna no mobile, 3 no desktop */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 text-center print:grid-cols-3">
                <div className="p-4 bg-surface dark:bg-slate-800 rounded-xl print:border print:border-slate-200">
                    <p className="text-xs text-text-muted dark:text-slate-400 uppercase font-bold">Orçamento Total</p>
                    <p className="text-xl font-bold text-text-main dark:text-white">R$ {work.budgetPlanned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="p-4 bg-surface dark:bg-slate-800 rounded-xl print:border print:border-slate-200">
                    <p className="text-xs text-text-muted dark:text-slate-400 uppercase font-bold">Total Gasto</p>
                    <p className="text-xl font-bold text-danger">R$ {stats.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="p-4 bg-surface dark:bg-slate-800 rounded-xl print:border print:border-slate-200">
                    <p className="text-xs text-text-muted dark:text-slate-400 uppercase font-bold">Saldo Restante</p>
                    <p className={`text-xl font-bold ${work.budgetPlanned - stats.totalSpent >= 0 ? 'text-success' : 'text-danger'}`}>
                        R$ {(work.budgetPlanned - stats.totalSpent).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                </div>
            </div>
        </div>

        {/* Resumo Materiais - Layout Ajustado para Mobile */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-8 shadow-sm print:shadow-none print:border-slate-300 print:break-inside-avoid">
             <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-lg font-bold text-text-main dark:text-white flex items-center gap-2">
                        <i className="fa-solid fa-boxes-stacked text-primary"></i> Relatório de Materiais
                    </h3>
                    <p className="text-sm text-text-muted dark:text-slate-400">Status de compras e insumos.</p>
                </div>
                <button onClick={exportMaterials} className="text-primary hover:underline text-sm font-bold print:hidden">
                    <i className="fa-solid fa-file-csv mr-1"></i> Baixar CSV
                </button>
            </div>
            
            {/* Grid ajustado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4">
                <div className="p-4 bg-surface dark:bg-slate-800 rounded-xl">
                    <p className="text-2xl font-bold text-text-main dark:text-white">{materials.length}</p>
                    <p className="text-xs text-text-muted dark:text-slate-400">Itens Totais</p>
                </div>
                 <div className="p-4 bg-surface dark:bg-slate-800 rounded-xl">
                    <p className="text-2xl font-bold text-success">{materials.length - missingMaterials}</p>
                    <p className="text-xs text-text-muted dark:text-slate-400">Comprados</p>
                </div>
                 <div className="p-4 bg-surface dark:bg-slate-800 rounded-xl">
                    <p className="text-2xl font-bold text-danger">{missingMaterials}</p>
                    <p className="text-xs text-text-muted dark:text-slate-400">Faltando</p>
                </div>
            </div>
        </div>

         {/* Resumo Cronograma */}
         <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-8 shadow-sm print:shadow-none print:border-slate-300 print:break-inside-avoid">
             <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-lg font-bold text-text-main dark:text-white flex items-center gap-2">
                        <i className="fa-solid fa-calendar-check text-success"></i> Status do Cronograma
                    </h3>
                    <p className="text-sm text-text-muted dark:text-slate-400">Progresso físico da obra.</p>
                </div>
            </div>
            <div className="flex items-center gap-6">
                <div className="w-24 h-24 relative">
                   <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                      <circle className="stroke-current text-slate-200 dark:text-slate-700" cx="18" cy="18" fill="none" r="16" strokeWidth="3"></circle>
                      <circle className="stroke-current text-success" cx="18" cy="18" fill="none" r="16" strokeDasharray="100" strokeDashoffset={100 - stats.progress} strokeLinecap="round" strokeWidth="3"></circle>
                   </svg>
                   <span className="absolute inset-0 flex items-center justify-center font-bold text-text-main dark:text-white">{stats.progress}%</span>
                </div>
                <div>
                    <p className="font-bold text-text-main dark:text-white">Obra {work.status}</p>
                    <p className="text-sm text-text-muted dark:text-slate-400">Previsão de Término: {new Date(work.endDate).toLocaleDateString('pt-BR')}</p>
                    <p className={`text-sm font-bold mt-1 ${stats.delayedSteps > 0 ? 'text-danger' : 'text-success'}`}>
                        {stats.delayedSteps > 0 ? `${stats.delayedSteps} etapas atrasadas` : 'Cronograma em dia'}
                    </p>
                </div>
            </div>
        </div>
    </div>
  );
};

const PhotosTab: React.FC<{ workId: string }> = ({ workId }) => {
    const [photos, setPhotos] = useState<WorkPhoto[]>([]);
    const [filter, setFilter] = useState<'ALL' | 'BEFORE' | 'PROGRESS' | 'AFTER'>('ALL');
    const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, id: string | null}>({isOpen: false, id: null});

    const loadPhotos = () => {
        setPhotos(dbService.getPhotos(workId));
    };

    useEffect(loadPhotos, [workId]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Check size (limit to ~3MB for MVP local storage safety)
            if (file.size > 3 * 1024 * 1024) {
                alert("Por favor, envie uma imagem menor que 3MB.");
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                dbService.addPhoto({
                    workId,
                    url: base64,
                    date: new Date().toISOString(),
                    description: '', // Could add a prompt for this
                    type: 'PROGRESS' // Default, could allow selection before upload
                });
                loadPhotos();
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDelete = () => {
        if (confirmModal.id) {
            dbService.deletePhoto(confirmModal.id);
            setConfirmModal({isOpen: false, id: null});
            loadPhotos();
        }
    }

    const filteredPhotos = filter === 'ALL' ? photos : photos.filter(p => p.type === filter);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex bg-surface dark:bg-slate-800 p-1 rounded-xl">
                    {['ALL', 'BEFORE', 'PROGRESS', 'AFTER'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilter(type as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                filter === type 
                                ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm' 
                                : 'text-text-muted dark:text-slate-400 hover:text-text-main'
                            }`}
                        >
                            {type === 'ALL' ? 'Todas' : type === 'BEFORE' ? 'Antes' : type === 'PROGRESS' ? 'Durante' : 'Depois'}
                        </button>
                    ))}
                </div>
                
                <div className="relative">
                    <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        id="photo-upload"
                        onChange={handleFileUpload}
                    />
                    <label 
                        htmlFor="photo-upload"
                        className="cursor-pointer bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-primary/20 transition-all flex items-center gap-2"
                    >
                        <i className="fa-solid fa-cloud-arrow-up"></i> Adicionar Foto
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredPhotos.map(photo => (
                    <div key={photo.id} className="group relative aspect-square bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                        <img src={photo.url} alt="Obra" className="w-full h-full object-cover" />
                        
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                             <div className="flex justify-between items-end text-white">
                                <span className="text-xs font-medium bg-black/50 px-2 py-1 rounded">
                                    {new Date(photo.date).toLocaleDateString()}
                                </span>
                                <button 
                                    onClick={() => setConfirmModal({isOpen: true, id: photo.id})}
                                    className="bg-white text-danger p-2 rounded-lg hover:bg-slate-100 transition-colors"
                                >
                                    <i className="fa-solid fa-trash"></i>
                                </button>
                             </div>
                        </div>
                    </div>
                ))}
                
                {filteredPhotos.length === 0 && (
                     <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900">
                        <i className="fa-solid fa-images text-4xl text-slate-300 dark:text-slate-600 mb-3"></i>
                        <p className="text-text-muted dark:text-slate-400">Nenhuma foto encontrada nesta categoria.</p>
                     </div>
                )}
            </div>

            {/* Confirm Modal for Photo Delete */}
            <ConfirmModal 
                isOpen={confirmModal.isOpen}
                title="Excluir Foto"
                message="Deseja realmente excluir esta imagem? Essa ação não pode ser desfeita."
                onConfirm={handleDelete}
                onCancel={() => setConfirmModal({isOpen: false, id: null})}
            />
        </div>
    );
};

// --- BONUS TAB (Calculadoras & Checklist) ---

const BonusTab: React.FC<{ workId: string }> = ({ workId }) => {
  const [subTab, setSubTab] = useState<'CALC' | 'CHECK' | 'CONTRACT'>('CALC');
  
  // State for Calculators
  const [calcType, setCalcType] = useState<'FLOOR' | 'BRICK' | 'PAINT'>('FLOOR');
  const [inputs, setInputs] = useState<any>({});
  const [result, setResult] = useState<any>(null);

  // State for Contracts
  const [contractType, setContractType] = useState<'EMPREITA' | 'DIARIA' | 'RECIBO'>('EMPREITA');

  // State for Checklist (Persisted in LocalStorage for MVP)
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Load checklist state
    const saved = localStorage.getItem(`checklist_${workId}`);
    if (saved) setChecklist(JSON.parse(saved));
  }, [workId]);

  const toggleItem = (item: string) => {
    const newState = { ...checklist, [item]: !checklist[item] };
    setChecklist(newState);
    localStorage.setItem(`checklist_${workId}`, JSON.stringify(newState));
  };

  const calculate = () => {
      let res = null;
      if (calcType === 'FLOOR') {
          const area = Number(inputs.area || 0);
          const w = Number(inputs.width || 0) / 100; // cm to m
          const l = Number(inputs.length || 0) / 100; // cm to m
          const margin = Number(inputs.margin || 10) / 100;
          
          if (area > 0 && w > 0 && l > 0) {
             const pieceArea = w * l;
             const totalPieces = Math.ceil((area / pieceArea) * (1 + margin));
             const totalArea = (totalPieces * pieceArea).toFixed(2);
             res = { pieces: totalPieces, totalArea: totalArea, box: Math.ceil(totalPieces / (inputs.perBox || 1)) };
          }
      } else if (calcType === 'BRICK') {
          const area = Number(inputs.wallArea || 0);
          const type = inputs.brickType || '6HOLE'; 
          // Est: 6hole=25/m2, Block=12.5/m2
          const factor = type === '6HOLE' ? 25 : 13;
          const margin = 1.1; // 10%
          
          if (area > 0) {
              res = { total: Math.ceil(area * factor * margin) };
          }
      } else if (calcType === 'PAINT') {
          const area = Number(inputs.paintArea || 0);
          const coats = Number(inputs.coats || 2);
          // Est: 10m2 per liter per coat
          const liters = (area * coats) / 10;
          if (area > 0) {
              res = { liters: Math.ceil(liters), cans18: Math.ceil(liters/18), cans3: Math.ceil(liters/3.6) };
          }
      }
      setResult(res);
  }

  const CONTRACT_MODELS = {
      EMPREITA: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS (EMPREITADA)

Pelo presente instrumento particular, de um lado [NOME DO CONTRATANTE], inscrito no CPF sob nº [CPF], denominado CONTRATANTE, e de outro lado [NOME DO PROFISSIONAL], inscrito no CPF sob nº [CPF], denominado CONTRATADO.

1. DO OBJETO
O CONTRATADO obriga-se a realizar a execução dos serviços de [DESCREVER O SERVIÇO, EX: REFORMA DO BANHEIRO], no endereço [ENDEREÇO DA OBRA].

2. DO PRAZO
Os serviços terão início em [DATA INÍCIO] e previsão de término em [DATA FIM].

3. DO PREÇO E FORMA DE PAGAMENTO
Pela execução dos serviços, o CONTRATANTE pagará ao CONTRATADO o valor total de R$ [VALOR TOTAL], a ser pago da seguinte forma:
- [EX: 30% na entrada]
- [EX: 30% na metade da obra]
- [EX: 40% na entrega final]

4. DAS OBRIGAÇÕES
Caberá ao CONTRATANTE fornecer os materiais necessários.
Caberá ao CONTRATADO executar os serviços com zelo e técnica adequada, respeitando as normas de segurança.

Local e Data: ______________________, ___/___/___

___________________________      ___________________________
Assinatura Contratante            Assinatura Contratado`,
      DIARIA: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS (DIÁRIA)

Pelo presente instrumento, acordam as partes:

CONTRATANTE: [NOME DO CONTRATANTE], CPF [CPF].
CONTRATADO: [NOME DO PROFISSIONAL], CPF [CPF].

1. OBJETO
Prestação de serviços de [TIPO DE SERVIÇO: EX: PINTURA/ALVENARIA] no regime de diárias.

2. DO VALOR
O valor acordado por dia de trabalho (diária) é de R$ [VALOR DA DIÁRIA].
O pagamento será realizado [EX: SEMANALMENTE ÀS SEXTAS-FEIRAS].

3. DA JORNADA
O horário de trabalho será das [HORÁRIO INÍCIO] às [HORÁRIO FIM], com [TEMPO] de intervalo para almoço.

4. ALIMENTAÇÃO E TRANSPORTE
Fica acordado que a alimentação e o transporte [SERÃO/NÃO SERÃO] fornecidos pelo CONTRATANTE.

Local e Data: ______________________, ___/___/___

___________________________      ___________________________
Assinatura Contratante            Assinatura Contratado`,
      RECIBO: `RECIBO DE PAGAMENTO

Valor: R$ [VALOR PAGO]

Recebi de [NOME DO CONTRATANTE] a importância supra de [VALOR POR EXTENSO], referente aos serviços de [DESCRIÇÃO DO SERVIÇO] prestados no período de [DATA INICIAL] a [DATA FINAL].

Por ser verdade, firmo o presente recibo dando plena e geral quitação.

Local e Data: ______________________, ___/___/___

___________________________
[NOME DO PROFISSIONAL]
CPF: [CPF]`
  };

  const handleCopyContract = () => {
      const text = CONTRACT_MODELS[contractType];
      navigator.clipboard.writeText(text);
      alert("Texto copiado para a área de transferência!");
  };

  const RENOVATION_CHECKLIST = [
      { category: 'Planejamento', items: ['Definir orçamento limite', 'Contratar arquiteto/engenheiro', 'Aprovar projeto na prefeitura', 'Definir cronograma', 'Cotar mão de obra'] },
      { category: 'Preliminares', items: ['Ligação provisória de água/luz', 'Alugar caçamba', 'Comprar EPIs', 'Proteger áreas que não serão reformadas'] },
      { category: 'Demolição', items: ['Retirar louças e metais', 'Demolir alvenarias', 'Retirar pisos e revestimentos', 'Retirar entulho'] },
      { category: 'Infraestrutura', items: ['Passar tubulação de elétrica', 'Passar tubulação hidráulica', 'Impermeabilização de áreas molhadas', 'Contrapiso'] },
      { category: 'Acabamentos', items: ['Reboco / Gesso liso', 'Forro de gesso', 'Assentamento de pisos', 'Instalação de rodapés', 'Pintura (1ª demão)'] },
      { category: 'Finalização', items: ['Instalação de luminárias', 'Instalação de louças e metais', 'Pintura final', 'Limpeza pós-obra'] }
  ];

  return (
    <div className="space-y-6">
        {/* Toggle Subtabs */}
        <div className="flex bg-surface dark:bg-slate-800 p-1 rounded-xl w-full md:w-fit overflow-x-auto">
            <button 
                onClick={() => setSubTab('CALC')}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${subTab === 'CALC' ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm' : 'text-text-muted dark:text-slate-400'}`}
            >
                Calculadoras
            </button>
            <button 
                onClick={() => setSubTab('CHECK')}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${subTab === 'CHECK' ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm' : 'text-text-muted dark:text-slate-400'}`}
            >
                Checklist
            </button>
            <button 
                onClick={() => setSubTab('CONTRACT')}
                className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${subTab === 'CONTRACT' ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm' : 'text-text-muted dark:text-slate-400'}`}
            >
                Contratos
            </button>
        </div>

        {subTab === 'CALC' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Menu Calculadoras */}
                <div className="md:col-span-1 space-y-2">
                    <button onClick={() => { setCalcType('FLOOR'); setResult(null); setInputs({}); }} className={`w-full p-4 rounded-xl text-left font-bold border transition-all ${calcType === 'FLOOR' ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-text-muted dark:text-slate-400'}`}>
                        <i className="fa-solid fa-border-all mr-2"></i> Pisos e Revestimentos
                    </button>
                    <button onClick={() => { setCalcType('BRICK'); setResult(null); setInputs({}); }} className={`w-full p-4 rounded-xl text-left font-bold border transition-all ${calcType === 'BRICK' ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-text-muted dark:text-slate-400'}`}>
                        <i className="fa-solid fa-cubes-stacked mr-2"></i> Tijolos e Blocos
                    </button>
                    <button onClick={() => { setCalcType('PAINT'); setResult(null); setInputs({}); }} className={`w-full p-4 rounded-xl text-left font-bold border transition-all ${calcType === 'PAINT' ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-text-muted dark:text-slate-400'}`}>
                        <i className="fa-solid fa-paintbrush mr-2"></i> Pintura
                    </button>
                </div>

                {/* Área de Cálculo */}
                <div className="md:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    {calcType === 'FLOOR' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-text-main dark:text-white mb-4">Calculadora de Pisos</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-text-muted dark:text-slate-500 font-bold uppercase">Área (m²)</label>
                                    <input type="number" className="w-full p-2 border rounded-lg bg-surface dark:bg-slate-800 dark:border-slate-700 dark:text-white" value={inputs.area || ''} onChange={e => setInputs({...inputs, area: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs text-text-muted dark:text-slate-500 font-bold uppercase">Margem de Perda (%)</label>
                                    <input type="number" className="w-full p-2 border rounded-lg bg-surface dark:bg-slate-800 dark:border-slate-700 dark:text-white" value={inputs.margin || '10'} onChange={e => setInputs({...inputs, margin: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs text-text-muted dark:text-slate-500 font-bold uppercase">Largura Peça (cm)</label>
                                    <input type="number" className="w-full p-2 border rounded-lg bg-surface dark:bg-slate-800 dark:border-slate-700 dark:text-white" value={inputs.width || ''} onChange={e => setInputs({...inputs, width: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs text-text-muted dark:text-slate-500 font-bold uppercase">Comp. Peça (cm)</label>
                                    <input type="number" className="w-full p-2 border rounded-lg bg-surface dark:bg-slate-800 dark:border-slate-700 dark:text-white" value={inputs.length || ''} onChange={e => setInputs({...inputs, length: e.target.value})} />
                                </div>
                            </div>
                            <button onClick={calculate} className="w-full bg-success text-white font-bold py-3 rounded-xl hover:bg-success-dark transition-colors">Calcular</button>
                            
                            {result && (
                                <div className="mt-4 p-4 bg-success-light/20 rounded-xl border border-success/30 text-center">
                                    <p className="text-sm text-text-muted dark:text-slate-400">Você precisará de aproximadamente:</p>
                                    <p className="text-3xl font-bold text-success dark:text-success-light my-2">{result.pieces} peças</p>
                                    <p className="text-xs text-text-muted dark:text-slate-500">Cobrindo uma área real de {result.totalArea} m² (já com margem)</p>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {calcType === 'BRICK' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-text-main dark:text-white mb-4">Calculadora de Tijolos</h3>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="text-xs text-text-muted dark:text-slate-500 font-bold uppercase">Área de Parede (m²)</label>
                                    <input type="number" className="w-full p-2 border rounded-lg bg-surface dark:bg-slate-800 dark:border-slate-700 dark:text-white" value={inputs.wallArea || ''} onChange={e => setInputs({...inputs, wallArea: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs text-text-muted dark:text-slate-500 font-bold uppercase">Tipo de Tijolo</label>
                                    <select className="w-full p-2 border rounded-lg bg-surface dark:bg-slate-800 dark:border-slate-700 dark:text-white" value={inputs.brickType || '6HOLE'} onChange={e => setInputs({...inputs, brickType: e.target.value})}>
                                        <option value="6HOLE">Tijolo Baiano (6 furos)</option>
                                        <option value="BLOCK">Bloco de Concreto Estrutural</option>
                                    </select>
                                </div>
                            </div>
                            <button onClick={calculate} className="w-full bg-success text-white font-bold py-3 rounded-xl hover:bg-success-dark transition-colors">Calcular</button>
                            
                            {result && (
                                <div className="mt-4 p-4 bg-success-light/20 rounded-xl border border-success/30 text-center">
                                    <p className="text-sm text-text-muted dark:text-slate-400">Estimativa com 10% de perda:</p>
                                    <p className="text-3xl font-bold text-success dark:text-success-light my-2">{result.total} unidades</p>
                                </div>
                            )}
                        </div>
                    )}

                    {calcType === 'PAINT' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-text-main dark:text-white mb-4">Calculadora de Pintura</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-text-muted dark:text-slate-500 font-bold uppercase">Área de Parede (m²)</label>
                                    <input type="number" className="w-full p-2 border rounded-lg bg-surface dark:bg-slate-800 dark:border-slate-700 dark:text-white" value={inputs.paintArea || ''} onChange={e => setInputs({...inputs, paintArea: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-xs text-text-muted dark:text-slate-500 font-bold uppercase">Demãos</label>
                                    <input type="number" className="w-full p-2 border rounded-lg bg-surface dark:bg-slate-800 dark:border-slate-700 dark:text-white" value={inputs.coats || '2'} onChange={e => setInputs({...inputs, coats: e.target.value})} />
                                </div>
                            </div>
                            <button onClick={calculate} className="w-full bg-success text-white font-bold py-3 rounded-xl hover:bg-success-dark transition-colors">Calcular</button>
                            
                            {result && (
                                <div className="mt-4 p-4 bg-success-light/20 rounded-xl border border-success/30 text-center">
                                    <p className="text-sm text-text-muted dark:text-slate-400">Total de Tinta Estimado:</p>
                                    <p className="text-3xl font-bold text-success dark:text-success-light my-2">{result.liters} Litros</p>
                                    <div className="text-xs text-text-muted dark:text-slate-500 flex justify-center gap-4 mt-2">
                                        <span>~{result.cans18} latas de 18L</span>
                                        <span>ou</span>
                                        <span>~{result.cans3} galões de 3.6L</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        )}

        {subTab === 'CHECK' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {RENOVATION_CHECKLIST.map((group, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                        <h4 className="font-bold text-primary dark:text-white mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">{group.category}</h4>
                        <div className="space-y-3">
                            {group.items.map((item, i) => (
                                <label key={i} className="flex items-start gap-3 cursor-pointer group">
                                    <div className="relative flex items-center">
                                        <input 
                                            type="checkbox" 
                                            className="peer sr-only"
                                            checked={!!checklist[item]}
                                            onChange={() => toggleItem(item)}
                                        />
                                        <div className="w-5 h-5 border-2 border-slate-300 dark:border-slate-600 rounded flex items-center justify-center peer-checked:bg-success peer-checked:border-success transition-all">
                                            <i className="fa-solid fa-check text-white text-xs opacity-0 peer-checked:opacity-100"></i>
                                        </div>
                                    </div>
                                    <span className={`text-sm transition-all ${checklist[item] ? 'text-text-muted dark:text-slate-600 line-through' : 'text-text-body dark:text-slate-300'}`}>
                                        {item}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        )}

        {subTab === 'CONTRACT' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {/* Menu Contratos */}
                 <div className="md:col-span-1 space-y-2">
                    <button onClick={() => setContractType('EMPREITA')} className={`w-full p-4 rounded-xl text-left font-bold border transition-all ${contractType === 'EMPREITA' ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-text-muted dark:text-slate-400'}`}>
                        <i className="fa-solid fa-file-contract mr-2"></i> Contrato por Empreitada
                    </button>
                    <button onClick={() => setContractType('DIARIA')} className={`w-full p-4 rounded-xl text-left font-bold border transition-all ${contractType === 'DIARIA' ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-text-muted dark:text-slate-400'}`}>
                        <i className="fa-solid fa-calendar-day mr-2"></i> Contrato por Diária
                    </button>
                    <button onClick={() => setContractType('RECIBO')} className={`w-full p-4 rounded-xl text-left font-bold border transition-all ${contractType === 'RECIBO' ? 'bg-primary text-white border-primary' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-text-muted dark:text-slate-400'}`}>
                        <i className="fa-solid fa-money-check-dollar mr-2"></i> Recibo de Pagamento
                    </button>
                </div>

                {/* Visualização e Ações */}
                <div className="md:col-span-2 space-y-4">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-text-main dark:text-white">Modelo de Documento</h3>
                            <span className="text-xs bg-warning-light text-warning-dark px-2 py-1 rounded">Apenas sugestão</span>
                        </div>
                        <textarea 
                            className="w-full h-[400px] p-4 bg-surface dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono text-text-body dark:text-slate-300 focus:outline-none resize-none"
                            readOnly
                            value={CONTRACT_MODELS[contractType]}
                        ></textarea>
                        
                        <div className="flex gap-4 mt-4">
                            <button 
                                onClick={handleCopyContract}
                                className="flex-1 bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                            >
                                <i className="fa-regular fa-copy"></i> Copiar Texto
                            </button>
                            {/* Dica para preenchimento */}
                            <div className="flex-1 flex items-center justify-center text-xs text-text-muted dark:text-slate-500 text-center px-2">
                                Copie e cole no WhatsApp ou Word para preencher os dados.
                            </div>
                        </div>
                    </div>
                    
                    <p className="text-xs text-text-muted dark:text-slate-500 italic text-center">
                        * Aviso Legal: Estes modelos são sugestões básicas. Para contratos complexos, consulte um advogado.
                    </p>
                </div>
            </div>
        )}
    </div>
  );
};

// --- Main Page Component ---

const WorkDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [work, setWork] = useState<Work | undefined>();
  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState({ totalSpent: 0, progress: 0, delayedSteps: 0 });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const loadWork = () => {
    if (id) {
        const w = dbService.getWorkById(id);
        if (w) {
          setWork(w);
          setStats(dbService.calculateWorkStats(id));
        } else {
          navigate('/');
        }
      }
  }

  useEffect(() => {
    loadWork();
  }, [id, navigate, activeTab]); 

  if (!work) return null;

  const tabs = [
    { name: 'Visão Geral', icon: 'fa-chart-pie' },
    { name: 'Etapas', icon: 'fa-list-check' },
    { name: 'Despesas', icon: 'fa-receipt' },
    { name: 'Materiais', icon: 'fa-box-open' },
    { name: 'Relatórios', icon: 'fa-file-pdf' }, // Reports moved here
    { name: 'Fotos', icon: 'fa-camera' },
    { name: 'Bônus', icon: 'fa-star' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 print:p-0 print:max-w-none print:block">
      
      {/* Print Header (Visible only when printing) */}
      <div className="hidden print:block mb-8 border-b pb-4">
          <h1 className="text-3xl font-bold mb-2">MÃOS DA OBRA</h1>
          <h2 className="text-2xl font-bold">{work.name}</h2>
          <p>{work.address}</p>
          <p className="text-sm text-gray-500">Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
      </div>

      {/* Header (Hidden when printing) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center transition-colors print:hidden">
        <div>
           <div className="flex items-center gap-3 mb-1">
             <button onClick={() => navigate('/')} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface dark:hover:bg-slate-800 text-text-muted hover:text-primary transition-colors">
               <i className="fa-solid fa-arrow-left"></i>
             </button>
             <h1 className="text-2xl font-bold text-text-main dark:text-white">{work.name}</h1>
           </div>
           <p className="text-text-muted dark:text-slate-400 text-sm ml-11 flex items-center">
             <i className="fa-solid fa-location-dot mr-1.5 opacity-70"></i> {work.address}
           </p>
        </div>
        <div className="mt-6 md:mt-0 flex gap-8 text-right bg-surface dark:bg-slate-800 px-6 py-3 rounded-xl border border-slate-100 dark:border-slate-700">
           <div>
              <p className="text-[10px] text-text-muted dark:text-slate-400 uppercase font-bold tracking-wider mb-0.5">Orçamento</p>
              <p className="font-bold text-text-main dark:text-white text-lg">R$ {work.budgetPlanned.toLocaleString('pt-BR')}</p>
           </div>
           <div>
              <p className="text-[10px] text-text-muted dark:text-slate-400 uppercase font-bold tracking-wider mb-0.5">Status</p>
              <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-bold ${work.status === WorkStatus.IN_PROGRESS ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'}`}>
                  {work.status}
              </span>
           </div>
        </div>
      </div>

      {/* Tab Nav - Responsive Approach (Hidden when printing) */}
      
      {/* 1. Mobile Dropdown */}
      <div className="md:hidden relative z-20 print:hidden">
         <button 
           onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
           className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center justify-between shadow-sm"
         >
            <div className="flex items-center gap-3 font-bold text-text-main dark:text-white">
               <i className={`fa-solid ${tabs[activeTab].icon} text-primary dark:text-primary-light`}></i>
               {tabs[activeTab].name}
            </div>
            <i className={`fa-solid fa-chevron-down transition-transform ${isMobileMenuOpen ? 'rotate-180' : ''}`}></i>
         </button>
         
         {isMobileMenuOpen && (
             <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                 {tabs.map((tab, idx) => (
                     <button
                       key={idx}
                       onClick={() => { setActiveTab(idx); setIsMobileMenuOpen(false); }}
                       className={`w-full flex items-center gap-3 p-4 border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${activeTab === idx ? 'bg-primary/5 text-primary font-bold dark:text-white' : 'text-text-muted dark:text-slate-400'}`}
                     >
                         <i className={`fa-solid ${tab.icon} w-6 text-center`}></i>
                         {tab.name}
                     </button>
                 ))}
             </div>
         )}
      </div>

      {/* 2. Desktop Pills */}
      <div className="hidden md:flex overflow-x-auto pb-1 gap-2 hide-scrollbar print:hidden">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            className={`flex items-center whitespace-nowrap px-5 py-3 rounded-full text-sm font-bold transition-all ${
              activeTab === idx 
                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                : 'bg-white dark:bg-slate-900 text-text-muted dark:text-slate-400 hover:bg-surface dark:hover:bg-slate-800 hover:text-text-main dark:hover:text-white border border-transparent hover:border-slate-200 dark:hover:border-slate-700'
            }`}
          >
            <i className={`fa-solid ${tab.icon} mr-2.5 ${activeTab === idx ? 'text-white' : 'opacity-70'}`}></i>
            {tab.name}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px] print:min-h-0">
        {/* Passamos onGoToSteps para o OverviewTab, mudando para a aba 1 (Etapas) */}
        {activeTab === 0 && <OverviewTab work={work} stats={stats} onGoToSteps={() => setActiveTab(1)} />}
        {activeTab === 1 && <StepsTab workId={work.id} refreshWork={loadWork} />}
        {activeTab === 2 && <ExpensesTab workId={work.id} onUpdate={() => setStats(dbService.calculateWorkStats(work.id))} />}
        {activeTab === 3 && <MaterialsTab workId={work.id} onUpdate={() => setStats(dbService.calculateWorkStats(work.id))} />}
        {activeTab === 4 && <ReportsTab work={work} stats={stats} />}
        {activeTab === 5 && <PhotosTab workId={work.id} />}
        {activeTab === 6 && <BonusTab workId={work.id} />}
      </div>
    </div>
  );
};

export default WorkDetail;