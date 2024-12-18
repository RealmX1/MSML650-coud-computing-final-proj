/* globals zoomSdk */
import { useLocation, useHistory } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { apis, invokeZoomAppsSdk } from "./apis";
import { Authorization } from "./components/Authorization";
import ApiScrollview from "./components/ApiScrollview";
import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import VerificationResults from './components/VerificationResults';
import axios from 'axios';

let once = 0; // to prevent increasing number of event listeners being added

function App() {
  const history = useHistory();
  const location = useLocation();
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [runningContext, setRunningContext] = useState(null);
  const [connected, setConnected] = useState(false);
  const [counter, setCounter] = useState(0);
  const [preMeeting, setPreMeeting] = useState(true); // start with pre-meeting code
  const [userContextStatus, setUserContextStatus] = useState("");
  const [participantPhotos, setParticipantPhotos] = useState([]);
  const [verificationResults, setVerificationResults] = useState([]);

  useEffect(() => {
    async function configureSdk() {
      // to account for the 2 hour timeout for config
      const configTimer = setTimeout(() => {
        setCounter(counter + 1);
      }, 120 * 60 * 1000);

      try {
        // Configure the JS SDK, required to call JS APIs in the Zoom App
        // These items must be selected in the Features -> Zoom App SDK -> Add APIs tool in Marketplace
        const configResponse = await zoomSdk.config({
          capabilities: [
            // apis demoed in the buttons
            ...apis.map((api) => api.name), // IMPORTANT

            // demo events
            "onSendAppInvitation",
            "onShareApp",
            "onActiveSpeakerChange",
            "onMeeting",

            // connect api and event
            "connect",
            "onConnect",
            "postMessage",
            "onMessage",
            "onPhoto",

            // in-client api and event
            "authorize",
            "onAuthorized",
            "promptAuthorize",
            "getUserContext",
            "onMyUserContextChange",
            "sendAppInvitationToAllParticipants",
            "sendAppInvitation",
            "takeParticipantPhoto",
          ],
          version: "0.16.0",
        });
        console.log("App configured", configResponse);
        // The config method returns the running context of the Zoom App
        setRunningContext(configResponse.runningContext);
        setUserContextStatus(configResponse.auth.status);
        zoomSdk.onSendAppInvitation((data) => {
          console.log(data);
        });
        zoomSdk.onShareApp((data) => {
          console.log(data);
        });
      } catch (error) {
        console.log(error);
        setError("There was an error configuring the JS SDK");
      }
      return () => {
        clearTimeout(configTimer);
      };
    }
    configureSdk();
  }, [counter]);

  // PRE-MEETING
  let on_message_handler_client = useCallback(
    (message) => {
      let content = message.payload.payload;
      if (content === "connected" && preMeeting === true) {
        console.log("Meeting instance exists.");
        zoomSdk.removeEventListener("onMessage", on_message_handler_client);
        console.log("Letting meeting instance know client's current state.");
        sendMessage(window.location.hash, "client");
        setPreMeeting(false); // client instance is finished with pre-meeting
      }
    },
    [preMeeting]
  );

  // PRE-MEETING
  useEffect(() => {
    if (runningContext === "inMainClient" && preMeeting === true) {
      zoomSdk.addEventListener("onMessage", on_message_handler_client);
    }
  }, [on_message_handler_client, preMeeting, runningContext]);

  async function sendMessage(msg, sender) {
    console.log(
      "Message sent from " + sender + " with data: " + JSON.stringify(msg)
    );
    console.log("Calling postmessage...", msg);
    await zoomSdk.postMessage({
      payload: msg,
    });
  }

  const receiveMessage = useCallback(
    (receiver, reason = "") => {
      let on_message_handler = (message) => {
        let content = message.payload.payload;
        console.log(
          "Message received " + receiver + " " + reason + ": " + content
        );
        history.push({ pathname: content });
      };
      if (once === 0) {
        zoomSdk.addEventListener("onMessage", on_message_handler);
        once = 1;
      }
    },
    [history]
  );

  useEffect(() => {
    async function connectInstances() {
      if (runningContext === "inMeeting") {
        zoomSdk.addEventListener("onConnect", (event) => {
          console.log("Connected");
          setConnected(true);

          // PRE-MEETING
          // first message to send after connecting instances is for the meeting
          // instance to catch up with the client instance
          if (preMeeting === true) {
            console.log("Letting client know meeting instance exists.");
            sendMessage("connected", "meeting");
            console.log("Adding message listener for client's current state.");
            let on_message_handler_mtg = (message) => {
              console.log(
                "Message from client received. Meeting instance updating its state:",
                message.payload.payload
              );
              window.location.replace(message.payload.payload);
              zoomSdk.removeEventListener("onMessage", on_message_handler_mtg);
              setPreMeeting(false); // meeting instance is finished with pre-meeting
            };
            zoomSdk.addEventListener("onMessage", on_message_handler_mtg);
          }
        });

        await zoomSdk.connect();
        console.log("Connecting...");
      }
    }

    if (connected === false) {
      console.log(runningContext, location.pathname);
      connectInstances();
    }
  }, [connected, location.pathname, preMeeting, runningContext]);

  // POST-MEETING
  useEffect(() => {
    async function communicateTabChange() {
      // only proceed with post-meeting after pre-meeting is done
      // just one-way communication from in-meeting to client
      if (runningContext === "inMeeting" && connected && preMeeting === false) {
        sendMessage(location.pathname, runningContext);
      } else if (runningContext === "inMainClient" && preMeeting === false) {
        receiveMessage(runningContext, "for tab change");
      }
    }
    communicateTabChange();
  }, [connected, location, preMeeting, receiveMessage, runningContext]);

  async function makeApiCallUsingZoomSdk(uploadedImage) {
    const errorDiv = document.getElementById('error-message');
    try {
      const response = await zoomSdk.httpRequest({
        url: 'https://v8c6qwk16b.execute-api.us-east-1.amazonaws.com/default/RetrieveUserByFace',
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: uploadedImage,
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
  
      console.log('API response:', response.data);
      return response
    } catch (error) {
      errorDiv.textContent = `Error making API call using Zoom SDK: ${error.message}`;
    }
  }
  
  const handleTakePhoto = async () => {
    const responseDiv = document.getElementById('response');
    const errorDiv = document.getElementById('error-message');
    
    try {
      // Clear existing photos and results
      setParticipantPhotos([]);
      setVerificationResults([]);
      
      // Clear any previous error messages
      errorDiv.textContent = '';
      responseDiv.textContent = '';

      // Get participants
      const participantsResponse = await zoomSdk.getMeetingParticipants();
      const participants = participantsResponse.participants;

      // Initialize verification results
      const initialResults = participants.map(p => ({
        participantUUID: p.participantUUID,
        userId: null,
        email: null,
        photoData: null,
        confidence: null
      }));
      setVerificationResults(initialResults);

      // Create the photo handler
      const photoHandler = async (event) => {

        console.log("Photo event received");
        const eventData = await event;
        
        // Convert photo data to binary
        const canvas = document.createElement('canvas');
        canvas.width = eventData.imageData.width;
        canvas.height = eventData.imageData.height;
        const ctx = canvas.getContext('2d');
        const imageData = new ImageData(
          new Uint8ClampedArray(Object.values(eventData.imageData.data)),
          eventData.imageData.width,
          eventData.imageData.height
        );
        ctx.putImageData(imageData, 0, 0);

        // Get participant's email
        const emailResponse = await zoomSdk.getMeetingParticipantsEmail({
          participantUUID: eventData.participantUUID
        });
        const email = emailResponse.email;

        // Get base64 image for display
        const base64Image = canvas.toDataURL('image/jpeg');

        // Convert base64 to File object
        const byteString = atob(base64Image.split(',')[1]);
        const byteArray = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i++) {
          byteArray[i] = byteString.charCodeAt(i);
        }
        const imageFile = new File([byteArray], 'participant-photo.jpg', { type: 'image/jpeg' });

        // Store base64 version for display
        setParticipantPhotos(prevPhotos => [...prevPhotos, {
          participantUUID: eventData.participantUUID,
          photoData: base64Image,
          timestamp: eventData.timestamp,
          videoOff: eventData.videoOff,
          optedOut: eventData.optedOut
        }]);

        // Debug: Check file size
        console.log('File size:', imageFile.size);

        let data = {
          user_id: 'Unknown',
          similarity: 0
        };

        // const apiResponse = await makeApiCallUsingZoomSdk(imageFile);

        try {
          // const response = await makeApiCallUsingZoomSdk(imageFile);
          const formData = new FormData();  
          formData.append('file', imageFile);
          const response = await fetch(
            'https://v8c6qwk16b.execute-api.us-east-1.amazonaws.com/default/RetrieveUserByFace', {
              method: 'POST',
              body: formData,
              headers: {
                'Content-Type': 'image/jpeg',
                'Access-Control-Allow-Origin': '*',
              },
          });
          responseDiv.textContent = "API Response: " + response;

        } catch (error) {
          errorDiv.textContent = `Error making API call using Zoom SDK: ${error.message}`;
          
          // Update verification results with error state
          setVerificationResults(prevResults => 
            prevResults.map(result => 
              result.participantUUID === eventData.participantUUID
                ? {
                    ...result,
                    photoData: base64Image,
                    email: email,
                    userId: 'Error',
                    confidence: 0,
                    error: error.message
                  }
                : result
            )
          );
        }
      };

      // Remove any existing onPhoto listeners
      zoomSdk.removeEventListener('onPhoto', photoHandler);
      
      // Add the new listener
      zoomSdk.addEventListener('onPhoto', photoHandler);

      // Take photos
      await invokeZoomAppsSdk({
        name: 'takeParticipantPhoto',
        options: {
          participantUUIDs: participants.map(p => p.participantUUID),
          shouldSaveLocally: true
        }
      });

    } catch (error) {
      errorDiv.textContent = `Error taking participant photos: ${error.message}`;
      setVerificationResults([]);
      setParticipantPhotos([]);
    }
  };


  if (error) {
    console.log(error);
    return (
      <div className="App">
        <h1>{error.message}</h1>
      </div>
    );
  }

  return (
    <div>
      <div>Participant Verification</div>
      <div className="App">
        <div id="response" style={{ 
        marginBottom: '1rem',
        border: '1px solid #ddd',
        padding: '0.5rem',
        borderRadius: '4px'
      }}>Response will appear here</div>

      <div id="error-message" style={{
        marginBottom: '1rem',
        border: '1px solid #ddd',
        padding: '0.5rem',
        borderRadius: '4px'
      }}>Error will appear here</div>

      <div className="verification-section">
        <button
          name="verify-participants"
          className="btn btn-primary"
          onClick={handleTakePhoto}
          style={{ marginBottom: '1rem' }}
        >
          Verify All Participants
        </button>
        <VerificationResults participants={verificationResults} />
        
        <div className="photo-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1rem',
          padding: '1rem',
          marginTop: '2rem'
        }}>
          {participantPhotos.map((photo, index) => (
            <div key={index} style={{ 
              border: '1px solid #ddd',
              padding: '0.5rem',
              borderRadius: '4px'
            }}>
              <img 
                src={photo.photoData}
                alt={`Participant ${photo.participantUUID}`}
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block'
                }}
              />
              <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                {photo.participantUUID}
              </p>
            </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
