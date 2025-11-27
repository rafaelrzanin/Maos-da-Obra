
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { dbService } from '../services/db';
import { Work, WorkStatus, RiskLevel, Expense, Step } from '../types';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dashboard Metrics
  const [totalDelayedSteps, setTotalDelayedSteps] = useState(0);
  const [expensesLast7Days, setExpensesLast7Days] = useState(0);
  const [totalMissingMaterials, setTotalMissingMaterials] = useState(0);
  const [overallRisk, setOverallRisk] = useState<RiskLevel>(RiskLevel.LOW);

  useEffect(() => {
    if (user) {
      const data = dbService.getWorks(user.id);
      setWorks(data);

      // Aggregate Data
      let delayedCount = 0;
      let missingCount = 0;
      let expenseSum = 0;
      let highestRisk = RiskLevel.LOW;

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      data.forEach(work => {
        // Stats for this work
        const stats = dbService.calculateWorkStats(work.id);
        const risk = calculateRisk(work, stats);
        
        delayedCount += stats.delayedSteps;
        
        // Update highest risk found
        if (risk === RiskLevel.HIGH) highestRisk = RiskLevel.HIGH;
        else if (risk === RiskLevel.MEDIUM && highestRisk !== RiskLevel.HIGH) highestRisk = RiskLevel.MEDIUM;

        // Missing materials
        const materials = dbService.getMaterials(work.id);
        const missing = materials.filter(m => m.purchasedQty < m.plannedQty).length;
        missingCount += missing;

        // Expenses 7d
        const expenses = dbService.getExpenses(work.id);
        expenses.forEach(e => {
            const eDate = new Date(e.date);
            if (eDate >= oneWeekAgo) {
                expenseSum += e.amount;
            }
        });
      });

      setTotalDelayedSteps(delayedCount);
      setTotalMissingMaterials(missingCount);
      setExpensesLast7Days(expenseSum);
      setOverallRisk(highestRisk);
      
      setLoading(false);
    }
  }, [user]);

  const calculateRisk = (work: Work, stats: any): RiskLevel => {
    const budgetUsage = work.budgetPlanned > 0 ? (stats.totalSpent / work.budgetPlanned) : 0;
    if (budgetUsage > 1.0 || stats.delayedSteps > 3) return RiskLevel.HIGH;
    if (budgetUsage > 0.8 || stats.delayedSteps > 0) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  };

  const getTemperatureData = (risk: RiskLevel) => {
    switch (risk) {
      case RiskLevel.LOW: 
        return { 
          color: 'text-success', 
          bgColor: 'bg-green-500', // for stroke
          bgFade: 'from-green-500/20 to-green-500/5', 
          border: 'border-green-500/20',
          icon: 'local_fire_department',
          label: 'Status: Em dia' 
        };
      case RiskLevel.MEDIUM: 
        return { 
          color: 'text-warning', 
          bgColor: 'bg-yellow-500', 
          bgFade: 'from-yellow-500/20 to-yellow-500/5', 
          border: 'border-yellow-500/20',
          icon: 'warning',
          label: 'Status: Atenção' 
        };
      case RiskLevel.HIGH: 
        return { 
          color: 'text-danger', 
          bgColor: 'bg-red-500', 
          bgFade: 'from-red-500/20 to-red-500/5', 
          border: 'border-red-500/20',
          icon: 'error',
          label: 'Status: Crítico' 
        };
      default: return { color: 'text-gray-400', bgColor: 'bg-gray-400', bgFade: '', border: '', icon: '', label: '' };
    }
  };

  const temp = getTemperatureData(overallRisk);

  if (loading) return <div className="p-10 text-center text-text-muted dark:text-slate-400">Carregando painel...</div>;

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden font-display bg-surface dark:bg-slate-950 text-text-main dark:text-white transition-colors duration-200">
      
      {/* Top App Bar */}
      <div className="flex flex-col gap-2 p-4 pb-2 sticky top-0 bg-surface/80 dark:bg-slate-950/80 backdrop-blur-sm z-10">
        <div className="flex items-center h-12 justify-between">
          <div className="flex size-12 shrink-0 items-center">
            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 bg-primary text-white flex items-center justify-center font-bold text-lg shadow-md">
                {user?.name.charAt(0)}
            </div>
          </div>
          <div className="flex w-12 items-center justify-end">
            <button 
                onClick={() => navigate('/settings')}
                className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 bg-transparent text-text-main dark:text-white gap-2 text-base font-bold leading-normal tracking-[0.015em] min-w-0 p-0 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-text-main dark:text-white" style={{ fontSize: '28px' }}>settings</span>
            </button>
          </div>
        </div>
        <p className="text-text-main dark:text-white tracking-tight text-[28px] font-bold leading-tight">Olá, {user?.name.split(' ')[0]}!</p>
      </div>

      {/* Daily Overview */}
      <div className="px-4 pt-6 pb-3">
        <h1 className="text-text-main dark:text-white tracking-tight text-[32px] font-bold leading-tight text-left">Resumo do Dia</h1>
      </div>
      
      <div className="p-4 @container">
        <div className={`flex flex-col items-stretch justify-start rounded-xl bg-gradient-to-br ${temp.bgFade} p-4 md:flex-row md:items-start border ${temp.border}`}>
          <div className="flex w-full min-w-72 grow flex-col items-stretch justify-center gap-4">
            
            {/* Temperature Widget */}
            <div className="flex items-center gap-4">
              <div className="relative flex items-center justify-center size-24">
                <svg className="size-full" height="36" viewBox="0 0 36 36" width="36" xmlns="http://www.w3.org/2000/svg">
                  <circle className={`stroke-current opacity-20 ${temp.color}`} cx="18" cy="18" fill="none" r="16" strokeWidth="3"></circle>
                  <circle className={`stroke-current ${temp.color}`} cx="18" cy="18" fill="none" r="16" strokeDasharray="100" strokeDashoffset="15" strokeLinecap="round" strokeWidth="3"></circle>
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className={`material-symbols-outlined text-3xl ${temp.color}`}>{temp.icon}</span>
                </div>
              </div>
              <div className="flex flex-col">
                <p className="text-text-main dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Temperatura da Obra</p>
                <p className="text-text-muted dark:text-slate-400 text-base font-normal leading-normal">{temp.label}</p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex flex-1 gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex-col shadow-sm transition-colors">
                <span className="material-symbols-outlined text-text-main dark:text-white">calendar_clock</span>
                <div className="flex flex-col gap-1 mt-auto">
                  <h2 className="text-text-main dark:text-white text-base font-bold leading-tight">{totalDelayedSteps}</h2>
                  <p className="text-text-muted dark:text-slate-400 text-sm font-normal leading-normal">Etapas atrasadas</p>
                </div>
              </div>
              <div className="flex flex-1 gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex-col shadow-sm transition-colors">
                <span className="material-symbols-outlined text-text-main dark:text-white">request_quote</span>
                <div className="flex flex-col gap-1 mt-auto">
                  <h2 className="text-text-main dark:text-white text-base font-bold leading-tight">R$ {expensesLast7Days.toLocaleString('pt-BR')}</h2>
                  <p className="text-text-muted dark:text-slate-400 text-sm font-normal leading-normal">Gastos 7d</p>
                </div>
              </div>
              <div className="flex flex-1 gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex-col shadow-sm transition-colors">
                <span className="material-symbols-outlined text-text-main dark:text-white">inventory_2</span>
                <div className="flex flex-col gap-1 mt-auto">
                  <h2 className="text-text-main dark:text-white text-base font-bold leading-tight">{totalMissingMaterials}</h2>
                  <p className="text-text-muted dark:text-slate-400 text-sm font-normal leading-normal">Materiais faltando</p>
                </div>
              </div>
              <div className="flex flex-1 gap-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex-col shadow-sm transition-colors">
                <span className="material-symbols-outlined text-text-main dark:text-white">photo_camera</span>
                <div className="flex flex-col gap-1 mt-auto">
                  <h2 className="text-text-main dark:text-white text-base font-bold leading-tight">--</h2>
                  <p className="text-text-muted dark:text-slate-400 text-sm font-normal leading-normal">Última foto</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Section Header */}
      <h2 className="text-text-main dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">Minhas Obras</h2>

      {/* Project Cards */}
      <div className="flex flex-col gap-4 px-4 pb-24">
        {works.length === 0 ? (
           <div className="text-center py-10 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
             <p className="text-text-muted dark:text-slate-400">Nenhuma obra encontrada.</p>
           </div>
        ) : (
          works.map(work => {
            const stats = dbService.calculateWorkStats(work.id);
            const risk = calculateRisk(work, stats);
            const missingMats = dbService.getMaterials(work.id).filter(m => m.purchasedQty < m.plannedQty).length;
            
            // Determine risk colors
            let riskColor = 'text-success';
            let riskBg = 'bg-success-light text-success-dark';
            let progressColor = 'text-success';
            let progressBarColor = 'from-success to-success';
            
            if (risk === RiskLevel.MEDIUM) {
                riskColor = 'text-warning';
                riskBg = 'bg-warning-light text-warning-dark';
                progressColor = 'text-warning';
                progressBarColor = 'from-warning to-warning';
            } else if (risk === RiskLevel.HIGH) {
                riskColor = 'text-danger';
                riskBg = 'bg-danger-light text-danger';
                progressColor = 'text-danger';
                progressBarColor = 'from-danger to-danger';
            }

            return (
              <div key={work.id} onClick={() => navigate(`/work/${work.id}`)} className="cursor-pointer flex flex-col gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col">
                    <p className="text-lg font-bold text-text-main dark:text-white">{work.name}</p>
                    <p className="text-sm text-text-muted dark:text-slate-400">{work.address}</p>
                  </div>
                  <div className="relative flex items-center justify-center size-12 shrink-0">
                    <svg className="size-full -rotate-90" height="36" viewBox="0 0 36 36" width="36" xmlns="http://www.w3.org/2000/svg">
                      <circle className={`stroke-current opacity-10 ${progressColor}`} cx="18" cy="18" fill="none" r="16" strokeWidth="3"></circle>
                      <circle className={`stroke-current ${progressColor}`} cx="18" cy="18" fill="none" r="16" strokeDasharray="100" strokeDashoffset={100 - stats.progress} strokeLinecap="round" strokeWidth="3"></circle>
                    </svg>
                    <span className={`absolute text-xs font-bold ${progressColor}`}>{stats.progress}%</span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted dark:text-slate-400">Orçamento Utilizado</span>
                    <span className="font-semibold text-text-body dark:text-slate-200">R$ {stats.totalSpent.toLocaleString('pt-BR')} / R$ {work.budgetPlanned.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="w-full bg-surface dark:bg-slate-800 rounded-full h-2">
                    <div 
                        className={`bg-gradient-to-r ${progressBarColor} h-2 rounded-full`} 
                        style={{ width: `${Math.min((stats.totalSpent / work.budgetPlanned) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <div className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${riskBg}`}>
                     RISCO {risk}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-text-muted dark:text-slate-400">
                    <div className={`flex items-center gap-1 ${stats.delayedSteps > 0 ? 'text-danger' : ''}`}>
                      <span className="material-symbols-outlined text-base">task_alt</span>
                      <span>{stats.delayedSteps} atrasadas</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">inventory_2</span>
                      <span>{missingMats} faltando</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FAB */}
      <button 
        onClick={() => navigate('/create')}
        className="fixed bottom-6 right-6 flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>add</span>
      </button>
      
    </div>
  );
};

export default Dashboard;
