// import App from './App';

(async () => {
    try {
        const configResponse = await zoomSdk.config({
            size: { width: 480, height: 360 },
            capabilities: [
                /* Add Capabilities Here */
                'shareApp',
            ],
        });

        console.debug('Zoom JS SDK Configuration', configResponse);
    } catch (e) {
        console.error(e);
        const errorDiv = document.getElementById('fetchError');
        if (errorDiv) {
            errorDiv.textContent = `Configuration Error: ${e.message}`;
        }
    }

    // test fetch
    try {
        // load face image from local file
        const faceImage = new File([], 'face.jpg', { type: 'image/jpeg' });
        const response = await fetch('https://v8c6qwk16b.execute-api.us-east-1.amazonaws.com/default/RetrieveUserByFace', {
            method: 'POST',
            body: faceImage,
        });
        
        const responseData = await response.json();
        console.log(responseData);
        
        const responseDiv = document.getElementById('fetchResponse');
        if (responseDiv) {
            responseDiv.textContent = JSON.stringify(responseData, null, 2);
        }
    } catch (error) {
        console.error('Fetch error:', error);
        const errorDiv = document.getElementById('fetchError');
        if (errorDiv) {
            errorDiv.textContent = `Fetch Error: ${error.message}`;
        }
    }
})();
