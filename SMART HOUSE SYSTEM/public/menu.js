document.addEventListener("DOMContentLoaded", async () => {
  // Get current user's room
  let currentRoom = null;
  let currentUser = null;

  const resetModal = () => {
    document.querySelector(".main-menu").style.display = "block";
    document
      .querySelectorAll(".sub-menu")
      .forEach((menu) => (menu.style.display = "none"));
  };

  // Function to show error message in room control modal
  const showRoomControlError = (message) => {
    const errorAlert = document.getElementById("deviceLoadError");
    if (errorAlert) {
      errorAlert.textContent = message;
      errorAlert.style.display = "block";
    }
  };

  // Initialize user and room
  try {
    currentUser = await smartHomeApi.users.getCurrentUser();
    if (currentUser && currentUser.role_name === "resident") {
      currentRoom = await smartHomeApi.userRooms.getUserRoom(
        currentUser.user_id
      );
      if (!currentRoom) {
        showRoomControlError(
          "No room assigned to your account. Please contact staff."
        );
      }
    } else {
      showRoomControlError(
        "You must be logged in as a resident to control devices."
      );
    }
  } catch (error) {
    console.error("Error initializing user and room:", error);
    showRoomControlError(
      "Error loading your account information. Please try logging in again."
    );
  }

  // Function to load devices for a specific type
  const loadDevices = async (deviceType) => {
    if (!currentUser || !currentRoom) {
      showRoomControlError("Please log in as a resident to control devices.");
      return;
    }

    const spinner = document.getElementById("deviceLoadingSpinner");
    const errorAlert = document.getElementById("deviceLoadError");
    const container = document.querySelector(
      `#${deviceType} .toggle-container`
    );

    if (!container) {
      console.error(`Container for ${deviceType} not found`);
      return;
    }

    try {
      spinner.style.display = "block";
      errorAlert.style.display = "none";

      // Get devices for the room
      const devices = await smartHomeApi.devices.getByRoom(currentRoom.room_id);

      // Filter devices by type and remove duplicates
      const typeMapping = {
        "lights-control": "light",
        "shutters-control": "blind",
        "climate-control": "thermostat",
        "other-control": "other",
      };

      // Create a Map to store unique devices by ID, keeping only the most recently updated one
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

      const filteredDevices = Array.from(uniqueDevices.values()).filter(
        (device) => {
          if (deviceType === "other-control") {
            return !["light", "blind", "thermostat"].includes(
              device.device_type
            );
          }
          return device.device_type === typeMapping[deviceType];
        }
      );

      // Clear existing devices
      container.innerHTML = "";

      if (filteredDevices.length === 0) {
        const noDevicesMsg = document.createElement("div");
        noDevicesMsg.className = "alert alert-info";
        noDevicesMsg.textContent =
          "No devices of this type found in your room.";
        container.appendChild(noDevicesMsg);
      } else {
        // Add devices
        filteredDevices.forEach((device) => {
          const deviceElement = document.createElement("div");
          deviceElement.className = "toggle-item";
          deviceElement.innerHTML = `
            <span>${device.device_name}</span>
            <label class="toggle-switch">
              <input type="checkbox" data-device-id="${device.device_id}" ${
            device.status === "on" ? "checked" : ""
          } />
              <span class="toggle-slider"></span>
            </label>
          `;

          // Add event listener for toggle
          const toggle = deviceElement.querySelector('input[type="checkbox"]');
          toggle.addEventListener("change", async (e) => {
            try {
              const newStatus = e.target.checked ? "on" : "off";
              await smartHomeApi.devices.updateStatus(
                device.device_id,
                newStatus
              );
            } catch (error) {
              console.error("Error updating device status:", error);
              // Revert toggle if update fails
              e.target.checked = !e.target.checked;
              alert("Error updating device status. Please try again.");
            }
          });

          container.appendChild(deviceElement);
        });
      }

      spinner.style.display = "none";
    } catch (error) {
      console.error("Error loading devices:", error);
      spinner.style.display = "none";
      errorAlert.textContent = "Error loading devices. Please try again later.";
      errorAlert.style.display = "block";
    }
  };

  // Set up modal event listeners
  const roomModal = document.getElementById("roomControlModal");
  if (roomModal) {
    roomModal.addEventListener("shown.bs.modal", resetModal);
    roomModal.addEventListener("hidden.bs.modal", resetModal);
  }

  // Load devices when a category is selected
  document.querySelectorAll(".modal-menu-button").forEach((button) => {
    button.addEventListener("click", async (e) => {
      const target = e.currentTarget.dataset.target;
      if (!target) return;

      document.querySelector(".main-menu").style.display = "none";
      document
        .querySelectorAll(".sub-menu")
        .forEach((menu) => (menu.style.display = "none"));

      const targetMenu = document.getElementById(target);
      if (targetMenu) {
        targetMenu.style.display = "block";
        await loadDevices(target);
      }
    });
  });

  // Back button functionality
  document.querySelectorAll(".btn-back").forEach((button) => {
    button.addEventListener("click", resetModal);
  });

  /*************************************************************
   * TEMP CONTROL MODAL
   *************************************************************/
  //inti temp control
  const initializeTemperatureControl = async () => {
    const display = document.querySelector(".temperature-display");
    const mercury = document.querySelector(".tinner");
    const scheduleContainer = document.querySelector(".schedule-list");

    //schedule with rough timings
    let schedule = [
      {
        time: "Morning",
        displayTime: "7am - 9am",
        startHour: 7,
        endHour: 9,
        temp: 20,
        icon: "fa-sun",
      },
      {
        time: "Day",
        displayTime: "9am - 4pm",
        startHour: 9,
        endHour: 16,
        temp: 22,
        icon: "fa-sun",
      },
      {
        time: "Evening",
        displayTime: "4pm - 10pm",
        startHour: 16,
        endHour: 22,
        temp: 21,
        icon: "fa-sun",
      },
      {
        time: "Night",
        displayTime: "10pm - 7am",
        startHour: 22,
        endHour: 7,
        temp: 18,
        icon: "fa-moon",
      },
    ];

    //gets current schedule period
    const getCurrentPeriod = () => {
      const now = new Date();
      const currentHour = now.getHours();

      //find matching period
      const currentPeriod = schedule.find((period) => {
        if (period.startHour < period.endHour) {
          //day period
          return (
            currentHour >= period.startHour && currentHour < period.endHour
          );
        } else {
          //overnight period
          return (
            currentHour >= period.startHour || currentHour < period.endHour
          );
        }
      });

      return currentPeriod || schedule[0];
    };

    //update temp display
    const updateTemperatureDisplay = (temp) => {
      display.textContent = `${temp}°C`;
      mercury.style.height = `${(temp / 30) * 100}%`;
    };

    //update schedule display
    const updateScheduleDisplay = () => {
      if (scheduleContainer) {
        scheduleContainer.innerHTML = "";
        const currentPeriod = getCurrentPeriod();

        schedule.forEach((period) => {
          const scheduleItem = document.createElement("div");
          scheduleItem.className = `schedule-item ${
            period.temp <= 19
              ? "temp-box-cold"
              : period.temp <= 22
              ? "temp-box-warm"
              : "temp-box-hot"
          }`;

          //highlight current schedule period
          if (period.time === currentPeriod.time) {
            scheduleItem.classList.add("current-period");
          }

          scheduleItem.innerHTML = `
            <div class="schedule-period">
              <strong>${period.time}</strong>
              <div class="schedule-time">${period.displayTime}</div>
            </div>
            <div class="schedule-temp">
              <i class="fas ${period.icon}"></i>
              ${period.temp}°C
            </div>
          `;
          scheduleContainer.appendChild(scheduleItem);
        });
      }
    };

    //init temp based on schedule or user override
    const initializeTemperature = () => {
      const savedTemp = localStorage.getItem("savedTemperature");
      const lastChangeTime = localStorage.getItem("lastTempChangeTime");
      const currentPeriod = getCurrentPeriod();

      //check if there is a saved temp
      if (savedTemp && lastChangeTime) {
        const changeTime = new Date(parseInt(lastChangeTime));
        const now = new Date();
        const hoursSinceChange = (now - changeTime) / (1000 * 60 * 60);

        if (hoursSinceChange < 4) {
          //reset after 4 hours
          const temp = parseInt(savedTemp);
          if (temp >= 16 && temp <= 26) {
            updateTemperatureDisplay(temp);
            return;
          }
        }
      }

      updateTemperatureDisplay(currentPeriod.temp);
    };

    //init display
    updateScheduleDisplay();
    initializeTemperature();

    //handle schedule adjustment buttons
    document.querySelectorAll(".adjust-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const isWarmer = btn.classList.contains("warmer-btn");
        const step = 1;

        //update all temps in schedule
        schedule = schedule.map((period) => ({
          ...period,
          temp: isWarmer
            ? Math.min(period.temp + step, 26)
            : Math.max(period.temp - step, 16),
        }));

        //save to local storage
        localStorage.setItem("savedSchedule", JSON.stringify(schedule));

        //update temp display
        updateScheduleDisplay();
        initializeTemperature();

        setTimeout(() => {
          feedbackMsg.style.display = "none";
        }, 2000);
      });
    });

    //temp control buttons
    document.querySelectorAll(".plus-btn, .minus-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        try {
          const currentTemp = parseInt(display.textContent);
          const step = 1;
          const newTemp = e.target.closest(".plus-btn")
            ? Math.min(currentTemp + step, 26)
            : Math.max(currentTemp - step, 16);

          //update temp display
          updateTemperatureDisplay(newTemp);

          //save temp to local storage
          localStorage.setItem("savedTemperature", newTemp.toString());
          localStorage.setItem("lastTempChangeTime", Date.now().toString());

          setTimeout(() => {
            feedbackMsg.style.display = "none";
          }, 2000);
        } catch (error) {
          console.error("Error updating temperature:", error);
          alert("Unable to change temperature. Please try again.");
        }
      });
    });

    //save to local storage
    const savedSchedule = localStorage.getItem("savedSchedule");
    if (savedSchedule) {
      try {
        const parsedSchedule = JSON.parse(savedSchedule);
        //error checking for schedule
        if (
          parsedSchedule.every(
            (period) =>
              period.time &&
              period.displayTime &&
              period.startHour !== undefined &&
              period.endHour !== undefined &&
              period.temp &&
              period.icon
          )
        ) {
          schedule = parsedSchedule;
          updateScheduleDisplay();
          initializeTemperature();
        }
      } catch (error) {
        console.error("Error loading saved schedule:", error);
      }
    }

    //update temp periodically to match schedule
    setInterval(() => {
      const lastChangeTime = localStorage.getItem("lastTempChangeTime");
      if (lastChangeTime) {
        const changeTime = new Date(parseInt(lastChangeTime));
        const now = new Date();
        const hoursSinceChange = (now - changeTime) / (1000 * 60 * 60);

        //reset temp to schedule after 4 hours
        if (hoursSinceChange >= 4) {
          localStorage.removeItem("savedTemperature");
          localStorage.removeItem("lastTempChangeTime");
          initializeTemperature();
        }
      }
    }, 60000);
  };

  // init temp control
  const tempModal = document.getElementById("tempModal");
  if (tempModal) {
    tempModal.addEventListener("shown.bs.modal", initializeTemperatureControl);
  }

  // Fall alert Logic
  //TODO: add logic for determing what room made the fall alert (later)
  const fallAlertButton = document.getElementById("fallAlertButton");
  const fallAlertMessage = document.getElementById("fallAlertMessage");

  fallAlertButton.addEventListener("click", () => {
    // Show the alert
    fallAlertMessage.style.display = "block";
    fallAlertMessage.classList.add("show");

    // Auto-dismiss after 1.5 seconds
    setTimeout(() => {
      fallAlertMessage.classList.remove("show");

      setTimeout(() => {
        fallAlertMessage.style.display = "none"; //remove the alert

        //reshrink the modal
        //TODO: add this to the fall alert
        const modalBody = fallAlertMessage.closest(".modal-body");
        modalBody.style.transition = "height 0.3s ease";
        modalBody.style.height = `${modalBody.scrollHeight}px`;
        setTimeout(() => {
          modalBody.style.height = "auto";
        }, 10);
      }, 300);
    }, 5000); //
  });

  // IT Alert Logic
  const itHelpButton = document.getElementById("itHelpButton");
  const itHelpmsg = document.getElementById("itHelpmsg");

  itHelpButton.addEventListener("click", () => {
    itHelpmsg.style.display = "block";
    itHelpmsg.classList.add("show");

    setTimeout(() => {
      itHelpmsg.classList.remove("show");

      setTimeout(() => {
        itHelpmsg.style.display = "none"; //remove the alert

        //reshrink the modal
        //TODO: add this to the fall alert
        const modalBody = itHelpmsg.closest(".modal-body");
        modalBody.style.transition = "height 0.3s ease";
        modalBody.style.height = `${modalBody.scrollHeight}px`;
        setTimeout(() => {
          modalBody.style.height = "auto";
        }, 10);
      }, 300);
    }, 5000); //
  });
});
