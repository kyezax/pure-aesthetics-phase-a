import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../App";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import LoadingSpinner from "../ui/LoadingSpinner";
import { toast } from "sonner";

const BookingCalendar = () => {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [step, setStep] = useState(1); // 1: Service, 2: Date/Time, 3: Confirm

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedService && selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedService, selectedDate, selectedStaff]);

  const fetchInitialData = async () => {
    try {
      const [servicesRes, staffRes] = await Promise.all([
        axios.get("/services"),
        axios.get("/staff")
      ]);

      setServices(servicesRes.data);
      setStaff(staffRes.data);

      // Check for pre-selected service from URL
      const urlParams = new URLSearchParams(window.location.search);
      const serviceId = urlParams.get('service');
      if (serviceId) {
        const service = servicesRes.data.find(s => s.id === serviceId);
        if (service) {
          setSelectedService(service);
          setStep(2);
        }
      }
    } catch (error) {
      console.error("Failed to fetch initial data:", error);
      toast.error("Failed to load booking data");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async () => {
    if (!selectedService || !selectedDate) return;

    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const params = {
        service_id: selectedService.id,
        date: dateStr,
        ...(selectedStaff && { staff_member_id: selectedStaff.id })
      };

      // For now, generate sample time slots since we don't have availability API
      const slots = generateTimeSlots();
      setAvailableSlots(slots);
    } catch (error) {
      console.error("Failed to fetch available slots:", error);
      toast.error("Failed to load available times");
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 9; // 9 AM
    const endHour = 18; // 6 PM
    const interval = 30; // 30 minutes

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += interval) {
        const time = new Date(selectedDate);
        time.setHours(hour, minute, 0, 0);
        
        // Skip slots that are in the past
        if (time > new Date()) {
          slots.push({
            time: time.toTimeString().slice(0, 5),
            available: Math.random() > 0.3 // Random availability for demo
          });
        }
      }
    }

    return slots;
  };

  const handleBookAppointment = async () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      toast.error("Please complete all required fields");
      return;
    }

    setBooking(true);

    try {
      const appointmentDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':');
      appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const appointmentData = {
        service_id: selectedService.id,
        staff_id: selectedStaff?.id || null,
        scheduled_at: appointmentDateTime.toISOString(),
        notes: notes || null
      };

      const response = await axios.post("/appointments", appointmentData);
      
      toast.success("Appointment booked successfully!");
      
      // Reset form
      setSelectedService(null);
      setSelectedStaff(null);
      setSelectedDate(null);
      setSelectedTime(null);
      setNotes("");
      setStep(1);
      
      // Optionally redirect to dashboard
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 2000);

    } catch (error) {
      console.error("Failed to book appointment:", error);
      const message = error.response?.data?.detail || "Failed to book appointment";
      toast.error(message);
    } finally {
      setBooking(false);
    }
  };

  const resetBooking = () => {
    setSelectedService(null);
    setSelectedStaff(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setNotes("");
    setStep(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" data-testid="booking-calendar">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Book Your Appointment
          </h1>
          <p className="text-gray-600">
            Follow the steps below to schedule your beauty treatment
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div 
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${step >= stepNum 
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                    }
                  `}
                  data-testid={`step-${stepNum}`}
                >
                  {stepNum}
                </div>
                {stepNum < 3 && (
                  <div 
                    className={`w-16 h-1 mx-2 ${
                      step > stepNum ? 'bg-gradient-to-r from-pink-500 to-purple-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Step 1: Service Selection */}
          <Card className={step === 1 ? "ring-2 ring-purple-500" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="mr-2">1️⃣</span>
                Select Service
              </CardTitle>
            </CardHeader>
            <CardContent>
              {step === 1 ? (
                <div className="space-y-4" data-testid="service-selection">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className={`
                        p-4 border rounded-lg cursor-pointer transition-all
                        ${selectedService?.id === service.id 
                          ? 'border-purple-500 bg-purple-50' 
                          : 'border-gray-200 hover:border-purple-300'
                        }
                      `}
                      onClick={() => setSelectedService(service)}
                      data-testid={`service-option-${service.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800 mb-1">
                            {service.name}
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">
                            {service.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-lg">
                              ${(service.price_cents / 100).toFixed(2)}
                            </span>
                            <span className="text-sm text-gray-500">
                              {service.duration_minutes} min
                            </span>
                          </div>
                        </div>
                        <div 
                          className="w-4 h-4 rounded-full ml-4"
                          style={{ backgroundColor: service.color_code }}
                        />
                      </div>
                    </div>
                  ))}
                  
                  {selectedService && (
                    <Button
                      className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                      onClick={() => setStep(2)}
                      data-testid="proceed-to-datetime"
                    >
                      Continue to Date & Time
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  {selectedService ? (
                    <div data-testid="selected-service-summary">
                      <h4 className="font-semibold">{selectedService.name}</h4>
                      <p className="text-sm text-gray-600">
                        ${(selectedService.price_cents / 100).toFixed(2)} • {selectedService.duration_minutes} min
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setStep(1)}
                        className="mt-2"
                      >
                        Change Service
                      </Button>
                    </div>
                  ) : (
                    <p className="text-gray-500">Select a service first</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Date & Time Selection */}
          <Card className={step === 2 ? "ring-2 ring-purple-500" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="mr-2">2️⃣</span>
                Date & Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              {step === 2 && selectedService ? (
                <div className="space-y-4" data-testid="datetime-selection">
                  {/* Staff Selection (Optional) */}
                  <div>
                    <Label htmlFor="staff-select" className="text-sm font-medium mb-2 block">
                      Preferred Staff Member (Optional)
                    </Label>
                    <Select 
                      onValueChange={(value) => {
                        const staffMember = staff.find(s => s.id === value);
                        setSelectedStaff(staffMember);
                      }}
                      data-testid="staff-select"
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any available staff" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any available staff</SelectItem>
                        {staff.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.first_name} {member.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Selection */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Select Date
                    </Label>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date() || date.getDay() === 0} // Disable past dates and Sundays
                      className="rounded-md border"
                      data-testid="date-picker"
                    />
                  </div>

                  {/* Time Selection */}
                  {selectedDate && (
                    <div>
                      <Label className="text-sm font-medium mb-2 block">
                        Available Times
                      </Label>
                      <div className="grid grid-cols-3 gap-2" data-testid="time-slots">
                        {availableSlots.map((slot, index) => (
                          <Button
                            key={index}
                            variant={selectedTime === slot.time ? "default" : "outline"}
                            size="sm"
                            disabled={!slot.available}
                            onClick={() => setSelectedTime(slot.time)}
                            className={`
                              ${selectedTime === slot.time 
                                ? 'bg-gradient-to-r from-pink-500 to-purple-600' 
                                : ''
                              }
                              ${!slot.available ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                            data-testid={`time-slot-${slot.time}`}
                          >
                            {slot.time}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedDate && selectedTime && (
                    <Button
                      className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                      onClick={() => setStep(3)}
                      data-testid="proceed-to-confirm"
                    >
                      Continue to Confirmation
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">Complete service selection first</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 3: Confirmation */}
          <Card className={step === 3 ? "ring-2 ring-purple-500" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="mr-2">3️⃣</span>
                Confirm Booking
              </CardTitle>
            </CardHeader>
            <CardContent>
              {step === 3 && selectedService && selectedDate && selectedTime ? (
                <div className="space-y-4" data-testid="booking-confirmation">
                  {/* Booking Summary */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold mb-3">Appointment Summary</h4>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Service:</span>
                        <span className="font-medium">{selectedService.name}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Date:</span>
                        <span className="font-medium">
                          {selectedDate.toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Time:</span>
                        <span className="font-medium">{selectedTime}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span className="font-medium">{selectedService.duration_minutes} minutes</span>
                      </div>
                      
                      {selectedStaff && (
                        <div className="flex justify-between">
                          <span>Staff:</span>
                          <span className="font-medium">
                            {selectedStaff.first_name} {selectedStaff.last_name}
                          </span>
                        </div>
                      )}
                      
                      <div className="border-t pt-2 flex justify-between font-semibold">
                        <span>Total:</span>
                        <span>${(selectedService.price_cents / 100).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <Label htmlFor="notes" className="text-sm font-medium mb-2 block">
                      Special Notes (Optional)
                    </Label>
                    <Textarea
                      id="notes"
                      placeholder="Any special requests or information..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="resize-none"
                      rows={3}
                      data-testid="appointment-notes"
                    />
                  </div>

                  <div className="space-y-2">
                    <Button
                      className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                      onClick={handleBookAppointment}
                      disabled={booking}
                      data-testid="confirm-booking-btn"
                    >
                      {booking ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Booking...
                        </>
                      ) : (
                        "Confirm Booking"
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={resetBooking}
                      disabled={booking}
                      data-testid="cancel-booking-btn"
                    >
                      Start Over
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">Complete previous steps first</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BookingCalendar;