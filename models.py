from sqlalchemy import Column, Integer, String, DateTime, Float, Boolean, ForeignKey, Text, JSON, Enum
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

class PaymentStatus(enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"

class SubscriptionStatus(enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    CANCELLED = "cancelled"
    EXPIRED = "expired"

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
    square_customer_id = Column(String, unique=True, nullable=True)
    profile_image_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    appointments = relationship("Appointment", back_populates="client", foreign_keys="Appointment.client_id")
    staff_appointments = relationship("Appointment", back_populates="staff_member", foreign_keys="Appointment.staff_id")
    payments = relationship("Payment", back_populates="customer")
    subscriptions = relationship("Subscription", back_populates="customer")
    loyalty_points = relationship("LoyaltyPoint", back_populates="customer")
    client_notes = relationship("ClientNote", back_populates="client", foreign_keys="ClientNote.client_id")

class Service(Base):
    __tablename__ = "services"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False)  # facial, laser_removal, teeth_whitening
    duration_minutes = Column(Integer, nullable=False)
    price_cents = Column(Integer, nullable=False)  # Store price in cents
    color_code = Column(String(7), nullable=False, default="#3B82F6")  # Hex color for calendar
    is_active = Column(Boolean, default=True)
    requires_consultation = Column(Boolean, default=False)
    max_advance_booking_days = Column(Integer, default=30)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # --- Phase A: extended admin fields ---
    category_id = Column(String, ForeignKey("service_categories.id"), nullable=True)
    internal_code = Column(String(50), nullable=True)
    treatment_tags = Column(JSON, nullable=True)  # list[str]
    short_description = Column(String(200), nullable=True)
    long_description = Column(Text, nullable=True)
    expected_results = Column(Text, nullable=True)
    ideal_for = Column(Text, nullable=True)
    not_suitable_for = Column(Text, nullable=True)

    sale_price_cents = Column(Integer, nullable=True)
    sale_start_date = Column(DateTime, nullable=True)
    sale_end_date = Column(DateTime, nullable=True)

    deposit_type = Column(String(20), default="none")  # none | fixed | percentage | full
    deposit_value = Column(Float, default=0.0)
    cost_cents = Column(Integer, nullable=True)
    staff_cost_cents = Column(Integer, nullable=True)

    buffer_before_minutes = Column(Integer, default=0)
    buffer_after_minutes = Column(Integer, default=0)
    online_booking_enabled = Column(Boolean, default=True)
    booking_disabled_reason = Column(String(100), nullable=True)
    new_clients_only = Column(Boolean, default=False)
    existing_clients_only = Column(Boolean, default=False)
    min_prior_bookings = Column(Integer, nullable=True)
    min_notice_days = Column(Integer, default=1)
    max_advance_weeks = Column(Integer, default=12)
    max_daily_bookings = Column(Integer, nullable=True)

    staff_ids = Column(JSON, nullable=True)  # list[str] of allowed staff user ids
    room = Column(String(100), nullable=True)
    equipment = Column(JSON, nullable=True)  # list[str]

    requires_consultation_form = Column(Boolean, default=False)
    requires_consent_form = Column(Boolean, default=False)
    requires_medical_history = Column(Boolean, default=False)
    requires_photo_consent = Column(Boolean, default=False)
    requires_contraindication_screening = Column(Boolean, default=False)
    requires_patch_test = Column(Boolean, default=False)
    requires_doctor_clearance = Column(Boolean, default=False)
    min_age = Column(Integer, nullable=True)
    max_age = Column(Integer, nullable=True)
    block_if_incomplete = Column(Boolean, default=True)

    booking_instructions = Column(Text, nullable=True)
    preparation_instructions = Column(Text, nullable=True)
    aftercare_instructions = Column(Text, nullable=True)
    rebooking_interval = Column(String(50), nullable=True)

    image_url = Column(String(1000), nullable=True)
    gallery_images = Column(JSON, nullable=True)  # list[str]

    status = Column(String(20), default="active")  # active | hidden | archived
    hide_reason = Column(String(100), nullable=True)
    sort_order = Column(Integer, default=0)

    # Relationships
    appointments = relationship("Appointment", back_populates="service")
    staff_services = relationship("StaffService", back_populates="service")

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

class Appointment(Base):
    __tablename__ = "appointments"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(String, ForeignKey("users.id"), nullable=False)
    service_id = Column(String, ForeignKey("services.id"), nullable=False)
    staff_id = Column(String, ForeignKey("users.id"), nullable=True)
    scheduled_at = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    status = Column(Enum(AppointmentStatus), default=AppointmentStatus.SCHEDULED)
    notes = Column(Text, nullable=True)
    client_notes = Column(Text, nullable=True)
    staff_notes = Column(Text, nullable=True)
    total_amount_cents = Column(Integer, nullable=False)
    payment_id = Column(String, ForeignKey("payments.id"), nullable=True)
    is_recurring = Column(Boolean, default=False)
    recurring_pattern = Column(JSON, nullable=True)  # Store recurring info
    parent_appointment_id = Column(String, ForeignKey("appointments.id"), nullable=True)
    reminder_sent = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    client = relationship("User", back_populates="appointments", foreign_keys=[client_id])
    staff_member = relationship("User", back_populates="staff_appointments", foreign_keys=[staff_id])
    service = relationship("Service", back_populates="appointments")
    # payment = relationship("Payment", back_populates="appointment", uselist=False)
    parent_appointment = relationship("Appointment", remote_side=[id])

class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_id = Column(String, ForeignKey("users.id"), nullable=False)
    appointment_id = Column(String, ForeignKey("appointments.id"), nullable=True)
    subscription_id = Column(String, ForeignKey("subscriptions.id"), nullable=True)
    
    # Payment processor info
    stripe_payment_id = Column(String, unique=True, nullable=True)
    square_payment_id = Column(String, unique=True, nullable=True)
    processor = Column(String(20), nullable=False)  # 'stripe' or 'square'
    
    amount_cents = Column(Integer, nullable=False)
    currency = Column(String(3), default="USD")
    status = Column(Enum(PaymentStatus), nullable=False, default=PaymentStatus.PENDING)
    payment_method = Column(String(50), nullable=False)  # card, cash, etc.
    source_id = Column(String, nullable=True)  # Payment source ID
    receipt_url = Column(String, nullable=True)
    description = Column(String(500), nullable=True)
    
    # Refund info
    refund_amount_cents = Column(Integer, default=0)
    refund_reason = Column(String(500), nullable=True)
    
    processed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    customer = relationship("User", back_populates="payments")
    # appointment = relationship("Appointment", back_populates="payment", foreign_keys=[appointment_id])
    subscription = relationship("Subscription", back_populates="payments", foreign_keys=[subscription_id])

class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Subscription details
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    
    # Payment processor info
    stripe_subscription_id = Column(String, unique=True, nullable=True)
    square_subscription_id = Column(String, unique=True, nullable=True)
    processor = Column(String(20), nullable=False)  # 'stripe' or 'square'
    
    # Pricing
    price_cents = Column(Integer, nullable=False)
    billing_cycle = Column(String(20), nullable=False)  # monthly, quarterly, yearly
    
    # Status and dates
    status = Column(Enum(SubscriptionStatus), nullable=False, default=SubscriptionStatus.ACTIVE)
    current_period_start = Column(DateTime, nullable=False)
    current_period_end = Column(DateTime, nullable=False)
    next_billing_date = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    
    # Benefits
    monthly_service_credits = Column(Integer, default=0)
    discount_percentage = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    customer = relationship("User", back_populates="subscriptions")
    payments = relationship("Payment", back_populates="subscription")

class LoyaltyPoint(Base):
    __tablename__ = "loyalty_points"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_id = Column(String, ForeignKey("users.id"), nullable=False)
    appointment_id = Column(String, ForeignKey("appointments.id"), nullable=True)
    
    points_earned = Column(Integer, default=0)
    points_redeemed = Column(Integer, default=0)
    points_balance = Column(Integer, default=0)
    
    transaction_type = Column(String(50), nullable=False)  # earned, redeemed, expired
    description = Column(String(500), nullable=True)
    expires_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    customer = relationship("User", back_populates="loyalty_points")
    appointment = relationship("Appointment")

class ClientNote(Base):
    __tablename__ = "client_notes"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    is_private = Column(Boolean, default=False)  # Private notes only visible to staff
    category = Column(String(100), nullable=True)  # allergies, preferences, medical, etc.
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    client = relationship("User", back_populates="client_notes", foreign_keys=[client_id])
    created_by = relationship("User", foreign_keys=[created_by_id])

class EmailCampaign(Base):
    __tablename__ = "email_campaigns"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(200), nullable=False)
    subject = Column(String(300), nullable=False)
    content = Column(Text, nullable=False)
    campaign_type = Column(String(50), nullable=False)  # newsletter, promotion, reminder
    
    # Targeting
    target_audience = Column(JSON, nullable=True)  # Criteria for recipients
    
    # Scheduling
    scheduled_at = Column(DateTime, nullable=True)
    sent_at = Column(DateTime, nullable=True)
    is_sent = Column(Boolean, default=False)
    
    # Analytics
    total_recipients = Column(Integer, default=0)
    delivery_count = Column(Integer, default=0)
    open_count = Column(Integer, default=0)
    click_count = Column(Integer, default=0)
    
    created_by_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    created_by = relationship("User")

class BusinessSettings(Base):
    __tablename__ = "business_settings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # Business info
    business_name = Column(String(200), nullable=False, default="Beauty Salon")
    business_address = Column(Text, nullable=True)
    business_phone = Column(String(20), nullable=True)
    business_email = Column(String(255), nullable=True)

    # Operating hours (JSON format)
    operating_hours = Column(JSON, nullable=True)

    # Booking settings
    advance_booking_limit_days = Column(Integer, default=30)
    cancellation_hours_limit = Column(Integer, default=24)
    buffer_time_minutes = Column(Integer, default=15)

    # Payment settings
    require_payment_booking = Column(Boolean, default=True)
    accepted_payment_methods = Column(JSON, nullable=True)

    # Loyalty program
    points_per_dollar = Column(Float, default=1.0)
    points_redemption_value = Column(Float, default=0.01)  # $0.01 per point

    # Notification settings
    send_booking_confirmations = Column(Boolean, default=True)
    send_reminders = Column(Boolean, default=True)
    reminder_hours_before = Column(Integer, default=24)

    # --- Phase A: extended business identity ---
    abn = Column(String(20), nullable=True)
    logo_url = Column(String(1000), nullable=True)
    description = Column(Text, nullable=True)
    booking_email = Column(String(255), nullable=True)
    after_hours_method = Column(String(20), nullable=True)  # phone | sms | email | none
    after_hours_value = Column(String(255), nullable=True)
    year_established = Column(Integer, nullable=True)

    # --- Phase A: location ---
    street_address = Column(String(255), nullable=True)
    suburb = Column(String(100), nullable=True)
    state = Column(String(10), nullable=True)
    postcode = Column(String(10), nullable=True)
    show_full_address = Column(Boolean, default=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # --- Phase A: tax & currency ---
    currency = Column(String(3), default="AUD")
    tax_rate = Column(Float, default=10.0)
    tax_inclusive = Column(Boolean, default=True)
    financial_year_start_month = Column(Integer, default=7)

    public_holiday_overrides = Column(JSON, nullable=True)  # {holiday_key: {closed, message}}

    updated_by_id = Column(String, nullable=True)
    updated_by_name = Column(String(200), nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class ServiceCategory(Base):
    __tablename__ = "service_categories"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(7), nullable=False, default="#a9c4d7")
    sort_order = Column(Integer, default=0)
    status = Column(String(20), default="active")  # active | hidden | archived
    show_on_booking_page = Column(Boolean, default=True)
    show_on_online_booking = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class Closure(Base):
    __tablename__ = "closures"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(200), nullable=False)
    closure_type = Column(String(20), nullable=False, default="closed")  # closed | reduced
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    reason = Column(Text, nullable=True)
    open_time = Column(String(5), nullable=True)
    close_time = Column(String(5), nullable=True)
    show_on_booking_page = Column(Boolean, default=True)
    notify_clients = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class PricingHistory(Base):
    __tablename__ = "pricing_history"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    service_id = Column(String, ForeignKey("services.id"), nullable=True)
    service_name = Column(String(200), nullable=False)
    old_price_cents = Column(Integer, nullable=False)
    new_price_cents = Column(Integer, nullable=False)
    reason = Column(String(200), nullable=True)
    changed_by_id = Column(String, nullable=True)
    changed_by_name = Column(String(200), nullable=True)
    effective_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Policy(Base):
    __tablename__ = "policies"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    policy_type = Column(String(50), nullable=False, unique=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=True)
    status = Column(String(20), default="draft")  # draft | active | scheduled
    require_acceptance = Column(Boolean, default=False)
    require_signature = Column(Boolean, default=False)
    show_on_booking_page = Column(Boolean, default=True)
    show_in_confirmation_email = Column(Boolean, default=False)
    show_in_client_portal = Column(Boolean, default=False)
    show_during_checkout = Column(Boolean, default=False)
    effective_date = Column(DateTime, nullable=True)
    version = Column(Integer, default=1)
    updated_by_id = Column(String, nullable=True)
    updated_by_name = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class PolicyHistory(Base):
    __tablename__ = "policy_history"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    policy_type = Column(String(50), nullable=False)
    version = Column(Integer, nullable=False)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=True)
    changed_by_name = Column(String(200), nullable=True)
    reason = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class DepositRules(Base):
    __tablename__ = "deposit_rules"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    default_deposit_type = Column(String(20), default="percentage")  # none | fixed | percentage | full
    default_deposit_value = Column(Float, default=25.0)

    new_client_deposit_enabled = Column(Boolean, default=False)
    new_client_deposit_type = Column(String(20), default="percentage")
    new_client_deposit_value = Column(Float, default=50.0)

    at_risk_deposit_enabled = Column(Boolean, default=False)
    at_risk_no_show_threshold = Column(Integer, default=2)
    require_saved_card = Column(Boolean, default=False)

    allow_cancellations = Column(Boolean, default=True)
    cancellation_deadline_hours = Column(Integer, default=24)
    cancellation_fee_type = Column(String(20), default="deposit")  # none | fixed | percentage | deposit | credit
    cancellation_fee_value = Column(Float, default=0.0)
    grace_period_days = Column(Integer, nullable=True)
    reschedule_same_as_cancel = Column(Boolean, default=False)
    show_cancellation_policy = Column(Boolean, default=True)

    no_show_fee_enabled = Column(Boolean, default=True)
    no_show_fee_type = Column(String(20), default="fixed")  # fixed | percentage
    no_show_fee_value = Column(Float, default=50.0)
    auto_charge_no_show = Column(Boolean, default=False)
    max_no_shows_before_block = Column(Integer, default=3)
    show_no_show_policy = Column(Boolean, default=True)

    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class ChangeLogEntry(Base):
    __tablename__ = "change_log"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    entity_type = Column(String(50), nullable=False)  # service | category | pricing | policy | hours | business_settings | deposit_rules | closure
    entity_id = Column(String, nullable=True)
    action = Column(String(20), nullable=False)  # created | updated | deleted | archived
    summary = Column(String(500), nullable=False)
    before_json = Column(Text, nullable=True)
    after_json = Column(Text, nullable=True)
    changed_by_id = Column(String, nullable=True)
    changed_by_name = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))