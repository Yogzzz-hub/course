"""Command-line tools for operators. Run from the backend folder:

    python -m app.cli create-super-admin --name "Name" --email you@example.com
"""
import argparse
import getpass
import sys

from sqlalchemy import select

from .db import SessionLocal, init_db
from .models import User, UserRole
from .security import hash_password


def create_super_admin(name: str, email: str) -> int:
    init_db()
    email = email.strip().lower()
    password = getpass.getpass("Choose a password (10+ characters): ")
    if len(password) < 10 or getpass.getpass("Repeat the password: ") != password:
        print("Passwords must match and be at least 10 characters.", file=sys.stderr)
        return 1
    with SessionLocal() as db:
        if db.scalar(select(User.id).where(User.email == email)) is not None:
            print("An account with this email already exists. Use the super admin panel to grant the role.", file=sys.stderr)
            return 1
        user = User(name=name.strip(), email=email, phone="", password_hash=hash_password(password))
        db.add(user)
        db.flush()
        db.add(UserRole(user_id=user.id, role="super_admin"))
        db.commit()
    print(f"Super admin created for {email}.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(prog="app.cli")
    sub = parser.add_subparsers(dest="command", required=True)
    cmd = sub.add_parser("create-super-admin", help="Create the first super admin account.")
    cmd.add_argument("--name", required=True)
    cmd.add_argument("--email", required=True)
    args = parser.parse_args()
    if args.command == "create-super-admin":
        return create_super_admin(args.name, args.email)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
