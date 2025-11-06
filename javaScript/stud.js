window.addEventListener("load", () => {
    getUsers();
});

const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser")); 

const username = document.querySelector("#username");
const student_id = document.querySelector("#student_id");
const department = document.querySelector("#department");
const year_level = document.querySelector("#year_level");
const final_grade = document.querySelector("#final_grade");
const enrolledSubjects = document.querySelector("#enrolledSubjects");
const totalUnits = document.querySelector("#totalUnits");
const ranking = document.querySelector("#ranking");

function getUsers() {
    if (!loggedInUser || !loggedInUser.student_id) {
        console.log("No logged-in user found");
        return;
    }
    var ustudent = loggedInUser.student_id;
    var link = `http://localhost:3000/student/dashboard/${ustudent}`

    fetch(link, { mode: "cors" })
        .then((response) => response.json())
        .then((data) => {
            username.innerText = data.full_name;
            student_id.innerText = `Student ID: ${data.student_id}`;
            department.innerText = `Course: ${data.course}`;
            year_level.innerText = `Year Level: ${data.year_level}`;
            final_grade.innerText = parseFloat(data.average_final).toFixed(2);
            enrolledSubjects.innerText = data.enrolled_subjects || 0;
            totalUnits.innerText = data.total_units || 0;
            ranking.innerText = data.ranking || 'N/A';
        })
        .catch((error) => {
            console.log("Error fetching user:", error);
        });
}