const API_URL = 'http://localhost:3000/api/leaderboard';

let allLeaderboardData = [];

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

function logout() {
    console.log('Logging out...');
}

async function loadLeaderboard() {
    try {
        const response = await fetch(API_URL);
        allLeaderboardData = await response.json();
        
        displayLeaderboard(allLeaderboardData);
        
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        const tbody = document.querySelector('#leaderboardTable tbody');
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>Error loading leaderboard data
                </td>
            </tr>
        `;
    }
}

function displayLeaderboard(data) {
    const tbody = document.querySelector('#leaderboardTable tbody');
    
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">
                    <i class="fas fa-info-circle me-2"></i>No students found matching the criteria
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = data.map(student => `
        <tr data-honor="${student.scholar_type}" data-dept="${student.department}" data-year="${student.academic_year}">
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
    const honorFilter = document.getElementById('honorFilter').value;
    const deptFilter = document.getElementById('departmentFilterLeaderboard').value;
    const yearFilter = document.getElementById('academicYearFilter').value;
    const searchQuery = document.getElementById('leaderboardSearch').value.toLowerCase();
    
    let filteredData = allLeaderboardData.filter(student => {
        const matchesHonor = !honorFilter || student.scholar_type === honorFilter;
        const matchesDept = !deptFilter || student.department === deptFilter;
        const matchesYear = !yearFilter || student.academic_year === yearFilter;
        const matchesSearch = !searchQuery || 
            student.student_id.toLowerCase().includes(searchQuery) || 
            student.student_name.toLowerCase().includes(searchQuery);
        
        return matchesHonor && matchesDept && matchesYear && matchesSearch;
    });
    
    filteredData = filteredData.map((student, index) => ({
        ...student,
        rank: index + 1
    }));
    
    displayLeaderboard(filteredData);
}

async function loadDepartments() {
    try {
        const response = await fetch('http://localhost:3000/api/leaderboard/departments');
        const departments = await response.json();
        
        const select = document.getElementById('departmentFilterLeaderboard');
        const currentOptions = select.innerHTML;
        
        const departmentOptions = departments.map(dept => 
            `<option value="${dept.course_name}">${dept.course_name}</option>`
        ).join('');
        
        select.innerHTML = '<option value="">All Departments</option>' + departmentOptions;
        
    } catch (error) {
        console.error('Error loading departments:', error);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    loadLeaderboard();
    loadDepartments();
    
    document.getElementById('leaderboardSearch').addEventListener('input', filterLeaderboard);
    document.getElementById('honorFilter').addEventListener('change', filterLeaderboard);
    document.getElementById('departmentFilterLeaderboard').addEventListener('change', filterLeaderboard);
    document.getElementById('academicYearFilter').addEventListener('change', filterLeaderboard);
});

function logout() {
    localStorage.removeItem("loggedInUser");
    window.location.href = "login.html";
}