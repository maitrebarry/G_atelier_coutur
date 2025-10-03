// 🔧 CONFIGURATION
		const API_BASE_URL = "http://localhost:8081";
		const apiUtilisateurs = `${API_BASE_URL}/api/utilisateurs`;

		// Fonction pour vérifier si l'utilisateur a une permission spécifique
		function hasPermission(permissionCode) {
			const userData = getUserData();
			const userRole = userData.role;

			console.log("🔐 Vérification permission:", permissionCode, "pour rôle:", userRole);

			// SUPERADMIN a toutes les permissions
			if (userRole === 'SUPERADMIN') {
				console.log("👑 SUPERADMIN - Toutes les permissions accordées");
				return true;
			}

			// Vérifier si l'utilisateur a des permissions individuelles
			if (userData.permissions && Array.isArray(userData.permissions)) {
				const hasPerm = userData.permissions.some(perm =>
					perm.code === permissionCode
				);
				console.log("📋 Permission individuelle trouvée:", hasPerm);
				return hasPerm;
			}

			console.log("⚠️ Aucune permission individuelle, utilisation du fallback par rôle");

			// Fallback : vérification par rôle (SEULEMENT si pas de permissions individuelles)
			const rolePermissions = {
				'PROPRIETAIRE': ['MODELE_VIEW', 'CLIENT_VIEW', 'TAILLEUR_VIEW', 'RENDEZVOUS_VIEW', 'PAIEMENT_VIEW', 'PARAMETRE_VIEW', 'AFFECTATION_VIEW'],
				'SECRETAIRE': ['MODELE_VIEW', 'CLIENT_VIEW', 'TAILLEUR_VIEW', 'RENDEZVOUS_VIEW', 'PAIEMENT_VIEW'],
				'TAILLEUR': ['MODELE_VIEW'] // TAILLEUR ne devrait pas voir CLIENT_VIEW par défaut
			};

			const hasRolePermission = rolePermissions[userRole] && rolePermissions[userRole].includes(permissionCode);
			console.log("🎭 Permission par rôle:", hasRolePermission);

			return hasRolePermission;
		}
		// Fonction pour gérer l'affichage des sections de données selon les permissions
		function applyDataSectionsPermissions() {
			console.log("📊 Application des permissions aux sections de données...");

			// Cacher toutes les sections de données d'abord
			document.querySelectorAll('.data-section').forEach(section => {
				section.style.display = 'none';
			});

			// Afficher seulement les sections avec les permissions appropriées
			document.querySelectorAll('.data-section').forEach(section => {
				const requiredPermission = section.getAttribute('data-permission');

				if (requiredPermission && hasPermission(requiredPermission)) {
					section.style.display = '';
					console.log("✅ Afficher section avec permission:", requiredPermission);
				} else {
					console.log("❌ Cacher section - Permission manquante:", requiredPermission);
				}
			});
		}
		// Modifier la fonction applyPermissions pour inclure les data-sections
		function applyPermissions() {
			const userData = getUserData();
			const userRole = userData.role;

			console.log("🔐 Application des permissions pour:", userRole);
			console.log("📋 Permissions disponibles:", userData.permissions);

			// 1. Cacher tous les éléments avec permissions du menu
			document.querySelectorAll('.permission-required').forEach(element => {
				element.style.display = 'none';
			});

			// 2. Afficher seulement les éléments du menu avec les permissions appropriées
			document.querySelectorAll('.permission-required').forEach(element => {
				const requiredPermission = element.getAttribute('data-permissions');

				if (requiredPermission && hasPermission(requiredPermission)) {
					element.style.display = '';
					console.log("✅ Afficher élément menu avec permission:", requiredPermission);
				} else {
					console.log("❌ Cacher élément menu - Permission manquante:", requiredPermission);
				}
			});

			// 3. Tableau de bord toujours visible
			const tableauBord = document.querySelector('a[href="home.html"]').closest('li');
			if (tableauBord) {
				tableauBord.style.display = '';
			}

			// 4. Appliquer les permissions aux sections de données
			applyDataSectionsPermissions();

			// 5. Charger les données du tableau de bord selon les permissions
			loadDashboardData();
		}
		// Charger les permissions de l'utilisateur connecté
		async function loadUserPermissions() {
			try {
				const token = getToken();
				if (!token) {
					console.warn("❌ Token non disponible");
					return [];
				}

				const userData = getUserData();
				console.log("👤 Chargement permissions pour:", userData.userId);

				// Appel API pour récupérer les permissions de l'utilisateur
				const response = await fetch(`${apiUtilisateurs}/${userData.userId}/permissions`, {
					headers: {
						'Authorization': `Bearer ${token}`,
						'Content-Type': 'application/json'
					}
				});

				console.log("📡 Statut réponse permissions:", response.status);

				if (response.ok) {
					const permissions = await response.json();

					// Mettre à jour les données utilisateur avec les permissions
					const currentUserData = getUserData();
					currentUserData.permissions = permissions;

					// Sauvegarder dans le storage
					localStorage.setItem("userData", JSON.stringify(currentUserData));
					if (sessionStorage.getItem("authToken")) {
						sessionStorage.setItem("userData", JSON.stringify(currentUserData));
					}

					console.log("✅ Permissions utilisateur chargées:", permissions);
					return permissions;
				} else {
					console.warn("⚠️ Impossible de charger les permissions individuelles, statut:", response.status);
					return [];
				}
			} catch (error) {
				console.error('❌ Erreur chargement permissions:', error);
				return [];
			}
		}

		// Simplifier loadDashboardData - maintenant les sections sont gérées par applyDataSectionsPermissions
		async function loadDashboardData() {
			try {
				const token = getToken();
				if (!token) return;

				console.log("📊 Chargement des données dashboard...");

				// Commandes en cours - Permission: MODELE_VIEW
				if (hasPermission('MODELE_VIEW')) {
					document.getElementById('commandesEnCours').textContent = '12';
					console.log("✅ Données modèles chargées");
				}

				// Revenus - Permission: PAIEMENT_VIEW
				if (hasPermission('PAIEMENT_VIEW')) {
					document.getElementById('revenusMois').textContent = '285,000 FCFA';
					console.log("✅ Données paiements chargées");
				}

				// Clients - Permission: CLIENT_VIEW
				if (hasPermission('CLIENT_VIEW')) {
					document.getElementById('clientsActifs').textContent = '45';
					console.log("✅ Données clients chargées");
				}

				// Tailleurs - Permission: TAILLEUR_VIEW
				if (hasPermission('TAILLEUR_VIEW')) {
					document.getElementById('tailleursActifs').textContent = '3';
					console.log("✅ Données tailleurs chargées");
				}

				// Modèles terminés - Permission: MODELE_VIEW
				if (hasPermission('MODELE_VIEW')) {
					document.getElementById('modelesTermines').textContent = '8';
				}

				// Rendez-vous - Permission: RENDEZVOUS_VIEW
				if (hasPermission('RENDEZVOUS_VIEW')) {
					document.getElementById('rdvAujourdhui').textContent = '4';
				}

				// Paiements en attente - Permission: PAIEMENT_VIEW
				if (hasPermission('PAIEMENT_VIEW')) {
					document.getElementById('paiementsAttente').textContent = '2';
				}

				// Satisfaction clients - Permission: CLIENT_VIEW
				if (hasPermission('CLIENT_VIEW')) {
					document.getElementById('satisfactionClients').textContent = '92%';
				}

				// Commandes récentes - Permission: MODELE_VIEW
				if (hasPermission('MODELE_VIEW')) {
					document.getElementById('commandesRecentes').innerHTML = `
                <tr><td>Mariam Diallo</td><td>Boubou</td><td>15/10/2024</td><td><span class="badge bg-warning">En cours</span></td></tr>
                <tr><td>Oumar Traoré</td><td>Costume</td><td>18/10/2024</td><td><span class="badge bg-primary">Planifié</span></td></tr>
                <tr><td>Fatou Bamba</td><td>Robe</td><td>12/10/2024</td><td><span class="badge bg-success">Terminé</span></td></tr>
            `;
				}

				// Tâches tailleur - Permission: MODELE_VIEW + rôle TAILLEUR
				const userData = getUserData();
				if (hasPermission('MODELE_VIEW') && userData.role === 'TAILLEUR') {
					document.getElementById('tachesTailleur').innerHTML = `
                <div class="alert alert-info">Boubou - Client: Mariam Diallo</div>
                <div class="alert alert-warning">Costume - Client: Oumar Traoré</div>
                <div class="alert alert-success">Robe - Client: Fatou Bamba (Terminé)</div>
            `;
				}

			} catch (error) {
				console.error('Erreur chargement dashboard:', error);
			}
		}
		// Initialisation au chargement de la page
		document.addEventListener('DOMContentLoaded', async function () {
			if (typeof isAuthenticated === 'function' && isAuthenticated()) {
				console.log("🚀 Initialisation de l'application...");

				// Charger les permissions de l'utilisateur
				const permissions = await loadUserPermissions();
				console.log("🔐 Permissions disponibles:", permissions);

				// Appliquer les permissions à l'interface
				applyPermissions();

			} else {
				console.log("🔒 Non authentifié, redirection...");
				window.location.href = 'index.html';
			}
		});

		// Corriger les erreurs ApexCharts
		document.addEventListener('DOMContentLoaded', function () {
			// Vérifier que les éléments existent avant d'initialiser les graphiques
			const chartSelectors = ['#chart1', '#chart2', '#chart3', '#chart4'];
			chartSelectors.forEach(selector => {
				const element = document.querySelector(selector);
				if (!element) {
					console.warn(`⚠️ Élément graphique non trouvé: ${selector}`);
				}
			});
		});