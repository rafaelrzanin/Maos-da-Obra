

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dbService } from '../services/db';
import { Work, Step, Expense, Material, WorkPhoto, StepStatus, ExpenseCategory, WorkStatus, FileCategory, WorkFile, Collaborator, Supplier, CollaboratorRole, SupplierCategory } from '../types';
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
      date: '',
      stepId: '' // NEW: Selected Step
  });
  
  // Steps for linking
  const [steps, setSteps] = useState<Step[]>([]);

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
  
  useEffect(() => {
    loadExpenses();
    setSteps(dbService.getSteps(workId));
  }, [workId]);

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
      paidAmount: newExp.paidAmount ? Number(newExp.paidAmount) : 0, 
      quantity: newExp.quantity ? Number(newExp.quantity) : 1,
      category: newExp.category,
      date: newExp.date || new Date().toISOString().split('T')[0],
      stepId: newExp.stepId || undefined
    });
    
    setNewExp({ description: '', amount: '', paidAmount: '', quantity: '', category: ExpenseCategory.MATERIAL, date: '', stepId: '' });
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
      const paid = exp.paidAmount ?? 0;
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
          
          <div className="md:col-span-4 border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
              <label className="block text-xs font-bold text-text-muted dark:text-slate-500 mb-1 uppercase">Vincular a Etapa (Opcional)</label>
              <select 
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none" 
                value={newExp.stepId} 
                onChange={e => setNewExp({...newExp, stepId: e.target.value})}
              >
                <option value="">Geral / Obra Toda</option>
                {steps.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
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
            const stepName = steps.find(s => s.id === exp.stepId)?.name;

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
                        <div className="flex flex-col gap-1 mt-0.5">
                            <span className="text-xs text-text-muted dark:text-slate-500">
                                {new Date(exp.date).toLocaleDateString('pt-BR')}
                            </span>
                            {exp.quantity && exp.quantity > 1 && (
                                <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 rounded text-text-muted dark:text-slate-400 w-fit">
                                    x{exp.quantity}
                                </span>
                            )}
                        </div>
                    </div>
                    
                    {/* Etapa Vinculada */}
                    {stepName && (
                        <div className="mb-2">
                             <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-text-muted dark:text-slate-400 px-2 py-0.5 rounded flex items-center gap-1 w-fit max-w-full truncate">
                                 <i className="fa-solid fa-link text-[8px]"></i> {stepName}
                             </span>
                        </div>
                    )}

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
                      
                      <div>
                          <label className="block text-sm font-medium text-text-muted dark:text-slate-400 mb-1">Vincular a Etapa</label>
                          <select 
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-800 text-text-main dark:text-white focus:ring-2 focus:ring-primary outline-none" 
                            value={editData.stepId || ''} 
                            onChange={e => setEditData({...editData, stepId: e.target.value})}
                          >
                            <option value="">Geral / Obra Toda</option>
                            {steps.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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

const TeamTab: React.FC<{ workId: string }> = ({ workId }) => {
    const [subTab, setSubTab] = useState<'TEAM' | 'SUPPLIER'>('TEAM');
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [steps, setSteps] = useState<Step[]>([]); // To populate step dropdown
    const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, id: string | null, type: 'TEAM'|'SUPPLIER'|null}>({isOpen: false, id: null, type: null});

    // Forms
    const [newCollab, setNewCollab] = useState({ name: '', role: '', phone: '', costType: 'DIARIA', costValue: '', stepId: '' });
    const [newSupplier, setNewSupplier] = useState({ name: '', category: '', contactName: '', phone: '', email: '' });

    const loadData = () => {
        setCollaborators(dbService.getCollaborators(workId));
        setSuppliers(dbService.getSuppliers(workId));
        setSteps(dbService.getSteps(workId));
    }

    useEffect(loadData, [workId]);

    const handleAddCollaborator = (e: React.FormEvent) => {
        e.preventDefault();
        
        // 1. Add Collaborator
        dbService.addCollaborator({
            workId,
            name: newCollab.name,
            role: newCollab.role as CollaboratorRole,
            phone: newCollab.phone,
            costType: newCollab.costType as any,
            costValue: Number(newCollab.costValue),
            stepId: newCollab.stepId || undefined
        });

        // 2. Auto-Launch Expense if value > 0
        const costVal = Number(newCollab.costValue);
        if (costVal > 0) {
            dbService.addExpense({
                workId,
                description: `Mão de Obra - ${newCollab.name} (${newCollab.role})`,
                amount: costVal,
                paidAmount: 0, // Starts unpaid/pending usually for labor contracts
                quantity: 1,
                category: ExpenseCategory.LABOR,
                date: new Date().toISOString().split('T')[0],
                stepId: newCollab.stepId || undefined
            });
            alert("Colaborador salvo e despesa lançada automaticamente!");
        }

        setNewCollab({ name: '', role: '', phone: '', costType: 'DIARIA', costValue: '', stepId: '' });
        loadData();
    }

    const handleAddSupplier = (e: React.FormEvent) => {
        e.preventDefault();
        dbService.addSupplier({
            workId,
            name: newSupplier.name,
            category: newSupplier.category as SupplierCategory,
            contactName: newSupplier.contactName,
            phone: newSupplier.phone,
            email: newSupplier.email
        });
        setNewSupplier({ name: '', category: '', contactName: '', phone: '', email: '' });
        loadData();
    }

    const handleDelete = () => {
        if (confirmModal.id && confirmModal.type) {
            if (confirmModal.type === 'TEAM') dbService.deleteCollaborator(confirmModal.id);
            else dbService.deleteSupplier(confirmModal.id);
            
            setConfirmModal({isOpen: false, id: null, type: null});
            loadData();
        }
    }

    return (
        <div className="space-y-6">
             <div className="flex bg-surface dark:bg-slate-800 p-1 rounded-xl w-full md:w-fit">
                <button 
                    onClick={() => setSubTab('TEAM')}
                    className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${subTab === 'TEAM' ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm' : 'text-text-muted dark:text-slate-400'}`}
                >
                    Colaboradores
                </button>
                <button 
                    onClick={() => setSubTab('SUPPLIER')}
                    className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${subTab === 'SUPPLIER' ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-sm' : 'text-text-muted dark:text-slate-400'}`}
                >
                    Fornecedores
                </button>
            </div>

            {subTab === 'TEAM' && (
                <div className="space-y-6">
                    {/* ADD FORM */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <h3 className="font-bold text-text-main dark:text-white mb-4">Adicionar Colaborador</h3>
                        <form onSubmit={handleAddCollaborator} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <input 
                                placeholder="Nome Completo"
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-800 text-text-main dark:text-white text-sm focus:ring-2 focus:ring-primary outline-none"
                                value={newCollab.name}
                                onChange={e => setNewCollab({...newCollab, name: e.target.value})}
                                required
                            />
                             <select 
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-800 text-text-main dark:text-white text-sm focus:ring-2 focus:ring-primary outline-none"
                                value={newCollab.role}
                                onChange={e => setNewCollab({...newCollab, role: e.target.value})}
                                required
                            >
                                <option value="">Função</option>
                                {Object.values(CollaboratorRole).map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <input 
                                placeholder="Telefone / Zap"
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-800 text-text-main dark:text-white text-sm focus:ring-2 focus:ring-primary outline-none"
                                value={newCollab.phone}
                                onChange={e => setNewCollab({...newCollab, phone: e.target.value})}
                                required
                            />
                            
                            {/* LINHA 2 */}
                            <div className="flex gap-2">
                                <select 
                                    className="w-1/2 px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-800 text-text-main dark:text-white text-sm focus:ring-2 focus:ring-primary outline-none"
                                    value={newCollab.costType}
                                    onChange={e => setNewCollab({...newCollab, costType: e.target.value})}
                                >
                                    <option value="DIARIA">Diária</option>
                                    <option value="EMPREITA">Empreita</option>
                                    <option value="MENSAL">Mensal</option>
                                </select>
                                <input 
                                    type="number"
                                    placeholder="Valor (R$)"
                                    className="w-1/2 px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-800 text-text-main dark:text-white text-sm focus:ring-2 focus:ring-primary outline-none"
                                    value={newCollab.costValue}
                                    onChange={e => setNewCollab({...newCollab, costValue: e.target.value})}
                                    required
                                />
                            </div>

                            <select 
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-800 text-text-main dark:text-white text-sm focus:ring-2 focus:ring-primary outline-none"
                                value={newCollab.stepId}
                                onChange={e => setNewCollab({...newCollab, stepId: e.target.value})}
                            >
                                <option value="">Vincular Etapa (Opcional)</option>
                                {steps.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>

                            <button type="submit" className="bg-primary hover:bg-primary-dark text-white font-bold rounded-xl py-2 shadow-md">
                                Adicionar & Lançar Custo
                            </button>
                        </form>
                    </div>

                    {/* LIST */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {collaborators.map(collab => {
                            const stepName = steps.find(s => s.id === collab.stepId)?.name;
                            return (
                                <div key={collab.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm relative group hover:shadow-md transition-all">
                                    <button 
                                        onClick={() => setConfirmModal({isOpen: true, id: collab.id, type: 'TEAM'})}
                                        className="absolute top-4 right-4 text-slate-300 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <i className="fa-solid fa-trash"></i>
                                    </button>
                                    
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                                            {collab.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-text-main dark:text-white">{collab.name}</h4>
                                            <span className="text-xs bg-surface dark:bg-slate-800 text-text-muted dark:text-slate-400 px-2 py-0.5 rounded">{collab.role}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-sm text-text-body dark:text-slate-300">
                                        <p className="flex items-center gap-2">
                                            <i className="fa-solid fa-phone text-slate-400 text-xs"></i> 
                                            {collab.phone}
                                        </p>
                                        <p className="flex items-center gap-2">
                                            <i className="fa-solid fa-money-bill text-success text-xs"></i> 
                                            R$ {collab.costValue.toLocaleString()} / {collab.costType.toLowerCase()}
                                        </p>
                                        {stepName && (
                                            <p className="flex items-center gap-2 text-xs text-text-muted dark:text-slate-500">
                                                <i className="fa-solid fa-link text-slate-400 text-[10px]"></i> 
                                                {stepName}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-2 mt-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                                        <a href={`tel:${collab.phone}`} className="flex-1 bg-surface hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-text-main dark:text-white text-xs font-bold py-2 rounded-lg text-center transition-colors">
                                            Ligar
                                        </a>
                                        <a href={`https://wa.me/55${collab.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-2 rounded-lg text-center transition-colors">
                                            WhatsApp
                                        </a>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {subTab === 'SUPPLIER' && (
                <div className="space-y-6">
                    {/* ADD FORM */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <h3 className="font-bold text-text-main dark:text-white mb-4">Adicionar Fornecedor</h3>
                        <form onSubmit={handleAddSupplier} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <input 
                                placeholder="Nome da Loja/Empresa"
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-800 text-text-main dark:text-white text-sm focus:ring-2 focus:ring-primary outline-none"
                                value={newSupplier.name}
                                onChange={e => setNewSupplier({...newSupplier, name: e.target.value})}
                                required
                            />
                             <select 
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-800 text-text-main dark:text-white text-sm focus:ring-2 focus:ring-primary outline-none"
                                value={newSupplier.category}
                                onChange={e => setNewSupplier({...newSupplier, category: e.target.value})}
                                required
                            >
                                <option value="">Categoria</option>
                                {Object.values(SupplierCategory).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <input 
                                placeholder="Nome do Contato"
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-800 text-text-main dark:text-white text-sm focus:ring-2 focus:ring-primary outline-none"
                                value={newSupplier.contactName}
                                onChange={e => setNewSupplier({...newSupplier, contactName: e.target.value})}
                                required
                            />
                            <input 
                                placeholder="Telefone / Zap"
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-800 text-text-main dark:text-white text-sm focus:ring-2 focus:ring-primary outline-none"
                                value={newSupplier.phone}
                                onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})}
                                required
                            />
                            <button type="submit" className="bg-primary hover:bg-primary-dark text-white font-bold rounded-xl py-2">
                                Adicionar
                            </button>
                        </form>
                    </div>

                    {/* LIST */}
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {suppliers.map(sup => (
                            <div key={sup.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm relative group hover:shadow-md transition-all">
                                 <button 
                                    onClick={() => setConfirmModal({isOpen: true, id: sup.id, type: 'SUPPLIER'})}
                                    className="absolute top-4 right-4 text-slate-300 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <i className="fa-solid fa-trash"></i>
                                </button>
                                
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-warning/10 text-warning flex items-center justify-center font-bold">
                                        <i className="fa-solid fa-store"></i>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-text-main dark:text-white truncate max-w-[150px]">{sup.name}</h4>
                                        <span className="text-xs bg-surface dark:bg-slate-800 text-text-muted dark:text-slate-400 px-2 py-0.5 rounded">{sup.category}</span>
                                    </div>
                                </div>
                                <div className="space-y-2 text-sm text-text-body dark:text-slate-300">
                                    <p className="flex items-center gap-2">
                                        <i className="fa-regular fa-user text-slate-400 text-xs"></i> 
                                        {sup.contactName}
                                    </p>
                                    <p className="flex items-center gap-2">
                                        <i className="fa-solid fa-phone text-slate-400 text-xs"></i> 
                                        {sup.phone}
                                    </p>
                                </div>
                                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-50 dark:border-slate-800">
                                    <a href={`tel:${sup.phone}`} className="flex-1 bg-surface hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-text-main dark:text-white text-xs font-bold py-2 rounded-lg text-center transition-colors">
                                        Ligar
                                    </a>
                                    <a href={`https://wa.me/55${sup.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-2 rounded-lg text-center transition-colors">
                                        WhatsApp
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <ConfirmModal 
                isOpen={confirmModal.isOpen}
                title={`Excluir ${confirmModal.type === 'TEAM' ? 'Colaborador' : 'Fornecedor'}`}
                message="Tem certeza que deseja excluir? Essa ação não pode ser desfeita."
                onConfirm={handleDelete}
                onCancel={() => setConfirmModal({isOpen: false, id: null, type: null})}
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

const MaterialsTab: React.FC<{ workId: string, onUpdate: () => void }> = ({ workId, onUpdate }) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [newMat, setNewMat] = useState({ name: '', plannedQty: '', purchasedQty: '0', unit: 'un' });

  useEffect(() => {
    setMaterials(dbService.getMaterials(workId));
  }, [workId]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    dbService.addMaterial({
      workId,
      name: newMat.name,
      plannedQty: Number(newMat.plannedQty),
      purchasedQty: Number(newMat.purchasedQty),
      unit: newMat.unit
    });
    setNewMat({ name: '', plannedQty: '', purchasedQty: '0', unit: 'un' });
    setMaterials(dbService.getMaterials(workId));
    onUpdate();
  };
  
  const handleDelete = (id: string) => {
      if(window.confirm('Excluir material?')) {
          dbService.deleteMaterial(id);
          setMaterials(dbService.getMaterials(workId));
          onUpdate();
      }
  };

  const handleUpdateQty = (m: Material, qty: number) => {
      dbService.updateMaterial({...m, purchasedQty: qty});
      setMaterials(dbService.getMaterials(workId));
      onUpdate();
  }

  return (
    <div className="space-y-6">
       <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
         <h3 className="font-bold text-text-main dark:text-white mb-4">Adicionar Material</h3>
         <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <input className="md:col-span-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-800 text-text-main dark:text-white outline-none focus:ring-2 focus:ring-primary" placeholder="Nome do Material (Ex: Cimento)" value={newMat.name} onChange={e => setNewMat({...newMat, name: e.target.value})} required />
             <input type="number" className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-800 text-text-main dark:text-white outline-none focus:ring-2 focus:ring-primary" placeholder="Qtd Planejada" value={newMat.plannedQty} onChange={e => setNewMat({...newMat, plannedQty: e.target.value})} required />
             <div className="flex gap-2">
                 <input className="w-2/3 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-surface dark:bg-slate-800 text-text-main dark:text-white outline-none focus:ring-2 focus:ring-primary" placeholder="Unidade" value={newMat.unit} onChange={e => setNewMat({...newMat, unit: e.target.value})} required />
                 <button type="submit" className="w-1/3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors"><i className="fa-solid fa-plus"></i></button>
             </div>
         </form>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {materials.map(m => {
               const status = m.purchasedQty >= m.plannedQty ? 'OK' : 'FALTANDO';
               const progress = Math.min((m.purchasedQty / m.plannedQty) * 100, 100);
               return (
                   <div key={m.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative group">
                        <button onClick={() => handleDelete(m.id)} className="absolute top-4 right-4 text-slate-300 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"><i className="fa-solid fa-trash"></i></button>
                        <h4 className="font-bold text-text-main dark:text-white mb-1">{m.name}</h4>
                        <div className="flex justify-between text-sm text-text-muted dark:text-slate-400 mb-2">
                            <span>Planejado: {m.plannedQty} {m.unit}</span>
                            <span className={status === 'OK' ? 'text-success font-bold' : 'text-warning font-bold'}>{status}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mb-3">
                            <div className={`h-2 rounded-full ${status === 'OK' ? 'bg-success' : 'bg-warning'}`} style={{width: `${progress}%`}}></div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleUpdateQty(m, Math.max(0, m.purchasedQty - 1))} className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-text-main dark:text-white">-</button>
                            <span className="flex-1 text-center font-bold text-text-main dark:text-white">{m.purchasedQty} {m.unit} comprados</span>
                            <button onClick={() => handleUpdateQty(m, m.purchasedQty + 1)} className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-text-main dark:text-white">+</button>
                        </div>
                   </div>
               )
           })}
       </div>
    </div>
  );
};

const FilesTab: React.FC<{ workId: string }> = ({ workId }) => {
    const [files, setFiles] = useState<WorkFile[]>([]);
    const [uploading, setUploading] = useState(false);
    
    useEffect(() => setFiles(dbService.getFiles(workId)), [workId]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const reader = new FileReader();
        reader.onloadend = () => {
            dbService.addFile({
                workId,
                name: file.name,
                category: FileCategory.GENERAL,
                type: file.type,
                url: reader.result as string,
                date: new Date().toISOString()
            });
            setFiles(dbService.getFiles(workId));
            setUploading(false);
        };
        reader.readAsDataURL(file);
    };

    const handleDelete = (id: string) => {
        if(window.confirm('Excluir arquivo?')) {
            dbService.deleteFile(id);
            setFiles(dbService.getFiles(workId));
        }
    };
    
    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm text-center">
                <input type="file" id="fileUpload" className="hidden" onChange={handleFileUpload} />
                <label htmlFor="fileUpload" className={`cursor-pointer inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-dark transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    {uploading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-cloud-arrow-up"></i>}
                    {uploading ? 'Enviando...' : 'Adicionar Arquivo'}
                </label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {files.map(f => (
                    <div key={f.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 relative group">
                        <button onClick={() => handleDelete(f.id)} className="absolute top-2 right-2 text-slate-300 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"><i className="fa-solid fa-trash"></i></button>
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-2xl text-slate-400">
                            <i className={`fa-solid ${f.type.includes('image') ? 'fa-image' : f.type.includes('pdf') ? 'fa-file-pdf' : 'fa-file'}`}></i>
                        </div>
                        <div className="overflow-hidden">
                             <a href={f.url} download={f.name} className="font-bold text-text-main dark:text-white truncate block hover:underline" target="_blank" rel="noreferrer">{f.name}</a>
                             <p className="text-xs text-text-muted dark:text-slate-500">{new Date(f.date).toLocaleDateString()}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const PhotosTab: React.FC<{ workId: string }> = ({ workId }) => {
    const [photos, setPhotos] = useState<WorkPhoto[]>([]);
    const [uploading, setUploading] = useState(false);
    
    useEffect(() => setPhotos(dbService.getPhotos(workId)), [workId]);

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const reader = new FileReader();
        reader.onloadend = () => {
            dbService.addPhoto({
                workId,
                url: reader.result as string,
                description: 'Foto da Obra',
                date: new Date().toISOString(),
                type: 'PROGRESS'
            });
            setPhotos(dbService.getPhotos(workId));
            setUploading(false);
        };
        reader.readAsDataURL(file);
    };

    const handleDelete = (id: string) => {
        if(window.confirm('Excluir foto?')) {
            dbService.deletePhoto(id);
            setPhotos(dbService.getPhotos(workId));
        }
    };

    return (
        <div className="space-y-6">
             <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm text-center">
                <input type="file" id="photoUpload" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                <label htmlFor="photoUpload" className={`cursor-pointer inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-dark transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    {uploading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-camera"></i>}
                    {uploading ? 'Enviando...' : 'Adicionar Foto'}
                </label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map(p => (
                    <div key={p.id} className="relative group aspect-square bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                        <img src={p.url} alt="Obra" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <a href={p.url} download={`foto-${p.date}.png`} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-800 hover:text-primary"><i className="fa-solid fa-download"></i></a>
                            <button onClick={() => handleDelete(p.id)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-800 hover:text-danger"><i className="fa-solid fa-trash"></i></button>
                        </div>
                        <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/80 to-transparent text-white text-xs">
                            {new Date(p.date).toLocaleDateString()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ReportsTab: React.FC<{ work: Work, stats: any }> = ({ work, stats }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => window.print()}>
                <div className="w-14 h-14 bg-primary/10 text-primary rounded-xl flex items-center justify-center text-2xl mb-4">
                    <i className="fa-solid fa-print"></i>
                </div>
                <h3 className="font-bold text-text-main dark:text-white text-lg mb-2">Relatório Geral</h3>
                <p className="text-sm text-text-muted dark:text-slate-400">Imprimir ou salvar PDF com o resumo completo da obra, cronograma e custos.</p>
            </div>
             <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer opacity-50">
                <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl flex items-center justify-center text-2xl mb-4">
                    <i className="fa-solid fa-chart-line"></i>
                </div>
                <h3 className="font-bold text-text-main dark:text-white text-lg mb-2">Relatório de Custos</h3>
                <p className="text-sm text-text-muted dark:text-slate-400">Detalhamento financeiro por categoria e período. (Em breve)</p>
            </div>
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
    { name: 'Relatórios', icon: 'fa-file-pdf' },
    { name: 'Projetos e Arquivos', icon: 'fa-folder-open' },
    { name: 'Equipe e Fornecedores', icon: 'fa-users' }, // Nova aba adicionada
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
        {activeTab === 5 && <FilesTab workId={work.id} />}
        {activeTab === 6 && <TeamTab workId={work.id} />} 
        {activeTab === 7 && <PhotosTab workId={work.id} />}
        {activeTab === 8 && <BonusTab workId={work.id} />}
      </div>
    </div>
  );
};

export default WorkDetail;
