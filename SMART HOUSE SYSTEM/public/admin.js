/*******************************************
 * admin.js - Admin dashboard with API integration
 *******************************************/

document.addEventListener("DOMContentLoaded", function () {
  const sectionAnalytics = document.getElementById("sectionAnalytics");

  // nav buttons
  const btnAnalytics = document.getElementById("btnAnalytics");
  const btnRooms = document.getElementById("btnRooms");
  const btnUsers = document.getElementById("btnUsers");
  const btnLogout = document.getElementById("btnLogout");

  // wire up nav clicks
  btnAnalytics.addEventListener("click", () => showSection("analytics"));
  btnRooms.addEventListener("click", () => showSection("rooms"));
  btnUsers.addEventListener("click", () => {
    showSection("users");
    fetchUsers();
  });
  btnLogout.addEventListener("click", handleLogout);

  //init energy chart
  initEnergyChart();

  //restore default settings
  const savedPeriod = localStorage.getItem("selectedPeriod") || "day";
  const savedRoomSelections = JSON.parse(
    localStorage.getItem("selectedRooms") || '["All"]'
  );

  //init date inputs
  const today = new Date().toISOString().split("T")[0];
  const dayInput = document.getElementById("dayInput");
  if (dayInput) {
    dayInput.value = localStorage.getItem("selectedDay") || today;
  }

  const monthSelect = document.getElementById("monthSelect");
  const yearSelect = document.getElementById("yearSelect");

  if (monthSelect) {
    const savedMonth =
      localStorage.getItem("selectedMonth") ||
      (new Date().getMonth() + 1).toString();
    monthSelect.value = savedMonth;
  }

  if (yearSelect) {
    const savedYear =
      localStorage.getItem("selectedYear") ||
      new Date().getFullYear().toString();
    yearSelect.value = savedYear;
  }

  //fetch and populate rooms
  fetchAndPopulateRooms().then(() => {
    //restore room selections
    const roomsSelect = document.getElementById("roomsSelect");
    if (roomsSelect) {
      roomsSelect.querySelectorAll(".roomLabel").forEach((button) => {
        if (savedRoomSelections.includes(button.value)) {
          button.classList.add("selected");
        } else {
          button.classList.remove("selected");
        }
      });
    }

    //set active period
    setActivePeriod(savedPeriod);
    setChartData(savedPeriod);
    updateEnergySummary();
  });

  // password reset button - handles the actual reset process
  const saveNewPasswordBtn = document.getElementById("saveNewPassword");
  if (saveNewPasswordBtn) {
    saveNewPasswordBtn.addEventListener("click", handlePasswordReset);
  }

  // show/hide password toggle
  const togglePasswordBtn = document.getElementById("togglePassword");
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener("click", function () {
      const passwordInput = document.getElementById("newPassword");
      const icon = this.querySelector("i");

      if (passwordInput.type === "password") {
        passwordInput.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
      } else {
        passwordInput.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
      }
    });
  }

  // stop the form from submitting normally
  const passwordResetForm = document.getElementById("passwordResetForm");
  if (passwordResetForm) {
    passwordResetForm.addEventListener("submit", (e) => {
      e.preventDefault();
      return false;
    });
  }

  // user list filters
  const filterUsername = document.getElementById("filterUsername");
  const filterRole = document.getElementById("filterRole");
  const filterRoom = document.getElementById("filterRoom");

  // hook up the filter events
  if (filterUsername) {
    filterUsername.addEventListener("input", applyFilters);
  }
  if (filterRole) {
    filterRole.addEventListener("change", applyFilters);
  }
  if (filterRoom) {
    filterRoom.addEventListener("input", applyFilters);
  }

  // pagination controls
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");

  // previous page handler
  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        displayUsers();
      }
    });
  }

  // next page handler
  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", () => {
      const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        displayUsers();
      }
    });
  }

  //restore last section or default
  const lastActiveSection =
    localStorage.getItem("activeSection") || "analytics";
  showSection(lastActiveSection);

  //load list of users
  if (lastActiveSection === "users") {
    fetchUsers();
  }

  //event listeners for saving selections
  if (dayInput) {
    dayInput.addEventListener("change", function () {
      localStorage.setItem("selectedDay", this.value);
      setChartData("day");
    });
  }

  if (monthSelect) {
    monthSelect.addEventListener("change", function () {
      localStorage.setItem("selectedMonth", this.value);
      setChartData("month");
    });
  }

  if (yearSelect) {
    yearSelect.addEventListener("change", function () {
      localStorage.setItem("selectedYear", this.value);
      setChartData("year");
    });
  }

  //export buttons
  const exportChartBtn = document.getElementById("exportChart");
  const exportCSVBtn = document.getElementById("exportCSV");
  const viewAlertsBtn = document.getElementById("viewAlerts");
  const btnAddUser = document.getElementById("btnAddUser");
  const btnRefreshUsers = document.getElementById("btnRefreshUsers");

  if (exportChartBtn) {
    exportChartBtn.addEventListener("click", exportChart);
  }
  if (exportCSVBtn) {
    exportCSVBtn.addEventListener("click", exportCSV);
  }
  if (viewAlertsBtn) {
    viewAlertsBtn.addEventListener("click", viewAlerts);
  }
  if (btnAddUser) {
    btnAddUser.addEventListener("click", addUser);
  }
  if (btnRefreshUsers) {
    btnRefreshUsers.addEventListener("click", async () => {
      if (btnRefreshUsers.disabled) return;

      const originalContent = btnRefreshUsers.innerHTML;
      btnRefreshUsers.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
      btnRefreshUsers.disabled = true;

      try {
        await fetchUsersWithCache();
      } catch (error) {
        console.error("Error during refresh:", error);

        const tableContainer = document.querySelector(".table-responsive");
        if (tableContainer) {
          tableContainer.innerHTML = `
            <div class="alert alert-danger">
              <i class="fas fa-exclamation-circle"></i> Error refreshing users: ${error.message}
              <button class="btn btn-sm btn-outline-danger ms-2" onclick="retryRefresh()">
                <i class="fas fa-redo"></i> Retry
              </button>
            </div>
          `;
        }
      } finally {
        btnRefreshUsers.innerHTML = originalContent;
        btnRefreshUsers.disabled = false;
      }
    });
  }

  //retry function
  function retryRefresh() {
    const btnRefreshUsers = document.getElementById("btnRefreshUsers");
    if (btnRefreshUsers) {
      btnRefreshUsers.click();
    }
  }
});

/*******************************************
 * SECTION TOGGLING
 *******************************************/

//cache management variables
let userCache = {
  data: null,
  version: null,
  lastFetch: null,
  isFetching: false,
};

//cache management functions
async function getCachedUsers() {
  // If we're already fetching, return the cached data if available
  if (userCache.isFetching) {
    if (userCache.data) {
      return userCache.data;
    }
    //wait for ongoing fetch to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return userCache.data;
  }

  //if we have cached data and it's less than 5 minutes old, use it
  if (
    userCache.data &&
    userCache.lastFetch &&
    Date.now() - userCache.lastFetch < 5 * 60 * 1000
  ) {
    return userCache.data;
  }

  //otherwise, fetch fresh data
  return await fetchUsersWithCache();
}

async function fetchUsersWithCache() {
  if (userCache.isFetching) {
    return userCache.data;
  }

  userCache.isFetching = true;
  const userSection = document.getElementById("sectionUsers");
  if (!userSection) {
    userCache.isFetching = false;
    throw new Error("User section not found");
  }

  //ensure table container exists
  let tableContainer = userSection.querySelector(".table-responsive");
  if (!tableContainer) {
    tableContainer = document.createElement("div");
    tableContainer.className = "table-responsive";
    userSection.querySelector(".card-body").appendChild(tableContainer);
  }

  try {
    //show loading state
    tableContainer.innerHTML = `
      <div class="text-center my-3">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading users...</span>
        </div>
      </div>
    `;

    //get base user list with retry logic
    let retryCount = 0;
    const maxRetries = 3;
    let allUsersData;

    while (retryCount < maxRetries) {
      try {
        allUsersData = await smartHomeApi.users.getAll();
        break;
      } catch (error) {
        retryCount++;
        if (retryCount === maxRetries) {
          throw new Error(
            `Failed to fetch users after ${maxRetries} attempts: ${error.message}`
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
      }
    }

    //fetch room assignments in parallel
    const roomPromises = allUsersData.map(async (user) => {
      if (user.role_name === "resident") {
        try {
          const room = await smartHomeApi.userRooms.getUserRoom(user.user_id);
          return {
            userId: user.user_id,
            room: room ? `Room ${room.room_number}` : "None",
          };
        } catch (error) {
          console.error(`Error fetching room for user ${user.user_id}:`, error);
          return {
            userId: user.user_id,
            room: "Error",
          };
        }
      }
      return {
        userId: user.user_id,
        room: "N/A",
      };
    });

    const roomResults = await Promise.all(roomPromises);

    //update user room assignments
    roomResults.forEach((result) => {
      const user = allUsersData.find((u) => u.user_id === result.userId);
      if (user) {
        user.assignedRoom = result.room;
      }
    });

    //update cache
    userCache.data = allUsersData;
    userCache.lastFetch = Date.now();
    userCache.version = Date.now().toString();

    //update the display
    allUsers = allUsersData;
    applyFilters();

    return allUsersData;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  } finally {
    userCache.isFetching = false;
  }
}

function showSection(section) {
  const sectionAnalytics = document.getElementById("sectionAnalytics");
  const sectionRooms = document.getElementById("sectionRooms");
  const sectionUsers = document.getElementById("sectionUsers");

  //store the active section
  localStorage.setItem("activeSection", section);

  //hide all sections
  sectionAnalytics.classList.add("d-none");
  sectionRooms.classList.add("d-none");
  sectionUsers.classList.add("d-none");

  //show the requested section
  if (section === "analytics") {
    sectionAnalytics.classList.remove("d-none");
    const savedPeriod = localStorage.getItem("selectedPeriod") || "day";
    setActivePeriod(savedPeriod);
  } else if (section === "rooms") {
    sectionRooms.classList.remove("d-none");
    showRoomAssignments();
  } else if (section === "users") {
    sectionUsers.classList.remove("d-none");

    //reset the user section state
    allUsers = [];
    filteredUsers = [];
    currentPage = 1;

    //initialize the table container with loading state
    const tableContainer = sectionUsers.querySelector(".table-responsive");
    if (tableContainer) {
      tableContainer.innerHTML = `
        <div class="text-center my-3">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading users...</span>
          </div>
        </div>
      `;
    }

    //reset filters to default values
    const filterUsername = document.getElementById("filterUsername");
    const filterRole = document.getElementById("filterRole");
    const filterRoom = document.getElementById("filterRoom");

    if (filterUsername) filterUsername.value = "";
    if (filterRole) filterRole.value = "";
    if (filterRoom) filterRoom.value = "";

    //use cached data
    getCachedUsers().catch((error) => {
      console.error("Error loading cached users:", error);
      const tableContainer = sectionUsers.querySelector(".table-responsive");
      if (tableContainer) {
        tableContainer.innerHTML = `
          <div class="alert alert-danger">
            <i class="fas fa-exclamation-circle"></i> Error loading users: ${error.message}
            <button class="btn btn-sm btn-outline-danger ms-2" onclick="retryRefresh()">
              <i class="fas fa-redo"></i> Retry
            </button>
          </div>
        `;
      }
    });
  }

  //close the offcanvas sidebar
  const offcanvasElement = document.getElementById("sidebarMenu");
  if (offcanvasElement) {
    const bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvasElement);
    if (bsOffcanvas) {
      bsOffcanvas.hide();
      const backdrop = document.querySelector(".offcanvas-backdrop");
      if (backdrop) {
        backdrop.remove();
      }
      document.body.classList.remove("modal-open");
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
  }
}

/*******************************************
 * CHART AND STATISTICS
 *******************************************/

let energyChart;
let currentPeriod = "day"; //track the current time period

//define colors for different room datasets (randomly assigned)
const colors = [
  "rgba(75,192,192,1)",
  "rgba(255,99,132,1)",
  "rgba(54,162,235,1)",
  "rgba(255,206,86,1)",
  "rgba(153,102,255,1)",
  "rgba(255,159,64,1)",
];

function initEnergyChart() {
  const ctx = document.getElementById("energyChart");
  energyChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true },
      },
    },
  });
}

//used to select rooms for filtering chart data
function getSelectedRoomsFromDropdown() {
  const roomsSelect = document.getElementById("roomsSelect");
  if (!roomsSelect) return [];

  const selectedButtons = roomsSelect.querySelectorAll(".roomLabel.selected");
  const selectedRooms = Array.from(selectedButtons).map(
    (button) => button.value
  );

  //if "All" is selected, return all rooms
  if (selectedRooms.includes("All")) {
    return rooms_global;
  }
  return selectedRooms.length ? selectedRooms : [];
}

//generate labels based on the current period
function generateLabels(period) {
  if (period === "day") {
    return Array.from({ length: 24 }, (_, i) => `${i}:00`);
  } else if (period === "month") {
    //get the selected month and year from the dropdowns
    const monthSelect = document.getElementById("monthSelect");
    const yearSelect = document.getElementById("yearSelect");
    const selectedMonth = parseInt(monthSelect.value) - 1; // Convert to 0-based month
    const selectedYear = parseInt(yearSelect.value);

    //get the number of days in the selected month
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

    //generate array with correct number of days
    return Array.from({ length: daysInMonth }, (_, i) => `Day ${i + 1}`);
  } else {
    return [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
  }
}

//set chart data based on current selections
async function setChartData(period) {
  try {
    const selectedRooms = getSelectedRoomsFromDropdown();
    if (selectedRooms.length === 0) {
      console.log("No rooms selected");
      return;
    }

    //get filter values based on the current period
    let filterDate;
    if (period === "day") {
      filterDate = document.getElementById("dayInput").value;
    }

    //show loading indicator
    document.getElementById("chartLoading").classList.remove("d-none");

    //prepare data structure for the chart
    const labels = generateLabels(period);
    const datasets = [];
    let totalData = Array(labels.length).fill(0);

    //fetch data for each selected room
    for (let i = 0; i < selectedRooms.length; i++) {
      const roomId = selectedRooms[i];
      try {
        //use the API client to fetch energy data
        const roomData = await smartHomeApi.energy.getUsage(
          roomId,
          period,
          filterDate
        );

        //process the data to match chart format
        const processedData = Array(labels.length).fill(0);

        roomData.forEach((item) => {
          let index = 0;
          if (period === "day") {
            index = item.hour || 0;
          } else if (period === "month") {
            index = (item.day || 1) - 1; //days are 1-indexed
          } else if (period === "year") {
            index = (item.month || 1) - 1; //months are 1-indexed
          }

          if (index >= 0 && index < processedData.length) {
            processedData[index] = parseFloat(item.energy || 0);
            totalData[index] += parseFloat(item.energy || 0);
          }
        });

        //add dataset for this room
        datasets.push({
          label: `Room ${roomId}`,
          data: processedData,
          borderColor: colors[i % colors.length],
          backgroundColor: colors[i % colors.length].replace("1)", "0.2)"),
          fill: period === "day", // Only fill area for day view
        });
      } catch (error) {
        console.error(`Error fetching data for room ${roomId}:`, error);
      }
    }

    //add total dataset
    datasets.push({
      label: "Total",
      data: totalData,
      type: "line",
      borderColor: "rgba(0,0,0,1)",
      backgroundColor: "rgba(0,0,0,0.2)",
      fill: false,
    });

    //update the chart
    const newType = period === "day" ? "line" : "bar";

    if (!energyChart || energyChart.config.type !== newType) {
      if (energyChart) {
        energyChart.destroy();
      }
      const ctx = document.getElementById("energyChart");
      energyChart = new Chart(ctx, {
        type: newType,
        data: { labels: labels, datasets: [] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { beginAtZero: true } },
        },
      });
    }

    energyChart.data.labels = labels;
    energyChart.data.datasets = datasets;
    energyChart.update();

    //update statistics
    const totalEnergy = totalData.reduce((sum, val) => sum + val, 0);
    document.getElementById("energyUsage").textContent = `${totalEnergy.toFixed(
      2
    )} kWh`;

    //update device status count (needs to be implemented with device API)
    updateDeviceStatusCount(selectedRooms);

    //hide loading indicator
    document.getElementById("chartLoading").classList.add("d-none");
  } catch (error) {
    console.error("Error setting chart data:", error);
    document.getElementById("chartLoading").classList.add("d-none");
  }
}

//update the device status count
async function updateDeviceStatusCount(roomIds) {
  try {
    let activeCount = 0;
    let totalCount = 0;

    for (const roomId of roomIds) {
      const devices = await smartHomeApi.devices.getByRoom(roomId);
      totalCount += devices.length;

      //count active devices
      for (const device of devices) {
        if (device.status === "on") {
          activeCount++;
        }
      }
    }

    document.getElementById(
      "deviceStatus"
    ).textContent = `${activeCount} of ${totalCount}`;
  } catch (error) {
    console.error("Error updating device status count:", error);
    document.getElementById("deviceStatus").textContent = "N/A";
  }
}

/*******************************************
 * ROOMS AND USERS MANAGEMENT
 *******************************************/

let rooms_global = [];

//fetch and populate rooms
async function fetchAndPopulateRooms() {
  try {
    //show loading indicator
    const loadingIndicator = document.createElement("div");
    loadingIndicator.id = "roomsLoading";
    loadingIndicator.className = "text-center my-3";
    loadingIndicator.innerHTML =
      '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';

    const roomsSelect = document.getElementById("roomsSelect");
    if (roomsSelect) {
      roomsSelect.appendChild(loadingIndicator);
    }

    //fetch rooms from API
    const rooms = await smartHomeApi.rooms.getAll();

    if (rooms.length > 0) {
      rooms_global = rooms.map((room) => room.room_id);

      //remove loading indicator
      const loadingElement = document.getElementById("roomsLoading");
      if (loadingElement) {
        loadingElement.remove();
      }

      //populate room selection
      populateRooms(rooms);

      //also populate room grid
      populateRoomGrid(rooms);
    } else {
      console.log("No rooms found, generating test data");

      //if no rooms exist, create a test room
      try {
        const newRoom = await smartHomeApi.rooms.create("101", "Test Room");
        console.log("Test room created:", newRoom);

        //add test devices to the room
        const roomId = newRoom.roomId;
        await smartHomeApi.test.createDevices(roomId);

        //refresh rooms
        fetchAndPopulateRooms();
      } catch (error) {
        console.error("Error creating test room:", error);
        rooms_global = ["101"];
        populateRoomsMock(["101"]);
      }
    }
  } catch (error) {
    console.error("Error fetching rooms:", error);

    //remove loading indicator
    const loadingElement = document.getElementById("roomsLoading");
    if (loadingElement) {
      loadingElement.remove();
    }

    //fallback
    const mockRooms = ["101", "102", "103", "104", "105"];
    rooms_global = mockRooms;
    populateRoomsMock(mockRooms);
  }
}

//modify setupRoomFilterEvents to save room selections
function setupRoomFilterEvents() {
  const roomsSelect = document.getElementById("roomsSelect");
  if (roomsSelect) {
    roomsSelect.addEventListener("click", function (e) {
      const button = e.target.closest(".roomLabel");
      if (!button) return;

      if (button.classList.contains("selected")) {
        button.classList.remove("selected");
      } else {
        if (button.value !== "All") {
          const allButton = roomsSelect.querySelector(
            '.roomLabel[value="All"]'
          );
          if (allButton) {
            allButton.classList.remove("selected");
          }
        } else {
          //if "All" is selected, deselect other rooms
          roomsSelect.querySelectorAll(".roomLabel").forEach((btn) => {
            if (btn !== button) {
              btn.classList.remove("selected");
            }
          });
        }
        button.classList.add("selected");
      }

      //save room selections to localStorage
      const selectedButtons = roomsSelect.querySelectorAll(
        ".roomLabel.selected"
      );
      const selectedRooms = Array.from(selectedButtons).map((btn) => btn.value);
      localStorage.setItem("selectedRooms", JSON.stringify(selectedRooms));

      //update chart with selected rooms
      setChartData(currentPeriod);
    });
  }
}

//populate rooms in the filter dropdown
function populateRooms(rooms) {
  const roomsSelect = document.getElementById("roomsSelect");
  if (!roomsSelect) return;

  roomsSelect.innerHTML =
    '<button value="All" class="roomLabel selected">All Rooms</button>';

  rooms.forEach((room) => {
    const option = document.createElement("button");
    option.value = room.room_id;
    option.textContent = `Room ${room.room_number}`;
    option.className = "roomLabel";
    roomsSelect.appendChild(option);
  });

  //set up room filter events after populating rooms
  setupRoomFilterEvents();
}

//fallback for populating rooms when API fails
function populateRoomsMock(rooms) {
  const roomsSelect = document.getElementById("roomsSelect");
  if (!roomsSelect) return;

  roomsSelect.innerHTML =
    '<button value="All" class="roomLabel selected">All Rooms</button>';

  rooms.forEach((roomNumber) => {
    const option = document.createElement("button");
    option.value = roomNumber;
    option.textContent = `Room ${roomNumber}`;
    option.className = "roomLabel";
    roomsSelect.appendChild(option);
  });

  //set up room filter events after populating mock rooms
  setupRoomFilterEvents();
}

//populate the room grid in the Rooms section
function populateRoomGrid(rooms) {
  const roomGrid = document.querySelector(".room-grid");
  if (!roomGrid) return;

  roomGrid.innerHTML = "";

  rooms.forEach((room) => {
    const roomButton = document.createElement("div");
    roomButton.className = "room-button";
    roomButton.textContent = `Room ${room.room_number}`;
    roomButton.dataset.roomId = room.room_id;

    //add click handler to view room details
    roomButton.addEventListener("click", () => viewRoomDetails(room.room_id));

    roomGrid.appendChild(roomButton);
  });
}

//refresh room grid data
async function refreshRoomGrid() {
  try {
    const rooms = await smartHomeApi.rooms.getAll();
    populateRoomGrid(rooms);
  } catch (error) {
    console.error("Error refreshing room grid:", error);
  }
}

//view details for a specific room
async function viewRoomDetails(roomId) {
  try {
    //create and show the modal first with loading state
    const modalHTML = `
      <div class="modal fade" id="roomDetailModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Room ${roomId} Details</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">Loading room details...</span>
                </div>
                <p class="mt-2">Loading room details...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    //add the modal to the document
    const modalContainer = document.createElement("div");
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);

    //show the modal
    const modal = new bootstrap.Modal(
      document.getElementById("roomDetailModal")
    );
    modal.show();

    //fetch data
    const [devices, users] = await Promise.all([
      smartHomeApi.devices.getByRoom(roomId),
      smartHomeApi.userRooms.getUsersByRoom(roomId),
    ]);

    //prevent duplicate device fetch
    const uniqueDevices = new Map();
    devices.forEach((device) => {
      const existingDevice = uniqueDevices.get(device.device_id);
      if (
        !existingDevice ||
        new Date(device.last_updated) > new Date(existingDevice.last_updated)
      ) {
        uniqueDevices.set(device.device_id, device);
      }
    });
    const deduplicatedDevices = Array.from(uniqueDevices.values());

    //update modal content with the fetched data
    const modalBody = document.querySelector("#roomDetailModal .modal-body");
    modalBody.innerHTML = `
      <!-- Residents Tab -->
      <div class="mb-4">
        <h6>Assigned Residents</h6>
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Email</th>
                <th>Assigned Date</th>
              </tr>
            </thead>
            <tbody>
              ${
                users.length
                  ? users
                      .map(
                        (user) => `
                  <tr>
                    <td>${user.username}</td>
                    <td>${user.role_name}</td>
                    <td>${user.email || "N/A"}</td>
                    <td>${new Date(user.assigned_date).toLocaleString()}</td>
                  </tr>
                `
                      )
                      .join("")
                  : '<tr><td colspan="4" class="text-center">No residents assigned to this room</td></tr>'
              }
            </tbody>
          </table>
        </div>
        <button class="btn btn-success" id="assignResidentBtn">Assign Resident</button>
      </div>
      
      <!-- Devices Tab -->
      <h6>Devices</h6>
      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>Device</th>
              <th>Type</th>
              <th>Status</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${deduplicatedDevices
              .map(
                (device) => `
              <tr>
                <td>${device.device_name}</td>
                <td>${device.device_type}</td>
                <td>${device.status || "Unknown"}</td>
                <td>${
                  device.last_updated
                    ? new Date(device.last_updated).toLocaleString()
                    : "N/A"
                }</td>
                <td>
                  <div class="btn-group">
                    <button class="btn btn-sm btn-primary toggle-device" 
                            data-device-id="${device.device_id}" 
                            data-current-status="${device.status || "off"}">
                      Toggle
                    </button>
                    <button class="btn btn-sm btn-danger remove-device"
                            data-device-id="${device.device_id}"
                            data-device-name="${device.device_name}">
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
      <div class="mt-3">
        <button class="btn btn-success" id="addDeviceBtn">Add Device</button>
      </div>
    `;

    //add event listeners to toggle buttons
    document.querySelectorAll(".toggle-device").forEach((button) => {
      button.addEventListener("click", async function () {
        const deviceId = this.dataset.deviceId;
        const currentStatus = this.dataset.currentStatus;
        const newStatus = currentStatus === "on" ? "off" : "on";

        try {
          //show loading spinner on the button
          this.innerHTML =
            '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Updating...';
          this.disabled = true;

          //update the device status via API
          await smartHomeApi.devices.updateStatus(deviceId, newStatus);

          //update the button and status cell
          this.dataset.currentStatus = newStatus;
          this.innerHTML = "Toggle";
          this.disabled = false;

          const statusCell =
            this.closest("tr").querySelector("td:nth-child(3)");
          statusCell.textContent = newStatus;

          //update the timestamp
          const timestampCell =
            this.closest("tr").querySelector("td:nth-child(4)");
          timestampCell.textContent = new Date().toLocaleString();
        } catch (error) {
          console.error("Error toggling device status:", error);
          this.innerHTML = "Toggle";
          this.disabled = false;
          alert("Error updating device status. Please try again.");
        }
      });
    });

    //add event listeners to remove buttons
    document.querySelectorAll(".remove-device").forEach((button) => {
      button.addEventListener("click", async function () {
        const deviceId = this.dataset.deviceId;
        const deviceName = this.dataset.deviceName;

        if (
          confirm(
            `Are you sure you want to remove ${deviceName}? This action cannot be undone.`
          )
        ) {
          try {
            //show loading spinner on the button
            this.innerHTML =
              '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Removing...';
            this.disabled = true;

            //remove the device via API
            await smartHomeApi.devices.remove(deviceId);

            //remove the row from the table
            this.closest("tr").remove();
          } catch (error) {
            console.error("Error removing device:", error);
            this.innerHTML = "Remove";
            this.disabled = false;
            alert("Error removing device. Please try again.");
          }
        }
      });
    });

    //add device button handler
    document.getElementById("addDeviceBtn").addEventListener("click", () => {
      showAddDeviceForm(roomId, modal);
    });

    //assign resident button handler
    document
      .getElementById("assignResidentBtn")
      .addEventListener("click", () => {
        showAssignResidentForm(roomId, modal);
      });

    //remove the modal from DOM when it's closed
    document
      .getElementById("roomDetailModal")
      .addEventListener("hidden.bs.modal", function () {
        document.body.removeChild(modalContainer);
      });
  } catch (error) {
    console.error("Error fetching room details:", error);
    alert("Error loading room details. Please try again.");
  }
}

//function to update the device list table
async function updateDeviceList(roomId) {
  try {
    //get the table body
    const deviceTableBody = document.querySelector(
      "#roomDetailModal .table tbody"
    );
    if (!deviceTableBody) return;

    //show loading state
    deviceTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading devices...</span>
          </div>
        </td>
      </tr>
    `;

    //fetch updated device list
    const devices = await smartHomeApi.devices.getByRoom(roomId);

    //stop duplicate devicee fetch
    const uniqueDevices = new Map();
    devices.forEach((device) => {
      const existingDevice = uniqueDevices.get(device.device_id);
      if (
        !existingDevice ||
        new Date(device.last_updated) > new Date(existingDevice.last_updated)
      ) {
        uniqueDevices.set(device.device_id, device);
      }
    });
    const deduplicatedDevices = Array.from(uniqueDevices.values());

    //update the table with new data
    deviceTableBody.innerHTML = deduplicatedDevices
      .map(
        (device) => `
      <tr>
        <td>${device.device_name}</td>
        <td>${device.device_type}</td>
        <td>${device.status || "Unknown"}</td>
        <td>${
          device.last_updated
            ? new Date(device.last_updated).toLocaleString()
            : "N/A"
        }</td>
        <td>
          <div class="btn-group">
            <button class="btn btn-sm btn-primary toggle-device" 
                    data-device-id="${device.device_id}" 
                    data-current-status="${device.status || "off"}">
              Toggle
            </button>
            <button class="btn btn-sm btn-danger remove-device"
                    data-device-id="${device.device_id}"
                    data-device-name="${device.device_name}">
                      Remove
                    </button>
          </div>
        </td>
      </tr>
    `
      )
      .join("");

    //reattach event listeners to the new buttons
    deviceTableBody.querySelectorAll(".toggle-device").forEach((button) => {
      button.addEventListener("click", async function () {
        const deviceId = this.dataset.deviceId;
        const currentStatus = this.dataset.currentStatus;
        const newStatus = currentStatus === "on" ? "off" : "on";

        try {
          this.innerHTML =
            '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Updating...';
          this.disabled = true;

          await smartHomeApi.devices.updateStatus(deviceId, newStatus);

          this.dataset.currentStatus = newStatus;
          this.innerHTML = "Toggle";
          this.disabled = false;

          const statusCell =
            this.closest("tr").querySelector("td:nth-child(3)");
          statusCell.textContent = newStatus;

          const timestampCell =
            this.closest("tr").querySelector("td:nth-child(4)");
          timestampCell.textContent = new Date().toLocaleString();
        } catch (error) {
          console.error("Error toggling device status:", error);
          this.innerHTML = "Toggle";
          this.disabled = false;
          alert("Error updating device status. Please try again.");
        }
      });
    });

    deviceTableBody.querySelectorAll(".remove-device").forEach((button) => {
      button.addEventListener("click", async function () {
        const deviceId = this.dataset.deviceId;
        const deviceName = this.dataset.deviceName;

        if (
          confirm(
            `Are you sure you want to remove ${deviceName}? This action cannot be undone.`
          )
        ) {
          try {
            this.innerHTML =
              '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Removing...';
            this.disabled = true;

            await smartHomeApi.devices.remove(deviceId);
            this.closest("tr").remove();
          } catch (error) {
            console.error("Error removing device:", error);
            this.innerHTML = "Remove";
            this.disabled = false;
            alert("Error removing device. Please try again.");
          }
        }
      });
    });
  } catch (error) {
    console.error("Error updating device list:", error);
    alert("Error updating device list. Please try again.");
  }
}

//show form to add new device
function showAddDeviceForm(roomId, parentModal) {
  //hide the parent modal
  if (parentModal) {
    parentModal.hide();
  }

  //create and show the add device modal
  const addDeviceHTML = `
    <div class="modal fade" id="addDeviceModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Add New Device</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="addDeviceForm">
              <div class="mb-3">
                <label for="deviceName" class="form-label">Device Name</label>
                <input type="text" class="form-control" id="deviceName" required>
              </div>
              <div class="mb-3">
                <label for="deviceType" class="form-label">Device Type</label>
                <select class="form-select" id="deviceType" required>
                  <option value="light">Light</option>
                  <option value="blind">Blind</option>
                  <option value="thermostat">Thermostat</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" id="submitAddDevice">Add Device</button>
          </div>
        </div>
      </div>
    </div>
  `;

  //add the modal to the document
  const modalContainer = document.createElement("div");
  modalContainer.innerHTML = addDeviceHTML;
  document.body.appendChild(modalContainer);

  //show the modal
  const modal = new bootstrap.Modal(document.getElementById("addDeviceModal"));
  modal.show();

  //add event listener to submit button
  document
    .getElementById("submitAddDevice")
    .addEventListener("click", async () => {
      const deviceName = document.getElementById("deviceName").value;
      const deviceType = document.getElementById("deviceType").value;

      if (!deviceName || !deviceType) {
        alert("Please fill out all fields.");
        return;
      }

      try {
        //show loading state
        const submitBtn = document.getElementById("submitAddDevice");
        submitBtn.innerHTML =
          '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Adding...';
        submitBtn.disabled = true;

        //add the device via API
        await smartHomeApi.devices.add(roomId, deviceType, deviceName);

        //hide the modal
        modal.hide();

        //show the parent modal again
        if (parentModal) {
          parentModal.show();
        }

        //update the device list
        await updateDeviceList(roomId);
      } catch (error) {
        console.error("Error adding device:", error);
        alert("Error adding device. Please try again.");

        //reset button
        submitBtn.innerHTML = "Add Device";
        submitBtn.disabled = false;
      }
    });

  //remove the modal from DOM when it's closed
  document
    .getElementById("addDeviceModal")
    .addEventListener("hidden.bs.modal", function () {
      document.body.removeChild(modalContainer);

      //reopen the parent modal if it was closed
      if (parentModal) {
        parentModal.show();
      }
    });
}

//show form to assign a resident to a room
async function showAssignResidentForm(roomId, parentModal) {
  //hide the parent modal
  if (parentModal) {
    parentModal.hide();
  }

  //fetch all users with resident role
  let residents = [];
  try {
    const allUsers = await fetch("/users").then((res) => res.json());
    residents = allUsers.filter((user) => user.role_name === "resident");
  } catch (error) {
    console.error("Error fetching residents:", error);
    residents = [];
  }

  //create and show the assign resident modal
  const assignResidentHTML = `
    <div class="modal fade" id="assignResidentModal" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Assign Resident to Room</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <form id="assignResidentForm">
              <div class="mb-3">
                <label for="residentSelect" class="form-label">Select Resident</label>
                <select class="form-select" id="residentSelect" required>
                  <option value="">-- Select a Resident --</option>
                  ${residents
                    .map(
                      (resident) => `
                    <option value="${resident.user_id}">${resident.username}</option>
                  `
                    )
                    .join("")}
                </select>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" id="submitAssignResident">Assign to Room</button>
          </div>
        </div>
      </div>
    </div>
  `;

  //add the modal to the document
  const modalContainer = document.createElement("div");
  modalContainer.innerHTML = assignResidentHTML;
  document.body.appendChild(modalContainer);

  //show the modal
  const modal = new bootstrap.Modal(
    document.getElementById("assignResidentModal")
  );
  modal.show();

  //add event listener to submit button
  document
    .getElementById("submitAssignResident")
    .addEventListener("click", async () => {
      const userId = document.getElementById("residentSelect").value;

      if (!userId) {
        alert("Please select a resident.");
        return;
      }

      try {
        //show loading state
        const submitBtn = document.getElementById("submitAssignResident");
        submitBtn.innerHTML =
          '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Assigning...';
        submitBtn.disabled = true;

        //assign the resident to the room via API
        await smartHomeApi.userRooms.assignRoom(userId, roomId);

        //hide the modal
        modal.hide();

        //show success message
        alert("Resident assigned to room successfully.");

        //reopen the room details modal
        viewRoomDetails(roomId);
      } catch (error) {
        console.error("Error assigning resident:", error);
        alert(`Error assigning resident: ${error.message}`);

        //reset button
        submitBtn.innerHTML = "Assign to Room";
        submitBtn.disabled = false;
      }
    });

  //remove the modal from DOM when it's closed
  document
    .getElementById("assignResidentModal")
    .addEventListener("hidden.bs.modal", function () {
      document.body.removeChild(modalContainer);

      //reopen the parent modal if it was closed
      if (parentModal) {
        parentModal.show();
      }
    });
}

/*******************************************
 * USER-ROOM ASSIGNMENT MANAGEMENT
 *******************************************/

//fetch a user's current room assignment
async function getUserRoom(userId) {
  try {
    return await smartHomeApi.userRooms.getUserRoom(userId);
  } catch (error) {
    console.error(`Error fetching room for user ${userId}:`, error);
    return null;
  }
}

// Enhanced edit user function with room assignment
async function editUser(userId) {
  try {
    //fetch user details
    const users = await smartHomeApi.users.getAll();
    //convert userId to number for comparison
    const user = users.find((u) => u.user_id === Number(userId));

    if (!user) {
      console.error("User not found:", userId);
      console.log("Available users:", users);
      alert("User not found");
      return;
    }

    //fetch available rooms
    const rooms = await smartHomeApi.rooms.getAll();

    //fetch user's current room
    const currentRoom = await getUserRoom(userId);

    //only show room assignment for residents
    const isResident = user.role_name === "resident";

    //create and show edit modal
    const modalHTML = `
      <div class="modal fade" id="editUserModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Edit User</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="editUserForm">
                <div class="mb-3">
                  <label for="editUsername" class="form-label">Username</label>
                  <input type="text" class="form-control" id="editUsername" value="${
                    user.username
                  }" required>
                </div>
                <div class="mb-3">
                  <label for="editEmail" class="form-label">Email</label>
                  <input type="email" class="form-control" id="editEmail" value="${
                    user.email || ""
                  }">
                </div>
                <div class="mb-3">
                  <label for="editRole" class="form-label">Role</label>
                  <select class="form-select" id="editRole" required>
                    <option value="1" ${
                      user.role_name === "resident" ? "selected" : ""
                    }>Resident</option>
                    <option value="4" ${
                      user.role_name === "admin" ? "selected" : ""
                    }>Admin</option>
                  </select>
                </div>
                
                <div id="roomAssignmentSection" class="mb-3 ${
                  isResident ? "" : "d-none"
                }">
                  <label for="assignedRoom" class="form-label">Assigned Room</label>
                  <select class="form-select" id="assignedRoom">
                    <option value="">-- No Room Assigned --</option>
                    ${rooms
                      .map(
                        (room) => `
                      <option value="${room.room_id}" ${
                          currentRoom && currentRoom.room_id === room.room_id
                            ? "selected"
                            : ""
                        }>
                        Room ${room.room_number} - ${room.description || ""}
                      </option>
                    `
                      )
                      .join("")}
                  </select>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" id="saveUserEdit">Save Changes</button>
            </div>
          </div>
        </div>
      </div>
    `;

    //add modal to document
    const modalContainer = document.createElement("div");
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);

    //show modal
    const modal = new bootstrap.Modal(document.getElementById("editUserModal"));
    modal.show();

    //show/hide room assignment based on role
    document.getElementById("editRole").addEventListener("change", function () {
      const isResident = this.value === "1";
      document
        .getElementById("roomAssignmentSection")
        .classList.toggle("d-none", !isResident);
    });

    //handle save button click
    document
      .getElementById("saveUserEdit")
      .addEventListener("click", async () => {
        const username = document.getElementById("editUsername").value;
        const email = document.getElementById("editEmail").value;
        const roleId = document.getElementById("editRole").value;
        const roomId = document.getElementById("assignedRoom").value;

        try {
          //update the user info
          const response = await fetch(`/users/${userId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, email, roleId }),
          });

          if (!response.ok) {
            throw new Error("Failed to update user");
          }

          // If the user is a resident, handle room assignment
          if (roleId === "1") {
            if (roomId) {
              //assign the room
              await smartHomeApi.userRooms.assignRoom(userId, roomId);
            } else {
              //remove assignment if "No Room" was selected
              await smartHomeApi.userRooms.removeAssignment(userId);
            }
          }

          //close modal and refresh user list
          modal.hide();
          fetchUsers();
        } catch (error) {
          console.error("Error updating user:", error);
          alert("Failed to update user: " + error.message);
        }
      });

    //remove modal from DOM when closed
    document
      .getElementById("editUserModal")
      .addEventListener("hidden.bs.modal", function () {
        document.body.removeChild(modalContainer);
      });
  } catch (error) {
    console.error("Error editing user:", error);
    alert("Error loading user details. Please try again.");
  }
}

// Enhanced add user function with room assignment
function addUser() {
  //fetch rooms first
  smartHomeApi.rooms
    .getAll()
    .then((rooms) => {
      const modalHTML = `
      <div class="modal fade" id="addUserModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Add New User</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="addUserForm">
                <div class="mb-3">
                  <label for="newUsername" class="form-label">Username</label>
                  <input type="text" class="form-control" id="newUsername" required>
                </div>
                <div class="mb-3">
                  <label for="newPassword" class="form-label">Password</label>
                  <input type="password" class="form-control" id="newPassword" required>
                </div>
                <div class="mb-3">
                  <label for="newEmail" class="form-label">Email</label>
                  <input type="email" class="form-control" id="newEmail">
                </div>
                <div class="mb-3">
                  <label for="newRole" class="form-label">Role</label>
                  <select class="form-select" id="newRole" required>
                    <option value="1">Resident</option>
                    <option value="4">Admin</option>
                  </select>
                </div>
                <div id="newRoomAssignmentSection" class="mb-3">
                  <label for="newAssignedRoom" class="form-label">Assigned Room</label>
                  <select class="form-select" id="newAssignedRoom">
                    <option value="">-- No Room Assigned --</option>
                    ${rooms
                      .map(
                        (room) => `
                      <option value="${room.room_id}">
                        Room ${room.room_number} - ${room.description || ""}
                      </option>
                    `
                      )
                      .join("")}
                  </select>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" id="saveNewUser">Add User</button>
            </div>
          </div>
        </div>
      </div>
    `;

      //add modal to document
      const modalContainer = document.createElement("div");
      modalContainer.innerHTML = modalHTML;
      document.body.appendChild(modalContainer);

      //show modal
      const modal = new bootstrap.Modal(
        document.getElementById("addUserModal")
      );
      modal.show();

      //show/hide room assignment based on role
      document
        .getElementById("newRole")
        .addEventListener("change", function () {
          const isResident = this.value === "1";
          document
            .getElementById("newRoomAssignmentSection")
            .classList.toggle("d-none", !isResident);
        });

      //handle save button click
      document
        .getElementById("saveNewUser")
        .addEventListener("click", async () => {
          const username = document.getElementById("newUsername").value;
          const password = document.getElementById("newPassword").value;
          const email = document.getElementById("newEmail").value;
          const roleId = document.getElementById("newRole").value;
          const roomId = document.getElementById("newAssignedRoom").value;

          try {
            //create user first
            const response = await fetch("/users", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: username,
                password: password,
                isAdmin: roleId === "4",
                email: email,
              }),
            });

            if (!response.ok) {
              throw new Error("Failed to create user");
            }

            const result = await response.json();
            const userId = result.userId;

            //if the user is a resident and a room was selected, assign it
            if (roleId === "1" && roomId) {
              await smartHomeApi.userRooms.assignRoom(userId, roomId);
            }

            //close modal and refresh user list
            modal.hide();
            fetchUsers();
          } catch (error) {
            console.error("Error creating user:", error);
            alert("Failed to create user: " + error.message);
          }
        });

      //remove modal from DOM when closed
      document
        .getElementById("addUserModal")
        .addEventListener("hidden.bs.modal", function () {
          document.body.removeChild(modalContainer);
        });
    })
    .catch((error) => {
      console.error("Error fetching rooms:", error);
      alert("Could not load available rooms. Please try again.");
    });
}

//delete user function
async function deleteUser(userId) {
  if (
    confirm(
      `Are you sure you want to delete this user? This action cannot be undone.`
    )
  ) {
    try {
      const response = await fetch(`/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete user");
      }

      //refresh user list
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user. Please try again.");
    }
  }
}

//add a room assignments view to the Rooms section
function showRoomAssignments() {
  const sectionRooms = document.getElementById("sectionRooms");

  //add loading indicator
  sectionRooms.innerHTML = `
    <h2 class="mb-4">Resident Room Access</h2>
    <div class="text-center my-3">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading room assignments...</span>
      </div>
    </div>
  `;

  //fetch room assignments
  smartHomeApi.userRooms
    .getRoomsWithUsers()
    .then((rooms) => {
      sectionRooms.innerHTML = `
      <h2 class="mb-4">Resident Room Access</h2>
      <div class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center">
          <span>Rooms Overview</span>
          <button class="btn btn-sm btn-primary" id="refreshRoomsBtn">
            <i class="fas fa-sync-alt"></i> Refresh
          </button>
        </div>
        <div class="card-body">
          <div class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>Room</th>
                  <th>Description</th>
                  <th>Residents</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${rooms
                  .map(
                    (room) => `
                  <tr>
                    <td>Room ${room.room_number}</td>
                    <td>${room.description || "N/A"}</td>
                    <td>${room.residents || "None"}</td>
                    <td>
                      <button class="btn btn-sm btn-primary view-room" data-room-id="${
                        room.room_id
                      }">
                        View Details
                      </button>
                    </td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

      //add event listener to view room buttons
      document.querySelectorAll(".view-room").forEach((button) => {
        button.addEventListener("click", () =>
          viewRoomDetails(button.dataset.roomId)
        );
      });

      //add event listener to refresh button
      document
        .getElementById("refreshRoomsBtn")
        .addEventListener("click", () => {
          showRoomAssignments();
        });
    })
    .catch((error) => {
      console.error("Error fetching room assignments:", error);
      sectionRooms.innerHTML = `
      <h2 class="mb-4">Resident Room Access</h2>
      <div class="alert alert-danger">
        Error loading room assignments. Please try again.
      </div>
    `;
    });
}

//global variables for user management
let allUsers = [];
let currentPage = 1;
const usersPerPage = 10;
let filteredUsers = [];

//fetch users for the user management section
async function fetchUsers() {
  const userSection = document.getElementById("sectionUsers");
  if (!userSection) {
    throw new Error("User section not found");
  }

  //ensure table container exists
  let tableContainer = userSection.querySelector(".table-responsive");
  if (!tableContainer) {
    tableContainer = document.createElement("div");
    tableContainer.className = "table-responsive";
    userSection.querySelector(".card-body").appendChild(tableContainer);
  }

  try {
    //show loading state
    tableContainer.innerHTML = `
      <div class="text-center my-3">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading users...</span>
        </div>
      </div>
    `;

    // get the base user list with retry logic
    let retryCount = 0;
    const maxRetries = 3;
    let allUsersData;

    while (retryCount < maxRetries) {
      try {
        allUsersData = await smartHomeApi.users.getAll();
        break;
      } catch (error) {
        retryCount++;
        if (retryCount === maxRetries) {
          throw new Error(
            `Failed to fetch users after ${maxRetries} attempts: ${error.message}`
          );
        }
        //wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
      }
    }

    allUsers = allUsersData;

    //fetch room assignments
    const roomPromises = allUsers.map(async (user) => {
      if (user.role_name === "resident") {
        try {
          const room = await smartHomeApi.userRooms.getUserRoom(user.user_id);
          return {
            userId: user.user_id,
            room: room ? `Room ${room.room_number}` : "None",
          };
        } catch (error) {
          console.error(`Error fetching room for user ${user.user_id}:`, error);
          return {
            userId: user.user_id,
            room: "Error",
          };
        }
      }
      return {
        userId: user.user_id,
        room: "N/A",
      };
    });

    const roomResults = await Promise.all(roomPromises);

    //update user room assignments
    roomResults.forEach((result) => {
      const user = allUsers.find((u) => u.user_id === result.userId);
      if (user) {
        user.assignedRoom = result.room;
      }
    });

    //apply filters and display users
    applyFilters();
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error; // Re-throw to be handled by the refresh button click handler
  }
}

// filter the user list based on search inputs
function applyFilters() {
  const usernameFilter = document
    .getElementById("filterUsername")
    .value.toLowerCase();
  const roleFilter = document.getElementById("filterRole").value.toLowerCase();
  const roomFilter = document.getElementById("filterRoom").value.toLowerCase();

  // match against all active filters
  filteredUsers = allUsers.filter((user) => {
    const matchUsername = user.username.toLowerCase().includes(usernameFilter);
    const matchRole =
      !roleFilter || user.role_name.toLowerCase() === roleFilter;
    const matchRoom =
      !roomFilter ||
      (user.assignedRoom &&
        user.assignedRoom.toLowerCase().includes(roomFilter));

    return matchUsername && matchRole && matchRoom;
  });

  // reset to first page when filters change
  currentPage = 1;
  displayUsers();
}

// render the filtered/paginated user list
function displayUsers() {
  const tableContainer = document.querySelector(".table-responsive");
  if (!tableContainer) return;

  // figure out which chunk of users to show
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = Math.min(startIndex + usersPerPage, filteredUsers.length);
  const usersToShow = filteredUsers.slice(startIndex, endIndex);

  // update the page counter
  const currentPageElement = document.getElementById("currentPage");
  const totalPagesElement = document.getElementById("totalPages");
  const prevPageBtn = document.getElementById("prevPage");
  const nextPageBtn = document.getElementById("nextPage");

  if (currentPageElement) currentPageElement.textContent = currentPage;
  if (totalPagesElement) totalPagesElement.textContent = totalPages;
  if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
  if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;

  // build the table HTML
  const table = `
    <table class="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Username</th>
          <th>Role</th>
          <th>Email</th>
          <th>Room</th>
          <th>Created</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${usersToShow
          .map(
            (user) => `
          <tr>
            <td>${user.user_id}</td>
            <td>${user.username}</td>
            <td><span class="badge" style="background-color: var(--positive-feedback)">${
              user.role_name
            }</span></td>
            <td>${user.email || "N/A"}</td>
            <td>${user.assignedRoom}</td>
            <td>${new Date(user.created_at).toLocaleString()}</td>
            <td>
              <div class="btn-group">
                <button class="btn btn-sm btn-outline-success edit-user" data-user-id="${
                  user.user_id
                }" title="Edit User" 
                        style="color: var(--positive-feedback); border-color: var(--positive-feedback)">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-success reset-password" data-user-id="${
                  user.user_id
                }" 
                        data-username="${user.username}" title="Reset Password"
                        style="color: var(--positive-feedback); border-color: var(--positive-feedback)">
                  <i class="fas fa-key"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger delete-user" data-user-id="${
                  user.user_id
                }" 
                        title="Delete User" style="color: var(--accent-color); border-color: var(--accent-color)">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;

  tableContainer.innerHTML = table;

  // wire up the action buttons
  tableContainer.querySelectorAll(".edit-user").forEach((button) => {
    button.addEventListener("click", () => editUser(button.dataset.userId));
  });

  tableContainer.querySelectorAll(".reset-password").forEach((button) => {
    button.addEventListener("click", () =>
      showPasswordReset(button.dataset.userId, button.dataset.username)
    );
  });

  tableContainer.querySelectorAll(".delete-user").forEach((button) => {
    button.addEventListener("click", () => deleteUser(button.dataset.userId));
  });
}

/*******************************************
 * TIME PERIOD & FILTERS
 *******************************************/

const dayTab = document.getElementById("day-tab");
const monthTab = document.getElementById("month-tab");
const yearTab = document.getElementById("year-tab");

const additionalFilters = document.getElementById("additionalFilters");
const filterDay = document.getElementById("filterDay");
const filterMonth = document.getElementById("filterMonth");
const filterYear = document.getElementById("filterYear");

const dayInput = document.getElementById("dayInput");
const monthSelect = document.getElementById("monthSelect");
const yearSelect = document.getElementById("yearSelect");

if (dayTab) {
  dayTab.addEventListener("click", () => setActivePeriod("day"));
}
if (monthTab) {
  monthTab.addEventListener("click", () => setActivePeriod("month"));
}
if (yearTab) {
  yearTab.addEventListener("click", () => setActivePeriod("year"));
}

if (dayInput) {
  dayInput.addEventListener("change", function () {
    setChartData("day");
  });
}
if (monthSelect) {
  monthSelect.addEventListener("change", function () {
    setChartData("month");
  });
}
if (yearSelect) {
  yearSelect.addEventListener("change", function () {
    setChartData("year");
  });
}

function setActivePeriod(period) {
  dayTab.classList.remove("active");
  monthTab.classList.remove("active");
  yearTab.classList.remove("active");

  if (period === "day") {
    dayTab.classList.add("active");
  } else if (period === "month") {
    monthTab.classList.add("active");
  } else {
    yearTab.classList.add("active");
  }

  currentPeriod = period; //update current period
  localStorage.setItem("selectedPeriod", period); //save the selected period

  toggleFilter(period);
  setChartData(period);
  updateEnergySummary();
}

function toggleFilter(mode) {
  additionalFilters.style.display = "flex";
  filterDay.style.display = "none";
  filterMonth.style.display = "none";
  filterYear.style.display = "none";

  if (mode === "day") {
    filterDay.style.display = "flex";
  } else if (mode === "month") {
    filterMonth.style.display = "flex";
  } else if (mode === "year") {
    filterYear.style.display = "flex";
  }
}

/*******************************************
 * EXPORT FUNCTIONS
 *******************************************/

//export chart as image
function exportChart() {
  if (!energyChart) return;

  const canvas = document.getElementById("energyChart");
  const image = canvas.toDataURL("image/png");

  const downloadLink = document.createElement("a");
  downloadLink.href = image;
  downloadLink.download = `energy-chart-${currentPeriod}-${new Date()
    .toISOString()
    .slice(0, 10)}.png`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

//export data as CSV
function exportCSV() {
  if (!energyChart) return;

  const datasets = energyChart.data.datasets;
  const labels = energyChart.data.labels;

  let csvContent = "data:text/csv;charset=utf-8,";

  //add header row
  let headerRow = ["Period"];
  datasets.forEach((dataset) => {
    headerRow.push(dataset.label);
  });
  csvContent += headerRow.join(",") + "\r\n";

  //add data rows
  labels.forEach((label, index) => {
    let row = [label];
    datasets.forEach((dataset) => {
      row.push(dataset.data[index]);
    });
    csvContent += row.join(",") + "\r\n";
  });

  //create download link
  const encodedUri = encodeURI(csvContent);
  const downloadLink = document.createElement("a");
  downloadLink.href = encodedUri;
  downloadLink.download = `energy-data-${currentPeriod}-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

/*******************************************
 * ENERGY SUMMARY
 *******************************************/

//define colors for different device types
const deviceTypeColors = {
  light: "rgba(255, 206, 86, 1)", // Yellow
  blind: "rgba(75, 192, 192, 1)", // Teal
  thermostat: "rgba(255, 99, 132, 1)", // Red
  other: "rgba(153, 102, 255, 1)", // Purple
  default: "rgba(54, 162, 235, 1)", // Blue
};

//global chart instance for device type chart
let deviceTypeChart = null;

//update the energy summary section
async function updateEnergySummary() {
  const energySummary = document.getElementById("energySummary");
  if (!energySummary) return;

  //add loading indicator
  energySummary.innerHTML = `
    <div class="text-center my-3">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
  `;

  try {
    //get selected rooms
    const selectedRooms = getSelectedRoomsFromDropdown();
    let roomIds = selectedRooms.length ? selectedRooms : rooms_global;

    if (roomIds.includes("All")) {
      roomIds = rooms_global;
    }

    if (roomIds.length === 0) {
      energySummary.innerHTML =
        '<div class="alert alert-info">No rooms selected or available.</div>';
      return;
    }

    //prepare container for summary data
    energySummary.innerHTML = `
      <h4>Energy Summary</h4>
      <div class="card mb-3">
        <div class="card-body">
          <h5>Total Usage Today</h5>
          <p class="display-4" id="totalEnergyToday">Loading...</p>
          <p>Compared to yesterday: <span id="comparisonYesterday">Loading...</span></p>
        </div>
      </div>
      
      <div class="card">
        <div class="card-body">
          <h5>Energy by Device Type</h5>
          <div style="height: 300px; position: relative;">
            <canvas id="deviceTypeChart"></canvas>
          </div>
        </div>
      </div>
    `;

    //fetch data for each room
    let totalEnergy = 0;
    let deviceTypeData = {};

    for (const roomId of roomIds) {
      try {
        //get summary for this room
        const summary = await smartHomeApi.energy.getSummary(roomId, "day");
        if (summary && summary.total_energy) {
          totalEnergy += parseFloat(summary.total_energy);
        }

        //get energy by device type
        const deviceTypes = await smartHomeApi.energy.getByDeviceType(
          roomId,
          "day"
        );
        deviceTypes.forEach((item) => {
          const type = item.device_type;
          if (!deviceTypeData[type]) {
            deviceTypeData[type] = 0;
          }
          deviceTypeData[type] += parseFloat(item.total_energy || 0);
        });
      } catch (error) {
        console.error(`Error fetching energy data for room ${roomId}:`, error);
      }
    }

    //get comparison data (combine all rooms)
    let percentageChange = 0;
    try {
      if (roomIds.length === 1) {
        //for single room, compare to yesterday
        const comparison = await smartHomeApi.energy.getComparison(
          roomIds[0],
          "day"
        );
        if (comparison) {
          percentageChange = comparison.percentageChange;
        }
      } else {
        const today = totalEnergy;
        const yesterday = today * (1 - (Math.random() * 0.3 - 0.15)); // Mock data: +/- 15%
        percentageChange = ((today - yesterday) / yesterday) * 100;
      }
    } catch (error) {
      console.error("Error getting energy comparison:", error);
    }

    //update the UI with the data
    const totalEnergyElement = document.getElementById("totalEnergyToday");
    if (totalEnergyElement) {
      totalEnergyElement.textContent = `${totalEnergy.toFixed(2)} kWh`;
    }

    const comparisonElement = document.getElementById("comparisonYesterday");
    if (comparisonElement) {
      comparisonElement.textContent = `${Math.abs(percentageChange).toFixed(
        1
      )}% ${percentageChange >= 0 ? "higher" : "lower"}`;
      comparisonElement.style.color = percentageChange >= 0 ? "red" : "green";
    }

    //create device type chart
    const deviceTypes = Object.keys(deviceTypeData);
    const deviceUsage = Object.values(deviceTypeData);

    if (deviceTypes.length > 0) {
      const deviceCtx = document.getElementById("deviceTypeChart");
      if (!deviceCtx) {
        console.error("Could not find deviceTypeChart canvas element");
        return;
      }

      //destroy existing chart if it exists
      if (deviceTypeChart) {
        deviceTypeChart.destroy();
      }

      try {
        //create new chart with improved configuration
        deviceTypeChart = new Chart(deviceCtx, {
          type: "doughnut",
          data: {
            labels: deviceTypes.map(
              (type) => type.charAt(0).toUpperCase() + type.slice(1)
            ),
            datasets: [
              {
                data: deviceUsage,
                backgroundColor: deviceTypes.map(
                  (type) => deviceTypeColors[type] || deviceTypeColors.default
                ),
                borderColor: deviceTypes.map(
                  (type) => deviceTypeColors[type] || deviceTypeColors.default
                ),
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
              legend: {
                position: "right",
                labels: {
                  padding: 20,
                  font: {
                    size: 12,
                  },
                },
              },
              tooltip: {
                callbacks: {
                  label: function (context) {
                    const value = context.raw;
                    const total = context.dataset.data.reduce(
                      (a, b) => a + b,
                      0
                    );
                    const percentage = ((value / total) * 100).toFixed(1);
                    return `${context.label}: ${value.toFixed(
                      2
                    )} kWh (${percentage}%)`;
                  },
                },
              },
            },
            cutout: "60%",
          },
        });
      } catch (error) {
        console.error("Error creating chart:", error);
        document.getElementById("deviceTypeChart").innerHTML =
          '<div class="alert alert-danger">Error creating chart. Please try again.</div>';
      }
    } else {
      const chartContainer = document.getElementById("deviceTypeChart");
      if (chartContainer) {
        chartContainer.innerHTML =
          '<div class="alert alert-info">No device type data available.</div>';
      }
    }
  } catch (error) {
    console.error("Error updating energy summary:", error);
    energySummary.innerHTML =
      '<div class="alert alert-danger">Error loading energy summary. Please try again.</div>';
  }
}

/*******************************************
 * ALERTS
 *******************************************/

//view alerts
async function viewAlerts() {
  try {
    //show loading state
    const alertsList = document.getElementById("alertsList");
    alertsList.innerHTML =
      '<div class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading alerts...</span></div></div>';

    //show the modal
    const alertsModal = new bootstrap.Modal(
      document.getElementById("alertsModal")
    );
    alertsModal.show();

    //fetch alerts
    const alerts = await smartHomeApi.alerts.getAll();

    if (!alerts || alerts.length === 0) {
      alertsList.innerHTML =
        '<div class="alert alert-info">No pending alerts</div>';
      return;
    }

    //generate HTML for each alert
    alertsList.innerHTML = alerts
      .map(
        (alert) => `
      <div class="alert ${getAlertClass(alert.alert_type)} mb-3">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h5 class="alert-heading">${getAlertTitle(alert)}</h5>
            <p class="mb-1">Room: ${alert.room_number}</p>
            <p class="mb-0"><small>${getTimeAgo(alert.created_at)}</small></p>
          </div>
          <button class="btn btn-sm btn-outline-success resolve-btn" data-alert-id="${
            alert.alert_id
          }">
            Resolve
          </button>
        </div>
      </div>
    `
      )
      .join("");

    //add event listeners to resolve buttons
    alertsList.querySelectorAll(".resolve-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        const alertId = button.dataset.alertId;
        try {
          await smartHomeApi.alerts.resolve(alertId);
          //remove the alert from the view
          button.closest(".alert").remove();

          //if no alerts left, show message
          if (alertsList.querySelectorAll(".alert").length === 0) {
            alertsList.innerHTML =
              '<div class="alert alert-info">No pending alerts</div>';
          }
        } catch (error) {
          console.error("Error resolving alert:", error);
          alert("Failed to resolve alert. Please try again.");
        }
      });
    });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    const alertsList = document.getElementById("alertsList");
    alertsList.innerHTML =
      '<div class="alert alert-danger">Failed to load alerts. Please try again.</div>';
  }
}

// Helper functions for alert display
function getAlertClass(alertType) {
  switch (alertType) {
    case "fall":
      return "danger";
    case "temperature":
      return "info";
    case "device":
      return "warning";
    default:
      return "secondary";
  }
}

function getAlertTitle(alert) {
  switch (alert.alert_type) {
    case "fall":
      return `Fall detected in Room ${alert.room_number}`;
    case "temperature":
      return `Temperature alert in Room ${alert.room_number}`;
    case "device":
      return `Device alert in Room ${alert.room_number}`;
    default:
      return `Alert in Room ${alert.room_number}`;
  }
}

function getTimeAgo(timestamp) {
  const now = new Date();
  const alertTime = new Date(timestamp);
  const diffInMinutes = Math.floor((now - alertTime) / (1000 * 60));

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hours ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} days ago`;
}

/*******************************************
 * LOGOUT FUNCTIONALITY
 *******************************************/

async function handleLogout() {
  try {
    //show confirmation modal
    const confirmModal = new bootstrap.Modal(
      document.getElementById("logoutConfirmModal")
    );
    confirmModal.show();

    //wait for user confirmation
    document
      .getElementById("confirmLogout")
      .addEventListener("click", async function () {
        try {
          //hide confirmation modal
          confirmModal.hide();

          //show loading modal
          const loadingModal = new bootstrap.Modal(
            document.getElementById("loadingModal")
          );
          loadingModal.show();

          //clear all local storage items
          localStorage.clear();

          //clear any session storage items
          sessionStorage.clear();

          //clear any cookies
          document.cookie.split(";").forEach(function (c) {
            document.cookie = c
              .replace(/^ +/, "")
              .replace(
                /=.*/,
                "=;expires=" + new Date().toUTCString() + ";path=/"
              );
          });

          //redirect to login page
          window.location.href = "/login";
        } catch (error) {
          console.error("Error during logout:", error);
          alert("Error logging out. Please try again.");
          loadingModal.hide();
        }
      });
  } catch (error) {
    console.error("Error showing confirmation modal:", error);
    alert("Error during logout process. Please try again.");
  }
}

function validatePassword(password) {
  const errors = [];
  if (!password || password.length === 0) {
    errors.push("Password cannot be empty");
  }
  return errors;
}

// modal for password reset
function showPasswordReset(userId, username) {
  const modal = new bootstrap.Modal(
    document.getElementById("passwordResetModal")
  );
  document.getElementById("resetUserId").value = userId;
  document.getElementById("passwordResetForm").reset();
  document.getElementById("passwordError").classList.add("d-none");
  document.querySelector(
    "#passwordResetModal .modal-title"
  ).textContent = `Reset Password for ${username}`;
  modal.show();
}

//
async function handlePasswordReset() {
  const userId = document.getElementById("resetUserId").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const errorDiv = document.getElementById("passwordError");
  const saveButton = document.getElementById("saveNewPassword");

  //
  errorDiv.classList.add("d-none");
  errorDiv.textContent = "";

  //
  if (newPassword !== confirmPassword) {
    errorDiv.textContent = "Passwords do not match";
    errorDiv.classList.remove("d-none");
    return;
  }

  const passwordErrors = validatePassword(newPassword);
  if (passwordErrors.length > 0) {
    errorDiv.innerHTML = passwordErrors.join("<br>");
    errorDiv.classList.remove("d-none");
    return;
  }

  try {
    //show loading state
    const originalText = saveButton.textContent;
    saveButton.disabled = true;
    saveButton.innerHTML =
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Resetting...';

    //call api to reset password
    const response = await fetch(`/users/${userId}/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: newPassword }),
    });

    if (!response.ok) {
      throw new Error(`Failed to reset password: ${response.statusText}`);
    }

    // successful reset
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("passwordResetModal")
    );
    modal.hide();

    alert("Password has been reset successfully");
  } catch (error) {
    console.error("Error resetting password:", error);
    errorDiv.textContent = `Failed to reset password: ${error.message}`;
    errorDiv.classList.remove("d-none");
  } finally {
    //reset button state
    saveButton.disabled = false;
    saveButton.textContent = "Reset Password";
  }
}
