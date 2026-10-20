from __future__ import annotations

import asyncio
import json
import math
import os
import secrets
import smtplib
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from html import escape
from pathlib import Path
from threading import RLock
from typing import Any
from urllib.parse import urlparse
from uuid import uuid4

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from webauthn import (
    generate_authentication_options,
    generate_registration_options,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.helpers import base64url_to_bytes, bytes_to_base64url, options_to_json
from webauthn.helpers.structs import (
    AuthenticatorAttachment,
    AuthenticatorSelectionCriteria,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)


load_dotenv(Path(__file__).parent.parent / ".env")
from . import storage


DEFAULT_DATA_DIR = Path("/tmp/rabi-chic-data") if os.getenv("VERCEL") else Path(__file__).parent
DATA_DIR = Path(os.getenv("RABI_DATA_DIR", DEFAULT_DATA_DIR))
DATA_DIR.mkdir(parents=True, exist_ok=True)
SECRET_KEY = os.getenv("RABI_SECRET_KEY") or secrets.token_urlsafe(48)
if os.getenv("VERCEL") and not os.getenv("RABI_SECRET_KEY"):
    raise RuntimeError("RABI_SECRET_KEY must be configured in Vercel Project Settings")
if os.getenv("VERCEL") and not storage.enabled():
    raise RuntimeError("DATABASE_URL must be configured for persistent Vercel storage")
ADMIN_EMAIL = os.getenv("RABI_ADMIN_EMAIL", "").strip().lower()
ALGORITHM = "HS256"
ACCESS_TOKEN_DAYS = 7
ADMIN_UNLOCK_MINUTES = 30
WEBAUTHN_ALLOWED_ORIGINS = {
    origin.strip().rstrip("/")
    for origin in os.getenv(
        "WEBAUTHN_ALLOWED_ORIGINS",
        "https://rabis-chic-fashion-hub.vercel.app,http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
}
DATA_LOCK = RLock()
PASSWORD_CONTEXT = CryptContext(schemes=["bcrypt"], deprecated="auto")
OAUTH2_SCHEME = OAuth2PasswordBearer(tokenUrl="/login")

DEFAULT_PRODUCTS = [
    {
        "id": 1,
        "name": "Chic Floral Summer Mini Dress",
        "category": "Dresses",
        "price": 180,
        "stock": 12,
        "rating": 4.8,
        "mainImage": "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=400&h=500&q=70&fm=webp",
        "description": "Breathable, high-quality chiffon floral dress designed for everyday elegance on UCC campus.",
    },
    {
        "id": 2,
        "name": "Satin Evening Elegance Gown",
        "category": "Dresses",
        "price": 290,
        "stock": 5,
        "rating": 4.9,
        "mainImage": "https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=400&h=500&q=70&fm=webp",
        "description": "Premium satin gown ideal for formal dinners and special occasions.",
    },
    {
        "id": 3,
        "name": "Luxury Designer Gold Clasp Tote",
        "category": "Bags",
        "price": 220,
        "stock": 8,
        "rating": 4.7,
        "mainImage": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=400&h=500&q=70&fm=webp",
        "description": "Spacious faux leather tote bag with gold-tone hardware.",
    },
    {
        "id": 4,
        "name": "Strappy Stiletto Party Heels",
        "category": "Footwear",
        "price": 210,
        "stock": 10,
        "rating": 4.6,
        "mainImage": "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=400&h=500&q=70&fm=webp",
        "description": "Sleek and comfortable strap heels to complete your outfit.",
    },
]


def read_data(name: str, default: Any) -> Any:
    path = DATA_DIR / name
    if not path.exists():
        write_data(name, default)
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default


def write_data(name: str, value: Any) -> None:
    path = DATA_DIR / name
    temporary_path = path.with_suffix(f"{path.suffix}.tmp")
    temporary_path.write_text(json.dumps(value, ensure_ascii=True), encoding="utf-8")
    temporary_path.replace(path)


USERS: list[dict[str, Any]] = read_data("users.json", [])
PRODUCTS: list[dict[str, Any]] = read_data("products.json", DEFAULT_PRODUCTS)
ORDERS: dict[str, dict[str, Any]] = read_data("orders.json", {})
RIDER_LOCATIONS: dict[str, dict[str, Any]] = {}
CONNECTED_TRACKERS: dict[str, set[WebSocket]] = {}
PASSKEYS: list[dict[str, Any]] = read_data("passkeys.json", [])

# ── In-memory live GPS locations (Vercel-compatible) ──────────────────────────
live_locations: dict[str, dict[str, Any]] = {}
SHOP_COORDS = (5.1036, -1.2825)
DEFAULT_DESTINATION_COORDS = (5.115, -1.288)

# ── Default site content ──────────────────────────────────────────────────────
DEFAULT_SITE_CONTENT: dict[str, Any] = {
    "hero": {
        "title": "New UCC Campus Arrival",
        "subtitle": "Fast UCC hostel delivery with real Google Maps live GPS tracking!",
        "imageUrl": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80",
        "ctaText": "Shop Now",
        "ctaLink": "#store",
    },
    "featured": {"productIds": [1, 2, 3, 4, 5, 6], "bannerImages": []},
}


app = FastAPI(title="Rabi's Chic Fashion Hub API")
if os.getenv("VERCEL"):
    @app.middleware("http")
    async def strip_vercel_api_prefix(request, call_next):
        path = request.scope["path"]
        if path == "/api" or path.startswith("/api/"):
            normalized_path = path[4:] or "/"
            request.scope["path"] = normalized_path
            request.scope["raw_path"] = normalized_path.encode("ascii")
        return await call_next(request)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


class SignupRequest(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=12, max_length=128)
    name: str = Field(min_length=1, max_length=100)


class PriceUpdate(BaseModel):
    price: float = Field(gt=0, le=1_000_000)


class OrderRequest(BaseModel):
    customer: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=5, max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    phone: str = Field(min_length=8, max_length=20)
    hostel: str = Field(min_length=1, max_length=100)
    room: str = Field(min_length=1, max_length=100)
    items: str = Field(min_length=1, max_length=300)
    productId: int
    quantity: int = Field(ge=1, le=10)
    deliveryOption: str = Field(pattern="^(standard|express|outside)$")
    paymentMethod: str = Field(default="MTN MoMo", max_length=30)


class ContactMessageRequest(BaseModel):
    sender: str = Field(min_length=1, max_length=100)
    phone: str = Field(min_length=8, max_length=20)
    text: str = Field(min_length=1, max_length=2000)


def _send_order_email(order: dict[str, Any], recipient: str, *, admin_notice: bool = False) -> bool:
    host = os.getenv("SMTP_HOST", "").strip()
    username = os.getenv("SMTP_USER", "").strip()
    password = os.getenv("SMTP_PASSWORD", "")
    sender = os.getenv("SMTP_FROM", username).strip()
    if not all((host, username, password, sender, recipient)):
        return False

    safe = {key: escape(str(order.get(key, ""))) for key in ("id", "customer", "email", "phone", "items", "quantity", "hostel", "room", "paymentMethod")}
    invoice = order.get("invoice", {})
    subject = f"New Rabi's Chic order {safe['id']}" if admin_notice else f"Your Rabi's Chic invoice {safe['id']}"
    greeting = "A new customer order has arrived." if admin_notice else "Thank you for your order. Here is the invoice preview you approved at checkout."
    html = f"""<h2>Rabi's Chic Fashion Hub</h2><p>{greeting}</p>
      <p><b>Order:</b> {safe['id']}<br><b>Customer:</b> {safe['customer']}<br>
      <b>Phone:</b> {safe['phone']}<br><b>Email:</b> {safe['email']}<br>
      <b>Delivery:</b> {safe['hostel']}, {safe['room']}<br><b>Payment:</b> {safe['paymentMethod']}</p>
      <table cellpadding="6" cellspacing="0" border="1"><tr><th>Item</th><th>Qty</th><th>Unit price</th><th>Subtotal</th></tr>
      <tr><td>{safe['items']}</td><td>{safe['quantity']}</td><td>GH₵ {invoice.get('unitPrice', 0):.2f}</td><td>GH₵ {invoice.get('subtotal', 0):.2f}</td></tr></table>
      <p>Delivery: GH₵ {invoice.get('deliveryFee', 0):.2f}<br><b>Total: GH₵ {invoice.get('total', 0):.2f}</b></p>
      <p>Status: Submitted - Pending Admin Approval</p>
      {f'<p><a href="https://rabis-chic-fashion-hub.vercel.app/rabis-admin">Open the admin dashboard</a></p>' if admin_notice else ''}"""
    plain = (f"{greeting}\nOrder {order['id']}\n{order['items']} x {order['quantity']}\n"
             f"Subtotal: GH₵ {invoice.get('subtotal', 0):.2f}\nDelivery: GH₵ {invoice.get('deliveryFee', 0):.2f}\n"
             f"Total: GH₵ {invoice.get('total', 0):.2f}\nStatus: Submitted - Pending Admin Approval")
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = sender
    message["To"] = recipient
    message.set_content(plain)
    message.add_alternative(html, subtype="html")
    port = int(os.getenv("SMTP_PORT", "587"))
    with smtplib.SMTP(host, port, timeout=12) as smtp:
        smtp.starttls()
        smtp.login(username, password)
        smtp.send_message(message)
    return True


def _send_order_sms(order: dict[str, Any]) -> bool:
    sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    sender = os.getenv("TWILIO_FROM_NUMBER", "").strip()
    recipient = os.getenv("RABI_ADMIN_PHONE", "").strip()
    if not all((sid, token, sender, recipient)):
        return False
    message = urllib.parse.urlencode({
        "From": sender,
        "To": recipient,
        "Body": f"New Rabi's Chic order {order['id']}: {order['customer']}, {order['items']} x {order['quantity']}, GH₵ {order['amount']:.2f}. Check the admin dashboard.",
    }).encode()
    request = urllib.request.Request(
        f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
        data=message,
        headers={"Authorization": "Basic " + __import__("base64").b64encode(f"{sid}:{token}".encode()).decode()},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=12):
        return True


def _admin_notification_email() -> str:
    try:
        admins = storage.list_users("admin") if storage.enabled() else [user for user in USERS if user.get("role") == "admin"]
        if admins:
            return str(admins[0].get("email", "")).strip().lower()
    except Exception:
        pass
    return ADMIN_EMAIL


def _get_contact_messages() -> list[dict[str, Any]]:
    if storage.enabled():
        return storage.get_store_setting("contact_messages") or []
    return read_data("contact_messages.json", [])


def _save_contact_messages(messages: list[dict[str, Any]]) -> None:
    if storage.enabled():
        storage.set_store_setting("contact_messages", messages)
    else:
        write_data("contact_messages.json", messages)


def _send_contact_message_email(message_data: dict[str, Any]) -> bool:
    recipient = _admin_notification_email()
    host = os.getenv("SMTP_HOST", "").strip()
    username = os.getenv("SMTP_USER", "").strip()
    password = os.getenv("SMTP_PASSWORD", "")
    sender_address = os.getenv("SMTP_FROM", username).strip()
    if not all((recipient, host, username, password, sender_address)):
        return False

    sender_name = escape(str(message_data.get("sender", "Customer")))
    sender_phone = escape(str(message_data.get("phone", "")))
    note = escape(str(message_data.get("text", "")))
    subject = f"New customer note from {message_data.get('sender', 'Rabi’s Chic customer')}"
    plain = f"New customer note\nFrom: {message_data.get('sender')}\nPhone: {message_data.get('phone')}\n\n{message_data.get('text')}\n\nOpen the admin dashboard: https://rabis-chic-fashion-hub.vercel.app/rabis-admin/messages"
    html = f"<h2>New customer note</h2><p><b>From:</b> {sender_name}<br><b>Phone:</b> {sender_phone}</p><p>{note}</p><p><a href=\"https://rabis-chic-fashion-hub.vercel.app/rabis-admin/messages\">Open customer messages</a></p>"
    email_message = EmailMessage()
    email_message["Subject"] = subject
    email_message["From"] = sender_address
    email_message["To"] = recipient
    email_message.set_content(plain)
    email_message.add_alternative(html, subtype="html")
    with smtplib.SMTP(host, int(os.getenv("SMTP_PORT", "587")), timeout=8) as smtp:
        smtp.starttls()
        smtp.login(username, password)
        smtp.send_message(email_message)
    return True


def _deliver_contact_message_email(message_id: str) -> None:
    with DATA_LOCK:
        messages = _get_contact_messages()
    message_data = next((item for item in messages if item.get("id") == message_id), None)
    if not message_data:
        return
    try:
        email_status = "sent" if _send_contact_message_email(message_data) else "not_configured"
    except (OSError, smtplib.SMTPException, ValueError):
        email_status = "failed"
    with DATA_LOCK:
        latest_messages = _get_contact_messages()
        latest_message = next((item for item in latest_messages if item.get("id") == message_id), None)
        if latest_message:
            latest_message["emailStatus"] = email_status
            _save_contact_messages(latest_messages)


def _distance_km(lat_a: float, lng_a: float, lat_b: float, lng_b: float) -> float:
    radians = math.pi / 180
    delta_lat = (lat_b - lat_a) * radians
    delta_lng = (lng_b - lng_a) * radians
    return 6371 * 2 * math.asin(math.sqrt(
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat_a * radians) * math.cos(lat_b * radians) * math.sin(delta_lng / 2) ** 2
    ))


def _delivery_metrics(lat: float, lng: float, destination_lat: float, destination_lng: float) -> dict[str, Any]:
    remaining_km = _distance_km(lat, lng, destination_lat, destination_lng)
    route_km = _distance_km(*SHOP_COORDS, destination_lat, destination_lng)
    delivered = remaining_km <= 0.05
    progress = 100 if delivered else 0 if route_km <= 0.05 else int(max(0, min(99, (1 - remaining_km / route_km) * 100)))
    eta = "Arriving now" if delivered else f"{max(1, math.ceil(remaining_km / 20 * 60))} mins"
    return {"progress": progress, "eta": eta, "status": "Delivered" if delivered else "On The Way", "distanceKm": round(remaining_km, 2)}


def _order_delivery_metrics(lat: float, lng: float, order: dict[str, Any]) -> dict[str, Any]:
    destination_lat = float(order.get("destinationLat", DEFAULT_DESTINATION_COORDS[0]))
    destination_lng = float(order.get("destinationLng", DEFAULT_DESTINATION_COORDS[1]))
    metrics = _delivery_metrics(lat, lng, destination_lat, destination_lng)
    if not order.get("destinationShared"):
        metrics["progress"] = min(99, metrics["progress"])
        metrics["eta"] = "Approx. " + ("1 min" if metrics["eta"] == "Arriving now" else metrics["eta"])
        metrics["status"] = "On The Way"
    elif order.get("status") == "Delivered":
        metrics.update(progress=100, eta="Arriving now", status="Delivered")
    return metrics


def _deliver_order_notifications(order_id: str, customer_email: str) -> None:
    if storage.enabled():
        order = storage.get_order(order_id)
    else:
        with DATA_LOCK:
            order = ORDERS.get(order_id)
    if not order:
        return

    status = {"adminEmail": "not_configured", "customerEmail": "not_configured", "sms": "not_configured"}
    for key, recipient, is_admin in (
        ("adminEmail", _admin_notification_email(), True),
        ("customerEmail", customer_email, False),
    ):
        if not recipient:
            continue
        try:
            status[key] = "sent" if _send_order_email(order, recipient, admin_notice=is_admin) else "not_configured"
        except (OSError, smtplib.SMTPException, ValueError):
            status[key] = "failed"
    try:
        status["sms"] = "sent" if _send_order_sms(order) else "not_configured"
    except (OSError, urllib.error.URLError, ValueError):
        status["sms"] = "failed"

    order["notificationStatus"] = status
    if storage.enabled():
        storage.save_order(order)
    else:
        with DATA_LOCK:
            ORDERS[order_id] = order
            write_data("orders.json", ORDERS)


class LocationUpdate(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    rider: str = Field(default="Courier rider", max_length=100)
    phone: str = Field(default="", max_length=20)


class CustomerDestinationUpdate(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    phone: str = Field(min_length=8, max_length=20)


class TransferRequest(BaseModel):
    new_admin_email: str = Field(min_length=3, max_length=254)


class AssignRiderRequest(BaseModel):
    rider_id: str = Field(min_length=1, max_length=64)


class PasskeyRegistrationVerify(BaseModel):
    challenge_token: str
    credential: dict[str, Any]
    label: str = Field(default="This device", min_length=1, max_length=80)


class PasskeyAuthenticationVerify(BaseModel):
    challenge_token: str
    credential: dict[str, Any]


class AdminPasswordUnlock(BaseModel):
    password: str = Field(min_length=1, max_length=128)


class StoreProfileUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    title: str = Field(max_length=140)
    bio: str = Field(max_length=1200)
    avatar: str = Field(min_length=1, max_length=1_000_000)


class StoreContactUpdate(BaseModel):
    phone: str = Field(min_length=8, max_length=32)
    whatsapp: str = Field(min_length=8, max_length=32)
    email: str = Field(default="", max_length=254)
    location: str = Field(default="", max_length=200)


DEFAULT_STORE_PROFILE = {
    "name": "Rabi",
    "title": "Store Owner & Fashion Designer",
    "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    "bio": "Passionate about bringing affordable, chic, and high-quality fashion trends directly to students across University of Cape Coast campus.",
}

DEFAULT_STORE_CONTACT = {
    "phone": "",
    "whatsapp": "",
    "email": "contact@rabischic.com",
    "location": "University of Cape Coast (UCC), Cape Coast, Ghana",
}


def public_user(user: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in user.items() if key != "password"}


def create_access_token(email: str, admin_unlocked: bool = False) -> str:
    expires = datetime.now(timezone.utc) + (
        timedelta(minutes=ADMIN_UNLOCK_MINUTES) if admin_unlocked else timedelta(days=ACCESS_TOKEN_DAYS)
    )
    payload = {"sub": email, "exp": expires}
    if admin_unlocked:
        payload["admin_unlocked"] = True
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(OAUTH2_SCHEME)) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc
    user = storage.get_user_by_email(email) if storage.enabled() else next((entry for entry in USERS if entry["email"] == email), None)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user


def get_current_admin(
    user: dict[str, Any] = Depends(get_current_user),
    token: str = Depends(OAUTH2_SCHEME),
) -> dict[str, Any]:
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="You need to be an admin or wait for admin's approval")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Admin unlock expired") from exc
    if not payload.get("admin_unlocked"):
        raise HTTPException(status_code=403, detail="Unlock the admin dashboard to continue")
    return user


def get_current_admin_identity(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Administrator account required")
    return user


def _webauthn_context(request: Request) -> tuple[str, str]:
    origin = request.headers.get("origin", "").rstrip("/")
    if origin not in WEBAUTHN_ALLOWED_ORIGINS:
        raise HTTPException(status_code=400, detail="Passkeys are not enabled for this site origin")
    rp_id = urlparse(origin).hostname
    if not rp_id:
        raise HTTPException(status_code=400, detail="Invalid passkey origin")
    return origin, rp_id


def _issue_passkey_challenge(user_id: str, kind: str, origin: str, rp_id: str, challenge: bytes) -> str:
    return jwt.encode({
        "sub": user_id,
        "purpose": f"passkey:{kind}",
        "origin": origin,
        "rp_id": rp_id,
        "challenge": bytes_to_base64url(challenge),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
    }, SECRET_KEY, algorithm=ALGORITHM)


def _verify_passkey_challenge(token: str, user_id: str, kind: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise HTTPException(status_code=400, detail="Passkey challenge expired; try again") from exc
    if payload.get("sub") != user_id or payload.get("purpose") != f"passkey:{kind}":
        raise HTTPException(status_code=400, detail="Invalid passkey challenge")
    return payload


def get_current_operator(
    user: dict[str, Any] = Depends(get_current_user),
    token: str = Depends(OAUTH2_SCHEME),
) -> dict[str, Any]:
    if user["role"] not in {"admin", "rider"}:
        raise HTTPException(status_code=403, detail="A courier account is required to share rider GPS")
    if user["role"] == "admin":
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        except JWTError as exc:
            raise HTTPException(status_code=401, detail="Admin unlock expired") from exc
        if not payload.get("admin_unlocked"):
            raise HTTPException(status_code=403, detail="Unlock the admin dashboard to continue")
    return user


@app.post("/signup")
def signup(request: SignupRequest) -> dict[str, Any]:
    email = request.email.strip().lower()
    user = {
        "id": str(uuid4()),
        "email": email,
        "name": request.name.strip(),
        "password": PASSWORD_CONTEXT.hash(request.password),
        "role": "pending",
    }
    if storage.enabled():
        result = storage.create_user(user, ADMIN_EMAIL)
        if result.get("error") == "exists":
            raise HTTPException(status_code=409, detail="Email already exists")
        user = result
    else:
        with DATA_LOCK:
            if any(existing["email"] == email for existing in USERS):
                raise HTTPException(status_code=409, detail="Email already exists")
            user["role"] = "admin" if ADMIN_EMAIL and email == ADMIN_EMAIL and not any(
                existing["role"] == "admin" for existing in USERS
            ) else "pending"
            USERS.append(user)
            write_data("users.json", USERS)
    return {"message": "Account created", "user": public_user(user)}


@app.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends()) -> dict[str, Any]:
    email = form.username.strip().lower()
    user = storage.get_user_by_email(email) if storage.enabled() else next((entry for entry in USERS if entry["email"] == email), None)
    if user is None or not PASSWORD_CONTEXT.verify(form.password, user["password"]):
        raise HTTPException(status_code=401, detail="Wrong email or password")
    return {
        "access_token": create_access_token(email),
        "admin_access_token": create_access_token(email, admin_unlocked=True) if user["role"] == "admin" else None,
        "token_type": "bearer",
        "user": public_user(user),
    }


def _list_passkeys(user_id: str) -> list[dict[str, Any]]:
    if storage.enabled():
        return storage.list_passkeys(user_id)
    return [
        {key: value for key, value in item.items() if key not in {"publicKey", "signCount", "transports"}}
        for item in PASSKEYS if item["userId"] == user_id
    ]


def _get_passkey(credential_id: str) -> dict[str, Any] | None:
    if storage.enabled():
        return storage.get_passkey(credential_id)
    return next((item for item in PASSKEYS if item["credentialId"] == credential_id), None)


def _store_passkey(passkey: dict[str, Any]) -> None:
    if storage.enabled():
        storage.create_passkey(passkey)
    else:
        PASSKEYS.append(passkey)
        write_data("passkeys.json", PASSKEYS)


def _update_passkey_counter(credential_id: str, sign_count: int, backed_up: bool) -> None:
    if storage.enabled():
        storage.update_passkey_sign_count(credential_id, sign_count, backed_up)
        return
    passkey = _get_passkey(credential_id)
    if passkey:
        passkey["signCount"] = sign_count
        passkey["backedUp"] = backed_up
        write_data("passkeys.json", PASSKEYS)


@app.get("/auth/admin/passkeys/status")
def passkey_status(admin: dict[str, Any] = Depends(get_current_admin_identity)) -> dict[str, Any]:
    return {"passkeys": _list_passkeys(admin["id"])}


@app.post("/auth/admin/unlock/password")
def unlock_admin_with_password(
    payload: AdminPasswordUnlock,
    admin: dict[str, Any] = Depends(get_current_admin_identity),
) -> dict[str, str]:
    if not PASSWORD_CONTEXT.verify(payload.password, admin["password"]):
        raise HTTPException(status_code=401, detail="Password did not match")
    return {"admin_access_token": create_access_token(admin["email"], admin_unlocked=True)}


@app.get("/store-profile")
def get_store_profile() -> dict[str, Any]:
    if storage.enabled():
        return storage.get_store_setting("profile") or DEFAULT_STORE_PROFILE
    return read_data("profile.json", DEFAULT_STORE_PROFILE)


@app.put("/store-profile")
def update_store_profile(
    profile: StoreProfileUpdate,
    _: dict[str, Any] = Depends(get_current_admin),
) -> dict[str, Any]:
    avatar = profile.avatar.strip()
    if not (avatar.startswith("https://") or avatar.startswith("data:image/")):
        raise HTTPException(status_code=422, detail="Choose a secure image URL or upload an image")
    if avatar.startswith("data:image/") and not avatar.startswith(("data:image/webp;base64,", "data:image/jpeg;base64,", "data:image/png;base64,")):
        raise HTTPException(status_code=422, detail="Uploaded profile images must be WebP, JPEG, or PNG")
    updated = {"name": profile.name.strip(), "title": profile.title.strip(), "bio": profile.bio.strip(), "avatar": avatar}
    if storage.enabled():
        storage.set_store_setting("profile", updated)
    else:
        write_data("profile.json", updated)
    return updated


@app.get("/store-contact")
def get_store_contact() -> dict[str, Any]:
    if storage.enabled():
        return storage.get_store_setting("store_contact") or DEFAULT_STORE_CONTACT
    return read_data("store_contact.json", DEFAULT_STORE_CONTACT)


@app.put("/store-contact")
def update_store_contact(
    contact: StoreContactUpdate,
    _: dict[str, Any] = Depends(get_current_admin),
) -> dict[str, Any]:
    updated = {
        "phone": contact.phone.strip(),
        "whatsapp": contact.whatsapp.strip(),
        "email": contact.email.strip(),
        "location": contact.location.strip(),
    }
    for field_name in ("phone", "whatsapp"):
        digits = "".join(character for character in updated[field_name] if character.isdigit())
        if not 8 <= len(digits) <= 15:
            raise HTTPException(status_code=422, detail=f"Enter a valid international {field_name} number")
    if storage.enabled():
        storage.set_store_setting("store_contact", updated)
    else:
        write_data("store_contact.json", updated)
    return updated


@app.post("/auth/admin/passkeys/registration/options")
def passkey_registration_options(
    request: Request,
    admin: dict[str, Any] = Depends(get_current_admin),
) -> dict[str, Any]:
    origin, rp_id = _webauthn_context(request)
    existing = _list_passkeys(admin["id"])
    options = generate_registration_options(
        rp_id=rp_id,
        rp_name="Rabi's Chic Fashion Hub",
        user_id=admin["id"].encode("utf-8"),
        user_name=admin["email"],
        user_display_name=admin["name"],
        authenticator_selection=AuthenticatorSelectionCriteria(
            authenticator_attachment=AuthenticatorAttachment.PLATFORM,
            resident_key=ResidentKeyRequirement.PREFERRED,
            user_verification=UserVerificationRequirement.REQUIRED,
        ),
        exclude_credentials=[PublicKeyCredentialDescriptor(id=base64url_to_bytes(item["id"])) for item in existing],
    )
    return {
        "options": json.loads(options_to_json(options)),
        "challenge_token": _issue_passkey_challenge(admin["id"], "registration", origin, rp_id, options.challenge),
    }


@app.post("/auth/admin/passkeys/registration/verify")
def verify_passkey_registration(
    payload: PasskeyRegistrationVerify,
    admin: dict[str, Any] = Depends(get_current_admin),
) -> dict[str, Any]:
    challenge = _verify_passkey_challenge(payload.challenge_token, admin["id"], "registration")
    try:
        verification = verify_registration_response(
            credential=payload.credential,
            expected_challenge=base64url_to_bytes(challenge["challenge"]),
            expected_origin=challenge["origin"],
            expected_rp_id=challenge["rp_id"],
            require_user_verification=True,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Passkey registration could not be verified") from exc
    credential_id = bytes_to_base64url(verification.credential_id)
    if _get_passkey(credential_id):
        raise HTTPException(status_code=409, detail="This passkey is already registered")
    _store_passkey({
        "credentialId": credential_id,
        "userId": admin["id"],
        "publicKey": bytes_to_base64url(verification.credential_public_key),
        "signCount": verification.sign_count,
        "transports": payload.credential.get("response", {}).get("transports", []),
        "label": payload.label.strip() or "This device",
        "deviceType": verification.credential_device_type.value,
        "backedUp": verification.credential_backed_up,
    })
    return {"message": "Passkey registered", "passkeys": _list_passkeys(admin["id"])}


@app.post("/auth/admin/passkeys/authentication/options")
def passkey_authentication_options(
    request: Request,
    admin: dict[str, Any] = Depends(get_current_admin_identity),
) -> dict[str, Any]:
    origin, rp_id = _webauthn_context(request)
    passkeys = [item for item in PASSKEYS if item["userId"] == admin["id"]] if not storage.enabled() else [
        {**metadata, **(_get_passkey(metadata["id"]) or {})} for metadata in _list_passkeys(admin["id"])
    ]
    if not passkeys:
        raise HTTPException(status_code=404, detail="Set up a passkey first, or unlock with your password")
    options = generate_authentication_options(
        rp_id=rp_id,
        allow_credentials=[PublicKeyCredentialDescriptor(id=base64url_to_bytes(item["credentialId"])) for item in passkeys],
        user_verification=UserVerificationRequirement.REQUIRED,
    )
    return {
        "options": json.loads(options_to_json(options)),
        "challenge_token": _issue_passkey_challenge(admin["id"], "authentication", origin, rp_id, options.challenge),
    }


@app.post("/auth/admin/passkeys/authentication/verify")
def verify_passkey_authentication(
    payload: PasskeyAuthenticationVerify,
    admin: dict[str, Any] = Depends(get_current_admin_identity),
) -> dict[str, str]:
    challenge = _verify_passkey_challenge(payload.challenge_token, admin["id"], "authentication")
    credential_id = payload.credential.get("id", "")
    passkey = _get_passkey(credential_id)
    if not passkey or passkey["userId"] != admin["id"]:
        raise HTTPException(status_code=401, detail="Passkey is not registered for this administrator")
    try:
        verification = verify_authentication_response(
            credential=payload.credential,
            expected_challenge=base64url_to_bytes(challenge["challenge"]),
            expected_origin=challenge["origin"],
            expected_rp_id=challenge["rp_id"],
            credential_public_key=base64url_to_bytes(passkey["publicKey"]),
            credential_current_sign_count=passkey["signCount"],
            require_user_verification=True,
        )
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Device verification failed") from exc
    _update_passkey_counter(credential_id, verification.new_sign_count, verification.credential_backed_up)
    return {"admin_access_token": create_access_token(admin["email"], admin_unlocked=True)}


@app.post("/auth/passkey/login/begin")
def begin_admin_passkey_login(request: Request) -> dict[str, Any]:
    origin, rp_id = _webauthn_context(request)
    options = generate_authentication_options(rp_id=rp_id, user_verification=UserVerificationRequirement.REQUIRED)
    return {
        "options": json.loads(options_to_json(options)),
        "challenge_token": _issue_passkey_challenge("public-admin-passkey-login", "login", origin, rp_id, options.challenge),
    }


@app.post("/auth/passkey/login/finish")
def finish_admin_passkey_login(payload: PasskeyAuthenticationVerify) -> dict[str, Any]:
    challenge = _verify_passkey_challenge(payload.challenge_token, "public-admin-passkey-login", "login")
    credential_id = payload.credential.get("id", "")
    passkey = _get_passkey(credential_id)
    if not passkey:
        raise HTTPException(status_code=401, detail="This passkey is not registered for an administrator")
    admin = storage.get_user_by_id(passkey["userId"]) if storage.enabled() else next((item for item in USERS if item["id"] == passkey["userId"]), None)
    if not admin or admin.get("role") != "admin":
        raise HTTPException(status_code=401, detail="This passkey is not registered for an administrator")
    try:
        verification = verify_authentication_response(
            credential=payload.credential,
            expected_challenge=base64url_to_bytes(challenge["challenge"]),
            expected_origin=challenge["origin"],
            expected_rp_id=challenge["rp_id"],
            credential_public_key=base64url_to_bytes(passkey["publicKey"]),
            credential_current_sign_count=passkey["signCount"],
            require_user_verification=True,
        )
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Device verification failed") from exc
    _update_passkey_counter(credential_id, verification.new_sign_count, verification.credential_backed_up)
    return {
        "access_token": create_access_token(admin["email"]),
        "admin_access_token": create_access_token(admin["email"], admin_unlocked=True),
        "token_type": "bearer",
        "user": public_user(admin),
    }


@app.get("/me")
def me(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return public_user(user)


@app.get("/products")
def get_products() -> list[dict[str, Any]]:
    products = storage.list_products() if storage.enabled() else PRODUCTS
    content = storage.get_store_setting("site_content") if storage.enabled() else read_data("site_content.json", DEFAULT_SITE_CONTENT)
    overrides = {str(item.get("id")): item for item in (content or {}).get("products", [])}
    return [{**product, **{key: value for key, value in overrides.get(str(product["id"]), {}).items() if key in {"name", "price", "discount", "mainImage"}}} for product in products]


@app.post("/products")
def create_product(product: dict[str, Any], _: dict[str, Any] = Depends(get_current_admin)) -> dict[str, Any]:
    if not product.get("name") or float(product.get("price", 0)) <= 0:
        raise HTTPException(status_code=422, detail="Product name and positive price are required")
    if storage.enabled():
        return storage.create_product(product)
    with DATA_LOCK:
        product["id"] = max((int(item["id"]) for item in PRODUCTS), default=0) + 1
        PRODUCTS.insert(0, product)
        write_data("products.json", PRODUCTS)
    return product


@app.put("/products/{product_id}")
def update_product(
    product_id: int,
    update: PriceUpdate,
    _: dict[str, Any] = Depends(get_current_admin),
) -> dict[str, Any]:
    with DATA_LOCK:
        if storage.enabled():
            product = storage.update_product_price(product_id, update.price)
            if product is None:
                raise HTTPException(status_code=404, detail="Product not found")
            return {"message": "Price updated", "product": product}
        product = next((entry for entry in PRODUCTS if entry["id"] == product_id), None)
        if product is None:
            raise HTTPException(status_code=404, detail="Product not found")
        product["price"] = update.price
        write_data("products.json", PRODUCTS)
    return {"message": "Price updated", "product": product}


@app.get("/users/pending")
def pending_users(_: dict[str, Any] = Depends(get_current_admin)) -> list[dict[str, Any]]:
    users = storage.list_users("pending") if storage.enabled() else [user for user in USERS if user["role"] == "pending"]
    return [public_user(user) for user in users]


@app.post("/users/{user_id}/approve")
def approve_user(user_id: str, _: dict[str, Any] = Depends(get_current_admin)) -> dict[str, str]:
    if storage.enabled():
        if storage.set_user_role(user_id, "customer") is None:
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": "Approved as customer"}
    user = next((entry for entry in USERS if entry["id"] == user_id), None)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user["role"] = "customer"
    write_data("users.json", USERS)
    return {"message": "Approved as customer"}


@app.post("/users/{user_id}/make-admin")
def promote_user(user_id: str, _: dict[str, Any] = Depends(get_current_admin)) -> dict[str, str]:
    if storage.enabled():
        if storage.set_user_role(user_id, "admin") is None:
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": "Now admin"}
    user = next((entry for entry in USERS if entry["id"] == user_id), None)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user["role"] = "admin"
    write_data("users.json", USERS)
    return {"message": "Now admin"}


@app.post("/users/{user_id}/make-rider")
def promote_rider(user_id: str, _: dict[str, Any] = Depends(get_current_admin)) -> dict[str, str]:
    if storage.enabled():
        if storage.set_user_role(user_id, "rider") is None:
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": "Account approved as courier rider"}
    user = next((entry for entry in USERS if entry["id"] == user_id), None)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user["role"] = "rider"
    write_data("users.json", USERS)
    return {"message": "Account approved as courier rider"}


@app.get("/users/riders")
def get_riders(_: dict[str, Any] = Depends(get_current_admin)) -> list[dict[str, Any]]:
    users = storage.list_users("rider") if storage.enabled() else [user for user in USERS if user["role"] == "rider"]
    return [public_user(user) for user in users]


@app.post("/users/transfer-admin")
def transfer_admin(
    request: TransferRequest,
    admin: dict[str, Any] = Depends(get_current_admin),
) -> dict[str, str]:
    email = request.new_admin_email.strip().lower()
    if storage.enabled():
        result = storage.transfer_admin(admin["id"], email)
        if result == "missing":
            raise HTTPException(status_code=404, detail="Client must sign up before admin transfer")
        if result == "self":
            raise HTTPException(status_code=400, detail="Choose another account for admin transfer")
        if result == "missing_current":
            raise HTTPException(status_code=401, detail="Current admin account no longer exists")
        return {"message": f"Admin transferred to {email}. Please log in again."}
    successor = next((entry for entry in USERS if entry["email"] == email), None)
    if successor is None:
        raise HTTPException(status_code=404, detail="Client must sign up before admin transfer")
    if successor["id"] == admin["id"]:
        raise HTTPException(status_code=400, detail="Choose another account for admin transfer")
    with DATA_LOCK:
        admin["role"] = "customer"
        successor["role"] = "admin"
        write_data("users.json", USERS)
    return {"message": f"Admin transferred to {email}. Please log in again."}


@app.post("/contact-messages")
def create_contact_message(request: ContactMessageRequest, background_tasks: BackgroundTasks) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    message_data = {
        "id": f"INQ-{secrets.token_hex(6).upper()}",
        "sender": request.sender.strip(),
        "phone": request.phone.strip(),
        "text": request.text.strip(),
        "time": now.strftime("%H:%M UTC"),
        "createdAt": now.isoformat(),
        "emailStatus": "queued",
    }
    with DATA_LOCK:
        messages = _get_contact_messages()
        messages = [message_data, *messages][:300]
        _save_contact_messages(messages)
    background_tasks.add_task(_deliver_contact_message_email, message_data["id"])
    return message_data


@app.get("/contact-messages")
def list_contact_messages(_: dict[str, Any] = Depends(get_current_admin)) -> list[dict[str, Any]]:
    return _get_contact_messages()


@app.post("/orders")
def create_order(request: OrderRequest, background_tasks: BackgroundTasks) -> dict[str, Any]:
    product = storage.get_product(request.productId) if storage.enabled() else next((entry for entry in PRODUCTS if entry["id"] == request.productId), None)
    if product is None:
        raise HTTPException(status_code=422, detail="Choose an available catalog item")
    delivery_fees = {"standard": 30, "express": 60, "outside": 80}
    unit_price = round(float(product["price"]) * (100 - float(product.get("discount", 0))) / 100, 2)
    subtotal = round(unit_price * request.quantity, 2)
    delivery_fee = delivery_fees[request.deliveryOption]
    total = round(subtotal + delivery_fee, 2)
    order_id = f"RABI-{secrets.token_hex(16).upper()}"
    order = {
        **request.model_dump(),
        "amount": total,
        "invoice": {
            "unitPrice": unit_price,
            "subtotal": subtotal,
            "deliveryFee": delivery_fee,
            "total": total,
        },
        "id": order_id,
        "status": "Submitted - Pending Admin Approval",
        "progress": 0,
        "eta": "Awaiting Approval",
        "riderUserId": None,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "notificationStatus": {"adminEmail": "queued", "customerEmail": "queued", "sms": "queued"},
        "destinationShared": False,
    }
    with DATA_LOCK:
        if storage.enabled():
            storage.create_order(order)
        else:
            ORDERS[order_id] = order
            write_data("orders.json", ORDERS)
    background_tasks.add_task(_deliver_order_notifications, order_id, request.email.strip().lower())
    return order


@app.get("/orders")
def get_orders(user: dict[str, Any] = Depends(get_current_operator)) -> list[dict[str, Any]]:
    if storage.enabled():
        return storage.list_orders(user["role"], user["id"])
    orders = list(ORDERS.values())
    if user["role"] == "rider":
        return [order for order in orders if order.get("riderUserId") == user["id"]]
    return orders


@app.post("/orders/{order_id}/assign-rider")
def assign_rider(
    order_id: str,
    assignment: AssignRiderRequest,
    _: dict[str, Any] = Depends(get_current_admin),
) -> dict[str, Any]:
    order = storage.get_order(order_id) if storage.enabled() else ORDERS.get(order_id)
    rider = storage.get_user_by_id(assignment.rider_id) if storage.enabled() else next((user for user in USERS if user["id"] == assignment.rider_id and user["role"] == "rider"), None)
    if rider and rider["role"] != "rider":
        rider = None
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    if rider is None:
        raise HTTPException(status_code=404, detail="Courier account not found")
    if storage.enabled():
        order = storage.assign_order_rider(order_id, rider)
    else:
        order["riderUserId"] = rider["id"]
        order["rider"] = rider["name"]
        write_data("orders.json", ORDERS)
    return order


@app.get("/orders/{order_id}")
def get_order(order_id: str, phone: str) -> dict[str, Any]:
    order = storage.get_order(order_id) if storage.enabled() else ORDERS.get(order_id)
    if order is None or order["phone"] != phone:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@app.post("/orders/{order_id}/approve")
def approve_order(
    order_id: str,
    _: dict[str, Any] = Depends(get_current_admin),
) -> dict[str, Any]:
    order = storage.get_order(order_id) if storage.enabled() else ORDERS.get(order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    order.update(status="In Transit", progress=0, eta="Waiting for rider GPS")
    if storage.enabled():
        storage.save_order(order)
    else:
        write_data("orders.json", ORDERS)
    return order


@app.post("/orders/{order_id}/location")
async def update_rider_location(
    order_id: str,
    location: LocationUpdate,
    operator: dict[str, Any] = Depends(get_current_operator),
) -> dict[str, Any]:
    order = storage.get_order(order_id) if storage.enabled() else ORDERS.get(order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    if operator["role"] == "rider" and order.get("riderUserId") != operator["id"]:
        raise HTTPException(status_code=403, detail="This delivery is not assigned to your courier account")
    destination_lat = float(order.get("destinationLat", DEFAULT_DESTINATION_COORDS[0]))
    destination_lng = float(order.get("destinationLng", DEFAULT_DESTINATION_COORDS[1]))
    metrics = _order_delivery_metrics(location.lat, location.lng, order)
    delivered = metrics["status"] == "Delivered"
    point = {
        **location.model_dump(),
        "order_id": order_id,
        **metrics,
        "progress": 100 if delivered else metrics["progress"],
        "eta": "Arriving now" if delivered else metrics["eta"],
        "status": "Delivered" if delivered else metrics["status"],
        "destinationLat": destination_lat,
        "destinationLng": destination_lng,
        "destinationShared": bool(order.get("destinationShared")),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if storage.enabled():
        storage.save_location(order_id, point)
    else:
        RIDER_LOCATIONS[order_id] = point
    live_locations[order_id] = point
    order.update(status=point["status"], progress=point["progress"], eta=point["eta"])
    if storage.enabled():
        storage.save_order(order)
    else:
        ORDERS[order_id] = order
        write_data("orders.json", ORDERS)
    for socket in list(CONNECTED_TRACKERS.get(order_id, set())):
        try:
            await socket.send_json({**point, "customer": order["customer"], "hostel": order["hostel"], "room": order["room"]})
        except WebSocketDisconnect:
            CONNECTED_TRACKERS[order_id].discard(socket)
    return point


@app.post("/orders/{order_id}/destination")
async def update_customer_destination(order_id: str, location: CustomerDestinationUpdate) -> dict[str, Any]:
    order = storage.get_order(order_id) if storage.enabled() else ORDERS.get(order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    supplied_phone = "".join(character for character in location.phone if character.isdigit())
    order_phone = "".join(character for character in str(order.get("phone", "")) if character.isdigit())
    if not supplied_phone or supplied_phone != order_phone:
        raise HTTPException(status_code=403, detail="Confirm the phone number used for this order")

    was_destination_shared = bool(order.get("destinationShared"))
    order.update(destinationLat=location.lat, destinationLng=location.lng, destinationShared=True)
    point = storage.get_location(order_id) if storage.enabled() else RIDER_LOCATIONS.get(order_id)
    if not point:
        point = live_locations.get(order_id)
    response = {"destinationLat": location.lat, "destinationLng": location.lng, "destinationShared": True}
    if point and isinstance(point.get("lat"), (int, float)) and isinstance(point.get("lng"), (int, float)):
        metrics = _delivery_metrics(float(point["lat"]), float(point["lng"]), location.lat, location.lng)
        delivered = metrics["status"] == "Delivered" or (was_destination_shared and order.get("status") == "Delivered")
        point = {
            **point,
            **metrics,
            "progress": 100 if delivered else metrics["progress"],
            "eta": "Arriving now" if delivered else metrics["eta"],
            "status": "Delivered" if delivered else metrics["status"],
            "destinationLat": location.lat,
            "destinationLng": location.lng,
            "destinationShared": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if storage.enabled():
            storage.save_location(order_id, point)
        else:
            RIDER_LOCATIONS[order_id] = point
        live_locations[order_id] = point
        if delivered or order.get("status") != "Delivered" or not was_destination_shared:
            order.update(status=point["status"], progress=point["progress"], eta=point["eta"])
        response.update({key: point[key] for key in ("progress", "eta", "status", "distanceKm")})
        for socket in list(CONNECTED_TRACKERS.get(order_id, set())):
            try:
                await socket.send_json({**point, "customer": order["customer"], "hostel": order["hostel"], "room": order["room"]})
            except WebSocketDisconnect:
                CONNECTED_TRACKERS[order_id].discard(socket)
    if storage.enabled():
        storage.save_order(order)
    else:
        ORDERS[order_id] = order
        write_data("orders.json", ORDERS)
    return response


# ── Live-location convenience endpoint (simple in-memory, Vercel-compatible) ──
@app.post("/orders/{order_id}/update-location")
def simple_update_location(
    order_id: str,
    location: LocationUpdate,
) -> dict[str, Any]:
    """Rider app posts lat/lng here; polling customers read it back."""
    order = storage.get_order(order_id) if storage.enabled() else ORDERS.get(order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    destination_lat = float(order.get("destinationLat", DEFAULT_DESTINATION_COORDS[0]))
    destination_lng = float(order.get("destinationLng", DEFAULT_DESTINATION_COORDS[1]))
    metrics = _order_delivery_metrics(location.lat, location.lng, order)
    delivered = metrics["status"] == "Delivered"
    point = {
        "order_id": order_id,
        "lat": location.lat,
        "lng": location.lng,
        "rider": location.rider,
        "phone": location.phone,
        **metrics,
        "progress": 100 if delivered else metrics["progress"],
        "eta": "Arriving now" if delivered else metrics["eta"],
        "status": "Delivered" if delivered else metrics["status"],
        "destinationLat": destination_lat,
        "destinationLng": destination_lng,
        "destinationShared": bool(order.get("destinationShared")),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
    live_locations[order_id] = point
    if storage.enabled():
        storage.save_location(order_id, point)
    order.update(status=point["status"], progress=point["progress"], eta=point["eta"])
    if storage.enabled():
        storage.save_order(order)
    else:
        ORDERS[order_id] = order
        write_data("orders.json", ORDERS)
    return point


@app.get("/orders/{order_id}/live-location")
def live_location(order_id: str) -> dict[str, Any]:
    order = storage.get_order(order_id) if storage.enabled() else ORDERS.get(order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    # Prefer in-memory live_locations, fall back to RIDER_LOCATIONS / storage
    point = live_locations.get(order_id) or (
        storage.get_location(order_id) if storage.enabled() else RIDER_LOCATIONS.get(order_id)
    )
    if point:
        return {
            **point,
            "destinationLat": order.get("destinationLat", DEFAULT_DESTINATION_COORDS[0]),
            "destinationLng": order.get("destinationLng", DEFAULT_DESTINATION_COORDS[1]),
            "destinationShared": bool(order.get("destinationShared")),
        }
    return {
        "status": order.get("status", "Waiting for rider GPS"),
        "progress": order.get("progress", 0),
        "eta": order.get("eta", "Awaiting GPS"),
        "destinationLat": order.get("destinationLat", DEFAULT_DESTINATION_COORDS[0]),
        "destinationLng": order.get("destinationLng", DEFAULT_DESTINATION_COORDS[1]),
        "destinationShared": bool(order.get("destinationShared")),
        "order_id": order_id,
    }


# ── Site content endpoints ────────────────────────────────────────────────────
@app.get("/site-content/homepage")
def get_site_content() -> dict[str, Any]:
    if storage.enabled():
        return storage.get_store_setting("site_content") or DEFAULT_SITE_CONTENT
    return read_data("site_content.json", DEFAULT_SITE_CONTENT)


@app.put("/site-content/homepage")
def update_site_content(
    content: dict[str, Any],
    _: dict[str, Any] = Depends(get_current_admin),
) -> dict[str, Any]:
    product_overrides = content.get("products", [])
    if not isinstance(product_overrides, list) or len(product_overrides) > 500:
        raise HTTPException(status_code=422, detail="Product edits must be a list of at most 500 items")
    for item in product_overrides:
        if not isinstance(item, dict) or not item.get("id") or not str(item.get("name", "")).strip():
            raise HTTPException(status_code=422, detail="Each product edit needs an id and name")
        if float(item.get("price", 0)) <= 0 or float(item.get("discount", 0)) < 0 or float(item.get("discount", 0)) > 100:
            raise HTTPException(status_code=422, detail="Price must be positive and discount must be between 0 and 100")
    featured_ids = (content.get("featured") or {}).get("productIds", [])
    if not isinstance(featured_ids, list) or len(featured_ids) > 6:
        raise HTTPException(status_code=422, detail="Choose no more than six featured products")
    if storage.enabled():
        storage.set_store_setting("site_content", content)
    else:
        write_data("site_content.json", content)
    return content


@app.websocket("/ws/track/{order_id}")
async def websocket_track(websocket: WebSocket, order_id: str) -> None:
    order = storage.get_order(order_id) if storage.enabled() else ORDERS.get(order_id)
    if order is None:
        await websocket.close(code=1008)
        return
    await websocket.accept()
    CONNECTED_TRACKERS.setdefault(order_id, set()).add(websocket)
    try:
        while True:
            order = storage.get_order(order_id) if storage.enabled() else ORDERS.get(order_id)
            point = storage.get_location(order_id) if storage.enabled() else RIDER_LOCATIONS.get(order_id)
            await websocket.send_json({
                **(point or {}),
                "order_id": order_id,
                "status": (point or {}).get("status", (order or {}).get("status")),
                "progress": (point or {}).get("progress", (order or {}).get("progress", 0)),
                "eta": (point or {}).get("eta", (order or {}).get("eta")),
                "hostel": (order or {}).get("hostel"),
                "room": (order or {}).get("room"),
                "destinationLat": (order or {}).get("destinationLat", DEFAULT_DESTINATION_COORDS[0]),
                "destinationLng": (order or {}).get("destinationLng", DEFAULT_DESTINATION_COORDS[1]),
                "destinationShared": bool((order or {}).get("destinationShared")),
            })
            await asyncio.sleep(3)
    except WebSocketDisconnect:
        pass
    finally:
        CONNECTED_TRACKERS.get(order_id, set()).discard(websocket)
