// ==============================
// CARD COMPONENT
// ==============================

export function createCard({ id, title, valueId, subId }) {
  return `
    <div class="card" id="${id}">
      <p>${title}</p>
      <h2 id="${valueId}">-</h2>
      <small id="${subId}"></small>
    </div>
  `;
}

// ==============================
// MODAL CLOSE BUTTON COMPONENT
// ==============================

export function createModalCloseButton(id, ariaLabel = "Close") {
  return `
    <div class="modal-close-wrapper">
      <button
        id="${id}"
        class="modal-close-btn"
        type="button"
        aria-label="${ariaLabel}"
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <span class="modal-close-tooltip">Close</span>
    </div>
  `;
}