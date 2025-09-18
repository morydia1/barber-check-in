// // // Form submission event
// // document.getElementById("customerForm").addEventListener("submit", function(e) {
// //   e.preventDefault();
// //   // Clear old errors
// //   clearErrors();
// //   const name = document.getElementById("name").value.trim();
// //   const phone = document.getElementById("phone").value.trim();
// //   const email = document.getElementById("email").value.trim();
// //   let valid = true;
// //   // Validate Name: letters + spaces only
// //   if (!/^[A-Za-z\s]{2,}$/.test(name)) {
// //     showError("name", "Please enter a valid name (letters only, at least 2 characters).");
// //     valid = false;
// //   }
// //   // Validate Phone: numbers only, length 10–15
// //   if (!/^[0-9]{10,15}$/.test(phone)) {
// //     showError("phone", "Phone must be 10–15 digits (numbers only).");
// //     valid = false;
// //   }
// //   // Validate Email
// //   if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
// //     showError("email", "Please enter a valid email address.");
// //     valid = false;
// //   }
// //   if (!valid) return; // Stop submission if validation fails
// //   // Prepare data
// //   const data = { name, phone, email };
// //   // Send to Apps Script backend
// //   fetch("https://script.google.com/macros/s/AKfycbxMs__f20K_FMagzmOGMX0Fer5qpmkCJXBGWUIX63dl/dev", {
// //     method: "POST",
// //     body: JSON.stringify(data),
// //     headers: { "Content-Type": "application/json" }
// //   })
// //   .then(res => res.json())
// //   .then(response => {
// //     if (response.result === "success") {
// //       document.getElementById("successMessage").classList.remove("hidden");
// //       document.getElementById("customerForm").reset();
// //     } else {
// //       alert("Something went wrong. Please try again.");
// //     }
// //   })
// //   .catch(err => {
// //     console.error(err);
// //     alert("Error saving your data.");
// //   });
// // });
// // // Show error message under input
// // function showError(fieldId, message) {
// //   const input = document.getElementById(fieldId);
// //   const error = document.createElement("div");
// //   error.className = "error-message";
// //   error.innerText = message;
// //   input.parentNode.appendChild(error);
// //   input.classList.add("input-error");
// // }
// // // Clear all errors
// // function clearErrors() {
// //   document.querySelectorAll(".error-message").forEach(el => el.remove());
// //   document.querySelectorAll(".input-error").forEach(el => el.classList.remove("input-error"));
// // }

// const WEBAPP_URL = "YOUR_APPS_SCRIPT_URL"; // replace with your Apps Script Web App URL
// const form = document.getElementById("multiStepForm");
// const steps = document.querySelectorAll(".step");
// const nextBtn = document.getElementById("nextBtn");
// const prevBtn = document.getElementById("prevBtn");
// const progressBar = document.getElementById("progressBar");
// const msg = document.getElementById("formMessage");
// let currentStep = 0;
// function showStep(index) {
//   steps.forEach((s, i) => s.classList.toggle("active", i === index));
//   prevBtn.disabled = index === 0;
//   nextBtn.textContent = index === steps.length - 1 ? "Submit" : "Next";
//   progressBar.style.width = `${((index + 1) / steps.length) * 100}%`;
// }
// function validateStep() {
//   let valid = true;
//   if (currentStep === 0) {
//     const name = document.getElementById("name").value.trim();
//     if (!name) {
//       document.getElementById("nameError").textContent = "Please enter your name";
//       valid = false;
//     } else {
//       document.getElementById("nameError").textContent = "";
//     }
//   }
//   if (currentStep === 1) {
//     const phone = document.getElementById("phone").value.trim();
//     const phonePattern = /^[0-9]{7,15}$/;
//     if (!phonePattern.test(phone)) {
//       document.getElementById("phoneError").textContent = "Enter a valid phone number (7–15 digits)";
//       valid = false;
//     } else {
//       document.getElementById("phoneError").textContent = "";
//     }
//   }
//   if (currentStep === 2) {
//     const email = document.getElementById("email").value.trim();
//     const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
//     if (!emailPattern.test(email)) {
//       document.getElementById("emailError").textContent = "Enter a valid email";
//       valid = false;
//     } else {
//       document.getElementById("emailError").textContent = "";
//     }
//   }
//   return valid;
// }
// nextBtn.addEventListener("click", () => {
//   if (currentStep === steps.length - 1) {
//     submitForm();
//   } else if (validateStep()) {
//     currentStep++;
//     showStep(currentStep);
//   }
// });
// prevBtn.addEventListener("click", () => {
//   if (currentStep > 0) {
//     currentStep--;
//     showStep(currentStep);
//   }
// });
// function submitForm() {
//   msg.textContent = "";
//   msg.className = "message";
//   const data = {
//     fullName: document.getElementById("name").value.trim(),
//     phone: document.getElementById("phone").value.trim(),
//     email: document.getElementById("email").value.trim(),
//     service: document.getElementById("service").value,
//     preferredDate: document.getElementById("preferredDate").value,
//     notes: document.getElementById("notes").value.trim(),
//     optinEmail: document.getElementById("optinEmail").checked ? "on" : "",
//     optinSMS: document.getElementById("optinSMS").checked ? "on" : ""
//   };
//   fetch('https://script.google.com/macros/s/AKfycbyv2ht1K5Bf4SD6m68j14p624t9sGFmvKSqUTJyx2O-ToNPDCyfKYgIpCSzAGMqlaX5MA/exec', {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(data)
//   })
//   .then(res => res.json())
//   .then(resp => {
//     if (resp.result === "success") {
//       msg.textContent = ":white_check_mark: Thanks! You're added to our list.";
//       msg.classList.add("success");
//       form.reset();
//       currentStep = 0;
//       showStep(currentStep);
//     } else {
//       msg.textContent = ":x: Something went wrong. Try again.";
//       msg.classList.add("error-msg");
//     }
//   })
//   .catch(() => {
//     msg.textContent = ":x: Network error. Please retry.";
//     msg.classList.add("error-msg");
//   });
// }
// showStep(currentStep);

const form = document.getElementById("customerForm");
const msg = document.getElementById("formMessage");
// Replace with your Google Apps Script Web App URL
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.textContent = "";
  // Collect form data
  const data = {
    name: form.name.value.trim(),
    phone: form.phone.value.trim(),
    email: form.email.value.trim(),
    ageRange: form.querySelector("input[name='ageRange']:checked")?.value || ""
  };
  // :white_check_mark: Validation
  if (data.name.length < 2) {
    msg.textContent = "Please enter your full name.";
    msg.style.color = "red";
    return;
  }
  if (!/^\+?\d{7,15}$/.test(data.phone.replace(/[\s()-]/g, ""))) {
    msg.textContent = "Please enter a valid phone number.";
    msg.style.color = "red";
    return;
  }
  if (data.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) {
    msg.textContent = "Please enter a valid email address.";
    msg.style.color = "red";
    return;
  }
  if (!data.ageRange) {
    msg.textContent = "Please select your age range.";
    msg.style.color = "red";
    return;
  }
  // Send to Google Apps Script
  try {
    const res = await fetch("/.netlify/functions/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (result.result === "success") {
      msg.textContent = ":white_check_mark: Thanks! You’re checked in.";
      msg.style.color = "green";
      form.reset();
    } else {
      msg.textContent = ":warning: Error: " + result.message;
      msg.style.color = "red";
    }
  } catch (err) {
    msg.textContent = ":warning: Network error, try again.";
    msg.style.color = "red";
  }
});
