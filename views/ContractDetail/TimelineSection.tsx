/**
 * TimelineSection Component
 * Calendar and list view for contract timeline events
 */

import React from 'react';
import {
  Calendar,
  CheckCircle2,
  Circle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  List,
  FileText,
  StickyNote,
  Bell,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../components/Toast';
import { TimelineEvent } from './types';

interface TimelineSectionProps {
  events: TimelineEvent[];
  displayEvents: TimelineEvent[];
  viewMode: 'LIST' | 'CALENDAR';
  setViewMode: (mode: 'LIST' | 'CALENDAR') => void;
  currentMonth: Date;
  selectedDate: string | null;
  expandedEvent: number | null;
  onChangeMonth: (offset: number) => void;
  onGoToToday: () => void;
  onSelectDate: (date: string | null) => void;
  onToggleEvent: (index: number) => void;
  onAddEvent: () => void;
  getEventsForDate: (dateStr: string) => TimelineEvent[];
  getLocalDateString: (date: Date) => string;
}

export const TimelineSection: React.FC<TimelineSectionProps> = ({
  events,
  displayEvents,
  viewMode,
  setViewMode,
  currentMonth,
  selectedDate,
  expandedEvent,
  onChangeMonth,
  onGoToToday,
  onSelectDate,
  onToggleEvent,
  onAddEvent,
  getEventsForDate,
  getLocalDateString,
}) => {
  const { t } = useTranslation();
  const toast = useToast();

  const handleDocumentDownload = (docName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toast.info(t('contract.downloadingFile', { fileName: docName }));
  };

  const handleReminder = (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm(t('contract.sendNotificationConfirm'));
    if (confirmed) {
      toast.success(t('contract.notificationSent'));
    }
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const days = [];
    const todayStr = getLocalDateString(new Date());

    // Empty slots
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-full" />);
    }

    // Days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvents = getEventsForDate(dateStr);
      const hasEvents = dayEvents.length > 0;
      const isSelected = selectedDate === dateStr;
      const isToday = dateStr === todayStr;

      days.push(
        <button
          key={d}
          onClick={() => onSelectDate(dateStr)}
          className={`h-10 w-full rounded-lg flex flex-col items-center justify-center relative transition-colors ${
            isSelected
              ? 'bg-blue-600 text-white shadow-md'
              : isToday
              ? 'bg-blue-50 text-blue-600 font-bold'
              : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          <span className="relative z-10 text-sm">{d}</span>
          {hasEvents && (
            <div className="flex gap-0.5 mt-0.5">
              {dayEvents.slice(0, 3).map((e, i) => (
                <span
                  key={i}
                  className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : e.completed ? 'bg-green-500' : 'bg-blue-500'}`}
                ></span>
              ))}
            </div>
          )}
        </button>
      );
    }

    return (
      <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => onChangeMonth(-1)}
            className="p-1 hover:bg-slate-100 rounded-full text-slate-500"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">
              {year}{t('common.year')} {month + 1}{t('common.month')}
            </span>
            <button
              onClick={onGoToToday}
              className="text-[10px] px-2 py-1 bg-slate-100 rounded-full text-slate-600 font-semibold hover:bg-slate-200 transition-colors"
            >
              {t('common.today')}
            </button>
          </div>
          <button
            onClick={() => onChangeMonth(1)}
            className="p-1 hover:bg-slate-100 rounded-full text-slate-500"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {[t('common.sun'), t('common.mon'), t('common.tue'), t('common.wed'), t('common.thu'), t('common.fri'), t('common.sat')].map(day => (
            <div key={day} className="text-center text-xs text-slate-400 font-medium py-1">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4 px-1">
        <h3 className="font-bold text-lg text-slate-800">{t('contract.timeline')}</h3>
        <div className="flex gap-2 items-center">
          <div className="bg-slate-100 p-1 rounded-lg flex" data-html2canvas-ignore="true">
            <button
              onClick={() => setViewMode('LIST')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'LIST' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
              title={t('contract.listView')}
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setViewMode('CALENDAR')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'CALENDAR' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
              title={t('contract.calendarView')}
            >
              <Calendar size={16} />
            </button>
          </div>
          <button
            onClick={onAddEvent}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
            data-html2canvas-ignore="true"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {viewMode === 'CALENDAR' && renderCalendar()}

      <div className="relative pl-4 space-y-6 before:absolute before:left-[27px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {displayEvents.length > 0 ? (
          displayEvents.map((event, idx) => {
            const isExpanded = expandedEvent === idx;
            const key = `${viewMode}-${idx}`;

            return (
              <div
                key={key}
                onClick={() => onToggleEvent(idx)}
                className={`relative flex items-start gap-4 cursor-pointer group transition-all duration-200 ${isExpanded ? 'bg-white -mx-2 px-3 py-3 rounded-xl shadow-sm border border-slate-100 z-10' : ''}`}
              >
                <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center border-2 flex-shrink-0 bg-white transition-colors ${event.completed ? 'border-blue-500 text-blue-500' : 'border-slate-300 text-slate-300 group-hover:border-slate-400'}`}>
                  {event.completed ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                </div>
                <div className={`flex-1 pt-0.5 transition-opacity ${event.completed || isExpanded ? 'opacity-100' : 'opacity-70'}`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{event.title}</p>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                        <Calendar size={12} />
                        <span>{event.date}</span>
                      </div>
                    </div>
                    <div className="text-slate-400" data-html2canvas-ignore="true">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                        animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                          <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                            {event.completed
                              ? t('contract.eventCompletedDesc')
                              : t('contract.eventInProgressDesc')}
                          </p>

                          {event.notes && (
                            <div className="mb-3 bg-white p-2.5 rounded-lg border border-slate-100 flex gap-2">
                              <StickyNote size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-slate-600">{event.notes}</p>
                            </div>
                          )}

                          {event.documents && event.documents.length > 0 && (
                            <div className="mb-4">
                              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                                <FileText size={10} /> {t('contract.relatedDocuments')}
                              </p>
                              <div className="space-y-1.5">
                                {event.documents.map((doc, i) => (
                                  <div key={i} className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-100 text-xs text-slate-600 hover:border-blue-200 transition-colors cursor-pointer group/doc">
                                    <div className="p-1.5 bg-blue-50 text-blue-500 rounded-md">
                                      <FileText size={14} />
                                    </div>
                                    <span className="truncate flex-1 font-medium">{doc}</span>
                                    <button
                                      onClick={(e) => handleDocumentDownload(doc, e)}
                                      className="text-blue-500 text-[10px] font-semibold opacity-0 group-hover/doc:opacity-100 transition-opacity"
                                    >
                                      {t('common.download')}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2" data-html2canvas-ignore="true">
                            {event.completed ? (
                              <button className="flex-1 bg-white text-slate-600 border border-slate-200 py-2 rounded-md text-xs font-semibold hover:bg-slate-50">
                                {t('contract.editDetails')}
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); toast.success(t('contract.reminderSet')); }}
                                  className="flex-1 bg-white text-slate-600 border border-slate-200 py-2 rounded-md text-xs font-semibold hover:bg-slate-50"
                                >
                                  <Bell size={12} className="inline mr-1" /> {t('contract.setReminder')}
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); toast.success(t('contract.markedComplete')); }}
                                  className="flex-1 bg-blue-600 text-white py-2 rounded-md text-xs font-semibold hover:bg-blue-700 shadow-sm shadow-blue-200"
                                >
                                  {t('contract.markComplete')}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center text-slate-400 text-sm bg-slate-100/50 rounded-lg border border-dashed border-slate-200">
            {viewMode === 'CALENDAR' ? t('contract.noEventsOnDate') : t('contract.noEvents')}
          </div>
        )}

        {viewMode === 'LIST' && (
          <div className="relative flex items-start gap-4">
            <div className="relative z-10 w-6 h-6 rounded-full flex items-center justify-center bg-orange-100 border-2 border-orange-200 text-orange-500 flex-shrink-0">
              <AlertCircle size={14} />
            </div>
            <div className="flex-1 pt-0.5">
              <p className="font-bold text-slate-800 text-sm">{t('contract.disputePreventionCheck')}</p>
              <p className="text-xs text-slate-500 mt-1">
                {t('contract.noResponseFromCounterparty')}
              </p>
              <button
                onClick={handleReminder}
                className="mt-2 text-xs text-orange-600 font-semibold bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 hover:bg-orange-100 transition-colors"
                data-html2canvas-ignore="true"
              >
                {t('contract.sendReminder')}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
