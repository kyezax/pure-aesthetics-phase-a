import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarInitials } from "@/components/ui/avatar";
import LoadingSpinner from "../ui/LoadingSpinner";
import { toast } from "sonner";

const TimelyDashboard = () => {
  const { user, isStaff } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedStaff, setSelectedStaff] = useState("all");
  const [appointments, setAppointments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calendarView, setCalendarView] = useState("day"); // day, week, month

  useEffect(() => {
    fetchDashboardData();
  }, [currentDate, selectedStaff, calendarView]);

  const fetchDashboardData = async () => {
    try {
      const [appointmentsRes, staffRes, statsRes] = await Promise.allSettled([
        axios.get("/appointments/calendar", {
          params: {
            start_date: getStartDate().toISOString(),
            end_date: getEndDate().toISOString()
          }
        }),
        axios.get("/staff"),
        isStaff ? axios.get("/dashboard/stats") : Promise.resolve({ data: {} })
      ]);

      if (appointmentsRes.status === "fulfilled") {
        setAppointments(appointmentsRes.value.data);
      }
      if (staffRes.status === "fulfilled") {
        setStaff(staffRes.value.data);
      }
      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value.data);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = () => {
    const start = new Date(currentDate);
    if (calendarView === "week") {
      start.setDate(currentDate.getDate() - currentDate.getDay());
    } else if (calendarView === "month") {
      start.setDate(1);
    }
    start.setHours(0, 0, 0, 0);
    return start;
  };

  const getEndDate = () => {
    const end = new Date(currentDate);
    if (calendarView === "day") {
      end.setDate(currentDate.getDate() + 1);
    } else if (calendarView === "week") {
      end.setDate(currentDate.getDate() - currentDate.getDay() + 7);
    } else if (calendarView === "month") {
      end.setMonth(currentDate.getMonth() + 1, 0);
    }
    end.setHours(23, 59, 59, 999);
    return end;
  };

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    if (calendarView === "day") {
      newDate.setDate(currentDate.getDate() + (direction === "next" ? 1 : -1));
    } else if (calendarView === "week") {
      newDate.setDate(currentDate.getDate() + (direction === "next" ? 7 : -7));
    } else if (calendarView === "month") {
      newDate.setMonth(currentDate.getMonth() + (direction === "next" ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const formatDateHeader = () => {
    if (calendarView === "day") {
      return currentDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
      });
    } else if (calendarView === "week") {
      const weekStart = getStartDate();
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };

  const getFilteredAppointments = () => {
    if (selectedStaff === "all") return appointments;
    return appointments.filter(apt => apt.extendedProps?.staff_id === selectedStaff);
  };

  const getTodayStats = () => {
    const today = new Date().toDateString();
    const todayAppointments = appointments.filter(apt => 
      new Date(apt.start).toDateString() === today
    );
    
    return {
      total: todayAppointments.length,
      completed: todayAppointments.filter(apt => apt.extendedProps?.status === "completed").length,
      upcoming: todayAppointments.filter(apt => apt.extendedProps?.status === "scheduled").length,
      revenue: todayAppointments
        .filter(apt => apt.extendedProps?.status === "completed")
        .reduce((sum, apt) => sum + (apt.extendedProps?.amount || 0), 0)
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const todayStats = getTodayStats();
  const filteredAppointments = getFilteredAppointments();

  return (
    <div className="min-h-screen bg-gray-50" data-testid="timely-dashboard">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
            
            {/* Date Navigation */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate("prev")}
                data-testid="prev-date-btn"
              >
                ←
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentDate(new Date())}
                data-testid="today-btn"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate("next")}
                data-testid="next-date-btn"
              >
                →
              </Button>
              <span className="text-lg font-medium text-gray-700 ml-4">
                {formatDateHeader()}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* View Selector */}
            <Select value={calendarView} onValueChange={setCalendarView}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>

            {/* Staff Filter */}
            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                {staff.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.first_name} {member.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Quick Actions */}
            <Button
              onClick={() => window.location.href = "/booking"}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="new-appointment-btn"
            >
              + New Appointment
            </Button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar - Today's Overview */}
        <div className="w-80 bg-white border-r border-gray-200 h-screen overflow-y-auto">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Overview</h2>
            
            {/* Today's Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{todayStats.total}</div>
                <div className="text-sm text-blue-600">Appointments</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{todayStats.completed}</div>
                <div className="text-sm text-green-600">Completed</div>
              </div>
            </div>

            {/* Staff List */}
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-900 mb-3">Staff</h3>
              <div className="space-y-2">
                {staff.map((member) => {
                  const memberAppointments = appointments.filter(apt => 
                    apt.extendedProps?.staff_id === member.id &&
                    new Date(apt.start).toDateString() === new Date().toDateString()
                  );
                  
                  return (
                    <div
                      key={member.id}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedStaff === member.id ? 'bg-blue-100' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedStaff(member.id)}
                      data-testid={`staff-${member.id}`}
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-gray-200 text-gray-600">
                            {member.first_name[0]}{member.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-gray-900">
                            {member.first_name} {member.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {memberAppointments.length} appointments
                          </div>
                        </div>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${
                        memberAppointments.length > 0 ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.location.href = "/admin/clients"}
              >
                👥 Client Management
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.location.href = "/admin/marketing"}
              >
                📧 Marketing
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.location.href = "/admin/forms"}
              >
                📋 Consultation Forms
              </Button>
            </div>
          </div>
        </div>

        {/* Main Calendar Area */}
        <div className="flex-1 p-6">
          {calendarView === "day" && <DayView appointments={filteredAppointments} currentDate={currentDate} />}
          {calendarView === "week" && <WeekView appointments={filteredAppointments} currentDate={currentDate} />}
          {calendarView === "month" && <MonthView appointments={filteredAppointments} currentDate={currentDate} />}
        </div>
      </div>
    </div>
  );
};

// Day View Component
const DayView = ({ appointments, currentDate }) => {
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM
  
  const getAppointmentsForHour = (hour) => {
    return appointments.filter(apt => {
      const startHour = new Date(apt.start).getHours();
      return startHour === hour;
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200" data-testid="day-view">
      <div className="border-b border-gray-200 p-4">
        <h3 className="text-lg font-semibold">
          {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </h3>
      </div>
      
      <div className="divide-y divide-gray-100">
        {hours.map(hour => {
          const hourAppointments = getAppointmentsForHour(hour);
          const timeString = `${hour === 12 ? 12 : hour % 12}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
          
          return (
            <div key={hour} className="flex min-h-[80px]">
              <div className="w-20 p-4 text-right text-sm text-gray-500 bg-gray-50">
                {timeString}
              </div>
              <div className="flex-1 p-4 relative">
                {hourAppointments.length > 0 ? (
                  <div className="space-y-2">
                    {hourAppointments.map(apt => (
                      <AppointmentCard key={apt.id} appointment={apt} />
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center text-gray-400 text-sm">
                    Available
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Week View Component  
const WeekView = ({ appointments, currentDate }) => {
  const weekDays = [];
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
  
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    weekDays.push(day);
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200" data-testid="week-view">
      <div className="grid grid-cols-8 border-b border-gray-200">
        <div className="p-4"></div>
        {weekDays.map((day, index) => (
          <div key={index} className="p-4 text-center border-l border-gray-200">
            <div className="font-medium text-gray-900">
              {day.toLocaleDateString('en-US', { weekday: 'short' })}
            </div>
            <div className="text-sm text-gray-500">
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-8 divide-x divide-gray-100">
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="h-16 p-2 text-right text-xs text-gray-500">
              {i + 8}:00
            </div>
          ))}
        </div>
        
        {weekDays.map((day, dayIndex) => (
          <div key={dayIndex} className="divide-y divide-gray-100">
            {Array.from({ length: 10 }, (_, hourIndex) => {
              const hour = hourIndex + 8;
              const dayAppointments = appointments.filter(apt => {
                const aptDate = new Date(apt.start);
                return aptDate.toDateString() === day.toDateString() && 
                       aptDate.getHours() === hour;
              });

              return (
                <div key={hourIndex} className="h-16 p-1 relative">
                  {dayAppointments.map(apt => (
                    <AppointmentCard key={apt.id} appointment={apt} compact />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

// Month View Component
const MonthView = ({ appointments, currentDate }) => {
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - monthStart.getDay());

  const days = [];
  for (let i = 0; i < 42; i++) {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    days.push(day);
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200" data-testid="month-view">
      <div className="grid grid-cols-7 border-b border-gray-200">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-4 text-center font-medium text-gray-700 border-r border-gray-200 last:border-r-0">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const dayAppointments = appointments.filter(apt => 
            new Date(apt.start).toDateString() === day.toDateString()
          );

          return (
            <div
              key={index}
              className={`min-h-[120px] p-2 border-r border-b border-gray-200 ${
                !isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
              }`}
            >
              <div className="font-medium mb-2">{day.getDate()}</div>
              <div className="space-y-1">
                {dayAppointments.slice(0, 3).map(apt => (
                  <AppointmentCard key={apt.id} appointment={apt} minimal />
                ))}
                {dayAppointments.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{dayAppointments.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Appointment Card Component
const AppointmentCard = ({ appointment, compact = false, minimal = false }) => {
  const startTime = new Date(appointment.start).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 border-green-300 text-green-800';
      case 'confirmed': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'cancelled': return 'bg-red-100 border-red-300 text-red-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  if (minimal) {
    return (
      <div
        className={`text-xs p-1 rounded border-l-2 ${getStatusColor(appointment.extendedProps?.status)}`}
        style={{ borderLeftColor: appointment.backgroundColor }}
        data-testid={`appointment-${appointment.id}`}
      >
        <div className="truncate font-medium">
          {appointment.extendedProps?.client_name}
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div
        className={`text-xs p-2 rounded border ${getStatusColor(appointment.extendedProps?.status)}`}
        style={{ backgroundColor: appointment.backgroundColor + '20' }}
        data-testid={`appointment-${appointment.id}`}
      >
        <div className="font-medium truncate">
          {appointment.extendedProps?.client_name}
        </div>
        <div className="text-gray-600">
          {appointment.extendedProps?.service_name}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-3 rounded-lg border-l-4 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer ${getStatusColor(appointment.extendedProps?.status)}`}
      style={{ borderLeftColor: appointment.backgroundColor }}
      data-testid={`appointment-${appointment.id}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="font-semibold text-gray-900 mb-1">
            {appointment.extendedProps?.client_name}
          </div>
          <div className="text-sm text-gray-600 mb-1">
            {appointment.extendedProps?.service_name}
          </div>
          <div className="text-xs text-gray-500">
            {startTime} • {appointment.extendedProps?.client_phone}
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          {appointment.extendedProps?.status}
        </Badge>
      </div>
    </div>
  );
};

export default TimelyDashboard;