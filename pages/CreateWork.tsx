
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { dbService } from '../services/db';

const CreateWork: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [useStandardTemplate, setUseStandardTemplate] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    budgetPlanned: '',
    startDate: '',
    endDate: '',
    area: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const newWork = dbService.createWork({
      userId: user.id,
      name: formData.name,
      address: formData.address,
      budgetPlanned: Number(formData.budgetPlanned),
      startDate: formData.startDate,
      endDate: formData.endDate,
      area: Number(formData.area),
      notes: formData.notes
    }, useStandardTemplate);

    navigate(`/work/${newWork.id}`);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={() => navigate('/')} className="mb-6 text-text-muted hover:text-primary font-medium flex items-center transition-colors">
        <i className="fa-solid fa-arrow-left mr-2"></i> Voltar ao Painel
      </button>
      
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-10 transition-colors">
        <div className="mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
            <h1 className="text-3xl font-bold text-text-main dark:text-white mb-2">Nova Obra</h1>
            <p className="text-text-body dark:text-slate-400">Preencha os dados básicos para iniciar o controle da sua reforma.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-sm font-bold text-text-main dark:text-slate-200 mb-2">Nome do Projeto</label>
            <input 
              name="name" 
              required 
              placeholder="Ex: Reforma da Cozinha, Construção da Edícula..."
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main dark:text-white rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-text-muted dark:placeholder:text-slate-500"
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-text-main dark:text-slate-200 mb-2">Endereço</label>
            <input 
              name="address" 
              required 
              placeholder="Rua, Número, Bairro"
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main dark:text-white rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-text-muted dark:placeholder:text-slate-500"
              onChange={handleChange}
            />
          </div>

          <div className="bg-surface dark:bg-slate-800 p-5 rounded-2xl flex items-center justify-between border border-slate-200 dark:border-slate-700">
             <div className="pr-4">
                <h3 className="text-primary dark:text-primary-light font-bold text-base flex items-center">
                    <i className="fa-solid fa-wand-magic-sparkles mr-2"></i>
                    Usar modelo inteligente
                </h3>
                <p className="text-text-body dark:text-slate-400 text-sm mt-1">
                    Gera automaticamente o cronograma padrão (Fundação, Alvenaria, Hidráulica...) para você não começar do zero.
                </p>
             </div>
             <label className="relative inline-flex items-center cursor-pointer">
               <input 
                 type="checkbox" 
                 className="sr-only peer" 
                 checked={useStandardTemplate}
                 onChange={(e) => setUseStandardTemplate(e.target.checked)}
               />
               <div className="w-14 h-8 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-success"></div>
             </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-bold text-text-main dark:text-slate-200 mb-2">Orçamento Planejado (R$)</label>
              <div className="relative">
                  <span className="absolute left-4 top-3.5 text-text-muted dark:text-slate-500">R$</span>
                  <input 
                    name="budgetPlanned" 
                    type="number" 
                    required 
                    placeholder="0,00"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main dark:text-white rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-text-muted dark:placeholder:text-slate-500"
                    onChange={handleChange}
                  />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-text-main dark:text-slate-200 mb-2">Área (m²)</label>
              <input 
                name="area" 
                type="number" 
                required 
                placeholder="45"
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main dark:text-white rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-text-muted dark:placeholder:text-slate-500"
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-bold text-text-main dark:text-slate-200 mb-2">Data de Início</label>
              <input 
                name="startDate" 
                type="date" 
                required 
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-body dark:text-white rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-text-main dark:text-slate-200 mb-2">Data Final (Estimada)</label>
              <input 
                name="endDate" 
                type="date" 
                required 
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-body dark:text-white rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-text-main dark:text-slate-200 mb-2">Anotações Gerais</label>
            <textarea 
              name="notes" 
              rows={3}
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main dark:text-white rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-text-muted dark:placeholder:text-slate-500"
              onChange={handleChange}
            ></textarea>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
            <button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-primary/20 text-lg"
            >
              Criar Projeto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateWork;
