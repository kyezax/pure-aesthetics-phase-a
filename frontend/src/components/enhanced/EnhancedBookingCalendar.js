import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import LoadingSpinner from "../ui/LoadingSpinner";
import { toast } from "sonner";

const EnhancedBookingCalendar = () => {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [clientNotes, setClientNotes] = useState([]);
  const [bookingNotes, setBookingNotes] = useState("");
  const [consultationForm, setConsultationForm] = useState(null);
  const [consultationResponses, setConsultationResponses] = useState({});
  
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [step, setStep] = useState(1); // 1: Service, 2: Date/Time, 3: Consultation, 4: Confirm

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedService && selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedService, selectedDate, selectedStaff]);

  useEffect(() => {
    if (user) {
      fetchClientAlerts();
    }
  }, [user]);

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

  const fetchClientAlerts = async () => {
    try {
      const response = await axios.get(`/clients/${user.id}/notes?note_type=alert`);
      const alertNotes = response.data.filter(note => note.is_alert);
      setClientNotes(alertNotes);
    } catch (error) {
      console.error("Failed to fetch client alerts:", error);
    }
  };

  const fetchAvailableSlots = async () => {
    if (!selectedService || !selectedDate) return;

    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const params = {
        service_id: selectedService.id,
        date: dateStr,
        ...(selectedStaff && { staff_id: selectedStaff.id })
      };

      const response = await axios.get("/appointments/intelligent-slots", { params });
      setAvailableSlots(response.data.available_slots);
    } catch (error) {
      console.error("Failed to fetch available slots:", error);
      toast.error("Failed to load available times");
    }
  };

  const fetchConsultationForm = async (serviceId) => {
    try {
      const response = await axios.get(`/services/${serviceId}/consultation-form`);
      if (response.data) {
        setConsultationForm(response.data);
        setStep(3);
      } else {
        setStep(4); // Skip consultation if no form
      }
    } catch (error) {
      console.error("Failed to fetch consultation form:", error);
      setStep(4); // Skip on error
    }
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setSelectedDate(null);
    setSelectedTimeSlot(null);
    setAvailableSlots([]);
    
    // Check if service requires consultation form
    if (service.requires_consultation) {
      fetchConsultationForm(service.id);
    }
  };

  const handleTimeSlotSelect = (slot) => {
    setSelectedTimeSlot(slot);
    
    // Move to consultation step if required, otherwise go to confirm
    if (selectedService.requires_consultation) {
      fetchConsultationForm(selectedService.id);
    } else {
      setStep(4);
    }
  };

  const handleConsultationSubmit = () => {
    // Validate required consultation fields
    if (consultationForm?.is_required_for_new_clients) {
      const requiredFields = consultationForm.form_fields.filter(field => field.required);
      const missingFields = requiredFields.filter(field => !consultationResponses[field.name]);
      
      if (missingFields.length > 0) {
        toast.error(`Please complete all required fields: ${missingFields.map(f => f.label).join(', ')}`);
        return;
      }
    }
    
    setStep(4);
  };

  const handleBookAppointment = async () => {
    if (!selectedService || !selectedDate || !selectedTimeSlot) {
      toast.error("Please complete all required fields");
      return;
    }

    setBooking(true);

    try {
      const appointmentDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTimeSlot.time.split(':');
      appointmentDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const appointmentData = {
        service_id: selectedService.id,
        staff_id: selectedStaff?.id || null,
        scheduled_at: appointmentDateTime.toISOString(),
        booking_notes: bookingNotes || null,
        consultation_form_response: Object.keys(consultationResponses).length > 0 ? consultationResponses : null
      };

      const response = await axios.post("/appointments", appointmentData);
      
      toast.success("Appointment booked successfully!");
      
      // Reset form
      resetBooking();
      
      // Redirect to dashboard
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
    setSelectedTimeSlot(null);
    setAvailableSlots([]);
    setBookingNotes("");
    setConsultationForm(null);
    setConsultationResponses({});
    setStep(1);
  };

  const renderConsultationForm = () => {
    if (!consultationForm) return null;

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">{consultationForm.name}</h3>
          {consultationForm.description && (
            <p className="text-gray-600 mb-4">{consultationForm.description}</p>
          )}
        </div>

        <div className="space-y-4">
          {consultationForm.form_fields.map((field, index) => (
            <div key={index}>
              <Label className="flex items-center space-x-1">
                <span>{field.label}</span>
                {field.required && <span className="text-red-500">*</span>}
              </Label>
              
              {field.type === 'text' && (
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  placeholder={field.placeholder}
                  value={consultationResponses[field.name] || ''}
                  onChange={(e) => setConsultationResponses({
                    ...consultationResponses,
                    [field.name]: e.target.value
                  })}
                  required={field.required}
                />
              )}
              
              {field.type === 'textarea' && (
                <Textarea
                  placeholder={field.placeholder}
                  value={consultationResponses[field.name] || ''}
                  onChange={(e) => setConsultationResponses({
                    ...consultationResponses,
                    [field.name]: e.target.value
                  })}
                  required={field.required}
                />
              )}
              
              {field.type === 'select' && (
                <Select 
                  value={consultationResponses[field.name] || ''}
                  onValueChange={(value) => setConsultationResponses({
                    ...consultationResponses,
                    [field.name]: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={field.placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((option, optIndex) => (
                      <SelectItem key={optIndex} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {field.type === 'checkbox' && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={consultationResponses[field.name] || false}
                    onChange={(e) => setConsultationResponses({
                      ...consultationResponses,
                      [field.name]: e.target.checked
                    })}
                  />
                  <span className="text-sm">{field.description}</span>
                </div>
              )}
              
              {field.description && (
                <p className="text-sm text-gray-500 mt-1">{field.description}</p>
              )}
            </div>
          ))}
        </div>

        <Button
          onClick={handleConsultationSubmit}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
          data-testid="consultation-submit-btn"
        >
          Complete Consultation
        </Button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" data-testid="enhanced-booking-calendar">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Book Your Appointment
          </h1>
          <p className="text-gray-600">
            Professional booking with intelligent scheduling and consultation forms
          </p>
        </div>

        {/* Client Alerts */}
        {clientNotes.length > 0 && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertDescription>
              <div className="font-medium mb-2">Important Notes:</div>
              <ul className="list-disc list-inside space-y-1">
                {clientNotes.map((note) => (
                  <li key={note.id} className="text-sm">{note.title}: {note.content}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3, 4].map((stepNum) => (
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
                {stepNum < 4 && (
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
          {/* Step 1: Enhanced Service Selection */}
          <Card className={step === 1 ? "ring-2 ring-purple-500" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="mr-2">💅</span>
                Select Treatment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {step === 1 ? (
                <div className="space-y-4" data-testid="service-selection">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className={`
                        p-4 border rounded-xl cursor-pointer transition-all hover:shadow-md
                        ${selectedService?.id === service.id 
                          ? 'border-purple-500 bg-purple-50 shadow-md' 
                          : 'border-gray-200 hover:border-purple-300'
                        }
                      `}
                      onClick={() => handleServiceSelect(service)}
                      data-testid={`service-option-${service.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div 
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: service.color_code }}
                            />
                            <h4 className="font-semibold text-gray-800">
                              {service.name}
                            </h4>
                            {service.requires_consultation && (
                              <Badge variant="secondary" className="text-xs">Consultation Required</Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3">
                            {service.description}
                          </p>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Duration:</span>
                              <div className="font-medium">{service.duration_minutes} minutes</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Price:</span>
                              <div className="font-bold text-lg text-purple-600">
                                ${(service.price_cents / 100).toFixed(2)}
                              </div>
                            </div>
                          </div>

                          {service.buffer_time_before > 0 || service.buffer_time_after > 0 ? (
                            <div className="mt-2 text-xs text-gray-500">
                              Buffer time: {service.buffer_time_before}min before, {service.buffer_time_after}min after
                            </div>
                          ) : null}
                        </div>
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
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: selectedService.color_code }}
                        />
                        <h4 className="font-semibold">{selectedService.name}</h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
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

          {/* Step 2: Enhanced Date & Time Selection */}
          <Card className={step === 2 ? "ring-2 ring-purple-500" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="mr-2">📅</span>
                Date & Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              {step === 2 && selectedService ? (
                <div className="space-y-4" data-testid="datetime-selection">
                  {/* Staff Selection */}
                  <div>
                    <Label htmlFor="staff-select" className="text-sm font-medium mb-2 block">
                      Preferred Staff Member
                    </Label>
                    <Select 
                      onValueChange={(value) => {
                        const staffMember = staff.find(s => s.id === value) || null;
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
                      disabled={(date) => {
                        const today = new Date();
                        const maxDate = new Date();
                        maxDate.setDate(today.getDate() + (selectedService.max_advance_booking_days || 30));
                        
                        return date < today || 
                               date > maxDate || 
                               date.getDay() === 0; // Disable Sundays
                      }}
                      className="rounded-md border"
                      data-testid="date-picker"
                    />
                  </div>

                  {/* Intelligent Time Slots */}
                  {selectedDate && (
                    <div>
                      <Label className="text-sm font-medium mb-2 block">
                        Available Time Slots
                      </Label>
                      {availableSlots.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2" data-testid="time-slots">
                          {availableSlots.map((slot, index) => (
                            <Button
                              key={index}
                              variant={selectedTimeSlot?.time === slot.time ? "default" : "outline"}
                              size="sm"
                              disabled={!slot.available}
                              onClick={() => handleTimeSlotSelect(slot)}
                              className={`
                                ${selectedTimeSlot?.time === slot.time 
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
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          No available slots for this date
                        </div>
                      )}
                    </div>
                  )}

                  {selectedDate && selectedTimeSlot && !selectedService.requires_consultation && (
                    <Button
                      className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                      onClick={() => setStep(4)}
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

          {/* Step 3: Consultation Form */}
          <Card className={step === 3 ? "ring-2 ring-purple-500" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <span className="mr-2">📋</span>
                Consultation Form
              </CardTitle>
            </CardHeader>
            <CardContent>
              {step === 3 ? (
                <div data-testid="consultation-form">
                  {renderConsultationForm()}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">Complete previous steps first</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 4: Enhanced Confirmation */}
          {step >= 4 && (
            <Card className="lg:col-span-3 ring-2 ring-purple-500">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <span className="mr-2">✅</span>
                  Confirm Your Appointment
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedService && selectedDate && selectedTimeSlot ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" data-testid="booking-confirmation">
                    {/* Appointment Summary */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Appointment Details</h3>
                      <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-6 rounded-xl space-y-4">
                        
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: selectedService.color_code }}
                          />
                          <div>
                            <div className="font-semibold">{selectedService.name}</div>
                            <div className="text-sm text-gray-600">{selectedService.description}</div>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Date:</span>
                            <div className="font-medium">{selectedDate.toLocaleDateString()}</div>
                          </div>
                          
                          <div>
                            <span className="text-gray-500">Time:</span>
                            <div className="font-medium">{selectedTimeSlot.time}</div>
                          </div>
                          
                          <div>
                            <span className="text-gray-500">Duration:</span>
                            <div className="font-medium">{selectedService.duration_minutes} minutes</div>
                          </div>
                          
                          {selectedStaff && (
                            <div>
                              <span className="text-gray-500">Staff:</span>
                              <div className="font-medium">
                                {selectedStaff.first_name} {selectedStaff.last_name}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <Separator />
                        
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold">Total Amount:</span>
                          <span className="text-2xl font-bold text-purple-600">
                            ${(selectedService.price_cents / 100).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Consultation Summary */}
                      {Object.keys(consultationResponses).length > 0 && (
                        <div className="mt-6">
                          <h4 className="font-semibold mb-2">Consultation Responses</h4>
                          <div className="bg-gray-50 p-4 rounded-lg text-sm">
                            <p className="text-gray-600">✓ Consultation form completed</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Booking Notes & Final Actions */}
                    <div className="space-y-6">
                      <div>
                        <Label htmlFor="notes" className="text-sm font-medium mb-2 block">
                          Special Requests or Notes (Optional)
                        </Label>
                        <Textarea
                          id="notes"
                          placeholder="Any special requests, preferences, or information we should know..."
                          value={bookingNotes}
                          onChange={(e) => setBookingNotes(e.target.value)}
                          className="resize-none"
                          rows={4}
                          data-testid="appointment-notes"
                        />
                      </div>

                      {/* Important Information */}
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-blue-800 mb-2">Important Information</h4>
                        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                          <li>Please arrive 10 minutes early for your appointment</li>
                          <li>Cancellations must be made at least 24 hours in advance</li>
                          <li>A confirmation email will be sent to you shortly</li>
                          {selectedService.requires_patch_test && (
                            <li>A patch test may be required before treatment</li>
                          )}
                        </ul>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-3">
                        <Button
                          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 h-12 text-lg font-semibold"
                          onClick={handleBookAppointment}
                          disabled={booking}
                          data-testid="confirm-booking-btn"
                        >
                          {booking ? (
                            <>
                              <LoadingSpinner size="sm" className="mr-2" />
                              Booking Your Appointment...
                            </>
                          ) : (
                            "Confirm & Book Appointment"
                          )}
                        </Button>
                        
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={resetBooking}
                          disabled={booking}
                          data-testid="start-over-btn"
                        >
                          Start Over
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500">Complete all previous steps first</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedBookingCalendar;