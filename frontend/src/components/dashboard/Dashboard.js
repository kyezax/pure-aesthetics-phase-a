import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../App";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "../ui/LoadingSpinner";
import { toast } from "sonner";

const Dashboard = () => {
  const { user, isAdmin, isStaff } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [appointmentsRes, statsRes] = await Promise.allSettled([
        axios.get("/appointments"),
        (isAdmin || isStaff) ? axios.get("/dashboard/stats") : Promise.resolve(null)
      ]);

      if (appointmentsRes.status === "fulfilled") {
        setAppointments(appointmentsRes.value.data);
      }

      if (statsRes.status === "fulfilled" && statsRes.value) {
        setStats(statsRes.value.data);
      }

    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "scheduled":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const upcomingAppointments = appointments
    .filter(apt => new Date(apt.scheduled_at) > new Date() && apt.status !== "cancelled")
    .slice(0, 5);

  const recentAppointments = appointments
    .filter(apt => apt.status === "completed")
    .slice(0, 5);

  return (
    <div className="min-h-screen py-8 px-4" data-testid="dashboard">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome back, {user.first_name}!
          </h1>
          <p className="text-gray-600">
            {isAdmin || isStaff 
              ? "Manage appointments and view business insights" 
              : "Track your appointments and beauty journey"
            }
          </p>
        </div>

        {/* Stats Cards - Admin/Staff Only */}
        {(isAdmin || isStaff) && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card data-testid="stats-today-appointments">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
                <div className="h-4 w-4 text-muted-foreground">📅</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.today_appointments}</div>
              </CardContent>
            </Card>

            <Card data-testid="stats-week-appointments">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Week</CardTitle>
                <div className="h-4 w-4 text-muted-foreground">📊</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.week_appointments}</div>
                <p className="text-xs text-muted-foreground">Total appointments</p>
              </CardContent>
            </Card>

            <Card data-testid="stats-total-clients">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
                <div className="h-4 w-4 text-muted-foreground">👥</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_clients}</div>
              </CardContent>
            </Card>

            <Card data-testid="stats-month-revenue">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <div className="h-4 w-4 text-muted-foreground">💰</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${stats.month_revenue_dollars.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <span className="mr-2">📅</span>
                Book Appointment
              </CardTitle>
              <CardDescription>
                Schedule your next beauty treatment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                onClick={() => window.location.href = "/booking"}
                data-testid="book-appointment-btn"
              >
                Book Now
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <span className="mr-2">💆</span>
                Browse Services
              </CardTitle>
              <CardDescription>
                Explore all available treatments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline"
                className="w-full"
                onClick={() => window.location.href = "/services"}
                data-testid="browse-services-btn"
              >
                View Services
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <span className="mr-2">👤</span>
                Profile Settings
              </CardTitle>
              <CardDescription>
                Manage your account information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline"
                className="w-full"
                onClick={() => window.location.href = "/profile"}
                data-testid="profile-settings-btn"
              >
                Manage Profile
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Appointments Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Appointments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Upcoming Appointments</span>
                {upcomingAppointments.length > 0 && (
                  <Badge variant="secondary" data-testid="upcoming-appointments-count">
                    {upcomingAppointments.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length > 0 ? (
                <div className="space-y-4" data-testid="upcoming-appointments-list">
                  {upcomingAppointments.map((appointment) => {
                    const { date, time } = formatDateTime(appointment.scheduled_at);
                    return (
                      <div
                        key={appointment.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        data-testid={`upcoming-appointment-${appointment.id}`}
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800">
                            {appointment.service_name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {date} at {time}
                          </p>
                          {appointment.staff_name && (
                            <p className="text-sm text-gray-500">
                              with {appointment.staff_name}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusBadgeColor(appointment.status)}>
                            {appointment.status}
                          </Badge>
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: appointment.service_color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8" data-testid="no-upcoming-appointments">
                  <p className="text-gray-500 mb-4">No upcoming appointments</p>
                  <Button
                    size="sm"
                    onClick={() => window.location.href = "/booking"}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                  >
                    Book Your First Appointment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Appointments */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {recentAppointments.length > 0 ? (
                <div className="space-y-4" data-testid="recent-appointments-list">
                  {recentAppointments.map((appointment) => {
                    const { date, time } = formatDateTime(appointment.scheduled_at);
                    return (
                      <div
                        key={appointment.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                        data-testid={`recent-appointment-${appointment.id}`}
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800">
                            {appointment.service_name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {date} at {time}
                          </p>
                          <p className="text-sm font-medium text-green-600">
                            ${(appointment.total_amount_cents / 100).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className="bg-blue-100 text-blue-800">
                            Completed
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8" data-testid="no-recent-appointments">
                  <p className="text-gray-500">No recent appointments</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;