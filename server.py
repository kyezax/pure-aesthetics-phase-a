from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict
import os
from dotenv import load_dotenv
import logging

# Import local modules
from models import *
from database import get_db, init_database, create_default_data
from auth import (
    authenticate_user, create_access_token, get_current_user,
    get_admin_user, get_staff_user, create_user, get_password_hash
)
from admin_router import router as admin_router

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Beauty Salon Booking System",
    description="Complete booking system for beauty salons with payments and memberships",
    version="1.0.0"
)

# CORS configuration
_cors_origins = [o.strip() for o in os.getenv('CORS_ORIGINS', '*').split(',') if o.strip()]
if _cors_origins == ['*']:
    logger.warning(
        "CORS_ORIGINS is not set (defaulting to '*') — combined with credentialed "
        "requests this allows any website to call this API from a browser. Set "
        "CORS_ORIGINS to your real frontend origin(s) (comma-separated) before "
        "deploying to production."
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    init_database()
    create_default_data()

# Phase A: Core Admin Backend routes (dashboard, business settings, hours,
# categories, services, pricing, deposits, policies, change log)
app.include_router(admin_router)

# Pydantic models for API
class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    date_of_birth: Optional[datetime] = None

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    email: str
    first_name: str
    last_name: str
    phone: Optional[str]
    role: UserRole
    is_active: bool
    created_at: datetime

class ServiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    name: str
    description: Optional[str]
    category: str
    duration_minutes: int
    price_cents: int
    color_code: str
    is_active: bool

class ServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    duration_minutes: int
    price_cents: int
    color_code: str = "#3B82F6"
    requires_consultation: bool = False
    max_advance_booking_days: int = 30

class AppointmentCreate(BaseModel):
    service_id: str
    staff_id: Optional[str] = None
    scheduled_at: datetime
    notes: Optional[str] = None

class AppointmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    client_id: str
    service_id: str
    staff_id: Optional[str]
    scheduled_at: datetime
    end_time: datetime
    status: AppointmentStatus
    total_amount_cents: int
    notes: Optional[str]

class ClientNoteCreate(BaseModel):
    title: str
    content: str
    category: Optional[str] = None
    is_private: bool = False

class ClientNoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    title: str
    content: str
    category: Optional[str]
    is_private: bool
    created_at: datetime

# Authentication endpoints
@app.post("/api/auth/login", response_model=Token)
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user and return JWT token."""
    user = authenticate_user(db, user_credentials.email, user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password"
        )
    
    access_token = create_access_token(data={"sub": user.id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role.value,
            "phone": user.phone
        }
    }

@app.post("/api/auth/register", response_model=UserResponse)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """Register a new client user."""
    user = create_user(
        db=db,
        email=user_data.email,
        password=user_data.password,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        phone=user_data.phone,
        role=UserRole.CLIENT
    )
    return user

@app.get("/api/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current user information."""
    return current_user

# Service endpoints
@app.get("/api/services", response_model=List[ServiceResponse])
def get_services(db: Session = Depends(get_db)):
    """Get all active services."""
    services = db.query(Service).filter(Service.is_active == True).all()
    return services

@app.post("/api/services", response_model=ServiceResponse)
def create_service(
    service_data: ServiceCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Create a new service (Admin only)."""
    service = Service(**service_data.dict())
    db.add(service)
    db.commit()
    db.refresh(service)
    return service

@app.get("/api/services/{service_id}", response_model=ServiceResponse)
def get_service(service_id: str, db: Session = Depends(get_db)):
    """Get service by ID."""
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service

# Appointment endpoints
@app.get("/api/appointments")
def get_appointments(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    status: Optional[AppointmentStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get appointments. Clients see only their own, staff see all."""
    query = db.query(Appointment)
    
    # Filter by user role
    if current_user.role == UserRole.CLIENT:
        query = query.filter(Appointment.client_id == current_user.id)
    
    # Apply filters
    if start_date:
        query = query.filter(Appointment.scheduled_at >= start_date)
    if end_date:
        query = query.filter(Appointment.scheduled_at <= end_date)
    if status:
        query = query.filter(Appointment.status == status)
    
    appointments = query.order_by(Appointment.scheduled_at).all()
    
    # Include related data
    result = []
    for apt in appointments:
        apt_dict = {
            "id": apt.id,
            "client_id": apt.client_id,
            "client_name": f"{apt.client.first_name} {apt.client.last_name}",
            "client_email": apt.client.email,
            "client_phone": apt.client.phone,
            "service_id": apt.service_id,
            "service_name": apt.service.name,
            "service_color": apt.service.color_code,
            "service_duration": apt.service.duration_minutes,
            "staff_id": apt.staff_id,
            "staff_name": f"{apt.staff_member.first_name} {apt.staff_member.last_name}" if apt.staff_member else None,
            "scheduled_at": apt.scheduled_at,
            "end_time": apt.end_time,
            "status": apt.status.value,
            "total_amount_cents": apt.total_amount_cents,
            "notes": apt.notes,
            "created_at": apt.created_at
        }
        result.append(apt_dict)
    
    return result

@app.post("/api/appointments", response_model=AppointmentResponse)
def create_appointment(
    appointment_data: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new appointment."""
    # Get service details
    service = db.query(Service).filter(Service.id == appointment_data.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Calculate end time
    end_time = appointment_data.scheduled_at + timedelta(minutes=service.duration_minutes)
    
    # Check for conflicts
    existing_appointment = db.query(Appointment).filter(
        Appointment.scheduled_at < end_time,
        Appointment.end_time > appointment_data.scheduled_at,
        Appointment.staff_id == appointment_data.staff_id,
        Appointment.status.in_([AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED])
    ).first()
    
    if existing_appointment:
        raise HTTPException(
            status_code=400,
            detail="Time slot conflicts with existing appointment"
        )
    
    # Create appointment
    appointment = Appointment(
        client_id=current_user.id,
        service_id=appointment_data.service_id,
        staff_id=appointment_data.staff_id,
        scheduled_at=appointment_data.scheduled_at,
        end_time=end_time,
        total_amount_cents=service.price_cents,
        notes=appointment_data.notes
    )
    
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    
    return appointment

@app.put("/api/appointments/{appointment_id}/status")
def update_appointment_status(
    appointment_id: str,
    status: AppointmentStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_staff_user)
):
    """Update appointment status (Staff/Admin only)."""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    appointment.status = status
    appointment.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    
    return {"message": "Appointment status updated successfully"}

@app.delete("/api/appointments/{appointment_id}")
def cancel_appointment(
    appointment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel an appointment."""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Check permissions
    if current_user.role == UserRole.CLIENT and appointment.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this appointment")
    
    appointment.status = AppointmentStatus.CANCELLED
    appointment.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    
    return {"message": "Appointment cancelled successfully"}

# Client notes endpoints
@app.get("/api/clients/{client_id}/notes")
def get_client_notes(
    client_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get notes for a client."""
    # Check permissions
    if current_user.role == UserRole.CLIENT and client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = db.query(ClientNote).filter(ClientNote.client_id == client_id)
    
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
            "category": note.category,
            "is_private": note.is_private,
            "created_by": f"{note.created_by.first_name} {note.created_by.last_name}",
            "created_at": note.created_at
        }
        result.append(note_dict)
    
    return result

@app.post("/api/clients/{client_id}/notes")
def create_client_note(
    client_id: str,
    note_data: ClientNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_staff_user)
):
    """Create a note for a client (Staff/Admin only)."""
    # Verify client exists
    client = db.query(User).filter(User.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    note = ClientNote(
        client_id=client_id,
        created_by_id=current_user.id,
        title=note_data.title,
        content=note_data.content,
        category=note_data.category,
        is_private=note_data.is_private
    )
    
    db.add(note)
    db.commit()
    db.refresh(note)
    
    return {"message": "Note created successfully", "note_id": note.id}

# Staff management endpoints
@app.get("/api/staff")
def get_staff_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_staff_user)
):
    """Get all staff members."""
    staff = db.query(User).filter(
        User.role.in_([UserRole.ADMIN, UserRole.STAFF]),
        User.is_active == True
    ).all()
    
    return [
        {
            "id": member.id,
            "first_name": member.first_name,
            "last_name": member.last_name,
            "email": member.email,
            "role": member.role.value,
            "phone": member.phone
        }
        for member in staff
    ]

# Dashboard statistics
@app.get("/api/dashboard/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_staff_user)
):
    """Get dashboard statistics for staff/admin."""
    today = datetime.now(timezone.utc).date()
    
    # Today's appointments
    today_appointments = db.query(Appointment).filter(
        Appointment.scheduled_at >= datetime.combine(today, datetime.min.time().replace(tzinfo=timezone.utc)),
        Appointment.scheduled_at < datetime.combine(today + timedelta(days=1), datetime.min.time().replace(tzinfo=timezone.utc))
    ).count()
    
    # This week's appointments
    week_start = today - timedelta(days=today.weekday())
    week_appointments = db.query(Appointment).filter(
        Appointment.scheduled_at >= datetime.combine(week_start, datetime.min.time().replace(tzinfo=timezone.utc))
    ).count()
    
    # Total clients
    total_clients = db.query(User).filter(User.role == UserRole.CLIENT).count()
    
    # Revenue this month
    month_start = today.replace(day=1)
    month_revenue = db.query(Payment).filter(
        Payment.status == PaymentStatus.COMPLETED,
        Payment.created_at >= datetime.combine(month_start, datetime.min.time().replace(tzinfo=timezone.utc))
    ).with_entities(Payment.amount_cents).all()
    
    total_revenue_cents = sum([payment.amount_cents for payment in month_revenue])
    
    return {
        "today_appointments": today_appointments,
        "week_appointments": week_appointments,
        "total_clients": total_clients,
        "month_revenue_dollars": total_revenue_cents / 100
    }

# Business settings
@app.get("/api/settings")
def get_business_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get business settings."""
    settings = db.query(BusinessSettings).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    
    return {
        "business_name": settings.business_name,
        "business_address": settings.business_address,
        "business_phone": settings.business_phone,
        "business_email": settings.business_email,
        "operating_hours": settings.operating_hours,
        "advance_booking_limit_days": settings.advance_booking_limit_days,
        "cancellation_hours_limit": settings.cancellation_hours_limit,
        "buffer_time_minutes": settings.buffer_time_minutes
    }

# Enhanced API endpoints for missing functionality

@app.put("/api/services/{service_id}")
async def update_service(
    service_id: str,
    service_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Update an existing service."""
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Update allowed fields
    allowed_fields = ['name', 'description', 'category', 'duration_minutes', 'price_cents', 'color_code', 'is_active']
    for field, value in service_data.items():
        if field in allowed_fields and hasattr(service, field):
            setattr(service, field, value)
    
    service.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(service)
    
    return service

@app.delete("/api/services/{service_id}")
async def delete_service(
    service_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Soft delete a service by setting is_active to False."""
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    service.is_active = False
    service.updated_at = datetime.now(timezone.utc)
    db.commit()
    
    return {"message": "Service deleted successfully"}

@app.get("/api/appointments/calendar")
async def get_calendar_appointments(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_staff_user)
):
    """Get appointments for calendar view with color coding."""
    query = db.query(Appointment)
    
    if start_date:
        query = query.filter(Appointment.scheduled_at >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(Appointment.scheduled_at <= datetime.fromisoformat(end_date))
    
    appointments = query.order_by(Appointment.scheduled_at).all()
    
    result = []
    for apt in appointments:
        apt_dict = {
            "id": apt.id,
            "title": f"{apt.service.name} - {apt.client.first_name} {apt.client.last_name}",
            "start": apt.scheduled_at.isoformat(),
            "end": apt.end_time.isoformat(),
            "backgroundColor": apt.service.color_code,
            "borderColor": apt.service.color_code,
            "textColor": "#ffffff",
            "extendedProps": {
                "client_name": f"{apt.client.first_name} {apt.client.last_name}",
                "service_name": apt.service.name,
                "service_color": apt.service.color_code,
                "status": apt.status.value,
                "client_phone": apt.client.phone,
                "notes": apt.notes
            }
        }
        result.append(apt_dict)
    
    return result

@app.post("/api/marketing/campaigns/{campaign_id}/send")
async def send_campaign(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Send a marketing campaign (placeholder implementation)."""
    # This would integrate with SendGrid/Twilio in production
    return {"message": "Campaign sent successfully", "campaign_id": campaign_id}

@app.get("/api/consultation-forms")
async def get_consultation_forms(
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get consultation forms (placeholder - returns sample forms)."""
    # Sample consultation forms for demo
    sample_forms = [
        {
            "id": "form_1",
            "name": "Facial Consultation Form",
            "description": "Initial consultation for facial treatments",
            "is_active": True,
            "is_required_for_new_clients": True,
            "form_fields": [
                {
                    "type": "text",
                    "name": "skin_concerns",
                    "label": "What are your main skin concerns?",
                    "required": True
                },
                {
                    "type": "select",
                    "name": "skin_type",
                    "label": "What is your skin type?",
                    "required": True,
                    "options": [
                        {"value": "normal", "label": "Normal"},
                        {"value": "oily", "label": "Oily"},
                        {"value": "dry", "label": "Dry"},
                        {"value": "combination", "label": "Combination"},
                        {"value": "sensitive", "label": "Sensitive"}
                    ]
                },
                {
                    "type": "checkbox",
                    "name": "allergies_check",
                    "label": "I have allergies or sensitivities",
                    "required": False
                },
                {
                    "type": "textarea",
                    "name": "allergies_details",
                    "label": "Please describe any allergies or sensitivities",
                    "required": False
                }
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "form_2",
            "name": "Laser Treatment Consultation",
            "description": "Medical consultation for laser treatments",
            "is_active": True,
            "is_required_for_new_clients": False,
            "form_fields": [
                {
                    "type": "text",
                    "name": "medical_conditions",
                    "label": "Do you have any medical conditions?",
                    "required": True
                },
                {
                    "type": "text",
                    "name": "current_medications",
                    "label": "Are you currently taking any medications?",
                    "required": True
                },
                {
                    "type": "checkbox",
                    "name": "pregnancy_check",
                    "label": "I am pregnant or breastfeeding",
                    "required": False
                }
            ],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    if active_only:
        return [form for form in sample_forms if form["is_active"]]
    return sample_forms

@app.post("/api/consultation-forms")
async def create_consultation_form(
    form_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Create a new consultation form (placeholder implementation)."""
    # In production, this would save to database
    form_id = f"form_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    return {
        "id": form_id,
        "message": "Consultation form created successfully",
        **form_data
    }

# Health check
@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)