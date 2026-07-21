import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import LoadingSpinner from "../ui/LoadingSpinner";
import { toast } from "sonner";

const MarketingCampaignManager = () => {
  const { user, isStaff } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    description: "",
    campaign_type: "email",
    subject_line: "",
    message_content: "",
    target_audience: {},
    send_at: null,
    is_recurring: false,
    recurring_schedule: null,
    trigger_event: null,
    trigger_delay_hours: null
  });

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [activeTab, setActiveTab] = useState("campaigns");

  useEffect(() => {
    if (isStaff) {
      fetchCampaigns();
      loadTemplates();
    }
  }, [isStaff]);

  const fetchCampaigns = async () => {
    try {
      const response = await axios.get("/marketing/campaigns");
      setCampaigns(response.data);
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
      toast.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = () => {
    // Pre-defined email templates
    const emailTemplates = [
      {
        id: "welcome",
        name: "Welcome New Client",
        type: "email",
        subject: "Welcome to {{business_name}}! 🌟",
        content: `Hi {{client_first_name}},

Welcome to {{business_name}}! We're thrilled to have you as part of our beauty family.

Here's what you can expect:
• Professional treatments with experienced staff
• Personalized service tailored to your needs  
• Loyalty rewards with every visit
• Exclusive offers and promotions

Your first appointment is just a few clicks away. Book online anytime at {{website_url}}

We can't wait to help you look and feel your best!

Best regards,
The {{business_name}} Team`
      },
      {
        id: "reminder_24h",
        name: "24-Hour Reminder",
        type: "email",
        subject: "Reminder: Your appointment tomorrow at {{business_name}}",
        content: `Hi {{client_first_name}},

This is a friendly reminder about your upcoming appointment:

📅 Service: {{service_name}}
🕒 Date & Time: {{appointment_date}} at {{appointment_time}}  
👩‍💼 Staff: {{staff_name}}
📍 Location: {{business_address}}

Please arrive 10 minutes early. If you need to reschedule, please contact us at least 24 hours in advance.

Looking forward to seeing you!

{{business_name}}
{{business_phone}}`
      },
      {
        id: "followup",
        name: "Post-Appointment Follow-up",
        type: "email", 
        subject: "How was your experience at {{business_name}}?",
        content: `Hi {{client_first_name}},

Thank you for choosing {{business_name}} for your recent {{service_name}} treatment!

We hope you loved your experience with us. Your feedback helps us continue providing exceptional service.

💝 Exclusive Offer: Book your next appointment within 30 days and receive 10% off!

Ready to book again? Visit {{website_url}} or call us at {{business_phone}}.

We look forward to your next visit!

The {{business_name}} Team`
      },
      {
        id: "birthday",
        name: "Birthday Special",
        type: "email",
        subject: "Happy Birthday {{client_first_name}}! 🎂 Special gift inside!",
        content: `Happy Birthday {{client_first_name}}! 🎉

It's your special day, and we want to celebrate with you!

🎁 Birthday Gift: Enjoy 20% off any service during your birthday month
💎 Plus: Double loyalty points on your next visit
🌟 Bonus: Complimentary add-on service (up to $25 value)

Book your birthday treatment today and let us pamper you the way you deserve!

This offer expires at the end of your birthday month, so don't wait!

Book now: {{website_url}}

Happy Birthday again! 🥳

{{business_name}}`
      },
      {
        id: "seasonal_promo",
        name: "Seasonal Promotion",
        type: "email",
        subject: "Spring into Beauty! Limited Time Offers 🌸",
        content: `Hi {{client_first_name}},

Spring is here, and it's time to refresh your beauty routine! 🌸

🌟 SPRING SPECIALS (Limited Time):
• Fresh Facial Package: 3 treatments for $200 (save $55!)
• Spring Glow Bundle: Facial + Teeth Whitening for $150 (save $30!)
• Renewal Package: Any 2 services for 25% off

✨ New This Season:
We're excited to introduce our Spring Renewal Facial - designed to rejuvenate your skin after the winter months.

These offers end {{promotion_end_date}}, so book soon!

Reserve your spot: {{website_url}}
Questions? Call us: {{business_phone}}

Spring into beauty with us!

{{business_name}}`
      }
    ];

    const smsTemplates = [
      {
        id: "sms_reminder",
        name: "SMS Appointment Reminder",
        type: "sms",
        content: "Hi {{client_first_name}}! Reminder: {{service_name}} appointment tomorrow at {{appointment_time}}. See you at {{business_name}}! Reply STOP to opt out."
      },
      {
        id: "sms_confirmation", 
        name: "SMS Booking Confirmation",
        type: "sms",
        content: "Booking confirmed! {{service_name}} on {{appointment_date}} at {{appointment_time}}. {{business_name}} - {{business_phone}}. Reply STOP to opt out."
      },
      {
        id: "sms_promo",
        name: "SMS Promotion",
        type: "sms", 
        content: "🌟 Special offer for {{client_first_name}}! 20% off your next visit. Book by {{offer_expires}}. {{business_name}} - {{booking_url}}. Reply STOP to opt out."
      }
    ];

    setTemplates([...emailTemplates, ...smsTemplates]);
  };

  const createCampaign = async () => {
    if (!newCampaign.name || !newCampaign.message_content) {
      toast.error("Campaign name and message content are required");
      return;
    }

    if (newCampaign.campaign_type === "email" && !newCampaign.subject_line) {
      toast.error("Subject line is required for email campaigns");
      return;
    }

    setCreating(true);

    try {
      await axios.post("/marketing/campaigns", newCampaign);
      toast.success("Campaign created successfully");
      
      // Reset form
      setNewCampaign({
        name: "",
        description: "",
        campaign_type: "email",
        subject_line: "",
        message_content: "",
        target_audience: {},
        send_at: null,
        is_recurring: false,
        recurring_schedule: null,
        trigger_event: null,
        trigger_delay_hours: null
      });
      
      fetchCampaigns(); // Refresh campaigns
    } catch (error) {
      console.error("Failed to create campaign:", error);
      toast.error("Failed to create campaign");
    } finally {
      setCreating(false);
    }
  };

  const useTemplate = (template) => {
    setNewCampaign({
      ...newCampaign,
      name: template.name,
      campaign_type: template.type,
      subject_line: template.subject || "",
      message_content: template.content,
      description: `Campaign based on ${template.name} template`
    });
    setSelectedTemplate(template);
    setActiveTab("create");
  };

  const campaignTypes = [
    { value: "email", label: "Email Campaign" },
    { value: "sms", label: "SMS Campaign" },
    { value: "automated_drip", label: "Automated Drip Campaign" }
  ];

  const triggerEvents = [
    { value: "appointment_booked", label: "Appointment Booked" },
    { value: "appointment_completed", label: "Appointment Completed" },
    { value: "client_birthday", label: "Client Birthday" },
    { value: "client_registered", label: "Client Registered" },
    { value: "no_visit_30_days", label: "No Visit for 30 Days" },
    { value: "no_visit_60_days", label: "No Visit for 60 Days" }
  ];

  if (!isStaff) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert>
          <AlertDescription>
            You don't have permission to access marketing campaigns. This feature is only available to staff members.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6" data-testid="marketing-campaign-manager">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Marketing Campaign Manager
        </h1>
        <p className="text-gray-600">
          Create and manage email campaigns, SMS messages, and automated marketing sequences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="campaigns" data-testid="campaigns-tab">Campaigns</TabsTrigger>
          <TabsTrigger value="create" data-testid="create-tab">Create New</TabsTrigger>
          <TabsTrigger value="templates" data-testid="templates-tab">Templates</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="analytics-tab">Analytics</TabsTrigger>
        </TabsList>

        {/* Campaigns List */}
        <TabsContent value="campaigns" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Campaigns</CardTitle>
                <Button onClick={() => setActiveTab("create")}>
                  Create Campaign
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4" data-testid="campaigns-list">
                {campaigns.length > 0 ? (
                  campaigns.map((campaign) => (
                    <div key={campaign.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold">{campaign.name}</h3>
                            <Badge variant="outline">{campaign.campaign_type}</Badge>
                            <Badge className={
                              campaign.status === "active" ? "bg-green-100 text-green-800" :
                              campaign.status === "completed" ? "bg-blue-100 text-blue-800" :
                              campaign.status === "paused" ? "bg-yellow-100 text-yellow-800" :
                              "bg-gray-100 text-gray-800"
                            }>
                              {campaign.status}
                            </Badge>
                          </div>
                          
                          {campaign.description && (
                            <p className="text-gray-600 mb-3">{campaign.description}</p>
                          )}
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Recipients:</span>
                              <div className="font-medium">{campaign.total_recipients}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Delivered:</span>
                              <div className="font-medium">{campaign.delivery_count}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Opened:</span>
                              <div className="font-medium">{campaign.open_count}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Clicked:</span>
                              <div className="font-medium">{campaign.click_count}</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">No campaigns created yet</p>
                    <Button onClick={() => setActiveTab("create")}>
                      Create Your First Campaign
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create Campaign */}
        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Campaign</CardTitle>
              {selectedTemplate && (
                <div className="text-sm text-gray-600">
                  Using template: <strong>{selectedTemplate.name}</strong>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="campaign-name">Campaign Name *</Label>
                  <Input
                    id="campaign-name"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                    placeholder="e.g., Summer Promotion 2024"
                    data-testid="campaign-name-input"
                  />
                </div>
                
                <div>
                  <Label htmlFor="campaign-type">Campaign Type</Label>
                  <Select 
                    value={newCampaign.campaign_type}
                    onValueChange={(value) => setNewCampaign({...newCampaign, campaign_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {campaignTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="campaign-description">Description</Label>
                <Input
                  id="campaign-description"
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign({...newCampaign, description: e.target.value})}
                  placeholder="Brief description of this campaign"
                />
              </div>

              {/* Email Subject Line */}
              {newCampaign.campaign_type === "email" && (
                <div>
                  <Label htmlFor="subject-line">Subject Line *</Label>
                  <Input
                    id="subject-line"
                    value={newCampaign.subject_line}
                    onChange={(e) => setNewCampaign({...newCampaign, subject_line: e.target.value})}
                    placeholder="Enter email subject line"
                    data-testid="subject-line-input"
                  />
                </div>
              )}

              {/* Message Content */}
              <div>
                <Label htmlFor="message-content">Message Content *</Label>
                <Textarea
                  id="message-content"
                  value={newCampaign.message_content}
                  onChange={(e) => setNewCampaign({...newCampaign, message_content: e.target.value})}
                  placeholder="Write your message content here..."
                  rows={12}
                  className="resize-none"
                  data-testid="message-content-textarea"
                />
                <div className="mt-2 text-sm text-gray-500">
                  Available variables: {`{{client_first_name}}, {{business_name}}, {{service_name}}, {{appointment_date}}, {{appointment_time}}`}
                </div>
              </div>

              {/* Automation Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Automation Settings</h3>
                
                <div>
                  <Label htmlFor="trigger-event">Trigger Event</Label>
                  <Select 
                    value={newCampaign.trigger_event || ""}
                    onValueChange={(value) => setNewCampaign({...newCampaign, trigger_event: value || null})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select trigger event (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No automation (manual send)</SelectItem>
                      {triggerEvents.map((event) => (
                        <SelectItem key={event.value} value={event.value}>
                          {event.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {newCampaign.trigger_event && (
                  <div>
                    <Label htmlFor="trigger-delay">Delay (hours after trigger)</Label>
                    <Input
                      id="trigger-delay"
                      type="number"
                      value={newCampaign.trigger_delay_hours || ""}
                      onChange={(e) => setNewCampaign({...newCampaign, trigger_delay_hours: e.target.value ? parseInt(e.target.value) : null})}
                      placeholder="e.g., 24 for 24 hours after"
                    />
                  </div>
                )}
              </div>

              {/* Scheduling */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Scheduling</h3>
                
                <div>
                  <Label htmlFor="send-at">Send At (optional)</Label>
                  <Input
                    id="send-at"
                    type="datetime-local"
                    value={newCampaign.send_at || ""}
                    onChange={(e) => setNewCampaign({...newCampaign, send_at: e.target.value || null})}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newCampaign.is_recurring}
                    onCheckedChange={(checked) => setNewCampaign({...newCampaign, is_recurring: checked})}
                  />
                  <Label>Recurring campaign</Label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-4">
                <Button
                  onClick={createCampaign}
                  disabled={creating}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                  data-testid="create-campaign-btn"
                >
                  {creating ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Creating...
                    </>
                  ) : (
                    "Create Campaign"
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setNewCampaign({
                      name: "",
                      description: "",
                      campaign_type: "email",
                      subject_line: "",
                      message_content: "",
                      target_audience: {},
                      send_at: null,
                      is_recurring: false,
                      recurring_schedule: null,
                      trigger_event: null,
                      trigger_delay_hours: null
                    });
                    setSelectedTemplate(null);
                  }}
                >
                  Clear Form
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Templates</CardTitle>
              <div className="text-sm text-gray-600">
                Pre-built templates to get you started quickly
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="templates-list">
                {templates.map((template) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <Badge variant="outline">{template.type}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {template.subject && (
                        <div className="mb-3">
                          <Label className="text-sm font-medium">Subject:</Label>
                          <p className="text-sm text-gray-600">{template.subject}</p>
                        </div>
                      )}
                      
                      <div className="mb-4">
                        <Label className="text-sm font-medium">Preview:</Label>
                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded mt-1 max-h-32 overflow-hidden">
                          {template.content.substring(0, 200)}...
                        </div>
                      </div>
                      
                      <Button 
                        size="sm" 
                        onClick={() => useTemplate(template)}
                        className="w-full"
                        data-testid={`use-template-${template.id}`}
                      >
                        Use Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaigns.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.filter(c => c.status === "active").length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.reduce((sum, c) => sum + c.total_recipients, 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Avg. Open Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.length > 0 
                    ? Math.round((campaigns.reduce((sum, c) => sum + (c.open_count / c.total_recipients || 0), 0) / campaigns.length) * 100)
                    : 0
                  }%
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {campaigns.length > 0 ? (
                <div className="space-y-4">
                  {campaigns.slice(0, 5).map((campaign) => {
                    const openRate = campaign.total_recipients > 0 ? (campaign.open_count / campaign.total_recipients * 100) : 0;
                    const clickRate = campaign.total_recipients > 0 ? (campaign.click_count / campaign.total_recipients * 100) : 0;
                    
                    return (
                      <div key={campaign.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{campaign.name}</h4>
                          <Badge variant="outline">{campaign.campaign_type}</Badge>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Recipients:</span>
                            <div className="font-medium">{campaign.total_recipients}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Delivered:</span>
                            <div className="font-medium">{campaign.delivery_count}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Open Rate:</span>
                            <div className="font-medium">{openRate.toFixed(1)}%</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Click Rate:</span>
                            <div className="font-medium">{clickRate.toFixed(1)}%</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No campaign data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MarketingCampaignManager;