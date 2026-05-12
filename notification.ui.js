// =====================================================
// Notification UI Module
// Reusable toast notification system
// =====================================================

let notificationContainer = null;

/**
 * Ensures the toast container exists in the DOM.
 */
function ensureNotificationContainer() {
    if (notificationContainer) return notificationContainer;

    notificationContainer = document.getElementById("notification-container");

    if (!notificationContainer) {
        notificationContainer = document.createElement("div");
        notificationContainer.id = "notification-container";
        document.body.appendChild(notificationContainer);
    }

    return notificationContainer;
}

/**
 * Displays a toast notification.
 *
 * @param {string} message - Text to display.
 * @param {string} type - success | error | warning | info
 * @param {number} duration - Time in milliseconds.
 */
export function showNotification(message, type = "info", duration = 3000) {
    const container = ensureNotificationContainer();

    const toast = document.createElement("div");
    toast.className = `notification notification-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add("show");
    });

    // Hide after duration
    setTimeout(() => {
        toast.classList.remove("show");

        setTimeout(() => {
            toast.remove();
        }, 300);
    }, duration);
}