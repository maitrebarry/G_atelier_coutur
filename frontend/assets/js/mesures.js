// document.addEventListener("DOMContentLoaded", function () {
//   const photoInput = document.getElementById("photoInput");
//   const avatar = document.getElementById("avatar");
//   const sexe = document.getElementById("sexe");
//   const femmeOptions = document.getElementById("femmeOptions");
//   const mesuresRobe = document.getElementById("mesuresRobe");
//   const mesuresJupe = document.getElementById("mesuresJupe");
//   const mesuresHomme = document.getElementById("mesuresHomme");
//   const form = document.getElementById("measurementForm");
//   const optionCards = document.querySelectorAll(".option-card");
//   const genderRadios = document.querySelectorAll('input[name="genderPreview"]');
//   const defaultImage = avatar.src;

//   avatar.addEventListener("click", () => photoInput.click());

//   photoInput.addEventListener("change", (e) => {
//     const file = e.target.files[0];
//     if (file) {
//       const reader = new FileReader();
//       reader.onload = function (event) {
//         avatar.src = event.target.result;
//         avatar.style.objectFit = "cover";
//       };
//       reader.readAsDataURL(file);
//     }
//   });

//   sexe.addEventListener("change", () => {
//     const val = sexe.value;
//     femmeOptions.style.display = "none";
//     mesuresRobe.style.display = "none";
//     mesuresJupe.style.display = "none";
//     mesuresHomme.style.display = "none";

//     if (val === "Femme") {
//       femmeOptions.style.display = "block";
//     } else if (val === "Homme") {
//       mesuresHomme.style.display = "block";
//     }
//   });

//   optionCards.forEach((card) => {
//     card.addEventListener("click", () => {
//       optionCards.forEach((c) => c.classList.remove("selected"));
//       card.classList.add("selected");

//       const radio = card.querySelector(".form-check-input");
//       radio.checked = true;

//       const option = card.getAttribute("data-option");
//       mesuresRobe.style.display = option === "robe" ? "block" : "none";
//       mesuresJupe.style.display = option === "jupe" ? "block" : "none";
//     });
//   });

//   genderRadios.forEach((radio) => {
//     radio.addEventListener("change", () => {
//       if (radio.value === "Femme") {
//         avatar.src = "assets/images/model4.jpg";
//       } else {
//         avatar.src = "assets/images/model3.jpg";
//       }
//     });
//   });

//   // Fonction simple pour vérifier si un champ est vide
//   function isEmpty(value) {
//     return !value || value.trim() === "";
//   }

//   // Validation simple avant envoi
//   function validateForm() {
//     // Exemples de champs obligatoires à valider
//     const requiredFields = [
//       { id: "nom_cl", label: "Nom" },
//       { id: "prenom_cl", label: "Prénom" },  
//       { id: "contact_cl", label: "Contact" },
//       { id: "adresse_cl", label: "Adresse" },
//       { id: "sexe", label: "Sexe" },
//     ];

//     let errors = [];

//     requiredFields.forEach((field) => {
//       const el = document.getElementById(field.id);
//       if (!el || isEmpty(el.value)) {
//         errors.push(`Le champ ${field.label} est obligatoire.`);
//       }
//     });

//     // Tu peux ajouter ici d'autres validations spécifiques si besoin

//     return errors;
//   }

//   form.addEventListener("submit", function (e) {
//     e.preventDefault();

//     const errors = validateForm();

//     if (errors.length > 0) {
//       Swal.fire({
//         icon: "error",
//         title: "Erreur de validation",
//         html: errors.join("<br>"),
//       });
//       return;
//     }

//     const formData = new FormData(form);
//     if (photoInput.files.length > 0) {
//       formData.append("photo", photoInput.files[0]);
//     }
//     const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

//     fetch("http://localhost:8081/api/clients/ajouter", {
//      headers: {
//        "Accept": "application/json",
//        "Authorization": `Bearer ${token}`,
//      },
//       method: "POST",
//       body: formData,
//     })
//       .then((response) => {
//         if (!response.ok) {
//           return response.json().then((err) => {
//             throw new Error(err.message || "Erreur serveur");
//           });
//         }
//         return response.json();
//       })
//       .then((data) => {
//         if (data.status === "success") {
//           Swal.fire({
//             icon: "success",
//             title: "Succès",
//             text: data.message,
//             timer: 2500,
//             timerProgressBar: true,
//             showConfirmButton: false,
//           });

//           // Reset form & avatar
//           form.reset();
//           avatar.src = defaultImage;

//           // Reset affichage des sections selon sexe (optionnel)
//           femmeOptions.style.display = "none";
//           mesuresRobe.style.display = "none";
//           mesuresJupe.style.display = "none";
//           mesuresHomme.style.display = "none";

//           // Reset sélection des cartes option
//           optionCards.forEach((c) => c.classList.remove("selected"));
//         } else {
//           Swal.fire({
//             icon: "error",
//             title: "Erreur",
//             text: data.message || "Une erreur est survenue.",
//           });
//         }
//       })
//       .catch((err) => {
//         Swal.fire({
//           icon: "error",
//           title: "Erreur réseau ou serveur",
//           text: err.message || "Impossible de contacter le serveur.",
//         });
//       });
//   });
// });
document.addEventListener("DOMContentLoaded", function () {
  const photoInput = document.getElementById("photoInput");
  const avatar = document.getElementById("avatar");
  const sexe = document.getElementById("sexe");
  const femmeOptions = document.getElementById("femmeOptions");
  const mesuresRobe = document.getElementById("mesuresRobe");
  const mesuresJupe = document.getElementById("mesuresJupe");
  const mesuresHomme = document.getElementById("mesuresHomme");
  const form = document.getElementById("measurementForm");
  const optionCards = document.querySelectorAll(".option-card");
  const genderRadios = document.querySelectorAll('input[name="genderPreview"]');
  const defaultImage = avatar.src;

  avatar.addEventListener("click", () => photoInput.click());

  photoInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (event) {
        avatar.src = event.target.result;
        avatar.style.objectFit = "cover";
      };
      reader.readAsDataURL(file);
    }
  });

  sexe.addEventListener("change", () => {
    const val = sexe.value;
    femmeOptions.style.display = "none";
    mesuresRobe.style.display = "none";
    mesuresJupe.style.display = "none";
    mesuresHomme.style.display = "none";

    if (val === "Femme") {
      femmeOptions.style.display = "block";
    } else if (val === "Homme") {
      mesuresHomme.style.display = "block";
    }
  });

  optionCards.forEach((card) => {
    card.addEventListener("click", () => {
      optionCards.forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");

      const radio = card.querySelector(".form-check-input");
      radio.checked = true;

      const option = card.getAttribute("data-option");
      mesuresRobe.style.display = option === "robe" ? "block" : "none";
      mesuresJupe.style.display = option === "jupe" ? "block" : "none";
    });
  });

  genderRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      if (radio.value === "Femme") {
        avatar.src = "assets/images/model4.jpg";
      } else {
        avatar.src = "assets/images/model3.jpg";
      }
    });
  });

  // Fonction simple pour vérifier si un champ est vide
  function isEmpty(value) {
    return !value || value.trim() === "";
  }

  // Validation améliorée
  function validateForm() {
    const requiredFields = [
      { id: "nom_cl", label: "Nom" },
      { id: "prenom_cl", label: "Prénom" },  
      { id: "contact_cl", label: "Contact" },
      { id: "sexe", label: "Sexe" }, 
    ];

    let errors = [];

    requiredFields.forEach((field) => {
      const el = document.getElementById(field.id);
      if (!el || isEmpty(el.value)) {
        errors.push(`Le champ ${field.label} est obligatoire.`);
      }
    });

    // Validation spécifique pour le contact (8 chiffres)
    const contact = document.getElementById("contact_cl").value;
    if (contact && !/^\d{8}$/.test(contact)) {
      errors.push("Le contact doit contenir exactement 8 chiffres.");
    }

    // Validation du type de vêtement pour les femmes
    const sexeValue = document.getElementById("sexe").value;
    if (sexeValue === "Femme") {
      const typeSelected = document.querySelector('input[name="femme_type"]:checked');
      if (!typeSelected) {
        errors.push("Veuillez sélectionner un type de vêtement (Robe ou Jupe).");
      }
    }

    return errors;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const errors = validateForm();

    if (errors.length > 0) {
      Swal.fire({
        icon: "error",
        title: "Erreur de validation",
        html: errors.join("<br>"),
      });
      return;
    }

    // ✅ CORRECTION : Préparer le FormData AVEC GESTION DES DOUBLONS
    const formData = new FormData();
    
    // ✅ CORRECTION : Liste des champs déjà ajoutés pour éviter les doublons
    const addedFields = new Set();
    
    // Ajouter tous les champs du formulaire
    const formElements = form.elements;
    for (let element of formElements) {
      if (element.name && element.type !== 'file') {
        if (element.type === 'checkbox' || element.type === 'radio') {
          if (element.checked) {
            // ✅ CORRECTION : Éviter les doublons pour genderPreview
            if (element.name === 'genderPreview' && addedFields.has('genderPreview')) {
              console.log("⚠️ Doublon genderPreview ignoré:", element.value);
              continue;
            }
            formData.append(element.name, element.value);
            addedFields.add(element.name);
          }
        } else {
          formData.append(element.name, element.value);
          addedFields.add(element.name);
        }
      }
    }

    // ✅ CORRECTION : Ajouter genderPreview UNE SEULE FOIS si pas déjà fait
    const selectedGender = document.querySelector('input[name="genderPreview"]:checked');
    if (selectedGender && !addedFields.has('genderPreview')) {
      formData.append("genderPreview", selectedGender.value);
      addedFields.add('genderPreview');
    }

    // Ajouter la photo si elle existe
    if (photoInput.files.length > 0) {
      formData.append("photo", photoInput.files[0]);
    }

    console.log("📤 Données envoyées CORRIGÉES:");
    for (let [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }

    const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    if (!token) {
      Swal.fire({
        icon: "error",
        title: "Erreur d'authentification",
        text: "Veuillez vous reconnecter.",
      });
      return;
    }

    // ✅ CORRECTION : Ajouter un loader pour éviter les double-clics
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Enregistrement...';

    fetch("http://localhost:8081/api/clients/ajouter", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      body: formData,
        })
          .then((response) => {
            console.log("📥 Réponse reçue - Status:", response.status);
            
            if (!response.ok) {
              return response.text().then(text => {
                console.error("❌ Erreur réponse:", text);
                let errorMessage = "Erreur serveur";
                try {
                  const errorData = JSON.parse(text);
                  errorMessage = errorData.message || errorMessage;
                } catch (e) {
                  errorMessage = text || errorMessage;
                }
                throw new Error(errorMessage);
              });
            }
            return response.json();
          })
          .then((data) => {
            console.log("✅ Succès - Données:", data);
            
            if (data.status === "success") {
              Swal.fire({
                icon: "success",
                title: "Succès",
                text: data.message,
                timer: 2500,
                timerProgressBar: true,
                showConfirmButton: false,
              });

              // Reset form & avatar
              form.reset();
              avatar.src = defaultImage;
              avatar.style.objectFit = "contain";

              // Reset affichage des sections
              femmeOptions.style.display = "none";
              mesuresRobe.style.display = "none";
              mesuresJupe.style.display = "none";
              mesuresHomme.style.display = "none";

              // Reset sélection des cartes option
              optionCards.forEach((c) => c.classList.remove("selected"));
              
              // Reset les radios gender
              document.getElementById('previewFemale').checked = true;
              
              // Recharger la liste des clients si la fonction existe
              if (typeof window.fetchClients === 'function') {
                setTimeout(() => window.fetchClients(), 1000);
              }
            } else {
              Swal.fire({
                icon: "error",
                title: "Erreur",
                text: data.message || "Une erreur est survenue.",
              });
            }
          })
          .catch((err) => {
            console.error("💥 Erreur complète:", err);
            Swal.fire({
              icon: "error",
              title: "Erreur",
              text: err.message || "Impossible de contacter le serveur.",
            });
          })
          .finally(() => {
            // ✅ CORRECTION : Toujours réactiver le bouton
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
          });
      });
  });