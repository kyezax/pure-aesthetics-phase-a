import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../../App";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LoadingSpinner from "../ui/LoadingSpinner";
import { toast } from "sonner";

const ClientProfileManager = ({ clientId: propClientId }) => {
  const { user, isStaff } = useAuth();
  const clientId = propClientId || user?.id;
  
  const [profile, setProfile] = useState(null);
  const [notes, setNotes] = useState([]);
  const [files, setFiles] = useState([]);
  const [loyaltyHistory, setLoyaltyHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");

  // Note creation state
  const [newNote, setNewNote] = useState({
    title: "",
    content: "",
    note_type: "general",
    category: "",
    is_private: false,
    is_alert: false,
    // SOAP notes
    subjective: "",
    objective: "",
    assessment: "",
    plan: ""
  });

  // File upload state
  const [fileUpload, setFileUpload] = useState({
    file: null,
    category: "other",
    title: "",
    description: "",
    is_before_photo: false,
    is_after_photo: false
  });

  useEffect(() => {
    if (clientId) {
      fetchClientData();
    }
  }, [clientId]);

  const fetchClientData = async () => {
    try {
      const [profileRes, notesRes, filesRes, loyaltyRes] = await Promise.allSettled([
        axios.get(`/clients/${clientId}/profile`),
        axios.get(`/clients/${clientId}/notes`),
        axios.get(`/clients/${clientId}/files`),
        axios.get(`/clients/${clientId}/loyalty/history`)
      ]);

      if (profileRes.status === "fulfilled") {
        setProfile(profileRes.value.data);
      }
      if (notesRes.status === "fulfilled") {
        setNotes(notesRes.value.data);
      }
      if (filesRes.status === "fulfilled") {
        setFiles(filesRes.value.data);
      }
      if (loyaltyRes.status === "fulfilled") {
        setLoyaltyHistory(loyaltyRes.value.data);
      }
    } catch (error) {
      console.error("Failed to fetch client data:", error);
      toast.error("Failed to load client data");
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updatedData) => {
    try {
      await axios.put(`/clients/${clientId}/profile`, updatedData);
      toast.success("Profile updated successfully");
      fetchClientData(); // Refresh data
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

  const createNote = async () => {
    if (!newNote.title || !newNote.content) {
      toast.error("Please fill in title and content");
      return;
    }

    try {
      await axios.post(`/clients/${clientId}/notes`, newNote);
      toast.success("Note created successfully");
      
      // Reset form
      setNewNote({
        title: "",
        content: "",
        note_type: "general",
        category: "",
        is_private: false,
        is_alert: false,
        subjective: "",
        objective: "",
        assessment: "",
        plan: ""
      });
      
      fetchClientData(); // Refresh notes
    } catch (error) {
      toast.error("Failed to create note");
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", fileUpload.category);
    formData.append("title", fileUpload.title || file.name);
    formData.append("description", fileUpload.description);
    formData.append("is_before_photo", fileUpload.is_before_photo);
    formData.append("is_after_photo", fileUpload.is_after_photo);

    try {
      await axios.post(`/clients/${clientId}/files`, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      
      toast.success("File uploaded successfully");
      
      // Reset form
      setFileUpload({
        file: null,
        category: "other",
        title: "",
        description: "",
        is_before_photo: false,
        is_after_photo: false
      });
      
      // Clear file input
      event.target.value = "";
      
      fetchClientData(); // Refresh files
    } catch (error) {
      toast.error("Failed to upload file");
    }
  };

  const awardLoyaltyPoints = async (points, description) => {
    if (!isStaff) return;

    try {
      await axios.post(`/clients/${clientId}/loyalty/award`, {
        points: parseInt(points),
        description
      });
      toast.success(`Awarded ${points} loyalty points`);
      fetchClientData(); // Refresh data
    } catch (error) {
      toast.error("Failed to award points");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">Client profile not found</p>
      </div>
    );
  }

  const noteTypes = [
    { value: "general", label: "General Note" },
    { value: "medical", label: "Medical Information" },
    { value: "treatment", label: "Treatment Notes" },
    { value: "allergy", label: "Allergy Information" },
    { value: "preference", label: "Client Preference" },
    { value: "soap", label: "SOAP Notes" }
  ];

  const fileCategories = [
    { value: "consultation_form", label: "Consultation Form" },
    { value: "before_after_photo", label: "Before/After Photo" },
    { value: "treatment_photo", label: "Treatment Photo" },
    { value: "identification", label: "Identification" },
    { value: "medical_record", label: "Medical Record" },
    { value: "consent_form", label: "Consent Form" },
    { value: "other", label: "Other" }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6" data-testid="client-profile-manager">
      {/* Profile Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              {profile.first_name} {profile.last_name}
            </h1>
            <div className="flex items-center space-x-4 mt-2">
              <Badge variant="outline">{profile.role}</Badge>
              <span className="text-gray-600">{profile.email}</span>
              {profile.phone && (
                <span className="text-gray-600">{profile.phone}</span>
              )}
            </div>
          </div>
          
          {/* Loyalty Points Display */}
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-600">
              {profile.total_loyalty_points} Points
            </div>
            <div className="text-sm text-gray-600">
              Total Spent: ${(profile.total_spent_cents / 100).toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">
              {profile.total_appointments} Appointments
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile" data-testid="profile-tab">Profile</TabsTrigger>
          <TabsTrigger value="notes" data-testid="notes-tab">Notes</TabsTrigger>
          <TabsTrigger value="files" data-testid="files-tab">Files</TabsTrigger>
          <TabsTrigger value="loyalty" data-testid="loyalty-tab">Loyalty</TabsTrigger>
          {isStaff && (
            <TabsTrigger value="admin" data-testid="admin-tab">Admin</TabsTrigger>
          )}
        </TabsList>

        {/* Profile Information */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <Input 
                      value={profile.first_name} 
                      onChange={(e) => setProfile({...profile, first_name: e.target.value})}
                      disabled={!isStaff}
                    />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input 
                      value={profile.last_name} 
                      onChange={(e) => setProfile({...profile, last_name: e.target.value})}
                      disabled={!isStaff}
                    />
                  </div>
                </div>
                
                <div>
                  <Label>Email</Label>
                  <Input value={profile.email} disabled />
                </div>
                
                <div>
                  <Label>Phone</Label>
                  <Input 
                    value={profile.phone || ""} 
                    onChange={(e) => setProfile({...profile, phone: e.target.value})}
                    disabled={!isStaff}
                  />
                </div>

                {isStaff && (
                  <Button 
                    onClick={() => updateProfile(profile)}
                    className="w-full"
                    data-testid="update-profile-btn"
                  >
                    Update Profile
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Medical & Preferences */}
            <Card>
              <CardHeader>
                <CardTitle>Medical & Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Skin Type</Label>
                  <Select 
                    value={profile.skin_type || ""} 
                    onValueChange={(value) => setProfile({...profile, skin_type: value})}
                    disabled={!isStaff}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select skin type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="dry">Dry</SelectItem>
                      <SelectItem value="oily">Oily</SelectItem>
                      <SelectItem value="combination">Combination</SelectItem>
                      <SelectItem value="sensitive">Sensitive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Medical Conditions</Label>
                  <Textarea 
                    value={profile.medical_conditions || ""} 
                    onChange={(e) => setProfile({...profile, medical_conditions: e.target.value})}
                    placeholder="Any relevant medical conditions..."
                    disabled={!isStaff}
                  />
                </div>

                <div>
                  <Label>Allergies</Label>
                  <Textarea 
                    value={profile.allergies || ""} 
                    onChange={(e) => setProfile({...profile, allergies: e.target.value})}
                    placeholder="Known allergies..."
                    disabled={!isStaff}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Contact Name</Label>
                  <Input 
                    value={profile.emergency_contact_name || ""} 
                    onChange={(e) => setProfile({...profile, emergency_contact_name: e.target.value})}
                    disabled={!isStaff}
                  />
                </div>
                
                <div>
                  <Label>Contact Phone</Label>
                  <Input 
                    value={profile.emergency_contact_phone || ""} 
                    onChange={(e) => setProfile({...profile, emergency_contact_phone: e.target.value})}
                    disabled={!isStaff}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Marketing Preferences */}
            <Card>
              <CardHeader>
                <CardTitle>Communication Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Email Marketing</Label>
                  <Switch 
                    checked={profile.email_marketing}
                    onCheckedChange={(checked) => setProfile({...profile, email_marketing: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>SMS Marketing</Label>
                  <Switch 
                    checked={profile.sms_marketing}
                    onCheckedChange={(checked) => setProfile({...profile, sms_marketing: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label>Appointment Reminders</Label>
                  <Switch 
                    checked={profile.appointment_reminders}
                    onCheckedChange={(checked) => setProfile({...profile, appointment_reminders: checked})}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Client Notes */}
        <TabsContent value="notes" className="space-y-6">
          {isStaff && (
            <Card>
              <CardHeader>
                <CardTitle>Add New Note</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Title</Label>
                    <Input 
                      value={newNote.title}
                      onChange={(e) => setNewNote({...newNote, title: e.target.value})}
                      placeholder="Note title..."
                    />
                  </div>
                  
                  <div>
                    <Label>Note Type</Label>
                    <Select 
                      value={newNote.note_type} 
                      onValueChange={(value) => setNewNote({...newNote, note_type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {noteTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {newNote.note_type === "soap" ? (
                  // SOAP Notes Format
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Subjective</Label>
                      <Textarea 
                        value={newNote.subjective}
                        onChange={(e) => setNewNote({...newNote, subjective: e.target.value})}
                        placeholder="Patient's symptoms and concerns..."
                      />
                    </div>
                    <div>
                      <Label>Objective</Label>
                      <Textarea 
                        value={newNote.objective}
                        onChange={(e) => setNewNote({...newNote, objective: e.target.value})}
                        placeholder="Observable findings..."
                      />
                    </div>
                    <div>
                      <Label>Assessment</Label>
                      <Textarea 
                        value={newNote.assessment}
                        onChange={(e) => setNewNote({...newNote, assessment: e.target.value})}
                        placeholder="Professional assessment..."
                      />
                    </div>
                    <div>
                      <Label>Plan</Label>
                      <Textarea 
                        value={newNote.plan}
                        onChange={(e) => setNewNote({...newNote, plan: e.target.value})}
                        placeholder="Treatment plan..."
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label>Content</Label>
                    <Textarea 
                      value={newNote.content}
                      onChange={(e) => setNewNote({...newNote, content: e.target.value})}
                      placeholder="Note content..."
                      rows={4}
                    />
                  </div>
                )}

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      checked={newNote.is_private}
                      onCheckedChange={(checked) => setNewNote({...newNote, is_private: checked})}
                    />
                    <Label>Private Note</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      checked={newNote.is_alert}
                      onCheckedChange={(checked) => setNewNote({...newNote, is_alert: checked})}
                    />
                    <Label>Show as Alert</Label>
                  </div>
                </div>

                <Button onClick={createNote} data-testid="create-note-btn">
                  Create Note
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Notes List */}
          <div className="space-y-4" data-testid="notes-list">
            {notes.length > 0 ? (
              notes.map((note) => (
                <Card key={note.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{note.title}</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{note.note_type}</Badge>
                        {note.is_private && <Badge variant="destructive">Private</Badge>}
                        {note.is_alert && <Badge variant="secondary">Alert</Badge>}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      By {note.created_by_name} • {new Date(note.created_at).toLocaleDateString()}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {note.note_type === "soap" ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {note.subjective && (
                          <div>
                            <Label className="font-semibold">Subjective:</Label>
                            <p className="text-sm mt-1">{note.subjective}</p>
                          </div>
                        )}
                        {note.objective && (
                          <div>
                            <Label className="font-semibold">Objective:</Label>
                            <p className="text-sm mt-1">{note.objective}</p>
                          </div>
                        )}
                        {note.assessment && (
                          <div>
                            <Label className="font-semibold">Assessment:</Label>
                            <p className="text-sm mt-1">{note.assessment}</p>
                          </div>
                        )}
                        {note.plan && (
                          <div>
                            <Label className="font-semibold">Plan:</Label>
                            <p className="text-sm mt-1">{note.plan}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-700">{note.content}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No notes available</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Files & Documents */}
        <TabsContent value="files" className="space-y-6">
          {isStaff && (
            <Card>
              <CardHeader>
                <CardTitle>Upload File</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>File Category</Label>
                    <Select 
                      value={fileUpload.category} 
                      onValueChange={(value) => setFileUpload({...fileUpload, category: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fileCategories.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Title</Label>
                    <Input 
                      value={fileUpload.title}
                      onChange={(e) => setFileUpload({...fileUpload, title: e.target.value})}
                      placeholder="File title..."
                    />
                  </div>
                </div>

                <div>
                  <Label>Description</Label>
                  <Input 
                    value={fileUpload.description}
                    onChange={(e) => setFileUpload({...fileUpload, description: e.target.value})}
                    placeholder="File description..."
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      checked={fileUpload.is_before_photo}
                      onCheckedChange={(checked) => setFileUpload({...fileUpload, is_before_photo: checked})}
                    />
                    <Label>Before Photo</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      checked={fileUpload.is_after_photo}
                      onCheckedChange={(checked) => setFileUpload({...fileUpload, is_after_photo: checked})}
                    />
                    <Label>After Photo</Label>
                  </div>
                </div>

                <div>
                  <Label>Select File</Label>
                  <Input 
                    type="file" 
                    onChange={handleFileUpload}
                    accept="image/*,.pdf,.doc,.docx"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Files List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="files-list">
            {files.length > 0 ? (
              files.map((file) => (
                <Card key={file.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{file.title}</CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {file.file_category.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {file.mime_type?.startsWith('image/') ? (
                      <img 
                        src={file.url} 
                        alt={file.title}
                        className="w-full h-32 object-cover rounded mb-2"
                      />
                    ) : (
                      <div className="w-full h-32 bg-gray-100 rounded mb-2 flex items-center justify-center">
                        <span className="text-gray-500 text-sm">Document</span>
                      </div>
                    )}
                    
                    <div className="space-y-1">
                      {file.description && (
                        <p className="text-xs text-gray-600">{file.description}</p>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{(file.file_size / 1024 / 1024).toFixed(2)} MB</span>
                        <span>{new Date(file.created_at).toLocaleDateString()}</span>
                      </div>
                      
                      {(file.is_before_photo || file.is_after_photo) && (
                        <div className="flex space-x-1">
                          {file.is_before_photo && <Badge variant="secondary" className="text-xs">Before</Badge>}
                          {file.is_after_photo && <Badge variant="secondary" className="text-xs">After</Badge>}
                        </div>
                      )}
                      
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full text-xs"
                        onClick={() => window.open(file.url, '_blank')}
                      >
                        View File
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <p className="text-gray-500">No files uploaded</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Loyalty Points */}
        <TabsContent value="loyalty" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Loyalty Points Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {profile.total_loyalty_points}
                  </div>
                  <div className="text-sm text-gray-600">Available Points</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {profile.points_redeemed}
                  </div>
                  <div className="text-sm text-gray-600">Points Redeemed</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    ${(profile.total_spent_cents / 100).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">Total Spent</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loyalty History */}
          <Card>
            <CardHeader>
              <CardTitle>Points History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4" data-testid="loyalty-history">
                {loyaltyHistory.length > 0 ? (
                  loyaltyHistory.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${
                          transaction.points_change > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.points_change > 0 ? '+' : ''}{transaction.points_change}
                        </p>
                        <p className="text-sm text-gray-600">
                          Balance: {transaction.points_balance}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No loyalty transactions yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Tools */}
        {isStaff && (
          <TabsContent value="admin" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Admin Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Award Points */}
                <div className="p-4 border rounded">
                  <h4 className="font-semibold mb-2">Award Loyalty Points</h4>
                  <div className="flex space-x-2">
                    <Input 
                      placeholder="Points to award"
                      type="number"
                      id="award-points"
                    />
                    <Input 
                      placeholder="Reason"
                      id="award-reason"
                    />
                    <Button 
                      onClick={() => {
                        const points = document.getElementById('award-points').value;
                        const reason = document.getElementById('award-reason').value;
                        if (points && reason) {
                          awardLoyaltyPoints(points, reason);
                          document.getElementById('award-points').value = '';
                          document.getElementById('award-reason').value = '';
                        }
                      }}
                      data-testid="award-points-btn"
                    >
                      Award Points
                    </Button>
                  </div>
                </div>

                {/* Client Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded">
                    <h4 className="font-semibold mb-2">Client Statistics</h4>
                    <div className="space-y-2 text-sm">
                      <div>Member since: {new Date(profile.created_at).toLocaleDateString()}</div>
                      <div>Total appointments: {profile.total_appointments}</div>
                      <div>Last appointment: {profile.last_appointment_date ? new Date(profile.last_appointment_date).toLocaleDateString() : 'Never'}</div>
                    </div>
                  </div>

                  <div className="p-4 border rounded">
                    <h4 className="font-semibold mb-2">Account Status</h4>
                    <div className="space-y-2">
                      <Badge variant={profile.is_active ? "default" : "destructive"}>
                        {profile.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <div className="text-sm">
                        Role: {profile.role}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default ClientProfileManager;