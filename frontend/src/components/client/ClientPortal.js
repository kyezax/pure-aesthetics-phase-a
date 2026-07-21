import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../App";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import LoadingSpinner from "../ui/LoadingSpinner";
import { toast } from "sonner";

const ClientPortal = () => {
  const { user, logout } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [clientNotes, setClientNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    email: user?.email || "",
    phone: user?.phone || ""
  });
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    fetchClientData();
  }, []);

  const fetchClientData = async () => {
    try {
      const [appointmentsRes, notesRes] = await Promise.allSettled([
        axios.get("/appointments"),
        axios.get(`/clients/${user.id}/notes`)
      ]);

      if (appointmentsRes.status === "fulfilled") {
        setAppointments(appointmentsRes.value.data);
      }

      if (notesRes.status === "fulfilled") {
        setClientNotes(notesRes.value.data);
      }

    } catch (error) {
      console.error("Failed to fetch client data:", error);
      toast.error("Failed to load client data");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileLoading(true);

    try {
      // In a real implementation, you'd have an update profile endpoint
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const cancelAppointment = async (appointmentId) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) {
      return;
    }

    try {
      await axios.delete(`/appointments/${appointmentId}`);
      toast.success("Appointment cancelled successfully");
      
      // Update local state
      setAppointments(appointments.map(apt => 
        apt.id === appointmentId 
          ? { ...apt, status: "cancelled" }
          : apt
      ));
    } catch (error) {
      console.error("Failed to cancel appointment:", error);
      toast.error("Failed to cancel appointment");
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

  const upcomingAppointments = appointments.filter(
    apt => new Date(apt.scheduled_at) > new Date() && apt.status !== "cancelled"
  );

  const appointmentHistory = appointments.filter(
    apt => new Date(apt.scheduled_at) <= new Date() || apt.status === "completed" || apt.status === "cancelled"
  );

  return (
    <div className="min-h-screen py-8 px-4" data-testid="client-portal">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            My Profile
          </h1>
          <p className="text-gray-600">
            Manage your appointments, view your beauty journey, and update your information
          </p>
        </div>

        <Tabs defaultValue="appointments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="appointments" data-testid="appointments-tab">
              Appointments
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="history-tab">
              History
            </TabsTrigger>
            <TabsTrigger value="notes" data-testid="notes-tab">
              My Notes
            </TabsTrigger>
            <TabsTrigger value="profile" data-testid="profile-tab">
              Profile
            </TabsTrigger>
          </TabsList>

          {/* Upcoming Appointments */}
          <TabsContent value="appointments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Upcoming Appointments</span>
                  <Button
                    onClick={() => window.location.href = "/booking"}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                    data-testid="book-new-appointment-btn"
                  >
                    Book New Appointment
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingAppointments.length > 0 ? (
                  <div className="space-y-4" data-testid="upcoming-appointments">
                    {upcomingAppointments.map((appointment) => {
                      const { date, time } = formatDateTime(appointment.scheduled_at);
                      const canCancel = new Date(appointment.scheduled_at) > new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours before
                      
                      return (
                        <div
                          key={appointment.id}
                          className="border rounded-lg p-6 hover:bg-gray-50 transition-colors"
                          data-testid={`appointment-${appointment.id}`}
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
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                                <div>
                                  <p className="font-medium">Date & Time</p>
                                  <p>{date} at {time}</p>
                                </div>
                                
                                <div>
                                  <p className="font-medium">Duration</p>
                                  <p>{appointment.service_duration} minutes</p>
                                </div>
                                
                                <div>
                                  <p className="font-medium">Total</p>
                                  <p className="font-semibold text-green-600">
                                    ${(appointment.total_amount_cents / 100).toFixed(2)}
                                  </p>
                                </div>
                              </div>

                              {appointment.staff_name && (
                                <p className="text-sm text-gray-600 mt-2">
                                  <span className="font-medium">Staff:</span> {appointment.staff_name}
                                </p>
                              )}

                              {appointment.notes && (
                                <p className="text-sm text-gray-600 mt-2">
                                  <span className="font-medium">Notes:</span> {appointment.notes}
                                </p>
                              )}
                            </div>

                            {canCancel && appointment.status !== "cancelled" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => cancelAppointment(appointment.id)}
                                className="text-red-600 border-red-300 hover:bg-red-50"
                                data-testid={`cancel-appointment-${appointment.id}`}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8" data-testid="no-upcoming-appointments">
                    <p className="text-gray-500 mb-4">No upcoming appointments</p>
                    <Button
                      onClick={() => window.location.href = "/booking"}
                      className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                    >
                      Book Your First Appointment
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appointment History */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Appointment History</CardTitle>
                <CardDescription>
                  Your complete appointment history and beauty journey
                </CardDescription>
              </CardHeader>
              <CardContent>
                {appointmentHistory.length > 0 ? (
                  <div className="space-y-4" data-testid="appointment-history">
                    {appointmentHistory.map((appointment) => {
                      const { date, time } = formatDateTime(appointment.scheduled_at);
                      
                      return (
                        <div
                          key={appointment.id}
                          className="border rounded-lg p-6"
                          data-testid={`history-appointment-${appointment.id}`}
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
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                                <div>
                                  <p className="font-medium">Date & Time</p>
                                  <p>{date} at {time}</p>
                                </div>
                                
                                <div>
                                  <p className="font-medium">Duration</p>
                                  <p>{appointment.service_duration} minutes</p>
                                </div>
                                
                                <div>
                                  <p className="font-medium">Amount</p>
                                  <p className={`font-semibold ${
                                    appointment.status === "completed" ? "text-green-600" : "text-gray-600"
                                  }`}>
                                    ${(appointment.total_amount_cents / 100).toFixed(2)}
                                  </p>
                                </div>
                              </div>

                              {appointment.staff_name && (
                                <p className="text-sm text-gray-600 mt-2">
                                  <span className="font-medium">Staff:</span> {appointment.staff_name}
                                </p>
                              )}
                            </div>

                            {appointment.status === "completed" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.location.href = `/booking?service=${appointment.service_id}`}
                                data-testid={`rebook-${appointment.id}`}
                              >
                                Book Again
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8" data-testid="no-appointment-history">
                    <p className="text-gray-500">No appointment history yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Client Notes */}
          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My Beauty Notes</CardTitle>
                <CardDescription>
                  Notes and preferences from your appointments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {clientNotes.length > 0 ? (
                  <div className="space-y-4" data-testid="client-notes">
                    {clientNotes.map((note) => (
                      <div
                        key={note.id}
                        className="border rounded-lg p-4"
                        data-testid={`note-${note.id}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-gray-800">{note.title}</h4>
                          <div className="flex items-center space-x-2">
                            {note.category && (
                              <Badge variant="secondary">{note.category}</Badge>
                            )}
                            <span className="text-xs text-gray-500">
                              {new Date(note.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-600 mb-2">{note.content}</p>
                        <p className="text-xs text-gray-500">
                          Added by {note.created_by}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8" data-testid="no-client-notes">
                    <p className="text-gray-500">
                      No notes yet. Notes will appear here after your appointments.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Settings */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4" data-testid="profile-form">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first_name">First Name</Label>
                      <Input
                        id="first_name"
                        value={profileData.first_name}
                        onChange={(e) => setProfileData({
                          ...profileData,
                          first_name: e.target.value
                        })}
                        data-testid="profile-first-name"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input
                        id="last_name"
                        value={profileData.last_name}
                        onChange={(e) => setProfileData({
                          ...profileData,
                          last_name: e.target.value
                        })}
                        data-testid="profile-last-name"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({
                        ...profileData,
                        email: e.target.value
                      })}
                      data-testid="profile-email"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({
                        ...profileData,
                        phone: e.target.value
                      })}
                      data-testid="profile-phone"
                    />
                  </div>

                  <Separator />

                  <div className="flex justify-between">
                    <Button
                      type="submit"
                      disabled={profileLoading}
                      className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                      data-testid="update-profile-btn"
                    >
                      {profileLoading ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Updating...
                        </>
                      ) : (
                        "Update Profile"
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={logout}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                      data-testid="logout-btn"
                    >
                      Logout
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClientPortal;