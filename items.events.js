// ==============================
//  FILTER SETUP
// ============================== 

export function setupFilters(setSearchQuery, setStatusFilter) {

  const searchInput = document.getElementById("searchInput");
  const statusSelect = document.getElementById("statusFilter");

  searchInput?.addEventListener("input", (e) => {
    setSearchQuery(e.target.value.toLowerCase());
  });

  statusSelect?.addEventListener("change", (e) => {
    setStatusFilter(e.target.value);
  });

}