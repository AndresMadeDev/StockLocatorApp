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

const DEPARTMENTS = ["Woman", "Men's", "Kids", "Toddler", "Accessories / Apparel"];
const DEPARTMENT_COLORS = {
  Woman: "#b0185b",
  "Men's": "#1f5fbf",
  Kids: "#d56a00",
  Toddler: "#7a3db8",
  "Accessories / Apparel": "#1f7a4d",
};
const DEPARTMENT_CLASS_NAMES = {
  Woman: "department-woman",
  "Men's": "department-mens",
  Kids: "department-kids",
  Toddler: "department-toddler",
  "Accessories / Apparel": "department-accessories",
};
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
let isLocationFormOpen = false;

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
  clearSearch: document.querySelector("#clearSearch"),
  toggleAllProducts: document.querySelector("#toggleAllProducts"),
  resultSummary: document.querySelector("#resultSummary"),
  searchResults: document.querySelector("#searchResults"),
  sectionButtons: document.querySelectorAll(".section-button"),
  productsManager: document.querySelector("#productsManager"),
  locationsManager: document.querySelector("#locationsManager"),
  reportCount: document.querySelector("#reportCount"),
  reportDepartment: document.querySelector("#reportDepartment"),
  reportLocation: document.querySelector("#reportLocation"),
  reportLocationDepartment: document.querySelector("#reportLocationDepartment"),
  productForm: document.querySelector("#productForm"),
  productId: document.querySelector("#productId"),
  productName: document.querySelector("#productName"),
  productDepartment: document.querySelector("#productDepartment"),
  productColor: document.querySelector("#productColor"),
  productSize: document.querySelector("#productSize"),
  productLocations: document.querySelector("#productLocations"),
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
  resetLocationForm: document.querySelector("#resetLocationForm"),
  addLocationButton: document.querySelector("#addLocationButton"),
  editLocationButton: document.querySelector("#editLocationButton"),
  addProductToLocationButton: document.querySelector("#addProductToLocationButton"),
  backToLocations: document.querySelector("#backToLocations"),
  locationsListView: document.querySelector("#locationsListView"),
  locationDetailView: document.querySelector("#locationDetailView"),
  locationDetailTitle: document.querySelector("#locationDetailTitle"),
  locationDetailProducts: document.querySelector("#locationDetailProducts"),
  locationList: document.querySelector("#locationList"),
  locationListCount: document.querySelector("#locationListCount"),
  manageLocationAreaFilter: document.querySelector("#manageLocationAreaFilter"),
  manageLocationSectionFilter: document.querySelector("#manageLocationSectionFilter"),
  manageLocationSort: document.querySelector("#manageLocationSort"),
  clearLocationFilters: document.querySelector("#clearLocationFilters"),
  locationProductDialog: document.querySelector("#locationProductDialog"),
  locationProductForm: document.querySelector("#locationProductForm"),
  locationProductDialogTitle: document.querySelector("#locationProductDialogTitle"),
  locationProductName: document.querySelector("#locationProductName"),
  locationProductDepartment: document.querySelector("#locationProductDepartment"),
  locationProductColor: document.querySelector("#locationProductColor"),
  locationProductSize: document.querySelector("#locationProductSize"),
  closeLocationProductDialog: document.querySelector("#closeLocationProductDialog"),
  cancelLocationProductDialog: document.querySelector("#cancelLocationProductDialog"),
};

function normalizeLoadedState(loadedState) {
  loadedState.products = loadedState.products.map((product) => ({
    ...product,
    department: normalizeDepartment(product.department),
    color: formatColor(product.color),
    locationIds: uniqueIds([...(Array.isArray(product.locationIds) ? product.locationIds : []), product.locationId || ""]),
    locationId: "",
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
        product.locationIds = uniqueIds([...(product.locationIds || []), location.id]);
      }
    });
  });
  loadedState.locations.forEach((location) => {
    location.productIds = loadedState.products
      .filter((product) => productHasLocation(product, location.id))
      .map((product) => product.id);
  });
  loadedState.products.forEach((product) => {
    product.locationId = product.locationIds[0] || "";
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
  const locationIds = getProductLocationIds(product);
  return {
    name: product.name,
    department: product.department,
    color: formatColor(product.color),
    size: product.size || "",
    locationIds,
    locationId: locationIds[0] || "",
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

function formatColor(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function findProduct(id) {
  return state.products.find((product) => product.id === id);
}

function findLocation(id) {
  return state.locations.find((location) => location.id === id);
}

function uniqueIds(ids) {
  return [...new Set(ids.filter(Boolean))];
}

function locationLabel(location) {
  return location ? [location.area, location.section, location.number].filter(Boolean).join(" ") : "No location";
}

function getProductLocationIds(product) {
  return uniqueIds([...(Array.isArray(product.locationIds) ? product.locationIds : []), product.locationId || ""]);
}

function productHasLocation(product, locationId) {
  return getProductLocationIds(product).includes(locationId);
}

function productLocations(product) {
  return getProductLocationIds(product)
    .map(findLocation)
    .filter(Boolean);
}

function productLocationLabels(product) {
  const labels = productLocations(product).map(locationLabel);
  return labels.length ? labels.join(", ") : "No location";
}

function productDescriptor(product) {
  return [product.department, formatColor(product.color), product.size].filter(Boolean).join(" / ");
}

function normalizeDepartment(department) {
  const value = String(department || "").trim();
  const normalized = value.toLowerCase().replace(/&/g, "and").replace(/\s+/g, " ");

  if (["woman", "women", "womens", "women's"].includes(normalized)) {
    return "Woman";
  }

  if (["men", "mens", "men's"].includes(normalized)) {
    return "Men's";
  }

  if (normalized === "kids" || normalized === "kid") {
    return "Kids";
  }

  if (normalized === "toddler" || normalized === "toddlers") {
    return "Toddler";
  }

  if (["accessories / apparel", "accessories/apparel", "accessories and apparel", "accessory", "accessories", "apparel"].includes(normalized)) {
    return "Accessories / Apparel";
  }

  return DEPARTMENTS.includes(value) ? value : DEPARTMENTS[0];
}

function departmentClassName(department) {
  return DEPARTMENT_CLASS_NAMES[normalizeDepartment(department)] || "";
}

function departmentStyle(department) {
  const color = DEPARTMENT_COLORS[normalizeDepartment(department)] || DEPARTMENT_COLORS[DEPARTMENTS[0]];
  return `--department-color: ${color};`;
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

function sortedReportProducts() {
  return state.products.slice().sort((a, b) => {
    const departmentCompare = (a.department || "").localeCompare(b.department || "");
    if (departmentCompare) return departmentCompare;

    const nameCompare = (a.name || "").localeCompare(b.name || "");
    if (nameCompare) return nameCompare;

    const colorCompare = (a.color || "").localeCompare(b.color || "");
    if (colorCompare) return colorCompare;

    const sizeCompare = (a.size || "").localeCompare(b.size || "", undefined, { numeric: true, sensitivity: "base" });
    if (sizeCompare) return sizeCompare;

    return productLocationLabels(a).localeCompare(productLocationLabels(b));
  });
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

function compareLocationNumber(a, b) {
  return (a.number || "").localeCompare(b.number || "", undefined, { numeric: true, sensitivity: "base" });
}

function compareLocationArea(a, b) {
  const areaCompare = (a.area || "").localeCompare(b.area || "");
  if (areaCompare) return areaCompare;

  const sectionCompare = (a.section || "").localeCompare(b.section || "");
  if (sectionCompare) return sectionCompare;

  return compareLocationNumber(a, b);
}

function compareLocationSection(a, b) {
  const sectionCompare = (a.section || "").localeCompare(b.section || "");
  if (sectionCompare) return sectionCompare;

  const areaCompare = (a.area || "").localeCompare(b.area || "");
  if (areaCompare) return areaCompare;

  return compareLocationNumber(a, b);
}

function locationProductCount(location) {
  return locationProducts(location.id).length;
}

function sortLocationsForManage(locations) {
  const sortMode = els.manageLocationSort.value || "area";
  return locations.slice().sort((a, b) => {
    if (sortMode === "section") {
      return compareLocationSection(a, b);
    }

    if (sortMode === "number") {
      const numberCompare = compareLocationNumber(a, b);
      return numberCompare || compareLocationArea(a, b);
    }

    if (sortMode === "productsDesc") {
      return locationProductCount(b) - locationProductCount(a) || compareLocationArea(a, b);
    }

    if (sortMode === "productsAsc") {
      return locationProductCount(a) - locationProductCount(b) || compareLocationArea(a, b);
    }

    return compareLocationArea(a, b);
  });
}

function uniqueLocationValues(field, areaFilter = "") {
  return [
    ...new Set(
      state.locations
        .filter((location) => !areaFilter || location.area === areaFilter)
        .map((location) => location[field])
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
}

function productMatchesTerm(product, term) {
  if (!term) {
    return true;
  }

  const locations = productLocations(product);
  return [
    product.name,
    product.department,
    product.color,
    product.size,
    ...locations.flatMap((location) => [location.area, location.section, location.number, locationLabel(location)]),
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

function reportTitle(type, selectedLocation = null, selectedDepartment = "") {
  if (type === "locations") {
    const baseTitle = selectedLocation ? locationLabel(selectedLocation) : "Locations with Products";
    return selectedDepartment ? `${baseTitle} - ${selectedDepartment}` : baseTitle;
  }
  return selectedDepartment ? `${selectedDepartment} Products with Locations` : "Products with Locations";
}

function reportFileName(type, extension) {
  const date = new Date().toISOString().slice(0, 10);
  return `${type === "locations" ? "locations-with-products" : "products-with-locations"}-${date}.${extension}`;
}

function productReportRows(selectedDepartment = "") {
  return sortedReportProducts()
    .filter((product) => !selectedDepartment || product.department === selectedDepartment)
    .map((product) => {
      return {
        Department: product.department,
        Name: product.name,
        Color: formatColor(product.color),
        Size: product.size || "",
        Location: productLocationLabels(product),
      };
    });
}

function productMatchesDepartment(product, selectedDepartment = "") {
  return !selectedDepartment || product.department === selectedDepartment;
}

function locationReportProducts(locationId, selectedDepartment = "") {
  return sortedProducts().filter((product) => productHasLocation(product, locationId) && productMatchesDepartment(product, selectedDepartment));
}

function locationReportRows(selectedLocationId = "", selectedDepartment = "") {
  if (selectedLocationId) {
    return locationReportProducts(selectedLocationId, selectedDepartment)
      .map((product) => ({
        Name: product.name,
        Color: formatColor(product.color),
      }));
  }

  return sortedLocations()
    .filter((location) => !selectedLocationId || location.id === selectedLocationId)
    .filter((location) => !selectedDepartment || locationReportProducts(location.id, selectedDepartment).length)
    .map((location) => {
      const products = locationReportProducts(location.id, selectedDepartment);
      return {
        Area: location.area,
        Section: location.section,
        Number: location.number,
        Location: locationLabel(location),
        Products: productColorListHtml(products),
      };
    });
}

function productColorListHtml(products) {
  if (!products.length) {
    return '<span class="muted">No products</span>';
  }

  return `
    <table class="product-color-list">
      <tbody>
        ${products
          .map(
            (product) => `
              <tr>
                <td>${escapeText(product.name)}</td>
                <td class="color-cell">${escapeText(formatColor(product.color))}</td>
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function reportRows(type, selectedLocationId = "", selectedDepartment = "") {
  return type === "locations" ? locationReportRows(selectedLocationId, selectedDepartment) : productReportRows(selectedDepartment);
}

function reportHeaders(type, selectedLocationId = "") {
  return type === "locations" && selectedLocationId
    ? ["Name", "Color"]
    : type === "locations"
    ? ["Area", "Section", "Number", "Location", "Products"]
    : ["Department", "Name", "Color", "Size", "Location"];
}

function buildReportTable(type, selectedLocationId = "", selectedDepartment = "") {
  const headers = reportHeaders(type, selectedLocationId);
  const rows = reportRows(type, selectedLocationId, selectedDepartment);

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
          .map(
            (row) =>
              `<tr>${headers
                .map((header) =>
                  header === "Products"
                    ? `<td>${row[header]}</td>`
                    : `<td class="${header === "Color" ? "color-cell" : ""}">${escapeText(row[header])}</td>`,
                )
                .join("")}</tr>`,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function reportDocument(type, selectedLocationId = "", selectedDepartment = "") {
  const selectedLocation = type === "locations" ? findLocation(selectedLocationId) : null;
  const isIndividualLocationReport = Boolean(type === "locations" && selectedLocation);
  return `<!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>${escapeText(reportTitle(type, selectedLocation, selectedDepartment))}</title>
        <style>
          body { color: #1e2522; font-family: Arial, sans-serif; margin: 28px; }
          h1 { font-size: 24px; margin: 0 0 6px; }
          .meta { color: #62706b; font-size: 12px; margin-bottom: 18px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #dce4df; font-size: 12px; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #eef5f3; }
          .color-cell { font-weight: 700; text-transform: uppercase; }
          .muted { color: #62706b; }
          .product-color-list { border-collapse: collapse; width: 100%; }
          .product-color-list td { border: 0; border-bottom: 1px solid #eef2ef; padding: 4px 6px; }
          .product-color-list tr:last-child td { border-bottom: 0; }
          .product-color-list td:first-child { width: 68%; }
          .empty { border: 1px solid #dce4df; padding: 14px; }
          @media print { button { display: none; } body { margin: 18px; } }
        </style>
      </head>
      <body>
        <h1>${escapeText(reportTitle(type, selectedLocation, selectedDepartment))}</h1>
        ${isIndividualLocationReport ? "" : `<div class="meta">Generated ${escapeText(reportDateLabel())}</div>`}
        ${buildReportTable(type, selectedLocationId, selectedDepartment)}
      </body>
    </html>`;
}

function printReport(type) {
  const selectedLocationId = type === "locations" ? els.reportLocation.value : "";
  const selectedDepartment = type === "locations" ? els.reportLocationDepartment.value : els.reportDepartment.value;
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Allow pop-ups to print this report.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(reportDocument(type, selectedLocationId, selectedDepartment));
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 250);
}

function exportReport(type) {
  const selectedLocationId = type === "locations" ? els.reportLocation.value : "";
  const selectedDepartment = type === "locations" ? els.reportLocationDepartment.value : els.reportDepartment.value;
  const blob = new Blob([reportDocument(type, selectedLocationId, selectedDepartment)], {
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
    location.productIds = state.products.filter((product) => productHasLocation(product, location.id)).map((product) => product.id);
  });
  state.products.forEach((product) => {
    const locationIds = getProductLocationIds(product);
    product.locationIds = locationIds;
    product.locationId = locationIds[0] || "";
  });
}

function setProductLocations(productId, locationIds) {
  state.products.forEach((product) => {
    if (product.id === productId) {
      product.locationIds = uniqueIds(locationIds);
      product.locationId = product.locationIds[0] || "";
    }
  });
  syncLocationProductGroups();
}

function removeProductFromLocation(productId, locationId) {
  const product = findProduct(productId);
  if (!product || !locationId) {
    return;
  }

  setProductLocations(
    productId,
    getProductLocationIds(product).filter((id) => id !== locationId),
  );
}

function getSelectedProductLocationIds() {
  return Array.from(els.productLocations.querySelectorAll('input[type="checkbox"]:checked')).map((input) => input.value);
}

function renderLocationOptions(selectedIds = []) {
  const selectedLocationIds = Array.isArray(selectedIds) ? selectedIds : selectedIds ? [selectedIds] : [];

  if (!state.locations.length) {
    els.productLocations.innerHTML = '<div class="empty-state">Add locations first.</div>';
    return;
  }

  els.productLocations.innerHTML = sortedLocations()
    .map((location) => {
      const count = location.productIds ? location.productIds.length : 0;
      const note = count ? ` - ${count} product${count === 1 ? "" : "s"}` : "";
      return `
        <label class="checkbox-row">
          <input type="checkbox" value="${escapeText(location.id)}"${selectedLocationIds.includes(location.id) ? " checked" : ""} />
          <span>${escapeText(locationLabel(location) + note)}</span>
        </label>
      `;
    })
    .join("");
}

function persistProductLocations(productId) {
  const product = findProduct(productId);
  if (!product) {
    return Promise.resolve();
  }

  return setDoc(productDoc(productId), productPayload(product));
}

function persistLocations(ids) {
  return Promise.all(uniqueIds(ids).map(persistLocation));
}

function persistProducts(ids) {
  return Promise.all(uniqueIds(ids).map(persistProductLocations));
}

function affectedLocationIds(...groups) {
  return uniqueIds(groups.flatMap((group) => (Array.isArray(group) ? group : [group])));
}

function closeLocationProductDialog() {
  els.locationProductDialog.close();
  els.locationProductForm.reset();
}

function openLocationProductDialog() {
  const location = findLocation(activeLocationDetailId);
  if (!location) {
    showToast("Save the location first, then add products.");
    return;
  }

  els.locationProductDialogTitle.textContent = `Add to ${locationLabel(location)}`;
  els.locationProductForm.reset();
  els.locationProductDialog.showModal();
  els.locationProductName.focus();
}

function productModalPayload(id, locationId) {
  return {
    id,
    name: els.locationProductName.value.trim(),
    department: els.locationProductDepartment.value.trim(),
    color: formatColor(els.locationProductColor.value),
    size: els.locationProductSize.value.trim(),
    locationIds: [locationId],
    locationId,
  };
}

async function handleLocationProductSubmit(event) {
  event.preventDefault();
  const location = findLocation(activeLocationDetailId);
  if (!location) {
    showToast("Save the location first, then add products.");
    return;
  }

  try {
    const id = createId("product");
    const product = productModalPayload(id, location.id);
    state.products.push(product);
    syncLocationProductGroups();
    await setDoc(productDoc(id), productPayload(product));
    await persistLocation(location.id);
    closeLocationProductDialog();
    showToast("Product saved in location.");
    render();
  } catch (error) {
    alert(`Could not save product: ${friendlyAuthError(error)}`);
  }
}

function locationProducts(locationId) {
  return sortedProducts().filter((product) => productHasLocation(product, locationId));
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

function renderManageLocationFilters() {
  const selectedArea = els.manageLocationAreaFilter.value;
  const selectedSection = els.manageLocationSectionFilter.value;
  const areas = uniqueLocationValues("area");
  const sections = uniqueLocationValues("section", selectedArea);
  const safeArea = areas.includes(selectedArea) ? selectedArea : "";
  const safeSection = sections.includes(selectedSection) ? selectedSection : "";

  els.manageLocationAreaFilter.innerHTML = [
    '<option value="">All areas</option>',
    ...areas.map((area) => `<option value="${escapeText(area)}"${area === safeArea ? " selected" : ""}>${escapeText(area)}</option>`),
  ].join("");

  els.manageLocationSectionFilter.innerHTML = [
    '<option value="">All sections</option>',
    ...sections.map(
      (section) => `<option value="${escapeText(section)}"${section === safeSection ? " selected" : ""}>${escapeText(section)}</option>`,
    ),
  ].join("");
}

function renderSearchResults() {
  const term = normalize(els.searchInput.value);

  els.toggleAllProducts.textContent = isShowingAllSearchProducts ? "Hide All" : "See All";

  if (!term && !isShowingAllSearchProducts) {
    els.resultSummary.textContent = "";
    els.searchResults.innerHTML = '<div class="empty-state">Search by product or tap See All.</div>';
    return;
  }

  const products = state.products.filter((product) => {
    return productMatchesTerm(product, term);
  });

  const baseSummary = `${products.length} match${products.length === 1 ? "" : "es"}`;
  els.resultSummary.textContent =
    isShowingAllSearchProducts && !term
      ? `Showing all ${products.length} product${products.length === 1 ? "" : "s"}`
      : baseSummary;

  if (!products.length) {
    els.searchResults.innerHTML = '<div class="empty-state">No products found.</div>';
    return;
  }

  els.searchResults.innerHTML = products
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((product) => {
      const productDetails = [product.department || "No department", formatColor(product.color), product.size].filter(Boolean);
      return `
        <article class="result-card">
          <div class="card-top">
            <div>
              <div class="search-product-title product-name ${departmentClassName(product.department)}" style="${departmentStyle(product.department)}">${escapeText(product.name)}</div>
              <div class="search-product-subtitle">${escapeText(productDetails.join(" / "))}</div>
            </div>
          </div>
          <div class="search-location-text">${escapeText(productLocationLabels(product))}</div>
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
      return `
        <article class="item-card">
          <div class="card-top">
            <div>
              <div class="card-title product-name ${departmentClassName(product.department)}" style="${departmentStyle(product.department)}">${escapeText(product.name)}</div>
              <div class="meta-line">${escapeText(productDescriptor(product) || "No optional details")}</div>
            </div>
            <span class="location-badge">${escapeText(productLocationLabels(product))}</span>
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
  const areaFilter = els.manageLocationAreaFilter.value;
  const sectionFilter = els.manageLocationSectionFilter.value;
  const locations = sortLocationsForManage(
    state.locations.filter((location) => {
      return (!areaFilter || location.area === areaFilter) && (!sectionFilter || location.section === sectionFilter);
    }),
  );

  els.locationListCount.textContent =
    locations.length === state.locations.length ? `${state.locations.length} total` : `${locations.length} of ${state.locations.length}`;

  if (!state.locations.length) {
    els.locationList.innerHTML = '<div class="empty-state">Add your first location.</div>';
    return;
  }

  if (!locations.length) {
    els.locationList.innerHTML = '<div class="empty-state">No locations match those filters.</div>';
    return;
  }

  els.locationList.innerHTML = locations
    .map((location) => {
      const products = locationProducts(location.id);
      const productCount = products.length;
      return `
        <article class="item-card clickable-card" data-open-location="${escapeText(location.id)}">
          <div class="card-top">
            <div>
              <div class="card-title">${escapeText(locationLabel(location))}</div>
              <div class="meta-line">${escapeText(
                products.length ? products.map((product) => product.name).join(", ") : "Empty location",
              )}</div>
            </div>
            <span class="location-badge">${productCount} product${productCount === 1 ? "" : "s"}</span>
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
  renderLocationOptions(getSelectedProductLocationIds());
  renderReportLocationOptions(els.reportLocation.value);
  renderManageLocationFilters();
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
  const products = location ? locationProducts(location.id) : [];

  els.locationDetailTitle.textContent = location ? locationLabel(location) : "New Location";
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
              <div class="card-title product-name ${departmentClassName(product.department)}" style="${departmentStyle(product.department)}">${escapeText(product.name)}</div>
              <div class="meta-line">${escapeText(productDescriptor(product) || "No optional details")}</div>
            </div>
          </div>
          <div class="card-actions location-product-actions">
            <button class="text-button" type="button" data-edit-product="${escapeText(product.id)}">Edit</button>
            <button class="danger-button" type="button" data-remove-from-location="${escapeText(product.id)}">Remove</button>
            <button class="danger-button" type="button" data-delete-product="${escapeText(product.id)}">Delete</button>
          </div>
        </article>
      `,
    )
    .join("");
}

function resetProductForm() {
  els.productForm.reset();
  els.productId.value = "";
  activeProductDetailId = "";
  renderLocationOptions([]);
  renderProductDetailTitle();
}

function fillLocationForm(location) {
  els.locationId.value = location ? location.id : "";
  els.locationArea.value = location ? location.area : "";
  els.locationSection.value = location ? location.section || "" : "";
  els.locationNumber.value = location ? location.number : "";
}

function setLocationFormOpen(isOpen) {
  isLocationFormOpen = isOpen;
  const isExistingLocation = Boolean(activeLocationDetailId && findLocation(activeLocationDetailId));
  els.locationForm.hidden = !isOpen;
  els.editLocationButton.hidden = isOpen || !isExistingLocation;
  els.addProductToLocationButton.hidden = isOpen || !isExistingLocation;
  els.locationDetailProducts.hidden = isOpen;
  els.locationForm.classList.toggle("active", isOpen);
  els.editLocationButton.classList.toggle("hidden", isOpen || !isExistingLocation);
  els.addProductToLocationButton.classList.toggle("hidden", isOpen || !isExistingLocation);
  els.locationDetailProducts.classList.toggle("hidden", isOpen);
  els.resetLocationForm.textContent = isExistingLocation ? "Cancel" : "Back";
}

function resetLocationForm() {
  const location = findLocation(activeLocationDetailId);
  if (location) {
    fillLocationForm(location);
    setLocationFormOpen(false);
    return;
  }

  showLocationList();
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
  renderLocationOptions([]);
  renderProductDetailTitle();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openNewProductForActiveLocation() {
  openLocationProductDialog();
}

function showLocationList() {
  activeLocationDetailId = "";
  isLocationFormOpen = false;
  els.locationsListView.classList.add("active");
  els.locationDetailView.classList.remove("active");
  els.locationForm.reset();
  els.locationId.value = "";
  setLocationFormOpen(false);
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
  setLocationFormOpen(true);
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
  fillLocationForm(location);
  setLocationFormOpen(false);
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
    const previousLocationIds = existingProduct ? getProductLocationIds(existingProduct) : [];
    const selectedLocationIds = getSelectedProductLocationIds();
    const product = {
      id,
      name: els.productName.value.trim(),
      department: els.productDepartment.value.trim(),
      color: formatColor(els.productColor.value),
      size: els.productSize.value.trim(),
      locationIds: [],
      locationId: "",
    };

    const index = state.products.findIndex((item) => item.id === id);
    if (index >= 0) {
      product.locationIds = previousLocationIds;
      product.locationId = previousLocationIds[0] || "";
      state.products[index] = product;
    } else {
      state.products.push(product);
    }

    setProductLocations(id, selectedLocationIds);
    activeProductDetailId = id;
    els.productId.value = id;
    await setDoc(productDoc(id), productPayload(findProduct(id)));
    await persistLocations(affectedLocationIds(previousLocationIds, selectedLocationIds));
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
    const previousProductIds = state.products.filter((product) => productHasLocation(product, id)).map((product) => product.id);
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

    activeLocationDetailId = id;
    els.locationId.value = id;
    syncLocationProductGroups();
    await setDoc(locationDoc(id), locationPayload(findLocation(id)));
    await persistProducts(previousProductIds);
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
  els.productColor.value = formatColor(product.color);
  els.productSize.value = product.size || "";
  renderLocationOptions(getProductLocationIds(product));
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
  const previousLocationIds = getProductLocationIds(product);
  state.products = state.products.filter((item) => item.id !== id);
  state.locations.forEach((location) => {
    if (location.productIds) {
      location.productIds = location.productIds.filter((productId) => productId !== id);
    }
  });
  await deleteDoc(productDoc(id));
  await persistLocations(previousLocationIds);
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

  const affectedProductIds = state.products.filter((product) => productHasLocation(product, id)).map((product) => product.id);
  state.locations = state.locations.filter((item) => item.id !== id);
  state.products.forEach((product) => {
    if (productHasLocation(product, id)) {
      product.locationIds = getProductLocationIds(product).filter((locationId) => locationId !== id);
      product.locationId = product.locationIds[0] || "";
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

  removeProductFromLocation(id, activeLocationDetailId);
  syncLocationProductGroups();
  await setDoc(productDoc(id), productPayload(product));
  await persistLocation(activeLocationDetailId);
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
els.locationProductForm.addEventListener("submit", handleLocationProductSubmit);
els.resetProductForm.addEventListener("click", resetProductForm);
els.resetLocationForm.addEventListener("click", resetLocationForm);
els.addProductButton.addEventListener("click", openNewProduct);
els.addProductToLocationButton.addEventListener("click", openNewProductForActiveLocation);
els.editLocationButton.addEventListener("click", (event) => {
  event.stopPropagation();
  setLocationFormOpen(true);
});
els.manageLocationAreaFilter.addEventListener("change", () => {
  renderManageLocationFilters();
  renderLocations();
});
els.manageLocationSectionFilter.addEventListener("change", renderLocations);
els.manageLocationSort.addEventListener("change", renderLocations);
els.clearLocationFilters.addEventListener("click", () => {
  els.manageLocationAreaFilter.value = "";
  els.manageLocationSectionFilter.value = "";
  els.manageLocationSort.value = "area";
  renderManageLocationFilters();
  renderLocations();
});
els.closeLocationProductDialog.addEventListener("click", closeLocationProductDialog);
els.cancelLocationProductDialog.addEventListener("click", closeLocationProductDialog);
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
