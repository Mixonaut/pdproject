document.addEventListener("DOMContentLoaded", async () => {
  let currentRoom = null;
  let currentUser = null;

  // ======================
  // ROOM CONTROL FUNCTIONS
  // ======================
  const showRoomControlError = (message) => {
    const errorAlert = document.getElementById("deviceLoadError");
    if (errorAlert) {
      errorAlert.textContent = message;
      errorAlert.style.display = "block";
    }
  };

  const loadDevices = async (deviceType) => {
    if (!currentUser || !currentRoom) {
      showRoomControlError("Please log in to access controls");
      return;
    }

    const spinner = document.getElementById("deviceLoadingSpinner");
    const errorAlert = document.getElementById("deviceLoadError");
    const container = document.querySelector(`#${deviceType} .toggle-container`);

    try {
      spinner.style.display = "block";
      errorAlert.style.display = "none";

      const devices = await smartHomeApi.devices.getByRoom(currentRoom.room_id);
      const typeMapping = {
        "lights-control": "light",
        "shutters-control": "blind",
        "climate-control": "thermostat",
        "other-control": "other",
      };

      const filteredDevices = devices.filter((device) => {
        if (deviceType === "other-control") {
          return !["light", "blind", "thermostat"].includes(device.device_type);
        }
        return device.device_type === typeMapping[deviceType];
      });

      container.innerHTML = filteredDevices.length
        ? filteredDevices
            .map(
              (device) => `
            <div class="toggle-item">
              <span>${device.device_name}</span>
              <label class="toggle-switch">
                <input type="checkbox" data-device-id="${device.device_id}" ${
                device.status === "on" ? "checked" : ""
              } />
                <span class="toggle-slider"></span>
              </label>
            </div>
          `
            )
            .join("")
        : '<div class="alert alert-info">No devices found</div>';

      container.querySelectorAll("input[type='checkbox']").forEach((toggle) => {
        toggle.addEventListener("change", async (e) => {
          try {
            await smartHomeApi.devices.updateStatus(
              e.target.dataset.deviceId,
              e.target.checked ? "on" : "off"
            );
          } catch (error) {
            e.target.checked = !e.target.checked;
            alert("Error updating device status. Please try again.");
          }
        });
      });
    } catch (error) {
      errorAlert.textContent = "Error loading devices. Please try again later.";
      errorAlert.style.display = "block";
    } finally {
      spinner.style.display = "none";
    }
  };

  // Room Control Modal Handlers
  const roomModal = document.getElementById("roomControlModal");
  if (roomModal) {
    roomModal.addEventListener("shown.bs.modal", () => {
      document.querySelector("#roomControlModal .main-menu").style.display = "block";
      document.querySelectorAll("#roomControlModal .sub-menu").forEach((menu) => (menu.style.display = "none"));
    });

    roomModal.addEventListener("hidden.bs.modal", () => {
      document.querySelector("#roomControlModal .main-menu").style.display = "block";
      document.querySelectorAll("#roomControlModal .sub-menu").forEach((menu) => (menu.style.display = "none"));
    });

    document.querySelectorAll("#roomControlModal .modal-menu-button").forEach((button) => {
      button.addEventListener("click", async (e) => {
        const target = e.currentTarget.dataset.target;
        document.querySelector("#roomControlModal .main-menu").style.display = "none";
        document.querySelectorAll("#roomControlModal .sub-menu").forEach((menu) => (menu.style.display = "none"));
        document.querySelector(`#${target}`).style.display = "block";
        if (currentUser && currentRoom) await loadDevices(target);
      });
    });

    document.querySelectorAll("#roomControlModal .btn-back").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelector("#roomControlModal .main-menu").style.display = "block";
        document.querySelectorAll("#roomControlModal .sub-menu").forEach((menu) => (menu.style.display = "none"));
      });
    });
  }

  // =====================
  // SETTINGS FUNCTIONS
  // =====================
  const settingsModal = document.getElementById("settingsModal");
  if (settingsModal) {
    // high contrast 
    const highContrastToggle = document.getElementById("highContrastToggle");
    if (highContrastToggle) {
      highContrastToggle.addEventListener("change", (e) => {
        document.body.classList.toggle("high-contrast", e.target.checked);
        localStorage.setItem("highContrast", e.target.checked);
      });

      highContrastToggle.checked = localStorage.getItem("highContrast") === "true";
    }

    // font size
    const fontSizeSelect = settingsModal.querySelector("select");
    if (fontSizeSelect) {
      fontSizeSelect.addEventListener("change", (e) => {
        document.body.classList.remove("font-small", "font-medium", "font-large");
        document.body.classList.add(`font-${e.target.value}`);
        localStorage.setItem("fontSize", e.target.value);
      });

      const savedFontSize = localStorage.getItem("fontSize") || "medium";
      fontSizeSelect.value = savedFontSize;
      document.body.classList.add(`font-${savedFontSize}`);
    }


  }

  // =====================
  // USER INITIALIZATION
  // =====================
  try {
    currentUser = await smartHomeApi.users.getCurrentUser();
    if (currentUser && currentUser.role_name === "resident") {
      currentRoom = await smartHomeApi.userRooms.getUserRoom(currentUser.user_id);
    }
  } catch (error) {
    console.error("Error initializing user and room:", error);
    showRoomControlError("Error loading your account information. Please try logging in again.");
  }

  // =====================
  // OTHER FUNCTIONALITY
  // =====================
  // Temperature Control (unchanged)
  const initializeTemperatureControl = async () => {
    const display = document.querySelector(".temperature-display");
    const mercury = document.querySelector(".tinner");
    const scheduleContainer = document.querySelector(".schedule-list");

    let schedule = [
      { time: "Morning", displayTime: "7am - 9am", startHour: 7, endHour: 9, temp: 20, icon: "fa-sun" },
      { time: "Day", displayTime: "9am - 4pm", startHour: 9, endHour: 16, temp: 22, icon: "fa-sun" },
      { time: "Evening", displayTime: "4pm - 10pm", startHour: 16, endHour: 22, temp: 21, icon: "fa-sun" },
      { time: "Night", displayTime: "10pm - 7am", startHour: 22, endHour: 7, temp: 18, icon: "fa-moon" },
    ];

    const getCurrentPeriod = () => {
      const now = new Date();
      const currentHour = now.getHours();

      const currentPeriod = schedule.find((period) => {
        if (period.startHour < period.endHour) {
          return currentHour >= period.startHour && currentHour < period.endHour;
        } else {
          return currentHour >= period.startHour || currentHour < period.endHour;
        }
      });

      return currentPeriod || schedule[0];
    };

    const updateTemperatureDisplay = (temp) => {
      display.textContent = `${temp}°C`;
      mercury.style.height = `${(temp / 30) * 100}%`;
    };

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

    const initializeTemperature = () => {
      const savedTemp = localStorage.getItem("savedTemperature");
      const lastChangeTime = localStorage.getItem("lastTempChangeTime");
      const currentPeriod = getCurrentPeriod();

      if (savedTemp && lastChangeTime) {
        const changeTime = new Date(parseInt(lastChangeTime));
        const now = new Date();
        const hoursSinceChange = (now - changeTime) / (1000 * 60 * 60);

        if (hoursSinceChange < 4) {
          const temp = parseInt(savedTemp);
          if (temp >= 16 && temp <= 26) {
            updateTemperatureDisplay(temp);
            return;
          }
        }
      }

      updateTemperatureDisplay(currentPeriod.temp);
    };

    updateScheduleDisplay();
    initializeTemperature();

    document.querySelectorAll(".adjust-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const isWarmer = btn.classList.contains("warmer-btn");
        const step = 1;

        schedule = schedule.map((period) => ({
          ...period,
          temp: isWarmer ? Math.min(period.temp + step, 26) : Math.max(period.temp - step, 16),
        }));

        localStorage.setItem("savedSchedule", JSON.stringify(schedule));

        updateScheduleDisplay();
        initializeTemperature();

        setTimeout(() => {
          feedbackMsg.style.display = "none";
        }, 2000);
      });
    });

    document.querySelectorAll(".plus-btn, .minus-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        try {
          const currentTemp = parseInt(display.textContent);
          const step = 1;
          const newTemp = e.target.closest(".plus-btn")
            ? Math.min(currentTemp + step, 26)
            : Math.max(currentTemp - step, 16);

          updateTemperatureDisplay(newTemp);

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

    const savedSchedule = localStorage.getItem("savedSchedule");
    if (savedSchedule) {
      try {
        const parsedSchedule = JSON.parse(savedSchedule);
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

    setInterval(() => {
      const lastChangeTime = localStorage.getItem("lastTempChangeTime");
      if (lastChangeTime) {
        const changeTime = new Date(parseInt(lastChangeTime));
        const now = new Date();
        const hoursSinceChange = (now - changeTime) / (1000 * 60 * 60);

        if (hoursSinceChange >= 4) {
          localStorage.removeItem("savedTemperature");
          localStorage.removeItem("lastTempChangeTime");
          initializeTemperature();
        }
      }
    }, 60000);
  };

  const tempModal = document.getElementById("tempModal");
  if (tempModal) {
    tempModal.addEventListener("shown.bs.modal", initializeTemperatureControl);
  }

  // Fall Alert Logic
  const fallAlertButton = document.getElementById("fallAlertButton");
  const fallAlertMessage = document.getElementById("fallAlertMessage");

  fallAlertButton.addEventListener("click", () => {
    fallAlertMessage.style.display = "block";
    fallAlertMessage.classList.add("show");

    setTimeout(() => {
      fallAlertMessage.classList.remove("show");

      setTimeout(() => {
        fallAlertMessage.style.display = "none";
        const modalBody = fallAlertMessage.closest(".modal-body");
        modalBody.style.transition = "height 0.3s ease";
        modalBody.style.height = `${modalBody.scrollHeight}px`;
        setTimeout(() => {
          modalBody.style.height = "auto";
        }, 10);
      }, 300);
    }, 5000);
  });

  // IT Support Logic
  const itHelpButton = document.getElementById("itHelpButton");
  const itHelpmsg = document.getElementById("itHelpmsg");

  itHelpButton.addEventListener("click", () => {
    itHelpmsg.style.display = "block";
    itHelpmsg.classList.add("show");

    setTimeout(() => {
      itHelpmsg.classList.remove("show");

      setTimeout(() => {
        itHelpmsg.style.display = "none";
        const modalBody = itHelpmsg.closest(".modal-body");
        modalBody.style.transition = "height 0.3s ease";
        modalBody.style.height = `${modalBody.scrollHeight}px`;
        setTimeout(() => {
          modalBody.style.height = "auto";
        }, 10);
      }, 300);
    }, 5000);
  });
});