//utility functions to make life easier
const Utils = {
  showError: (message, type = "error") => {
    const errorAlert = document.getElementById("deviceLoadError");
    if (errorAlert) {
      errorAlert.textContent = message;
      errorAlert.className = `alert alert-${type}`;
      errorAlert.style.display = "block";
    }
  },

  showLoading: (show = true) => {
    const spinner = document.getElementById("deviceLoadingSpinner");
    if (spinner) {
      spinner.style.display = show ? "block" : "none";
    }
  },

  validateTemperature: (temp) => {
    const numTemp = parseInt(temp);
    return !isNaN(numTemp) && numTemp >= 16 && numTemp <= 26;
  },

  //local/session storage
  storage: {
    setItem: (key, value, useSession = false) => {
      const storage = useSession ? sessionStorage : localStorage;
      storage.setItem(key, JSON.stringify({ value, timestamp: Date.now() }));
    },

    getItem: (key, useSession = false) => {
      const storage = useSession ? sessionStorage : localStorage;
      const item = storage.getItem(key);
      if (!item) return null;

      try {
        return JSON.parse(item).value;
      } catch {
        return null;
      }
    },

    removeItem: (key, useSession = false) => {
      const storage = useSession ? sessionStorage : localStorage;
      storage.removeItem(key);
    },
  },
};

document.addEventListener("DOMContentLoaded", async () => {
  //cache dom elements for easy access
  const domElements = {
    mainMenu: document.querySelector("#roomControlModal .main-menu"),
    subMenus: document.querySelectorAll("#roomControlModal .sub-menu"),
    tempDisplay: document.querySelector(".temperature-display"),
    mercury: document.querySelector(".tinner"),
    scheduleContainer: document.querySelector(".schedule-list"),
    modals: {
      room: document.getElementById("roomControlModal"),
      temp: document.getElementById("tempModal"),
      settings: document.getElementById("settingsModal"),
    },
  };

  //app state
  const AppState = {
    currentUser: null,
    currentRoom: null,
    schedule: [
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
    ],

    async initialize() {
      try {
        Utils.showLoading(true);
        this.currentUser = await smartHomeApi.users.getCurrentUser();

        if (this.currentUser?.role_name === "resident") {
          this.currentRoom = await smartHomeApi.userRooms.getUserRoom(
            this.currentUser.user_id
          );
        }

        return true;
      } catch (error) {
        console.error("Error initializing application state:", error);
        Utils.showError(
          "Error loading your account information. Please try logging in again."
        );
        return false;
      } finally {
        Utils.showLoading(false);
      }
    },

    reset() {
      this.currentUser = null;
      this.currentRoom = null;
      sessionStorage.clear();
      localStorage.clear();
    },
  };

  //device managmeent
  const DeviceManager = {
    typeMapping: {
      "lights-control": "light",
      "shutters-control": "blind",
      "climate-control": "thermostat",
      "other-control": "other",
    },

    async loadDevices(deviceType) {
      if (!AppState.currentUser || !AppState.currentRoom) {
        Utils.showError("Please log in to access controls");
        return;
      }

      const container = document.querySelector(
        `#${deviceType} .toggle-container`
      );
      if (!container) return;

      try {
        Utils.showLoading(true);
        Utils.showError("", "none");

        const devices = await smartHomeApi.devices.getByRoom(
          AppState.currentRoom.room_id
        );
        const filteredDevices = this.filterDevices(devices, deviceType);

        this.renderDevices(container, filteredDevices);
        this.attachDeviceListeners(container);
      } catch (error) {
        console.error("Error loading devices:", error);
        Utils.showError("Error loading devices. Please try again later.");
      } finally {
        Utils.showLoading(false);
      }
    },

    filterDevices(devices, deviceType) {
      return devices.filter((device) => {
        if (deviceType === "other-control") {
          return !["light", "blind", "thermostat"].includes(device.device_type);
        }
        return device.device_type === this.typeMapping[deviceType];
      });
    },

    renderDevices(container, devices) {
      container.innerHTML = devices.length
        ? devices
            .map(
              (device) => `
            <div class="toggle-item">
              <span>${device.device_name}</span>
              <label class="toggle-switch">
                <input type="checkbox" data-device-id="${device.device_id}" 
                       ${device.status === "on" ? "checked" : ""} 
                       aria-label="Toggle ${device.device_name}" />
                <span class="toggle-slider"></span>
              </label>
            </div>
          `
            )
            .join("")
        : '<div class="alert alert-info">No devices found</div>';
    },

    attachDeviceListeners(container) {
      container.querySelectorAll("input[type='checkbox']").forEach((toggle) => {
        const deviceId = toggle.dataset.deviceId;

        //remove to prevent duplicates
        toggle.removeEventListener("change", this.handleDeviceToggle);
        toggle.addEventListener("change", this.handleDeviceToggle.bind(this));
      });
    },

    async handleDeviceToggle(e) {
      const toggle = e.target;
      const originalState = !toggle.checked;

      try {
        await smartHomeApi.devices.updateStatus(
          toggle.dataset.deviceId,
          toggle.checked ? "on" : "off"
        );
      } catch (error) {
        console.error("Error updating device:", error);
        toggle.checked = originalState;
        Utils.showError("Error updating device status. Please try again.");
      }
    },
  };

  //temp control
  const TemperatureControl = {
    async initialize() {
      if (
        !domElements.tempDisplay ||
        !domElements.mercury ||
        !domElements.scheduleContainer
      )
        return;

      this.loadSavedSchedule();
      this.updateScheduleDisplay();
      this.initializeTemperature();
      this.attachTemperatureListeners();
      this.startAutoUpdate();
    },

    loadSavedSchedule() {
      const savedSchedule = Utils.storage.getItem("savedSchedule");
      if (savedSchedule && this.validateSchedule(savedSchedule)) {
        AppState.schedule = savedSchedule;
      }
    },

    validateSchedule(schedule) {
      return (
        Array.isArray(schedule) &&
        schedule.every(
          (period) =>
            period.time &&
            period.displayTime &&
            period.startHour !== undefined &&
            period.endHour !== undefined &&
            Utils.validateTemperature(period.temp) &&
            period.icon
        )
      );
    },

    getCurrentPeriod() {
      const currentHour = new Date().getHours();
      return (
        AppState.schedule.find((period) => {
          if (period.startHour < period.endHour) {
            return (
              currentHour >= period.startHour && currentHour < period.endHour
            );
          }
          return (
            currentHour >= period.startHour || currentHour < period.endHour
          );
        }) || AppState.schedule[0]
      );
    },

    updateTemperatureDisplay(temp) {
      if (!Utils.validateTemperature(temp)) return;

      domElements.tempDisplay.textContent = `${temp}°C`;
      domElements.mercury.style.height = `${(temp / 30) * 100}%`;
    },

    updateScheduleDisplay() {
      if (!domElements.scheduleContainer) return;

      const currentPeriod = this.getCurrentPeriod();
      domElements.scheduleContainer.innerHTML = AppState.schedule
        .map((period) => this.createScheduleItemHTML(period, currentPeriod))
        .join("");
    },

    createScheduleItemHTML(period, currentPeriod) {
      const tempClass =
        period.temp <= 19
          ? "temp-box-cold"
          : period.temp <= 22
          ? "temp-box-warm"
          : "temp-box-hot";

      return `
        <div class="schedule-item ${tempClass} ${
        period.time === currentPeriod.time ? "current-period" : ""
      }">
          <div class="schedule-period">
            <strong>${period.time}</strong>
            <div class="schedule-time">${period.displayTime}</div>
          </div>
          <div class="schedule-temp">
            <i class="fas ${period.icon}" aria-hidden="true"></i>
            ${period.temp}°C
          </div>
        </div>
      `;
    },

    initializeTemperature() {
      const savedTemp = Utils.storage.getItem("savedTemperature", true);
      const lastChangeTime = Utils.storage.getItem("lastTempChangeTime", true);

      if (savedTemp && lastChangeTime) {
        const hoursSinceChange =
          (Date.now() - lastChangeTime) / (1000 * 60 * 60);

        if (hoursSinceChange < 4 && Utils.validateTemperature(savedTemp)) {
          this.updateTemperatureDisplay(savedTemp);
          return;
        }
      }

      this.updateTemperatureDisplay(this.getCurrentPeriod().temp);
    },

    attachTemperatureListeners() {
      document.querySelectorAll(".adjust-btn").forEach((btn) => {
        btn.removeEventListener("click", this.handleScheduleAdjust);
        btn.addEventListener("click", this.handleScheduleAdjust.bind(this));
      });

      document.querySelectorAll(".plus-btn, .minus-btn").forEach((btn) => {
        btn.removeEventListener("click", this.handleTemperatureAdjust);
        btn.addEventListener("click", this.handleTemperatureAdjust.bind(this));
      });
    },

    handleScheduleAdjust(e) {
      const isWarmer = e.target.classList.contains("warmer-btn");
      const step = 1;

      AppState.schedule = AppState.schedule.map((period) => ({
        ...period,
        temp: isWarmer
          ? Math.min(period.temp + step, 26)
          : Math.max(period.temp - step, 16),
      }));

      Utils.storage.setItem("savedSchedule", AppState.schedule);
      this.updateScheduleDisplay();
      this.initializeTemperature();
    },

    handleTemperatureAdjust(e) {
      try {
        const currentTemp = parseInt(domElements.tempDisplay.textContent);
        if (!Utils.validateTemperature(currentTemp)) return;

        const step = 1;
        const newTemp = e.target.closest(".plus-btn")
          ? Math.min(currentTemp + step, 26)
          : Math.max(currentTemp - step, 16);

        this.updateTemperatureDisplay(newTemp);
        Utils.storage.setItem("savedTemperature", newTemp, true);
        Utils.storage.setItem("lastTempChangeTime", Date.now(), true);
      } catch (error) {
        console.error("Error adjusting temperature:", error);
        Utils.showError("Unable to change temperature. Please try again.");
      }
    },

    startAutoUpdate() {
      setInterval(() => {
        const lastChangeTime = Utils.storage.getItem(
          "lastTempChangeTime",
          true
        );
        if (
          lastChangeTime &&
          Date.now() - lastChangeTime >= 4 * 60 * 60 * 1000
        ) {
          Utils.storage.removeItem("savedTemperature", true);
          Utils.storage.removeItem("lastTempChangeTime", true);
          this.initializeTemperature();
        }
      }, 60000);
    },
  };

  //init app
  await AppState.initialize();

  //setup modal handlers
  if (domElements.modals.room) {
    const toggleMenuVisibility = (showMain = true) => {
      domElements.mainMenu.style.display = showMain ? "block" : "none";
      domElements.subMenus.forEach((menu) => (menu.style.display = "none"));
    };

    domElements.modals.room.addEventListener("shown.bs.modal", () =>
      toggleMenuVisibility(true)
    );
    domElements.modals.room.addEventListener("hidden.bs.modal", () =>
      toggleMenuVisibility(true)
    );

    document
      .querySelectorAll("#roomControlModal .modal-menu-button")
      .forEach((button) => {
        button.addEventListener("click", async (e) => {
          const target = e.currentTarget.dataset.target;
          toggleMenuVisibility(false);
          document.querySelector(`#${target}`).style.display = "block";
          if (AppState.currentUser && AppState.currentRoom) {
            await DeviceManager.loadDevices(target);
          }
        });
      });

    document
      .querySelectorAll("#roomControlModal .btn-back")
      .forEach((button) => {
        button.addEventListener("click", () => toggleMenuVisibility(true));
      });
  }

  //settings handlers
  if (domElements.modals.settings) {
    const highContrastToggle = document.getElementById("highContrastToggle");
    if (highContrastToggle) {
      highContrastToggle.addEventListener("change", (e) => {
        document.body.classList.toggle("high-contrast", e.target.checked);
        Utils.storage.setItem("highContrast", e.target.checked);
      });

      const savedContrast = Utils.storage.getItem("highContrast");
      if (savedContrast !== null) {
        highContrastToggle.checked = savedContrast;
        document.body.classList.toggle("high-contrast", savedContrast);
      }
    }

    const fontSizeSelect = domElements.modals.settings.querySelector("select");
    if (fontSizeSelect) {
      fontSizeSelect.addEventListener("change", (e) => {
        document.body.classList.remove(
          "font-small",
          "font-medium",
          "font-large"
        );
        document.body.classList.add(`font-${e.target.value}`);
        Utils.storage.setItem("fontSize", e.target.value);
      });

      const savedFontSize = Utils.storage.getItem("fontSize") || "medium";
      fontSizeSelect.value = savedFontSize;
      document.body.classList.add(`font-${savedFontSize}`);
    }
  }

  //temp control
  if (domElements.modals.temp) {
    domElements.modals.temp.addEventListener("shown.bs.modal", () =>
      TemperatureControl.initialize()
    );
  }

  // Setup alert handlers
  const setupAlertButton = (buttonId, messageId) => {
    const button = document.getElementById(buttonId);
    const message = document.getElementById(messageId);

    if (!button || !message) return;

    button.addEventListener("click", () => {
      message.style.display = "block";
      message.classList.add("show");

      setTimeout(() => {
        message.classList.remove("show");
        setTimeout(() => {
          message.style.display = "none";
          const modalBody = message.closest(".modal-body");
          if (modalBody) {
            modalBody.style.transition = "height 0.3s ease";
            modalBody.style.height = `${modalBody.scrollHeight}px`;
            setTimeout(() => (modalBody.style.height = "auto"), 10);
          }
        }, 300);
      }, 5000);
    });
  };

  setupAlertButton("fallAlertButton", "fallAlertMessage");
  setupAlertButton("itHelpButton", "itHelpmsg");
});
