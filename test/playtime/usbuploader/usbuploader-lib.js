/***************************************************************************************************************************************************/
// Programmable variables - Start
/***************************************************************************************************************************************************/




/***************************************************************************************************************************************************/
// Programmable variables - End
/***************************************************************************************************************************************************/

// Local variable
var numberOfInputPorts = 0;
var numberOfOutputPorts = 0;
var inputPorts = null;
var outputPorts = null;
var DEVICE_NAME_PLAYTIME_ENG_STUDIO = "Playtime Eng Studio";
var oMidiAccess = null; // MIDIAccess object

/***************************************************************************************************************************************************/
// Playtime USBUploader Calls - Start
/***************************************************************************************************************************************************/
// RequestUSBMidiDevices
// Description:     This function gets the permission from the user to connect the USB-Midi Port to the Web application. 
//                  This function call is a must before using any other Playtime USBUploader Library functions.
// Arguments:       None
// Return Value:    None
async function RequestUSBMidiDevices() {
	await navigator.requestMIDIAccess({sysex:true}).then(onMIDISuccess, onMIDIFailure);
	return oMidiAccess;
}

function onMIDISuccess(midiAccess) {
	console.log("midiAccess Object:" + midiAccess);
	oMidiAccess = midiAccess;	
	
	inputPorts = Array.from(midiAccess.inputs.values());
	numberOfInputPorts = inputPorts.length;
	console.log("Number of input ports: ", numberOfInputPorts);
	for (let i = 0; i < numberOfInputPorts; i++) {		
		console.log(`Port id: ${inputPorts[i].id}, Manufacturer: ${inputPorts[i].manufacturer}, Name: ${inputPorts[i].name}, Type: ${inputPorts[i].type}, Version: ${inputPorts[i].version}, State: ${inputPorts[i].state}, Connection: ${inputPorts[i].connection}`);
	}
	
	outputPorts = Array.from(midiAccess.outputs.values());
	numberOfOutputPorts = outputPorts.length;
	console.log("Number of output ports: ", numberOfOutputPorts);
	for (let i = 0; i < numberOfOutputPorts; i++) {
		console.log(`Port id: ${outputPorts[i].id}, Manufacturer: ${outputPorts[i].manufacturer}, Name: ${outputPorts[i].name}, Type: ${outputPorts[i].type}, Version: ${outputPorts[i].version}, State: ${outputPorts[i].state}, Connection: ${outputPorts[i].connection}`)
	}
	
	midiAccess.onstatechange = function(e) {
		// Print information about the (dis)connected MIDI controller
		// console.log(e.port.name, e.port.manufacturer, e.port.connection, e.port.state);
		console.log(`Port: ${e.port.name}, Manufacturer: ${e.port.manufacturer}, Current State: ${e.port.state}, Connection: ${e.port.connection}`);
	};
}

function onMIDIFailure(msg) {
	oMidiAccess = null;
	console.log("Failed to get MIDI access - " + msg);
	// Midi access failed, display the warning to user
	var szFailureMessage = msg.toString();
	var bSecurityPolicyBreak = szFailureMessage.includes("NotAllowedError");
	if (bSecurityPolicyBreak == true) {
		alert("MIDI access is not allowed. Click Allow when prompted to control your MIDI device.");
	}	  
}

function EnumeratePorts() {
	return outputPorts;
}

async function WriteToPort(port, abyDataBuffer) {
	if (port) {
		port.send(abyDataBuffer);
	}
}

async function OpenPort(port) {
	if (port) {
		if (port.state == "connected" && port.connection == "closed") {
			await port.open();
		}
	}
}

async function ClosePort(port) {
	if (port) {
		if (port.state == "connected" && port.connection == "open") {
			//port.connection = "closed";
			await port.close();
		}
	}
}
/***************************************************************************************************************************************************/
// Playtime USBUploader Calls - End
/***************************************************************************************************************************************************/

    
