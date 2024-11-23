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

  const handleTakePhoto = async () => {
    try {
      // Clear existing photos and results
      setParticipantPhotos([]);
      setVerificationResults([]);

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
        const photoData = await event;
        
        // Convert photo data to binary
        const canvas = document.createElement('canvas');
        canvas.width = photoData.imageData.width;
        canvas.height = photoData.imageData.height;
        const ctx = canvas.getContext('2d');
        const imageData = new ImageData(
          new Uint8ClampedArray(Object.values(photoData.imageData.data)),
          photoData.imageData.width,
          photoData.imageData.height
        );
        ctx.putImageData(imageData, 0, 0);

        // Convert canvas to blob
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
        
        // Create FormData and append the blob as a file
        const formData = new FormData();
        formData.append('file', blob, 'photo.jpg');

        // Get participant's email
        const emailResponse = await zoomSdk.getMeetingParticipantsEmail({
          participantUUID: photoData.participantUUID
        });
        const email = emailResponse.email;
        
        // Store base64 version for display
        const base64Image = canvas.toDataURL('image/jpeg');
        setParticipantPhotos(prevPhotos => [...prevPhotos, {
          participantUUID: photoData.participantUUID,
          photoData: base64Image,
          timestamp: photoData.timestamp,
          videoOff: photoData.videoOff,
          optedOut: photoData.optedOut
        }]);
        
        try {
          // Call AWS API Gateway endpoint with FormData
          const response = await fetch('https://v8c6qwk16b.execute-api.us-east-1.amazonaws.com/default/RetrieveUserByFace', {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          console.log('Face verification response:', data);

          // Update verification results
          setVerificationResults(prevResults => 
            prevResults.map(result => 
              result.participantUUID === photoData.participantUUID
                ? {
                    ...result,
                    photoData: base64Image,
                    email: email,
                    userId: data.user_id, // Updated to match API response
                    confidence: data.similarity // Updated to match API response
                  }
                : result
            )
          );
        } catch (error) {
          console.error('Error verifying face:', error);
        }
      };

      // Remove any existing onPhoto listeners
      zoomSdk.removeEventListener('onPhoto', photoHandler);
      
      // Add the new listener
      zoomSdk.addEventListener('onPhoto', photoHandler);

      // Take photos
      const takePhotoApi = {
        name: 'takeParticipantPhoto',
        options: {
          participantUUIDs: participants.map(p => p.participantUUID),
          shouldSaveLocally: true
        }
      };

      await invokeZoomAppsSdk(takePhotoApi);

    } catch (error) {
      console.error('Error taking participant photos:', error);
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
    <div className="App">
      <h1>Hello{user ? ` ${user.first_name} ${user.last_name}` : " Zoom Apps user"}!</h1>
      <p>{`User Context Status: ${userContextStatus}`}</p>
      <p>
        {runningContext ?
          `Running Context: ${runningContext}` :
          "Configuring Zoom JavaScript SDK..."
        }
      </p>

      <div id="response" style={{ 
        marginBottom: '1rem',
        border: '1px solid #ddd',
        padding: '0.5rem',
        borderRadius: '4px'
      }}>response!</div>

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
  );
}

export default App;
