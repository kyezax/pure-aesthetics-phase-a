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
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import LoadingSpinner from "../ui/LoadingSpinner";
import { toast } from "sonner";

const ConsultationFormBuilder = () => {
  const { user, isAdmin } = useAuth();
  const [forms, setForms] = useState([]);
  const [editingForm, setEditingForm] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_required_for_new_clients: false,
    form_fields: []
  });
  const [newField, setNewField] = useState({
    type: "text",
    name: "",
    label: "",
    placeholder: "",
    description: "",
    required: false,
    options: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const response = await axios.get("/consultation-forms?active_only=false");
      setForms(response.data);
    } catch (error) {
      console.error("Failed to fetch forms:", error);
      toast.error("Failed to load consultation forms");
    } finally {
      setLoading(false);
    }
  };

  const createNewForm = () => {
    setEditingForm(null);
    setFormData({
      name: "",
      description: "",
      is_required_for_new_clients: false,
      form_fields: []
    });
    resetNewField();
  };

  const editForm = (form) => {
    setEditingForm(form);
    setFormData({
      name: form.name,
      description: form.description || "",
      is_required_for_new_clients: form.is_required_for_new_clients,
      form_fields: [...form.form_fields]
    });
    resetNewField();
  };

  const resetNewField = () => {
    setNewField({
      type: "text",
      name: "",
      label: "",
      placeholder: "",
      description: "",
      required: false,
      options: []
    });
  };

  const addFieldOption = () => {
    const newOption = { label: "", value: "" };
    setNewField({
      ...newField,
      options: [...newField.options, newOption]
    });
  };

  const updateFieldOption = (index, key, value) => {
    const updatedOptions = [...newField.options];
    updatedOptions[index][key] = value;
    setNewField({
      ...newField,
      options: updatedOptions
    });
  };

  const removeFieldOption = (index) => {
    const updatedOptions = newField.options.filter((_, i) => i !== index);
    setNewField({
      ...newField,
      options: updatedOptions
    });
  };

  const addField = () => {
    if (!newField.name || !newField.label) {
      toast.error("Field name and label are required");
      return;
    }

    // Generate field name from label if not provided
    const fieldName = newField.name || newField.label.toLowerCase().replace(/[^a-z0-9]/g, '_');

    // Validate select fields have options
    if (newField.type === "select" && newField.options.length === 0) {
      toast.error("Select fields must have at least one option");
      return;
    }

    const field = {
      ...newField,
      name: fieldName,
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    setFormData({
      ...formData,
      form_fields: [...formData.form_fields, field]
    });

    resetNewField();
    toast.success("Field added successfully");
  };

  const removeField = (index) => {
    const updatedFields = formData.form_fields.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      form_fields: updatedFields
    });
  };

  const moveField = (index, direction) => {
    const fields = [...formData.form_fields];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < fields.length) {
      [fields[index], fields[newIndex]] = [fields[newIndex], fields[index]];
      setFormData({
        ...formData,
        form_fields: fields
      });
    }
  };

  const saveForm = async () => {
    if (!formData.name) {
      toast.error("Form name is required");
      return;
    }

    if (formData.form_fields.length === 0) {
      toast.error("At least one field is required");
      return;
    }

    setSaving(true);

    try {
      if (editingForm) {
        await axios.put(`/consultation-forms/${editingForm.id}`, formData);
        toast.success("Form updated successfully");
      } else {
        await axios.post("/consultation-forms", formData);
        toast.success("Form created successfully");
      }

      fetchForms(); // Refresh the forms list
      setEditingForm(null);
      setFormData({
        name: "",
        description: "",
        is_required_for_new_clients: false,
        form_fields: []
      });
    } catch (error) {
      console.error("Failed to save form:", error);
      toast.error("Failed to save form");
    } finally {
      setSaving(false);
    }
  };

  const fieldTypes = [
    { value: "text", label: "Text Input" },
    { value: "textarea", label: "Long Text (Textarea)" },
    { value: "select", label: "Dropdown Select" },
    { value: "checkbox", label: "Checkbox" },
    { value: "radio", label: "Radio Button Group" },
    { value: "number", label: "Number Input" },
    { value: "email", label: "Email Input" },
    { value: "phone", label: "Phone Input" },
    { value: "date", label: "Date Picker" }
  ];

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert>
          <AlertDescription>
            You don't have permission to access the consultation form builder. This feature is only available to administrators.
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
    <div className="max-w-7xl mx-auto p-6" data-testid="consultation-form-builder">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Consultation Form Builder
        </h1>
        <p className="text-gray-600">
          Create custom consultation forms for different services and treatments
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Forms List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Consultation Forms</CardTitle>
              <Button 
                onClick={createNewForm}
                size="sm"
                data-testid="create-new-form-btn"
              >
                New Form
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3" data-testid="forms-list">
              {forms.length > 0 ? (
                forms.map((form) => (
                  <div
                    key={form.id}
                    className={`
                      p-3 border rounded-lg cursor-pointer transition-all
                      ${editingForm?.id === form.id 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-gray-200 hover:border-purple-300'
                      }
                    `}
                    onClick={() => editForm(form)}
                    data-testid={`form-item-${form.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800 mb-1">
                          {form.name}
                        </h4>
                        {form.description && (
                          <p className="text-sm text-gray-600 mb-2">
                            {form.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-2">
                          <Badge variant={form.is_active ? "default" : "secondary"}>
                            {form.is_active ? "Active" : "Inactive"}
                          </Badge>
                          {form.is_required_for_new_clients && (
                            <Badge variant="outline">Required</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      {form.form_fields.length} field{form.form_fields.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">No forms created yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Form Builder */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {editingForm ? `Edit Form: ${editingForm.name}` : "Create New Form"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Form Basic Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="form-name">Form Name *</Label>
                <Input
                  id="form-name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Facial Consultation Form"
                  data-testid="form-name-input"
                />
              </div>

              <div>
                <Label htmlFor="form-description">Description</Label>
                <Textarea
                  id="form-description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe what this form is for..."
                  rows={3}
                  data-testid="form-description-input"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_required_for_new_clients}
                  onCheckedChange={(checked) => setFormData({...formData, is_required_for_new_clients: checked})}
                  data-testid="required-for-new-clients-switch"
                />
                <Label>Required for new clients</Label>
              </div>
            </div>

            <Separator />

            {/* Add New Field */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Add Field</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="field-type">Field Type *</Label>
                  <Select
                    value={newField.type}
                    onValueChange={(value) => setNewField({...newField, type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="field-label">Field Label *</Label>
                  <Input
                    id="field-label"
                    value={newField.label}
                    onChange={(e) => setNewField({...newField, label: e.target.value})}
                    placeholder="e.g., Do you have any allergies?"
                  />
                </div>

                <div>
                  <Label htmlFor="field-name">Field Name</Label>
                  <Input
                    id="field-name"
                    value={newField.name}
                    onChange={(e) => setNewField({...newField, name: e.target.value})}
                    placeholder="Auto-generated from label"
                  />
                </div>

                <div>
                  <Label htmlFor="field-placeholder">Placeholder</Label>
                  <Input
                    id="field-placeholder"
                    value={newField.placeholder}
                    onChange={(e) => setNewField({...newField, placeholder: e.target.value})}
                    placeholder="Placeholder text..."
                  />
                </div>
              </div>

              <div className="mb-4">
                <Label htmlFor="field-description">Help Text</Label>
                <Input
                  id="field-description"
                  value={newField.description}
                  onChange={(e) => setNewField({...newField, description: e.target.value})}
                  placeholder="Optional help text for users"
                />
              </div>

              {/* Options for select/radio fields */}
              {(newField.type === "select" || newField.type === "radio") && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <Label>Options</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addFieldOption}
                      data-testid="add-option-btn"
                    >
                      Add Option
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {newField.options.map((option, index) => (
                      <div key={index} className="flex space-x-2">
                        <Input
                          placeholder="Option label"
                          value={option.label}
                          onChange={(e) => updateFieldOption(index, 'label', e.target.value)}
                        />
                        <Input
                          placeholder="Option value"
                          value={option.value}
                          onChange={(e) => updateFieldOption(index, 'value', e.target.value)}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeFieldOption(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newField.required}
                    onCheckedChange={(checked) => setNewField({...newField, required: checked})}
                  />
                  <Label>Required field</Label>
                </div>

                <Button onClick={addField} data-testid="add-field-btn">
                  Add Field
                </Button>
              </div>
            </div>

            <Separator />

            {/* Form Fields List */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Form Fields</h3>
              
              {formData.form_fields.length > 0 ? (
                <div className="space-y-3" data-testid="form-fields-list">
                  {formData.form_fields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Badge variant="outline">{field.type}</Badge>
                            <h4 className="font-medium">{field.label}</h4>
                            {field.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                          </div>
                          
                          {field.description && (
                            <p className="text-sm text-gray-600 mb-2">{field.description}</p>
                          )}
                          
                          {field.placeholder && (
                            <p className="text-xs text-gray-500">Placeholder: {field.placeholder}</p>
                          )}
                          
                          {field.options && field.options.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 mb-1">Options:</p>
                              <div className="flex flex-wrap gap-1">
                                {field.options.map((option, optIndex) => (
                                  <Badge key={optIndex} variant="secondary" className="text-xs">
                                    {option.label}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-1 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => moveField(index, 'up')}
                            disabled={index === 0}
                          >
                            ↑
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => moveField(index, 'down')}
                            disabled={index === formData.form_fields.length - 1}
                          >
                            ↓
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeField(index)}
                            className="text-red-600"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No fields added yet. Add fields using the form above.
                </div>
              )}
            </div>

            {/* Save Form */}
            {formData.form_fields.length > 0 && (
              <div className="flex space-x-4">
                <Button
                  onClick={saveForm}
                  disabled={saving}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                  data-testid="save-form-btn"
                >
                  {saving ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Saving...
                    </>
                  ) : (
                    editingForm ? "Update Form" : "Create Form"
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={createNewForm}
                  disabled={saving}
                  data-testid="cancel-btn"
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConsultationFormBuilder;