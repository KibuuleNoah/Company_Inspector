from datetime import datetime
from io import BytesIO
from functools import wraps
import re, random, string

from openpyxl import Workbook
from flask import render_template

from .models import Employee, Admin
from . import db


def superadmin_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        any_admin = Admin.query.all()
        if not any_admin:
            return render_template("auth/superadmin_404.html")
        return func(*args, **kwargs)

    return wrapper


def camel_case(s: str) -> str:
    """
    Converts a string into camel case format.

    If the string contains spaces, it will capitalize each word, remove the spaces,
    and ensure the first letter of the result is lowercase. If there are no spaces,
    the entire string is returned in lowercase.

    Args:
        s (str): The input string to convert.

    Returns:
        str: The camel-cased string.
    """
    # Check if the string contains no spaces
    if s.find(" ") < 0:
        return s.lower()  # Return string in lowercase if no spaces are found

    # Split the string by spaces, capitalize each word, and join them
    res = "".join([token.title() for token in s.split(" ")]).replace(" ", "")

    # Return the result with the first letter in lowercase
    return res[0].lower() + res[1:]


def create_employee(data: dict) -> dict:
    """
    Creates a new employee record in the database.

    Checks if an employee with the given ID already exists. If the employee doesn't exist,
    it validates the input data and creates a new employee in the database.

    Args:
        data (dict): The employee details including employeeId, firstName, lastName, gender, jobTitle,
                     department, and dateOfHire.

    Returns:
        dict: A dictionary with the status of the operation, including 'error' (bool) and
              'message' (str) if applicable.
    """
    # Check if an employee with the given Alpha Code already exists
    employee = Employee.query.filter_by(alpha_code=data["alphaCode"]).first()
    if employee:
        return {
            "error": True,
            "message": f"Employee With ID <{data['alphaCode']}> Already Exists",
        }

    # Validate the employee data
    err = validate_employee(data)
    if err != "":
        return {
            "error": True,
            "message": err,
        }

    # Parse the date of hire from the input data
    date_of_hire = datetime.strptime(data["dateOfHire"], "%Y-%m-%d")

    # Create a new employee instance
    employee = Employee(
        alpha_code=data["alphaCode"],
        first_name=data["firstName"],
        last_name=data["lastName"],
        gender=data["gender"],
        job_title=data["jobTitle"],
        department=data["department"],
        date_of_hire=date_of_hire,
    )

    # Add the employee to the session and commit to the database
    db.session.add(employee)
    db.session.commit()

    return {"error": False}


def get_admins(request, current_user) -> dict[str, list]:
    """
    Retrieves a list of pending and approved admins from the database.

    This function checks if the request method is GET and the current user has super-admin
    privileges. If so, it retrieves all admins (excluding the current user) and classifies
    them as pending or approved based on their permissions.

    Args:
        request: The HTTP request object.
        current_user: The current logged-in user (admin).

    Returns:
        dict[str, list]: A dictionary with two keys: "approved" (a list of approved admins)
                         and "pending" (a list of pending admins).
    """
    pending_admins = []
    approved_admins = []

    # Only process if the request method is GET and the current user is a super-admin
    if request.method == "GET" and current_user.is_super:
        admins = Admin.query.all()[
            1:
        ]  # Get all admins except the first one (likely the super-admin)

        # Categorize admins based on their approval status
        for admin in admins:
            if admin.is_allowed:
                approved_admins.append(admin)
            else:
                pending_admins.append(admin)

    return {"approved": approved_admins, "pending": pending_admins}


def validate_employee(employee: dict) -> str:
    """
    Validates employee data to ensure it meets the required format.

    Args:
        employee (dict): A dictionary containing employee details.

    Returns:
        str: An error message if validation fails, otherwise an empty string.
    """
    try:
        # Check if employee ID is present and under 100 characters
        if not employee["alphaCode"] or len(employee["alphaCode"]) > 100:
            return "Alpha Code is required and must not exceed 100 characters."

        # Validate first name (must be letters only, 3-20 characters)
        emp_first_name = employee["firstName"]
        if not re.match("^[A-Za-z]{3,20}$", emp_first_name):
            return "First name is required and must contain only letters of length 3-20 characters."

        # Validate last name (must be letters only, 3-20 characters)
        emp_last_name = employee["lastName"]
        if not re.match("^[A-Za-z]{3,20}$", emp_last_name):
            return "Last name is required and must contain only letters of length 3-20 characters."

        # Ensure gender is either 'Male', 'Female', or 'Other'
        if employee["gender"] not in ["Male", "Female", "Other"]:
            return "Gender must be 'Male', 'Female', or 'Other'."

        # Check if job title is present and under 100 characters
        if not employee["jobTitle"] or len(employee["jobTitle"]) > 100:
            return "Job title is required and must not exceed 100 characters."

        # Check if department is present and under 100 characters
        if not employee["department"] or len(employee["department"]) > 100:
            return "Department is required and must not exceed 100 characters."

        # Validate the date of hire (must be in YYYY-MM-DD format)
        date_str = employee.get("dateOfHire", "")
        try:
            datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            return "Invalid date format. Please use YYYY-MM-DD."

    except KeyError as e:
        # Handle missing required fields
        return f"{e} is missing!!!!"

    # Return empty string if all validations pass
    return ""


def create_excel_from_data(data):
    """
    Generates an Excel file from a list of employee data.

    Args:
        data: A list of employee objects containing details like ID, employee_id, etc.

    Returns:
        BytesIO: The generated Excel file in memory.
    """
    # Create a new workbook and set the active sheet
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Employees"

    # Define and add the headers
    headers = [
        "ID",
        "Alpha Code",
        "First Name",
        "Last Name",
        "Gender",
        "Job Title",
        "Department",
        "Date of Hire",
        "Team ID",
    ]
    sheet.append(headers)

    # Add employee data to the sheet
    for emp in data:
        sheet.append(
            [
                emp.id,
                emp.alpha_code,
                emp.first_name,
                emp.last_name,
                emp.gender,
                emp.job_title,
                emp.department,
                emp.date_of_hire.strftime("%Y-%m-%d"),  # Format the date
                emp.team_id,
            ]
        )

    # Save the workbook to a BytesIO stream
    excel_file = BytesIO()
    workbook.save(excel_file)
    excel_file.seek(0)  # Reset stream position to the beginning
    return excel_file


def datetime_stamp():
    return str(datetime.now()).replace(":", "-").replace(" ", "-").replace(".", "-")


def hexid(length=4):
    return "".join(random.choice(string.hexdigits) for _ in range(length))


# def include_admins(func):
#     @wraps
#     def wrapper(*args, **kwargs):
#         pending_admins = []
#         approved_admins = []
#         if request.method == "GET" and current_user.is_super:
#             admins = Admin.query.all()[1:]
#             for admin in admins:
#                 if admin.is_allowed:
#                     approved_admins.append(admin)
#                 else:
#                     pending_admins.append(admin)
#
#         return func(
#             *args,
#             admins={"approved": approved_admins, "pending": pending_admins},
#             **kwargs,
#         )
#
#     return wrapper
