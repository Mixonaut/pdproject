//Test Data for the graph
const testDataDay = {
  labels: [
    "12am",
    "1am",
    "2am",
    "3am",
    "4am",
    "5am",
    "6am",
    "7am",
    "8am",
    "9am",
    "10am",
    "11am",
    "12am",
    "1pm",
    "2pm",
    "3pm",
    "4pm",
    "5pm",
    "6pm",
    "7pm",
    "8pm",
    "9pm",
    "10pm",
    "11pm",
  ],
  totalUsage: [
    5, 7, 6, 5, 7, 9, 11, 10, 9, 13, 12, 14, 15, 11, 9, 8, 5, 4, 3, 5, 3, 1, 4,
    3,
  ],
  room101: [
    1, 1, 1, 0.8, 1, 1.5, 2, 1, 1, 2, 2, 1, 1.5, 1, 2, 3, 2.2, 1, 3, 2, 2.1,
    1.2, 0.8, 0.2,
  ],
  room102: [
    1, 1, 1.2, 1, 1.1, 2, 2.3, 1, 1, 2, 2, 1, 1.5, 1, 2, 3, 2.2, 1, 1, 1.3, 1.1,
    1.4, 0.3, 0.1,
  ],
  room103: [
    0.9, 1.2, 1.1, 1.6, 2.0, 2.3, 2, 1, 1, 1.5, 1, 1.7, 1.2, 1.3, 1, 2.2, 2.2,
    0.7, 2, 2, 2.1, 1.4, 0.2, 0.7,
  ],
};

const testDataMonth = {
  labels: [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
    "13",
    "14",
    "15",
    "16",
    "17",
    "18",
    "19",
    "20",
    "21",
    "22",
    "23",
    "24",
    "25",
    "26",
    "27",
    "28",
    "29",
    "30",
  ],
  totalUsage: [
    50, 55, 60, 53, 62, 58, 54, 56, 57, 60, 50, 62, 50, 54, 53, 52, 56, 57, 54,
    51, 54, 57, 64, 57, 54, 53, 56, 47, 56, 51,
  ],
  room101: [
    12, 14, 13, 15, 16, 14, 13, 11, 12, 13, 14, 12, 13, 15, 12, 11, 9, 10, 12,
    13, 11, 12, 14, 11, 12, 13, 15, 16, 13, 11,
  ],
  room102: [
    11, 9, 14, 13, 12, 10, 12, 11, 12, 14, 11, 13, 16, 17, 11, 10, 7, 12, 11,
    13, 11, 11, 11, 14, 10, 11, 10, 14, 11, 13,
  ],
  room103: [
    9, 10, 12, 11, 13, 15, 14, 11, 12, 13, 14, 12, 13, 15, 12, 11, 9, 10, 12,
    13, 11, 12, 14, 11, 12, 13, 15, 16, 13, 11,
  ],
};

const testDataYear = {
  labels: [
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
  ],
  totalUsage: [200, 215, 220, 210, 230, 240, 250, 245, 255, 260, 200, 210],
  room101: [48, 52, 55, 50, 58, 60, 61, 61, 64, 66, 50, 52],
  room102: [40, 42, 47, 44, 55, 56, 59, 58, 62, 55, 44, 46],
  room103: [38, 40, 45, 41, 49, 50, 54, 50, 56, 53, 40, 42],
};

let energyChart;
let currentPeriod = "day";

//Retuns the test data for the time period specified
function getChartData(period) {
  switch (period) {
    case "day":
      return testDataDay;
    case "month":
      return testDataMonth;
    case "year":
      return testDataYear;
    default:
      return testDataDay;
  }
}

//Uses Chart.js to create a chart of the test data
function createChart(labels, datasets, chartType = "line") {
  const ctx = document.getElementById("energyChart").getContext("2d");
  if (energyChart) {
    energyChart.destroy();
  }

  energyChart = new Chart(ctx, {
    type: chartType,
    data: {
      labels: labels,
      datasets: datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

// Creates a dataset for each room (test data)
function getDatasets(dataObj, selectedRooms) {
  let selectedDatasets = [];
  // Dataset for all rooms selected
  if (selectedRooms.includes("All")) {
    selectedDatasets.push({
      label: "Total Energy (kWh)",
      data: dataObj.totalUsage,
      borderColor: "rgba(75, 192, 192, 1)",
      backgroundColor: "rgba(75, 192, 192, 0.2)",
      borderWidth: 2,
      fill: true,
    });
  }
  // Test rooms
  if (selectedRooms.includes("101")) {
    selectedDatasets.push({
      label: "Room 101 (kWh)",
      data: dataObj.room101,
      borderColor: "rgba(255, 99, 132, 1)",
      backgroundColor: "rgba(255, 99, 132, 0.2)",
      borderWidth: 2,
      fill: true,
    });
  }
  if (selectedRooms.includes("102")) {
    selectedDatasets.push({
      label: "Room 102 (kWh)",
      data: dataObj.room102,
      borderColor: "rgba(54, 162, 235, 1)",
      backgroundColor: "rgba(54, 162, 235, 0.2)",
      borderWidth: 2,
      fill: true,
    });
  }
  if (selectedRooms.includes("103")) {
    selectedDatasets.push({
      label: "Room 103 (kWh)",
      data: dataObj.room103,
      borderColor: "rgba(153, 102, 255, 1)",
      backgroundColor: "rgba(153, 102, 255, 0.2)",
      borderWidth: 2,
      fill: true,
    });
  }

  return selectedDatasets; //Return list of datasets
}

//Show/hide filters based on period.
function displayFilters(period) {
  const filterDay = document.getElementById("filterDay");
  const filterMonth = document.getElementById("filterMonth");
  const filterYear = document.getElementById("filterYear");
  const additionalFilters = document.getElementById("additionalFilters");

  filterDay.style.display = "none";
  filterMonth.style.display = "none";
  filterYear.style.display = "none";
  additionalFilters.style.display = "block";

  if (period === "day") {
    filterDay.style.display = "block";
  } else if (period === "month") {
    filterMonth.style.display = "block";
  } else if (period === "year") {
    filterYear.style.display = "block";
  }
}

function updateChart() {
  //Month and year chart uses bar chart
  let chartType = "line";
  if (currentPeriod === "month" || currentPeriod === "year") {
    chartType = "bar";
  }

  // get chart data of current period
  const dataObj = getChartData(currentPeriod);
  //gets all selected rooms
  const roomsSelect = document.getElementById("roomsSelect");
  const selectedOptions = Array.from(roomsSelect.selectedOptions).map(
    (o) => o.value
  );
  const rooms = selectedOptions.length > 0 ? selectedOptions : ["All"];

  // get all datasets
  const datasets = getDatasets(dataObj, rooms);

  createChart(dataObj.labels, datasets, chartType); //create chart of current period selected
}

document.addEventListener("DOMContentLoaded", function () {
  currentPeriod = "day"; //Current default
  displayFilters(currentPeriod);

  // default chart with line for day
  createChart(testDataDay.labels, getDatasets(testDataDay, ["All"]), "line");

  // setup nav for time period
  const timePeriodNav = document.getElementById("timePeriodNav");
  const navButtons = timePeriodNav.querySelectorAll(".nav-link");

  navButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      // remove active from all
      navButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active"); //make clicked button active

      // get period
      currentPeriod = btn.getAttribute("data-value");

      // show/hide filters
      displayFilters(currentPeriod);
      updateChart();
    });
  });

  // multi-select logic
  const roomsSelect = document.getElementById("roomsSelect");
  roomsSelect.addEventListener("mousedown", function (e) {
    e.preventDefault();
    const option = e.target;
    if (option.tagName.toLowerCase() === "option") {
      // toggle selection
      option.selected = !option.selected;

      // if All is selected unselect others
      if (option.value === "All" && option.selected) {
        Array.from(roomsSelect.options).forEach((opt) => {
          if (opt.value !== "All") {
            opt.selected = false;
          }
        });
      } else if (option.value !== "All" && option.selected) {
        const allOpt = Array.from(roomsSelect.options).find(
          (opt) => opt.value === "All"
        );
        if (allOpt && allOpt.selected) {
          allOpt.selected = false;
        }
      }

      updateChart();
    }
  });

  // Filters
  const dayInput = document.getElementById("dayInput");
  const monthSelect = document.getElementById("monthSelect");
  const yearSelect = document.getElementById("yearSelect");

  // Add event listeners for changing charts
  dayInput.addEventListener("change", () => {
    updateChart();
  });

  monthSelect.addEventListener("change", () => {
    updateChart();
  });

  yearSelect.addEventListener("change", () => {
    updateChart();
  });
});
