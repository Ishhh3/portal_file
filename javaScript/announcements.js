window.addEventListener("load", () => {
    loadAnnouncements();
});

const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
let allAnnouncements = [];
let isScholar = false;

function loadAnnouncements() {
    if (!loggedInUser || !loggedInUser.student_id) {
        window.location.href = "login.html";
        return;
    }

    const url = `http://localhost:3000/api/announcements/${loggedInUser.student_id}`;

    fetch(url, { mode: "cors" })
        .then((response) => response.json())
        .then((data) => {
            isScholar = data.isScholar;
            allAnnouncements = data.announcements;
            displayAnnouncements(allAnnouncements);
            setupEventListeners();
        })
        .catch((error) => {
            console.log("Error fetching announcements:", error);
            displayError();
        });
}

function displayAnnouncements(announcements) {
    const container = document.querySelector("#announcementsContainer");
    
    if (announcements.length === 0) {
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
        const dateFormatted = formatDate(announcement.date_published);
        const preview = announcement.content.substring(0, 150) + '...';
        
        return `
            <div class="list-group-item announcement-item" data-id="${announcement.id}" data-category="${announcement.category}">
                <div class="d-flex w-100 justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h5 class="mb-2">
                            ${announcement.title}
                            ${badge}
                        </h5>
                        <p class="mb-2 text-muted announcement-preview">
                            ${preview}
                        </p>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                <i class="fas fa-clock me-1"></i>${dateFormatted}
                            </small>
                            <small class="text-maroon fw-bold">
                                <i class="fas fa-arrow-right me-1"></i>Click to read more
                            </small>
                        </div>
                    </div>
                </div>
                <div class="announcement-full-content" style="display: none;">
                    ${announcement.content}
                </div>
            </div>
        `;
    }).join('');

    // Add click event listeners to all announcement items
    const announcementItems = container.querySelectorAll('.announcement-item');
    announcementItems.forEach(item => {
        item.addEventListener('click', function() {
            viewAnnouncement(this);
        });
    });
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
    const date = new Date(dateString);
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
        </div>
    `;
}

function setupEventListeners() {
    // Category filter
    const categoryFilter = document.querySelector("#categoryFilter");
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterAnnouncements);
    }

    // Reset filter button
    const resetFilter = document.querySelector("#resetAnnouncementFilter");
    if (resetFilter) {
        resetFilter.addEventListener('click', resetFilters);
    }
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
    const title = titleElement.childNodes[0].textContent.trim(); // This gets only the text content before the badge
    
    const categoryBadge = element.querySelector('.badge');
    const category = categoryBadge.textContent.trim();
    const datePosted = element.querySelector('small').textContent.trim();

    // Set modal content for the new modal structure
    document.getElementById('modalAnnouncementTitle').textContent = title; // Only the title, no category
    document.getElementById('modalAnnouncementCategory').textContent = category;
    document.getElementById('modalAnnouncementCategory').className = categoryBadge.className;
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