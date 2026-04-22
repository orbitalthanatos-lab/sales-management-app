export function createCard({ id, title, valueId, subId }) {
  return `
    <div class="card" id="${id}">
      <p>${title}</p>
      <h2 id="${valueId}">-</h2>
      <small id="${subId}"></small>
    </div>
  `;
}