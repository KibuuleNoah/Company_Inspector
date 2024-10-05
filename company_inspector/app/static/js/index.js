async function sendJsonToBackEnd(endPoint, method, data) {
  try {
    let response = await fetch(`${endPoint}`, {
      method: method ? method : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data ? data : {}),
    });
    return response;
  } catch (error) {
    console.log(error);
    return 0;
  }
}

let employeeForm = document.querySelector("form[name='employeeForm']");
if (employeeForm) {
  employeeForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent form submission
    let form = e.target;
    let formTriggerBtn = document.querySelector(
      'button[data-bs-target="#collapseEmployeeForm"]',
    );

    const empData = {
      alphaCode: form["alphaCode"].value.trim(),
      firstName: form["firstName"].value.trim(),
      lastName: form["lastName"].value.trim(),
      gender: form["gender"].value.trim(),
      jobTitle: form["jobTitle"].value.trim(),
      department: form["department"].value.trim(),
      dateOfHire: form["dateOfHire"].value.trim(),
    };

    let response = await sendJsonToBackEnd("/admin/", "POST", empData);

    // Log response to see its structure
    console.log("Response:", response);

    if (response.ok) {
      let jsonData = await response.json(); // Make sure this is a valid JSON response

      alertMessage(jsonData.message, jsonData.cate);

      if (jsonData.cate != "danger") {
        let employeesTableBody = document.querySelector("#employees tbody");
        let newRow = document.createElement("tr");
        // newRow.setAttribute("class", "bg-success text-light");
        newRow.innerHTML = `
          <td>##</td>
          <td>${empData.alphaCode}</td>
          <td>${empData.firstName}</td>
          <td>${empData.lastName}</td>
          <td>${empData.gender}</td>
          <td>${empData.jobTitle}</td>
          <td>${empData.department}</td>
          <td>${empData.dateOfHire}</td>
        `;
        employeesTableBody.prepend(newRow);
        form.reset();
      }
      formTriggerBtn.click();
    } else {
      // Handle non-200 responses
      let errorText = await response.text(); // Text response for errors
      console.error("Error response text:", errorText);
      alert("Failed to submit: " + response.statusText);
    }
  });
}

let teamForm = document.querySelector("form[name='teamForm']");
if (teamForm) {
  teamForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent form submission
    let teamFormTrigger = document.querySelector("#teamFormTrigger");

    // Create a FormData object from the form
    const teamFormData = new FormData(teamForm);

    // Convert the FormData object into a plain JavaScript object
    const teamFormObject = {};
    teamFormData.forEach((value, key) => {
      // If there are multiple values for the same key (e.g., members), handle them as an array
      if (teamFormObject[key]) {
        teamFormObject[key] = [].concat(teamFormObject[key], value);
      } else {
        teamFormObject[key] = value;
      }
    });

    if (!isInt(teamFormObject["leader"])) {
      alertMessage("Please select a leader too", "warning");
      return;
    }
    /*const teamData = {
      alphaCode: form["alphaCode"].value.trim(),
      teamName: form["teamName"].value.trim(),
      gender: form["gender"].value.trim(),
      jobTitle: form["jobTitle"].value.trim(),
      department: form["department"].value.trim(),
      dateOfHire: form["dateOfHire"].value.trim(),
    };*/

    let response = await sendJsonToBackEnd(
      "/manage/teams/",
      "POST",
      teamFormObject,
    );

    if (response.ok) {
      teamFormTrigger.click();
      window.location.reload();
      // window.location.href = "/manage/teams/";
    } else {
      // Handle non-200 responses
      let errorText = await response.text(); // Text response for errors
      console.error("Error response text:", errorText);
      alert("An Error Occurried" + response.statusText);
    }
  });
}

function importExcel(e) {
  const file = e.files[0];

  if (file) {
    const reader = new FileReader();

    reader.onload = function (e) {
      const fileData = e.target.result;

      // Post the file data using fetch or another method
      fetch("/import/excel/", {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
        },
        body: fileData,
      })
        .then((response) => response.json())
        .then((data) => {
          alertMessage(data.message, data.cate);

          if (data.data) {
            let employeesTableBody = document.querySelector("#employees tbody");
            for (row of data.data) {
              let newRow = document.createElement("tr");
              newRow.innerHTML = `
                <td>${row.alphaCode}</td>
                <td>${row.firstName}</td>
                <td>${row.lastName}</td>
                <td>${row.gender}</td>
                <td>${row.jobTitle}</td>
                <td>${row.department}</td>
                <td>${row.dateOfHire}</td>
                `;
              employeesTableBody.prepend(newRow);
            }
          }
        })
        .catch((error) => {
          console.error("Error:", error);
        });
    };
    reader.readAsArrayBuffer(file); // or readAsText(file) if it's a text-based file
  }
}

const deleteTeam = async (teamId) => {
  let response = await sendJsonToBackEnd("/manage/teams/", "DELETE", {
    teamId: teamId,
  });
  let jsonData = await response.json();

  if (jsonData.teamId) {
    alertMessage("Successfully deleted the Team", "success");

    teamCard = `#card-${jsonData.teamId}`;
    $(teamCard).slideUp();
  } else {
    alertMessage("Team Not Deleted", "danger");
  }
};

const renameTeamName = (teamId) => {
  let nameEle = document.getElementById(teamId);

  let editInput = document.createElement("input");
  editInput.type = "text";
  editInput.value = nameEle.innerText;
  editInput.className = "edit";
  editInput.addEventListener("blur", async (event) => {
    let newName = event.target.value;
    let splittedTeamId = teamId.split("-");
    teamId = splittedTeamId[splittedTeamId.length - 1];

    await fetch("/manage/teams/", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ teamId: teamId, newTeamName: newName }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.cate == "success") {
          nameEle.innerText = newName;
        }

        alertMessage(data.message, data.cate);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
    event.target.replaceWith(nameEle);
  });
  editInput.focus();
  nameEle.replaceWith(editInput);
};

// Add event listener to each span element
document.querySelectorAll("span.edit").forEach((span) => {
  span.addEventListener("click", () => {
    // Create a new input element
    const input = document.createElement("input");
    // Set the value of the input to the text of the span
    input.value = span.textContent;
    // Replace the span element with the input element
    span.replaceWith(input);
    // Focus on the new input element
    input.focus();
  });
});

document.querySelectorAll("tbody tr").forEach((row) => {
  row.addEventListener("click", function (event) {
    // Prevent from re-triggering if already in edit mode
    if (this.classList.contains("editing")) {
      return;
    }

    // Mark this row as being edited
    this.classList.add("editing");

    const cells = this.querySelectorAll("td:not(:first-child)");
    let rollBackCellValues = [];
    // const rollBackCells = [...cells];
    cells.forEach((cell) => {
      const originalText = cell.innerText;

      rollBackCellValues.push(originalText);

      const input = document.createElement("input");
      input.type = "text";
      input.setAttribute("class", "form-control");
      input.name = cell.id;
      input.value = originalText;
      cell.innerHTML = ""; // Clear cell content
      cell.appendChild(input); // Insert input with original text

      // Prevent the click from propagating to the row
      input.addEventListener("click", function (event) {
        event.stopPropagation();
      });
    });

    let updateIcon = document.createElement("i");
    updateIcon.className = "bi bi-save bg-theme rounded";
    updateIcon.setAttribute("data-row-target", `${this.id}`);

    updateIcon.addEventListener("click", async (event) => {
      console.log("Updated");
      let empRow = document.querySelector(
        `#${event.target.getAttribute("data-row-target")}`,
      );

      let empRowInputs = empRow.querySelectorAll("td input");
      let data = { id: splitBy(empRowInputs[0].name, "-", 0) };

      empRowInputs.forEach((input) => {
        data[`${splitBy(input.name, "-", 1)}`] = input.value;
      });

      let response = await sendJsonToBackEnd("/admin/", "PUT", data);
      let jsonData = await response.json();

      if (jsonData.cate == "success") {
        empRowInputs.forEach((input) => {
          input.replaceWith(input.value);
        });

        alertMessage(`Employee <${jsonData.employeeId}> Updated`, "success");

        updateIcon.remove();
      } else {
        empRowInputs.forEach((input, index) => {
          console.log(rollBackCellValues[index]);
          input.replaceWith(rollBackCellValues[index]);
        });

        alertMessage(`Not Updated: ${jsonData.message}`, jsonData.cate);
      }
    });

    this.append(updateIcon);
  });
});

const splitBy = (string, splitBy, returnIdx) => {
  const parts = string.split(splitBy);
  if (returnIdx < 0) {
    return parts[parts.length + returnIdx];
  } else {
    return parts[returnIdx];
  }
};

const alertMessage = (message, cate) => {
  let globalAlert = document.getElementById("globalAlert");
  globalAlert.innerText = message;
  globalAlert.className = `alert alert-${cate} show`;
};

const deleteAdmin = async (adminId) => {
  // let response = await
  sendJsonToBackEnd("/manage/admins/", "DELETE", {
    adminId: adminId,
  });
  document.location.href = "/manage/admins/";
};

const suspendAdmin = async (adminId) => {
  // let response = await
  sendJsonToBackEnd("/manage/admins/", "PUT", {
    adminId: adminId,
    action: "suspend",
  });
  document.location.href = "/manage/admins/";
};

const resumeAdmin = async (adminId) => {
  // let response = await
  sendJsonToBackEnd("/manage/admins/", "PUT", {
    adminId: adminId,
    action: "resume",
  });
  document.location.href = "/manage/admins/";
};

const verifyEmployee = async () => {
  let input = document.getElementById("employeeVerifyInput");
  let response = await sendJsonToBackEnd("", "POST", {
    employeeAlphaCode: input.value,
  });

  let employeeVerifyRes = document.getElementById("employeeVerifyRes");
  if (response.ok) {
    let jsonData = await response.json();

    employeeVerifyRes.innerHTML = `
<div class="card employee-card border border-success">
  <div class="text-center"><i class="bi bi-person-check text-success" style="font-size: 4rem;"></i></div>
  <div class="card-header text-center">
    <h2 class="employee-name text-cstm-primary">
${jsonData.fullname}
    </h2>
    <h5 class="employee-title text-muted">${jsonData.job_title}</h5>
  </div>
  <div class="card-body">
    <p class="card-text">
      <strong class="text-cstm-primary">Alpha Code:</strong> ${jsonData.alpha_code}
    </p>
    <p class="card-text">
      <strong class="text-cstm-primary">Department:</strong> ${jsonData.department}
    </p>
    <p class="card-text">
      <strong class="text-cstm-primary">Gender:</strong> ${jsonData.gender}
    </p>
    <p class="card-text">
      <strong class="text-cstm-primary">Date of Hire:</strong>
      ${jsonData.date_of_hire}
    </p>
  </div>  
</div>
`;
  } else if (response.status == 404) {
    employeeVerifyRes.innerHTML = `
<div class="card text-center border border-danger">
  <div class="card-body">
    <i
      class="bi bi-person-x text-center text-danger"
      style="font-size: 4rem"
    ></i>
    <h4 class="card-title text-danger">Employee Not Known</h4>
    <p class="card-text">
      The employee with that Id does not exist, Please Don't deal with
      him or her
    </p>
  </div>
</div>
`;
  }
};
const verifyTeam = async () => {
  let input = document.getElementById("teamVerifyInput");
  let response = await sendJsonToBackEnd("", "POST", {
    teamAlphaCode: input.value,
  });

  let teamVerifyRes = document.getElementById("teamVerifyRes");
  if (response.ok) {
    let jsonData = await response.json();

    let members = "";
    jsonData.members.forEach((m) => {
      members += `
        <li class="list-group-item">
         <strong>${m.fullname}</strong> -
         <span class="text-muted">${m.job_title}</span>
        </li>
      `;
    });

    teamVerifyRes.innerHTML = `
<div class="card team-card border border-success">
   <div class="card-header text-center">
     <h3 class="team-name text-cstm-primary">${jsonData.name}</h3>
     <p class="team-leader text-muted">
       <strong>Team Leader:</strong><br />
       <strong>${jsonData.leader.fullname}</strong> - <small>${jsonData.leader.job_title}</small>
     </p>
   </div>
   <div class="card-body">
     <h5 class="text-cstm-primary">Team Members</h5>
     <ul class="list-group">${members}</ul>
   </div>
 </div>
`;
  } else if (response.status == 404) {
    teamVerifyRes.innerHTML = `
<div class="card text-center border border-danger mb-4">
  <div class="card-body">
    <i
      class="bi bi-journal-x text-center text-danger"
      style="font-size: 4rem"
    ></i>
    <h4 class="card-title text-danger">Team Not Known</h4>
    <p class="card-text">
     The Team you are looking for is not Known, if you come across to it, it's fake
    </p>
  </div>
</div>
`;
  }
};

let selectedEmployeesArray = [];

const queueEnqueueEmployee = (event) => {
  if (event.checked) {
    selectedEmployeesArray.push(event.value);
  } else {
    selectedEmployeesArray = [
      ...new Set(selectedEmployeesArray.filter((item) => item !== event.value)),
    ];
  }
  if (selectedEmployeesArray.length > 0) {
    $("#selectedEmployees").fadeIn(600);
    document.querySelector("#selectedEmployees b").innerText =
      selectedEmployeesArray.length;
  } else {
    $("#selectedEmployees").fadeOut(600);
  }
};

const deleteSelectedEmpl = async () => {
  let response = await sendJsonToBackEnd("/admin/", "DELETE", {
    employees: selectedEmployeesArray,
  });

  if (response.ok) {
    let jsonData = await response.json();

    jsonData.employees.forEach((id) => {
      if (!(id in jsonData.found_leaders)) {
        $("#emp-" + id).remove();
      }
    });

    selectedEmployeesArray = [];
    $("#selectedEmployees").fadeOut(600);

    if (jsonData.found_leaders.length > 0) {
      let foundLeaders = jsonData.found_leaders.length;
      let deletedEmps = jsonData.employees.length - foundLeaders;

      alertMessage(
        "Successfully deleted " +
          deletedEmps +
          " employees, But found " +
          foundLeaders +
          " leaders, First delete their teams to attempt deleting them",
        "warning",
      );
    } else {
      alertMessage(
        "Successfully deleted " + jsonData.employees.length + " employees",
        "success",
      );
    }
  } else {
    alertMessage(response.statusText, "danger");
  }
};

function isInt(str) {
  return /^-?\d+$/.test(str);
}
