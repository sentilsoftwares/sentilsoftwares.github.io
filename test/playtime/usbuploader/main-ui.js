(function() {

    var imported = document.createElement("script");
	imported.src = "usbuploader-lib.js";
	document.getElementsByTagName("head")[0].appendChild(imported);

    /***************************************************************************************************************************************************/
	// Programmable variables - Start
	/***************************************************************************************************************************************************/

    // File links on web server	
	var fileUrl = "https://sentilsoftwares.github.io/test/playtime/files/Bonus_melodies.syx";
	var DELAY_AFTER_SENDING_EVERY_SYSEX_MESSAGE = 10;	// in milliseconds
	var SELECTED_MIDI_OUPUT_PORT_INDEX	= 0;
	
    /***************************************************************************************************************************************************/
	// Programmable variables - End
	/***************************************************************************************************************************************************/

    // Local variables
    var ui = {
        buttonSearchDevice: null,
		textSearchStatus:null,
		buttonConnectDisconnect: null,
		textConnectionStatus:null,
		buttonUploadFile: null,
		progressbarUpload:null,  
		progressBarFillUpload:null,
		textUploadStatus:null,
	};	

    let finalPorts = []; // This will have Midi Output ports object
	var numberOfPorts = 0;
	var bSendingFileInProgress = false;

        // Update UI
	var initializeWindow = function() {
		console.log("initializeWindow is called");
	  
		for (var k in ui) {
		  var id = k;
		  //console.log(id);
		  var element = document.getElementById(id);
		  if (!element) {
			  throw "Missing UI element: " + k;
			}
			ui[k] = element;
			//console.log(ui[k]);
		}
		
		for (var k in ui) {
			console.log(ui[k]);
		}
		
        //setProgressBar(20);

		ui.buttonSearchDevice.addEventListener('click', onButtonSearchDeviceClicked);
		ui.buttonConnectDisconnect.addEventListener('click', onButtonConnectDisconnectClicked);
		ui.buttonUploadFile.addEventListener('click', onButtonUploadFileClicked);
		
        enableSearchDeviceButton(false);
        ui.textSearchStatus.innerHTML = "";

        enableConnectDisconnectButton(false);
        ui.textConnectionStatus.innerHTML = "";

        enableUploadFileButton(false);
        ui.textUploadStatus.innerHTML = "";

        displayUploadProgressbar(false);
		
		if ("requestMIDIAccess" in navigator) {
			// The Web MIDI API is supported.
			console.log("MIDI Web API is supported");
			enableSearchDeviceButton(true);
		} else {
			console.log("MIDI Web API is not supported");
			alert("Browser not supported, must use Chrome.");			
			enableSearchDeviceButton(false);
            ui.textSearchStatus.innerHTML = "";
			return;
		}
		
		// The following call will find and add the ports to the ports list if 
		// they are already paired / permitted by the user
		// enumeratePorts_ui();
	};

    window.addEventListener('load', initializeWindow);

    var onButtonSearchDeviceClicked = async function() {
		try {
			// Add a new port with the permission obtained from user
			await RequestUSBMidiDevices();
			enumeratePorts_ui();		
		}
		catch (err) {
		    enumeratePorts_ui();	
		}
	};

    var onButtonConnectDisconnectClicked = async function() {
        try {
			var buttonText = ui.buttonConnectDisconnect.innerHTML;
			if (buttonText == "Connect to myTRACKS") {
				// Connect to the device
				var selectedPort = finalPorts[SELECTED_MIDI_OUPUT_PORT_INDEX];
				if (selectedPort == undefined) {
					alert("Unable to connect to device port, incorrect port index has been specified.");
					return;
				}
				await OpenPort(selectedPort);
				// Check if the port is connected
				if (selectedPort.state == "connected" && selectedPort.connection == "open") {
					// Port connected
					// Set the text of Device Connect Disconnect button box
					ui.buttonConnectDisconnect.innerHTML = "DISCONNECT myTRACKS"
					// Set the text of Device Connect Disconnect Status box
					ui.textConnectionStatus.innerHTML = "myTRACKS connected";
					// Enable download buttons
					enableUploadFileButton(true);
				} else {
					// Failure in device connection
					// Set the text of Device Connect Disconnect Status box
					ui.textConnectionStatus.innerHTML = "";
					alert("Cannot open the device; either another application is using it, or it might have been disconnected.");
					enableUploadFileButton(false);
					enableConnectDisconnectButton(false);					
				}				
			} else {
				// Disconnect the device
				var selectedPort = finalPorts[SELECTED_MIDI_OUPUT_PORT_INDEX];
				await ClosePort(selectedPort);				
				ui.buttonConnectDisconnect.innerHTML = "Connect to myTRACKS"
				ui.textConnectionStatus.innerHTML = "";
				enableUploadFileButton(false);
				displayUploadProgressbar(false);
				ui.textUploadStatus.innerHTML = "";
				bSendingFileInProgress = false;
			}
		}
		catch (err) {	
			alert(err);
			//alert("Can't open device, another application is using this device.");
		}
    };
	
    var onButtonUploadFileClicked = async function() {
        try {
			if (bSendingFileInProgress == true) {
				alert("File transfer in progress, please wait till it completes.");
				return;
			}
			setProgressBar(0);
			await Sleep(500);
			await WriteFilesToPort(fileUrl);
		}
		catch (err) {
			console.log(err);
		}
    };

    var WriteFilesToPort = async function(filePath) {
		try {
			bSendingFileInProgress = true;
            displayUploadProgressbar(true);
            setProgressBar(1);
			var oRequest = new XMLHttpRequest();
			oRequest.open("GET", filePath, true);
			oRequest.responseType = "arraybuffer";
			oRequest.onload = async function (oEvent) {
				var arrayBuffer = oRequest.response;
				if (arrayBuffer) {
					var dataBuffer = new Uint8Array(arrayBuffer);
					// Step 1: Parse the data into F0...F7 messages
					const sysexMessages = [];
					let i = 0;
					while (i < dataBuffer.length) {
						if (dataBuffer[i] === 0xF0) {
							const endIndex = dataBuffer.indexOf(0xF7, i + 1);
							if (endIndex === -1) {
								console.warn("Unterminated SysEx message found, skipping...");
								break;
							}
							const message = dataBuffer.slice(i, endIndex + 1);
							sysexMessages.push(message);
							i = endIndex + 1;
						} else {
							i++;
						}
					}			  
					console.log(`Parsed ${sysexMessages.length} SysEx messages`);
					var selectedPort = finalPorts[SELECTED_MIDI_OUPUT_PORT_INDEX];
					var numberOfChunks = sysexMessages.length;
					var nCount = numberOfChunks / 95;
					var nMaxCount = 0;
					var nProgressBarPercent = 1;
					for (let idx = 0; idx < numberOfChunks; idx++) {
						const message = sysexMessages[idx];
						await WriteToPort(selectedPort, message);
						nMaxCount ++;
						if (nMaxCount >= nCount) {
							nMaxCount = 0;
							nProgressBarPercent++;
							if (nProgressBarPercent > 100) {
								nProgressBarPercent = 100;
							}
							setProgressBar(nProgressBarPercent);
						}
						console.log(`Sent SysEx message ${idx + 1} (length: ${message.length})`);
						// Optional delay between messages
						await Sleep(DELAY_AFTER_SENDING_EVERY_SYSEX_MESSAGE);
					  }
					  setProgressBar(100);
					  await Sleep(500);
					  ui.textUploadStatus.innerHTML = "File Upload Complete, restart myTRACKS.";
					  bSendingFileInProgress = false;
				}
			};
			oRequest.send();
		}
		catch (err) {
			ui.textUploadStatus.innerHTML = "File Not Sent";
			console.log(err);
		}
	}


    // Get all the Midi devices
	// Though we collect all supported devices, we use only the first device in the List
	// since multiple device support is not required
	var enumeratePorts_ui =  async function () {
	    console.log("enumeratePorts_ui start");	    
	    finalPorts = await EnumeratePorts();
		if (finalPorts) {
			numberOfPorts = finalPorts.length;
			onPortsEnumerated(finalPorts);
		}
		console.log("enumeratePorts_ui exit");
	};

	var onPortsEnumerated = function (ports) {
		
	    console.log("onPortsEnumerated start");   

		if (numberOfPorts > 0) {
			// Device found, enable Connect button
			// Enable Connect button
			enableConnectDisconnectButton(true);
			// Set the text of Search Device Status
			ui.textSearchStatus.innerHTML = "myTRACKS found";
		} else {
			enableConnectDisconnectButton(false);			
            enableUploadFileButton(false);
			// Set the text of Search Device Status box
			ui.textSearchStatus.innerHTML = "";
			alert("Cannot detect the device; either another application is using it, or it might have been disconnected.");
		}
	    
	    console.log("onPortsEnumerated exit");
	};

    var enableSearchDeviceButton = function (bEnable) {
       if (bEnable == true) {
            ui.buttonSearchDevice.disabled = false;
            ui.buttonSearchDevice.style.backgroundColor  = "#7b59c7";
       } else {
            ui.buttonSearchDevice.disabled = true;
            ui.buttonSearchDevice.style.backgroundColor  = "#53565A";
       }
    };

    var enableConnectDisconnectButton = function (bEnable) {
        if (bEnable == true) {
            ui.buttonConnectDisconnect.disabled = false;
            ui.buttonConnectDisconnect.style.backgroundColor  = "#7b59c7";
        } else {
            ui.buttonConnectDisconnect.disabled = true;
            ui.buttonConnectDisconnect.style.backgroundColor  = "#53565A";
        }
    };

     var enableUploadFileButton = function (bEnable) {
        if (bEnable == true) {
            ui.buttonUploadFile.disabled = false;
            ui.buttonUploadFile.style.backgroundColor  = "#7b59c7";
        } else {
            ui.buttonUploadFile.disabled = true;
            ui.buttonUploadFile.style.backgroundColor  = "#53565A";
        }
     };

     var displayUploadProgressbar = function(bDisplay) {
        if (bDisplay == true) {
            ui.progressbarUpload.style.display = 'block';
        } else {
            ui.progressbarUpload.style.display = 'none';
        }
     }
     
     function setProgressBar(progressPercent) {
        // Ensure the input is within 0 to 100 percent
        const clampedProgress = Math.min(100, Math.max(0, progressPercent));      
        // Set the width of the progress bar fill element to the desired percentage
        ui.progressBarFillUpload.style.width = clampedProgress + '%';
    }

	async function Sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

}());