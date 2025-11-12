window.addEventListener("load", () => {
    loadTeacherInfo();
    loadTeacherClasses();
});

function loadTeacherInfo() {
    if (!loggedInUser || !loggedInUser.teacher_id) {
        return;
    }
    
    fetch(`http://localhost:3000/teacher/dashboard/${loggedInUser.teacher_id}`, { mode: "cors" })
        .then(response => response.json())
        .then(teacher => {
            teacherName = teacher.full_name;
        })
        .catch(error => {
            console.error("Error fetching teacher info:", error);
        });
}

const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
let currentSubjectId = null;
let currentSubjectName = null;
let currentSectionCode = null;
let studentGrades = [];
let teacherName = '';
let currentSemester = '1st';
let currentSubjectUnit = 0;

function loadTeacherClasses() {
    if (!loggedInUser || !loggedInUser.teacher_id) {
        showError("Please log in to view your classes");
        return;
    }

    const teacherId = loggedInUser.teacher_id;
    const link = `http://localhost:3000/teacher/classes/${teacherId}`;

    fetch(link, { mode: "cors" })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then((classes) => {
            displayClassCards(classes);
        })
        .catch((error) => {
            console.error("Error fetching classes:", error);
            showError("Failed to load classes. Please try again.");
        });
}

function displayClassCards(classes) {
    const container = document.getElementById('classCardsContainer');
    
    if (!classes || classes.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-book fa-3x text-muted mb-3"></i>
                <p class="text-muted">No classes assigned yet.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    
    const groupedClasses = {};
    classes.forEach(cls => {
        const key = `${cls.subject_code}-${cls.subject_name}`;
        if (!groupedClasses[key]) {
            groupedClasses[key] = {
                subject_id: cls.subject_id,
                subject_code: cls.subject_code,
                subject_name: cls.subject_name,
                total_students: 0,
                sections: [],
                school_year: cls.school_year
            };
        }
        groupedClasses[key].total_students += parseInt(cls.student_count) || 0;
        groupedClasses[key].sections.push(cls.sectionCode);
    });

    Object.values(groupedClasses).forEach(classData => {
        const card = `
            <div class="col-md-4 col-sm-6 mb-4">
                <div class="subject-card card h-100" data-year="${classData.school_year}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <span class="student-count-badge">
                                <i class="fas fa-users me-1"></i> ${classData.total_students} Students
                            </span>
                        </div>
                        <h4 class="card-title mb-3">${classData.subject_code} - ${classData.subject_name}</h4>
                        <div class="d-flex justify-content-between align-items-center mt-3">
                            <span class="text-muted small">
                                <i class="fas fa-layer-group me-1"></i> ${classData.sections.length} Section(s)
                            </span>
                            <button class="btn btn-sm btn-outline-primary view-class-btn" onclick="showClassDetail(${classData.subject_id}, '${classData.subject_code} - ${classData.subject_name}', ${classData.total_students})">
                                <i class="fas fa-arrow-right"></i> View
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML += card;
    });
}

function setActiveFilter(year) {
    const dropdownItems = document.querySelectorAll('#schoolYearFilterDropdown + .dropdown-menu .dropdown-item');
    dropdownItems.forEach(item => {
        item.classList.remove('active');
    });
    
    event.target.classList.add('active');
    filterByYear(year);
}

function showClassDetail(subjectId, subjectName, studentCount) {
    currentSubjectId = subjectId;
    currentSubjectName = subjectName;
    
    const classesView = document.getElementById('classes-list-view');
    const detailView = document.getElementById('class-detail-view');
    
    classesView.style.display = 'none';
    detailView.classList.add('active');
    
    document.getElementById('class-title').textContent = subjectName;
    document.getElementById('student-count').textContent = studentCount;
    
    loadSubjectUnit(subjectId);
    loadSections(subjectId);
    
    document.getElementById('searchInput').value = '';
    document.getElementById('searchInput').disabled = true;
    document.getElementById('schoolYearDisplay').value = '--';
    document.getElementById('noSectionMessage').style.display = 'block';
    document.getElementById('gradeTableContainer').style.display = 'none';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function loadSubjectUnit(subjectId) {
    const link = `http://localhost:3000/subject/${subjectId}`;
    
    fetch(link, { mode: "cors" })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then((subject) => {
            if (subject && subject.unit) {
                currentSubjectUnit = subject.unit;
                document.getElementById('subject-unit').textContent = subject.unit;
            }
        })
        .catch((error) => {
            console.error("Error fetching subject unit:", error);
            currentSubjectUnit = 0;
            document.getElementById('subject-unit').textContent = '--';
        });
}

function loadSections(subjectId) {
    if (!loggedInUser || !loggedInUser.teacher_id) {
        return;
    }

    const teacherId = loggedInUser.teacher_id;
    const link = `http://localhost:3000/teacher/subject/${subjectId}/sections/${teacherId}`;

    fetch(link, { mode: "cors" })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then((sections) => {
            populateSections(sections);
        })
        .catch((error) => {
            console.error("Error fetching sections:", error);
            showError("Failed to load sections.");
        });
}

function populateSections(sections) {
    const sectionFilter = document.getElementById('sectionFilter');
    sectionFilter.innerHTML = '<option value="">-- Select Section --</option>';
    
    const uniqueSections = [];
    const seenSections = new Set();
    
    sections.forEach(section => {
        if (!seenSections.has(section.sectionCode)) {
            seenSections.add(section.sectionCode);
            uniqueSections.push(section);
        }
    });
    
    uniqueSections.forEach(section => {
        const option = document.createElement('option');
        option.value = section.sectionCode;
        option.textContent = section.sectionCode;
        option.setAttribute('data-year', section.year_level_name || '--');
        option.setAttribute('data-count', section.student_count || 0);
        sectionFilter.appendChild(option);
    });
}

function onSectionChange() {
    const sectionFilter = document.getElementById('sectionFilter');
    const schoolYearDisplay = document.getElementById('schoolYearDisplay');
    const searchInput = document.getElementById('searchInput');
    const noSectionMessage = document.getElementById('noSectionMessage');
    const gradeTableContainer = document.getElementById('gradeTableContainer');
    
    if (sectionFilter.value) {
        currentSectionCode = sectionFilter.value;
        schoolYearDisplay.value = '2024-2025';
        searchInput.disabled = false;
        noSectionMessage.style.display = 'none';
        
        loadSectionGrades(currentSubjectId, currentSectionCode);
    } else {
        currentSectionCode = null;
        schoolYearDisplay.value = '--';
        searchInput.disabled = true;
        searchInput.value = '';
        noSectionMessage.style.display = 'block';
        gradeTableContainer.style.display = 'none';
    }
}

function loadSectionGrades(subjectId, sectionCode) {
    if (!loggedInUser || !loggedInUser.teacher_id) {
        return;
    }

    const teacherId = loggedInUser.teacher_id;
    const link = `http://localhost:3000/teacher/section-grades/${teacherId}/${subjectId}/${sectionCode}`;

    fetch(link, { mode: "cors" })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            const { students, encode, final_encode } = data;
            studentGrades = students;
            
            if (students && students.length > 0 && students[0].semester) {
                currentSemester = students[0].semester;
            }
            
            displayGradeTable(students, encode, final_encode);
        })
        .catch((error) => {
            console.error("Error fetching grades:", error);
            showError("Failed to load student grades.");
        });
}

function displayGradeTable(students, encode, final_encode) {
    const tbody = document.getElementById('gradeTableBody');
    const gradeTableContainer = document.getElementById('gradeTableContainer');
    
    const canEditMidterm = encode === 'on';
    const canEditFinal = final_encode === 'on';
    
    if (!students || students.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4">
                    <i class="fas fa-users-slash fa-2x text-muted mb-2"></i>
                    <p class="text-muted mb-0">No students enrolled in this section.</p>
                </td>
            </tr>
        `;
        gradeTableContainer.style.display = 'block';
        return;
    }

    tbody.innerHTML = '';
    
    students.forEach(student => {
        const midtermGrade = student.midterm_grade || '';
        const finalGrade = student.final_grade;
        
        let selectedValue = '';
        let remarksText = 'Incomplete';
        let remarksClass = 'status-incomplete';
        
        if (finalGrade !== null && finalGrade !== undefined && finalGrade !== '') {
            const finalGradeStr = finalGrade.toString();
            
            if (finalGradeStr === '0' || finalGradeStr === '0.00' || finalGradeStr === '0.0') {
                selectedValue = '0';
                remarksText = 'Dropped';
                remarksClass = 'status-drop';
            } else if (finalGradeStr === '6.00' || finalGradeStr === '6' || finalGradeStr === 'INC') {
                selectedValue = '6.00';
                remarksText = 'Incomplete';
                remarksClass = 'status-incomplete';
            } else if (parseFloat(finalGradeStr) >= 5.00) {
                selectedValue = parseFloat(finalGradeStr).toFixed(2);
                remarksText = 'Failed';
                remarksClass = 'status-failed';
            } else if (!isNaN(parseFloat(finalGradeStr))) {
                selectedValue = parseFloat(finalGradeStr).toFixed(2);
                remarksText = 'Passed';
                remarksClass = 'status-passed';
            } else {
                selectedValue = finalGradeStr;
                remarksText = 'Incomplete';
                remarksClass = 'status-incomplete';
            }
        }
        
        const row = `
            <tr data-student-id="${student.studentUser_id}" data-grade-id="${student.grade_id || ''}">
                <td class="student-id-cell">${student.student_id}</td>
                <td class="student-name-cell">${student.student_name}</td>
                <td>
                    <input type="number" 
                           class="form-control midterm-grade-input" 
                           value="${midtermGrade}" 
                           placeholder="${canEditMidterm ? '0-100' : 'Encoding disabled'}"
                           min="0" 
                           max="100"
                           step="0.01"
                           ${canEditMidterm ? '' : 'readonly'}
                           style="${canEditMidterm ? '' : 'background-color: #e9ecef; cursor: not-allowed;'}">
                </td>
                <td>
                    <select class="form-select final-grade" onchange="updateRemarks(this)" ${canEditFinal ? '' : 'disabled'} style="${canEditFinal ? '' : 'background-color: #e9ecef; cursor: not-allowed;'}">
                        <option value="">--</option>
                        <option value="1.00" ${selectedValue === '1.00' ? 'selected' : ''}>1.00</option>
                        <option value="1.25" ${selectedValue === '1.25' ? 'selected' : ''}>1.25</option>
                        <option value="1.50" ${selectedValue === '1.50' ? 'selected' : ''}>1.50</option>
                        <option value="1.75" ${selectedValue === '1.75' ? 'selected' : ''}>1.75</option>
                        <option value="2.00" ${selectedValue === '2.00' ? 'selected' : ''}>2.00</option>
                        <option value="2.25" ${selectedValue === '2.25' ? 'selected' : ''}>2.25</option>
                        <option value="2.50" ${selectedValue === '2.50' ? 'selected' : ''}>2.50</option>
                        <option value="2.75" ${selectedValue === '2.75' ? 'selected' : ''}>2.75</option>
                        <option value="3.00" ${selectedValue === '3.00' ? 'selected' : ''}>3.00</option>
                        <option value="5.00" ${selectedValue === '5.00' ? 'selected' : ''}>5.00</option>
                        <option value="6.00" ${selectedValue === '6.00' ? 'selected' : ''}>INC</option>
                        <option value="0" ${selectedValue === '0' ? 'selected' : ''}>0</option>
                    </select>
                </td>
                <td class="remarks-cell ${remarksClass}">${remarksText}</td>
            </tr>
        `;
        
        tbody.innerHTML += row;
    });
    
    const submitBtn = document.querySelector('#gradeTableContainer button[onclick="submitGrades()"]');
    if (submitBtn) {
        submitBtn.disabled = !canEditMidterm && !canEditFinal;
        if (!canEditMidterm && !canEditFinal) {
            submitBtn.style.cursor = 'not-allowed';
            submitBtn.style.opacity = '0.6';
        }
    }
    
    gradeTableContainer.style.display = 'block';
}

function updateRemarks(selectElement) {
    const row = selectElement.closest('tr');
    const remarksCell = row.querySelector('.remarks-cell');
    const gradeValue = selectElement.value;

    remarksCell.classList.remove('status-passed', 'status-failed', 'status-incomplete', 'status-drop');

    if (gradeValue === '' || gradeValue === '6.00') {
        remarksCell.textContent = 'Incomplete';
        remarksCell.classList.add('status-incomplete');
    } else if (gradeValue === '0') {
        remarksCell.textContent = 'Dropped';
        remarksCell.classList.add('status-drop');
    } else if (parseFloat(gradeValue) >= 5.00) {
        remarksCell.textContent = 'Failed';
        remarksCell.classList.add('status-failed');
    } else {
        remarksCell.textContent = 'Passed';
        remarksCell.classList.add('status-passed');
    }
}

function submitGrades() {
    if (!loggedInUser || !loggedInUser.teacher_id) {
        alert("Please log in to submit grades.");
        return;
    }

    const rows = document.querySelectorAll('#gradeTableBody tr');
    let hasEmpty = false;
    const gradesToSubmit = [];

    rows.forEach(row => {
        const studentId = row.getAttribute('data-student-id');
        const midterm = row.querySelector('.midterm-grade-input').value;
        const final = row.querySelector('.final-grade').value;

        if (!midterm || midterm === "" || !final || final === "") {
            hasEmpty = true;
        } else {
            let finalGradeValue;
            if (final === '6.00') {
                finalGradeValue = 6.00;
            } else if (final === '0') {
                finalGradeValue = 0;
            } else {
                finalGradeValue = parseFloat(final);
            }

            gradesToSubmit.push({
                studentUser_id: parseInt(studentId),
                subject_id: currentSubjectId,
                teacher_id: loggedInUser.teacher_id,
                midterm_grade: parseFloat(midterm),
                final_grade: finalGradeValue,
                academic_year: '2024-2025',
                semester: '1st'
            });
        }
    });

    if (hasEmpty) {
        if (!confirm("Some students have incomplete grades. Do you want to submit the grades anyway?")) {
            return;
        }
    }

    fetch('http://localhost:3000/teacher/grades/bulk-update', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ grades: gradesToSubmit })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert(`Grades submitted successfully! ${data.successCount} grade(s) updated.`);
            setTimeout(() => {
                loadSectionGrades(currentSubjectId, currentSectionCode);
            }, 1000);
        } else {
            alert(`Some grades failed to update. ${data.successCount} grade(s) were successful.`);
        }
    })
    .catch(error => {
        console.error("Error submitting grades:", error);
        alert("Failed to submit grades. Please try again.");
    });
}

function exportGrades() {
    if (!studentGrades || studentGrades.length === 0) {
        alert("No grades to export.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const subjectCode = currentSubjectName.split(' - ')[0];
    const fileName = `${subjectCode}_${currentSectionCode}.pdf`;
    
    doc.setFontSize(16);
    doc.text('Grade Report', 105, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Subject: ${currentSubjectName}`, 14, 25);
    doc.text(`Units: ${currentSubjectUnit}`, 14, 32);
    doc.text(`Section: ${currentSectionCode}`, 14, 39);
    doc.text(`Teacher: ${teacherName || 'N/A'}`, 14, 46);
    doc.text(`Semester: ${currentSemester}`, 14, 53);
    doc.text(`Academic Year: 2024-2025`, 14, 60);
    
    const tableData = [];
    const rows = document.querySelectorAll('#gradeTableBody tr');
    
    rows.forEach(row => {
        const studentId = row.querySelector('.student-id-cell').textContent;
        const studentName = row.querySelector('.student-name-cell').textContent;
        const midterm = row.querySelector('.midterm-grade-input').value || '--';
        const finalSelect = row.querySelector('.final-grade');
        const finalValue = finalSelect.value;
        const final = finalValue === '6.00' ? 'INC' : (finalValue || '--');
        const remarks = row.querySelector('.remarks-cell').textContent;
        
        const student = studentGrades.find(s => s.student_id === studentId);
        const yearLevel = student ? student.year_level_name : '--';
        
        tableData.push([studentId, studentName, yearLevel, midterm, final, remarks]);
    });
    
    doc.autoTable({
        head: [['Student ID', 'Name', 'Year Level', 'Midterm', 'Final', 'Remarks']],
        body: tableData,
        startY: 67,
        theme: 'striped',
        headStyles: { fillColor: [128, 0, 0] },
        styles: { fontSize: 10 },
        columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 50 },
            2: { cellWidth: 25 },
            3: { cellWidth: 20 },
            4: { cellWidth: 20 },
            5: { cellWidth: 25 }
        }
    });
    
    doc.save(fileName);
}

function backToClasses() {
    const classesView = document.getElementById('classes-list-view');
    const detailView = document.getElementById('class-detail-view');
    
    detailView.classList.remove('active');
    classesView.style.display = 'block';
    
    currentSubjectId = null;
    currentSubjectName = null;
    currentSectionCode = null;
    studentGrades = [];
    currentSubjectUnit = 0;
    
    document.getElementById('sectionFilter').innerHTML = '<option value="">-- Select Section --</option>';
    document.getElementById('schoolYearDisplay').value = '--';
    document.getElementById('searchInput').value = '';
    document.getElementById('searchInput').disabled = true;
    document.getElementById('subject-unit').textContent = '--';
    document.getElementById('noSectionMessage').style.display = 'block';
    document.getElementById('gradeTableContainer').style.display = 'none';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function filterByYear(year) {
    const cards = document.querySelectorAll('.subject-card');
    const container = document.getElementById('classCardsContainer');
    let visibleCount = 0;
    
    const existingNoResults = container.querySelector('.no-results-message');
    if (existingNoResults) {
        existingNoResults.remove();
    }
    
    cards.forEach(card => {
        const cardYear = card.getAttribute('data-year');
        
        if (year === 'all' || cardYear === year) {
            card.parentElement.style.display = '';
            visibleCount++;
        } else {
            card.parentElement.style.display = 'none';
        }
    });
    
    if (visibleCount === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'col-12 text-center py-5 no-results-message';
        noResults.innerHTML = `
            <i class="fas fa-book fa-3x text-muted mb-3"></i>
            <p class="text-muted">No classes found for the selected school year.</p>
        `;
        container.appendChild(noResults);
    }
}

function filterStudents() {
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    const tbody = document.getElementById('gradeTableBody');
    const rows = tbody.getElementsByTagName('tr');
    
    for (let i = 0; i < rows.length; i++) {
        const idCell = rows[i].getElementsByClassName('student-id-cell')[0];
        const nameCell = rows[i].getElementsByClassName('student-name-cell')[0];
        
        if (idCell && nameCell) {
            const id = idCell.textContent.toLowerCase();
            const name = nameCell.textContent.toLowerCase();
            
            if (id.includes(searchQuery) || name.includes(searchQuery)) {
                rows[i].style.display = '';
            } else {
                rows[i].style.display = 'none';
            }
        }
    }
}

function showError(message) {
    const container = document.getElementById('classCardsContainer');
    container.innerHTML = `
        <div class="col-12">
            <div class="alert alert-danger" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i>
                ${message}
            </div>
        </div>
    `;
}

window.showClassDetail = showClassDetail;
window.backToClasses = backToClasses;
window.filterByYear = filterByYear;
window.onSectionChange = onSectionChange;
window.updateRemarks = updateRemarks;
window.submitGrades = submitGrades;
window.exportGrades = exportGrades;
window.filterStudents = filterStudents;