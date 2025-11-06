const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));

let allTeachers = [];
let allDepartments = [];
let currentTeacherId = null;
let currentTeacherName = null;
let currentSubjectId = null;
let currentSubjectName = null;
let currentSections = [];

async function handleDashboardMidtermToggle(event) {
    const enabled = event.target.checked;
    console.log('Dashboard Midterm Toggle clicked:', enabled);
    
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
                encodingType: 'midterm',
                enabled: enabled
            }),
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Midterm encoding bulk update result:', result);

        allTeachers.forEach(teacher => {
            if (teacher.archive !== 'on') {
                teacher.encode = enabled ? 'on' : 'off';
            }
        });

        console.log('Updated teachers (midterm):', allTeachers.map(t => ({ id: t.teacher_id, encode: t.encode, final_encode: t.final_encode })));

        loadTeachers();

        showAlert(`Midterm encoding ${enabled ? 'enabled' : 'disabled'} for all active teachers`, 'success');
    } catch (error) {
        console.error('Error in midterm bulk toggle:', error);
        showAlert('Error updating midterm encoding status', 'danger');
        event.target.checked = !enabled;
    }
}

async function handleDashboardFinalToggle(event) {
    const enabled = event.target.checked;
    console.log('Dashboard Final Toggle clicked:', enabled);
    
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
                encodingType: 'final',
                enabled: enabled
            }),
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Final encoding bulk update result:', result);

        allTeachers.forEach(teacher => {
            if (teacher.archive !== 'on') {
                teacher.final_encode = enabled ? 'on' : 'off';
            }
        });

        console.log('Updated teachers (final):', allTeachers.map(t => ({ id: t.teacher_id, encode: t.encode, final_encode: t.final_encode })));

        loadTeachers();

        showAlert(`Final encoding ${enabled ? 'enabled' : 'disabled'} for all active teachers`, 'success');
    } catch (error) {
        console.error('Error in final bulk toggle:', error);
        showAlert('Error updating final encoding status', 'danger');
        event.target.checked = !enabled;
    }
}

window.addEventListener("load", () => {
    checkAuth();
    loadDashboardData();
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

async function loadDashboardData() {
    try {
        const adminResponse = await fetch(`http://localhost:3000/admin/dashboard/${loggedInUser.admin_id}`, {
            mode: 'cors'
        });

        if (adminResponse.ok) {
            const adminData = await adminResponse.json();
            console.log('Admin data loaded:', adminData);
            updateAdminProfile(adminData);
        }

        const statsResponse = await fetch('http://localhost:3000/admin/stats', {
            mode: 'cors'
        });

        if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            console.log('Stats data loaded:', statsData);
            updateDashboardStats(statsData);
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

function updateAdminProfile(adminData) {
    const profileCard = document.querySelector('.dashboard-card');
    if (profileCard) {
        const nameElement = profileCard.querySelector('h5');
        const idElement = profileCard.querySelectorAll('p')[0];
        const positionElement = profileCard.querySelectorAll('p')[1];

        if (nameElement) nameElement.textContent = adminData.full_name || 'ADMINISTRATOR';
        if (idElement) idElement.textContent = `Admin ID: ${adminData.adminuser_id || 'N/A'}`;
        if (positionElement) positionElement.textContent = `Position: ${adminData.postion || 'Admin'}`;
    }
}

function updateDashboardStats(statsData) {
    const statsCards = document.querySelectorAll('.stat-card');
    
    if (statsCards.length >= 3) {
        const studentsCount = statsCards[0].querySelector('h2');
        if (studentsCount) studentsCount.textContent = statsData.total_students || 0;

        const teachersCount = statsCards[1].querySelector('h2');
        if (teachersCount) teachersCount.textContent = statsData.total_teachers || 0;

        const announcementsCount = statsCards[2].querySelector('h2');
        if (announcementsCount) announcementsCount.textContent = statsData.total_announcements || 0;
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
        bulkToggle.addEventListener('change', (e) => handleBulkEncodingToggle(e, 'midterm'));
    }

    const bulkFinalToggle = document.getElementById('enableFinalEncodingToggle');
    if (bulkFinalToggle) {
        bulkFinalToggle.addEventListener('change', (e) => handleBulkEncodingToggle(e, 'final'));
    }

    const sectionSelect = document.getElementById('sectionSelect');
    if (sectionSelect) {
        sectionSelect.addEventListener('change', handleSectionChange);
    }

    const midtermEncodingSwitch = document.getElementById('midtermEncodingSwitch');
    if (midtermEncodingSwitch) {
        midtermEncodingSwitch.addEventListener('change', handleDashboardMidtermToggle);
        console.log('Midterm switch event listener added');
    }

    const finalEncodingSwitch = document.getElementById('finalEncodingSwitch');
    if (finalEncodingSwitch) {
        finalEncodingSwitch.addEventListener('change', handleDashboardFinalToggle);
        console.log('Final switch event listener added');
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
        renderTeachers(allTeachers);
        updateBulkToggleState();
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
        const isMidtermEnabled = teacher.encode === 'on';
        const isFinalEnabled = teacher.final_encode === 'on';
        const isArchived = teacher.archive === 'on';

        return `
            <tr data-teacher-id="${teacher.teacher_id}" 
                data-midterm-encoding="${isMidtermEnabled}" 
                data-final-encoding="${isFinalEnabled}"
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
                    <button class="btn btn-sm ${isMidtermEnabled ? 'btn-success' : 'btn-danger'} encoding-btn me-1" 
                            onclick="toggleEncoding(this, ${teacher.teacher_id}, 'midterm')" 
                            title="Midterm ${isMidtermEnabled ? 'Enabled' : 'Disabled'}">
                        <i class="bi ${isMidtermEnabled ? 'bi-unlock-fill' : 'bi-lock-fill'}"></i> 
                        M: ${isMidtermEnabled ? 'On' : 'Off'}
                    </button>
                    <button class="btn btn-sm ${isFinalEnabled ? 'btn-success' : 'btn-danger'} encoding-btn me-1" 
                            onclick="toggleEncoding(this, ${teacher.teacher_id}, 'final')" 
                            title="Final ${isFinalEnabled ? 'Enabled' : 'Disabled'}">
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
    const midtermToggle = document.getElementById('enableEncodingToggle');
    const finalToggle = document.getElementById('enableFinalEncodingToggle');
    const midtermEncodingSwitch = document.getElementById('midtermEncodingSwitch');
    const finalEncodingSwitch = document.getElementById('finalEncodingSwitch');
    
    const hasAnyMidtermEnabled = allTeachers.some(teacher => 
        teacher.archive !== 'on' && teacher.encode === 'on'
    );

    const hasAnyFinalEnabled = allTeachers.some(teacher => 
        teacher.archive !== 'on' && teacher.final_encode === 'on'
    );

    console.log('updateBulkToggleState - Midterm enabled:', hasAnyMidtermEnabled, 'Final enabled:', hasAnyFinalEnabled);

    if (midtermToggle) {
        midtermToggle.removeEventListener('change', (e) => handleBulkEncodingToggle(e, 'midterm'));
        midtermToggle.checked = hasAnyMidtermEnabled;
        midtermToggle.addEventListener('change', (e) => handleBulkEncodingToggle(e, 'midterm'));
    }

    if (finalToggle) {
        finalToggle.removeEventListener('change', (e) => handleBulkEncodingToggle(e, 'final'));
        finalToggle.checked = hasAnyFinalEnabled;
        finalToggle.addEventListener('change', (e) => handleBulkEncodingToggle(e, 'final'));
    }

    if (midtermEncodingSwitch) {
        midtermEncodingSwitch.checked = hasAnyMidtermEnabled;
    }

    if (finalEncodingSwitch) {
        finalEncodingSwitch.checked = hasAnyFinalEnabled;
    }
}

async function showTeacherClasses(teacherId, teacherName) {
    currentTeacherId = teacherId;
    currentTeacherName = teacherName;

    const modalTitle = document.getElementById('teacherClassesModalLabel');
    if (modalTitle) {
        modalTitle.textContent = `Classes for ${teacherName}`;
    }

    try {
        const response = await fetch(`http://localhost:3000/admin/teacher-classes/${teacherId}`, {
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const classes = await response.json();
        console.log('Classes loaded:', classes);
        renderTeacherClasses(classes);

        const modal = new bootstrap.Modal(document.getElementById('teacherClassesModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading teacher classes:', error);
        showAlert('Error loading teacher classes', 'danger');
    }
}

function renderTeacherClasses(classes) {
    const tbody = document.getElementById('teacherClassesTableBody');
    if (!tbody) return;

    if (classes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">No classes assigned to this teacher.</td></tr>';
        return;
    }

    tbody.innerHTML = classes.map(cls => `
        <tr>
            <td>${cls.sectionCode}</td>
            <td>${cls.subject_name} (${cls.subject_code}) - ${cls.department_name}<br>
                <small class="text-muted">${cls.student_count} student(s)</small>
            </td>
            <td>
                <button class="btn btn-sm btn-maroon" 
                        onclick="viewClassStudents(${currentTeacherId}, ${cls.subject_id}, '${cls.subject_name}')">
                    <i class="bi bi-people"></i> View Students
                </button>
            </td>
        </tr>
    `).join('');
}

async function viewClassStudents(teacherId, subjectId, subjectName) {
    currentTeacherId = teacherId;
    currentSubjectId = subjectId;
    currentSubjectName = subjectName;

    try {
        const response = await fetch(
            `http://localhost:3000/admin/teacher-sections/${teacherId}/${subjectId}`,
            { mode: 'cors' }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        currentSections = await response.json();
        console.log('Sections loaded:', currentSections);

        const modalTitle = document.getElementById('classStudentsModalLabel');
        if (modalTitle) {
            modalTitle.textContent = `Students in ${subjectName}`;
        }

        populateSectionSelector(currentSections);

        const tbody = document.getElementById('classStudentsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted">
                        <i class="bi bi-info-circle"></i> Select a section to view students
                    </td>
                </tr>
            `;
        }

        const teacherModal = bootstrap.Modal.getInstance(document.getElementById('teacherClassesModal'));
        if (teacherModal) {
            teacherModal.hide();
        }

        const studentsModal = new bootstrap.Modal(document.getElementById('classStudentsModal'));
        studentsModal.show();

        document.getElementById('classStudentsModal').addEventListener('hidden.bs.modal', function onHidden() {
            const teacherModal = new bootstrap.Modal(document.getElementById('teacherClassesModal'));
            teacherModal.show();
            this.removeEventListener('hidden.bs.modal', onHidden);
        });
    } catch (error) {
        console.error('Error loading sections:', error);
        showAlert('Error loading class sections', 'danger');
    }
}

function populateSectionSelector(sections) {
    const sectionSelect = document.getElementById('sectionSelect');
    if (!sectionSelect) return;

    sectionSelect.innerHTML = '<option value="">-- Select Section --</option>';

    sections.forEach(section => {
        const option = document.createElement('option');
        option.value = section.sectionCode;
        option.textContent = `${section.sectionCode} (${section.student_count} students)`;
        sectionSelect.appendChild(option);
    });
}

async function handleSectionChange(event) {
    const sectionCode = event.target.value;
    
    if (!sectionCode) {
        const tbody = document.getElementById('classStudentsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted">
                        <i class="bi bi-info-circle"></i> Select a section to view students
                    </td>
                </tr>
            `;
        }
        return;
    }

    try {
        const response = await fetch(
            `http://localhost:3000/admin/class-students/${currentTeacherId}/${currentSubjectId}/${sectionCode}`,
            { mode: 'cors' }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const students = await response.json();
        console.log('Students loaded:', students);
        renderClassStudents(students);
    } catch (error) {
        console.error('Error loading students:', error);
        showAlert('Error loading students', 'danger');
    }
}

function renderClassStudents(students) {
    const tbody = document.getElementById('classStudentsTableBody');
    if (!tbody) return;

    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No students enrolled in this section.</td></tr>';
        return;
    }

    tbody.innerHTML = students.map(student => {
        const midtermGrade = student.midterm_grade !== null ? student.midterm_grade : 'N/A';
        const finalGrade = student.final_grade !== null ? student.final_grade : 'N/A';
        
        let remarks = 'Pending';
        if (student.final_grade !== null) {
            remarks = student.final_grade <= 3.0 ? 'Passed' : 'Failed';
        }

        return `
            <tr>
                <td>${student.student_id}</td>
                <td>${student.student_name}</td>
                <td class="text-center">${midtermGrade}</td>
                <td class="text-center">${finalGrade}</td>
                <td class="text-center">${remarks}</td>
            </tr>
        `;
    }).join('');
}

async function toggleEncoding(button, teacherId, encodingType) {
    const row = button.closest('tr');
    const currentlyEnabled = row.dataset[encodingType === 'midterm' ? 'midtermEncoding' : 'finalEncoding'] === 'true';
    const newState = !currentlyEnabled;

    try {
        const response = await fetch('http://localhost:3000/admin/toggle-encoding', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                teacherId: teacherId,
                encodingType: encodingType,
                enabled: newState
            }),
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Toggle encoding result:', result);

        if (encodingType === 'midterm') {
            row.dataset.midtermEncoding = newState;
        } else {
            row.dataset.finalEncoding = newState;
        }
        updateEncodingButton(button, newState, encodingType);
        
        const teacher = allTeachers.find(t => t.teacher_id === teacherId);
        if (teacher) {
            if (encodingType === 'midterm') {
                teacher.encode = newState ? 'on' : 'off';
            } else {
                teacher.final_encode = newState ? 'on' : 'off';
            }
        }

        updateBulkToggleState();

        showAlert(`${encodingType === 'midterm' ? 'Midterm' : 'Final'} encoding ${newState ? 'enabled' : 'disabled'} successfully`, 'success');
    } catch (error) {
        console.error('Error toggling encoding:', error);
        showAlert('Error toggling encoding', 'danger');
    }
}

function updateEncodingButton(button, isEnabled, encodingType) {
    button.className = `btn btn-sm ${isEnabled ? 'btn-success' : 'btn-danger'} encoding-btn me-1`;
    const label = encodingType === 'midterm' ? 'M' : 'F';
    button.title = `${encodingType === 'midterm' ? 'Midterm' : 'Final'} ${isEnabled ? 'Enabled' : 'Disabled'}`;
    button.innerHTML = `<i class="bi ${isEnabled ? 'bi-unlock-fill' : 'bi-lock-fill'}"></i> ${label}: ${isEnabled ? 'On' : 'Off'}`;
}

async function handleBulkEncodingToggle(event, encodingType) {
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
                encodingType: encodingType,
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
                if (encodingType === 'midterm') {
                    teacher.encode = enabled ? 'on' : 'off';
                } else {
                    teacher.final_encode = enabled ? 'on' : 'off';
                }
            }
        });

        filterTeachers();

        showAlert(`${encodingType === 'midterm' ? 'Midterm' : 'Final'} encoding ${enabled ? 'enabled' : 'disabled'} for all active teachers`, 'success');
    } catch (error) {
        console.error('Error in bulk toggle:', error);
        showAlert('Error updating encoding status', 'danger');
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