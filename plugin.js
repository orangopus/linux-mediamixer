const { exec } = require('child_process');
const TouchPortalAPI = require('touchportal-api');
const TPClient = new TouchPortalAPI.Client();

const pluginId = 'com.github.orangopus.mediamixer';

// Define the function to set application volume
function setApplicationVolume(applicationName, volumePercentage) {
    const findSinkInputCommand = `pactl list sink-inputs`;

    exec(findSinkInputCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error listing sink inputs: ${stderr}`);
            return;
        }

        const sinkInput = stdout.split('\n\n').find(input => input.includes(`application.name = "${applicationName}"`));

        if (!sinkInput) {
            console.error(`Application '${applicationName}' not found in sink inputs.`);
            return;
        }

        const match = sinkInput.match(/Sink Input #(\d+)/);
        if (!match) {
            console.error(`Sink input index not found for application '${applicationName}'.`);
            return;
        }

        const sinkInputIndex = match[1];
        const setVolumeCommand = `pactl set-sink-input-volume ${sinkInputIndex} ${volumePercentage}%`;

        console.log(`Executing command: ${setVolumeCommand}`);

        exec(setVolumeCommand, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error setting volume: ${stderr}`);
                return;
            }
            console.log(`Set volume of '${applicationName}' to ${volumePercentage}%`);

            // Send a message to Touch Portal
            console.log(`Sending connector update for '${applicationName}' to ${volumePercentage}%`);
        });
    });
}

// Event listener for ConnectorChange
TPClient.on("ConnectorChange", (data) => {
    console.log("Connector event received:", data);

    const applicationName = data.data.find(d => d.id === "applicationName").value;
    const volumePercentage = data.value;

    console.log(`Received data: applicationName=${applicationName}, volumePercentage=${volumePercentage}`)
    setApplicationVolume(applicationName, volumePercentage);

    if (!applicationName || isNaN(volumePercentage)) {
        console.error(`Invalid data received: applicationName=${applicationName}, volumePercentage=${volumePercentage}`);
        return;
    }
});

// Event listener for Info
TPClient.on("Info", (data) => {
    console.log("Info event received:", data);
});

// Event listener for ClosePlugin
TPClient.on("ClosePlugin", () => {
    console.log("Plugin closed");
    process.exit();
});

// Event listener for Connected
TPClient.on("Connected", () => {
    console.log("Connected to Touch Portal");
});

// Connect to Touch Portal
TPClient.connect({ pluginId });

// Add a small delay to keep the script running
setTimeout(() => {
    console.log("Waiting for events...");
}, 1000);
