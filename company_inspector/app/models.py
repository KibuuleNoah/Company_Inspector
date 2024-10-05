from . import db
from flask_login import UserMixin


class Admin(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    fullname = db.Column(
        db.String(64), index=True, unique=True
    )  # Full name of the admin (must be unique)
    email = db.Column(db.String(64))  # Admin email
    department = db.Column(db.String(64))  # Department the admin belongs to
    password = db.Column(db.String(100))  # Admin password (hashed)
    is_super = db.Column(
        db.Boolean, default=False
    )  # Indicates if the admin has super privileges
    is_allowed = db.Column(
        db.Boolean, default=False
    )  # Indicates if the admin is allowed access
    is_suspended = db.Column(db.Boolean, default=False)

    def __repr__(self):
        """Returns the admin's full name."""
        return f"{self.fullname}"


class Employee(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    alpha_code = db.Column(db.String(100), unique=True, nullable=False)
    first_name = db.Column(db.String(20), nullable=False)
    last_name = db.Column(db.String(20), nullable=False)
    gender = db.Column(db.String(8), nullable=False)
    job_title = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(100), nullable=False)
    date_of_hire = db.Column(db.DateTime, nullable=False)
    team_id = db.Column(db.Integer, db.ForeignKey("team.id"))

    @property
    def fullname(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def clean_doh(self):
        """clean date of hire"""
        return str(self.date_of_hire)[:-9]

    @property
    def to_dict(self):
        return {
            "id": self.id,
            "alpha_code": self.alpha_code,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "fullname": self.fullname,
            "gender": self.gender,
            "job_title": self.job_title,
            "department": self.department,
            "date_of_hire": self.clean_doh,
            "team_id": self.team_id,
        }

    def __repr__(self):
        return f"{self.first_name} {self.last_name}"


class Team(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    alpha_code = db.Column(db.String(100), unique=True, nullable=False)
    name = db.Column(
        db.String(60), nullable=False, unique=True
    )  # Team name must be unique
    leader_id = db.Column(
        db.Integer, db.ForeignKey("employee.id"), unique=True
    )  # Leader ID (foreign key to Employee)
    members = db.relationship(
        "Employee",
        backref="team",
        foreign_keys=[Employee.team_id],  # Team members are related to Employee
    )
    activities = db.Column(
        db.String,
        nullable=True,  # Optional list of activities stored as a comma-separated string
    )

    @property
    def get_activities(self):
        """Returns the team's activities as a list of strings."""
        return self.activities.split(",")

    @property
    def get_leader(self):
        """Returns the leader (Employee) of the team."""
        return Employee.query.get(int(self.leader_id))

    @property
    def get_members(self):
        """Returns a list of team members excluding the leader."""
        return [m for m in self.members if m.id != self.leader_id]

    @property
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "leader": self.get_leader.to_dict,
            "members": [m.to_dict for m in self.get_members],
            "activities": self.get_activities,
        }

    def __repr__(self):
        """Returns a string representation of the team (its name)."""
        return f"{self.name}"
