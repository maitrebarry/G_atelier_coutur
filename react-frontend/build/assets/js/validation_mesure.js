// document.addEventListener("DOMContentLoaded", function () {
//   // Éléments DOM
//   const photoInput = document.getElementById("photoInput");
//   const avatar = document.getElementById("avatar");
//   const sexe = document.getElementById("sexe");
//   const mesuresFemme = document.getElementById("mesuresFemme");
//   const mesuresHomme = document.getElementById("mesuresHomme");
//   const form = document.getElementById("measurementForm");

//   // Image par défaut
//   // const defaultImage = avatar.src;

//   // Gestion de la photo
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

//   // Gestion du changement de sexe
//   sexe.addEventListener("change", () => {
//     const val = sexe.value;
//     mesuresFemme.style.display = val === "Femme" ? "block" : "none";
//     mesuresHomme.style.display = val === "Homme" ? "block" : "none";
//   });

//   // Validation du formulaire
//   form.addEventListener("submit", function (e) {
//     e.preventDefault();
//     let isValid = true;

//     // Réinitialiser les erreurs
//     const fields = form.querySelectorAll(".required-field");
//     fields.forEach((field) => {
//       field.classList.remove("is-invalid");
//     });

//     // Validation des champs obligatoires
//     const requiredFields = form.querySelectorAll(".required-field");
//     requiredFields.forEach((field) => {
//       if (!field.value.trim()) {
//         field.classList.add("is-invalid");
//         isValid = false;
//       }
//     });
//     // Si le formulaire est valide, afficher un message
//     if (isValid) {
//       // Dans un cas réel, on enverrait les données au serveur
//       alert(
//         "Formulaire validé avec succès ! Les données ont été enregistrées."
//       );
//       form.reset();
//       avatar.src = defaultImage;
//       mesuresFemme.style.display = "none";
//       mesuresHomme.style.display = "none";
//     } else {
//       // Mettre en surbrillance le premier champ invalide
//       const firstInvalid = form.querySelector(".is-invalid");
//       if (firstInvalid) {
//         firstInvalid.focus();
//       }
//     }
//   });

//   // Validation en temps réel
//   form.querySelectorAll(".required-field").forEach((field) => {
//     field.addEventListener("input", function () {
//       if (this.value.trim()) {
//         this.classList.remove("is-invalid");
//       }
//     });
//   });
// });
document.addEventListener("DOMContentLoaded", function () {
  const photoInput = document.getElementById("photoInput");
  const avatar = document.getElementById("avatar");
  const sexe = document.getElementById("sexe");
  const mesuresFemme = document.getElementById("mesuresFemme");
  const mesuresHomme = document.getElementById("mesuresHomme");
  const form = document.getElementById("measurementForm");
  const defaultImage = "assets/images/model1.png";

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
    mesuresFemme.style.display = val === "Femme" ? "block" : "none";
    mesuresHomme.style.display = val === "Homme" ? "block" : "none";
  });

 form.addEventListener("submit", async function (e) {
   e.preventDefault();

   let isValid = true;
   const fields = form.querySelectorAll(".required-field");
   fields.forEach((field) => field.classList.remove("is-invalid"));

   fields.forEach((field) => {
     if (!field.value.trim()) {
       field.classList.add("is-invalid");
       isValid = false;
     }
   });

   // ❌ STOP ici si le formulaire n’est pas valide
   if (!isValid) {
     const firstInvalid = form.querySelector(".is-invalid");
     if (firstInvalid) firstInvalid.focus();
     return; // <--- C’EST CE `return` QUI EST ESSENTIEL !!
   }

   // ✔ Si le formulaire est valide, on continue :
   const client = {};
   form.querySelectorAll("input, select").forEach((input) => {
     if (input.name && input.type !== "file") {
       client[input.name] = input.value.trim();
     }
   });

   const formData = new FormData();
   formData.append("client", JSON.stringify(client));

   const photo = document.getElementById("photoInput").files[0];
   if (photo) {
     formData.append("photo", photo);
   } else {
     alert("Veuillez ajouter une photo !");
     return;
   }

   try {
    //  const response = await fetch("http://localhost:8080/api/clients/ajouter", {
    //    method: "POST",
    //    body: formData,
    //  });

    const token =localStorage.getItem("authToken") || sessionStorage.getItem("authToken");

    const response = await fetch("http://localhost:8081/api/clients/ajouter", {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      method: "POST",
      body: formData,
    });


     const result = await response.text();
     alert("✅ Succès : " + result);

     form.reset();
     avatar.src = "assets/images/model1.png";
     mesuresFemme.style.display = "none";
     mesuresHomme.style.display = "none";
   } catch (err) {
     alert("❌ Erreur : " + err.message);
   }
 });

});

