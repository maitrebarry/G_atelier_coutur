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

  // Validation simple avant envoi
  function validateForm() {
    // Exemples de champs obligatoires à valider
    const requiredFields = [
      { id: "nom_cl", label: "Nom" },
      { id: "prenom_cl", label: "Prénom" },  
      { id: "contact_cl", label: "Contact" },
      { id: "adresse_cl", label: "Adresse" },
      { id: "sexe", label: "Sexe" },
    ];

    let errors = [];

    requiredFields.forEach((field) => {
      const el = document.getElementById(field.id);
      if (!el || isEmpty(el.value)) {
        errors.push(`Le champ ${field.label} est obligatoire.`);
      }
    });

    // Tu peux ajouter ici d'autres validations spécifiques si besoin

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

    const formData = new FormData(form);
    if (photoInput.files.length > 0) {
      formData.append("photo", photoInput.files[0]);
    }
    const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    fetch("http://localhost:8081/api/clients/ajouter", {
     headers: {
       "Accept": "application/json",
       "Authorization": `Bearer ${token}`,
     },
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((err) => {
            throw new Error(err.message || "Erreur serveur");
          });
        }
        return response.json();
      })
      .then((data) => {
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

          // Reset affichage des sections selon sexe (optionnel)
          femmeOptions.style.display = "none";
          mesuresRobe.style.display = "none";
          mesuresJupe.style.display = "none";
          mesuresHomme.style.display = "none";

          // Reset sélection des cartes option
          optionCards.forEach((c) => c.classList.remove("selected"));
        } else {
          Swal.fire({
            icon: "error",
            title: "Erreur",
            text: data.message || "Une erreur est survenue.",
          });
        }
      })
      .catch((err) => {
        Swal.fire({
          icon: "error",
          title: "Erreur réseau ou serveur",
          text: err.message || "Impossible de contacter le serveur.",
        });
      });
  });
});
