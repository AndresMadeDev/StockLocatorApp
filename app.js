import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAgLmZzOsaVGyGRKQ55AaygtZAuBcKGn3Q",
  authDomain: "stock-locator-a2e47.firebaseapp.com",
  projectId: "stock-locator-a2e47",
  storageBucket: "stock-locator-a2e47.firebasestorage.app",
  messagingSenderId: "469986335052",
  appId: "1:469986335052:web:928a2d718be8814c2757e9",
};

const DEPARTMENTS = ["Woman", "Men's", "Kids"];
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let state = { products: [], locations: [] };
let currentUser = null;
let authMode = "sign-in";
let unsubscribeProducts = null;
let unsubscribeLocations = null;
let isShowingAllSearchProducts = false;
let isShowingAllManageProducts = false;
let activeProductDetailId = "";
let activeLocationDetailId = "";

const els = {
  authShell: document.querySelector("#authShell"),
  authForm: document.querySelector("#authForm"),
  authTitle: document.querySelector("#authTitle"),
  authHelp: document.querySelector("#authHelp"),
  authNameField: document.querySelector("#authNameField"),
  authName: document.querySelector("#authName"),
  authEmail: document.querySelector("#authEmail"),
  authPassword: document.querySelector("#authPassword"),
  authSubmit: document.querySelector("#authSubmit"),
  authSecondary: document.querySelector("#authSecondary"),
  forgotPassword: document.querySelector("#forgotPassword"),
  authMessage: document.querySelector("#authMessage"),
  toast: document.querySelector("#toast"),
  appShell: document.querySelector(".app-shell"),
  userEmail: document.querySelector("#userEmail"),
  resendVerification: document.querySelector("#resendVerification"),
  signOutButton: document.querySelector("#signOutButton"),
  inventoryCount: document.querySelector("#inventoryCount"),
  tabButtons: document.querySelectorAll(".tab-button"),
  searchPanel: document.querySelector("#searchPanel"),
  managePanel: document.querySelector("#managePanel"),
  exportPanel: document.querySelector("#exportPanel"),
  searchInput: document.querySelector("#searchInput"),
  searchArea: document.querySelector("#searchArea"),
  searchSection: document.querySelector("#searchSection"),
  searchNumber: document.querySelector("#searchNumber"),
  clearSearch: document.querySelector("#clearSearch"),
  toggleAllProducts: document.querySelector("#toggleAllProducts"),
  resultSummary: document.querySelector("#resultSummary"),
  searchResults: document.querySelector("#searchResults"),
  sectionButtons: document.querySelectorAll(".section-button"),
  productsManager: document.querySelector("#productsManager"),
  locationsManager: document.querySelector("#locationsManager"),
  reportCount: document.querySelector("#reportCount"),
  reportLocation: document.querySelector("#reportLocation"),
  productForm: document.querySelector("#productForm"),
  productId: document.querySelector("#productId"),
  productName: document.querySelector("#productName"),
  productDepartment: document.querySelector("#productDepartment"),
  productColor: document.querySelector("#productColor"),
  productSize: document.querySelector("#productSize"),
  productLocation: document.querySelector("#productLocation"),
  addProductButton: document.querySelector("#addProductButton"),
  backToProducts: document.querySelector("#backToProducts"),
  productsListView: document.querySelector("#productsListView"),
  productDetailView: document.querySelector("#productDetailView"),
  productDetailTitle: document.querySelector("#productDetailTitle"),
  manageProductSearch: document.querySelector("#manageProductSearch"),
  clearManageProductSearch: document.querySelector("#clearManageProductSearch"),
  toggleManageProducts: document.querySelector("#toggleManageProducts"),
  resetProductForm: document.querySelector("#resetProductForm"),
  productList: document.querySelector("#productList"),
  productListCount: document.querySelector("#productListCount"),
  locationForm: document.querySelector("#locationForm"),
  locationId: document.querySelector("#locationId"),
  locationArea: document.querySelector("#locationArea"),
  locationSection: document.querySelector("#locationSection"),
  locationNumber: document.querySelector("#locationNumber"),
  locationProducts: document.querySelector("#locationProducts"),
  resetLocationForm: document.querySelector("#resetLocationForm"),
  addLocationButton: document.querySelector("#addLocationButton"),
  backToLocations: document.querySelector("#backToLocations"),
  locationsListView: document.querySelector("#locationsListView"),
  locationDetailView: document.querySelector("#locationDetailView"),
  locationDetailTitle: document.querySelector("#locationDetailTitle"),
  locationDetailProductCount: document.querySelector("#locationDetailProductCount"),
  locationDetailProducts: document.querySelector("#locationDetailProducts"),
  locationList: document.querySelector("#locationList"),
  locationListCount: document.querySelector("#locationListCount"),
};

function normalizeLoadedState(loadedState) {
  loadedState.products = loadedState.products.map((product) => ({
    ...product,
    department: DEPARTMENTS.includes(product.department) ? product.department : DEPARTMENTS[0],
    locationId: product.locationId || "",
  }));
  loadedState.locations = loadedState.locations.map((location) => ({
    ...location,
    section: location.section || "Main",
    productIds: Array.isArray(location.productIds)
      ? location.productIds
      : location.productId
        ? [location.productId]
        : [],
  }));
  loadedState.locations.forEach((location) => {
    location.productIds.forEach((productId) => {
      const product = loadedState.products.find((item) => item.id === productId);
      if (product) {
        product.locationId = location.id;
      }
    });
  });
  loadedState.locations.forEach((location) => {
    location.productIds = loadedState.products
      .filter((product) => product.locationId === location.id)
      .map((product) => product.id);
  });
  return loadedState;
}

function userDocPath() {
  return ["users", currentUser.uid];
}

function productsCollection() {
  return collection(db, ...userDocPath(), "products");
}

function locationsCollection() {
  return collection(db, ...userDocPath(), "locations");
}

function productDoc(id) {
  return doc(db, ...userDocPath(), "products", id);
}

function locationDoc(id) {
  return doc(db, ...userDocPath(), "locations", id);
}

function productPayload(product) {
  return {
    name: product.name,
    department: product.department,
    color: product.color || "",
    size: product.size || "",
    locationId: product.locationId || "",
  };
}

function locationPayload(location) {
  return {
    area: location.area,
    section: location.section || "Main",
    number: location.number,
    productIds: Array.isArray(location.productIds) ? location.productIds : [],
  };
}

function setAuthMode(mode) {
  authMode = mode;
  const isSignUp = mode === "sign-up";
  els.authTitle.textContent = isSignUp ? "Create account" : "Sign in";
  els.authHelp.textContent = isSignUp
    ? "Create an account so your inventory stays private to you."
    : "Use your email and password to access your inventory.";
  els.authSubmit.textContent = isSignUp ? "Create Account" : "Sign In";
  els.authSecondary.textContent = isSignUp ? "Already have an account?" : "Create Account";
  els.authNameField.classList.toggle("active", isSignUp);
  els.authPassword.autocomplete = isSignUp ? "new-password" : "current-password";
  showAuthMessage("");
}

function showAuthMessage(message, isError = false) {
  els.authMessage.textContent = message;
  els.authMessage.classList.toggle("error", isError);
}

let toastTimer = null;

function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("active");
  toastTimer = setTimeout(() => {
    els.toast.classList.remove("active");
  }, 2400);
}

function friendlyAuthError(error) {
  const code = error && error.code ? error.code : "";
  if (code.includes("invalid-credential")) return "Email or password is incorrect.";
  if (code.includes("email-already-in-use")) return "That email already has an account.";
  if (code.includes("weak-password")) return "Password should be at least 6 characters.";
  if (code.includes("invalid-email")) return "Enter a valid email address.";
  if (code.includes("permission-denied")) return "Firebase rules are blocking this request.";
  if (code.includes("too-many-requests")) return "Too many attempts. Try again later.";
  return "Something went wrong. Please try again.";
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const email = els.authEmail.value.trim();
  const password = els.authPassword.value;

  try {
    els.authSubmit.disabled = true;
    if (authMode === "sign-up") {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const name = els.authName.value.trim();
      if (name) {
        await updateProfile(credential.user, { displayName: name });
      }
      await sendEmailVerification(credential.user);
      showAuthMessage("Account created. We sent a verification email.");
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (error) {
    showAuthMessage(friendlyAuthError(error), true);
  } finally {
    els.authSubmit.disabled = false;
  }
}

async function handleForgotPassword() {
  const email = els.authEmail.value.trim();
  if (!email) {
    showAuthMessage("Enter your email first, then tap Forgot password.", true);
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    showAuthMessage("Password reset email sent.");
  } catch (error) {
    showAuthMessage(friendlyAuthError(error), true);
  }
}

async function handleResendVerification() {
  if (!currentUser) return;

  try {
    await sendEmailVerification(currentUser);
    alert("Verification email sent.");
  } catch (error) {
    alert(friendlyAuthError(error));
  }
}

function detachDataListeners() {
  if (unsubscribeProducts) unsubscribeProducts();
  if (unsubscribeLocations) unsubscribeLocations();
  unsubscribeProducts = null;
  unsubscribeLocations = null;
}

function attachDataListeners() {
  detachDataListeners();
  unsubscribeProducts = onSnapshot(productsCollection(), (snapshot) => {
    state.products = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    state = normalizeLoadedState(state);
    render();
  }, (error) => {
    alert(`Could not load products: ${friendlyAuthError(error)}`);
  });
  unsubscribeLocations = onSnapshot(locationsCollection(), (snapshot) => {
    state.locations = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    state = normalizeLoadedState(state);
    render();
  }, (error) => {
    alert(`Could not load locations: ${friendlyAuthError(error)}`);
  });
}

function setSignedInView(user) {
  currentUser = user;
  els.authShell.classList.toggle("active", !user);
  els.appShell.classList.toggle("active", Boolean(user));
  if (!user) {
    detachDataListeners();
    state = { products: [], locations: [] };
    return;
  }

  els.userEmail.textContent = user.email;
  els.resendVerification.style.display = user.emailVerified ? "none" : "";
  attachDataListeners();
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalize(value) {
  return value.trim().toLowerCase();
}

function findProduct(id) {
  return state.products.find((product) => product.id === id);
}

function findLocation(id) {
  return state.locations.find((location) => location.id === id);
}

function locationLabel(location) {
  return location ? [location.area, location.section, location.number].filter(Boolean).join(" ") : "No location";
}

function productDescriptor(product) {
  return [product.department, product.color, product.size].filter(Boolean).join(" / ");
}

function reportDateLabel() {
  return new Date().toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function sortedProducts() {
  return state.products.slice().sort((a, b) => a.name.localeCompare(b.name));
}

function sortedLocations() {
  return state.locations.slice().sort((a, b) => {
    const areaCompare = (a.area || "").localeCompare(b.area || "");
    if (areaCompare) return areaCompare;

    const sectionCompare = (a.section || "").localeCompare(b.section || "");
    if (sectionCompare) return sectionCompare;

    return (a.number || "").localeCompare(b.number || "", undefined, { numeric: true, sensitivity: "base" });
  });
}

function productMatchesTerm(product, term) {
  if (!term) {
    return true;
  }

  const location = findLocation(product.locationId);
  return [
    product.name,
    product.department,
    product.color,
    product.size,
    location ? location.area : "",
    location ? location.section : "",
    location ? location.number : "",
  ]
    .filter(Boolean)
    .some((value) => normalize(String(value)).includes(term));
}

function escapeText(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char];
  });
}

function reportTitle(type, selectedLocation = null) {
  if (type === "locations") {
    return selectedLocation ? locationLabel(selectedLocation) : "Locations with Products";
  }
  return "Products with Locations";
}

function reportFileName(type, extension) {
  const date = new Date().toISOString().slice(0, 10);
  return `${type === "locations" ? "locations-with-products" : "products-with-locations"}-${date}.${extension}`;
}

function productReportRows() {
  return sortedProducts().map((product) => {
    const location = findLocation(product.locationId);
    return {
      Name: product.name,
      Department: product.department,
      Color: product.color || "",
      Size: product.size || "",
      Location: locationLabel(location),
    };
  });
}

function locationReportRows(selectedLocationId = "") {
  if (selectedLocationId) {
    return sortedProducts()
      .filter((product) => product.locationId === selectedLocationId)
      .map((product) => ({
        Name: product.name,
        Color: product.color || "",
      }));
  }

  return sortedLocations()
    .filter((location) => !selectedLocationId || location.id === selectedLocationId)
    .map((location) => {
      const products = sortedProducts().filter((product) => product.locationId === location.id);
      return {
        Area: location.area,
        Section: location.section,
        Number: location.number,
        Location: locationLabel(location),
        Products: products.map((product) => product.name).join(", "),
      };
    });
}

function reportRows(type, selectedLocationId = "") {
  return type === "locations" ? locationReportRows(selectedLocationId) : productReportRows();
}

function reportHeaders(type, selectedLocationId = "") {
  return type === "locations" && selectedLocationId
    ? ["Name", "Color"]
    : type === "locations"
    ? ["Area", "Section", "Number", "Location", "Products"]
    : ["Name", "Department", "Color", "Size", "Location"];
}

function buildReportTable(type, selectedLocationId = "") {
  const headers = reportHeaders(type, selectedLocationId);
  const rows = reportRows(type, selectedLocationId);

  if (!rows.length) {
    return '<p class="empty">No data to report.</p>';
  }

  return `
    <table>
      <thead>
        <tr>${headers.map((header) => `<th>${escapeText(header)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows
          .map((row) => `<tr>${headers.map((header) => `<td>${escapeText(row[header])}</td>`).join("")}</tr>`)
          .join("")}
      </tbody>
    </table>
  `;
}

function reportDocument(type, selectedLocationId = "") {
  const selectedLocation = type === "locations" ? findLocation(selectedLocationId) : null;
  const isIndividualLocationReport = Boolean(type === "locations" && selectedLocation);
  return `<!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>${escapeText(reportTitle(type, selectedLocation))}</title>
        <style>
          body { color: #1e2522; font-family: Arial, sans-serif; margin: 28px; }
          h1 { font-size: 24px; margin: 0 0 6px; }
          .meta { color: #62706b; font-size: 12px; margin-bottom: 18px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #dce4df; font-size: 12px; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #eef5f3; }
          .empty { border: 1px solid #dce4df; padding: 14px; }
          @media print { button { display: none; } body { margin: 18px; } }
        </style>
      </head>
      <body>
        <h1>${escapeText(reportTitle(type, selectedLocation))}</h1>
        ${isIndividualLocationReport ? "" : `<div class="meta">Generated ${escapeText(reportDateLabel())}</div>`}
        ${buildReportTable(type, selectedLocationId)}
      </body>
    </html>`;
}

function printReport(type) {
  const selectedLocationId = type === "locations" ? els.reportLocation.value : "";
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Allow pop-ups to print this report.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(reportDocument(type, selectedLocationId));
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 250);
}

function exportReport(type) {
  const selectedLocationId = type === "locations" ? els.reportLocation.value : "";
  const blob = new Blob([reportDocument(type, selectedLocationId)], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = reportFileName(type, "xls");
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function syncLocationProductGroups() {
  state.locations.forEach((location) => {
    location.productIds = state.products.filter((product) => product.locationId === location.id).map((product) => product.id);
  });
}

function assignProductToLocation(productId, locationId) {
  state.products.forEach((product) => {
    if (product.id === productId) {
      product.locationId = locationId || "";
    }
  });
  syncLocationProductGroups();
}

function assignProductsToLocation(locationId, productIds) {
  state.products.forEach((product) => {
    if (product.locationId === locationId && !productIds.includes(product.id)) {
      product.locationId = "";
    }

    if (productIds.includes(product.id)) {
      product.locationId = locationId;
    }
  });
  syncLocationProductGroups();
}

function renderLocationOptions(selectedId = "") {
  const options = ['<option value="">No location assigned</option>'];
  state.locations
    .slice()
    .sort((a, b) => locationLabel(a).localeCompare(locationLabel(b)))
    .forEach((location) => {
      const count = location.productIds ? location.productIds.length : 0;
      const note = count ? ` - ${count} product${count === 1 ? "" : "s"}` : "";
      options.push(
        `<option value="${escapeText(location.id)}"${location.id === selectedId ? " selected" : ""}>${escapeText(
          locationLabel(location) + note,
        )}</option>`,
      );
    });
  els.productLocation.innerHTML = options.join("");
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function optionList(defaultLabel, values, selectedValue) {
  return [`<option value="">${escapeText(defaultLabel)}</option>`]
    .concat(
      values.map(
        (value) => `<option value="${escapeText(value)}"${value === selectedValue ? " selected" : ""}>${escapeText(value)}</option>`,
      ),
    )
    .join("");
}

function renderSearchLocationFilters(selectedArea = "", selectedSection = "", selectedNumber = "") {
  const areas = uniqueSorted(state.locations.map((location) => location.area));
  const area = areas.includes(selectedArea) ? selectedArea : "";
  const sections = uniqueSorted(
    state.locations
      .filter((location) => !area || location.area === area)
      .map((location) => location.section),
  );
  const section = sections.includes(selectedSection) ? selectedSection : "";
  const numbers = uniqueSorted(
    state.locations
      .filter((location) => !area || location.area === area)
      .filter((location) => !section || location.section === section)
      .map((location) => location.number),
  );
  const number = numbers.includes(selectedNumber) ? selectedNumber : "";

  els.searchArea.innerHTML = optionList("All areas", areas, area);
  els.searchSection.innerHTML = optionList("All sections", sections, section);
  els.searchNumber.innerHTML = optionList("All numbers", numbers, number);
}

function renderReportLocationOptions(selectedId = "") {
  const selectedLocationId = state.locations.some((location) => location.id === selectedId) ? selectedId : "";
  const options = ['<option value="">All locations</option>'];
  sortedLocations().forEach((location) => {
    options.push(
      `<option value="${escapeText(location.id)}"${location.id === selectedLocationId ? " selected" : ""}>${escapeText(
        locationLabel(location),
      )}</option>`,
    );
  });
  els.reportLocation.innerHTML = options.join("");
}

function renderProductCheckboxes(selectedIds = []) {
  if (!state.products.length) {
    els.locationProducts.innerHTML = '<div class="empty-state">Add products first.</div>';
    return;
  }

  els.locationProducts.innerHTML = state.products
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((product) => {
      const location = findLocation(product.locationId);
      const note = location ? ` - ${locationLabel(location)}` : "";
      return `
        <label class="checkbox-row">
          <input type="checkbox" value="${escapeText(product.id)}"${selectedIds.includes(product.id) ? " checked" : ""} />
          <span>${escapeText(product.name + note)}</span>
        </label>
      `;
    })
    .join("");
}

function renderSearchResults() {
  const term = normalize(els.searchInput.value);
  const selectedArea = els.searchArea.value;
  const selectedSection = els.searchSection.value;
  const selectedNumber = els.searchNumber.value;
  const hasLocationFilter = Boolean(selectedArea || selectedSection || selectedNumber);

  els.toggleAllProducts.textContent = isShowingAllSearchProducts ? "Hide All" : "See All";

  if (!term && !hasLocationFilter && !isShowingAllSearchProducts) {
    els.resultSummary.textContent = "";
    els.searchResults.innerHTML = '<div class="empty-state">Search by product or choose a location.</div>';
    return;
  }

  const products = state.products.filter((product) => {
    if (hasLocationFilter) {
      const location = findLocation(product.locationId);
      if (!location) {
        return false;
      }
      if (selectedArea && location.area !== selectedArea) {
        return false;
      }
      if (selectedSection && location.section !== selectedSection) {
        return false;
      }
      if (selectedNumber && location.number !== selectedNumber) {
        return false;
      }
    }

    return productMatchesTerm(product, term);
  });

  const activeLocationLabel = [selectedArea, selectedSection, selectedNumber].filter(Boolean).join(" / ");
  const baseSummary = `${products.length} match${products.length === 1 ? "" : "es"}`;
  els.resultSummary.textContent =
    isShowingAllSearchProducts && !term && !hasLocationFilter
      ? `Showing all ${products.length} product${products.length === 1 ? "" : "s"}`
      : `${baseSummary}${activeLocationLabel ? ` in ${activeLocationLabel}` : ""}`;

  if (!products.length) {
    els.searchResults.innerHTML = '<div class="empty-state">No products found.</div>';
    return;
  }

  els.searchResults.innerHTML = products
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((product) => {
      const location = findLocation(product.locationId);
      return `
        <article class="result-card">
          <div class="card-top">
            <div>
              <div class="card-title">${escapeText(product.name)}</div>
              <div class="meta-line">${escapeText(productDescriptor(product) || "No details")}</div>
            </div>
            <span class="location-badge">${escapeText(locationLabel(location))}</span>
          </div>
          <p class="location-line">${escapeText(
            location
              ? `Area: ${location.area} / Section: ${location.section} / Number: ${location.number}`
              : "This product is not assigned to a location yet.",
          )}</p>
        </article>
      `;
    })
    .join("");
}

function renderProducts() {
  const term = normalize(els.manageProductSearch.value);
  const products = state.products.filter((product) => productMatchesTerm(product, term));
  els.productListCount.textContent = `${state.products.length} total`;
  els.toggleManageProducts.textContent = isShowingAllManageProducts ? "Hide All" : "See All";

  if (!state.products.length) {
    els.productList.innerHTML = '<div class="empty-state">Add your first product.</div>';
    return;
  }

  if (!term && !isShowingAllManageProducts) {
    els.productList.innerHTML = '<div class="empty-state">Search to edit or delete a product.</div>';
    return;
  }

  els.productListCount.textContent =
    isShowingAllManageProducts && !term ? `${state.products.length} total` : `${products.length} of ${state.products.length}`;

  if (!products.length) {
    els.productList.innerHTML = '<div class="empty-state">No products match that search.</div>';
    return;
  }

  els.productList.innerHTML = products
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((product) => {
      const location = findLocation(product.locationId);
      return `
        <article class="item-card">
          <div class="card-top">
            <div>
              <div class="card-title">${escapeText(product.name)}</div>
              <div class="meta-line">${escapeText(productDescriptor(product) || "No optional details")}</div>
            </div>
            <span class="location-badge">${escapeText(locationLabel(location))}</span>
          </div>
          <div class="card-actions">
            <button class="text-button" type="button" data-edit-product="${escapeText(product.id)}">Edit</button>
            <button class="danger-button" type="button" data-delete-product="${escapeText(product.id)}">Delete</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderLocations() {
  els.locationListCount.textContent = `${state.locations.length} total`;

  if (!state.locations.length) {
    els.locationList.innerHTML = '<div class="empty-state">Add your first location.</div>';
    return;
  }

  els.locationList.innerHTML = state.locations
    .slice()
    .sort((a, b) => locationLabel(a).localeCompare(locationLabel(b)))
    .map((location) => {
      const products = state.products.filter((product) => product.locationId === location.id);
      return `
        <article class="item-card clickable-card" data-open-location="${escapeText(location.id)}">
          <div class="card-top">
            <div>
              <div class="card-title">${escapeText(locationLabel(location))}</div>
              <div class="meta-line">${escapeText(
                products.length ? products.map((product) => product.name).join(", ") : "Empty location",
              )}</div>
            </div>
            <span class="location-badge">${products.length} product${products.length === 1 ? "" : "s"}</span>
          </div>
          <div class="card-actions">
            <button class="text-button" type="button" data-open-location="${escapeText(location.id)}">Open</button>
            <button class="danger-button" type="button" data-delete-location="${escapeText(location.id)}">Delete</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function render() {
  els.inventoryCount.textContent = `${state.products.length} item${state.products.length === 1 ? "" : "s"}`;
  els.reportCount.textContent = `${state.products.length} products / ${state.locations.length} locations`;
  renderLocationOptions(els.productLocation.value);
  renderSearchLocationFilters(els.searchArea.value, els.searchSection.value, els.searchNumber.value);
  renderReportLocationOptions(els.reportLocation.value);
  renderProductCheckboxes(getSelectedLocationProductIds());
  renderSearchResults();
  renderProducts();
  renderLocations();
  renderProductDetailTitle();
  renderLocationDetailProducts();
}

function renderProductDetailTitle() {
  const product = findProduct(activeProductDetailId);
  els.productDetailTitle.textContent = product ? product.name : "New Product";
}

function renderLocationDetailProducts() {
  const location = findLocation(activeLocationDetailId);
  const products = location ? state.products.filter((product) => product.locationId === location.id) : [];

  els.locationDetailTitle.textContent = location ? locationLabel(location) : "New Location";
  els.locationDetailProductCount.textContent = `${products.length} total`;

  if (!products.length) {
    els.locationDetailProducts.innerHTML = '<div class="empty-state">No products in this location.</div>';
    return;
  }

  els.locationDetailProducts.innerHTML = products
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (product) => `
        <article class="item-card">
          <div class="card-top">
            <div>
              <div class="card-title">${escapeText(product.name)}</div>
              <div class="meta-line">${escapeText(productDescriptor(product) || "No optional details")}</div>
            </div>
          </div>
          <div class="card-actions">
            <button class="text-button" type="button" data-edit-product="${escapeText(product.id)}">Edit Product</button>
            <button class="danger-button" type="button" data-remove-from-location="${escapeText(product.id)}">Remove</button>
          </div>
        </article>
      `,
    )
    .join("");
}

function getSelectedLocationProductIds() {
  return Array.from(els.locationProducts.querySelectorAll('input[type="checkbox"]:checked')).map((input) => input.value);
}

function resetProductForm() {
  els.productForm.reset();
  els.productId.value = "";
  activeProductDetailId = "";
  renderLocationOptions();
  renderProductDetailTitle();
}

function resetLocationForm() {
  els.locationForm.reset();
  els.locationId.value = "";
  activeLocationDetailId = "";
  renderProductCheckboxes();
  renderLocationDetailProducts();
}

function switchTab(tabName) {
  if (tabName === "export" && isMobileView()) {
    tabName = "search";
  }
  els.tabButtons.forEach((button) => button.classList.toggle("active", button.dataset.tab === tabName));
  els.searchPanel.classList.toggle("active", tabName === "search");
  els.managePanel.classList.toggle("active", tabName === "manage");
  els.exportPanel.classList.toggle("active", tabName === "export");
}

function isMobileView() {
  return window.matchMedia("(max-width: 619px)").matches;
}

function keepDesktopOnlyTabsValid() {
  const exportIsActive = els.exportPanel.classList.contains("active");
  if (exportIsActive && isMobileView()) {
    switchTab("search");
  }
}

function switchManager(sectionName) {
  els.sectionButtons.forEach((button) => button.classList.toggle("active", button.dataset.section === sectionName));
  els.productsManager.classList.toggle("active", sectionName === "products");
  els.locationsManager.classList.toggle("active", sectionName === "locations");
  if (sectionName === "products" && !els.productDetailView.classList.contains("active")) {
    showProductList();
  }
  if (sectionName === "locations" && !els.locationDetailView.classList.contains("active")) {
    showLocationList();
  }
}

function showProductList() {
  activeProductDetailId = "";
  els.productsListView.classList.add("active");
  els.productDetailView.classList.remove("active");
  resetProductForm();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openNewProduct() {
  switchTab("manage");
  switchManager("products");
  activeProductDetailId = "";
  els.productsListView.classList.remove("active");
  els.productDetailView.classList.add("active");
  els.productForm.reset();
  els.productId.value = "";
  renderLocationOptions();
  renderProductDetailTitle();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showLocationList() {
  activeLocationDetailId = "";
  els.locationsListView.classList.add("active");
  els.locationDetailView.classList.remove("active");
  resetLocationForm();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openNewLocation() {
  switchTab("manage");
  switchManager("locations");
  activeLocationDetailId = "";
  els.locationsListView.classList.remove("active");
  els.locationDetailView.classList.add("active");
  els.locationForm.reset();
  els.locationId.value = "";
  renderProductCheckboxes();
  renderLocationDetailProducts();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openLocationDetail(id) {
  const location = findLocation(id);
  if (!location) {
    return;
  }

  switchTab("manage");
  switchManager("locations");
  activeLocationDetailId = id;
  els.locationsListView.classList.remove("active");
  els.locationDetailView.classList.add("active");
  els.locationId.value = location.id;
  els.locationArea.value = location.area;
  els.locationSection.value = location.section || "";
  els.locationNumber.value = location.number;
  renderProductCheckboxes(location.productIds || []);
  renderLocationDetailProducts();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function persistLocation(id) {
  const location = findLocation(id);
  if (location) {
    await setDoc(locationDoc(id), locationPayload(location));
  }
}

async function handleProductSubmit(event) {
  event.preventDefault();
  try {
    const id = els.productId.value || createId("product");
    const isUpdate = Boolean(els.productId.value);
    const existingProduct = findProduct(id);
    const previousLocationId = existingProduct ? existingProduct.locationId : "";
    const product = {
      id,
      name: els.productName.value.trim(),
      department: els.productDepartment.value.trim(),
      color: els.productColor.value.trim(),
      size: els.productSize.value.trim(),
      locationId: "",
    };

    const index = state.products.findIndex((item) => item.id === id);
    if (index >= 0) {
      product.locationId = previousLocationId;
      state.products[index] = product;
    } else {
      state.products.push(product);
    }

    assignProductToLocation(id, els.productLocation.value);
    activeProductDetailId = id;
    els.productId.value = id;
    await setDoc(productDoc(id), productPayload(findProduct(id)));
    await Promise.all([...new Set([previousLocationId, els.productLocation.value].filter(Boolean))].map(persistLocation));
    resetProductForm();
    showToast(isUpdate ? "Product updated." : "Product saved.");
    render();
  } catch (error) {
    alert(`Could not save product: ${friendlyAuthError(error)}`);
  }
}

async function handleLocationSubmit(event) {
  event.preventDefault();
  try {
    const id = els.locationId.value || createId("location");
    const isUpdate = Boolean(els.locationId.value);
    const previousProductIds = state.products.filter((product) => product.locationId === id).map((product) => product.id);
    const location = {
      id,
      area: els.locationArea.value.trim(),
      section: els.locationSection.value.trim(),
      number: els.locationNumber.value.trim(),
      productIds: [],
    };

    const index = state.locations.findIndex((item) => item.id === id);
    if (index >= 0) {
      state.locations[index] = location;
    } else {
      state.locations.push(location);
    }

    const selectedProductIds = getSelectedLocationProductIds();
    assignProductsToLocation(id, selectedProductIds);
    activeLocationDetailId = id;
    els.locationId.value = id;
    const affectedProductIds = [...new Set([...previousProductIds, ...selectedProductIds])];
    await setDoc(locationDoc(id), locationPayload(findLocation(id)));
    await Promise.all(affectedProductIds.map((productId) => setDoc(productDoc(productId), productPayload(findProduct(productId)))));
    resetLocationForm();
    showToast(isUpdate ? "Location updated." : "Location saved.");
    render();
  } catch (error) {
    alert(`Could not save location: ${friendlyAuthError(error)}`);
  }
}

function editProduct(id) {
  const product = findProduct(id);
  if (!product) {
    return;
  }

  switchTab("manage");
  switchManager("products");
  activeProductDetailId = product.id;
  els.productsListView.classList.remove("active");
  els.productDetailView.classList.add("active");
  els.productId.value = product.id;
  els.productName.value = product.name;
  els.productDepartment.value = DEPARTMENTS.includes(product.department) ? product.department : DEPARTMENTS[0];
  els.productColor.value = product.color || "";
  els.productSize.value = product.size || "";
  renderLocationOptions(product.locationId);
  renderProductDetailTitle();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function editLocation(id) {
  openLocationDetail(id);
}

async function deleteProduct(id) {
  const product = findProduct(id);
  if (!product || !confirm(`Delete ${product.name}?`)) {
    return;
  }

  const wasViewingProduct = activeProductDetailId === id;
  const previousLocationId = product.locationId;
  state.products = state.products.filter((item) => item.id !== id);
  state.locations.forEach((location) => {
    if (location.productIds) {
      location.productIds = location.productIds.filter((productId) => productId !== id);
    }
  });
  await deleteDoc(productDoc(id));
  await persistLocation(previousLocationId);
  resetProductForm();
  if (wasViewingProduct) {
    activeProductDetailId = "";
    els.productsListView.classList.add("active");
    els.productDetailView.classList.remove("active");
  }
  showToast("Product deleted.");
  render();
}

async function deleteLocation(id) {
  const location = findLocation(id);
  if (!location || !confirm(`Delete ${locationLabel(location)}?`)) {
    return;
  }

  const affectedProductIds = state.products.filter((product) => product.locationId === id).map((product) => product.id);
  state.locations = state.locations.filter((item) => item.id !== id);
  state.products.forEach((product) => {
    if (product.locationId === id) {
      product.locationId = "";
    }
  });
  if (activeLocationDetailId === id) {
    activeLocationDetailId = "";
    els.locationsListView.classList.add("active");
    els.locationDetailView.classList.remove("active");
  }
  await deleteDoc(locationDoc(id));
  await Promise.all(affectedProductIds.map((productId) => setDoc(productDoc(productId), productPayload(findProduct(productId)))));
  resetLocationForm();
  showToast("Location deleted.");
  render();
}

async function removeProductFromActiveLocation(id) {
  const product = findProduct(id);
  if (!product || !activeLocationDetailId) {
    return;
  }

  product.locationId = "";
  syncLocationProductGroups();
  await setDoc(productDoc(id), productPayload(product));
  await persistLocation(activeLocationDetailId);
  renderProductCheckboxes(getSelectedLocationProductIds().filter((productId) => productId !== id));
  showToast("Product removed from location.");
  render();
}

els.tabButtons.forEach((button) => {
  button.addEventListener("click", () => switchTab(button.dataset.tab));
});
window.addEventListener("resize", keepDesktopOnlyTabsValid);

els.sectionButtons.forEach((button) => {
  button.addEventListener("click", () => switchManager(button.dataset.section));
});

els.searchInput.addEventListener("input", () => {
  isShowingAllSearchProducts = false;
  renderSearchResults();
});
els.searchArea.addEventListener("change", () => {
  isShowingAllSearchProducts = false;
  renderSearchLocationFilters(els.searchArea.value, "", "");
  renderSearchResults();
});
els.searchSection.addEventListener("change", () => {
  isShowingAllSearchProducts = false;
  renderSearchLocationFilters(els.searchArea.value, els.searchSection.value, "");
  renderSearchResults();
});
els.searchNumber.addEventListener("change", () => {
  isShowingAllSearchProducts = false;
  renderSearchResults();
});
els.clearSearch.addEventListener("click", () => {
  els.searchInput.value = "";
  isShowingAllSearchProducts = false;
  renderSearchResults();
  els.searchInput.focus();
});
els.toggleAllProducts.addEventListener("click", () => {
  isShowingAllSearchProducts = !isShowingAllSearchProducts;
  if (isShowingAllSearchProducts) {
    els.searchInput.value = "";
    renderSearchLocationFilters("", "", "");
  }
  renderSearchResults();
});
els.manageProductSearch.addEventListener("input", () => {
  isShowingAllManageProducts = false;
  renderProducts();
});
els.clearManageProductSearch.addEventListener("click", () => {
  els.manageProductSearch.value = "";
  isShowingAllManageProducts = false;
  renderProducts();
  els.manageProductSearch.focus();
});
els.toggleManageProducts.addEventListener("click", () => {
  isShowingAllManageProducts = !isShowingAllManageProducts;
  if (isShowingAllManageProducts) {
    els.manageProductSearch.value = "";
  }
  renderProducts();
});

els.productForm.addEventListener("submit", handleProductSubmit);
els.locationForm.addEventListener("submit", handleLocationSubmit);
els.resetProductForm.addEventListener("click", resetProductForm);
els.resetLocationForm.addEventListener("click", resetLocationForm);
els.addProductButton.addEventListener("click", openNewProduct);
els.backToProducts.addEventListener("click", showProductList);
els.addLocationButton.addEventListener("click", openNewLocation);
els.backToLocations.addEventListener("click", showLocationList);
els.authForm.addEventListener("submit", handleAuthSubmit);
els.authSecondary.addEventListener("click", () => {
  setAuthMode(authMode === "sign-in" ? "sign-up" : "sign-in");
});
els.forgotPassword.addEventListener("click", handleForgotPassword);
els.signOutButton.addEventListener("click", () => signOut(auth));
els.resendVerification.addEventListener("click", handleResendVerification);

document.addEventListener("click", (event) => {
  const openLocationButton = event.target.closest("[data-open-location]");
  const editProductButton = event.target.closest("[data-edit-product]");
  const deleteProductButton = event.target.closest("[data-delete-product]");
  const editLocationButton = event.target.closest("[data-edit-location]");
  const deleteLocationButton = event.target.closest("[data-delete-location]");
  const removeFromLocationButton = event.target.closest("[data-remove-from-location]");
  const printReportButton = event.target.closest("[data-print-report]");
  const exportReportButton = event.target.closest("[data-export-report]");
  const openLocationId = openLocationButton ? openLocationButton.dataset.openLocation : "";
  const editProductId = editProductButton ? editProductButton.dataset.editProduct : "";
  const deleteProductId = deleteProductButton ? deleteProductButton.dataset.deleteProduct : "";
  const editLocationId = editLocationButton ? editLocationButton.dataset.editLocation : "";
  const deleteLocationId = deleteLocationButton ? deleteLocationButton.dataset.deleteLocation : "";
  const removeFromLocationId = removeFromLocationButton ? removeFromLocationButton.dataset.removeFromLocation : "";
  const printReportType = printReportButton ? printReportButton.dataset.printReport : "";
  const exportReportType = exportReportButton ? exportReportButton.dataset.exportReport : "";

  if (printReportType) {
    printReport(printReportType);
  } else if (exportReportType) {
    exportReport(exportReportType);
  } else if (removeFromLocationId) {
    removeProductFromActiveLocation(removeFromLocationId);
  } else if (editProductId) {
    editProduct(editProductId);
  } else if (deleteProductId) {
    deleteProduct(deleteProductId);
  } else if (deleteLocationId) {
    deleteLocation(deleteLocationId);
  } else if (openLocationId) {
    openLocationDetail(openLocationId);
  } else if (editLocationId) {
    editLocation(editLocationId);
  }
});

setAuthMode("sign-in");
onAuthStateChanged(auth, setSignedInView);
