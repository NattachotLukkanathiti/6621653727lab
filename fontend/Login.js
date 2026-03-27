let accessToken = null;

// ================= LOGIN =================
async function ButtonLogin() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const res = await fetch("http://localhost:8001/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, password })
  });

  if (res.status === 401) {
    alert("Login failed");
    return;
  }

  const data = await res.json();

  accessToken = data.access_token;
  localStorage.setItem("refresh_token", data.refresh_token);

  window.location.href = "main.html";
}

// ================= REFRESH =================
async function refreshAccessToken() {
  const refresh_token = localStorage.getItem("refresh_token");

  const res = await fetch("http://localhost:8001/auth/refresh", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ refresh_token })
  });

  if (res.status === 401) {
    alert("Session expired");
    window.location.href = "login.html";
    return null;
  }

  const data = await res.json();
  accessToken = data.access_token;

  return accessToken;
}

// ================= FETCH WRAPPER =================
async function fetchWithAuth(url, options = {}) {
  if (!options.headers) options.headers = {};

  options.headers["Authorization"] = "Bearer " + accessToken;

  let res = await fetch(url, options);

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (!newToken) return;

    options.headers["Authorization"] = "Bearer " + newToken;
    res = await fetch(url, options);
  }

  return res;
}