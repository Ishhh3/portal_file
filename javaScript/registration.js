window.addEventListener("load", () => {
    loadRegistrationData();
});

const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
let studentData = null;

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

function logout() {
    localStorage.removeItem('loggedInUser');
    window.location.href = 'login.html';
}

function loadRegistrationData() {
    if (!loggedInUser || !loggedInUser.student_id) {
        console.log('No logged-in user found');
        window.location.href = 'login.html';
        return;
    }

    const url = `http://localhost:3000/student/registration/${loggedInUser.student_id}`;

    fetch(url, { mode: "cors" })
        .then((response) => response.json())
        .then((data) => {
            studentData = data;
            populateForm(data);
        })
        .catch((error) => {
            console.log("Error fetching registration data:", error);
            displayError();
        });
}

function populateForm(data) {
    document.getElementById('fullName').textContent = data.full_name || 'N/A';
    document.getElementById('dateOfBirth').textContent = formatDate(data.birthdate) || 'N/A';
    document.getElementById('sex').textContent = data.gender || 'N/A';
    document.getElementById('contactNo').textContent = data.phone || 'N/A';
    document.getElementById('email').textContent = data.email || 'N/A';
    document.getElementById('course').textContent = data.course_name || 'N/A';
    document.getElementById('yearLevel').textContent = data.year_level_name || 'N/A';
    document.getElementById('semester').textContent = 'First Semester AY 2024-2025';
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    } catch (e) {
        return dateString;
    }
}

function displayError() {
    document.getElementById('fullName').textContent = 'Error loading data';
}

function downloadPDF() {
    if (!studentData) {
        alert('Please wait for data to load');
        return;
    }

    const element = document.getElementById('registrationForm');
    const downloadBtn = document.querySelector('.download-btn');
    
    if (downloadBtn) {
        downloadBtn.style.display = 'none';
    }

    const opt = {
        margin: 10,
        filename: `${studentData.student_id}_Registration_Form.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        if (downloadBtn) {
            downloadBtn.style.display = 'inline-block';
        }
    });
}