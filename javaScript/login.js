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
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const username = document.querySelector("#userId").value.trim();
      const password = document.querySelector("#password").value.trim();

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
    });
  }
});