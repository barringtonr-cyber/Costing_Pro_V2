import React, { useState, useEffect } from "react";
import { 
  MapPin, 
  Phone, 
  User, 
  Calendar as CalendarIcon, 
  Plus, 
  Search, 
  Star, 
  Trash2, 
  Edit3, 
  X, 
  DollarSign, 
  ChevronRight,
  TrendingUp,
  SlidersHorizontal,
  Info
} from "lucide-react";
import { api, Market, MarketEvent } from "../api";
import { cn } from "../lib/utils";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "../context/AdminContext";
import { useAuth } from "../context/AuthContext";

const MARKET_TYPES = [
  "Farmers Market",
  "Craft Fair",
  "Flea Market",
  "Festival",
  "Holiday Market",
  "Trade Show",
  "Other"
];

const STATUS_OPTIONS: ("Active" | "Inactive" | "Archived")[] = ["Active", "Inactive", "Archived"];

const EVENT_STATUSES = [
  "Confirmed",
  "Waitlisted",
  "Completed",
  "Cancelled",
  "Deadline"
];

export default function Markets() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showAllData } = useAdmin();
  const isAdmin = user?.role === "admin";
  const effectiveAll = showAllData && isAdmin;

  const [markets, setMarkets] = useState<Market[]>([]);
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All Types");
  const [selectedRating, setSelectedRating] = useState("All Ratings");
  const [activeTab, setActiveTab] = useState<"Active" | "Inactive" | "Archived">("Active");

  // Add/Edit Market Modal state
  const [isMarketModalOpen, setIsMarketModalOpen] = useState(false);
  const [editingMarket, setEditingMarket] = useState<Market | null>(null);
  const [marketForm, setMarketForm] = useState({
    name: "",
    type: "Farmers Market",
    address: "",
    contactName: "",
    phone: "",
    status: "Active" as "Active" | "Inactive" | "Archived",
    rating: 5
  });

  // Selected Market Detail Drawer/Modal State
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<MarketEvent | null>(null);
  const [eventForm, setEventForm] = useState({
    title: "",
    date: new Date().toISOString().split("T")[0],
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
      console.error("Error fetching markets or events:", err);
      showNotification("Failed to load markets data.", "error");
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Open Market Form for Create
  const handleOpenAddMarket = () => {
    setEditingMarket(null);
    setMarketForm({
      name: "",
      type: "Farmers Market",
      address: "",
      contactName: "",
      phone: "",
      status: "Active",
      rating: 5
    });
    setIsMarketModalOpen(true);
  };

  // Open Market Form for Edit
  const handleOpenEditMarket = (market: Market, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingMarket(market);
    setMarketForm({
      name: market.name,
      type: market.type,
      address: market.address || "",
      contactName: market.contactName || "",
      phone: market.phone || "",
      status: market.status,
      rating: market.rating || 5
    });
    setIsMarketModalOpen(true);
  };

  // Save/Update Market Venue
  const handleSaveMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marketForm.name.trim()) {
      showNotification("Market Name is required.", "error");
      return;
    }

    try {
      if (editingMarket) {
        await api.updateMarket(editingMarket.id, marketForm);
        showNotification("Market venue updated successfully!", "success");
      } else {
        await api.addMarket(marketForm);
        showNotification("New Market venue added!", "success");
      }
      setIsMarketModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      showNotification("Failed to save market.", "error");
    }
  };

  // Delete Market
  const handleDeleteMarket = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this market venue? All associated events will remain in calendar but unlinked.")) {
      return;
    }

    try {
      await api.deleteMarket(id);
      showNotification("Market venue deleted.", "success");
      if (selectedMarket?.id === id) {
        setSelectedMarket(null);
      }
      fetchData();
    } catch (err) {
      console.error(err);
      showNotification("Error deleting market.", "error");
    }
  };

  // Open Event Modal (Create)
  const handleOpenAddEvent = () => {
    if (!selectedMarket) return;
    setEditingEvent(null);
    setEventForm({
      title: `${selectedMarket.name} Event`,
      date: new Date().toISOString().split("T")[0],
      isMultiDay: false,
      endDate: "",
      status: "Confirmed",
      revenue: "0",
      expenses: "0",
      notes: ""
    });
    setIsEventModalOpen(true);
  };

  // Open Event Modal (Edit)
  const handleOpenEditEvent = (event: MarketEvent) => {
    setEditingEvent(event);
    const hasEndDate = !!(event.endDate && event.endDate !== event.date);
    setEventForm({
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

  // Save/Update Event
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMarket) return;
    if (!eventForm.title.trim()) {
      showNotification("Event title is required.", "error");
      return;
    }

    const payload = {
      marketId: selectedMarket.id,
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

  // Delete Event
  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this event?")) {
      return;
    }
    try {
      await api.deleteMarketEvent(id);
      showNotification("Event deleted successfully.", "success");
      fetchData();
    } catch (err) {
      console.error(err);
      showNotification("Failed to delete event.", "error");
    }
  };

  // Helper calculation functions for each market card
  const getMarketStats = (marketId: string) => {
    const marketEvents = events.filter(e => e.marketId === marketId);
    const revenue = marketEvents.reduce((sum, e) => sum + (e.revenue || 0), 0);
    const expenses = marketEvents.reduce((sum, e) => sum + (e.expenses || 0), 0);
    const net = revenue - expenses;
    
    // Sort events by date to find the last one
    const sortedEvents = [...marketEvents].sort((a, b) => b.date.localeCompare(a.date));
    const lastEventDate = sortedEvents.length > 0 ? sortedEvents[0].date : null;

    return {
      eventCount: marketEvents.length,
      revenue,
      expenses,
      net,
      lastEventDate
    };
  };

  // Filtering Markets
  const filteredMarkets = markets.filter(market => {
    const matchesSearch = market.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (market.address && market.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (market.contactName && market.contactName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = selectedType === "All Types" || market.type === selectedType;

    const ratingNum = parseInt(selectedRating);
    const matchesRating = selectedRating === "All Ratings" || market.rating === ratingNum;

    const matchesStatus = market.status === activeTab;

    return matchesSearch && matchesType && matchesRating && matchesStatus;
  });

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

      {/* Hero Header exactly matching screenshot style */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EAE6DF] pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 font-sans">Markets</h1>
          <p className="text-sm text-zinc-500 mt-1">Track your selling venues and events</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/markets/calendar")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#EAE6DF] rounded-lg text-zinc-700 hover:bg-zinc-50 transition-colors text-sm font-medium shadow-sm"
          >
            <CalendarIcon className="w-4 h-4 text-zinc-500" />
            Calendar
          </button>
          <button
            onClick={handleOpenAddMarket}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#2d3a22] text-[#FAF9F5] rounded-lg hover:bg-[#3d4f2f] transition-all text-sm font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Market
          </button>
        </div>
      </div>

      {/* Filter Options exactly matching Layout 1 */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-white p-4 rounded-xl border border-[#EAE6DF] shadow-sm">
        <div className="flex flex-1 flex-col sm:flex-row gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search markets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 w-full bg-[#FAF9F5] border border-[#EAE6DF] rounded-lg text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 placeholder:text-zinc-400"
            />
          </div>

          {/* Types Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="appearance-none bg-[#FAF9F5] border border-[#EAE6DF] rounded-lg pl-3 pr-8 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 cursor-pointer w-full sm:w-48"
            >
              <option value="All Types">All Types</option>
              {MARKET_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-zinc-400">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Ratings Filter Dropdown */}
          <div className="relative">
            <select
              value={selectedRating}
              onChange={(e) => setSelectedRating(e.target.value)}
              className="appearance-none bg-[#FAF9F5] border border-[#EAE6DF] rounded-lg pl-3 pr-8 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 cursor-pointer w-full sm:w-40"
            >
              <option value="All Ratings">All Ratings</option>
              {[5, 4, 3, 2, 1].map(num => (
                <option key={num} value={num.toString()}>{num} Stars</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-zinc-400">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            </div>
          </div>
        </div>

        {/* Active/Inactive/Archived Tab switcher */}
        <div className="flex bg-[#FAF9F5] p-1 rounded-lg border border-[#EAE6DF] self-start md:self-auto shadow-inner">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              onClick={() => setActiveTab(status)}
              className={cn(
                "px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-150",
                activeTab === status
                  ? "bg-white text-zinc-900 shadow-sm border border-[#EAE6DF]/60"
                  : "text-zinc-500 hover:text-zinc-800"
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-[#EAE6DF]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#2d3a22]"></div>
        </div>
      ) : filteredMarkets.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#EAE6DF] p-6">
          <div className="w-16 h-16 mx-auto bg-zinc-50 rounded-full flex items-center justify-center text-zinc-400 mb-4 border border-zinc-100 shadow-sm">
            <MapPin className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-zinc-800">No Markets Found</h3>
          <p className="text-sm text-zinc-400 mt-1 max-w-md mx-auto">
            {searchQuery || selectedType !== "All Types" || selectedRating !== "All Ratings"
              ? "We couldn't find any markets matching your current filter criteria."
              : "Set up your market selling locations, keep record of contact persons, and schedule dates on your selling calendar."}
          </p>
          {(searchQuery || selectedType !== "All Types" || selectedRating !== "All Ratings") ? (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedType("All Types");
                setSelectedRating("All Ratings");
              }}
              className="mt-4 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-semibold transition-colors"
            >
              Reset Filters
            </button>
          ) : (
            <button
              onClick={handleOpenAddMarket}
              className="mt-4 px-4 py-2 bg-[#2d3a22] text-[#FAF9F5] rounded-lg text-xs font-semibold hover:bg-[#3d4f2f] transition-all"
            >
              Create Your First Venue
            </button>
          )}
        </div>
      ) : (
        /* Market Grid layout as shown in Screenshot 1 */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredMarkets.map((market) => {
            const stats = getMarketStats(market.id);
            return (
              <div 
                key={market.id}
                className="bg-white border border-[#EAE6DF] hover:border-zinc-300 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group cursor-pointer"
                onClick={() => setSelectedMarket(market)}
              >
                {/* Header Section */}
                <div className="p-6 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900 group-hover:text-[#2d3a22] transition-colors">{market.name}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#FAF9F5] border border-[#EAE6DF] text-zinc-600">
                          {market.type}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-zinc-500 font-medium">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            market.status === "Active" ? "bg-emerald-500" : market.status === "Inactive" ? "bg-amber-400" : "bg-zinc-400"
                          )}></span>
                          {market.status}
                        </span>
                      </div>
                    </div>
                    {/* Action buttons inside card */}
                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleOpenEditMarket(market, e)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-800 rounded-md hover:bg-zinc-50 transition-all"
                        title="Edit Venue"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteMarket(market.id, e)}
                        className="p-1.5 text-zinc-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-all"
                        title="Delete Venue"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Rating Stars and Event Summary info */}
                  <div className="flex items-center justify-between text-xs text-zinc-500 mt-5 border-t border-zinc-100 pt-3">
                    <div className="flex items-center gap-1.5">
                      <CalendarIcon className="w-4 h-4 text-zinc-400" />
                      <span>{stats.eventCount} events</span>
                      {market.rating ? (
                        <div className="flex items-center gap-0.5 ml-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={cn(
                                "w-3 h-3", 
                                i < market.rating ? "text-amber-500 fill-amber-500" : "text-zinc-200"
                              )} 
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="text-zinc-400 font-medium text-[11px]">
                      {stats.lastEventDate ? `Last: ${stats.lastEventDate}` : "No scheduled events"}
                    </div>
                  </div>
                </div>

                {/* Financial Summary Table (matches Screenshot 1 visual) */}
                <div className="mx-6 mb-6">
                  <div className="grid grid-cols-3 bg-[#FAF9F5] border border-[#EAE6DF] rounded-xl overflow-hidden py-3 text-center">
                    <div className="border-r border-[#EAE6DF]/60 px-2">
                      <div className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase">Revenue</div>
                      <div className="text-sm font-bold text-zinc-800 mt-0.5">${stats.revenue.toFixed(2)}</div>
                    </div>
                    <div className="border-r border-[#EAE6DF]/60 px-2">
                      <div className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase">Expenses</div>
                      <div className="text-sm font-bold text-zinc-800 mt-0.5">${stats.expenses.toFixed(2)}</div>
                    </div>
                    <div className="px-2">
                      <div className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase">Net</div>
                      <div className={cn(
                        "text-sm font-bold mt-0.5",
                        stats.net >= 0 ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {stats.net < 0 ? "-" : ""}${Math.abs(stats.net).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Bottom View Details Link inside card */}
                  <button 
                    className="w-full py-2 bg-white border border-[#EAE6DF] hover:bg-zinc-50 text-zinc-700 text-xs font-semibold rounded-xl transition-all duration-150 shadow-sm mt-3 group-hover:border-zinc-300 flex items-center justify-center gap-1"
                  >
                    View Details
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Market Create / Edit Modal */}
      {isMarketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#FAF9F5] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-[#EAE6DF] text-zinc-950">
            <div className="px-6 py-4 border-b border-[#F0ECE5] flex items-center justify-between bg-white">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">{editingMarket ? "Edit Market Venue" : "Create Market Venue"}</h2>
                <p className="text-xs text-zinc-500">Enter physical location details and contacts</p>
              </div>
              <button 
                onClick={() => setIsMarketModalOpen(false)} 
                className="text-zinc-400 hover:text-zinc-600 transition-colors p-1 rounded-full hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMarket} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Venue Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Downtown Farmers Market"
                  value={marketForm.name}
                  onChange={(e) => setMarketForm({ ...marketForm, name: e.target.value })}
                  className="w-full bg-white border border-[#EAE6DF] rounded-xl px-3.5 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#2d3a22]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Market Type</label>
                  <select
                    value={marketForm.type}
                    onChange={(e) => setMarketForm({ ...marketForm, type: e.target.value })}
                    className="w-full bg-white border border-[#EAE6DF] rounded-xl px-3.5 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#2d3a22]"
                  >
                    {MARKET_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Venue Status</label>
                  <select
                    value={marketForm.status}
                    onChange={(e) => setMarketForm({ ...marketForm, status: e.target.value as any })}
                    className="w-full bg-white border border-[#EAE6DF] rounded-xl px-3.5 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#2d3a22]"
                  >
                    {STATUS_OPTIONS.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Full Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Street Address, City, State, ZIP"
                    value={marketForm.address}
                    onChange={(e) => setMarketForm({ ...marketForm, address: e.target.value })}
                    className="w-full bg-white border border-[#EAE6DF] rounded-xl pl-10 pr-3.5 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#2d3a22]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Contact Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Coordinator Name"
                      value={marketForm.contactName}
                      onChange={(e) => setMarketForm({ ...marketForm, contactName: e.target.value })}
                      className="w-full bg-white border border-[#EAE6DF] rounded-xl pl-10 pr-3.5 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#2d3a22]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Coordinator Phone"
                      value={marketForm.phone}
                      onChange={(e) => setMarketForm({ ...marketForm, phone: e.target.value })}
                      className="w-full bg-white border border-[#EAE6DF] rounded-xl pl-10 pr-3.5 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#2d3a22]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide block">Market Rating</label>
                <div className="flex items-center gap-1.5 mt-1 bg-white p-2 border border-[#EAE6DF] rounded-xl w-max">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMarketForm({ ...marketForm, rating: num })}
                      className="p-1 hover:scale-110 transition-transform text-amber-500"
                    >
                      <Star className={cn(
                        "w-5 h-5",
                        num <= marketForm.rating ? "fill-amber-500 text-amber-500" : "text-zinc-300"
                      )} />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-zinc-500 ml-2">{marketForm.rating} Stars</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F0ECE5]">
                <button
                  type="button"
                  onClick={() => setIsMarketModalOpen(false)}
                  className="px-4 py-2 text-zinc-600 hover:text-zinc-800 font-semibold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#2d3a22] hover:bg-[#3d4f2f] text-white font-semibold text-sm rounded-xl shadow-md transition-all"
                >
                  {editingMarket ? "Update Venue" : "Add Venue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Market Details Overlay / Scheduled Events Drawer */}
      {selectedMarket && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-150">
          <div className="bg-[#FAF9F5] w-full max-w-2xl h-full shadow-2xl border-l border-[#EAE6DF] flex flex-col justify-between text-zinc-950 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-[#F0ECE5] bg-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-zinc-900">{selectedMarket.name}</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#FAF9F5] border border-[#EAE6DF] text-zinc-500 font-medium">
                    {selectedMarket.type}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                  {selectedMarket.address || "No address provided"}
                </p>
              </div>
              <button 
                onClick={() => setSelectedMarket(null)} 
                className="text-zinc-400 hover:text-zinc-600 transition-colors p-1 rounded-full hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Contact Information Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-[#EAE6DF] space-y-1">
                  <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Contact Person</div>
                  <div className="text-sm font-semibold text-zinc-800 flex items-center gap-1.5 pt-1">
                    <User className="w-4 h-4 text-[#2d3a22]" />
                    {selectedMarket.contactName || "No contact name"}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#EAE6DF] space-y-1">
                  <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Phone number</div>
                  <div className="text-sm font-semibold text-[#2d3a22] flex items-center gap-1.5 pt-1">
                    <Phone className="w-4 h-4 text-[#2d3a22]" />
                    {selectedMarket.phone || "No phone number"}
                  </div>
                </div>
              </div>

              {/* Financial Stats Summary Header inside detail */}
              <div className="bg-[#FAF9F5] p-5 rounded-2xl border border-zinc-200 shadow-sm">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Overall Finances</h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-[10px] text-zinc-400 font-medium block">REVENUE</span>
                    <span className="text-lg font-extrabold text-zinc-900">${getMarketStats(selectedMarket.id).revenue.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 font-medium block">EXPENSES</span>
                    <span className="text-lg font-extrabold text-zinc-900">${getMarketStats(selectedMarket.id).expenses.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 font-medium block">NET PROFIT</span>
                    <span className={cn(
                      "text-lg font-extrabold block",
                      getMarketStats(selectedMarket.id).net >= 0 ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {getMarketStats(selectedMarket.id).net < 0 ? "-" : ""}${Math.abs(getMarketStats(selectedMarket.id).net).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Scheduled Events Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider">Scheduled Events</h3>
                  <button
                    onClick={handleOpenAddEvent}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2d3a22] hover:bg-[#3d4f2f] text-white text-xs font-semibold rounded-lg transition-all shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Event
                  </button>
                </div>

                {events.filter(e => e.marketId === selectedMarket.id).length === 0 ? (
                  <div className="bg-white rounded-xl border border-dashed border-[#EAE6DF] p-8 text-center">
                    <CalendarIcon className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                    <p className="text-xs text-zinc-500 font-medium">No events scheduled for this venue yet.</p>
                    <button
                      onClick={handleOpenAddEvent}
                      className="mt-3 text-xs text-[#2d3a22] font-semibold hover:underline"
                    >
                      Schedule your first event
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {events
                      .filter(e => e.marketId === selectedMarket.id)
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((event) => (
                        <div 
                          key={event.id}
                          className="bg-white border border-[#EAE6DF] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm relative group hover:border-zinc-300 transition-colors"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-zinc-800">{event.title}</h4>
                              <span className={cn(
                                "text-[10px] px-2 py-0.5 rounded-full font-semibold",
                                event.status === "Confirmed" ? "bg-emerald-50 text-emerald-800 border border-emerald-100" :
                                event.status === "Waitlisted" ? "bg-rose-50 text-rose-800 border border-rose-100" :
                                event.status === "Completed" ? "bg-zinc-100 text-zinc-800 border border-zinc-200" :
                                event.status === "Cancelled" ? "bg-red-50 text-red-800 border border-red-100" :
                                "bg-amber-50 text-amber-800 border border-amber-100" // Deadline
                              )}>
                                {event.status}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400 font-medium flex items-center gap-1">
                              <CalendarIcon className="w-3.5 h-3.5" />
                              {event.date}{event.endDate && event.endDate !== event.date ? ` to ${event.endDate}` : ""}
                            </p>
                            {event.notes && (
                              <p className="text-xs text-zinc-500 italic bg-zinc-50 p-1.5 rounded border border-zinc-100">
                                "{event.notes}"
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-0 pt-3 sm:pt-0 border-zinc-100">
                            {/* Finances per event */}
                            <div className="text-right space-y-0.5">
                              <div className="text-[10px] text-zinc-400 font-bold uppercase">Event Net</div>
                              <div className={cn(
                                "text-sm font-extrabold",
                                (event.revenue - event.expenses) >= 0 ? "text-emerald-600" : "text-rose-600"
                              )}>
                                ${(event.revenue - event.expenses).toFixed(2)}
                              </div>
                              <div className="text-[9px] text-zinc-400">
                                Rev: ${event.revenue} | Exp: ${event.expenses}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleOpenEditEvent(event)}
                                className="p-1.5 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-50 rounded"
                                title="Edit Event"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteEvent(event.id)}
                                className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded"
                                title="Delete Event"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Close footer */}
            <div className="p-4 bg-white border-t border-[#F0ECE5] text-right">
              <button
                onClick={() => setSelectedMarket(null)}
                className="px-5 py-2 bg-zinc-800 hover:bg-zinc-900 text-white rounded-lg text-sm font-semibold transition-all"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Event Modal */}
      {isEventModalOpen && selectedMarket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#FAF9F5] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-[#EAE6DF] text-zinc-950">
            <div className="px-6 py-4 border-b border-[#F0ECE5] flex items-center justify-between bg-white">
              <div>
                <h2 className="text-base font-bold text-zinc-900">
                  {editingEvent ? "Edit Event Details" : "Schedule New Event"}
                </h2>
                <p className="text-xs text-zinc-500">For {selectedMarket.name}</p>
              </div>
              <button 
                onClick={() => setIsEventModalOpen(false)} 
                className="text-zinc-400 hover:text-zinc-600 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Event Title *</label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder="e.g. Saturday Stand Event"
                  className="w-full bg-white border border-[#EAE6DF] rounded-xl px-3.5 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#2d3a22]"
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
                      {EVENT_STATUSES.map(status => (
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
                    {EVENT_STATUSES.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              )}

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

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Notes & Comments</label>
                <textarea
                  value={eventForm.notes}
                  onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
                  placeholder="e.g. Booth #14, extremely cold weather but great foot traffic"
                  rows={2}
                  className="w-full bg-white border border-[#EAE6DF] rounded-xl px-3.5 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#2d3a22]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#F0ECE5]">
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
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
