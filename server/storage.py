from __future__ import annotations

import os
from threading import Lock
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
_SCHEMA_LOCK = Lock()
_SCHEMA_READY = False


def enabled() -> bool:
    return bool(DATABASE_URL)


def _connect():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL must be configured for persistent storage")
    import psycopg

    connection = psycopg.connect(DATABASE_URL, connect_timeout=5)
    global _SCHEMA_READY
    if not _SCHEMA_READY:
        with _SCHEMA_LOCK:
            if not _SCHEMA_READY:
                with connection.cursor() as cursor:
                    cursor.execute("""
                        CREATE TABLE IF NOT EXISTS app_users (
                            id text PRIMARY KEY,
                            email text NOT NULL UNIQUE,
                            role text NOT NULL,
                            payload jsonb NOT NULL
                        );
                        CREATE INDEX IF NOT EXISTS app_users_role_idx ON app_users (role);
                        CREATE TABLE IF NOT EXISTS products (
                            product_id bigint PRIMARY KEY,
                            payload jsonb NOT NULL
                        );
                        CREATE TABLE IF NOT EXISTS orders (
                            order_id text PRIMARY KEY,
                            rider_user_id text,
                            payload jsonb NOT NULL
                        );
                        CREATE INDEX IF NOT EXISTS orders_rider_idx ON orders (rider_user_id);
                        CREATE TABLE IF NOT EXISTS rider_locations (
                            order_id text PRIMARY KEY REFERENCES orders(order_id) ON DELETE CASCADE,
                            payload jsonb NOT NULL,
                            updated_at timestamptz NOT NULL DEFAULT now()
                        );
                        CREATE TABLE IF NOT EXISTS admin_passkeys (
                            credential_id text PRIMARY KEY,
                            user_id text NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
                            public_key text NOT NULL,
                            sign_count bigint NOT NULL DEFAULT 0,
                            transports jsonb NOT NULL DEFAULT '[]'::jsonb,
                            label text NOT NULL,
                            device_type text NOT NULL,
                            backed_up boolean NOT NULL DEFAULT false,
                            created_at timestamptz NOT NULL DEFAULT now()
                        );
                        CREATE INDEX IF NOT EXISTS admin_passkeys_user_idx ON admin_passkeys (user_id);
                        CREATE TABLE IF NOT EXISTS store_settings (
                            setting_key text PRIMARY KEY,
                            payload jsonb NOT NULL,
                            updated_at timestamptz NOT NULL DEFAULT now()
                        );
                        CREATE TABLE IF NOT EXISTS admin_sessions (
                            session_slot integer PRIMARY KEY CHECK (session_slot = 1),
                            payload jsonb NOT NULL
                        );
                    """)
                    cursor.execute("INSERT INTO admin_sessions (session_slot, payload) VALUES (1, '{}'::jsonb) ON CONFLICT (session_slot) DO NOTHING")
                    cursor.execute("SELECT count(*) FROM products")
                    if cursor.fetchone()[0] == 0:
                        from psycopg.types.json import Jsonb
                        from .main import DEFAULT_PRODUCTS

                        cursor.executemany(
                            "INSERT INTO products (product_id, payload) VALUES (%s, %s)",
                            [(int(product["id"]), Jsonb(product)) for product in DEFAULT_PRODUCTS],
                        )
                connection.commit()
                _SCHEMA_READY = True
    return connection


def _json(value: Any):
    from psycopg.types.json import Jsonb

    return Jsonb(value)


def get_user_by_email(email: str) -> dict[str, Any] | None:
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute("SELECT payload FROM app_users WHERE email = %s", (email,))
        row = cursor.fetchone()
        return row[0] if row else None


def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute("SELECT payload FROM app_users WHERE id = %s", (user_id,))
        row = cursor.fetchone()
        return row[0] if row else None


def list_users(role: str | None = None) -> list[dict[str, Any]]:
    with _connect() as connection, connection.cursor() as cursor:
        if role:
            cursor.execute("SELECT payload FROM app_users WHERE role = %s ORDER BY email", (role,))
        else:
            cursor.execute("SELECT payload FROM app_users ORDER BY email")
        return [row[0] for row in cursor.fetchall()]


def create_user(user: dict[str, Any], configured_admin_email: str) -> dict[str, Any]:
    from psycopg.types.json import Jsonb

    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute("SELECT pg_advisory_xact_lock(741205190)")
        cursor.execute("SELECT EXISTS (SELECT 1 FROM app_users WHERE email = %s)", (user["email"],))
        if cursor.fetchone()[0]:
            return {"error": "exists"}
        cursor.execute("SELECT EXISTS (SELECT 1 FROM app_users WHERE role = 'admin')")
        user["role"] = "admin" if configured_admin_email == user["email"] and not cursor.fetchone()[0] else "pending"
        cursor.execute(
            "INSERT INTO app_users (id, email, role, payload) VALUES (%s, %s, %s, %s)",
            (user["id"], user["email"], user["role"], Jsonb(user)),
        )
    return user


def set_user_role(user_id: str, role: str) -> dict[str, Any] | None:
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute("SELECT payload FROM app_users WHERE id = %s FOR UPDATE", (user_id,))
        row = cursor.fetchone()
        if not row:
            return None
        user = row[0]
        user["role"] = role
        cursor.execute("UPDATE app_users SET role = %s, payload = %s WHERE id = %s", (role, _json(user), user_id))
        return user


def transfer_admin(current_admin_id: str, new_admin_email: str) -> str:
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute("SELECT pg_advisory_xact_lock(741205190)")
        cursor.execute("SELECT id, payload FROM app_users WHERE email = %s FOR UPDATE", (new_admin_email,))
        row = cursor.fetchone()
        if not row:
            return "missing"
        new_admin_id, successor = row
        if new_admin_id == current_admin_id:
            return "self"
        cursor.execute("SELECT payload FROM app_users WHERE id = %s FOR UPDATE", (current_admin_id,))
        current_row = cursor.fetchone()
        if not current_row:
            return "missing_current"
        current_admin = current_row[0]
        current_admin["role"] = "customer"
        successor["role"] = "admin"
        cursor.execute("UPDATE app_users SET role = 'customer', payload = %s WHERE id = %s", (_json(current_admin), current_admin_id))
        cursor.execute("UPDATE app_users SET role = 'admin', payload = %s WHERE id = %s", (_json(successor), new_admin_id))
    return "ok"


def list_products() -> list[dict[str, Any]]:
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute("SELECT payload FROM products ORDER BY product_id")
        return [row[0] for row in cursor.fetchall()]


def get_product(product_id: int) -> dict[str, Any] | None:
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute("SELECT payload FROM products WHERE product_id = %s", (product_id,))
        row = cursor.fetchone()
        return row[0] if row else None


def create_product(product: dict[str, Any]) -> dict[str, Any]:
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute("LOCK TABLE products IN EXCLUSIVE MODE")
        cursor.execute("SELECT COALESCE(MAX(product_id), 0) + 1 FROM products")
        product["id"] = cursor.fetchone()[0]
        cursor.execute("INSERT INTO products (product_id, payload) VALUES (%s, %s)", (product["id"], _json(product)))
    return product


def update_product_price(product_id: int, price: float) -> dict[str, Any] | None:
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute("SELECT payload FROM products WHERE product_id = %s FOR UPDATE", (product_id,))
        row = cursor.fetchone()
        if not row:
            return None
        product = row[0]
        product["price"] = price
        cursor.execute("UPDATE products SET payload = %s WHERE product_id = %s", (_json(product), product_id))
        return product


def save_product(product: dict[str, Any]) -> dict[str, Any]:
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute("UPDATE products SET payload = %s WHERE product_id = %s", (_json(product), int(product["id"])))
    return product


def delete_product(product_id: int) -> bool:
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute("DELETE FROM products WHERE product_id = %s", (product_id,))
        return cursor.rowcount > 0


def create_order(order: dict[str, Any]) -> None:
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute(
            "INSERT INTO orders (order_id, rider_user_id, payload) VALUES (%s, %s, %s)",
            (order["id"], order.get("riderUserId"), _json(order)),
        )


def get_order(order_id: str) -> dict[str, Any] | None:
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute("SELECT payload FROM orders WHERE order_id = %s", (order_id,))
        row = cursor.fetchone()
        return row[0] if row else None


def get_order_by_tracking_code(tracking_code: str) -> dict[str, Any] | None:
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute("SELECT payload FROM orders WHERE payload->>'trackingCode' = %s", (tracking_code,))
        row = cursor.fetchone()
        return row[0] if row else None


def list_orders(role: str, user_id: str) -> list[dict[str, Any]]:
    with _connect() as connection, connection.cursor() as cursor:
        if role == "rider":
            cursor.execute("SELECT payload FROM orders WHERE rider_user_id = %s ORDER BY order_id DESC", (user_id,))
        else:
            cursor.execute("SELECT payload FROM orders ORDER BY order_id DESC")
        return [row[0] for row in cursor.fetchall()]


def save_order(order: dict[str, Any]) -> None:
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute(
            "UPDATE orders SET rider_user_id = %s, payload = %s WHERE order_id = %s",
            (order.get("riderUserId"), _json(order), order["id"]),
        )


def assign_order_rider(order_id: str, rider: dict[str, Any]) -> dict[str, Any] | None:
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute("SELECT payload FROM orders WHERE order_id = %s FOR UPDATE", (order_id,))
        row = cursor.fetchone()
        if not row:
            return None
        order = row[0]
        order["riderUserId"] = rider["id"]
        order["rider"] = rider["name"]
        cursor.execute("UPDATE orders SET rider_user_id = %s, payload = %s WHERE order_id = %s", (rider["id"], _json(order), order_id))
        return order


def save_location(order_id: str, point: dict[str, Any]) -> None:
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute("""
            INSERT INTO rider_locations (order_id, payload, updated_at)
            VALUES (%s, %s, now())
            ON CONFLICT (order_id) DO UPDATE
            SET payload = EXCLUDED.payload, updated_at = now()
        """, (order_id, _json(point)))


def get_location(order_id: str) -> dict[str, Any] | None:
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute("SELECT payload FROM rider_locations WHERE order_id = %s", (order_id,))
        row = cursor.fetchone()
        return row[0] if row else None


def list_passkeys(user_id: str) -> list[dict[str, Any]]:
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute(
            "SELECT credential_id, label, device_type, backed_up, created_at FROM admin_passkeys WHERE user_id = %s ORDER BY created_at",
            (user_id,),
        )
        return [
            {"id": row[0], "label": row[1], "deviceType": row[2], "backedUp": row[3], "createdAt": row[4].isoformat()}
            for row in cursor.fetchall()
        ]


def get_passkey(credential_id: str) -> dict[str, Any] | None:
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute(
            "SELECT credential_id, user_id, public_key, sign_count, transports, label, device_type, backed_up FROM admin_passkeys WHERE credential_id = %s",
            (credential_id,),
        )
        row = cursor.fetchone()
        if not row:
            return None
        return {"credentialId": row[0], "userId": row[1], "publicKey": row[2], "signCount": row[3], "transports": row[4], "label": row[5], "deviceType": row[6], "backedUp": row[7]}


def create_passkey(passkey: dict[str, Any]) -> None:
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute(
            "INSERT INTO admin_passkeys (credential_id, user_id, public_key, sign_count, transports, label, device_type, backed_up) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
            (passkey["credentialId"], passkey["userId"], passkey["publicKey"], passkey["signCount"], _json(passkey["transports"]), passkey["label"], passkey["deviceType"], passkey["backedUp"]),
        )


def update_passkey_sign_count(credential_id: str, sign_count: int, backed_up: bool) -> None:
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute(
            "UPDATE admin_passkeys SET sign_count = %s, backed_up = %s WHERE credential_id = %s",
            (sign_count, backed_up, credential_id),
        )


def get_store_setting(key: str) -> Any | None:
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute("SELECT payload FROM store_settings WHERE setting_key = %s", (key,))
        row = cursor.fetchone()
        return row[0] if row else None


def set_store_setting(key: str, value: Any) -> None:
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO store_settings (setting_key, payload, updated_at)
            VALUES (%s, %s, now())
            ON CONFLICT (setting_key) DO UPDATE
            SET payload = EXCLUDED.payload, updated_at = now()
            """,
            (key, _json(value)),
        )


def get_admin_session() -> dict[str, Any]:
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute("SELECT payload FROM admin_sessions WHERE session_slot = 1")
        row = cursor.fetchone()
        return row[0] if row else {}


def claim_admin_session(session: dict[str, Any], now_iso: str) -> tuple[bool, dict[str, Any]]:
    """Atomically claim the single admin device slot, serializing concurrent logins."""
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute("SELECT payload FROM admin_sessions WHERE session_slot = 1 FOR UPDATE")
        row = cursor.fetchone()
        current = row[0] if row else {}
        active_expiry = current.get("expiresAt")
        if current.get("isActive") and (not active_expiry or active_expiry > now_iso) and current.get("deviceFingerprint") != session.get("deviceFingerprint"):
            return False, current
        cursor.execute("UPDATE admin_sessions SET payload = %s WHERE session_slot = 1", (_json(session),))
        return True, session


def set_admin_session(session: dict[str, Any]) -> None:
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute(
            "INSERT INTO admin_sessions (session_slot, payload) VALUES (1, %s) ON CONFLICT (session_slot) DO UPDATE SET payload = EXCLUDED.payload",
            (_json(session),),
        )


def complete_admin_handover(session: dict[str, Any], user_id: str) -> None:
    with _connect() as connection, connection.cursor() as cursor:
        cursor.execute("UPDATE admin_sessions SET payload = %s WHERE session_slot = 1", (_json(session),))
        cursor.execute("DELETE FROM admin_passkeys WHERE user_id = %s", (user_id,))
