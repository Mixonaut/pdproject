// Debug Energy Modal JavaScript
document.addEventListener("DOMContentLoaded", function() {
  // Get the energy modal element
  const energyModal = document.getElementById("energyModal");
  let energyChart = null;
  
  // Function to initialize chart when modal is shown
  energyModal.addEventListener("shown.bs.modal", function() {
    console.log("Energy modal opened");
    
    // Destroy existing chart if it exists
    if (energyChart) {
      energyChart.destroy();
      energyChart = null;
    }
    
    // Fetch energy data with better debugging
    fetchEnergyData();
  });
  
  // Simple function to fetch energy data
  async function fetchEnergyData() {
    try {
      // Check the current user and room
      console.log("Current User:", AppState.currentUser);
      console.log("Current Room:", AppState.currentRoom);
      
      // Get room ID - using room 1 as default if not available
      const roomId = (AppState.currentRoom && AppState.currentRoom.room_id) ? 
                      AppState.currentRoom.room_id : 1;
      
      console.log(`Fetching energy data for room ID: ${roomId}`);
      
      // Fetch energy data
      const url = `/api/rooms/${roomId}/energy?period=day`;
      console.log(`API URL: ${url}`);
      
      const response = await fetch(url);
      console.log("API Response Status:", response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch energy data: ${response.status} ${response.statusText}`);
      }
      
      const energyData = await response.json();
      console.log("Energy data loaded:", energyData);
      
      // Check if we got valid data
      if (!Array.isArray(energyData) || energyData.length === 0) {
        console.warn("Energy data is empty or not an array");
        // Try a hardcoded example if no data is returned
        useHardcodedExample();
        return;
      }
      
      // Update chart and totals
      updateEnergyChart(energyData);
      updateTotalEnergy(energyData);
      
    } catch (error) {
      console.error("Error loading energy data:", error);
      // Show hardcoded example on error
      useHardcodedExample();
    }
  }
  
  // Use hardcoded example data if API fails
  function useHardcodedExample() {
    console.log("Using hardcoded example data");
    
    // Example data that matches the API format
    const exampleData = [
      {"hour":0,"energy":"1.40"},{"hour":1,"energy":"0.75"},
      {"hour":2,"energy":"0.80"},{"hour":3,"energy":"0.97"},
      {"hour":4,"energy":"1.12"},{"hour":5,"energy":"0.93"},
      {"hour":6,"energy":"1.10"},{"hour":7,"energy":"3.45"},
      {"hour":8,"energy":"2.65"},{"hour":9,"energy":"3.67"},
      {"hour":10,"energy":"2.01"},{"hour":11,"energy":"1.98"},
      {"hour":12,"energy":"2.31"},{"hour":13,"energy":"1.78"},
      {"hour":14,"energy":"1.38"},{"hour":15,"energy":"1.32"},
      {"hour":16,"energy":"4.63"},{"hour":17,"energy":"6.01"},
      {"hour":18,"energy":"4.10"},{"hour":19,"energy":"2.85"},
      {"hour":20,"energy":"5.01"},{"hour":21,"energy":"3.50"},
      {"hour":22,"energy":"0.77"},{"hour":23,"energy":"0.92"}
    ];
    
    updateEnergyChart(exampleData);
    updateTotalEnergy(exampleData);
  }
  
  // Update the energy chart
  function updateEnergyChart(energyData) {
    // Prepare the data for Chart.js
    const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    const energyValues = Array(24).fill(0);
    
    console.log("Preparing chart data from:", energyData);
    
    // Map the data to hours
    energyData.forEach(item => {
      const hour = parseInt(item.hour);
      const energy = parseFloat(item.energy);
      
      console.log(`Hour ${hour}: ${energy} kWh`);
      
      if (hour >= 0 && hour < 24 && !isNaN(energy)) {
        energyValues[hour] = energy;
      }
    });
    
    console.log("Final chart data:", energyValues);
    
    // If chart already exists, destroy it
    if (energyChart) {
      energyChart.destroy();
    }
    
    // Create the chart
    const ctx = document.getElementById("energyChart");
    energyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: hours,
        datasets: [{
          label: 'Energy Usage (kWh)',
          data: energyValues,
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Energy (kWh)'
            }
          }
        }
      }
    });
  }
  
  // Update total energy display
  function updateTotalEnergy(energyData) {
    const totalElement = document.getElementById("totalEnergyUsage");
    
    // Calculate total energy from all hours with better error handling
    let total = 0;
    energyData.forEach(item => {
      const energy = parseFloat(item.energy);
      if (!isNaN(energy)) {
        total += energy;
      }
    });
    
    console.log(`Total energy: ${total.toFixed(2)} kWh`);
    
    // Update display
    totalElement.textContent = `${total.toFixed(2)} kWh`;
  }
});
