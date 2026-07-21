# Enhanced models for comprehensive salon management system
from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, ForeignKey, Text, JSON, Enum, LargeBinary
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid
import enum

Base = declarative_base()

class UserRole(enum.Enum):
    ADMIN = "admin"
    STAFF = "staff"
    CLIENT = "client"

class AppointmentStatus(enum.Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"
    RESCHEDULED = "rescheduled"

class PaymentStatus(enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"

class CampaignStatus(enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class FileCategory(enum.Enum):
    CONSULTATION_FORM = "consultation_form"
    BEFORE_AFTER_PHOTO = "before_after_photo"
    TREATMENT_PHOTO = "treatment_photo"
    IDENTIFICATION = "identification"
    MEDICAL_RECORD = "medical_record"
    CONSENT_FORM = "consent_form"
    OTHER = "other"

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    date_of_birth = Column(DateTime, nullable=True)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.CLIENT)
    is_active = Column(Boolean, default=True)
    
    # Enhanced customer profile fields
    profile_image_url = Column(String, nullable=True)
    emergency_contact_name = Column(String(200), nullable=True)
    emergency_contact_phone = Column(String(20), nullable=True)
    medical_conditions = Column(Text, nullable=True)
    allergies = Column(Text, nullable=True)
    skin_type = Column(String(50), nullable=True)
    preferred_staff_id = Column(String, ForeignKey("users.id"), nullable=True)
    
    # Marketing preferences
    email_marketing = Column(Boolean, default=True)
    sms_marketing = Column(Boolean, default=True)
    appointment_reminders = Column(Boolean, default=True)
    marketing_source = Column(String(100), nullable=True)
    
    # Loyalty and points
    total_loyalty_points = Column(Integer, default=0)
    points_redeemed = Column(Integer, default=0)
    total_spent_cents = Column(Integer, default=0)
    first_appointment_date = Column(DateTime, nullable=True)
    last_appointment_date = Column(DateTime, nullable=True)
    total_appointments = Column(Integer, default=0)
    
    # External IDs
    square_customer_id = Column(String, unique=True, nullable=True)
    stripe_customer_id = Column(String, unique=True, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    appointments = relationship("Appointment", back_populates="client", foreign_keys="Appointment.client_id")
    staff_appointments = relationship("Appointment", back_populates="staff_member", foreign_keys="Appointment.staff_id")
    payments = relationship("Payment", back_populates="customer")
    subscriptions = relationship("Subscription", back_populates="customer")
    loyalty_transactions = relationship("LoyaltyTransaction", back_populates="customer", foreign_keys="LoyaltyTransaction.customer_id")
    client_notes = relationship("ClientNote", back_populates="client", foreign_keys="ClientNote.client_id")
    client_files = relationship("ClientFile", back_populates="client", foreign_keys="ClientFile.client_id")
    consultation_forms = relationship("ConsultationFormResponse", back_populates="client", foreign_keys="ConsultationFormResponse.client_id")
    preferred_by_clients = relationship("User", remote_side=[id])

class Service(Base):
    __tablename__ = "services"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    price_cents = Column(Integer, nullable=False)
    color_code = Column(String(7), nullable=False, default="#3B82F6")
    
    # Enhanced service fields
    buffer_time_before = Column(Integer, default=15)  # Minutes before appointment
    buffer_time_after = Column(Integer, default=15)   # Minutes after appointment
    max_advance_booking_days = Column(Integer, default=30)
    min_advance_booking_hours = Column(Integer, default=2)
    requires_consultation = Column(Boolean, default=False)
    requires_patch_test = Column(Boolean, default=False)
    consultation_form_id = Column(String, ForeignKey("consultation_forms.id"), nullable=True)
    
    # Pricing and packages
    package_sessions = Column(Integer, nullable=True)  # For package deals
    package_price_cents = Column(Integer, nullable=True)
    loyalty_points_earned = Column(Integer, default=0)
    
    # Staff and scheduling
    staff_required = Column(Integer, default=1)
    room_type = Column(String(100), nullable=True)
    equipment_needed = Column(JSON, nullable=True)
    
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    appointments = relationship("Appointment", back_populates="service")
    staff_services = relationship("StaffService", back_populates="service")
    consultation_form = relationship("ConsultationForm", back_populates="services")

class Appointment(Base):
    __tablename__ = "appointments"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(String, ForeignKey("users.id"), nullable=False)
    service_id = Column(String, ForeignKey("services.id"), nullable=False)
    staff_id = Column(String, ForeignKey("users.id"), nullable=True)
    
    # Scheduling details
    scheduled_at = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    actual_start_time = Column(DateTime, nullable=True)
    actual_end_time = Column(DateTime, nullable=True)
    
    # Status and tracking
    status = Column(Enum(AppointmentStatus), default=AppointmentStatus.SCHEDULED)
    confirmation_sent = Column(Boolean, default=False)
    reminder_sent = Column(Boolean, default=False)
    follow_up_sent = Column(Boolean, default=False)
    
    # Notes and consultation
    booking_notes = Column(Text, nullable=True)
    client_notes = Column(Text, nullable=True)
    staff_notes = Column(Text, nullable=True)
    soap_notes = Column(Text, nullable=True)  # SOAP format notes
    treatment_outcome = Column(Text, nullable=True)
    consultation_form_response_id = Column(String, ForeignKey("consultation_form_responses.id"), nullable=True)
    
    # Pricing and payment
    original_price_cents = Column(Integer, nullable=False)
    discount_cents = Column(Integer, default=0)
    total_amount_cents = Column(Integer, nullable=False)
    payment_id = Column(String, ForeignKey("payments.id"), nullable=True)
    
    # Recurring appointments
    is_recurring = Column(Boolean, default=False)
    recurring_pattern = Column(JSON, nullable=True)
    parent_appointment_id = Column(String, ForeignKey("appointments.id"), nullable=True)
    series_id = Column(String, nullable=True)  # Groups related recurring appointments
    
    # Ratings and feedback
    client_rating = Column(Integer, nullable=True)  # 1-5 stars
    client_feedback = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    client = relationship("User", back_populates="appointments", foreign_keys=[client_id])
    staff_member = relationship("User", back_populates="staff_appointments", foreign_keys=[staff_id])
    service = relationship("Service", back_populates="appointments")
    parent_appointment = relationship("Appointment", remote_side=[id])
    consultation_response = relationship("ConsultationFormResponse", back_populates="appointment")

class ClientNote(Base):
    __tablename__ = "client_notes"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    appointment_id = Column(String, ForeignKey("appointments.id"), nullable=True)
    
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    note_type = Column(String(50), default="general")  # general, medical, treatment, allergy, preference
    is_private = Column(Boolean, default=False)
    is_alert = Column(Boolean, default=False)  # Show as alert when booking
    category = Column(String(100), nullable=True)
    
    # SOAP notes structure
    subjective = Column(Text, nullable=True)
    objective = Column(Text, nullable=True)
    assessment = Column(Text, nullable=True)
    plan = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    client = relationship("User", back_populates="client_notes", foreign_keys=[client_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
    appointment = relationship("Appointment")

class ClientFile(Base):
    __tablename__ = "client_files"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(String, ForeignKey("users.id"), nullable=False)
    uploaded_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    appointment_id = Column(String, ForeignKey("appointments.id"), nullable=True)
    
    filename = Column(String(500), nullable=False)
    original_filename = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_category = Column(Enum(FileCategory), nullable=False)
    
    title = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    is_before_photo = Column(Boolean, default=False)
    is_after_photo = Column(Boolean, default=False)
    treatment_area = Column(String(100), nullable=True)
    
    # File access control
    is_public_to_client = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    client = relationship("User", back_populates="client_files")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_id])
    appointment = relationship("Appointment")

class ConsultationForm(Base):
    __tablename__ = "consultation_forms"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    form_fields = Column(JSON, nullable=False)  # Dynamic form structure
    is_active = Column(Boolean, default=True)
    is_required_for_new_clients = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    services = relationship("Service", back_populates="consultation_form")
    responses = relationship("ConsultationFormResponse", back_populates="form")

class ConsultationFormResponse(Base):
    __tablename__ = "consultation_form_responses"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    form_id = Column(String, ForeignKey("consultation_forms.id"), nullable=False)
    client_id = Column(String, ForeignKey("users.id"), nullable=False)
    appointment_id = Column(String, ForeignKey("appointments.id"), nullable=True)
    
    responses = Column(JSON, nullable=False)  # Form responses data
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    form = relationship("ConsultationForm", back_populates="responses")
    client = relationship("User", back_populates="consultation_forms")
    appointment = relationship("Appointment", back_populates="consultation_response")

class LoyaltyTransaction(Base):
    __tablename__ = "loyalty_transactions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_id = Column(String, ForeignKey("users.id"), nullable=False)
    appointment_id = Column(String, ForeignKey("appointments.id"), nullable=True)
    
    transaction_type = Column(String(50), nullable=False)  # earned, redeemed, expired, bonus, adjustment
    points_change = Column(Integer, nullable=False)  # Positive for earned, negative for redeemed
    points_balance = Column(Integer, nullable=False)  # Balance after this transaction
    
    description = Column(String(500), nullable=True)
    amount_spent_cents = Column(Integer, nullable=True)  # For earned points
    amount_saved_cents = Column(Integer, nullable=True)  # For redeemed points
    
    expires_at = Column(DateTime, nullable=True)
    processed_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    customer = relationship("User", back_populates="loyalty_transactions")
    appointment = relationship("Appointment")
    processed_by = relationship("User", foreign_keys=[processed_by_id])

class MarketingCampaign(Base):
    __tablename__ = "marketing_campaigns"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    campaign_type = Column(String(50), nullable=False)  # email, sms, automated_drip
    
    # Campaign configuration
    status = Column(Enum(CampaignStatus), default=CampaignStatus.DRAFT)
    target_audience = Column(JSON, nullable=True)  # Criteria for targeting
    
    # Content
    subject_line = Column(String(500), nullable=True)  # For email campaigns
    message_content = Column(Text, nullable=False)
    template_id = Column(String, nullable=True)
    
    # Scheduling
    send_at = Column(DateTime, nullable=True)
    is_recurring = Column(Boolean, default=False)
    recurring_schedule = Column(JSON, nullable=True)
    
    # Automation triggers
    trigger_event = Column(String(100), nullable=True)  # appointment_booked, appointment_completed, etc.
    trigger_delay_hours = Column(Integer, nullable=True)
    
    # Analytics
    total_recipients = Column(Integer, default=0)
    delivery_count = Column(Integer, default=0)
    open_count = Column(Integer, default=0)
    click_count = Column(Integer, default=0)
    unsubscribe_count = Column(Integer, default=0)
    
    created_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    created_by = relationship("User")
    message_logs = relationship("MessageLog", back_populates="campaign")

class MessageLog(Base):
    __tablename__ = "message_logs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    campaign_id = Column(String, ForeignKey("marketing_campaigns.id"), nullable=True)
    recipient_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    message_type = Column(String(50), nullable=False)  # email, sms, push
    status = Column(String(50), nullable=False)  # sent, delivered, opened, clicked, failed, bounced
    
    # Content
    subject = Column(String(500), nullable=True)
    message_content = Column(Text, nullable=False)
    recipient_email = Column(String(255), nullable=True)
    recipient_phone = Column(String(20), nullable=True)
    
    # Tracking
    sent_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    opened_at = Column(DateTime, nullable=True)
    clicked_at = Column(DateTime, nullable=True)
    
    # External provider tracking
    external_message_id = Column(String(200), nullable=True)
    provider_response = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    campaign = relationship("MarketingCampaign", back_populates="message_logs")
    recipient = relationship("User")

class BusinessSettings(Base):
    __tablename__ = "business_settings"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Business information
    business_name = Column(String(200), nullable=False, default="Beauty Salon")
    business_address = Column(Text, nullable=True)
    business_phone = Column(String(20), nullable=True)
    business_email = Column(String(255), nullable=True)
    website_url = Column(String(500), nullable=True)
    
    # Branding
    logo_url = Column(String(500), nullable=True)
    primary_color = Column(String(7), default="#ec4899")
    secondary_color = Column(String(7), default="#8b5cf6")
    accent_color = Column(String(7), default="#3b82f6")
    
    # Operating hours
    operating_hours = Column(JSON, nullable=True)
    timezone = Column(String(100), default="UTC")
    
    # Booking settings
    advance_booking_limit_days = Column(Integer, default=60)
    cancellation_hours_limit = Column(Integer, default=24)
    buffer_time_minutes = Column(Integer, default=15)
    auto_confirm_bookings = Column(Boolean, default=False)
    allow_online_payments = Column(Boolean, default=True)
    
    # Loyalty program
    loyalty_program_enabled = Column(Boolean, default=True)
    points_per_dollar = Column(Float, default=1.0)
    points_redemption_value = Column(Float, default=0.01)  # $0.01 per point
    welcome_bonus_points = Column(Integer, default=100)
    
    # Communication settings
    send_booking_confirmations = Column(Boolean, default=True)
    send_reminders = Column(Boolean, default=True)
    reminder_hours_before = Column(Integer, default=24)
    send_follow_up_messages = Column(Boolean, default=True)
    follow_up_hours_after = Column(Integer, default=24)
    
    # Marketing settings
    marketing_enabled = Column(Boolean, default=True)
    welcome_email_template = Column(Text, nullable=True)
    reminder_email_template = Column(Text, nullable=True)
    follow_up_email_template = Column(Text, nullable=True)
    
    # API configurations
    sendgrid_api_key = Column(String(500), nullable=True)
    twilio_account_sid = Column(String(500), nullable=True)
    twilio_auth_token = Column(String(500), nullable=True)
    twilio_phone_number = Column(String(20), nullable=True)
    
    updated_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    updated_by = relationship("User")

class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_id = Column(String, ForeignKey("users.id"), nullable=False)
    appointment_id = Column(String, ForeignKey("appointments.id"), nullable=True)
    
    # Payment processor info
    stripe_payment_id = Column(String, unique=True, nullable=True)
    square_payment_id = Column(String, unique=True, nullable=True)
    processor = Column(String(20), nullable=False)  # 'stripe' or 'square'
    
    amount_cents = Column(Integer, nullable=False)
    currency = Column(String(3), default="USD")
    status = Column(Enum(PaymentStatus), nullable=False, default=PaymentStatus.PENDING)
    payment_method = Column(String(50), nullable=False)  # card, cash, etc.
    source_id = Column(String, nullable=True)
    receipt_url = Column(String, nullable=True)
    description = Column(String(500), nullable=True)
    
    # Refund info
    refund_amount_cents = Column(Integer, default=0)
    refund_reason = Column(String(500), nullable=True)
    
    processed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    customer = relationship("User", back_populates="payments")

class StaffService(Base):
    __tablename__ = "staff_services"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    staff_id = Column(String, ForeignKey("users.id"), nullable=False)
    service_id = Column(String, ForeignKey("services.id"), nullable=False)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    staff_member = relationship("User")
    service = relationship("Service", back_populates="staff_services")

class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    price_cents = Column(Integer, nullable=False)
    billing_cycle = Column(String(20), nullable=False)
    
    # External provider IDs
    stripe_subscription_id = Column(String, unique=True, nullable=True)
    square_subscription_id = Column(String, unique=True, nullable=True)
    processor = Column(String(20), nullable=False)
    
    status = Column(String(50), nullable=False, default="active")
    current_period_start = Column(DateTime, nullable=False)
    current_period_end = Column(DateTime, nullable=False)
    next_billing_date = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    
    monthly_service_credits = Column(Integer, default=0)
    discount_percentage = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    customer = relationship("User", back_populates="subscriptions")