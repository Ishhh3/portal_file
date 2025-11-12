window.addEventListener("load", () => {
    loadAnnouncements();
});

// Safe localStorage parsing with error handling
function getLoggedInUser() {
    try {
        const userData = localStorage.getItem("loggedInUser");
        console.log("Raw user data from localStorage:", userData);
        
        if (!userData) {
            console.error("No user data found in localStorage");
            return null;
        }
        
        const user = JSON.parse(userData);
        console.log("Parsed user object:", user);
        return user;
        
    } catch (error) {
        console.error("Error parsing user data from localStorage:", error);
        return null;
    }
}

const loggedInUser = getLoggedInUser();
let allAnnouncements = [];

function loadAnnouncements() {
    // Check if user is properly logged in
    if (!loggedInUser) {
        console.error("User not logged in - redirecting to login");
        window.location.href = "login.html";
        return;
    }

    // Check if user has teacher_id (for teachers)
    if (!loggedInUser.teacher_id) {
        console.error("User is not a teacher or missing teacher_id:", loggedInUser);
        
        // If it's a student, redirect to student announcements
        if (loggedInUser.student_id) {
            window.location.href = "announcements.html";
            return;
        }
        
        window.location.href = "login.html";
        return;
    }

    console.log("Loading announcements for teacher:", loggedInUser.teacher_id);

    // Use teacher-specific endpoint
    const url = `http://localhost:3000/api/teacher/announcements/${loggedInUser.teacher_id}`;

    fetch(url, { mode: "cors" })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            console.log("Announcements data received:", data);
            allAnnouncements = data.announcements || data || [];
            displayAnnouncements(allAnnouncements);
        })
        .catch((error) => {
            console.log("Error fetching teacher announcements:", error);
            // Try fallback to general announcements
            loadGeneralAnnouncements();
        });
}

function loadGeneralAnnouncements() {
    console.log("Trying general announcements endpoint...");
    
    const url = `http://localhost:3000/api/announcements`;

    fetch(url, { mode: "cors" })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            console.log("General announcements data received:", data);
            allAnnouncements = data.announcements || data || [];
            displayAnnouncements(allAnnouncements);
        })
        .catch((error) => {
            console.log("Error fetching general announcements:", error);
            displayError();
        });
}

function displayAnnouncements(announcements) {
    const container = document.querySelector("#announcementsContainer");
    
    if (!announcements || announcements.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="fas fa-info-circle fa-3x mb-3"></i>
                <p>No announcements available at this time.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = announcements.map(announcement => {
        const badge = getCategoryBadge(announcement.category);
        const dateFormatted = formatDate(announcement.date_published || announcement.created_at);
        const preview = announcement.content ? announcement.content.substring(0, 150) + '...' : 'No content available';
        
        return `
            <div class="list-group-item announcement-item" data-id="${announcement.id}" data-category="${announcement.category}" onclick="viewAnnouncement(this)">
                <div class="d-flex w-100 justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h5 class="mb-2">
                            ${announcement.title || 'Untitled Announcement'}
                            ${badge}
                        </h5>
                        <p class="mb-2 text-muted announcement-preview">
                            ${preview}
                        </p>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                <i class="fas fa-calendar me-1"></i>${dateFormatted}
                            </small>
                            <small class="text-maroon fw-bold">
                                <i class="fas fa-arrow-right me-1"></i>Click to read more
                            </small>
                        </div>
                    </div>
                </div>
                <div class="announcement-full-content" style="display: none;">
                    ${announcement.content || 'No content available'}
                </div>
            </div>
        `;
    }).join('');
}

function getCategoryBadge(category) {
    const badges = {
        'Academic': '<span class="badge bg-primary ms-2">Academic</span>',
        'General': '<span class="badge bg-secondary ms-2">General</span>',
        'Event': '<span class="badge bg-warning text-dark ms-2">Event</span>',
        'Holiday': '<span class="badge bg-success ms-2">Holiday</span>',
        'Important': '<span class="badge bg-danger ms-2">Important</span>'
    };
    return badges[category] || '<span class="badge bg-secondary ms-2">' + category + '</span>';
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown date';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
}

function displayError() {
    const container = document.querySelector("#announcementsContainer");
    container.innerHTML = `
        <div class="text-center text-danger py-5">
            <i class="fas fa-exclamation-circle fa-3x mb-3"></i>
            <p>Error loading announcements. Please try again later.</p>
            <button class="btn btn-primary mt-2" onclick="loadAnnouncements()">
                <i class="fas fa-redo me-1"></i>Try Again
            </button>
        </div>
    `;
}

function filterAnnouncements() {
    const categoryFilter = document.querySelector("#categoryFilter").value;
    
    let filtered = allAnnouncements;
    
    if (categoryFilter) {
        filtered = allAnnouncements.filter(a => a.category === categoryFilter);
    }
    
    displayAnnouncements(filtered);
}

function resetFilters() {
    document.querySelector("#categoryFilter").value = "";
    displayAnnouncements(allAnnouncements);
}

function viewAnnouncement(element) {
    const fullContent = element.querySelector('.announcement-full-content').innerHTML;
    const titleElement = element.querySelector('h5');
    
    // Extract only the title text without the category badge
    const title = titleElement.childNodes[0].textContent.trim();
    
    // Get category badge and date information
    const categoryBadge = element.querySelector('.badge');
    const category = categoryBadge ? categoryBadge.textContent.trim() : 'General';
    const dateElement = element.querySelector('small');
    const datePosted = dateElement ? dateElement.textContent.trim() : 'Unknown date';

    // Set modal content for the new modal structure
    document.getElementById('modalAnnouncementTitle').textContent = title;
    document.getElementById('modalAnnouncementCategory').textContent = category;
    document.getElementById('modalAnnouncementCategory').className = categoryBadge ? categoryBadge.className : 'badge bg-secondary';
    document.getElementById('modalAnnouncementDate').innerHTML = '<i class="fas fa-clock"></i> ' + datePosted;
    document.getElementById('modalAnnouncementContent').innerHTML = `<div style="white-space: pre-line;">${fullContent}</div>`;

    // Show the new modal
    const modal = new bootstrap.Modal(document.getElementById('viewAnnouncementModal'));
    modal.show();
}

function logout() {
    localStorage.removeItem("loggedInUser");
    window.location.href = "login.html";
}