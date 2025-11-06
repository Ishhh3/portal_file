const API_URL = 'http://localhost:3000';
const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));

let allLeaderboardData = [];

window.addEventListener("load", () => {
    loadLeaderboard();
    loadDepartments();
    loadSubjects();
});

function loadLeaderboard() {
    if (!loggedInUser || !loggedInUser.teacher_id) {
        showError("Please log in to view leaderboards");
        return;
    }

    const teacherId = loggedInUser.teacher_id;
    const url = `${API_URL}/teacher/leaderboard/${teacherId}`;
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            allLeaderboardData = data;
            displayLeaderboard(data);
        })
        .catch(error => {
            console.error("Error loading leaderboard:", error);
            showError("Failed to load leaderboard data.");
        });
}

function displayLeaderboard(data) {
    const tbody = document.querySelector('#leaderboardTable tbody');
    
    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    <i class="fas fa-info-circle me-2"></i>No students found in leaderboard
                    <br><small>Only students with GWA between 1.00-1.75 are shown</small>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = data.map(student => `
        <tr data-honor="${student.scholar_type}" data-dept="${student.department}" data-year="${student.academic_year}" data-subject="${student.subject_name}">
            <td>${student.rank}</td>
            <td>${student.student_id}</td>
            <td>${student.student_name}</td>
            <td>${student.department}</td>
            <td>${student.year_level}</td>
            <td>${student.gwa}</td>
            <td><span class="honor-badge ${getScholarClass(student.scholar_type)}">${student.scholar_type}</span></td>
        </tr>
    `).join('');
}

function getScholarClass(scholarType) {
    switch(scholarType) {
        case 'University Scholar':
            return 'university-scholar';
        case 'College Scholar':
            return 'college-scholar';
        case "Dean's Lister":
            return 'deans-lister';
        default:
            return '';
    }
}

function filterLeaderboard() {
    const subjectFilter = document.getElementById('subjectFilter').value;
    const deptFilter = document.getElementById('departmentFilter').value;
    const yearFilter = document.getElementById('academicYearFilter').value;
    const searchQuery = document.getElementById('leaderboardSearch').value.toLowerCase();
    
    let filteredData = allLeaderboardData.filter(student => {
        const matchesSubject = !subjectFilter || student.subject_name === subjectFilter;
        const matchesDept = !deptFilter || student.department === deptFilter;
        const matchesYear = !yearFilter || student.academic_year === yearFilter;
        const matchesSearch = !searchQuery || 
            student.student_id.toLowerCase().includes(searchQuery) || 
            student.student_name.toLowerCase().includes(searchQuery);
        
        return matchesSubject && matchesDept && matchesYear && matchesSearch;
    });
    
    filteredData = filteredData.map((student, index) => ({
        ...student,
        rank: index + 1
    }));
    
    displayLeaderboard(filteredData);
}

function loadSubjects() {
    if (!loggedInUser || !loggedInUser.teacher_id) {
        return;
    }
    
    const teacherId = loggedInUser.teacher_id;
    
    fetch(`${API_URL}/teacher/subjects/${teacherId}`)
        .then(response => response.json())
        .then(subjects => {
            const select = document.getElementById('subjectFilter');
            const subjectOptions = subjects.map(subject => 
                `<option value="${subject.subject_name}">${subject.subject_name}</option>`
            ).join('');
            select.innerHTML = '<option value="">All Subjects</option>' + subjectOptions;
        })
        .catch(error => {
            console.error('Error loading subjects:', error);
        });
}

function loadDepartments() {
    fetch(`${API_URL}/api/leaderboard/departments`)
        .then(response => response.json())
        .then(departments => {
            const select = document.getElementById('departmentFilter');
            const departmentOptions = departments.map(dept => 
                `<option value="${dept.course_name}">${dept.course_name}</option>`
            ).join('');
            select.innerHTML = '<option value="">All Departments</option>' + departmentOptions;
        })
        .catch(error => {
            console.error('Error loading departments:', error);
        });
}

function showError(message) {
    const tbody = document.querySelector('#leaderboardTable tbody');
    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center text-danger py-4">
                <i class="fas fa-exclamation-circle me-2"></i>${message}
            </td>
        </tr>
    `;
}

document.getElementById('leaderboardSearch').addEventListener('input', filterLeaderboard);
document.getElementById('subjectFilter').addEventListener('change', filterLeaderboard);
document.getElementById('departmentFilter').addEventListener('change', filterLeaderboard);
document.getElementById('academicYearFilter').addEventListener('change', filterLeaderboard);