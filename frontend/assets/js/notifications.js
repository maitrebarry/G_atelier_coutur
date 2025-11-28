// notifications.js - Système de notifications global
class NotificationManager {
    constructor() {
        this.notifications = JSON.parse(localStorage.getItem('atelier_notifications')) || [];
        this.init();
    }

    init() {
        this.updateNotificationBadge();
        this.loadNotificationsInHeader();
        this.setupEventListeners();
    }

    // Ajouter une notification
    add(titre, message, type = 'info', lien = null, metadata = {}) {
        const notification = {
            id: Date.now().toString(),
            titre: titre,
            message: message,
            type: type,
            lien: lien,
            metadata: metadata,
            date: new Date().toISOString(),
            lu: false,
            source: 'atelier_app'
        };
        
        this.notifications.unshift(notification);
        
        // Garder seulement les 100 dernières notifications
        if (this.notifications.length > 100) {
            this.notifications = this.notifications.slice(0, 100);
        }
        
        this.save();
        this.updateNotificationBadge();
        this.loadNotificationsInHeader();
        
        // Émettre un événement personnalisé pour les autres composants
        window.dispatchEvent(new CustomEvent('notificationAdded', { 
            detail: notification 
        }));
        
        return notification;
    }

    // Sauvegarder dans localStorage
    save() {
        localStorage.setItem('atelier_notifications', JSON.stringify(this.notifications));
    }

    // Mettre à jour le badge
    updateNotificationBadge() {
        const badge = document.querySelector('.alert-count');
        const notificationsNonLues = this.notifications.filter(notif => !notif.lu).length;
        
        if (badge) {
            if (notificationsNonLues > 0) {
                badge.textContent = notificationsNonLues > 99 ? '99+' : notificationsNonLues;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    // Charger dans le header
    loadNotificationsInHeader() {
        const notificationsList = document.querySelector('.header-notifications-list');
        if (!notificationsList) return;

        const notificationsRecentees = this.notifications.slice(0, 8); // 8 plus récentes

        if (notificationsRecentees.length === 0) {
            notificationsList.innerHTML = `
                <div class="text-center p-3">
                    <i class="bx bx-bell-off text-muted fs-1"></i>
                    <p class="text-muted mb-0">Aucune notification</p>
                </div>
            `;
            return;
        }

        notificationsList.innerHTML = notificationsRecentees.map(notif => `
            <a class="dropdown-item" href="${notif.lien || 'javascript:void(0);'}" 
               onclick="window.NotificationManager.markAsRead('${notif.id}')">
                <div class="d-flex align-items-center ${notif.lu ? '' : 'notification-unread'}">
                    <div class="notify bg-${this.getTypeClass(notif.type)}">
                        <i class="bx ${this.getIcon(notif.type)}"></i>
                    </div>
                    <div class="flex-grow-1 ms-3">
                        <div class="d-flex align-items-center justify-content-between">
                            <h6 class="mb-0" style="font-size: 0.9rem;">${notif.titre}</h6>
                            <small class="text-muted">${this.formatDate(notif.date)}</small>
                        </div>
                        <p class="mb-0 text-muted" style="font-size: 0.8rem; line-height: 1.2;">${notif.message}</p>
                        ${notif.metadata.source ? `<small class="text-info">${notif.metadata.source}</small>` : ''}
                    </div>
                </div>
            </a>
        `).join('');
    }

    // Marquer comme lu
    markAsRead(notificationId) {
        this.notifications = this.notifications.map(notif => 
            notif.id === notificationId ? { ...notif, lu: true } : notif
        );
        this.save();
        this.updateNotificationBadge();
        this.loadNotificationsInHeader();
    }

    // Marquer toutes comme lues
    markAllAsRead() {
        this.notifications = this.notifications.map(notif => ({ ...notif, lu: true }));
        this.save();
        this.updateNotificationBadge();
        this.loadNotificationsInHeader();
        
        if (typeof showSuccess === 'function') {
            showSuccess('Toutes les notifications marquées comme lues');
        } else {
            console.log('✅ Toutes les notifications marquées comme lues');
        }
    }

    // Obtenir les notifications non lues
    getUnreadCount() {
        return this.notifications.filter(notif => !notif.lu).length;
    }

    // Obtenir les notifications récentes
    getRecent(limit = 10) {
        return this.notifications.slice(0, limit);
    }

    // Supprimer une notification
    remove(notificationId) {
        this.notifications = this.notifications.filter(notif => notif.id !== notificationId);
        this.save();
        this.updateNotificationBadge();
        this.loadNotificationsInHeader();
    }

    // Vider toutes les notifications
    clearAll() {
        this.notifications = [];
        this.save();
        this.updateNotificationBadge();
        this.loadNotificationsInHeader();
    }

    // Utilitaires
    getTypeClass(type) {
        const classes = {
            'success': 'light-success',
            'warning': 'light-warning', 
            'danger': 'light-danger',
            'info': 'light-info'
        };
        return classes[type] || 'light-primary';
    }

    getIcon(type) {
        const icons = {
            'success': 'bx-check-circle',
            'warning': 'bx-time',
            'danger': 'bx-error',
            'info': 'bx-info-circle'
        };
        return icons[type] || 'bx-bell';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'À l\'instant';
        if (diffMins < 60) return `Il y a ${diffMins} min`;
        if (diffHours < 24) return `Il y a ${diffHours} h`;
        if (diffDays < 7) return `Il y a ${diffDays} j`;
        return date.toLocaleDateString('fr-FR');
    }

    // Configuration des événements
    setupEventListeners() {
        // Marquer tout comme lu
        const markAllReadBtn = document.querySelector('.msg-header-clear');
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', () => this.markAllAsRead());
        }

        // Actualiser quand on ouvre le dropdown
        const notificationDropdown = document.querySelector('[data-bs-toggle="dropdown"]');
        if (notificationDropdown) {
            notificationDropdown.addEventListener('click', () => {
                setTimeout(() => this.loadNotificationsInHeader(), 100);
            });
        }

        // Écouter les événements de notification depuis d'autres fichiers
        window.addEventListener('newNotification', (event) => {
            if (event.detail) {
                this.add(
                    event.detail.titre,
                    event.detail.message,
                    event.detail.type,
                    event.detail.lien,
                    event.detail.metadata
                );
            }
        });
    }
}

// Initialisation globale
window.NotificationManager = new NotificationManager();