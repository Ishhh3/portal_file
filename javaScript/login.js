window.addEventListener("load", () => {
  if (localStorage.getItem("loggedInUser")) {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    if (loggedInUser.role === "student") {
      window.location.href = "stud.html";
    } else if (loggedInUser.role === "teacher") {
      window.location.href = "teacher.html";
    } else if (loggedInUser.role === "admin") {
      window.location.href = "admin.html";
    }
  }

  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  const mobileLoginForm = document.getElementById("mobileLoginForm");
  if (mobileLoginForm) {
    mobileLoginForm.addEventListener("submit", handleLogin);
  }
});

function handleLogin(e) {
  e.preventDefault();

  let username, password;

  // Check which form is being submitted
  if (e.target.id === "mobileLoginForm") {
    // Mobile form
    username = e.target.querySelector('input[type="text"]').value.trim();
    password = e.target.querySelector('input[type="password"]').value.trim();
  } else {
    // Desktop modal form
    username = e.target.querySelector('input[type="text"]').value.trim();
    password = e.target.querySelector('input[type="password"]').value.trim();
  }

  if (!username || !password) {
    alert("Please fill all fields");
    return;
  }

  fetch("http://localhost:3000/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        const userData = {
          username: data.username,
          role: data.role,
        };

        if (data.role === "student") {
          userData.student_id = data.student_id;
        } else if (data.role === "teacher") {
          userData.teacher_id = data.teacher_id;
          userData.teacherUser_id = data.teacherUser_id;
        } else if (data.role === "admin") {
          userData.admin_id = data.admin_id;
          userData.full_name = data.full_name;
          userData.email = data.email;
          userData.phone = data.phone;
        }

        localStorage.setItem("loggedInUser", JSON.stringify(userData));

        if (data.role === "student") {
          window.location.href = "stud.html";
        } else if (data.role === "teacher") {
          window.location.href = "teacher.html";
        } else if (data.role === "admin") {
          window.location.href = "admin.html";
        }
      } else {
        alert(data.message || "Login failed");
      }
    })
    .catch((error) => {
      alert("Server error. Try again later.");
    });
}

function togglePassword() {
  const passwordInput = document.getElementById("password");
  const toggleIcon = document.getElementById("toggleIcon");

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    toggleIcon.classList.remove("fa-eye-slash");
    toggleIcon.classList.add("fa-eye");
  } else {
    passwordInput.type = "password";
    toggleIcon.classList.remove("fa-eye");
    toggleIcon.classList.add("fa-eye-slash");
  }
}

function toggleMobilePassword() {
  const passwordInput = document.getElementById("mobilePassword");
  const toggleIcon = document.getElementById("mobileToggleIcon");

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    toggleIcon.classList.remove("fa-eye-slash");
    toggleIcon.classList.add("fa-eye");
  } else {
    passwordInput.type = "password";
    toggleIcon.classList.remove("fa-eye");
    toggleIcon.classList.add("fa-eye-slash");
  }
}

document.addEventListener("wheel", function (e) {
  e.preventDefault();
}, { passive: false });

document.addEventListener("touchmove", function (e) {
  e.preventDefault();
}, { passive: false });

document.addEventListener("keydown", function (e) {
  if ([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
    e.preventDefault();
  }
}, false);

function handleResize() {
  const modal = bootstrap.Modal.getInstance(document.getElementById("loginModal"));
  if (window.innerWidth <= 768 && modal) {
    modal.hide();
  }
}

window.addEventListener("resize", handleResize);