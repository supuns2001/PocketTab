document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const pageTitleInput = document.getElementById("pageTitleInput");
  const pageUrlInput = document.getElementById("pageUrlInput");
  const noteInput = document.getElementById("noteInput");
  const saveBtn = document.getElementById("saveBtn");
  const searchInput = document.getElementById("searchInput");
  const linksContainer = document.getElementById("linksContainer");
  const emptyState = document.getElementById("emptyState");
  const linkCount = document.getElementById("linkCount");

  let savedItems = [];

  // Initialize
  init();

  async function init() {
    await fetchActiveTabInfo();
    await loadSavedItems();
    setupEventListeners();
  }

  // Fetch active tab title and URL
  async function fetchActiveTabInfo() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        pageTitleInput.value = tab.title || "Untitled Page";
        pageUrlInput.value = tab.url || "";
      } else {
        pageTitleInput.value = "Unable to get current tab";
      }
    } catch (error) {
      console.error("Error fetching tab info:", error);
      pageTitleInput.value = "Error fetching tab details";
    }
  }

  // Load saved items from chrome.storage.local
  async function loadSavedItems() {
    try {
      const result = await chrome.storage.local.get(["readLaterNotes"]);
      savedItems = result.readLaterNotes || [];
      renderItems(savedItems);
    } catch (error) {
      console.error("Error loading items from storage:", error);
    }
  }

  // Setup Event Listeners
  function setupEventListeners() {
    // Save button click
    saveBtn.addEventListener("click", handleSaveItem);

    // Search filter input
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase().trim();
      const filtered = savedItems.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.note.toLowerCase().includes(query)
      );
      renderItems(filtered);
    });
  }

  // Save new item logic
  async function handleSaveItem() {
    const title = pageTitleInput.value.trim();
    const url = pageUrlInput.value.trim();
    const note = noteInput.value.trim();

    if (!url) {
      alert("No active web page URL found to save!");
      return;
    }

    const newItem = {
      id: Date.now(),
      title: title || url,
      url: url,
      note: note || "No custom note added.",
      date: new Date().toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric"
      })
    };

    savedItems.unshift(newItem); // Add new item to beginning

    try {
      await chrome.storage.local.set({ readLaterNotes: savedItems });
      noteInput.value = ""; // Reset note textarea
      renderItems(savedItems);
    } catch (error) {
      console.error("Error saving item:", error);
      alert("Failed to save note. Please try again.");
    }
  }

  // Delete item logic
  async function handleDeleteItem(id) {
    savedItems = savedItems.filter((item) => item.id !== id);
    try {
      await chrome.storage.local.set({ readLaterNotes: savedItems });
      const currentQuery = searchInput.value.toLowerCase().trim();
      const filtered = savedItems.filter(
        (item) =>
          item.title.toLowerCase().includes(currentQuery) ||
          item.note.toLowerCase().includes(currentQuery)
      );
      renderItems(filtered);
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  }

  // Render items list into HTML
  function renderItems(itemsToRender) {
    linkCount.textContent = `${savedItems.length} saved`;
    linksContainer.innerHTML = "";

    if (itemsToRender.length === 0) {
      emptyState.classList.remove("hidden");
      return;
    }

    emptyState.classList.add("hidden");

    itemsToRender.forEach((item) => {
      const card = document.createElement("div");
      card.className = "link-card";

      card.innerHTML = `
        <div class="card-header">
          <a href="#" class="card-title" title="${item.url}">${escapeHtml(item.title)}</a>
        </div>
        <div class="card-note">${escapeHtml(item.note)}</div>
        <div class="card-footer">
          <span class="card-date">📅 ${item.date}</span>
          <div class="card-actions">
            <button class="action-btn open-btn" title="Open Link">🚀 Open</button>
            <button class="action-btn delete-btn" title="Delete Note">🗑️ Delete</button>
          </div>
        </div>
      `;

      // Open link handler
      const titleLink = card.querySelector(".card-title");
      const openBtn = card.querySelector(".open-btn");

      const openHandler = (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: item.url });
      };

      titleLink.addEventListener("click", openHandler);
      openBtn.addEventListener("click", openHandler);

      // Delete handler
      const deleteBtn = card.querySelector(".delete-btn");
      deleteBtn.addEventListener("click", () => handleDeleteItem(item.id));

      linksContainer.appendChild(card);
    });
  }

  // Utility to prevent XSS in rendered HTML
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
});