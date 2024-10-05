from flask import Blueprint, render_template, request, url_for, flash, redirect
from flask_login import current_user, login_required, login_user, logout_user
from werkzeug.security import generate_password_hash, check_password_hash

from .models import Admin
from .utils import superadmin_required
from . import db

auth = Blueprint("auth", __name__, url_prefix="/auth")


@auth.route("/admin/super/signup/", methods=["GET", "POST"])
def super_admin_signup():
    any_admin = Admin.query.all()
    if any_admin:
        return render_template("auth/superadmin_409.html")

    if request.method == "POST":
        admin_name = request.form["adminName"]
        admin_department = request.form["adminDepartment"]
        admin_email = request.form["adminEmail"]
        admin_password1 = request.form["adminPassword1"]
        admin_password2 = request.form["adminPassword2"]

        # Check if passwords match
        if admin_password1 != admin_password2:
            flash("Passwords do not match", "danger")
            return redirect(url_for("signup"))

        # Hash the password
        hashed_password = generate_password_hash(admin_password1)

        # Save the new Admin
        new_admin = Admin(
            fullname=admin_name,
            department=admin_department,
            email=admin_email,
            password=hashed_password,
            is_super=True,
            is_allowed=True,
        )

        db.session.add(new_admin)
        db.session.commit()
        flash("Super Admin created successfully!", "success")

        login_user(new_admin, remember=True)

        return redirect(url_for("views.admin_home"))

    return render_template("auth/superadmin_signup.html")


@auth.route("/admin/signup/", methods=["GET", "POST"])
@superadmin_required
def admin_signup():
    admins = Admin.query.all()
    if len(admins) >= 10:
        return render_template("auth/admins_full.html")

    if request.method == "POST":
        admin_name = request.form["adminName"]
        admin_department = request.form["adminDepartment"]
        admin_email = request.form["adminEmail"]
        admin_password1 = request.form["adminPassword1"]
        admin_password2 = request.form["adminPassword2"]

        # Check if passwords match
        if admin_password1 != admin_password2:
            flash("Passwords do not match", "danger")
            return redirect(url_for("signup"))

        # Hash the password
        hashed_password = generate_password_hash(admin_password1)

        # Save the new Admin
        new_admin = Admin(
            fullname=admin_name,
            department=admin_department,
            email=admin_email,
            password=hashed_password,
        )

        try:
            db.session.add(new_admin)
            db.session.commit()

            return render_template("auth/wait_approval.html")
        except Exception as e:
            flash("An error occurred. Please try again.", "danger")
            return redirect(url_for("auth.superadmin_signup"))

    return render_template("auth/admin_signup.html")


@auth.route("/admin/signin/", methods=["GET", "POST"])
@superadmin_required
def admin_signin():
    if request.method == "POST":
        admin_email = request.form["adminEmail"]
        admim_password = request.form["adminPassword"]

        admin = Admin.query.filter_by(email=admin_email).first()
        if admin:
            if check_password_hash(admin.password, admim_password):
                if admin.is_allowed:
                    remember_me = bool(request.form.get("adminRememberMe", False))
                    login_user(admin, remember=remember_me)
                    return redirect(url_for("views.admin_home"))
                return render_template("auth/wait_approval.html")
        flash("User Email or Password is Invalid", "danger")
    return render_template("auth/admin_signin.html")


@auth.route("/admin/approve/<int:admin_id>/")
@superadmin_required
@login_required
def approve_admin(admin_id):
    if current_user.is_super:
        admin = Admin.query.filter_by(id=int(admin_id)).first()
        if admin:
            admin.is_allowed = True
            db.session.commit()

            flash("Admin Successfully Approved", "success")

    return redirect(url_for("views.manage_admins"))


@auth.route("/admin/deny/<int:admin_id>/")
@superadmin_required
@login_required
def deny_admin(admin_id):
    if current_user.is_super:
        admin = Admin.query.filter_by(id=int(admin_id)).first()
        if admin:
            db.session.delete(admin)
            db.session.commit()

            flash("Admin Successfully Denied", "success")

    return redirect(url_for("views.manage_admins"))


@auth.route("/admin/signout/")
@superadmin_required
@login_required
def admin_signout():
    logout_user()
    return redirect(url_for("auth.admin_signin"))
