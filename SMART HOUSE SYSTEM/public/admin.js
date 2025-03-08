/*******************************************
 * admin.js
 *******************************************/

document.addEventListener("DOMContentLoaded", function () {
  const sectionAnalytics = document.getElementById("sectionAnalytics");

  // Show Analytics by default
  sectionAnalytics.classList.remove("d-none");

  // Menu buttons
  const btnAnalytics = document.getElementById("btnAnalytics");
  const btnRooms = document.getElementById("btnRooms");
  const btnUsers = document.getElementById("btnUsers");

  // Add click events to switch sections
  btnAnalytics.addEventListener("click", () => showSection("analytics"));
  btnRooms.addEventListener("click", () => showSection("rooms"));
  btnUsers.addEventListener("click", () => showSection("users"));

  // Initialize Chart.js chart
  initEnergyChart();
  populateRooms();
  setActivePeriod("day");

  //add event listeners to room buttons for updating the chart when selected
  const roomButtons = document.querySelectorAll("#roomsSelect .roomLabel");
  if (roomButtons) {
    roomButtons.forEach((button) =>
      button.addEventListener("click", function () {
        if (button.classList.contains("selected")) {
          button.classList.remove("selected");
        } else {
          if (button.value !== "All") {
            roomButtons.forEach((btn) => {
              if (btn.value === "All") {
                btn.classList.remove("selected");
              }
            });
          } else {
            if (button.value === "All") {
              roomButtons.forEach((btn) => {
                btn.classList.remove("selected");
              });
            }
          }
          button.classList.add("selected");
        }
        setChartData(currentPeriod);
      })
    );
  }
});

/*******************************************
 * SECTION TOGGLING
 *******************************************/

function showSection(section) {
  const sectionAnalytics = document.getElementById("sectionAnalytics");
  const sectionRooms = document.getElementById("sectionRooms");
  const sectionUsers = document.getElementById("sectionUsers");

  // Hide all sections
  sectionAnalytics.classList.add("d-none");
  sectionRooms.classList.add("d-none");
  sectionUsers.classList.add("d-none");

  // Show the requested section
  if (section === "analytics") {
    sectionAnalytics.classList.remove("d-none");
  } else if (section === "rooms") {
    sectionRooms.classList.remove("d-none");
  } else if (section === "users") {
    sectionUsers.classList.remove("d-none");
  }

  // Close the offcanvas sidebar
  const offcanvasElement = document.getElementById("sidebarMenu");
  const offcanvasInstance = bootstrap.Offcanvas.getInstance(offcanvasElement);
  if (offcanvasInstance) {
    offcanvasInstance.hide();
  }
}

/*******************************************
 * CHART AND STATISTICS
 *******************************************/

let energyChart;
let currentPeriod = "day"; // Track the current time period

// Define colors for different room datasets (randomly assigned)
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

//Used to select rooms for filtering chart data
function getSelectedRoomsFromDropdown() {
  const roomsSelect = document.getElementById("roomsSelect");
  if (!roomsSelect) return [];

  const selectedButtons = roomsSelect.querySelectorAll(".roomLabel.selected");
  const selectedRooms = Array.from(selectedButtons).map(
    (button) => button.value
  );

  // If "All" is selected, return all rooms
  if (selectedRooms.includes("All")) {
    return rooms_global;
  }
  return selectedRooms.length ? selectedRooms : rooms_global;
}

// Outsource labels to this function so its easier to define chart labels
function generateLabels(period) {
  if (period === "day") {
    return Array.from({ length: 24 }, (_, i) => `${i}:00`);
  } else if (period === "month") {
    return Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`);
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

//function that will be used to pull data from database for energy expenditure (currently generates random data)
// TODO: when backend is integrated, adjust so filterValue is implemented
function getEnergyData(period, filterValue, rooms) {
  const labels = generateLabels(period);
  const data = rooms.map((room) => ({
    room: room,
    data: generateRoomData(room, period), // Mock data for now
  }));
  return { labels, data };
}

//Returns random data for each room (TODO: Update for backend integration i.e not random)
function generateRoomData(room, period) {
  const length = period === "day" ? 24 : period === "month" ? 30 : 12;
  const maxUsage = period === "day" ? 10 : period === "month" ? 300 : 2000;
  return Array.from({ length }, () => Math.floor(Math.random() * maxUsage + 1));
}

//sets the chart data with the correct corresponding type of chart
function setChartData(period) {
  const selectedRooms = getSelectedRoomsFromDropdown();
  //Get filter values based on the current period
  let filterValue;
  if (period === "day") {
    filterValue = document.getElementById("dayInput").value;
  } else if (period === "month") {
    filterValue = document.getElementById("monthSelect").value;
  } else if (period === "year") {
    filterValue = parseInt(document.getElementById("yearSelect").value);
  }

  const { labels, data } = getEnergyData(period, filterValue, selectedRooms);
  const newType = period === "day" ? "line" : "bar";
  const ctx = document.getElementById("energyChart");

  if (!energyChart || energyChart.config.type !== newType) {
    if (energyChart) {
      energyChart.destroy();
    }
    energyChart = new Chart(ctx, {
      type: newType,
      data: { labels: labels, datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true } },
      },
    });
  } else {
    energyChart.data.labels = labels;
    energyChart.data.datasets = [];
  }

  // Create datasets from fetched data
  const roomDatasets = data.map((roomData, index) => ({
    label: `Room ${roomData.room}`,
    data: roomData.data,
    borderColor: colors[index % colors.length],
    backgroundColor: colors[index % colors.length].replace("1)", "0.2)"),
    fill: newType === "line",
  }));

  // Calculate total data
  const totalData = labels.map((_, i) =>
    roomDatasets.reduce((sum, dataset) => sum + dataset.data[i], 0)
  );
  const totalDataset = {
    label: "Total",
    data: totalData,
    type: "line",
    borderColor: "rgba(0,0,0,1)",
    backgroundColor: "rgba(0,0,0,0.2)",
    fill: false,
  };

  energyChart.data.datasets = [...roomDatasets, totalDataset];
  energyChart.update();
}

/*******************************************
 * TIME PERIOD & FILTERS
 *******************************************/

//function to populate room filter option with rooms available
let rooms_global = [];
function populateRooms() {
  const roomsSelect = document.getElementById("roomsSelect");
  const rooms = ["101", "102", "103", "104", "105"]; // Mock rooms
  rooms_global = rooms;
  roomsSelect.innerHTML =
    '<button value="All" class="roomLabel selected">All Rooms</button>';
  rooms.forEach((room) => {
    const option = document.createElement("button");
    option.value = room;
    option.textContent = `Room ${room}`;
    option.className = "roomLabel";
    roomsSelect.appendChild(option);
  });
}

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

  currentPeriod = period; // Update current period
  toggleFilter(period);
  setChartData(period);
}

function toggleFilter(mode) {
  additionalFilters.style.display = "block";
  filterDay.style.display = "none";
  filterMonth.style.display = "none";
  filterYear.style.display = "none";

  if (mode === "day") {
    filterDay.style.display = "block";
  } else if (mode === "month") {
    filterMonth.style.display = "block";
  } else if (mode === "year") {
    filterYear.style.display = "block";
  }
}

/*******************************************
 * USER MANAGEMENT TODO
 *******************************************/
