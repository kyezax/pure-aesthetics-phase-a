from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict
import os
import shutil
import uuid
from pathlib import Path
from dotenv import load_dotenv
import logging

# Import models and dependencies
from enhanced_models import *
from database import get_db, init_database
from auth import authenticate_user, create_access_token, get_current_user, get_admin_user, get_staff_user, get_password_hash

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Professional Beauty Salon Management System",
    description="Complete salon management with booking, customer profiles, marketing automation, and more",
    version="2.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv('CORS_ORIGINS', '*').split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory and serve static files
UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Pydantic models for API
class EnhancedUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    email: str
    first_name: str
    last_name: str
    phone: Optional[str]
    role: UserRole
    is_active: bool
    
    # Enhanced profile fields
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    medical_conditions: Optional[str] = None
    allergies: Optional[str] = None
    skin_type: Optional[str] = None
    
    # Marketing preferences
    email_marketing: bool = True
    sms_marketing: bool = True
    appointment_reminders: bool = True
    
    # Loyalty info
    total_loyalty_points: int = 0
    total_spent_cents: int = 0
    total_appointments: int = 0
    
    created_at: datetime

class ClientNoteCreate(BaseModel):
    title: str
    content: str
    note_type: str = "general"
    category: Optional[str] = None
    is_private: bool = False
    is_alert: bool = False
    
    # SOAP notes
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None

class ClientNoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    title: str
    content: str
    note_type: str
    category: Optional[str]
    is_private: bool
    is_alert: bool
    
    # SOAP notes
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    
    created_by_name: str
    created_at: datetime

class ConsultationFormCreate(BaseModel):
    name: str
    description: Optional[str] = None
    form_fields: List[Dict[str, Any]]  # Dynamic form structure
    is_required_for_new_clients: bool = False

class ConsultationFormResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    name: str
    description: Optional[str]
    form_fields: List[Dict[str, Any]]
    is_active: bool
    is_required_for_new_clients: bool
    created_at: datetime

class AppointmentCreate(BaseModel):
    service_id: str
    staff_id: Optional[str] = None
    scheduled_at: datetime
    booking_notes: Optional[str] = None
    consultation_form_response: Optional[Dict[str, Any]] = None

class EnhancedAppointmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    client_id: str
    service_id: str
    staff_id: Optional[str]
    scheduled_at: datetime
    end_time: datetime
    status: AppointmentStatus
    
    booking_notes: Optional[str]
    staff_notes: Optional[str]
    soap_notes: Optional[str]
    
    original_price_cents: int
    discount_cents: int
    total_amount_cents: int
    
    client_rating: Optional[int]
    client_feedback: Optional[str]
    
    created_at: datetime

class MarketingCampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None
    campaign_type: str  # email, sms, automated_drip
    message_content: str
    subject_line: Optional[str] = None
    target_audience: Optional[Dict[str, Any]] = None
    
    # Scheduling
    send_at: Optional[datetime] = None
    is_recurring: bool = False
    recurring_schedule: Optional[Dict[str, Any]] = None
    
    # Automation
    trigger_event: Optional[str] = None
    trigger_delay_hours: Optional[int] = None

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    init_database()

# Enhanced Customer Profile Management
@app.get("/api/clients/{client_id}/profile", response_model=EnhancedUserResponse)
async def get_client_profile(
    client_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get enhanced client profile with loyalty points and statistics."""
    
    # Check permissions
    if current_user.role == UserRole.CLIENT and client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    client = db.query(User).filter(User.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    return client

@app.put("/api/clients/{client_id}/profile")
async def update_client_profile(
    client_id: str,
    profile_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_staff_user)
):
    """Update client profile information."""
    
    client = db.query(User).filter(User.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Update allowed fields
    allowed_fields = [
        'first_name', 'last_name', 'phone', 'date_of_birth',
        'emergency_contact_name', 'emergency_contact_phone',
        'medical_conditions', 'allergies', 'skin_type',
        'email_marketing', 'sms_marketing', 'appointment_reminders'
    ]
    
    for field, value in profile_data.items():
        if field in allowed_fields and hasattr(client, field):
            setattr(client, field, value)
    
    client.updated_at = datetime.now(timezone.utc)
    db.commit()
    
    return {"message": "Profile updated successfully"}

# Enhanced Client Notes with SOAP format
@app.get("/api/clients/{client_id}/notes")
async def get_client_notes(
    client_id: str,
    note_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get client notes with SOAP format support."""
    
    # Check permissions
    if current_user.role == UserRole.CLIENT and client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = db.query(ClientNote).filter(ClientNote.client_id == client_id)
    
    # Filter by note type if specified
    if note_type:
        query = query.filter(ClientNote.note_type == note_type)
    
    # Clients can only see non-private notes
    if current_user.role == UserRole.CLIENT:
        query = query.filter(ClientNote.is_private == False)
    
    notes = query.order_by(ClientNote.created_at.desc()).all()
    
    result = []
    for note in notes:
        note_dict = {
            "id": note.id,
            "title": note.title,
            "content": note.content,
            "note_type": note.note_type,
            "category": note.category,
            "is_private": note.is_private,
            "is_alert": note.is_alert,
            "subjective": note.subjective,
            "objective": note.objective,
            "assessment": note.assessment,
            "plan": note.plan,
            "created_by_name": f"{note.created_by.first_name} {note.created_by.last_name}",
            "created_at": note.created_at
        }
        result.append(note_dict)
    
    return result

@app.post("/api/clients/{client_id}/notes")
async def create_client_note(
    client_id: str,
    note_data: ClientNoteCreate,
    appointment_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_staff_user)
):
    """Create a client note with SOAP format support."""
    
    # Verify client exists
    client = db.query(User).filter(User.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    note = ClientNote(
        client_id=client_id,
        created_by_id=current_user.id,
        appointment_id=appointment_id,
        title=note_data.title,
        content=note_data.content,
        note_type=note_data.note_type,
        category=note_data.category,
        is_private=note_data.is_private,
        is_alert=note_data.is_alert,
        subjective=note_data.subjective,
        objective=note_data.objective,
        assessment=note_data.assessment,
        plan=note_data.plan
    )
    
    db.add(note)
    db.commit()
    db.refresh(note)
    
    return {"message": "Note created successfully", "note_id": note.id}

# File Upload System
@app.post("/api/clients/{client_id}/files")
async def upload_client_file(
    client_id: str,
    file: UploadFile = File(...),
    category: str = Form(...),
    title: str = Form(""),
    description: str = Form(""),
    is_before_photo: bool = Form(False),
    is_after_photo: bool = Form(False),
    appointment_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_staff_user)
):
    """Upload a file for a client (photos, documents, etc.)."""
    
    # Verify client exists
    client = db.query(User).filter(User.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Validate file
    if file.size > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=413, detail="File too large")
    
    # Create client directory
    client_dir = UPLOAD_DIR / client_id
    client_dir.mkdir(exist_ok=True)
    
    # Generate unique filename
    file_extension = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = client_dir / unique_filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Create database record
    client_file = ClientFile(
        client_id=client_id,
        uploaded_by_id=current_user.id,
        appointment_id=appointment_id,
        filename=unique_filename,
        original_filename=file.filename,
        file_path=str(file_path),
        file_size=file.size,
        mime_type=file.content_type,
        file_category=FileCategory(category),
        title=title or file.filename,
        description=description,
        is_before_photo=is_before_photo,
        is_after_photo=is_after_photo
    )
    
    db.add(client_file)
    db.commit()
    db.refresh(client_file)
    
    return {
        "message": "File uploaded successfully",
        "file_id": client_file.id,
        "filename": unique_filename,
        "url": f"/uploads/{client_id}/{unique_filename}"
    }

@app.get("/api/clients/{client_id}/files")
async def get_client_files(
    client_id: str,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get client files with filtering options."""
    
    # Check permissions
    if current_user.role == UserRole.CLIENT and client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = db.query(ClientFile).filter(ClientFile.client_id == client_id)
    
    # Filter by category if specified
    if category:
        query = query.filter(ClientFile.file_category == FileCategory(category))
    
    # Clients can only see files marked as public to them
    if current_user.role == UserRole.CLIENT:
        query = query.filter(ClientFile.is_public_to_client == True)
    
    files = query.order_by(ClientFile.created_at.desc()).all()
    
    result = []
    for file_obj in files:
        file_dict = {
            "id": file_obj.id,
            "title": file_obj.title,
            "original_filename": file_obj.original_filename,
            "file_category": file_obj.file_category.value,
            "file_size": file_obj.file_size,
            "mime_type": file_obj.mime_type,
            "description": file_obj.description,
            "is_before_photo": file_obj.is_before_photo,
            "is_after_photo": file_obj.is_after_photo,
            "url": f"/uploads/{client_id}/{file_obj.filename}",
            "uploaded_by": f"{file_obj.uploaded_by.first_name} {file_obj.uploaded_by.last_name}",
            "created_at": file_obj.created_at
        }
        result.append(file_dict)
    
    return result

# Consultation Form Builder
@app.post("/api/consultation-forms", response_model=ConsultationFormResponse)
async def create_consultation_form(
    form_data: ConsultationFormCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Create a new consultation form with dynamic fields."""
    
    form = ConsultationForm(
        name=form_data.name,
        description=form_data.description,
        form_fields=form_data.form_fields,
        is_required_for_new_clients=form_data.is_required_for_new_clients
    )
    
    db.add(form)
    db.commit()
    db.refresh(form)
    
    return form

@app.get("/api/consultation-forms", response_model=List[ConsultationFormResponse])
async def get_consultation_forms(
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get consultation forms."""
    
    query = db.query(ConsultationForm)
    
    if active_only:
        query = query.filter(ConsultationForm.is_active == True)
    
    forms = query.order_by(ConsultationForm.created_at.desc()).all()
    return forms

@app.post("/api/consultation-forms/{form_id}/responses")
async def submit_consultation_form(
    form_id: str,
    responses: Dict[str, Any],
    client_id: Optional[str] = None,
    appointment_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit a consultation form response."""
    
    # Get the form
    form = db.query(ConsultationForm).filter(ConsultationForm.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    # Use current user as client if not specified (for client self-submission)
    if not client_id:
        client_id = current_user.id
    
    # Create form response
    form_response = ConsultationFormResponse(
        form_id=form_id,
        client_id=client_id,
        appointment_id=appointment_id,
        responses=responses
    )
    
    db.add(form_response)
    db.commit()
    db.refresh(form_response)
    
    return {"message": "Form submitted successfully", "response_id": form_response.id}

# Marketing Campaign Management
@app.post("/api/marketing/campaigns")
async def create_marketing_campaign(
    campaign_data: MarketingCampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Create a new marketing campaign."""
    
    campaign = MarketingCampaign(
        name=campaign_data.name,
        description=campaign_data.description,
        campaign_type=campaign_data.campaign_type,
        message_content=campaign_data.message_content,
        subject_line=campaign_data.subject_line,
        target_audience=campaign_data.target_audience,
        send_at=campaign_data.send_at,
        is_recurring=campaign_data.is_recurring,
        recurring_schedule=campaign_data.recurring_schedule,
        trigger_event=campaign_data.trigger_event,
        trigger_delay_hours=campaign_data.trigger_delay_hours,
        created_by_id=current_user.id
    )
    
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    
    return {"message": "Campaign created successfully", "campaign_id": campaign.id}

@app.get("/api/marketing/campaigns")
async def get_marketing_campaigns(
    status: Optional[str] = None,
    campaign_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_staff_user)
):
    """Get marketing campaigns with filtering."""
    
    query = db.query(MarketingCampaign)
    
    if status:
        query = query.filter(MarketingCampaign.status == CampaignStatus(status))
    
    if campaign_type:
        query = query.filter(MarketingCampaign.campaign_type == campaign_type)
    
    campaigns = query.order_by(MarketingCampaign.created_at.desc()).all()
    
    result = []
    for campaign in campaigns:
        campaign_dict = {
            "id": campaign.id,
            "name": campaign.name,
            "description": campaign.description,
            "campaign_type": campaign.campaign_type,
            "status": campaign.status.value,
            "total_recipients": campaign.total_recipients,
            "delivery_count": campaign.delivery_count,
            "open_count": campaign.open_count,
            "click_count": campaign.click_count,
            "created_at": campaign.created_at
        }
        result.append(campaign_dict)
    
    return result

# Enhanced appointment management with intelligent scheduling
@app.get("/api/appointments/intelligent-slots")
async def get_intelligent_time_slots(
    service_id: str,
    date: str,
    staff_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get intelligent time slots considering buffer times and staff availability."""
    
    # Get service details
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Parse date
    try:
        target_date = datetime.fromisoformat(date).date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
    
    # Get existing appointments for the date
    start_of_day = datetime.combine(target_date, datetime.min.time().replace(tzinfo=timezone.utc))
    end_of_day = datetime.combine(target_date, datetime.max.time().replace(tzinfo=timezone.utc))
    
    existing_appointments = db.query(Appointment).filter(
        Appointment.scheduled_at >= start_of_day,
        Appointment.scheduled_at <= end_of_day,
        Appointment.status.in_([AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED])
    )
    
    if staff_id:
        existing_appointments = existing_appointments.filter(Appointment.staff_id == staff_id)
    
    existing_appointments = existing_appointments.all()
    
    # Generate available slots considering buffer times
    business_hours = {
        "start": 9,  # 9 AM
        "end": 18,   # 6 PM
        "interval": 30  # 30 minutes
    }
    
    available_slots = []
    current_time = datetime.combine(
        target_date, 
        datetime.min.time().replace(hour=business_hours["start"], tzinfo=timezone.utc)
    )
    
    while current_time.hour < business_hours["end"]:
        slot_end_time = current_time + timedelta(minutes=service.duration_minutes)
        
        # Check if slot conflicts with existing appointments (including buffer times)
        is_available = True
        for apt in existing_appointments:
            apt_start_with_buffer = apt.scheduled_at - timedelta(minutes=service.buffer_time_before)
            apt_end_with_buffer = apt.end_time + timedelta(minutes=service.buffer_time_after)
            
            if (current_time < apt_end_with_buffer and slot_end_time > apt_start_with_buffer):
                is_available = False
                break
        
        # Skip past time slots
        if current_time <= datetime.now(timezone.utc):
            is_available = False
        
        if is_available:
            available_slots.append({
                "time": current_time.strftime("%H:%M"),
                "datetime": current_time.isoformat(),
                "available": True,
                "duration_minutes": service.duration_minutes
            })
        
        # Move to next slot
        current_time += timedelta(minutes=business_hours["interval"])
    
    return {
        "date": date,
        "service_id": service_id,
        "service_name": service.name,
        "duration_minutes": service.duration_minutes,
        "available_slots": available_slots
    }

# Loyalty Points Management
@app.post("/api/clients/{client_id}/loyalty/award")
async def award_loyalty_points(
    client_id: str,
    points: int,
    description: str,
    appointment_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_staff_user)
):
    """Award loyalty points to a client."""
    
    client = db.query(User).filter(User.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Create loyalty transaction
    transaction = LoyaltyTransaction(
        customer_id=client_id,
        appointment_id=appointment_id,
        transaction_type="earned",
        points_change=points,
        points_balance=client.total_loyalty_points + points,
        description=description,
        processed_by_id=current_user.id
    )
    
    # Update client points
    client.total_loyalty_points += points
    
    db.add(transaction)
    db.commit()
    
    return {
        "message": f"Awarded {points} points successfully",
        "new_balance": client.total_loyalty_points
    }

@app.get("/api/clients/{client_id}/loyalty/history")
async def get_loyalty_history(
    client_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get loyalty points transaction history."""
    
    # Check permissions
    if current_user.role == UserRole.CLIENT and client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    transactions = db.query(LoyaltyTransaction).filter(
        LoyaltyTransaction.customer_id == client_id
    ).order_by(LoyaltyTransaction.created_at.desc()).all()
    
    result = []
    for transaction in transactions:
        transaction_dict = {
            "id": transaction.id,
            "transaction_type": transaction.transaction_type,
            "points_change": transaction.points_change,
            "points_balance": transaction.points_balance,
            "description": transaction.description,
            "created_at": transaction.created_at
        }
        result.append(transaction_dict)
    
    return result

# Health check
@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "2.0.0", "timestamp": datetime.now(timezone.utc)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)