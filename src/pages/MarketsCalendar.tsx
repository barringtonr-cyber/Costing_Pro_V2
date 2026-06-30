import React, { useState, useEffect } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  ArrowLeft,
  Plus, 
  X, 
  DollarSign, 
  Calendar as CalendarIcon,
  MapPin,
  Clock,
  Trash2,
  Edit2
} from "lucide-react";
import { api, Market, MarketEvent } from "../api";
import { cn } from "../lib/utils";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "../context/AdminContext";
import { useAuth } from "../context/AuthContext";

const STATUS_COLOR_DOTS = {
  Confirmed: "bg-emerald-500",
  Waitlisted: "bg-rose-400",
  Completed: "bg-zinc-400",
  Cancelled: "bg-zinc-700",
  Deadline: "bg-amber-500"
};

const STATUS_COLOR_TEXT = {
  Confirmed: "text-emerald-800 bg-emerald-50 border border-emerald-100",
  Waitlisted: "text-rose-800 bg-rose-50 border border-rose-100",
  Completed: "text-zinc-700 bg-zinc-50 border border-zinc-200",
  Cancelled: "text-zinc-800 bg-zinc-100 border border-zinc-300",
  Deadline: "text-amber-800 bg-amber-50 border border-amber-100"
};

export default function MarketsCalendar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showAllData } = useAdmin();
  const isAdmin = user?.role === "admin";
  const effectiveAll = showAllData && isAdmin;

  const [markets, setMarkets] = useState<Market[]>([]);
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar Date State (default to current month)
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<"Month" | "Week">("Month");

  // Event modal state
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<MarketEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<MarketEvent | null>(null);

  const [eventForm, setEventForm] = useState({
    marketId: "",
    title: "",
    date: "",
    isMultiDay: false,
    endDate: "",
    status: "Confirmed" as "Confirmed" | "Waitlisted" | "Completed" | "Cancelled" | "Deadline",
    revenue: "0",
    expenses: "0",
    notes: ""
  });

  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchData();
  }, [effectiveAll]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [fetchedMarkets, fetchedEvents] = await Promise.all([
        api.getMarkets(effectiveAll),
        api.getMarketEvents(effectiveAll)
      ]);
      setMarkets(fetchedMarkets || []);
      setEvents(fetchedEvents || []);
    } catch (err) {
      console.error(err);
      showNotification("Error loading calendar data.", "error");
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Get days of the month grid
  const getDaysInMonthGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of current month
    const firstDayIndex = new Date(year, month, 1).getDay();

    // Last day of current month
    const lastDate = new Date(year, month + 1, 0).getDate();

    // Last day of previous month
    const prevMonthLastDate = new Date(year, month, 0).getDate();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Prev month days to fill grid
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevMonthDay = prevMonthLastDate - i;
      const prevMonthObj = new Date(year, month - 1, prevMonthDay);
      days.push({
        dateStr: prevMonthObj.toISOString().split("T")[0],
        dayNum: prevMonthDay,
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let i = 1; i <= lastDate; i++) {
      const currentDayObj = new Date(year, month, i);
      days.push({
        dateStr: currentDayObj.toISOString().split("T")[0],
        dayNum: i,
        isCurrentMonth: true
      });
    }

    // Next month days to fill grid to standard 42 boxes (6 rows)
    const totalBoxes = 42;
    const remaining = totalBoxes - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextMonthObj = new Date(year, month + 1, i);
      days.push({
        dateStr: nextMonthObj.toISOString().split("T")[0],
        dayNum: i,
        isCurrentMonth: false
      });
    }

    return days;
  };

  const daysGrid = getDaysInMonthGrid();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Open modal to add event
  const handleDayClick = (dateStr: string) => {
    if (markets.length === 0) {
      showNotification("Please create at least one Market Venue first before scheduling events.", "error");
      return;
    }
    setSelectedDay(dateStr);
    setEditingEvent(null);
    setSelectedEvent(null);
    setEventForm({
      marketId: markets[0]?.id || "",
      title: "",
      date: dateStr,
      isMultiDay: false,
      endDate: "",
      status: "Confirmed",
      revenue: "0",
      expenses: "0",
      notes: ""
    });
    setIsEventModalOpen(true);
  };

  // Open modal to edit existing event
  const handleEventClick = (event: MarketEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setEditingEvent(event);
    const hasEndDate = !!(event.endDate && event.endDate !== event.date);
    setEventForm({
      marketId: event.marketId,
      title: event.title,
      date: event.date,
      isMultiDay: hasEndDate,
      endDate: event.endDate || "",
      status: event.status,
      revenue: (event.revenue || 0).toString(),
      expenses: (event.expenses || 0).toString(),
      notes: event.notes || ""
    });
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.marketId) {
      showNotification("Please select a Market Venue.", "error");
      return;
    }
    if (!eventForm.title.trim()) {
      showNotification("Event title is required.", "error");
      return;
    }

    const payload = {
      marketId: eventForm.marketId,
      title: eventForm.title,
      date: eventForm.date,
      endDate: eventForm.isMultiDay && eventForm.endDate ? eventForm.endDate : "",
      status: eventForm.status,
      revenue: parseFloat(eventForm.revenue) || 0,
      expenses: parseFloat(eventForm.expenses) || 0,
      notes: eventForm.notes
    };

    try {
      if (editingEvent) {
        await api.updateMarketEvent(editingEvent.id, payload);
        showNotification("Event updated successfully!", "success");
      } else {
        await api.addMarketEvent(payload);
        showNotification("New event added to calendar!", "success");
      }
      setIsEventModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      showNotification("Failed to save event.", "error");
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this event?")) {
      return;
    }
    try {
      await api.deleteMarketEvent(id);
      showNotification("Event deleted from calendar.", "success");
      setIsEventModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      showNotification("Failed to delete event.", "error");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-zinc-950 pb-20">
      {/* Toast Notification */}
      {notification && (
        <div className={cn(
          "fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border transition-all transform duration-300 translate-y-0",
          notification.type === "success" 
            ? "bg-[#FAF9F5] border-emerald-200 text-emerald-800" 
            : "bg-[#FAF9F5] border-red-200 text-red-800"
        )}>
          <span className="text-sm font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Breadcrumbs precisely matching layout 2 */}
      <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium font-sans">
        <button 
          onClick={() => navigate("/markets")}
          className="hover:text-[#2d3a22] hover:underline flex items-center gap-1"
        >
          Markets
        </button>
        <span className="text-zinc-300">/</span>
        <span className="text-zinc-700 font-semibold">Market Calendar</span>
      </div>

      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EAE6DF] pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 font-sans">Market Calendar</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage scheduled dates, waitlists, and financial tracking</p>
        </div>
        
        {/* Navigation/Toggle headers */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/markets")}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-[#EAE6DF] rounded-lg text-zinc-700 hover:bg-zinc-50 transition-colors text-xs font-semibold shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Venues
          </button>
          <button
            onClick={() => {
              if (markets.length > 0) {
                handleDayClick(new Date().toISOString().split("T")[0]);
              } else {
                showNotification("Create a Market Venue first.", "error");
              }
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#2d3a22] text-[#FAF9F5] rounded-lg hover:bg-[#3d4f2f] transition-all text-xs font-semibold shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Event
          </button>
        </div>
      </div>

      {/* Status Legend matches Layout 2 */}
      <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs font-semibold text-zinc-500 bg-white px-5 py-3 rounded-xl border border-[#EAE6DF] shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>Confirmed Event</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
          <span>Waitlisted Event</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-zinc-400"></span>
          <span>Completed Event</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-zinc-700"></span>
          <span>Cancelled Event</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span>Application Deadline</span>
        </div>
      </div>

      {/* Calendar Controls (Month Switcher + Views Switcher) */}
      <div className="flex items-center justify-between bg-[#FAF9F5] p-3 rounded-xl border border-[#EAE6DF] shadow-inner">
        {/* Left/Right controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-white border border-[#EAE6DF] rounded-lg p-0.5 shadow-sm">
            <button 
              onClick={prevMonth}
              className="p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={nextMonth}
              className="p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <h2 className="text-lg font-extrabold text-zinc-800">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
        </div>

        {/* Month/Week Toggle */}
        <div className="flex bg-white p-1 rounded-lg border border-[#EAE6DF] shadow-sm">
          <button
            onClick={() => setViewType("Month")}
            className={cn(
              "px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-150",
              viewType === "Month"
                ? "bg-[#2d3a22] text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-800"
            )}
          >
            Month
          </button>
          <button
            onClick={() => setViewType("Week")}
            className={cn(
              "px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-150",
              viewType === "Week"
                ? "bg-[#2d3a22] text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-800"
            )}
          >
            Week
          </button>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-white rounded-2xl border border-[#EAE6DF] shadow-sm overflow-hidden">
        {/* Weekday Titles */}
        <div className="grid grid-cols-7 bg-[#FAF9F5] border-b border-[#EAE6DF] text-center font-bold text-xs text-zinc-500 py-3 tracking-wider">
          <div>SUN</div>
          <div>MON</div>
          <div>TUE</div>
          <div>WED</div>
          <div>THU</div>
          <div>FRI</div>
          <div>SAT</div>
        </div>

        {/* Days Grid - matches Layout 2 */}
        {loading ? (
          <div className="flex items-center justify-center py-40">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#2d3a22]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-7 grid-rows-6 border-b border-r border-[#EAE6DF]/40 min-h-[580px]">
            {daysGrid.map((day, idx) => {
              // Find events on this day (including multi-day spans)
              const dayEvents = events.filter(e => {
                if (!e.date) return false;
                if (!e.endDate || e.endDate === e.date) return e.date === day.dateStr;
                return day.dateStr >= e.date && day.dateStr <= e.endDate;
              });

              return (
                <div
                  key={`${day.dateStr}-${idx}`}
                  onClick={() => handleDayClick(day.dateStr)}
                  className={cn(
                    "border-l border-t border-[#EAE6DF]/60 p-2 min-h-[90px] flex flex-col justify-between transition-all hover:bg-zinc-50/50 cursor-pointer group",
                    !day.isCurrentMonth && "bg-[#FCFCFA]/40 text-zinc-300"
                  )}
                >
                  {/* Day Number */}
                  <div className="flex justify-between items-center">
                    <span className={cn(
                      "text-xs font-semibold p-1 rounded-full w-6 h-6 flex items-center justify-center",
                      day.dateStr === new Date().toISOString().split("T")[0] 
                        ? "bg-[#2d3a22] text-white" 
                        : day.isCurrentMonth ? "text-zinc-700" : "text-zinc-400"
                    )}>
                      {day.dayNum}
                    </span>
                    
                    {/* Tiny inline plus indicator shown on hover */}
                    <span className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-[#2d3a22] transition-opacity">
                      <Plus className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  {/* Day Events Plotting */}
                  <div className="mt-1 space-y-1 overflow-y-auto max-h-[70px] custom-scrollbar">
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        onClick={(e) => handleEventClick(event, e)}
                        className={cn(
                          "px-2 py-1 text-[10px] font-bold rounded-md flex items-center gap-1 transition-all hover:scale-102 hover:shadow-sm truncate",
                          STATUS_COLOR_TEXT[event.status] || "bg-zinc-100 text-zinc-800"
                        )}
                        title={`${event.title} (${event.status})`}
                      >
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          STATUS_COLOR_DOTS[event.status] || "bg-zinc-400"
                        )}></span>
                        <span className="truncate">{event.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Event Modal */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#FAF9F5] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-[#EAE6DF] text-zinc-950">
            <div className="px-6 py-4 border-b border-[#F0ECE5] flex items-center justify-between bg-white">
              <div>
                <h2 className="text-base font-bold text-zinc-900">
                  {editingEvent ? "Edit Scheduled Event" : "Schedule New Event"}
                </h2>
                <p className="text-xs text-zinc-500">
                  {editingEvent ? `Event ID: ${editingEvent.id}` : `Date Selected: ${eventForm.date}`}
                </p>
              </div>
              <button 
                onClick={() => setIsEventModalOpen(false)} 
                className="text-zinc-400 hover:text-zinc-600 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
              {/* Select Market Venue */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Market Venue *</label>
                <select
                  value={eventForm.marketId}
                  onChange={(e) => setEventForm({ ...eventForm, marketId: e.target.value })}
                  className="w-full bg-white border border-[#EAE6DF] rounded-xl px-3.5 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#2d3a22]"
                  required
                >
                  {markets.map(market => (
                    <option key={market.id} value={market.id}>{market.name} ({market.type})</option>
                  ))}
                </select>
              </div>

              {/* Event Title */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Event Title *</label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder="e.g. Saturday Holiday Market"
                  className="w-full bg-white border border-[#EAE6DF] rounded-xl px-3.5 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#2d3a22]"
                  required
                />
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="isMultiDay"
                  checked={eventForm.isMultiDay}
                  onChange={(e) => setEventForm({ ...eventForm, isMultiDay: e.target.checked, endDate: e.target.checked ? eventForm.date : "" })}
                  className="rounded border-[#EAE6DF] text-[#2d3a22] focus:ring-[#2d3a22] w-4 h-4 cursor-pointer"
                />
                <label htmlFor="isMultiDay" className="text-xs font-bold text-zinc-600 cursor-pointer select-none">
                  Multi-day event (spans multiple days)
                </label>
              </div>

              {/* Date and Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">
                    {eventForm.isMultiDay ? "Start Date" : "Event Date"}
                  </label>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      setEventForm((prev) => ({
                        ...prev,
                        date: newDate,
                        endDate: prev.isMultiDay && (!prev.endDate || prev.endDate < newDate) ? newDate : prev.endDate
                      }));
                    }}
                    className="w-full bg-white border border-[#EAE6DF] rounded-xl px-3.5 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#2d3a22]"
                    required
                  />
                </div>

                {eventForm.isMultiDay ? (
                  <div className="space-y-1 animate-in slide-in-from-left-2 duration-100">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">End Date</label>
                    <input
                      type="date"
                      value={eventForm.endDate}
                      min={eventForm.date}
                      onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })}
                      className="w-full bg-white border border-[#EAE6DF] rounded-xl px-3.5 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#2d3a22]"
                      required
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Event Status</label>
                    <select
                      value={eventForm.status}
                      onChange={(e) => setEventForm({ ...eventForm, status: e.target.value as any })}
                      className="w-full bg-white border border-[#EAE6DF] rounded-xl px-3.5 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#2d3a22]"
                    >
                      {Object.keys(STATUS_COLOR_DOTS).map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {eventForm.isMultiDay && (
                <div className="space-y-1 animate-in slide-in-from-top-2 duration-100">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Event Status</label>
                  <select
                    value={eventForm.status}
                    onChange={(e) => setEventForm({ ...eventForm, status: e.target.value as any })}
                    className="w-full bg-white border border-[#EAE6DF] rounded-xl px-3.5 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#2d3a22]"
                  >
                    {Object.keys(STATUS_COLOR_DOTS).map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Finances */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Revenue ($)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-400" />
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={eventForm.revenue}
                      onChange={(e) => setEventForm({ ...eventForm, revenue: e.target.value })}
                      className="w-full bg-white border border-[#EAE6DF] rounded-xl pl-8 pr-3.5 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#2d3a22]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Expenses ($)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-400" />
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={eventForm.expenses}
                      onChange={(e) => setEventForm({ ...eventForm, expenses: e.target.value })}
                      className="w-full bg-white border border-[#EAE6DF] rounded-xl pl-8 pr-3.5 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#2d3a22]"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Event Notes</label>
                <textarea
                  value={eventForm.notes}
                  onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
                  placeholder="e.g. Booth location, coordinates, or parking rules"
                  rows={2}
                  className="w-full bg-white border border-[#EAE6DF] rounded-xl px-3.5 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#2d3a22]"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#F0ECE5]">
                {editingEvent ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(editingEvent.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg transition-colors border border-red-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Event
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEventModalOpen(false)}
                    className="px-4 py-2 text-zinc-600 hover:text-zinc-800 font-semibold text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#2d3a22] hover:bg-[#3d4f2f] text-white font-semibold text-sm rounded-xl shadow-md transition-all"
                  >
                    {editingEvent ? "Save Changes" : "Schedule Event"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
