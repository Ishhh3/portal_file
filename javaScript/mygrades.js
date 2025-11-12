window.addEventListener("load", () => {
    loadGrades();
});

const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));

function logout() {
    localStorage.removeItem('loggedInUser');
    window.location.href = 'login.html';
}

function loadGrades() {
    if (!loggedInUser || !loggedInUser.student_id) {
        window.location.href = 'login.html';
        return;
    }

    const url = `http://localhost:3000/student/grades/${loggedInUser.student_id}`;

    fetch(url, { mode: "cors" })
        .then((response) => response.json())
        .then((grades) => {
            displayGrades(grades);
            populateFilters(grades);
        })
        .catch((error) => {
            console.log("Error fetching grades:", error);
            displayError();
        });
}

function displayGrades(grades) {
    const tableBody = document.getElementById('gradesTableBody');
    
    if (grades.length === 0) {
        tableBody.innerHTML = '';
        showNoResults();
        return;
    }

    tableBody.innerHTML = grades.map(grade => {
        let remark = 'Incomplete';
        let remarkClass = 'grade-incomplete';
        
        if (grade.final_grade && grade.final_grade >= 1.00 && grade.final_grade <= 3.00) {
            remark = 'Passed';
            remarkClass = 'grade-passed';
        } else if (grade.final_grade && grade.final_grade === 5.00) {
            remark = 'Failed';
            remarkClass = 'grade-incomplete';
        }

        const midterm = grade.midterm_grade !== null ? grade.midterm_grade : 0;
        const finals = grade.final_grade !== null ? parseFloat(grade.final_grade).toFixed(2) : '0.00';

        return `
            <tr data-year="${grade.academic_year}" data-semester="${grade.semester.toUpperCase()}">
                <td class="subject-code">${grade.subject_code}</td>
                <td>${grade.subject_name}</td>
                <td>${midterm}</td>
                <td>${finals}</td>
                <td class="${remarkClass}">${remark}</td>
            </tr>
        `;
    }).join('');

    hideNoResults();
}

function populateFilters(grades) {
    const yearFilter = document.getElementById('yearFilter');
    const semesterFilter = document.getElementById('semesterFilter');
    
    const years = [...new Set(grades.map(g => g.academic_year))];
    const semesters = [...new Set(grades.map(g => g.semester.toUpperCase()))];
    
    yearFilter.innerHTML = '<option value="">All Years</option>';
    years.forEach(year => {
        if (year) {
            yearFilter.innerHTML += `<option value="${year}">${year}</option>`;
        }
    });
    
    semesterFilter.innerHTML = '<option value="">All Semesters</option>';
    semesters.forEach(semester => {
        if (semester) {
            semesterFilter.innerHTML += `<option value="${semester}">${semester}</option>`;
        }
    });
}

function filterGrades() {
    const yearFilter = document.getElementById('yearFilter').value;
    const semesterFilter = document.getElementById('semesterFilter').value;
    const rows = document.querySelectorAll('#gradesTableBody tr');
    let visibleCount = 0;

    rows.forEach(row => {
        const rowYear = row.getAttribute('data-year');
        const rowSemester = row.getAttribute('data-semester');
        
        const matchesYear = !yearFilter || rowYear === yearFilter;
        const matchesSemester = !semesterFilter || rowSemester === semesterFilter;
        
        if (matchesYear && matchesSemester) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });

    if (visibleCount === 0) {
        showNoResults();
    } else {
        hideNoResults();
    }
}

function resetFilters() {
    document.getElementById('yearFilter').value = '';
    document.getElementById('semesterFilter').value = '';
    filterGrades();
}

function showNoResults() {
    document.getElementById('noResultsMessage').style.display = 'block';
    document.getElementById('gradesTable').style.display = 'none';
}

function hideNoResults() {
    document.getElementById('noResultsMessage').style.display = 'none';
    document.getElementById('gradesTable').style.display = 'table';
}

function displayError() {
    const tableBody = document.getElementById('gradesTableBody');
    tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center text-danger py-5">
                <i class="fas fa-exclamation-circle fa-3x mb-3"></i>
                <p>Error loading grades. Please try again later.</p>
            </td>
        </tr>
    `;
}

document.getElementById('yearFilter').addEventListener('change', filterGrades);
document.getElementById('semesterFilter').addEventListener('change', filterGrades);