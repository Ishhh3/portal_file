window.addEventListener("load", () => {
    loadStudentProfile();
    setupOtpButton();
});

const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
let studentData = null;
let generatedOtp = null;
let otpExpiryTime = null;
let countdownInterval = null;

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
    // Email removed from main profile display
    
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.full_name)}&background=800000&color=fff&size=100`;
    document.getElementById('profileAvatar').src = avatarUrl;
    
    document.getElementById('studentNumber').value = data.student_id;
    document.getElementById('studentEmail').value = data.email;
}

function displayError() {
    document.getElementById('studentName').textContent = 'Error loading data';
}

function setupOtpButton() {
    document.getElementById('sendOtpBtn').addEventListener('click', sendOtp);
}

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function sendOtp() {
    const email = document.getElementById('studentEmail').value;
    const studentId = document.getElementById('studentNumber').value;
    
    if (!email || !studentId) {
        showOtpMessage('error', 'Please enter your email address and Student ID');
        return;
    }

    // Generate OTP
    generatedOtp = generateOtp();
    otpExpiryTime = new Date().getTime() + 5 * 60 * 1000; // 5 minutes

    console.log('Generated OTP:', generatedOtp);

    // Disable send button
    const sendBtn = document.getElementById('sendOtpBtn');
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Sending...';

    // Send OTP to email via server
    fetch('http://localhost:3000/api/send-otp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: email,
            otp: generatedOtp
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showOtpMessage('success', `OTP sent to ${email}. Please check your inbox.`);
            startCountdown();
        } else {
            showOtpMessage('error', data.message || 'Failed to send OTP');
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fas fa-paper-plane me-1"></i> Send OTP';
        }
    })
    .catch(error => {
        console.error('Error sending OTP:', error);
        showOtpMessage('error', 'Failed to send OTP. Please try again.');
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="fas fa-paper-plane me-1"></i> Send OTP';
    });
}

function startCountdown() {
    clearInterval(countdownInterval);
    
    countdownInterval = setInterval(() => {
        const now = new Date().getTime();
        const distance = otpExpiryTime - now;

        if (distance <= 0) {
            clearInterval(countdownInterval);
            generatedOtp = null;
            showOtpMessage('error', 'OTP expired. Please request a new one.');
            
            // Re-enable send button
            const sendBtn = document.getElementById('sendOtpBtn');
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fas fa-paper-plane me-1"></i> Send OTP';
        } else {
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            showOtpMessage('info', `OTP sent! Expires in: ${minutes}m ${seconds}s`);
        }
    }, 1000);
}

function showOtpMessage(type, message) {
    const messageDiv = document.getElementById('otpMessage');
    const alertClass = type === 'success' ? 'alert-success' : type === 'error' ? 'alert-danger' : 'alert-info';
    const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    
    messageDiv.innerHTML = `
        <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
            <i class="fas ${icon} me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
}

// Change Password Form Validation
document.getElementById('changePasswordForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const studentNumber = document.getElementById('studentNumber').value;
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const enteredOtp = document.getElementById('otp').value;

    // Check OTP first
    if (!generatedOtp) {
        showAlert('error', 'Please click "Send OTP" first');
        return;
    }

    if (new Date().getTime() > otpExpiryTime) {
        showAlert('error', 'OTP expired. Request a new one.');
        generatedOtp = null;
        clearInterval(countdownInterval);
        return;
    }

    if (enteredOtp !== generatedOtp) {
        showAlert('error', 'Invalid OTP. Please check and try again.');
        return;
    }

    // Validation checks
    if (newPassword.length < 8) {
        showAlert('error', 'New password must be at least 8 characters long');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showAlert('error', 'New password and confirmation do not match');
        return;
    }
    
    if (oldPassword === newPassword) {
        showAlert('error', 'New password must be different from current password');
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
            studentId: studentNumber,
            oldPassword: oldPassword,
            newPassword: newPassword
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('success', data.message || 'Password changed successfully!');
            
            generatedOtp = null;
            clearInterval(countdownInterval);
            
            setTimeout(() => {
                document.getElementById('changePasswordForm').reset();
                document.getElementById('otpMessage').innerHTML = '';
                const sendBtn = document.getElementById('sendOtpBtn');
                sendBtn.disabled = false;
                sendBtn.innerHTML = '<i class="fas fa-paper-plane me-1"></i> Send OTP';
                
                updateBtn.disabled = false;
                updateBtn.innerHTML = '<i class="fas fa-save me-1"></i> Update Password';
                
                const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
                modal.hide();
            }, 1500);
        } else {
            showAlert('error', data.message || 'Failed to change password');
            updateBtn.disabled = false;
            updateBtn.innerHTML = '<i class="fas fa-save me-1"></i> Update Password';
        }
    })
    .catch(error => {
        console.error('Error changing password:', error);
        showAlert('error', 'An error occurred while changing password');
        updateBtn.disabled = false;
        updateBtn.innerHTML = '<i class="fas fa-save me-1"></i> Update Password';
    });
});

// Clear OTP when modal is closed
document.getElementById('changePasswordModal').addEventListener('hidden.bs.modal', function () {
    generatedOtp = null;
    clearInterval(countdownInterval);
    document.getElementById('changePasswordForm').reset();
    document.getElementById('otpMessage').innerHTML = '';
    const sendBtn = document.getElementById('sendOtpBtn');
    sendBtn.disabled = false;
    sendBtn.innerHTML = '<i class="fas fa-paper-plane me-1"></i> Send OTP';
    
    const updateBtn = document.getElementById('updateBtn');
    updateBtn.disabled = false;
    updateBtn.innerHTML = '<i class="fas fa-save me-1"></i> Update Password';
    
    const existingAlert = document.querySelector('#changePasswordModal .modal-body > .alert-dismissible');
    if (existingAlert) {
        existingAlert.remove();
    }
});

// Alert function
function showAlert(type, message) {
    // Remove existing alerts
    const existingAlert = document.querySelector('#changePasswordModal .modal-body > .alert-dismissible');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    
    const alertHtml = `
        <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
            <i class="fas ${icon} me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    const modalBody = document.querySelector('#changePasswordModal .modal-body');
    modalBody.insertAdjacentHTML('afterbegin', alertHtml);
    
    // Auto-dismiss after 3 seconds for error messages
    if (type === 'error') {
        setTimeout(() => {
            const alert = document.querySelector('#changePasswordModal .modal-body > .alert-dismissible');
            if (alert) {
                alert.remove();
            }
        }, 3000);
    }
}