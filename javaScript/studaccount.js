window.addEventListener("load", () => {
    loadStudentProfile();
});

const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
let studentData = null;
let generatedOTP = null;

function loadStudentProfile() {
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
            displayProfile(data);
        })
        .catch((error) => {
            console.log("Error fetching student data:", error);
            displayError();
        });
}

function displayProfile(data) {
    document.getElementById('studentName').textContent = data.full_name || 'N/A';
    document.getElementById('studentId').textContent = `Student ID: ${data.student_id}`;
    document.getElementById('course').textContent = `Course: ${data.course_name}`;
    document.getElementById('yearLevel').textContent = `Year Level: ${data.year_level_name}`;
    document.getElementById('email').textContent = `Email: ${data.email}`;
    
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.full_name)}&background=800000&color=fff&size=100`;
    document.getElementById('profileAvatar').src = avatarUrl;
    
    document.getElementById('studentNumber').value = data.student_id;
    document.getElementById('studentEmail').value = data.email;
}

function displayError() {
    document.getElementById('studentName').textContent = 'Error loading data';
}

document.getElementById('sendOtpBtn').addEventListener('click', function() {
    const email = document.getElementById('studentEmail').value;
    const studentId = document.getElementById('studentNumber').value;

    if (!email || !studentId) {
        showMessage('Please fill in Student ID and Email', 'danger');
        return;
    }

    generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();

    fetch('http://localhost:3000/api/send-otp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: email,
            otp: generatedOTP
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showMessage('OTP sent successfully! Please check your email.', 'success');
            document.getElementById('sendOtpBtn').disabled = true;
            setTimeout(() => {
                document.getElementById('sendOtpBtn').disabled = false;
            }, 60000);
        } else {
            showMessage('Failed to send OTP. Please try again.', 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showMessage('Error sending OTP. Please try again.', 'danger');
    });
});

document.getElementById('changePasswordForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const studentId = document.getElementById('studentNumber').value;
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const otp = document.getElementById('otp').value;

    if (newPassword !== confirmPassword) {
        showMessage('New passwords do not match!', 'danger');
        return;
    }

    if (newPassword.length < 6) {
        showMessage('Password must be at least 6 characters long', 'danger');
        return;
    }

    if (!generatedOTP) {
        showMessage('Please request OTP first', 'danger');
        return;
    }

    if (otp !== generatedOTP) {
        showMessage('Invalid OTP. Please check your email.', 'danger');
        return;
    }

    const updateBtn = document.getElementById('updateBtn');
    updateBtn.disabled = true;
    updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Updating...';

    fetch('http://localhost:3000/api/change-password-student', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            studentId: studentId,
            oldPassword: oldPassword,
            newPassword: newPassword
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showMessage(data.message, 'success');
            setTimeout(() => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
                modal.hide();
                document.getElementById('changePasswordForm').reset();
                generatedOTP = null;
            }, 2000);
        } else {
            showMessage(data.message, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showMessage('Error updating password. Please try again.', 'danger');
    })
    .finally(() => {
        updateBtn.disabled = false;
        updateBtn.innerHTML = '<i class="fas fa-save me-1"></i> Update Password';
    });
});

function showMessage(message, type) {
    const messageDiv = document.getElementById('otpMessage');
    messageDiv.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
}

document.getElementById('changePasswordModal').addEventListener('hidden.bs.modal', function () {
    document.getElementById('changePasswordForm').reset();
    document.getElementById('otpMessage').innerHTML = '';
    generatedOTP = null;
});