import React, { useState, useEffect } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoadingSpinner from "../ui/LoadingSpinner";
import { toast } from "sonner";

const AdminPanel = () => {
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [appointmentsRes, statsRes] = await Promise.all([
        axios.get("/appointments"),
        axios.get("/dashboard/stats")
      ]);

      setAppointments(appointmentsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId, newStatus) => {
    try {
      await axios.put(`/appointments/${appointmentId}/status?status=${newStatus}`);
      
      // Update local state
      setAppointments(appointments.map(apt => 
        apt.id === appointmentId 
          ? { ...apt, status: newStatus }
          : apt
      ));
      
      toast.success("Appointment status updated successfully");
    } catch (error) {
      console.error("Failed to update appointment status:", error);
      toast.error("Failed to update appointment status");
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "scheduled":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-purple-100 text-purple-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "no_show":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDateTime = (dateTime) => {
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getStatusActions = (currentStatus) => {
    const statusFlow = {
      "scheduled": ["confirmed", "cancelled"],
      "confirmed": ["in_progress", "cancelled", "no_show"],
      "in_progress": ["completed"],
      "completed": [],
      "cancelled": [],
      "no_show": []
    };

    return statusFlow[currentStatus] || [];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const todayAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.scheduled_at).toDateString();
    const today = new Date().toDateString();
    return aptDate === today;
  });

  const upcomingAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.scheduled_at);
    const today = new Date();
    return aptDate > today && apt.status !== "cancelled";
  });

  return (
    <div className="min-h-screen py-8 px-4" data-testid="admin-panel">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600">
            Manage appointments, clients, and business operations
          </p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card data-testid="admin-stats-today">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
                <div className="h-4 w-4 text-muted-foreground">📅</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.today_appointments}</div>
                <p className="text-xs text-muted-foreground">
                  {todayAppointments.filter(apt => apt.status === "completed").length} completed
                </p>
              </CardContent>
            </Card>

            <Card data-testid="admin-stats-week">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
                <div className="h-4 w-4 text-muted-foreground">📊</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.week_appointments}</div>
                <p className="text-xs text-muted-foreground">Total appointments</p>
              </CardContent>
            </Card>

            <Card data-testid="admin-stats-clients">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <div className="h-4 w-4 text-muted-foreground">👥</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_clients}</div>
                <p className="text-xs text-muted-foreground">Registered users</p>
              </CardContent>
            </Card>

            <Card data-testid="admin-stats-revenue">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <div className="h-4 w-4 text-muted-foreground">💰</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${stats.month_revenue_dollars.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="today" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="today" data-testid="today-tab">
              Today's Schedule
            </TabsTrigger>
            <TabsTrigger value="upcoming" data-testid="upcoming-tab">
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="all" data-testid="all-tab">
              All Appointments
            </TabsTrigger>
            <TabsTrigger value="services" data-testid="services-tab">
              Services
            </TabsTrigger>
            <TabsTrigger value="calendar" data-testid="calendar-tab">
              Calendar View
            </TabsTrigger>
          </TabsList>

          {/* Today's Appointments */}
          <TabsContent value="today" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Today's Schedule</span>
                  <Badge variant="secondary" data-testid="today-count">
                    {todayAppointments.length} appointments
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {todayAppointments.length > 0 ? (
                  <div className="space-y-4" data-testid="today-appointments">
                    {todayAppointments
                      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
                      .map((appointment) => {
                        const { date, time } = formatDateTime(appointment.scheduled_at);
                        const actions = getStatusActions(appointment.status);
                        
                        return (
                          <div
                            key={appointment.id}
                            className="border rounded-lg p-6 hover:bg-gray-50 transition-colors"
                            data-testid={`today-appointment-${appointment.id}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-3">
                                  <h3 className="text-lg font-semibold text-gray-800">
                                    {appointment.service_name}
                                  </h3>
                                  <div 
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: appointment.service_color }}
                                  />
                                  <Badge className={getStatusBadgeColor(appointment.status)}>
                                    {appointment.status.replace('_', ' ')}
                                  </Badge>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                                  <div>
                                    <p className="font-medium">Client</p>
                                    <p>{appointment.client_name}</p>
                                    <p className="text-xs">{appointment.client_phone}</p>
                                  </div>
                                  
                                  <div>
                                    <p className="font-medium">Time</p>
                                    <p>{time}</p>
                                    <p className="text-xs">{appointment.service_duration} min</p>
                                  </div>
                                  
                                  <div>
                                    <p className="font-medium">Staff</p>
                                    <p>{appointment.staff_name || "Any available"}</p>
                                  </div>
                                  
                                  <div>
                                    <p className="font-medium">Amount</p>
                                    <p className="font-semibold text-green-600">
                                      ${(appointment.total_amount_cents / 100).toFixed(2)}
                                    </p>
                                  </div>
                                </div>

                                {appointment.notes && (
                                  <p className="text-sm text-gray-600 mt-3">
                                    <span className="font-medium">Notes:</span> {appointment.notes}
                                  </p>
                                )}
                              </div>

                              {actions.length > 0 && (
                                <div className="flex flex-col space-y-2 ml-4">
                                  {actions.map((action) => (
                                    <Button
                                      key={action}
                                      variant="outline"
                                      size="sm"
                                      onClick={() => updateAppointmentStatus(appointment.id, action)}
                                      className={
                                        action === "completed" ? "text-green-600 border-green-300 hover:bg-green-50" :
                                        action === "cancelled" ? "text-red-600 border-red-300 hover:bg-red-50" :
                                        action === "confirmed" ? "text-blue-600 border-blue-300 hover:bg-blue-50" :
                                        ""
                                      }
                                      data-testid={`${action}-${appointment.id}`}
                                    >
                                      {action.replace('_', ' ')}
                                    </Button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-center py-8" data-testid="no-today-appointments">
                    <p className="text-gray-500">No appointments scheduled for today</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Upcoming Appointments */}
          <TabsContent value="upcoming" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Upcoming Appointments</span>
                  <Badge variant="secondary" data-testid="upcoming-count">
                    {upcomingAppointments.length} appointments
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingAppointments.length > 0 ? (
                  <div className="space-y-4" data-testid="upcoming-appointments">
                    {upcomingAppointments
                      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
                      .slice(0, 10) // Show first 10
                      .map((appointment) => {
                        const { date, time } = formatDateTime(appointment.scheduled_at);
                        
                        return (
                          <div
                            key={appointment.id}
                            className="border rounded-lg p-6"
                            data-testid={`upcoming-appointment-${appointment.id}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-2">
                                  <h3 className="text-lg font-semibold text-gray-800">
                                    {appointment.service_name}
                                  </h3>
                                  <div 
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: appointment.service_color }}
                                  />
                                  <Badge className={getStatusBadgeColor(appointment.status)}>
                                    {appointment.status}
                                  </Badge>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                                  <div>
                                    <p className="font-medium">Client</p>
                                    <p>{appointment.client_name}</p>
                                  </div>
                                  
                                  <div>
                                    <p className="font-medium">Date & Time</p>
                                    <p>{date} at {time}</p>
                                  </div>
                                  
                                  <div>
                                    <p className="font-medium">Staff</p>
                                    <p>{appointment.staff_name || "Any available"}</p>
                                  </div>
                                  
                                  <div>
                                    <p className="font-medium">Amount</p>
                                    <p className="font-semibold text-green-600">
                                      ${(appointment.total_amount_cents / 100).toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-center py-8" data-testid="no-upcoming-appointments">
                    <p className="text-gray-500">No upcoming appointments</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Appointments */}
          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>All Appointments</span>
                  <Badge variant="secondary" data-testid="all-count">
                    {appointments.length} total
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full table-auto" data-testid="all-appointments-table">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Service</th>
                        <th className="text-left p-3">Client</th>
                        <th className="text-left p-3">Date & Time</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments
                        .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at))
                        .slice(0, 20) // Show first 20
                        .map((appointment) => {
                          const { date, time } = formatDateTime(appointment.scheduled_at);
                          
                          return (
                            <tr 
                              key={appointment.id} 
                              className="border-b hover:bg-gray-50"
                              data-testid={`all-appointment-${appointment.id}`}
                            >
                              <td className="p-3">
                                <div className="flex items-center space-x-2">
                                  <div 
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: appointment.service_color }}
                                  />
                                  <span className="font-medium">{appointment.service_name}</span>
                                </div>
                              </td>
                              <td className="p-3">
                                <div>
                                  <p className="font-medium">{appointment.client_name}</p>
                                  <p className="text-sm text-gray-600">{appointment.client_email}</p>
                                </div>
                              </td>
                              <td className="p-3">
                                <p>{date}</p>
                                <p className="text-sm text-gray-600">{time}</p>
                              </td>
                              <td className="p-3">
                                <Badge className={getStatusBadgeColor(appointment.status)}>
                                  {appointment.status.replace('_', ' ')}
                                </Badge>
                              </td>
                              <td className="p-3">
                                <span className="font-semibold text-green-600">
                                  ${(appointment.total_amount_cents / 100).toFixed(2)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          {/* Services Management */}
          <TabsContent value="services" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Services Management</CardTitle>
                  <Button 
                    onClick={() => window.location.href = "/admin/services/new"}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                  >
                    Add New Service
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ServicesManagerContent />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Calendar View */}
          <TabsContent value="calendar" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Calendar View</CardTitle>
                <div className="text-sm text-gray-600">
                  Visual calendar showing all appointments with color-coded services
                </div>
              </CardHeader>
              <CardContent>
                <CalendarViewContent appointments={appointments} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Access Menu */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = "/admin/forms"}>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <span className="text-white text-xl">📋</span>
              </div>
              <h3 className="font-semibold mb-2">Consultation Forms</h3>
              <p className="text-sm text-gray-600">Create and manage custom consultation forms</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = "/admin/marketing"}>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <span className="text-white text-xl">📧</span>
              </div>
              <h3 className="font-semibold mb-2">Marketing Campaigns</h3>
              <p className="text-sm text-gray-600">Create email campaigns and SMS automation</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = "/admin/clients"}>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <span className="text-white text-xl">👥</span>
              </div>
              <h3 className="font-semibold mb-2">Client Management</h3>
              <p className="text-sm text-gray-600">Manage client profiles, notes, and files</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Services Manager Component
const ServicesManagerContent = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingService, setEditingService] = useState(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await axios.get("/services");
      setServices(response.data);
    } catch (error) {
      console.error("Failed to fetch services:", error);
      toast.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <Card key={service.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: service.color_code }}
                  />
                  <CardTitle className="text-lg">{service.name}</CardTitle>
                </div>
                <Badge variant={service.is_active ? "default" : "secondary"}>
                  {service.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">{service.description}</p>
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-lg">${(service.price_cents / 100).toFixed(2)}</span>
                <span className="text-sm text-gray-500">{service.duration_minutes} min</span>
              </div>
              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setEditingService(service)}
                  data-testid={`edit-service-${service.id}`}
                >
                  Edit
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this service?")) {
                      // TODO: Implement delete service
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Calendar View Component
const CalendarViewContent = ({ appointments }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getDayAppointments = (date) => {
    const dateStr = date.toDateString();
    return appointments.filter(apt => 
      new Date(apt.scheduled_at).toDateString() === dateStr
    );
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    return days;
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid bg-white rounded-lg overflow-hidden shadow">
        {/* Days of Week Header */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 bg-gray-50 font-semibold text-center text-sm">
            {day}
          </div>
        ))}
        
        {/* Calendar Days */}
        {generateCalendarDays().map((date, index) => {
          const dayAppointments = getDayAppointments(date);
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();
          const isToday = date.toDateString() === new Date().toDateString();

          return (
            <div
              key={index}
              className={`
                calendar-day p-2 min-h-[100px] border-b border-r
                ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''}
                ${isToday ? 'bg-blue-50 border-blue-200' : ''}
              `}
            >
              <div className="font-medium mb-1">{date.getDate()}</div>
              <div className="space-y-1">
                {dayAppointments.slice(0, 3).map((apt) => (
                  <div
                    key={apt.id}
                    className="text-xs p-1 rounded"
                    style={{ 
                      backgroundColor: apt.service_color + "20",
                      borderLeft: `3px solid ${apt.service_color}`
                    }}
                  >
                    <div className="font-medium truncate">{apt.client_name}</div>
                    <div className="text-gray-600">{apt.service_name}</div>
                    <div className="text-gray-500">
                      {new Date(apt.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                ))}
                {dayAppointments.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{dayAppointments.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center space-x-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Facial</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span>Laser Removal</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span>Teeth Whitening</span>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;