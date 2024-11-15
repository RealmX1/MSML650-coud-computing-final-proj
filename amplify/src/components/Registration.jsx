import React, { useState } from 'react'
import Webcam from 'react-webcam'

function Registration() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [image, setImage] = useState(null)
  
  const handleCapture = (imageSrc) => {
    setImage(imageSrc)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Here you would integrate with Amazon Rekognition
    console.log('Submitting:', { name, email, image })
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Face Recognition Registration</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Capture Face Image
          </label>
          <div className="relative">
            <Webcam
              audio={false}
              screenshotFormat="image/jpeg"
              className="w-full rounded-lg"
              onUserMedia={() => console.log('Camera ready')}
            />
            <button
              type="button"
              onClick={() => handleCapture()}
              className="mt-2 w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Capture Photo
            </button>
          </div>
        </div>

        {image && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preview
            </label>
            <img src={image} alt="Captured" className="w-full rounded-lg" />
          </div>
        )}

        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Register
        </button>
      </form>
    </div>
  )
}

export default Registration