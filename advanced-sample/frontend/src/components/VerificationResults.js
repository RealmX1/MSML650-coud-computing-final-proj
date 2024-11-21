import React from 'react';
import './VerificationResults.css';

const VerificationResults = ({ participants }) => {
  const getStatusTag = (participant) => {
    if (!participant.photoData) {
      return <span className="status-tag no-photo">No Photo Taken</span>;
    }
    if (participant.confidence >= 90) {
      return <span className="status-tag verified">Verified</span>;
    }
    return <span className="status-tag unverified">Unverified</span>;
  };

  return (
    <div className="verification-results">
      <table>
        <thead>
          <tr>
            <th>User ID</th>
            <th>Photo</th>
            <th>Email</th>
            <th>Confidence Level</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {participants.map((participant, index) => (
            <tr key={index}>
              <td>{participant.userId || 'N/A'}</td>
              <td>
                {participant.photoData ? (
                  <img 
                    src={participant.photoData} 
                    alt={`Participant ${participant.email}`}
                    className="participant-photo"
                  />
                ) : (
                  <div className="no-photo-placeholder">No Photo</div>
                )}
              </td>
              <td>{participant.email || 'N/A'}</td>
              <td>{participant.confidence ? `${participant.confidence.toFixed(2)}%` : 'N/A'}</td>
              <td>{getStatusTag(participant)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VerificationResults; 