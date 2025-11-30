    // Liste des images d'arrière-plan
        const backgroundImages = [
            {url: 'assets/images/jupe0.jpg', title: 'Collection Jupe'},
            {url: 'assets/images/jupe1.jpg', title: 'Collection Jupe'},
            {url: 'assets/images/jupe2.jpg', title: 'Collection Jupe'},
            {url: 'assets/images/jupe4.jpg', title: 'Collection Jupe'},
            {url: 'assets/images/jupe5.jpg', title: 'Collection Jupe'},
             {url: 'assets/images/jupe6.jpg', title: 'Collection Jupe'},
             {url: 'assets/images/jupe7.jpg', title: 'Collection Jupe'},
              {url: 'assets/images/jupe8.jpg', title: 'Collection Jupe'},
               {url: 'assets/images/jupe9.jpg', title: 'Collection Jupe'},
                {url: 'assets/images/jupe10.jpg', title: 'Collection Jupe'},
            {url: 'assets/images/model1.png', title: 'Modèle Exclusive'},
            {url: 'assets/images/model2.png', title: 'Modèle Exclusive'},
            {url: 'assets/images/model3.jpg', title: 'Nouvelle Collection'},
            {url: 'assets/images/model4.jpg', title: 'Nouvelle Collection'},
             {url: 'assets/images/model5.jpg', title: 'Nouvelle Collection'}
        ];
        
        let currentImageIndex = 0;
        
        // Fonction pour changer l'image d'arrière-plan (desktop)
        function changeBackgroundImage(index) {
            const backgroundElement = document.getElementById('backgroundImage');
            backgroundElement.style.backgroundImage = `url('${backgroundImages[index].url}')`;
            document.getElementById('imageCounter').textContent = `Image ${index + 1}/${backgroundImages.length}`;
            currentImageIndex = index;
        }
        
        // Fonction pour changer l'image mobile
        function changeMobileImage(index) {
            const mobileItem = document.getElementById('mobileCarouselItem');
            mobileItem.style.backgroundImage = `url('${backgroundImages[index].url}')`;
            const caption = mobileItem.querySelector('.mobile-carousel-caption h6');
            caption.textContent = backgroundImages[index].title;
            document.getElementById('mobileImageCounter').textContent = `${index + 1}/${backgroundImages.length}`;
            currentImageIndex = index;
        }
        
        // Fonction pour passer à l'image suivante
        function nextImage() {
            let nextIndex = currentImageIndex + 1;
            if (nextIndex >= backgroundImages.length) {
                nextIndex = 0;
            }
            changeBackgroundImage(nextIndex);
            changeMobileImage(nextIndex);
        }
        
        // Fonction pour passer à l'image précédente
        function prevImage() {
            let prevIndex = currentImageIndex - 1;
            if (prevIndex < 0) {
                prevIndex = backgroundImages.length - 1;
            }
            changeBackgroundImage(prevIndex);
            changeMobileImage(prevIndex);
        }
        
        // Fonctions spécifiques pour mobile
        function nextMobileImage() {
            let nextIndex = currentImageIndex + 1;
            if (nextIndex >= backgroundImages.length) {
                nextIndex = 0;
            }
            changeMobileImage(nextIndex);
            changeBackgroundImage(nextIndex);
        }
        
        function prevMobileImage() {
            let prevIndex = currentImageIndex - 1;
            if (prevIndex < 0) {
                prevIndex = backgroundImages.length - 1;
            }
            changeMobileImage(prevIndex);
            changeBackgroundImage(prevIndex);
        }
        
        // Défilement automatique des images
        let carouselInterval = setInterval(nextImage, 4000);
        
        // Initialiser avec la première image
       document.addEventListener("DOMContentLoaded", function () {
         // Si déjà connecté, rediriger vers home
         if (isAuthenticated()) {
           window.location.href = "home.html";
         }
         changeBackgroundImage(0);
         changeMobileImage(0);

         // Gestion de l'affichage/masquage du mot de passe
         $("#show_hide_password a").on("click", function (event) {
           event.preventDefault();
           if ($("#show_hide_password input").attr("type") == "text") {
             $("#show_hide_password input").attr("type", "password");
             $("#show_hide_password i").addClass("bx-hide");
             $("#show_hide_password i").removeClass("bx-show");
           } else if (
             $("#show_hide_password input").attr("type") == "password"
           ) {
             $("#show_hide_password input").attr("type", "text");
             $("#show_hide_password i").removeClass("bx-hide");
             $("#show_hide_password i").addClass("bx-show");
           }
         });

         // Gestion de la soumission du formulaire
         $("#loginForm").on("submit", function (e) {
           e.preventDefault();

           const email = $("#inputEmailAddress").val();
           const password = $("#inputChoosePassword").val();
           const rememberMe = $("#rememberMe").is(":checked");

           // Validation basique
           if (!email || !password) {
             Swal.fire({
               icon: "error",
               title: "Champs manquants",
               text: "Veuillez remplir tous les champs",
               confirmButtonColor: "#4e73df",
             });
             return;
           }

           // Afficher le spinner et désactiver le bouton
           $("#loginButton").prop("disabled", true);
           $("#loginSpinner").removeClass("d-none");

           // Appel à l'API de login
           $.ajax({
             url: "http://localhost:8081/api/auth/login",
             type: "POST",
             contentType: "application/json",
             data: JSON.stringify({
               email: email,
               password: password,
             }),
             success: function (response) {
               // Stocker le token ET les informations utilisateur
               const userData = {
                 token: response.token,
                 userId: response.id,
                 email: response.email,
                 prenom: response.prenom,
                 nom: response.nom,
                 role: response.role,
                 atelierId: response.atelierId, // Important pour les requêtes multi-ateliers
               };

               if (rememberMe) {
                 localStorage.setItem("authToken", response.token);
                 localStorage.setItem("userData", JSON.stringify(userData));
               } else {
                 sessionStorage.setItem("authToken", response.token);
                 sessionStorage.setItem("userData", JSON.stringify(userData));
               }

               // Redirection
               window.location.href = "home.html";
             },
             error: function (xhr) {
               // Afficher l'erreur
               let errorMessage = "Erreur de connexion";
               if (xhr.responseJSON && xhr.responseJSON.error) {
                 errorMessage = xhr.responseJSON.error;
               } else if (xhr.status === 0) {
                 errorMessage = "Impossible de se connecter au serveur";
               }

               Swal.fire({
                 icon: "error",
                 title: "Erreur de connexion",
                 text: errorMessage,
                 confirmButtonColor: "#4e73df",
               });
             },
             complete: function () {
               // Réactiver le bouton
               $("#loginButton").prop("disabled", false);
               $("#loginSpinner").addClass("d-none");
             },
           });
         });

         // Vérifier si l'utilisateur est déjà connecté
         const token =
           localStorage.getItem("authToken") ||
           sessionStorage.getItem("authToken");
         if (token) {
           // Rediriger vers le tableau de bord si déjà connecté
           window.location.href = "home.html";
         }
       });
