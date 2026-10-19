from __future__ import annotations

import asyncio
import json
import math
import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from threading import RLock
from typing import Any
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from dotenv import load_dotenv


load_dotenv(Path(__file__).parent.parent / ".env")
DATA_DIR = Path(os.getenv("RABI_DATA_DIR", Path(__file__).parent))
DATA_DIR.mkdir(parents=True, exist_ok=True)
SECRET_KEY = os.getenv("RABI_SECRET_KEY") or secrets.token_urlsafe(48)
ADMIN_EMAIL = os.getenv("RABI_ADMIN_EMAIL", "").strip().lower()
ALGORITHM = "HS256"
ACCESS_TOKEN_DAYS = 7
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

app = FastAPI(title="Rabi's Chic Fashion Hub API")
allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "RABI_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
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
    phone: str = Field(min_length=8, max_length=20)
    hostel: str = Field(min_length=1, max_length=100)
    room: str = Field(min_length=1, max_length=100)
    items: str = Field(min_length=1, max_length=300)
    productId: int
    quantity: int = Field(ge=1, le=10)
    deliveryOption: str = Field(pattern="^(standard|express|outside)$")
    paymentMethod: str = Field(default="MTN MoMo", max_length=30)


class LocationUpdate(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    rider: str = Field(default="Courier rider", max_length=100)
    phone: str = Field(default="", max_length=20)


class TransferRequest(BaseModel):
    new_admin_email: str = Field(min_length=3, max_length=254)


class AssignRiderRequest(BaseModel):
    rider_id: str = Field(min_length=1, max_length=64)


def public_user(user: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in user.items() if key != "password"}


def create_access_token(email: str) -> str:
    expires = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_DAYS)
    return jwt.encode({"sub": email, "exp": expires}, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(OAUTH2_SCHEME)) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc
    user = next((entry for entry in USERS if entry["email"] == email), None)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return user


def get_current_admin(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="You need to be an admin or wait for admin's approval")
    return user


def get_current_operator(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    if user["role"] not in {"admin", "rider"}:
        raise HTTPException(status_code=403, detail="A courier account is required to share rider GPS")
    return user


@app.post("/signup")
def signup(request: SignupRequest) -> dict[str, Any]:
    email = request.email.strip().lower()
    with DATA_LOCK:
        if any(user["email"] == email for user in USERS):
            raise HTTPException(status_code=409, detail="Email already exists")
        role = "admin" if ADMIN_EMAIL and email == ADMIN_EMAIL and not any(
            user["role"] == "admin" for user in USERS
        ) else "pending"
        user = {
            "id": str(uuid4()),
            "email": email,
            "name": request.name.strip(),
            "password": PASSWORD_CONTEXT.hash(request.password),
            "role": role,
        }
        USERS.append(user)
        write_data("users.json", USERS)
    return {"message": "Account created", "user": public_user(user)}


@app.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends()) -> dict[str, Any]:
    email = form.username.strip().lower()
    user = next((entry for entry in USERS if entry["email"] == email), None)
    if user is None or not PASSWORD_CONTEXT.verify(form.password, user["password"]):
        raise HTTPException(status_code=401, detail="Wrong email or password")
    return {
        "access_token": create_access_token(email),
        "token_type": "bearer",
        "user": public_user(user),
    }


@app.get("/me")
def me(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return public_user(user)


@app.get("/products")
def get_products() -> list[dict[str, Any]]:
    return PRODUCTS


@app.post("/products")
def create_product(product: dict[str, Any], _: dict[str, Any] = Depends(get_current_admin)) -> dict[str, Any]:
    if not product.get("name") or float(product.get("price", 0)) <= 0:
        raise HTTPException(status_code=422, detail="Product name and positive price are required")
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
        product = next((entry for entry in PRODUCTS if entry["id"] == product_id), None)
        if product is None:
            raise HTTPException(status_code=404, detail="Product not found")
        product["price"] = update.price
        write_data("products.json", PRODUCTS)
    return {"message": "Price updated", "product": product}


@app.get("/users/pending")
def pending_users(_: dict[str, Any] = Depends(get_current_admin)) -> list[dict[str, Any]]:
    return [public_user(user) for user in USERS if user["role"] == "pending"]


@app.post("/users/{user_id}/approve")
def approve_user(user_id: str, _: dict[str, Any] = Depends(get_current_admin)) -> dict[str, str]:
    user = next((entry for entry in USERS if entry["id"] == user_id), None)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user["role"] = "customer"
    write_data("users.json", USERS)
    return {"message": "Approved as customer"}


@app.post("/users/{user_id}/make-admin")
def promote_user(user_id: str, _: dict[str, Any] = Depends(get_current_admin)) -> dict[str, str]:
    user = next((entry for entry in USERS if entry["id"] == user_id), None)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user["role"] = "admin"
    write_data("users.json", USERS)
    return {"message": "Now admin"}


@app.post("/users/{user_id}/make-rider")
def promote_rider(user_id: str, _: dict[str, Any] = Depends(get_current_admin)) -> dict[str, str]:
    user = next((entry for entry in USERS if entry["id"] == user_id), None)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user["role"] = "rider"
    write_data("users.json", USERS)
    return {"message": "Account approved as courier rider"}


@app.get("/users/riders")
def get_riders(_: dict[str, Any] = Depends(get_current_admin)) -> list[dict[str, Any]]:
    return [public_user(user) for user in USERS if user["role"] == "rider"]


@app.post("/users/transfer-admin")
def transfer_admin(
    request: TransferRequest,
    admin: dict[str, Any] = Depends(get_current_admin),
) -> dict[str, str]:
    email = request.new_admin_email.strip().lower()
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


@app.post("/orders")
def create_order(request: OrderRequest) -> dict[str, Any]:
    product = next((entry for entry in PRODUCTS if entry["id"] == request.productId), None)
    if product is None:
        raise HTTPException(status_code=422, detail="Choose an available catalog item")
    delivery_fees = {"standard": 30, "express": 60, "outside": 80}
    total = float(product["price"]) * request.quantity + delivery_fees[request.deliveryOption]
    order_id = f"RABI-{secrets.token_hex(16).upper()}"
    order = {
        **request.model_dump(),
        "amount": total,
        "id": order_id,
        "status": "Submitted - Pending Admin Approval",
        "progress": 0,
        "eta": "Awaiting Approval",
        "riderUserId": None,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    with DATA_LOCK:
        ORDERS[order_id] = order
        write_data("orders.json", ORDERS)
    return order


@app.get("/orders")
def get_orders(user: dict[str, Any] = Depends(get_current_operator)) -> list[dict[str, Any]]:
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
    order = ORDERS.get(order_id)
    rider = next((user for user in USERS if user["id"] == assignment.rider_id and user["role"] == "rider"), None)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    if rider is None:
        raise HTTPException(status_code=404, detail="Courier account not found")
    order["riderUserId"] = rider["id"]
    order["rider"] = rider["name"]
    write_data("orders.json", ORDERS)
    return order


@app.get("/orders/{order_id}")
def get_order(order_id: str, phone: str) -> dict[str, Any]:
    order = ORDERS.get(order_id)
    if order is None or order["phone"] != phone:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@app.post("/orders/{order_id}/approve")
def approve_order(
    order_id: str,
    _: dict[str, Any] = Depends(get_current_admin),
) -> dict[str, Any]:
    order = ORDERS.get(order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    order.update(status="In Transit", progress=0, eta="Waiting for rider GPS")
    write_data("orders.json", ORDERS)
    return order


@app.post("/orders/{order_id}/location")
async def update_rider_location(
    order_id: str,
    location: LocationUpdate,
    operator: dict[str, Any] = Depends(get_current_operator),
) -> dict[str, Any]:
    order = ORDERS.get(order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    if operator["role"] == "rider" and order.get("riderUserId") != operator["id"]:
        raise HTTPException(status_code=403, detail="This delivery is not assigned to your courier account")
    start_lat, start_lng = 5.1036, -1.2825
    end_lat, end_lng = 5.115, -1.288
    route_lat = end_lat - start_lat
    route_lng = end_lng - start_lng
    route_length_squared = route_lat**2 + route_lng**2
    progress = max(0.0, min(1.0, ((location.lat - start_lat) * route_lat + (location.lng - start_lng) * route_lng) / route_length_squared))
    radians = math.pi / 180
    delta_lat = (end_lat - location.lat) * radians
    delta_lng = (end_lng - location.lng) * radians
    distance = 6371 * 2 * math.asin(math.sqrt(
        math.sin(delta_lat / 2) ** 2
        + math.cos(location.lat * radians) * math.cos(end_lat * radians) * math.sin(delta_lng / 2) ** 2
    ))
    delivered = distance <= 0.05
    point = {
        **location.model_dump(),
        "order_id": order_id,
        "progress": 100 if delivered else int(progress * 100),
        "eta": "Arriving now" if delivered else f"{max(1, math.ceil(distance / 20 * 60))} mins",
        "status": "Delivered" if delivered else "On The Way",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    RIDER_LOCATIONS[order_id] = point
    order.update(status=point["status"], progress=point["progress"], eta=point["eta"])
    write_data("orders.json", ORDERS)
    for socket in list(CONNECTED_TRACKERS.get(order_id, set())):
        try:
            await socket.send_json({**point, "customer": order["customer"], "hostel": order["hostel"], "room": order["room"]})
        except WebSocketDisconnect:
            CONNECTED_TRACKERS[order_id].discard(socket)
    return point


@app.get("/orders/{order_id}/live-location")
def live_location(order_id: str) -> dict[str, Any]:
    if order_id not in ORDERS:
        raise HTTPException(status_code=404, detail="Order not found")
    return RIDER_LOCATIONS.get(order_id, {"status": "Waiting for rider GPS", "order_id": order_id})


@app.websocket("/ws/track/{order_id}")
async def websocket_track(websocket: WebSocket, order_id: str) -> None:
    if order_id not in ORDERS:
        await websocket.close(code=1008)
        return
    await websocket.accept()
    CONNECTED_TRACKERS.setdefault(order_id, set()).add(websocket)
    try:
        while True:
            order = ORDERS.get(order_id)
            point = RIDER_LOCATIONS.get(order_id)
            await websocket.send_json({
                **(point or {}),
                "order_id": order_id,
                "status": (point or {}).get("status", (order or {}).get("status")),
                "progress": (point or {}).get("progress", (order or {}).get("progress", 0)),
                "eta": (point or {}).get("eta", (order or {}).get("eta")),
                "hostel": (order or {}).get("hostel"),
                "room": (order or {}).get("room"),
            })
            await asyncio.sleep(3)
    except WebSocketDisconnect:
        pass
    finally:
        CONNECTED_TRACKERS.get(order_id, set()).discard(websocket)