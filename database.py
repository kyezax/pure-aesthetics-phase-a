import logging

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Prefer a real DATABASE_URL (e.g. the managed Postgres connection string Render/
# Railway inject) so data survives restarts and redeploys. Fall back to a local
# SQLite file for local development only — SQLite is not safe for a deployed
# environment with an ephemeral filesystem.
_database_url = os.getenv("DATABASE_URL")
if _database_url:
    # SQLAlchemy 2.x requires the "postgresql://" scheme; some providers still
    # hand out the legacy "postgres://" form.
    if _database_url.startswith("postgres://"):
        _database_url = _database_url.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URL = _database_url
else:
    logger.warning(
        "DATABASE_URL is not set — falling back to a local SQLite file. This is "
        "fine for local development, but do not deploy this to production: "
        "SQLite data will not persist across restarts on most hosting platforms. "
        "Set DATABASE_URL to a Postgres connection string for any real deployment."
    )
    SQLALCHEMY_DATABASE_URL = "sqlite:///./salon_booking.db"

_is_sqlite = SQLALCHEMY_DATABASE_URL.startswith("sqlite")

# Create engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False} if _is_sqlite else {}
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Async engine — only wired up for the SQLite dev path today (nothing in the
# app currently uses it). A Postgres deployment would need the asyncpg driver
# instead of psycopg2, so we don't attempt to build one here.
if _is_sqlite:
    async_engine = create_async_engine(SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "sqlite+aiosqlite:///"))
    AsyncSessionLocal = sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)
else:
    async_engine = None
    AsyncSessionLocal = None

def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@asynccontextmanager
async def get_async_db():
    """Async context manager for database session (SQLite dev only)."""
    if AsyncSessionLocal is None:
        raise NotImplementedError("Async DB access is only wired up for the local SQLite dev path.")
    async with AsyncSessionLocal() as session:
        yield session

def init_database():
    """Initialize database tables and apply lightweight column migrations."""
    from models import Base
    Base.metadata.create_all(bind=engine)
    _migrate_missing_columns(Base)


def _migrate_missing_columns(Base):
    """Add any columns present on the SQLAlchemy models but missing from
    already-existing SQLite tables (create_all only creates new tables,
    it never alters existing ones)."""
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            if table.name not in existing_tables:
                continue
            existing_columns = {col["name"] for col in inspector.get_columns(table.name)}
            for column in table.columns:
                if column.name in existing_columns:
                    continue
                col_type = column.type.compile(dialect=engine.dialect)
                ddl = f'ALTER TABLE "{table.name}" ADD COLUMN "{column.name}" {col_type}'
                try:
                    conn.execute(text(ddl))
                    print(f"Migrated: added column {table.name}.{column.name}")
                except Exception as exc:
                    print(f"Migration skipped for {table.name}.{column.name}: {exc}")

def create_default_data():
    """Create default data for the application."""
    from models import (
        User, Service, BusinessSettings, UserRole,
        ServiceCategory, DepositRules, Policy
    )
    import uuid
    
    db = SessionLocal()
    
    try:
        # Create default admin user if doesn't exist. Email/password come from
        # the environment so a real deployment isn't stuck with a publicly
        # known default login — if ADMIN_PASSWORD isn't set, a random one is
        # generated and printed once so you can log in and change it.
        import secrets as _secrets

        admin_email = os.getenv("ADMIN_EMAIL", "admin@salon.com")
        admin_user = db.query(User).filter(User.email == admin_email).first()
        if not admin_user:
            from auth import get_password_hash

            admin_password = os.getenv("ADMIN_PASSWORD")
            generated = admin_password is None
            if generated:
                admin_password = _secrets.token_urlsafe(12)

            admin_user = User(
                id=str(uuid.uuid4()),
                email=admin_email,
                password_hash=get_password_hash(admin_password),
                first_name="Admin",
                last_name="User",
                role=UserRole.ADMIN,
                phone="(555) 123-4567"
            )
            db.add(admin_user)

            if generated:
                print("=" * 70)
                print(f"Created admin account: {admin_email}")
                print(f"Generated password (shown once): {admin_password}")
                print("Log in and change this, or set ADMIN_EMAIL/ADMIN_PASSWORD "
                      "in your environment to control it directly.")
                print("=" * 70)
        
        # Create default services if they don't exist
        services_data = [
            {
                "name": "Classic Facial",
                "description": "Deep cleansing and moisturizing facial treatment",
                "category": "facial",
                "duration_minutes": 60,
                "price_cents": 8500,  # $85.00
                "color_code": "#10B981"  # Green
            },
            {
                "name": "Anti-Aging Facial",
                "description": "Advanced anti-aging treatment with peptides",
                "category": "facial", 
                "duration_minutes": 90,
                "price_cents": 12000,  # $120.00
                "color_code": "#8B5CF6"  # Purple
            },
            {
                "name": "Laser Tattoo Removal - Small",
                "description": "Laser removal for tattoos up to 2 square inches",
                "category": "laser_removal",
                "duration_minutes": 30,
                "price_cents": 15000,  # $150.00
                "color_code": "#EF4444"  # Red
            },
            {
                "name": "Laser Tattoo Removal - Medium",
                "description": "Laser removal for tattoos 2-6 square inches",
                "category": "laser_removal",
                "duration_minutes": 45,
                "price_cents": 25000,  # $250.00
                "color_code": "#DC2626"  # Darker red
            },
            {
                "name": "Laser Tattoo Removal - Large",
                "description": "Laser removal for tattoos over 6 square inches",
                "category": "laser_removal",
                "duration_minutes": 60,
                "price_cents": 40000,  # $400.00
                "color_code": "#B91C1C"  # Darkest red
            },
            {
                "name": "Professional Teeth Whitening",
                "description": "In-office professional teeth whitening treatment",
                "category": "teeth_whitening",
                "duration_minutes": 60,
                "price_cents": 20000,  # $200.00
                "color_code": "#3B82F6"  # Blue
            },
            {
                "name": "Take-Home Whitening Kit",
                "description": "Professional take-home whitening kit with trays",
                "category": "teeth_whitening",
                "duration_minutes": 30,
                "price_cents": 12500,  # $125.00
                "color_code": "#60A5FA"  # Light blue
            }
        ]
        
        for service_data in services_data:
            existing_service = db.query(Service).filter(Service.name == service_data["name"]).first()
            if not existing_service:
                service = Service(**service_data)
                db.add(service)

        db.commit()

        # --- Phase A: default service categories, linked to existing services ---
        categories_seed = [
            {"key": "facial", "name": "Facials", "color": "#a9c4d7", "sort_order": 0},
            {"key": "laser_removal", "name": "Laser Removal", "color": "#4b1a29", "sort_order": 1},
            {"key": "teeth_whitening", "name": "Teeth Whitening", "color": "#0F6E56", "sort_order": 2},
        ]
        category_by_key = {}
        for cat in categories_seed:
            existing_cat = db.query(ServiceCategory).filter(ServiceCategory.name == cat["name"]).first()
            if not existing_cat:
                existing_cat = ServiceCategory(
                    name=cat["name"], color=cat["color"], sort_order=cat["sort_order"]
                )
                db.add(existing_cat)
                db.flush()
            category_by_key[cat["key"]] = existing_cat

        for service in db.query(Service).all():
            if not service.category_id and service.category in category_by_key:
                service.category_id = category_by_key[service.category].id
            if service.status is None:
                service.status = "active" if service.is_active else "archived"
            if service.short_description is None and service.description:
                service.short_description = service.description[:150]

        # Create default business settings
        business_settings = db.query(BusinessSettings).first()
        if not business_settings:
            business_settings = BusinessSettings(
                business_name="Glow Beauty Salon",
                business_address="123 Beauty Street, Wellness City, WC 12345",
                business_phone="(555) 123-GLOW",
                business_email="hello@glowbeautysalon.com",
                booking_email="bookings@glowbeautysalon.com",
                description="A boutique beauty clinic offering facials, laser treatments and teeth whitening.",
                street_address="123 Beauty Street",
                suburb="Wellness City",
                state="WA",
                postcode="6210",
                currency="AUD",
                tax_rate=10.0,
                tax_inclusive=True,
                financial_year_start_month=7,
                operating_hours={
                    "monday": {"open": "09:00", "close": "18:00", "closed": False, "breaks": []},
                    "tuesday": {"open": "09:00", "close": "18:00", "closed": False, "breaks": []},
                    "wednesday": {"open": "09:00", "close": "18:00", "closed": False, "breaks": []},
                    "thursday": {"open": "09:00", "close": "20:00", "closed": False, "breaks": []},
                    "friday": {"open": "09:00", "close": "20:00", "closed": False, "breaks": []},
                    "saturday": {"open": "08:00", "close": "17:00", "closed": False, "breaks": []},
                    "sunday": {"open": "10:00", "close": "16:00", "closed": True, "breaks": []}
                },
                accepted_payment_methods=["card", "cash", "stripe", "square"]
            )
            db.add(business_settings)

        # --- Phase A: default deposit rules (single row) ---
        if not db.query(DepositRules).first():
            db.add(DepositRules())

        # --- Phase A: default policy templates ---
        policy_templates = [
            {
                "policy_type": "cancellation",
                "title": "Cancellation Policy",
                "content": (
                    "Cancellations must be made at least 24 hours in advance.\n"
                    "Cancellations made less than 24 hours before the appointment will forfeit the deposit.\n"
                    "Specific services may have different cancellation terms.\n"
                    "Please contact us to cancel or reschedule."
                ),
                "status": "active", "require_acceptance": True, "show_on_booking_page": True,
                "show_during_checkout": True,
            },
            {
                "policy_type": "no_show",
                "title": "No-Show Policy",
                "content": (
                    "Missing your appointment without notice will incur a no-show fee.\n"
                    "Repeated no-shows may require full prepayment for future bookings."
                ),
                "status": "active", "require_acceptance": True, "show_on_booking_page": True,
            },
            {
                "policy_type": "deposit",
                "title": "Deposit Policy",
                "content": "A deposit is required to secure your booking. The deposit is deducted from the final service price.",
                "status": "active", "show_on_booking_page": True, "show_during_checkout": True,
            },
            {
                "policy_type": "refund",
                "title": "Refund Policy",
                "content": "Refunds are assessed on a case-by-case basis in line with our cancellation and no-show policies.",
                "status": "draft",
            },
            {
                "policy_type": "terms",
                "title": "Terms & Conditions",
                "content": "By booking with us you agree to our booking, cancellation and privacy policies.",
                "status": "active", "require_acceptance": True, "show_during_checkout": True,
            },
            {
                "policy_type": "medical_disclaimer",
                "title": "Medical Disclaimer",
                "content": "Clients must disclose relevant medical history prior to treatment. Some treatments are not suitable for pregnant or breastfeeding clients.",
                "status": "active", "require_acceptance": True,
            },
            {
                "policy_type": "booking_disclaimer",
                "title": "Booking Disclaimer",
                "content": "Appointment times are estimates and may vary slightly depending on treatment requirements.",
                "status": "draft",
            },
        ]
        for tpl in policy_templates:
            if not db.query(Policy).filter(Policy.policy_type == tpl["policy_type"]).first():
                db.add(Policy(**tpl))

        db.commit()
        print("Default data created successfully!")
        
    except Exception as e:
        print(f"Error creating default data: {e}")
        db.rollback()
    finally:
        db.close()