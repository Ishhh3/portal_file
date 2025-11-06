const API_URL = 'http://localhost:3000/api/announcements';
let currentAnnouncementId = null;

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

function logout() {
    localStorage.removeItem("loggedInUser");
    window.location.href = "login.html";
}

async function loadAnnouncements() {
    try {
        const response = await fetch(API_URL);
        const announcements = await response.json();
        
        const listGroup = document.getElementById('announcementsList');
        
        if (announcements.length === 0) {
            listGroup.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>No announcements yet. Create your first announcement!
                </div>
            `;
            return;
        }
        
        listGroup.innerHTML = announcements.map(announcement => `
            <div class="list-group-item" data-id="${announcement.id}">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h5 class="mb-2">
                            ${announcement.title} 
                            <span class="badge ${getCategoryBadgeClass(announcement.category)} ms-2">
                                ${announcement.category}
                            </span>
                        </h5>
                        <p class="mb-2">${announcement.content}</p>
                        <small class="text-muted">Published on ${formatDate(announcement.date_published)}</small>
                    </div>
                    <div class="ms-3">
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editAnnouncement(${announcement.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteAnnouncement(${announcement.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading announcements:', error);
        const listGroup = document.getElementById('announcementsList');
        listGroup.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle me-2"></i>Error loading announcements. Please try again.
            </div>
        `;
    }
}

function getCategoryBadgeClass(category) {
    switch(category) {
        case 'Important':
            return 'bg-danger';
        case 'Academic':
            return 'bg-primary';
        case 'Holiday':
            return 'bg-success';
        case 'Event':
            return 'bg-info';
        case 'General':
        default:
            return 'bg-secondary';
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function resetForm() {
    document.getElementById('announcementForm').reset();
    document.getElementById('announcementId').value = '';
    currentAnnouncementId = null;
    
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-bullhorn me-2"></i>Create New Announcement';
    document.getElementById('saveAnnouncementBtn').innerHTML = '<i class="fas fa-paper-plane me-2"></i>Publish Announcement';
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('announcementDate').value = today;
}

async function editAnnouncement(id) {
    try {
        const response = await fetch(`${API_URL}`);
        const announcements = await response.json();
        const announcement = announcements.find(a => a.id === id);
        
        if (!announcement) {
            showAlert('Announcement not found', 'danger');
            return;
        }
        
        currentAnnouncementId = id;
        document.getElementById('announcementId').value = id;
        document.getElementById('announcementTitle').value = announcement.title;
        document.getElementById('announcementContent').value = announcement.content;
        document.getElementById('announcementCategory').value = announcement.category;
        document.getElementById('announcementDate').value = announcement.date_published;
        
        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit me-2"></i>Edit Announcement';
        document.getElementById('saveAnnouncementBtn').innerHTML = '<i class="fas fa-save me-2"></i>Update Announcement';
        
        const modal = new bootstrap.Modal(document.getElementById('createAnnouncementModal'));
        modal.show();
    } catch (error) {
        console.error('Error editing announcement:', error);
        showAlert('Error loading announcement data', 'danger');
    }
}

async function deleteAnnouncement(id) {
    if (!confirm('Are you sure you want to delete this announcement?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert('Announcement deleted successfully', 'success');
            loadAnnouncements();
        } else {
            showAlert(result.error || 'Error deleting announcement', 'danger');
        }
    } catch (error) {
        console.error('Error deleting announcement:', error);
        showAlert('Error deleting announcement', 'danger');
    }
}

async function saveAnnouncement() {
    const title = document.getElementById('announcementTitle').value.trim();
    const content = document.getElementById('announcementContent').value.trim();
    const category = document.getElementById('announcementCategory').value;
    const date_published = document.getElementById('announcementDate').value;
    
    if (!title || !content || !date_published) {
        showAlert('Please fill in all required fields', 'warning');
        return;
    }
    
    const data = {
        title,
        content,
        category,
        date_published
    };
    
    try {
        let response;
        if (currentAnnouncementId) {
            response = await fetch(`${API_URL}/${currentAnnouncementId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
        } else {
            response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
        }
        
        const result = await response.json();
        
        if (response.ok) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('createAnnouncementModal'));
            modal.hide();
            
            showAlert(
                currentAnnouncementId ? 'Announcement updated successfully' : 'Announcement published successfully',
                'success'
            );
            
            loadAnnouncements();
            resetForm();
        } else {
            showAlert(result.error || 'Error saving announcement', 'danger');
        }
    } catch (error) {
        console.error('Error saving announcement:', error);
        showAlert('Error saving announcement', 'danger');
    }
}

function showAlert(message, type) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check' : type === 'warning' ? 'exclamation-triangle' : 'exclamation'}-circle me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const content = document.getElementById('announcements-content');
    const card = content.querySelector('.card');
    content.insertBefore(alert, card);
    
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

document.addEventListener('DOMContentLoaded', function() {
    loadAnnouncements();
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('announcementDate').value = today;
    
    document.getElementById('saveAnnouncementBtn').addEventListener('click', saveAnnouncement);
    
    const modal = document.getElementById('createAnnouncementModal');
    modal.addEventListener('show.bs.modal', function (event) {
        if (!currentAnnouncementId) {
            resetForm();
        }
    });
    
    modal.addEventListener('hidden.bs.modal', function (event) {
        resetForm();
    });
});