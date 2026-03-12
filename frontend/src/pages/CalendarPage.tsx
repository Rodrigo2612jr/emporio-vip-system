import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDay, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

interface Routine {
  id: string;
  date: string;
  status: string;
  campaign?: { name: string };
  focusProduct?: { name: string };
  messages: any[];
}

const statusColors: Record<string, string> = {
  rascunho: 'bg-gray-200 text-gray-700',
  em_edicao: 'bg-yellow-200 text-yellow-800',
  aprovado: 'bg-blue-200 text-blue-800',
  agendado: 'bg-purple-200 text-purple-800',
  enviado: 'bg-green-200 text-green-800',
  cancelado: 'bg-red-200 text-red-800',
};

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    setLoading(true);
    api.get('/daily-routines', {
      params: { startDate: start.toISOString(), endDate: end.toISOString() }
    }).then(res => setRoutines(res.data)).catch(() => setRoutines([])).finally(() => setLoading(false));
  }, [currentMonth]);

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOffset = getDay(startOfMonth(currentMonth));

  const getRoutineForDay = (day: Date) => routines.find(r => isSameDay(new Date(r.date), day));

  const createRoutine = async (date: Date) => {
    try {
      const res = await api.post('/daily-routines', { date: date.toISOString() });
      navigate(`/rotina/${res.data.id}`);
    } catch (err: any) {
      if (err.response?.data?.error?.includes('Já existe')) {
        const routine = getRoutineForDay(date);
        if (routine) navigate(`/rotina/${routine.id}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Calendário Editorial</h1>
          <p className="text-gray-500">Planeje e visualize suas rotinas diárias</p>
        </div>
      </div>

      {/* Month navigation */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-semibold text-gray-800 capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Week header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="h-28" />
          ))}
          {days.map(day => {
            const routine = getRoutineForDay(day);
            return (
              <div key={day.toISOString()}
                onClick={() => routine ? navigate(`/rotina/${routine.id}`) : createRoutine(day)}
                className={`h-28 border rounded-lg p-2 cursor-pointer transition hover:shadow-md ${
                  isToday(day) ? 'border-green-400 bg-green-50/50' : 'border-gray-100 hover:border-gray-300'
                }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${isToday(day) ? 'text-green-700' : 'text-gray-700'}`}>
                    {format(day, 'd')}
                  </span>
                  {!routine && (
                    <Plus size={14} className="text-gray-300 hover:text-green-500" />
                  )}
                </div>
                {routine && (
                  <div className="mt-1 space-y-1">
                    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[routine.status] || 'bg-gray-100'}`}>
                      {routine.status.replace('_', ' ')}
                    </span>
                    {routine.campaign && (
                      <p className="text-[10px] text-gray-500 truncate">{routine.campaign.name}</p>
                    )}
                    <p className="text-[10px] text-gray-400">{routine.messages.length} msgs</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
