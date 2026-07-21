"""Phase A: Core Admin Backend API.

Comprehensive business-settings admin endpoints: dashboard, business info,
hours & closures, service categories, services (extended editor), pricing,
deposit/payment rules, policies, and the change log/audit trail.
"""
from fastapi import APIRouter, HTTPException, Depends, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import json

from models import (
    User, UserRole, Service, ServiceCategory, Closure, PricingHistory,
    Policy, PolicyHistory, DepositRules, ChangeLogEntry, BusinessSettings,
    Appointment,
)
from database import get_db
from auth import get_admin_user, get_staff_user

router = APIRouter(prefix="/api/admin", tags=["admin"])

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _now():
    return datetime.now(timezone.utc)


def _display_name(user: User) -> str:
    return f"{user.first_name} {user.last_name}".strip()


def _json_default(value):
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def _to_dict(obj, exclude=()):
    data = {}
    for col in obj.__table__.columns:
        if col.name in exclude:
            continue
        value = getattr(obj, col.name)
        if isinstance(value, datetime):
            value = value.isoformat()
        data[col.name] = value
    return data


def log_change(db: Session, user: User, entity_type: str, entity_id: Optional[str],
                action: str, summary: str, before=None, after=None):
    entry = ChangeLogEntry(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        summary=summary,
        before_json=json.dumps(before, default=_json_default) if before is not None else None,
        after_json=json.dumps(after, default=_json_default) if after is not None else None,
        changed_by_id=user.id if user else None,
        changed_by_name=_display_name(user) if user else None,
    )
    db.add(entry)
    return entry


def apply_fields(obj, data: dict, allowed: set):
    changed = {}
    for field in allowed:
        if field in data:
            old_value = getattr(obj, field, None)
            new_value = data[field]
            if old_value != new_value:
                changed[field] = {"old": old_value, "new": new_value}
            setattr(obj, field, new_value)
    return changed


def get_or_create_business_settings(db: Session) -> BusinessSettings:
    settings = db.query(BusinessSettings).first()
    if not settings:
        settings = BusinessSettings(business_name="My Clinic")
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def get_or_create_deposit_rules(db: Session) -> DepositRules:
    rules = db.query(DepositRules).first()
    if not rules:
        rules = DepositRules()
        db.add(rules)
        db.commit()
        db.refresh(rules)
    return rules


def serialize_category(cat: ServiceCategory, db: Session) -> dict:
    count = db.query(Service).filter(Service.category_id == cat.id).count()
    data = _to_dict(cat)
    data["service_count"] = count
    return data


def serialize_service(service: Service, db: Session = None, category_map: dict = None) -> dict:
    data = _to_dict(service)
    category = None
    if category_map is not None:
        category = category_map.get(service.category_id)
    elif db is not None and service.category_id:
        category = db.query(ServiceCategory).filter(ServiceCategory.id == service.category_id).first()
    data["category_name"] = category.name if category else service.category
    data["category_color"] = category.color if category else service.color_code
    return data


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_staff_user)):
    total_services = db.query(Service).count()
    active_services = db.query(Service).filter(Service.status == "active").count()

    last_change = db.query(ChangeLogEntry).order_by(ChangeLogEntry.created_at.desc()).first()

    now = _now()
    pending_price_changes = db.query(PricingHistory).filter(
        PricingHistory.effective_at.isnot(None), PricingHistory.effective_at > now
    ).count()
    pending_policies = db.query(Policy).filter(Policy.status == "scheduled").count()

    settings = get_or_create_business_settings(db)

    missing_images = db.query(Service).filter(Service.status == "active", or_(Service.image_url.is_(None), Service.image_url == "")).count()
    missing_pricing = db.query(Service).filter(Service.status == "active", or_(Service.price_cents.is_(None), Service.price_cents == 0)).count()
    incomplete_settings = sum(1 for f in [settings.business_name, settings.business_phone, settings.business_email, settings.street_address] if not f)

    recent_changes = db.query(ChangeLogEntry).order_by(ChangeLogEntry.created_at.desc()).limit(3).all()

    upcoming = []
    for ph in db.query(PricingHistory).filter(PricingHistory.effective_at.isnot(None), PricingHistory.effective_at > now).order_by(PricingHistory.effective_at).limit(5).all():
        upcoming.append({
            "type": "pricing",
            "id": ph.id,
            "description": f"{ph.service_name} price change to ${ph.new_price_cents/100:.2f}",
            "effective_at": ph.effective_at.isoformat(),
        })

    return {
        "last_updated": last_change.created_at.isoformat() if last_change else None,
        "metrics": {
            "total_active_services": active_services,
            "total_services": total_services,
            "last_change": {
                "summary": last_change.summary if last_change else None,
                "by": last_change.changed_by_name if last_change else None,
                "at": last_change.created_at.isoformat() if last_change else None,
            } if last_change else None,
            "pending_updates": pending_price_changes + pending_policies,
            "system_alerts": missing_images + missing_pricing + incomplete_settings,
        },
        "recent_changes": [
            {
                "id": c.id, "entity_type": c.entity_type, "action": c.action,
                "summary": c.summary, "by": c.changed_by_name,
                "at": c.created_at.isoformat(),
            } for c in recent_changes
        ],
        "action_items": [
            {"key": "missing_images", "label": "Services missing images", "count": missing_images, "route": "/admin/services?filter=missing_images"},
            {"key": "missing_pricing", "label": "Services with no pricing", "count": missing_pricing, "route": "/admin/services?filter=missing_pricing"},
            {"key": "incomplete_settings", "label": "Incomplete business settings", "count": incomplete_settings, "route": "/admin/business-settings"},
        ],
        "scheduled_changes": upcoming,
    }


# ---------------------------------------------------------------------------
# Business Settings
# ---------------------------------------------------------------------------

BUSINESS_INFO_FIELDS = {
    "business_name", "abn", "logo_url", "description", "business_phone",
    "business_email", "booking_email", "after_hours_method", "after_hours_value",
    "year_established",
}
LOCATION_FIELDS = {
    "street_address", "suburb", "state", "postcode", "show_full_address",
    "latitude", "longitude", "business_address",
}
TAX_FIELDS = {"currency", "tax_rate", "tax_inclusive", "financial_year_start_month"}
ALL_SETTINGS_FIELDS = BUSINESS_INFO_FIELDS | LOCATION_FIELDS | TAX_FIELDS


@router.get("/business-settings")
def get_business_settings_admin(db: Session = Depends(get_db), current_user: User = Depends(get_staff_user)):
    settings = get_or_create_business_settings(db)
    return _to_dict(settings)


@router.put("/business-settings")
def update_business_settings_admin(payload: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_admin_user)):
    settings = get_or_create_business_settings(db)
    changed = apply_fields(settings, payload, ALL_SETTINGS_FIELDS)
    settings.updated_by_id = current_user.id
    settings.updated_by_name = _display_name(current_user)
    settings.updated_at = _now()
    if changed:
        log_change(db, current_user, "business_settings", settings.id, "updated",
                   f"Updated business settings ({', '.join(changed.keys())})", changed, None)
    db.commit()
    db.refresh(settings)
    return _to_dict(settings)


# ---------------------------------------------------------------------------
# Hours & Closures
# ---------------------------------------------------------------------------

AU_PUBLIC_HOLIDAYS = [
    {"key": "new_years_day", "name": "New Year's Day", "date": "2026-01-01"},
    {"key": "australia_day", "name": "Australia Day", "date": "2026-01-26"},
    {"key": "good_friday", "name": "Good Friday", "date": "2026-04-03"},
    {"key": "easter_monday", "name": "Easter Monday", "date": "2026-04-06"},
    {"key": "anzac_day", "name": "ANZAC Day", "date": "2026-04-25"},
    {"key": "kings_birthday", "name": "King's Birthday", "date": "2026-06-08"},
    {"key": "labour_day", "name": "Labour Day", "date": "2026-10-05"},
    {"key": "christmas_day", "name": "Christmas Day", "date": "2026-12-25"},
    {"key": "boxing_day", "name": "Boxing Day", "date": "2026-12-26"},
]


@router.get("/hours")
def get_hours(db: Session = Depends(get_db), current_user: User = Depends(get_staff_user)):
    settings = get_or_create_business_settings(db)
    return {"operating_hours": settings.operating_hours or {}}


@router.put("/hours")
def update_hours(payload: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_admin_user)):
    settings = get_or_create_business_settings(db)
    before = settings.operating_hours
    settings.operating_hours = payload.get("operating_hours", settings.operating_hours)
    settings.updated_at = _now()
    log_change(db, current_user, "hours", settings.id, "updated", "Updated opening hours", before, settings.operating_hours)
    db.commit()
    return {"operating_hours": settings.operating_hours}


@router.post("/hours/copy")
def copy_hours(payload: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_admin_user)):
    source_day = payload.get("source_day")
    target_days = payload.get("target_days", [])
    settings = get_or_create_business_settings(db)
    hours = dict(settings.operating_hours or {})
    if source_day not in hours:
        raise HTTPException(status_code=400, detail="Unknown source day")
    for day in target_days:
        hours[day] = json.loads(json.dumps(hours[source_day]))
    settings.operating_hours = hours
    settings.updated_at = _now()
    log_change(db, current_user, "hours", settings.id, "updated", f"Copied {source_day} hours to {', '.join(target_days)}")
    db.commit()
    return {"operating_hours": settings.operating_hours}


@router.get("/public-holidays")
def get_public_holidays(db: Session = Depends(get_db), current_user: User = Depends(get_staff_user)):
    settings = get_or_create_business_settings(db)
    overrides = settings.public_holiday_overrides or {}
    result = []
    for h in AU_PUBLIC_HOLIDAYS:
        override = overrides.get(h["key"], {})
        result.append({
            **h,
            "closed": override.get("closed", True),
            "message": override.get("message", f"Closed for {h['name']}"),
        })
    return result


@router.put("/public-holidays/{key}")
def update_public_holiday(key: str, payload: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_admin_user)):
    settings = get_or_create_business_settings(db)
    overrides = dict(settings.public_holiday_overrides or {})
    overrides[key] = {
        "closed": payload.get("closed", True),
        "message": payload.get("message", ""),
    }
    settings.public_holiday_overrides = overrides
    settings.updated_at = _now()
    log_change(db, current_user, "hours", settings.id, "updated", f"Updated public holiday setting for {key}")
    db.commit()
    return overrides[key]


@router.get("/closures")
def list_closures(db: Session = Depends(get_db), current_user: User = Depends(get_staff_user)):
    closures = db.query(Closure).order_by(Closure.start_date.desc()).all()
    now = _now()
    result = []
    for c in closures:
        data = _to_dict(c)
        end = c.end_date if c.end_date.tzinfo else c.end_date.replace(tzinfo=timezone.utc)
        data["is_active"] = end >= now
        result.append(data)
    return result


CLOSURE_FIELDS = {"title", "closure_type", "start_date", "end_date", "reason", "open_time", "close_time", "show_on_booking_page", "notify_clients"}


@router.post("/closures")
def create_closure(payload: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_admin_user)):
    for field in ("title", "start_date", "end_date"):
        if not payload.get(field):
            raise HTTPException(status_code=400, detail=f"{field} is required")
    data = {k: v for k, v in payload.items() if k in CLOSURE_FIELDS}
    data["start_date"] = datetime.fromisoformat(data["start_date"])
    data["end_date"] = datetime.fromisoformat(data["end_date"])
    closure = Closure(**data)
    db.add(closure)
    db.flush()
    log_change(db, current_user, "closure", closure.id, "created", f"Added closure: {closure.title}")
    db.commit()
    db.refresh(closure)
    return _to_dict(closure)


@router.put("/closures/{closure_id}")
def update_closure(closure_id: str, payload: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_admin_user)):
    closure = db.query(Closure).filter(Closure.id == closure_id).first()
    if not closure:
        raise HTTPException(status_code=404, detail="Closure not found")
    data = {k: v for k, v in payload.items() if k in CLOSURE_FIELDS}
    if "start_date" in data:
        data["start_date"] = datetime.fromisoformat(data["start_date"])
    if "end_date" in data:
        data["end_date"] = datetime.fromisoformat(data["end_date"])
    apply_fields(closure, data, CLOSURE_FIELDS)
    log_change(db, current_user, "closure", closure.id, "updated", f"Updated closure: {closure.title}")
    db.commit()
    db.refresh(closure)
    return _to_dict(closure)


@router.delete("/closures/{closure_id}")
def delete_closure(closure_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_admin_user)):
    closure = db.query(Closure).filter(Closure.id == closure_id).first()
    if not closure:
        raise HTTPException(status_code=404, detail="Closure not found")
    log_change(db, current_user, "closure", closure.id, "deleted", f"Deleted closure: {closure.title}")
    db.delete(closure)
    db.commit()
    return {"message": "Closure deleted"}


# ---------------------------------------------------------------------------
# Service Categories
# ---------------------------------------------------------------------------

CATEGORY_FIELDS = {"name", "description", "color", "status", "show_on_booking_page", "show_on_online_booking", "sort_order"}


@router.get("/categories")
def list_categories(status: Optional[str] = None, search: Optional[str] = None,
                     db: Session = Depends(get_db), current_user: User = Depends(get_staff_user)):
    query = db.query(ServiceCategory)
    if status and status != "all":
        query = query.filter(ServiceCategory.status == status)
    if search:
        query = query.filter(ServiceCategory.name.ilike(f"%{search}%"))
    categories = query.order_by(ServiceCategory.sort_order, ServiceCategory.name).all()
    return [serialize_category(c, db) for c in categories]


@router.post("/categories")
def create_category(payload: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_admin_user)):
    if not payload.get("name"):
        raise HTTPException(status_code=400, detail="Category name is required")
    max_order = db.query(ServiceCategory).count()
    data = {k: v for k, v in payload.items() if k in CATEGORY_FIELDS}
    data.setdefault("sort_order", max_order)
    category = ServiceCategory(**data)
    db.add(category)
    db.flush()
    log_change(db, current_user, "category", category.id, "created", f"Created category: {category.name}")
    db.commit()
    db.refresh(category)
    return serialize_category(category, db)


@router.put("/categories/{category_id}")
def update_category(category_id: str, payload: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_admin_user)):
    category = db.query(ServiceCategory).filter(ServiceCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    changed = apply_fields(category, payload, CATEGORY_FIELDS)
    category.updated_at = _now()
    if changed:
        log_change(db, current_user, "category", category.id, "updated", f"Updated category: {category.name}", changed)
    db.commit()
    db.refresh(category)
    return serialize_category(category, db)


@router.put("/categories/reorder")
def reorder_categories(payload: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_admin_user)):
    ordered_ids = payload.get("ordered_ids", [])
    for index, cat_id in enumerate(ordered_ids):
        db.query(ServiceCategory).filter(ServiceCategory.id == cat_id).update({"sort_order": index})
    log_change(db, current_user, "category", None, "updated", "Reordered service categories")
    db.commit()
    return {"message": "Category order updated"}


@router.delete("/categories/{category_id}")
def delete_category(category_id: str, reassign_to: Optional[str] = None, archive_only: bool = False,
                     db: Session = Depends(get_db), current_user: User = Depends(get_admin_user)):
    category = db.query(ServiceCategory).filter(ServiceCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    service_count = db.query(Service).filter(Service.category_id == category.id).count()
    if service_count and not reassign_to and not archive_only:
        raise HTTPException(status_code=400, detail=f"This category has {service_count} services. Choose a category to reassign them to, or archive instead.")
    if reassign_to:
        target = db.query(ServiceCategory).filter(ServiceCategory.id == reassign_to).first()
        if not target:
            raise HTTPException(status_code=404, detail="Target category not found")
        db.query(Service).filter(Service.category_id == category.id).update({"category_id": reassign_to})
        db.delete(category)
        log_change(db, current_user, "category", category_id, "deleted", f"Deleted category '{category.name}', services moved to '{target.name}'")
    elif archive_only:
        category.status = "archived"
        log_change(db, current_user, "category", category.id, "archived", f"Archived category: {category.name}")
    else:
        db.delete(category)
        log_change(db, current_user, "category", category_id, "deleted", f"Deleted category: {category.name}")
    db.commit()
    return {"message": "Category removed"}


# ---------------------------------------------------------------------------
# Services (extended admin editor)
# ---------------------------------------------------------------------------

SERVICE_FIELDS = {
    "name", "description", "category", "category_id", "duration_minutes", "price_cents",
    "color_code", "is_active", "requires_consultation", "max_advance_booking_days",
    "internal_code", "treatment_tags", "short_description", "long_description",
    "expected_results", "ideal_for", "not_suitable_for",
    "sale_price_cents", "sale_start_date", "sale_end_date",
    "deposit_type", "deposit_value", "cost_cents", "staff_cost_cents",
    "buffer_before_minutes", "buffer_after_minutes", "online_booking_enabled",
    "booking_disabled_reason", "new_clients_only", "existing_clients_only",
    "min_prior_bookings", "min_notice_days", "max_advance_weeks", "max_daily_bookings",
    "staff_ids", "room", "equipment",
    "requires_consultation_form", "requires_consent_form", "requires_medical_history",
    "requires_photo_consent", "requires_contraindication_screening", "requires_patch_test",
    "requires_doctor_clearance", "min_age", "max_age", "block_if_incomplete",
    "booking_instructions", "preparation_instructions", "aftercare_instructions",
    "rebooking_interval", "image_url", "gallery_images", "status", "hide_reason", "sort_order",
}
DATE_FIELDS = {"sale_start_date", "sale_end_date"}


def _normalize_service_payload(data: dict) -> dict:
    clean = {k: v for k, v in data.items() if k in SERVICE_FIELDS}
    for f in DATE_FIELDS:
        if clean.get(f):
            clean[f] = datetime.fromisoformat(clean[f])
    if "status" in clean:
        clean["is_active"] = clean["status"] == "active"
    return clean


@router.get("/services")
def list_services_admin(status: Optional[str] = None, category_id: Optional[str] = None,
                         search: Optional[str] = None, sort: Optional[str] = "name",
                         db: Session = Depends(get_db), current_user: User = Depends(get_staff_user)):
    query = db.query(Service)
    if status and status != "all":
        query = query.filter(Service.status == status)
    if category_id:
        query = query.filter(Service.category_id == category_id)
    if search:
        query = query.filter(Service.name.ilike(f"%{search}%"))

    services = query.all()

    sort_key = {
        "name": lambda s: (s.name or "").lower(),
        "price_low": lambda s: s.price_cents or 0,
        "price_high": lambda s: -(s.price_cents or 0),
        "duration": lambda s: s.duration_minutes or 0,
        "recently_updated": lambda s: s.updated_at or datetime.min.replace(tzinfo=timezone.utc),
        "recently_created": lambda s: s.created_at or datetime.min.replace(tzinfo=timezone.utc),
    }.get(sort, lambda s: (s.name or "").lower())
    reverse = sort in ("recently_updated", "recently_created")
    services = sorted(services, key=sort_key, reverse=reverse)

    categories = {c.id: c for c in db.query(ServiceCategory).all()}
    booking_counts = {}
    for row in db.query(Appointment.service_id).all():
        booking_counts[row.service_id] = booking_counts.get(row.service_id, 0) + 1

    result = []
    for s in services:
        data = serialize_service(s, category_map=categories)
        data["booking_count"] = booking_counts.get(s.id, 0)
        result.append(data)
    return result


@router.post("/services")
def create_service_admin(payload: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_admin_user)):
    for field in ("name", "duration_minutes", "price_cents"):
        if payload.get(field) in (None, ""):
            raise HTTPException(status_code=400, detail=f"{field} is required")
    if payload.get("price_cents", 0) <= 0:
        raise HTTPException(status_code=400, detail="Price must be greater than $0")

    data = _normalize_service_payload(payload)
    if data.get("category_id"):
        category = db.query(ServiceCategory).filter(ServiceCategory.id == data["category_id"]).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        data.setdefault("category", category.name.lower().replace(" ", "_"))
        data.setdefault("color_code", category.color)
    else:
        data.setdefault("category", "general")

    existing = db.query(Service).filter(
        Service.name == data["name"], Service.category_id == data.get("category_id")
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Service name already exists in this category")

    service = Service(**data)
    db.add(service)
    db.flush()
    log_change(db, current_user, "service", service.id, "created", f"Created service: {service.name}")
    db.commit()
    db.refresh(service)
    return serialize_service(service, db)


@router.get("/services/{service_id}")
def get_service_admin(service_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_staff_user)):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return serialize_service(service, db)


@router.put("/services/{service_id}")
def update_service_admin(service_id: str, payload: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_admin_user)):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    data = _normalize_service_payload(payload)

    if "price_cents" in data and data["price_cents"] != service.price_cents:
        db.add(PricingHistory(
            service_id=service.id, service_name=service.name,
            old_price_cents=service.price_cents, new_price_cents=data["price_cents"],
            reason="Service edit", changed_by_id=current_user.id, changed_by_name=_display_name(current_user),
        ))

    changed = apply_fields(service, data, SERVICE_FIELDS)
    service.updated_at = _now()
    if changed:
        log_change(db, current_user, "service", service.id, "updated", f"Updated service: {service.name}", changed)
    db.commit()
    db.refresh(service)
    return serialize_service(service, db)


@router.delete("/services/{service_id}")
def archive_service_admin(service_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_admin_user)):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    service.status = "archived"
    service.is_active = False
    service.updated_at = _now()
    log_change(db, current_user, "service", service.id, "archived", f"Archived service: {service.name}")
    db.commit()
    return {"message": "Service archived"}


@router.post("/services/{service_id}/duplicate")
def duplicate_service_admin(service_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_admin_user)):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    data = _to_dict(service, exclude={"id", "created_at", "updated_at"})
    for f in DATE_FIELDS:
        if data.get(f):
            data[f] = datetime.fromisoformat(data[f])
    data["name"] = f"{service.name} (Copy)"
    data["status"] = "hidden"
    data["is_active"] = False
    new_service = Service(**data)
    db.add(new_service)
    db.flush()
    log_change(db, current_user, "service", new_service.id, "created", f"Duplicated service: {service.name}")
    db.commit()
    db.refresh(new_service)
    return serialize_service(new_service, db)


@router.post("/services/bulk")
def bulk_service_action(payload: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_admin_user)):
    ids = payload.get("ids", [])
    action = payload.get("action")
    if not ids:
        raise HTTPException(status_code=400, detail="No services selected")
    services = db.query(Service).filter(Service.id.in_(ids)).all()

    if action == "activate":
        for s in services:
            s.status, s.is_active = "active", True
    elif action == "hide":
        for s in services:
            s.status, s.is_active = "hidden", False
    elif action == "archive":
        for s in services:
            s.status, s.is_active = "archived", False
    elif action == "delete":
        for s in services:
            s.status, s.is_active = "archived", False
    elif action == "move_category":
        category_id = payload.get("category_id")
        for s in services:
            s.category_id = category_id
    elif action == "update_price":
        percent = payload.get("percent")
        fixed_cents = payload.get("fixed_cents")
        for s in services:
            old_price = s.price_cents
            if percent is not None:
                new_price = round(old_price * (1 + percent / 100))
            elif fixed_cents is not None:
                new_price = old_price + fixed_cents
            else:
                continue
            s.price_cents = max(new_price, 0)
            db.add(PricingHistory(
                service_id=s.id, service_name=s.name, old_price_cents=old_price,
                new_price_cents=s.price_cents, reason="Bulk price update",
                changed_by_id=current_user.id, changed_by_name=_display_name(current_user),
            ))
    else:
        raise HTTPException(status_code=400, detail="Unknown bulk action")

    for s in services:
        s.updated_at = _now()
    log_change(db, current_user, "service", None, "updated", f"Bulk action '{action}' applied to {len(services)} services")
    db.commit()
    return {"message": f"{action} applied to {len(services)} services"}


# ---------------------------------------------------------------------------
# Pricing
# ---------------------------------------------------------------------------

@router.get("/pricing")
def list_pricing(search: Optional[str] = None, category_id: Optional[str] = None,
                  db: Session = Depends(get_db), current_user: User = Depends(get_staff_user)):
    query = db.query(Service)
    if search:
        query = query.filter(Service.name.ilike(f"%{search}%"))
    if category_id:
        query = query.filter(Service.category_id == category_id)
    services = query.all()
    categories = {c.id: c for c in db.query(ServiceCategory).all()}

    last_changes = {}
    for ph in db.query(PricingHistory).order_by(PricingHistory.created_at.desc()).all():
        if ph.service_id and ph.service_id not in last_changes:
            last_changes[ph.service_id] = ph.created_at.isoformat()

    result = []
    for s in services:
        data = serialize_service(s, category_map=categories)
        data["last_changed"] = last_changes.get(s.id)
        result.append(data)
    return result


@router.put("/pricing/{service_id}")
def update_pricing(service_id: str, payload: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_admin_user)):
    service = db.query(Service).filter(Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    new_price = payload.get("new_price_cents")
    if new_price is None or new_price <= 0:
        raise HTTPException(status_code=400, detail="New price must be greater than $0")
    new_sale_price = payload.get("new_sale_price_cents")
    reason = payload.get("reason", "Market adjustment")
    effective_date = payload.get("effective_date")
    effective_at = datetime.fromisoformat(effective_date) if effective_date else None

    old_price = service.price_cents
    is_future = effective_at and effective_at > _now()

    history = PricingHistory(
        service_id=service.id, service_name=service.name, old_price_cents=old_price,
        new_price_cents=new_price, reason=reason, effective_at=effective_at,
        changed_by_id=current_user.id, changed_by_name=_display_name(current_user),
    )
    db.add(history)

    if not is_future:
        service.price_cents = new_price
        if new_sale_price is not None:
            service.sale_price_cents = new_sale_price
        service.updated_at = _now()
        log_change(db, current_user, "pricing", service.id, "updated",
                   f"{service.name} price changed from ${old_price/100:.2f} to ${new_price/100:.2f}")
    else:
        log_change(db, current_user, "pricing", service.id, "updated",
                   f"Scheduled {service.name} price change to ${new_price/100:.2f} for {effective_at.date()}")

    db.commit()
    return {"message": "Pricing updated", "applied_immediately": not is_future}


@router.post("/pricing/bulk-update")
def bulk_update_pricing(payload: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_admin_user)):
    category_id = payload.get("category_id")
    percent = payload.get("percent")
    fixed_cents = payload.get("fixed_cents")
    effective_date = payload.get("effective_date")
    reason = payload.get("reason", "Bulk price update")
    effective_at = datetime.fromisoformat(effective_date) if effective_date else None
    is_future = effective_at and effective_at > _now()

    query = db.query(Service).filter(Service.status == "active")
    if category_id:
        query = query.filter(Service.category_id == category_id)
    services = query.all()

    affected = []
    for s in services:
        old_price = s.price_cents
        if percent is not None:
            new_price = round(old_price * (1 + percent / 100))
        elif fixed_cents is not None:
            new_price = old_price + fixed_cents
        else:
            raise HTTPException(status_code=400, detail="Provide either percent or fixed_cents")
        new_price = max(new_price, 0)

        db.add(PricingHistory(
            service_id=s.id, service_name=s.name, old_price_cents=old_price,
            new_price_cents=new_price, reason=reason, effective_at=effective_at,
            changed_by_id=current_user.id, changed_by_name=_display_name(current_user),
        ))
        if not is_future:
            s.price_cents = new_price
            s.updated_at = _now()
        affected.append({"id": s.id, "name": s.name, "old_price_cents": old_price, "new_price_cents": new_price})

    log_change(db, current_user, "pricing", None, "updated",
               f"Bulk {'scheduled ' if is_future else ''}price update applied to {len(affected)} services")
    db.commit()
    return {"message": f"{len(affected)} prices updated", "applied_immediately": not is_future, "affected": affected}


@router.get("/pricing/history")
def get_pricing_history(service_id: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_staff_user)):
    query = db.query(PricingHistory)
    if service_id:
        query = query.filter(PricingHistory.service_id == service_id)
    entries = query.order_by(PricingHistory.created_at.desc()).limit(200).all()
    return [_to_dict(e) for e in entries]


@router.post("/pricing/history/{history_id}/apply")
def apply_scheduled_price(history_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_admin_user)):
    entry = db.query(PricingHistory).filter(PricingHistory.id == history_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Pricing history entry not found")
    service = db.query(Service).filter(Service.id == entry.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    service.price_cents = entry.new_price_cents
    service.updated_at = _now()
    entry.effective_at = _now()
    log_change(db, current_user, "pricing", service.id, "updated", f"Applied scheduled price change for {service.name}")
    db.commit()
    return {"message": "Scheduled price applied"}


# ---------------------------------------------------------------------------
# Deposit & Payment Rules
# ---------------------------------------------------------------------------

DEPOSIT_RULE_FIELDS = {
    "default_deposit_type", "default_deposit_value",
    "new_client_deposit_enabled", "new_client_deposit_type", "new_client_deposit_value",
    "at_risk_deposit_enabled", "at_risk_no_show_threshold", "require_saved_card",
    "allow_cancellations", "cancellation_deadline_hours", "cancellation_fee_type",
    "cancellation_fee_value", "grace_period_days", "reschedule_same_as_cancel",
    "show_cancellation_policy", "no_show_fee_enabled", "no_show_fee_type",
    "no_show_fee_value", "auto_charge_no_show", "max_no_shows_before_block",
    "show_no_show_policy",
}


@router.get("/deposit-rules")
def get_deposit_rules(db: Session = Depends(get_db), current_user: User = Depends(get_staff_user)):
    rules = get_or_create_deposit_rules(db)
    return _to_dict(rules)


@router.put("/deposit-rules")
def update_deposit_rules(payload: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_admin_user)):
    rules = get_or_create_deposit_rules(db)
    changed = apply_fields(rules, payload, DEPOSIT_RULE_FIELDS)
    rules.updated_at = _now()
    if changed:
        log_change(db, current_user, "deposit_rules", rules.id, "updated", "Updated deposit & payment rules", changed)
    db.commit()
    db.refresh(rules)
    return _to_dict(rules)


# ---------------------------------------------------------------------------
# Policies
# ---------------------------------------------------------------------------

POLICY_FIELDS = {
    "title", "content", "status", "require_acceptance", "require_signature",
    "show_on_booking_page", "show_in_confirmation_email", "show_in_client_portal",
    "show_during_checkout", "effective_date",
}


@router.get("/policies")
def list_policies(db: Session = Depends(get_db), current_user: User = Depends(get_staff_user)):
    return [_to_dict(p) for p in db.query(Policy).order_by(Policy.policy_type).all()]


@router.get("/policies/{policy_type}")
def get_policy(policy_type: str, db: Session = Depends(get_db), current_user: User = Depends(get_staff_user)):
    policy = db.query(Policy).filter(Policy.policy_type == policy_type).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    return _to_dict(policy)


@router.put("/policies/{policy_type}")
def update_policy(policy_type: str, payload: dict = Body(...), db: Session = Depends(get_db), current_user: User = Depends(get_admin_user)):
    policy = db.query(Policy).filter(Policy.policy_type == policy_type).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    publish_action = payload.get("publish_action", "draft")  # draft | publish | schedule
    data = {k: v for k, v in payload.items() if k in POLICY_FIELDS}
    if data.get("effective_date"):
        data["effective_date"] = datetime.fromisoformat(data["effective_date"])

    if publish_action in ("publish", "schedule"):
        db.add(PolicyHistory(
            policy_type=policy.policy_type, version=policy.version, title=policy.title,
            content=policy.content, changed_by_name=_display_name(current_user),
            reason=payload.get("reason"),
        ))
        policy.version += 1
        data["status"] = "scheduled" if publish_action == "schedule" else "active"

    apply_fields(policy, data, POLICY_FIELDS)
    policy.updated_by_id = current_user.id
    policy.updated_by_name = _display_name(current_user)
    policy.updated_at = _now()

    action_label = {"publish": "published", "schedule": "scheduled", "draft": "saved as draft"}[publish_action]
    log_change(db, current_user, "policy", policy.id, "updated", f"{policy.title} {action_label} (v{policy.version})")
    db.commit()
    db.refresh(policy)
    return _to_dict(policy)


@router.get("/policies/{policy_type}/history")
def get_policy_history(policy_type: str, db: Session = Depends(get_db), current_user: User = Depends(get_staff_user)):
    entries = db.query(PolicyHistory).filter(PolicyHistory.policy_type == policy_type).order_by(PolicyHistory.created_at.desc()).all()
    return [_to_dict(e) for e in entries]


# ---------------------------------------------------------------------------
# Change Log
# ---------------------------------------------------------------------------

@router.get("/change-log")
def get_change_log(entity_type: Optional[str] = None, action: Optional[str] = None,
                    search: Optional[str] = None, date_from: Optional[str] = None,
                    date_to: Optional[str] = None, limit: int = Query(100, le=500),
                    db: Session = Depends(get_db), current_user: User = Depends(get_staff_user)):
    query = db.query(ChangeLogEntry)
    if entity_type and entity_type != "all":
        query = query.filter(ChangeLogEntry.entity_type == entity_type)
    if action and action != "all":
        query = query.filter(ChangeLogEntry.action == action)
    if search:
        query = query.filter(ChangeLogEntry.summary.ilike(f"%{search}%"))
    if date_from:
        query = query.filter(ChangeLogEntry.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.filter(ChangeLogEntry.created_at <= datetime.fromisoformat(date_to))
    entries = query.order_by(ChangeLogEntry.created_at.desc()).limit(limit).all()
    return [_to_dict(e) for e in entries]
