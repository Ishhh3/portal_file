window.addEventListener("load", () => {
    loadAllPasswords();
});

const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));

let allPasswords = [];

function loadAllPasswords() {
    if (!loggedInUser || loggedInUser.role !== "admin") {
        console.log("Unauthorized access");
        window.location.href = "login.html";
        return;
    }

    const link = "http://localhost:3000/admin/passwords";

    fetch(link, { mode: "cors" })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            allPasswords = data;
            displayPasswords(allPasswords);
        })
        .catch((error) => {
            console.error("Error fetching passwords:", error);
            alert("Error loading passwords. Please make sure the server is running.");
        });
}

function displayPasswords(passwords) {
    const tbody = document.querySelector("#passwordsTable tbody");
    tbody.innerHTML = "";

    if (passwords.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No users found</td></tr>';
        return;
    }

    passwords.forEach((user) => {
        const row = document.createElement("tr");
        
        // Display actual password or show placeholder if null/empty
        const displayPassword = user.password && user.password.trim() !== '' 
            ? user.password 
            : '<span class="text-muted">No password set</span>';
        
        row.innerHTML = `
            <td><span class="user-id">${user.id}</span></td>
            <td>${user.full_name}</td>
            <td>${user.department || 'N/A'}</td>
            <td>
                <span class="user-type-badge ${user.user_type === 'student' ? 'badge-student' : 'badge-teacher'}">
                    ${user.user_type}
                </span>
            </td>
            <td class="password-cell">${displayPassword}</td>
        `;

        tbody.appendChild(row);
    });
}

function filterPasswords() {
    const searchQuery = document.getElementById('passwordSearch').value.toLowerCase();

    const filteredPasswords = allPasswords.filter(user => {
        const matchesSearch = !searchQuery || 
            user.id.toLowerCase().includes(searchQuery) || 
            user.full_name.toLowerCase().includes(searchQuery) ||
            (user.department && user.department.toLowerCase().includes(searchQuery));

        return matchesSearch;
    });

    displayPasswords(filteredPasswords);
}

function resetSearch() {
    document.getElementById('passwordSearch').value = '';
    displayPasswords(allPasswords);
}

document.addEventListener('DOMContentLoaded', function() {
    const passwordSearch = document.getElementById('passwordSearch');
    const resetPasswordSearch = document.getElementById('resetPasswordSearch');

    if (passwordSearch) {
        passwordSearch.addEventListener('input', filterPasswords);
    }
    if (resetPasswordSearch) {
        resetPasswordSearch.addEventListener('click', resetSearch);
    }
});