
import React, { useState } from 'react';
import { useAuth } from '../App';
import { PlanType } from '../types';
import { gatewayService } from '../services/gateway';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<PlanType | null>(null);

  // Todos os planos agora têm acesso total (features iguais)
  const fullAccessFeatures = [
    'Obras Ilimitadas',
    'Cronogramas Automáticos',
    'Gestão Financeira Completa',
    'Fotos Antes e Depois',
    'Relatórios em PDF',
    'Calculadoras de Material',
    'Acesso a Novas Funcionalidades'
  ];

  const plans = [
    {
      id: PlanType.MENSAL,
      name: 'Mensal',
      price: 'R$ 29,90',
      period: '/mês',
      color: 'bg-primary',
      highlight: false,
      savings: null
    },
    {
      id: PlanType.SEMESTRAL,
      name: 'Semestral',
      price: 'R$ 97,00',
      period: '/semestre',
      color: 'bg-primary-light',
      highlight: true,
      savings: 'Economize 45%' // (29.90 * 6 = 179.4) -> 97.00 is huge savings
    },
    {
      id: PlanType.VITALICIO,
      name: 'Vitalício',
      price: 'R$ 247,00',
      period: 'pagamento único',
      color: 'bg-premium',
      highlight: true,
      savings: 'Melhor Investimento'
    }
  ];

  const handleSubscribe = async (planId: PlanType) => {
    if (!user) return;
    
    try {
      setLoadingPlan(planId);
      
      // Chama o serviço do gateway para obter o link
      const checkoutUrl = await gatewayService.checkout(user, planId);
      
      // Redireciona o usuário para o pagamento
      window.location.href = checkoutUrl;
      
    } catch (error) {
      alert("Houve um erro ao conectar com o pagamento. Tente novamente.");
      setLoadingPlan(null);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <h1 className="text-3xl font-bold text-text-main dark:text-white mb-2">Meu Plano</h1>
      <p className="text-text-body dark:text-slate-400 mb-10">Escolha o ciclo de pagamento ideal. Todos os planos possuem <strong>acesso total</strong> ao aplicativo.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map(plan => {
          const isCurrent = user.plan === plan.id;
          const isVitalicio = plan.id === PlanType.VITALICIO;
          const isLoading = loadingPlan === plan.id;
          
          return (
            <div 
              key={plan.id} 
              className={`relative bg-white dark:bg-slate-900 rounded-3xl p-8 flex flex-col border transition-all hover:shadow-xl ${
                isVitalicio ? 'border-premium shadow-lg shadow-premium/10' : 'border-slate-200 dark:border-slate-800 shadow-sm'
              } ${isCurrent ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-900' : ''}`}
            >
              {isCurrent && (
                <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold px-3 py-1.5 rounded-bl-xl rounded-tr-2xl tracking-wider uppercase">
                  Ativo
                </div>
              )}

              {plan.savings && !isCurrent && (
                 <div className={`absolute -top-3 left-1/2 transform -translate-x-1/2 ${isVitalicio ? 'bg-premium' : 'bg-success'} text-white text-[10px] font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-sm`}>
                   {plan.savings}
                 </div>
              )}

              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-6 ${plan.color}`}>
                 <i className={`fa-solid ${isVitalicio ? 'fa-crown' : 'fa-calendar-check'} text-xl`}></i>
              </div>

              <h3 className="text-lg font-bold text-text-main dark:text-white uppercase tracking-wide mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-1">
                 <span className="text-3xl font-bold text-text-main dark:text-white">{plan.price}</span>
                 <span className="text-sm text-text-muted dark:text-slate-400">{plan.period.replace('/', '')}</span>
              </div>
              <p className="text-text-muted dark:text-slate-500 text-xs mb-8">
                  Acesso completo a todas as ferramentas
              </p>
              
              <div className="flex-1 mb-8">
                 <ul className="space-y-4">
                    {fullAccessFeatures.map((f, i) => (
                    <li key={i} className="flex items-start text-sm text-text-body dark:text-slate-300">
                        <i className={`fa-solid fa-check mt-0.5 mr-3 ${isVitalicio ? 'text-premium' : 'text-success'}`}></i>
                        {f}
                    </li>
                    ))}
                 </ul>
              </div>

              <button
                disabled={isCurrent || isLoading || loadingPlan !== null}
                onClick={() => handleSubscribe(plan.id)}
                className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center ${
                  isCurrent 
                    ? 'bg-surface dark:bg-slate-800 text-text-muted dark:text-slate-400 cursor-default border border-slate-200 dark:border-slate-700' 
                    : isVitalicio 
                        ? 'bg-premium hover:bg-purple-800 text-white shadow-lg shadow-premium/30'
                        : 'bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/20'
                } ${isLoading ? 'opacity-80 cursor-wait' : ''}`}
              >
                {isLoading ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin mr-2"></i>
                    Processando...
                  </>
                ) : isCurrent ? (
                  'Plano Atual'
                ) : (
                  'Assinar Agora'
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Settings;
