window.addEventListener("load", () => {
    getTeacherData();
    getTeacherStats();
});

const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));

const username = document.querySelector("#username");
const teacher_id = document.querySelector("#teacher_id");
const department = document.querySelector("#department");
const school_year = document.querySelector("#school_year");

const totalClasses = document.querySelector(".col-md-3:nth-child(1) h2");
const totalSubjects = document.querySelector(".col-md-3:nth-child(2) h2");
const totalStudents = document.querySelector(".col-md-3:nth-child(3) h2");
const announcements = document.querySelector(".col-md-3:nth-child(4) h2");

function getTeacherData() {
    if (!loggedInUser || !loggedInUser.teacher_id) {
        console.log("No logged-in teacher found");
        username.innerText = "No user logged in";
        teacher_id.innerText = "TeacherID: N/A";
        department.innerText = "Department: N/A";
        school_year.innerText = "School Year: N/A";
        return;
    }

    const teacherId = loggedInUser.teacher_id;
    const link = `http://localhost:3000/teacher/dashboard/${teacherId}`;

    fetch(link, { mode: "cors" })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            username.innerText = data.full_name || "N/A";
            teacher_id.innerText = `TeacherID: ${data.teacherUser_id || "N/A"}`;
            department.innerText = `Department: ${data.department_name || "N/A"}`;
            school_year.innerText = `School Year: ${data.academic_year || "N/A"}`;
        })
        .catch((error) => {
            console.error("Error fetching teacher data:", error);
            username.innerText = "Error loading data";
            teacher_id.innerText = "TeacherID: Error";
            department.innerText = "Department: Error";
            school_year.innerText = "School Year: Error";
        });
}

function getTeacherStats() {
    if (!loggedInUser || !loggedInUser.teacher_id) {
        console.log("No logged-in teacher found");
        return;
    }

    const teacherId = loggedInUser.teacher_id;
    const link = `http://localhost:3000/teacher/stats/${teacherId}`;

    fetch(link, { mode: "cors" })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            console.log("Teacher stats data received:", data);
            if (totalClasses) totalClasses.innerText = data.total_classes || 0;
            if (totalSubjects) totalSubjects.innerText = data.total_subjects || 0;
            if (totalStudents) totalStudents.innerText = data.total_students || 0;
            if (announcements) announcements.innerText = data.announcements || 0;
        })
        .catch((error) => {
            console.error("Error fetching teacher stats:", error);
        });
}

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");

    sidebar.classList.toggle("active");
    overlay.classList.toggle("active");
}

function closeSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");

    sidebar.classList.remove("active");
    overlay.classList.remove("active");
}

function logout() {
    localStorage.removeItem("loggedInUser");
    window.location.href = "login.html";
}