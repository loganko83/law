/**
 * useTimeline Hook
 * Manages timeline and calendar state
 */

import { useState, useCallback } from 'react';
import { TimelineEvent } from '../types';

export interface UseTimelineResult {
  viewMode: 'LIST' | 'CALENDAR';
  setViewMode: React.Dispatch<React.SetStateAction<'LIST' | 'CALENDAR'>>;
  currentMonth: Date;
  selectedDate: string | null;
  expandedEvent: number | null;
  isAddEventOpen: boolean;
  newEvent: { title: string; date: string };
  changeMonth: (offset: number) => void;
  goToToday: () => void;
  setSelectedDate: (date: string | null) => void;
  toggleEvent: (index: number) => void;
  setIsAddEventOpen: (open: boolean) => void;
  setNewEvent: React.Dispatch<React.SetStateAction<{ title: string; date: string }>>;
  handleAddEvent: () => void;
  getEventsForDate: (dateStr: string) => TimelineEvent[];
  getLocalDateString: (date: Date) => string;
  displayEvents: TimelineEvent[];
}

export function useTimeline(
  events: TimelineEvent[],
  setEvents: React.Dispatch<React.SetStateAction<TimelineEvent[]>>
): UseTimelineResult {
  const getLocalDateString = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(getLocalDateString(new Date()));
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '' });

  const changeMonth = useCallback((offset: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
    setCurrentMonth(newDate);
  }, [currentMonth]);

  const goToToday = useCallback(() => {
    const now = new Date();
    setCurrentMonth(now);
    setSelectedDate(getLocalDateString(now));
  }, [getLocalDateString]);

  const toggleEvent = useCallback((index: number) => {
    setExpandedEvent(expandedEvent === index ? null : index);
  }, [expandedEvent]);

  const handleAddEvent = useCallback(() => {
    if (!newEvent.title || !newEvent.date) return;
    setEvents([...events, { ...newEvent, completed: false }]);
    setNewEvent({ title: '', date: '' });
    setIsAddEventOpen(false);
  }, [newEvent, events, setEvents]);

  const getEventsForDate = useCallback((dateStr: string) => {
    return events.filter(e => e.date === dateStr);
  }, [events]);

  const displayEvents = viewMode === 'LIST'
    ? events
    : events.filter(e => e.date === selectedDate);

  return {
    viewMode,
    setViewMode,
    currentMonth,
    selectedDate,
    expandedEvent,
    isAddEventOpen,
    newEvent,
    changeMonth,
    goToToday,
    setSelectedDate,
    toggleEvent,
    setIsAddEventOpen,
    setNewEvent,
    handleAddEvent,
    getEventsForDate,
    getLocalDateString,
    displayEvents,
  };
}
