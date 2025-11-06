const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));

let allTeachers = [];
let allDepartments = [];
let currentTeacherId = null;
let currentTeacherName = null;
let currentSubjectId = null;
let currentSubjectName = null;
let currentSections = [];

window.addEventListener("load", () => {
    checkAuth();
    loadTeachers();
    loadDepartments();
    initializeEventListeners();
});

function checkAuth() {
    if (!loggedInUser || loggedInUser.role !== 'admin') {
        console.log("No admin logged in, redirecting to login");
        window.location.href = "login.html";
        return;
    }
}

function initializeEventListeners() {
    const searchInput = document.getElementById('teacherSearch');
    if (searchInput) {
        searchInput.addEventListener('input', filterTeachers);
    }

    const departmentFilter = document.getElementById('departmentFilter');
    if (departmentFilter) {
        departmentFilter.addEventListener('change', filterTeachers);
    }

    const resetButton = document.getElementById('resetTeacherFilters');
    if (resetButton) {
        resetButton.addEventListener('click', resetFilters);
    }

    const bulkToggle = document.getElementById('enableEncodingToggle');
    if (bulkToggle) {
        bulkToggle.addEventListener('change', handleBulkEncodingToggle);
    }

    const bulkFinalToggle = document.getElementById('enableFinalEncodingToggle');
    if (bulkFinalToggle) {
        bulkFinalToggle.addEventListener('change', handleBulkFinalEncodingToggle);
    }
}

async function loadTeachers() {
    try {
        const response = await fetch('http://localhost:3000/admin/teachers', {
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        allTeachers = await response.json();
        console.log('Teachers loaded:', allTeachers);
        filterTeachers();
        updateBulkToggleState();
        updateBulkFinalToggleState();
    } catch (error) {
        console.error('Error loading teachers:', error);
        showAlert('Error loading teachers data', 'danger');
    }
}

async function loadDepartments() {
    try {
        const response = await fetch('http://localhost:3000/admin/departments', {
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        allDepartments = await response.json();
        console.log('Departments loaded:', allDepartments);
        populateDepartmentFilter();
    } catch (error) {
        console.error('Error loading departments:', error);
    }
}

function populateDepartmentFilter() {
    const departmentFilter = document.getElementById('departmentFilter');
    if (!departmentFilter) return;

    departmentFilter.innerHTML = '<option value="">All Active Teachers</option>';

    allDepartments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept.department_name;
        option.textContent = dept.department_name;
        departmentFilter.appendChild(option);
    });

    const archivedOption = document.createElement('option');
    archivedOption.value = 'archived';
    archivedOption.textContent = 'Archived Teachers';
    departmentFilter.appendChild(archivedOption);
}

function renderTeachers(teachers) {
    const tbody = document.querySelector('#teachersTable tbody');
    if (!tbody) return;

    if (teachers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No teachers found</td></tr>';
        return;
    }

    tbody.innerHTML = teachers.map(teacher => {
        const isEnabled = teacher.encode === 'on';
        const isFinalEnabled = teacher.final_encode === 'on';
        const isArchived = teacher.archive === 'on';

        return `
            <tr data-teacher-id="${teacher.teacher_id}" 
                data-encoding-enabled="${isEnabled}" 
                data-final-encoding-enabled="${isFinalEnabled}"
                data-archived="${isArchived}">
                <td>${teacher.teacherUser_id}</td>
                <td>
                    <a href="#" class="teacher-name" onclick="showTeacherClasses(${teacher.teacher_id}, '${teacher.full_name}'); return false;">
                        ${teacher.full_name}
                    </a>
                </td>
                <td>${teacher.department_name}</td>
                <td>${teacher.email || 'N/A'}</td>
                <td>
                    <button class="btn btn-sm ${isEnabled ? 'btn-success' : 'btn-danger'} encoding-btn me-1" 
                            onclick="toggleEncoding(this, ${teacher.teacher_id})" 
                            title="${isEnabled ? 'Midterm Encoding Enabled' : 'Midterm Encoding Disabled'}">
                        <i class="bi ${isEnabled ? 'bi-unlock-fill' : 'bi-lock-fill'}"></i> 
                        M: ${isEnabled ? 'On' : 'Off'}
                    </button>
                    <button class="btn btn-sm ${isFinalEnabled ? 'btn-success' : 'btn-danger'} final-encoding-btn me-1" 
                            onclick="toggleFinalEncoding(this, ${teacher.teacher_id})" 
                            title="${isFinalEnabled ? 'Final Encoding Enabled' : 'Final Encoding Disabled'}">
                        <i class="bi ${isFinalEnabled ? 'bi-unlock-fill' : 'bi-lock-fill'}"></i> 
                        F: ${isFinalEnabled ? 'On' : 'Off'}
                    </button>
                    ${isArchived ? 
                        `<button class="btn btn-sm btn-warning" onclick="unarchiveTeacher(${teacher.teacher_id})">
                            <i class="bi bi-arrow-counterclockwise"></i> Unarchive
                        </button>` :
                        `<button class="btn btn-sm btn-secondary" onclick="archiveTeacher(${teacher.teacher_id})">
                            <i class="bi bi-archive"></i> Archive
                        </button>`
                    }
                </td>
            </tr>
        `;
    }).join('');
}

function filterTeachers() {
    const searchValue = document.getElementById('teacherSearch')?.value.toLowerCase() || '';
    const departmentValue = document.getElementById('departmentFilter')?.value || '';

    let filtered = allTeachers.filter(teacher => {
        const matchesSearch = 
            teacher.teacherUser_id.toLowerCase().includes(searchValue) ||
            teacher.full_name.toLowerCase().includes(searchValue) ||
            teacher.email?.toLowerCase().includes(searchValue);

        let matchesDepartment = true;
        if (departmentValue === 'archived') {
            matchesDepartment = teacher.archive === 'on';
        } else if (departmentValue) {
            matchesDepartment = teacher.department_name === departmentValue && teacher.archive !== 'on';
        } else {
            matchesDepartment = teacher.archive !== 'on';
        }

        return matchesSearch && matchesDepartment;
    });

    renderTeachers(filtered);
}

function resetFilters() {
    document.getElementById('teacherSearch').value = '';
    document.getElementById('departmentFilter').value = '';
    renderTeachers(allTeachers.filter(t => t.archive !== 'on'));
}

function updateBulkToggleState() {
    const bulkToggle = document.getElementById('enableEncodingToggle');
    if (!bulkToggle) return;

    const hasAnyEnabled = allTeachers.some(teacher => 
        teacher.archive !== 'on' && teacher.encode === 'on'
    );

    bulkToggle.removeEventListener('change', handleBulkEncodingToggle);
    bulkToggle.checked = hasAnyEnabled;
    bulkToggle.addEventListener('change', handleBulkEncodingToggle);
}

function updateBulkFinalToggleState() {
    const bulkFinalToggle = document.getElementById('enableFinalEncodingToggle');
    if (!bulkFinalToggle) return;

    const hasAnyEnabled = allTeachers.some(teacher => 
        teacher.archive !== 'on' && teacher.final_encode === 'on'
    );

    bulkFinalToggle.removeEventListener('change', handleBulkFinalEncodingToggle);
    bulkFinalToggle.checked = hasAnyEnabled;
    bulkFinalToggle.addEventListener('change', handleBulkFinalEncodingToggle);
}

async function toggleEncoding(button, teacherId) {
    const row = button.closest('tr');
    const currentStatus = row.dataset.encodingEnabled === 'true';
    const newStatus = !currentStatus;

    try {
        const response = await fetch(`http://localhost:3000/admin/toggle-encoding/${teacherId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                enabled: newStatus
            }),
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Toggle result:', result);

        row.dataset.encodingEnabled = newStatus;
        const teacher = allTeachers.find(t => t.teacher_id === teacherId);
        if (teacher) {
            teacher.encode = newStatus ? 'on' : 'off';
        }

        updateEncodingButton(button, newStatus);
        updateBulkToggleState();

        showAlert(`Midterm encoding ${newStatus ? 'enabled' : 'disabled'} successfully`, 'success');
    } catch (error) {
        console.error('Error toggling encoding:', error);
        showAlert('Error updating midterm encoding status', 'danger');
    }
}

async function toggleFinalEncoding(button, teacherId) {
    const row = button.closest('tr');
    const currentStatus = row.dataset.finalEncodingEnabled === 'true';
    const newStatus = !currentStatus;

    try {
        const response = await fetch(`http://localhost:3000/admin/toggle-final-encoding/${teacherId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                enabled: newStatus
            }),
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Toggle final result:', result);

        row.dataset.finalEncodingEnabled = newStatus;
        const teacher = allTeachers.find(t => t.teacher_id === teacherId);
        if (teacher) {
            teacher.final_encode = newStatus ? 'on' : 'off';
        }

        updateFinalEncodingButton(button, newStatus);
        updateBulkFinalToggleState();

        showAlert(`Final encoding ${newStatus ? 'enabled' : 'disabled'} successfully`, 'success');
    } catch (error) {
        console.error('Error toggling final encoding:', error);
        showAlert('Error updating final encoding status', 'danger');
    }
}

function updateEncodingButton(button, isEnabled) {
    button.className = `btn btn-sm ${isEnabled ? 'btn-success' : 'btn-danger'} encoding-btn me-1`;
    button.title = isEnabled ? 'Midterm Encoding Enabled' : 'Midterm Encoding Disabled';
    button.innerHTML = `<i class="bi ${isEnabled ? 'bi-unlock-fill' : 'bi-lock-fill'}"></i> M: ${isEnabled ? 'On' : 'Off'}`;
}

function updateFinalEncodingButton(button, isEnabled) {
    button.className = `btn btn-sm ${isEnabled ? 'btn-success' : 'btn-danger'} final-encoding-btn me-1`;
    button.title = isEnabled ? 'Final Encoding Enabled' : 'Final Encoding Disabled';
    button.innerHTML = `<i class="bi ${isEnabled ? 'bi-unlock-fill' : 'bi-lock-fill'}"></i> F: ${isEnabled ? 'On' : 'Off'}`;
}

async function handleBulkEncodingToggle(event) {
    const enabled = event.target.checked;
    
    const teacherIds = allTeachers
        .filter(t => t.archive !== 'on')
        .map(t => t.teacher_id);

    if (teacherIds.length === 0) {
        showAlert('No active teachers to update', 'warning');
        event.target.checked = !enabled;
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/admin/toggle-encoding-bulk', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                teacherIds: teacherIds,
                enabled: enabled
            }),
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Bulk toggle result:', result);

        allTeachers.forEach(teacher => {
            if (teacher.archive !== 'on') {
                teacher.encode = enabled ? 'on' : 'off';
            }
        });

        filterTeachers();

        showAlert(`Midterm encoding ${enabled ? 'enabled' : 'disabled'} for all active teachers`, 'success');
    } catch (error) {
        console.error('Error in bulk toggle:', error);
        showAlert('Error updating midterm encoding status', 'danger');
        event.target.checked = !enabled;
    }
}

async function handleBulkFinalEncodingToggle(event) {
    const enabled = event.target.checked;
    
    const teacherIds = allTeachers
        .filter(t => t.archive !== 'on')
        .map(t => t.teacher_id);

    if (teacherIds.length === 0) {
        showAlert('No active teachers to update', 'warning');
        event.target.checked = !enabled;
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/admin/toggle-final-encoding-bulk', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                teacherIds: teacherIds,
                enabled: enabled
            }),
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Bulk final toggle result:', result);

        allTeachers.forEach(teacher => {
            if (teacher.archive !== 'on') {
                teacher.final_encode = enabled ? 'on' : 'off';
            }
        });

        filterTeachers();

        showAlert(`Final encoding ${enabled ? 'enabled' : 'disabled'} for all active teachers`, 'success');
    } catch (error) {
        console.error('Error in bulk final toggle:', error);
        showAlert('Error updating final encoding status', 'danger');
        event.target.checked = !enabled;
    }
}

async function archiveTeacher(teacherId) {
    if (!confirm('Are you sure you want to archive this teacher?')) {
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/admin/archive-teacher', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                teacherId: teacherId
            }),
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Archive result:', result);

        const teacher = allTeachers.find(t => t.teacher_id === teacherId);
        if (teacher) {
            teacher.archive = 'on';
        }

        filterTeachers();

        showAlert('Teacher archived successfully', 'success');
    } catch (error) {
        console.error('Error archiving teacher:', error);
        showAlert('Error archiving teacher', 'danger');
    }
}

async function unarchiveTeacher(teacherId) {
    if (!confirm('Are you sure you want to unarchive this teacher?')) {
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/admin/unarchive-teacher', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                teacherId: teacherId
            }),
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const teacher = allTeachers.find(t => t.teacher_id === teacherId);
        if (teacher) {
            teacher.archive = 'off';
        }

        filterTeachers();
        showAlert('Teacher unarchived successfully', 'success');
    } catch (error) {
        console.error('Error unarchiving teacher:', error);
        showAlert('Error unarchiving teacher', 'danger');
    }
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
    alertDiv.style.zIndex = '9999';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");

    if (sidebar) sidebar.classList.toggle("active");
    if (overlay) overlay.classList.toggle("active");
}

function closeSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");

    if (sidebar) sidebar.classList.remove("active");
    if (overlay) overlay.classList.remove("active");
}

function logout() {
    localStorage.removeItem("loggedInUser");
    window.location.href = "login.html";
}

function printModalContent() {
    window.print();
}

async function showTeacherClasses(teacherId, teacherName) {
    currentTeacherId = teacherId;
    currentTeacherName = teacherName;
    
    document.getElementById('teacherNameDisplay').textContent = teacherName;
    
    const modal = new bootstrap.Modal(document.getElementById('teacherClassesModal'));
    modal.show();
    
    await loadTeacherClasses(teacherId);
}

async function loadTeacherClasses(teacherId) {
    const tbody = document.getElementById('teacherClassesTableBody');
    tbody.innerHTML = '<tr><td colspan="3" class="text-center"><div class="spinner-border text-maroon" role="status"></div></td></tr>';
    
    try {
        const response = await fetch(`http://localhost:3000/admin/teacher-classes/${teacherId}`, {
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const classes = await response.json();
        console.log('Teacher classes:', classes);
        
        if (classes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No classes assigned</td></tr>';
            return;
        }
        
        const groupedClasses = {};
        classes.forEach(cls => {
            const key = `${cls.subject_code}-${cls.subject_id}`;
            if (!groupedClasses[key]) {
                groupedClasses[key] = {
                    subject_id: cls.subject_id,
                    subject_code: cls.subject_code,
                    subject_name: cls.subject_name,
                    sections: [],
                    total_students: 0
                };
            }
            groupedClasses[key].sections.push(cls.sectionCode);
            groupedClasses[key].total_students += parseInt(cls.student_count) || 0;
        });
        
        tbody.innerHTML = Object.values(groupedClasses).map(cls => `
            <tr>
                <td><strong>${cls.subject_code}</strong></td>
                <td>${cls.subject_name} <span class="text-muted">(${cls.sections.length} section${cls.sections.length > 1 ? 's' : ''})</span></td>
                <td>
                    <button class="btn btn-maroon btn-sm" onclick="viewClassStudents(${cls.subject_id}, '${cls.subject_name}', '${cls.subject_code}')">
                        <i class="bi bi-eye"></i> View Students
                        <span class="badge bg-light text-dark ms-1">${cls.total_students}</span>
                    </button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading teacher classes:', error);
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Error loading classes</td></tr>';
    }
}

async function viewClassStudents(subjectId, subjectName, subjectCode) {
    currentSubjectId = subjectId;
    currentSubjectName = subjectName;
    
    document.getElementById('studentsModalTitle').textContent = `${subjectCode} - ${subjectName}`;
    
    const studentsModal = new bootstrap.Modal(document.getElementById('studentsListModal'));
    studentsModal.show();
    
    await loadSubjectSections(subjectId);
}

async function loadSubjectSections(subjectId) {
    const sectionContainer = document.getElementById('sectionSelectContainer');
    const sectionSelect = document.getElementById('studentsSectionSelect');
    const tbody = document.getElementById('studentsListTableBody');
    
    tbody.innerHTML = '<tr><td colspan="4" class="text-center"><div class="spinner-border text-maroon spinner-border-sm"></div> Loading...</td></tr>';
    
    try {
        const response = await fetch(`http://localhost:3000/admin/teacher-sections/${currentTeacherId}/${subjectId}`, {
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        currentSections = await response.json();
        console.log('Sections:', currentSections);
        
        if (currentSections.length === 0) {
            sectionContainer.style.display = 'none';
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No sections available</td></tr>';
            return;
        }
        
        if (currentSections.length === 1) {
            sectionContainer.style.display = 'none';
            await loadSectionStudents(currentTeacherId, subjectId, currentSections[0].sectionCode);
        } else {
            sectionContainer.style.display = 'block';
            sectionSelect.innerHTML = '<option value="">Select a section</option>' + 
                currentSections.map(section => 
                    `<option value="${section.sectionCode}">${section.sectionCode} (${section.student_count} students)</option>`
                ).join('');
            
            sectionSelect.onchange = function() {
                if (this.value) {
                    loadSectionStudents(currentTeacherId, subjectId, this.value);
                } else {
                    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Select a section to view students</td></tr>';
                }
            };
            
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Select a section to view students</td></tr>';
        }
        
    } catch (error) {
        console.error('Error loading sections:', error);
        sectionContainer.style.display = 'none';
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error loading sections</td></tr>';
    }
}

async function loadSectionStudents(teacherId, subjectId, sectionCode) {
    const tbody = document.getElementById('studentsListTableBody');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center"><div class="spinner-border spinner-border-sm text-maroon"></div> Loading students...</td></tr>';
    
    try {
        const response = await fetch(`http://localhost:3000/admin/class-students/${teacherId}/${subjectId}/${sectionCode}`, {
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const students = await response.json();
        console.log('Students:', students);
        
        if (students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No students enrolled in this section</td></tr>';
            return;
        }
        
        tbody.innerHTML = students.map((student, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${student.student_name}</td>
                <td>${student.midterm_grade !== null ? student.midterm_grade : '<span class="text-muted">-</span>'}</td>
                <td>${student.final_grade !== null ? student.final_grade : '<span class="text-muted">-</span>'}</td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading students:', error);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error loading students</td></tr>';
    }
}