import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TodoItem, PriorityLevel } from '../../types';
import { 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Circle, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  CalendarCheck, 
  ListTodo, 
  Filter, 
  Clock, 
  Check, 
  Sparkles,
  Tag
} from 'lucide-react';

export const TodoCalendarView: React.FC = () => {
  const { todos, addTodo, updateTodo, deleteTodo, toggleTodoStatus, showToast } = useApp();

  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');

  // Selected date state (defaults to today)
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Filter states
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');

  // New task inline modal/form state
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('Work');
  const [newTaskPriority, setNewTaskPriority] = useState<PriorityLevel>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState(selectedDateStr);
  const [newTaskDueTime, setNewTaskDueTime] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const formatted = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDateStr(formatted);
    setNewTaskDueDate(formatted);
  };

  const handleSaveNewTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    addTodo({
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || undefined,
      dueDate: newTaskDueDate,
      dueTime: newTaskDueTime.trim() || undefined,
      priority: newTaskPriority,
      status: 'pending',
      category: newTaskCategory.trim() || 'Work',
      tags: [newTaskCategory.trim() || 'Work']
    });

    setNewTaskTitle('');
    setNewTaskDesc('');
    setIsAddingTask(false);
  };

  // Get unique categories for filter dropdown
  const categories = Array.from(new Set(todos.map((t) => t.category)));

  // Filtered todos based on active filters
  const filteredTodos = todos.filter((t) => {
    if (filterStatus === 'pending' && t.status === 'completed') return false;
    if (filterStatus === 'completed' && t.status !== 'completed') return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    return true;
  });

  // Todos specifically on the selected date
  const todosOnSelectedDate = todos.filter((t) => t.dueDate === selectedDateStr);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & View Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Todo List & Master Kalender
            </h2>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Sinkronisasi jadwal harian dan pengelolaan tugas produktivitas terpadu.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Switch Calendar vs List */}
          <div className="flex items-center p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'calendar'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Kalender</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>Daftar Tugas</span>
            </button>
          </div>

          <button
            onClick={() => setIsAddingTask(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tugas Baru</span>
          </button>
        </div>
      </div>

      {/* Task Creation Modal / Form */}
      {isAddingTask && (
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 shadow-lg space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
              Buat Tugas Baru
            </h3>
            <button
              onClick={() => setIsAddingTask(false)}
              className="text-xs text-neutral-400 hover:text-neutral-600"
            >
              Batal
            </button>
          </div>

          <form onSubmit={handleSaveNewTask} className="space-y-4">
            <div>
              <input
                type="text"
                required
                placeholder="Judul tugas yang ingin diselesaikan..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-sm font-medium text-neutral-900 dark:text-neutral-100"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
                  Tanggal Tenggat
                </label>
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
                  Jam (Opsional)
                </label>
                <input
                  type="time"
                  value={newTaskDueTime}
                  onChange={(e) => setNewTaskDueTime(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
                  Prioritas
                </label>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as PriorityLevel)}
                  className="w-full px-3 py-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs"
                >
                  <option value="low">Rendah (Low)</option>
                  <option value="medium">Sedang (Medium)</option>
                  <option value="high">Mendesak (High)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-500 mb-1">
                  Kategori
                </label>
                <input
                  type="text"
                  value={newTaskCategory}
                  onChange={(e) => setNewTaskCategory(e.target.value)}
                  placeholder="Work, Personal..."
                  className="w-full px-3 py-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs"
                />
              </div>
            </div>

            <div>
              <textarea
                rows={2}
                placeholder="Catatan detail atau instruksi tugas..."
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-neutral-100"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingTask(false)}
                className="px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-700"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:bg-neutral-800"
              >
                Simpan Tugas
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View: Master Calendar Layout */}
      {viewMode === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Grid (2 Cols) */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  {monthNames[month]} {year}
                </h3>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors"
                  aria-label="Bulan sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                >
                  Hari Ini
                </button>
                <button
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors"
                  aria-label="Bulan berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-neutral-400 mb-2">
              <span>Min</span>
              <span>Sen</span>
              <span>Sel</span>
              <span>Rab</span>
              <span>Kam</span>
              <span>Jum</span>
              <span>Sab</span>
            </div>

            {/* Calendar Cells */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty leading days */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[72px] sm:min-h-[88px] p-1.5 bg-neutral-50/50 dark:bg-neutral-900/30 rounded-xl opacity-20" />
              ))}

              {/* Month Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNumber = i + 1;
                const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
                const isSelected = dateKey === selectedDateStr;
                const isToday = dateKey === new Date().toISOString().split('T')[0];
                const dayTodos = todos.filter((t) => t.dueDate === dateKey);
                const hasHighPriority = dayTodos.some((t) => t.priority === 'high' && t.status !== 'completed');

                return (
                  <div
                    key={dateKey}
                    onClick={() => handleSelectDay(dayNumber)}
                    className={`min-h-[72px] sm:min-h-[88px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 shadow-xs'
                        : isToday
                        ? 'border-neutral-400 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800/40'
                        : 'border-neutral-200/70 dark:border-neutral-800/70 hover:bg-neutral-50 dark:hover:bg-neutral-800/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-mono font-semibold ${
                          isToday
                            ? 'w-6 h-6 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center'
                            : isSelected
                            ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                            : 'text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {dayNumber}
                      </span>
                      {hasHighPriority && (
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" title="Ada tugas mendesak" />
                      )}
                    </div>

                    {/* Todo indicators */}
                    <div className="space-y-1 mt-1 overflow-hidden">
                      {dayTodos.slice(0, 2).map((t) => (
                        <div
                          key={t.id}
                          className={`text-[10px] truncate px-1.5 py-0.5 rounded ${
                            t.status === 'completed'
                              ? 'line-through text-neutral-400 bg-neutral-100 dark:bg-neutral-800'
                              : t.priority === 'high'
                              ? 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50'
                              : 'text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800'
                          }`}
                        >
                          {t.title}
                        </div>
                      ))}
                      {dayTodos.length > 2 && (
                        <div className="text-[9px] text-neutral-400 pl-1 font-mono">
                          +{dayTodos.length - 2} lagi
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Day Agenda Detail (1 Col) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                Agenda Tanggal
              </span>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 mt-0.5 font-mono">
                {selectedDateStr}
              </h3>
            </div>

            {todosOnSelectedDate.length === 0 ? (
              <div className="py-8 text-center text-neutral-400">
                <CalendarIcon className="w-8 h-8 mx-auto text-neutral-300 dark:text-neutral-700 mb-2" />
                <p className="text-xs">Tidak ada jadwal atau tugas pada tanggal ini.</p>
                <button
                  onClick={() => setIsAddingTask(true)}
                  className="mt-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  + Tambah tugas untuk hari ini
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {todosOnSelectedDate.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-800 space-y-2 group"
                  >
                    <div className="flex items-start gap-2.5">
                      <button
                        onClick={() => toggleTodoStatus(t.id)}
                        className="mt-0.5 text-neutral-400 hover:text-indigo-600 transition-colors shrink-0"
                      >
                        {t.status === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs font-semibold text-neutral-900 dark:text-neutral-100 ${
                            t.status === 'completed' ? 'line-through text-neutral-400' : ''
                          }`}
                        >
                          {t.title}
                        </p>
                        {t.description && (
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                            {t.description}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-2 text-[10px] text-neutral-400">
                          <span className="font-medium text-neutral-600 dark:text-neutral-300">
                            {t.category}
                          </span>
                          <span>·</span>
                          <span className={t.priority === 'high' ? 'text-rose-500 font-semibold' : ''}>
                            {t.priority}
                          </span>
                          {t.dueTime && (
                            <>
                              <span>·</span>
                              <span className="font-mono">{t.dueTime}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => deleteTodo(t.id)}
                        className="p-1 text-neutral-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Hapus tugas"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* View: Full List & Filtering */
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-neutral-400 font-medium">Filter:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-200 border-0"
              >
                <option value="all">Semua Status ({todos.length})</option>
                <option value="pending">Aktif / Pending</option>
                <option value="completed">Selesai</option>
              </select>

              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-200 border-0"
              >
                <option value="all">Semua Prioritas</option>
                <option value="high">Mendesak (High)</option>
                <option value="medium">Sedang (Medium)</option>
                <option value="low">Rendah (Low)</option>
              </select>

              {categories.length > 0 && (
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-800 dark:text-neutral-200 border-0"
                >
                  <option value="all">Semua Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <span className="text-xs text-neutral-400 font-mono">
              {filteredTodos.length} tugas ditampilkan
            </span>
          </div>

          {/* Todos List */}
          <div className="space-y-2">
            {filteredTodos.map((todo) => {
              const isHigh = todo.priority === 'high';
              const isDone = todo.status === 'completed';

              return (
                <div
                  key={todo.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      onClick={() => toggleTodoStatus(todo.id)}
                      className="text-neutral-400 hover:text-indigo-600 transition-colors shrink-0"
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold ${
                            isDone ? 'line-through text-neutral-400' : 'text-neutral-900 dark:text-neutral-100'
                          } truncate`}
                        >
                          {todo.title}
                        </span>
                        {isHigh && !isDone && (
                          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold font-mono">
                            HIGH
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-1">
                        <span>{todo.category}</span>
                        <span>·</span>
                        <span className="font-mono">{todo.dueDate}</span>
                        {todo.dueTime && (
                          <>
                            <span>·</span>
                            <span className="font-mono">{todo.dueTime}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => deleteTodo(todo.id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-500 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 transition-colors"
                      title="Hapus tugas"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
