window.addEventListener("load", () => {
    loadAllStudents();
});

const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));

let allStudents = [];
let allGrades = [];
let currentStudentId = null;

function loadAllStudents() {
    if (!loggedInUser || loggedInUser.role !== "admin") {
        console.log("Unauthorized access");
        window.location.href = "login.html";
        return;
    }

    const link = "http://localhost:3000/admin/students";

    fetch(link, { mode: "cors" })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            allStudents = data;
            displayStudents(allStudents);
        })
        .catch((error) => {
            console.error("Error fetching students:", error);
            alert("Error loading students. Please make sure the server is running.");
        });
}

function displayStudents(students) {
    const tbody = document.querySelector("#studentsTable tbody");
    tbody.innerHTML = "";

    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No students found</td></tr>';
        return;
    }

    students.forEach((student) => {
        const row = document.createElement("tr");
        row.className = "clickable-row";
        row.style.cursor = "pointer";
        row.setAttribute("data-student-id", student.student_id);
        row.setAttribute("data-name", student.full_name);
        row.setAttribute("data-dept", student.course_name);
        row.setAttribute("data-year", student.year_level_name);
        row.setAttribute("data-email", student.email || "N/A");
        row.setAttribute("data-phone", student.phone || "N/A");
        row.setAttribute("data-gender", student.gender || "N/A");
        row.setAttribute("data-birthdate", student.birthdate || "N/A");
        row.onclick = function() { viewStudentInfo(this); };

        row.innerHTML = `
            <td><span class="student-id">${student.student_id}</span></td>
            <td>${student.full_name}</td>
            <td>${student.course_name}</td>
            <td><span class="badge badge-year">${student.year_level_name}</span></td>
        `;

        tbody.appendChild(row);
    });
}

function viewStudentInfo(row) {
    const studentId = row.getAttribute('data-student-id');
    const studentName = row.getAttribute('data-name');
    const studentDept = row.getAttribute('data-dept');
    const studentYear = row.getAttribute('data-year');
    const studentEmail = row.getAttribute('data-email');
    const studentPhone = row.getAttribute('data-phone');
    
    currentStudentId = studentId;
    
    document.getElementById('modalStudentId').textContent = studentId;
    document.getElementById('modalStudentName').textContent = studentName;
    document.getElementById('modalStudentDept').textContent = studentDept;
    document.getElementById('modalStudentYear').textContent = studentYear;
    
    if (document.getElementById('modalStudentEmail')) {
        document.getElementById('modalStudentEmail').textContent = studentEmail;
    }
    if (document.getElementById('modalStudentPhone')) {
        document.getElementById('modalStudentPhone').textContent = studentPhone;
    }
    
    fetchStudentGrades(studentId);
    populateRegistrationForm(row);
    
    const modal = new bootstrap.Modal(document.getElementById('studentInfoModal'));
    modal.show();
}

function populateRegistrationForm(row) {
    const studentName = row.getAttribute('data-name');
    const studentDept = row.getAttribute('data-dept');
    const studentYear = row.getAttribute('data-year');
    const studentEmail = row.getAttribute('data-email');
    const studentPhone = row.getAttribute('data-phone');
    const studentGender = row.getAttribute('data-gender') || 'N/A';
    const studentBirthdate = row.getAttribute('data-birthdate') || 'N/A';
    
    const regFullName = document.getElementById('regFullName');
    const regBirthdate = document.getElementById('regBirthdate');
    const regGender = document.getElementById('regGender');
    const regPhone = document.getElementById('regPhone');
    const regEmail = document.getElementById('regEmail');
    const regCourse = document.getElementById('regCourse');
    const regYearLevel = document.getElementById('regYearLevel');
    const regSemester = document.getElementById('regSemester');
    
    if (regFullName) regFullName.textContent = studentName;
    if (regBirthdate) regBirthdate.textContent = formatDate(studentBirthdate);
    if (regGender) regGender.textContent = studentGender;
    if (regPhone) regPhone.textContent = studentPhone;
    if (regEmail) regEmail.textContent = studentEmail;
    if (regCourse) regCourse.textContent = studentDept;
    if (regYearLevel) regYearLevel.textContent = studentYear;
    if (regSemester) regSemester.textContent = 'First Semester AY 2024-2025';
}

function formatDate(dateString) {
    if (!dateString || dateString === 'N/A') return 'N/A';
    
    try {
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    } catch (e) {
        return dateString;
    }
}
function fetchStudentGrades(studentId) {
    const link = `http://localhost:3000/student/grades/${studentId}`;
    
    fetch(link, { mode: "cors" })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            allGrades = data;
            displayGrades(allGrades);
            populateYearFilter(allGrades);
        })
        .catch((error) => {
            console.error("Error fetching grades:", error);
            const tbody = document.querySelector("#grades-panel tbody");
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">Error loading grades</td></tr>';
            }
        });
}

function displayGrades(grades) {
    const tbody = document.querySelector("#grades-panel tbody");
    
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    if (grades.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No grades found</td></tr>';
        return;
    }
    
    grades.forEach((grade) => {
        const row = document.createElement("tr");
        
        // Convert to numbers and handle string values
        const midterm = grade.midterm_grade != null ? Number(grade.midterm_grade) : 0;
        const final = grade.final_grade != null ? Number(grade.final_grade) : 0;
        
        const remarks = calculateRemarks(midterm, final);
        
        // Format midterm grade with 2 decimal places
        let displayMidterm = midterm;
        if (midterm !== 0 && midterm !== 'Dropped') {
            displayMidterm = midterm.toFixed(2);
        }
        
        // Display logic for final grade
        let displayFinal;
        if (final === 6 || Math.abs(final - 6.00) < 0.01) {
            displayFinal = 'INC';
        } else if (final === 0) {
            displayFinal = 'Dropped';
        } else {
            // Format regular grades with 2 decimal places
            displayFinal = final.toFixed(2);
        }
        
        row.innerHTML = `
            <td class="text-danger">${grade.subject_code}</td>
            <td>${grade.subject_name}</td>
            <td>${displayMidterm}</td>
            <td>${displayFinal}</td>
            <td>${remarks}</td>
        `;
        
        tbody.appendChild(row);
    });
}

function calculateRemarks(midterm, final) {
    // Use strict comparison for 6 and approximate for 6.00 due to floating point
    if (final === 0 || final === 0.00) {
        return "Dropped";
    }
    
    if (final === 6 || Math.abs(final - 6.00) < 0.01) {
        return "Incomplete";
    }
    
    if (final >= 1.00 && final <= 3.00) {
        return "Passed";
    }
    
    if (final > 3.00 && final < 6.00) {
        return "Failed";
    }
    
    return "N/A";
}

function populateYearFilter(grades) {
    const yearFilter = document.getElementById('gradeYearFilter');
    if (!yearFilter) return;
    
    const years = [...new Set(grades.map(g => g.academic_year))];
    yearFilter.innerHTML = '';
    
    if (years.length === 0) {
        yearFilter.innerHTML = '<option value="">No academic years</option>';
        return;
    }
    
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year.replace('-', ' - ');
        yearFilter.appendChild(option);
    });
}

function filterGrades() {
    const selectedYear = document.getElementById('gradeYearFilter').value;
    const selectedSemester = document.getElementById('gradeSemesterFilter').value;
    
    const filteredGrades = allGrades.filter(grade => {
        const matchesYear = !selectedYear || grade.academic_year === selectedYear;
        const matchesSemester = !selectedSemester || grade.semester === selectedSemester;
        return matchesYear && matchesSemester;
    });
    
    displayGrades(filteredGrades);
}

function resetGradeFilters() {
    const yearFilter = document.getElementById('gradeYearFilter');
    const semesterFilter = document.getElementById('gradeSemesterFilter');
    
    if (yearFilter && yearFilter.options.length > 0) {
        yearFilter.selectedIndex = 0;
    }
    if (semesterFilter && semesterFilter.options.length > 0) {
        semesterFilter.selectedIndex = 0;
    }
    
    displayGrades(allGrades);
}

function filterStudents() {
    const searchQuery = document.getElementById('studentSearch').value.toLowerCase();
    const selectedDepartment = document.getElementById('studentDepartmentFilter').value;
    const selectedYear = document.getElementById('studentYearFilter').value;

    const filteredStudents = allStudents.filter(student => {
        const matchesSearch = !searchQuery || 
            student.student_id.toLowerCase().includes(searchQuery) || 
            student.full_name.toLowerCase().includes(searchQuery);
        
        const matchesDepartment = !selectedDepartment || 
            student.course_name.includes(selectedDepartment);
        
        const matchesYear = !selectedYear || 
            student.year_level_name === selectedYear;

        return matchesSearch && matchesDepartment && matchesYear;
    });

    displayStudents(filteredStudents);
}

function resetFilters() {
    document.getElementById('studentSearch').value = '';
    document.getElementById('studentDepartmentFilter').value = '';
    document.getElementById('studentYearFilter').value = '';
    displayStudents(allStudents);
}

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");

    if (sidebar) sidebar.classList.toggle("active");
    if (overlay) overlay.classList.toggle("active");
}

function logout() {
    localStorage.removeItem("loggedInUser");
    window.location.href = "login.html";
}

document.addEventListener('DOMContentLoaded', function() {
    const studentSearch = document.getElementById('studentSearch');
    const studentDepartmentFilter = document.getElementById('studentDepartmentFilter');
    const studentYearFilter = document.getElementById('studentYearFilter');
    const resetStudentFilters = document.getElementById('resetStudentFilters');

    if (studentSearch) {
        studentSearch.addEventListener('input', filterStudents);
    }
    if (studentDepartmentFilter) {
        studentDepartmentFilter.addEventListener('change', filterStudents);
    }
    if (studentYearFilter) {
        studentYearFilter.addEventListener('change', filterStudents);
    }
    if (resetStudentFilters) {
        resetStudentFilters.addEventListener('click', resetFilters);
    }
    
    const gradeYearFilter = document.getElementById('gradeYearFilter');
    const gradeSemesterFilter = document.getElementById('gradeSemesterFilter');
    const resetGradeFiltersBtn = document.getElementById('resetGradeFilters');
    
    if (gradeYearFilter) {
        gradeYearFilter.addEventListener('change', filterGrades);
    }
    if (gradeSemesterFilter) {
        gradeSemesterFilter.addEventListener('change', filterGrades);
    }
    if (resetGradeFiltersBtn) {
        resetGradeFiltersBtn.addEventListener('click', resetGradeFilters);
    }
});