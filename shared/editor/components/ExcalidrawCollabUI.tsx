/**
 * Collaboration UI components for Excalidraw
 * Shows connection status, active collaborators, and collaboration indicators
 */

import * as React from "react";
import styled, { keyframes, css } from "styled-components";
import { ConnectionStatus, UserIdleState } from "../lib/excalidraw/constants";
import type { CollaboratorInfo } from "./ExcalidrawCollab";

// Animation keyframes
const pulse = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
`;

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Styled components
const CollabContainer = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
`;

const StatusIndicator = styled.div<{
  $status: ConnectionStatus;
  $isVisible: boolean;
}>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  transition: opacity 0.3s ease;
  opacity: ${props => props.$isVisible ? 1 : 0};
  pointer-events: auto;

  animation: ${slideIn} 0.3s ease;

  ${props => props.$status === ConnectionStatus.CONNECTING && css`
    animation: ${pulse} 1.5s ease-in-out infinite;
  `}
`;

const StatusDot = styled.div<{ $status: ConnectionStatus }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => {
    switch (props.$status) {
      case ConnectionStatus.CONNECTED:
        return '#10B981'; // Green
      case ConnectionStatus.CONNECTING:
      case ConnectionStatus.RECONNECTING:
        return '#F59E0B'; // Yellow
      case ConnectionStatus.DISCONNECTED:
      default:
        return '#EF4444'; // Red
    }
  }};
`;

const CollaboratorsList = styled.div<{ $isVisible: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  opacity: ${props => props.$isVisible ? 1 : 0};
  transition: opacity 0.3s ease;
  pointer-events: auto;
`;

const CollaboratorItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  animation: ${slideIn} 0.3s ease;
  max-width: 200px;
`;

const CollaboratorAvatar = styled.div<{ $color: string; $userState: UserIdleState }>`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${props => props.$color};
  border: 2px solid white;
  opacity: ${props => props.$userState === UserIdleState.ACTIVE ? 1 : 0.6};
  transition: opacity 0.3s ease;
`;

const CollaboratorName = styled.span`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ErrorMessage = styled.div<{ $isVisible: boolean }>`
  padding: 8px 12px;
  background: #EF4444;
  color: white;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  max-width: 250px;
  word-wrap: break-word;
  opacity: ${props => props.$isVisible ? 1 : 0};
  transition: opacity 0.3s ease;
  pointer-events: auto;
  animation: ${slideIn} 0.3s ease;
`;

// Component props
interface Props {
  connectionStatus: ConnectionStatus;
  collaborators: Map<string, CollaboratorInfo>;
  isCollaborating: boolean;
  error: string | null;
  onRetryConnection?: () => void;
  onDismissError?: () => void;
}

export const ExcalidrawCollabUI: React.FC<Props> = ({
  connectionStatus,
  collaborators,
  isCollaborating,
  error,
  onRetryConnection,
  onDismissError,
}) => {
  const [showStatus, setShowStatus] = React.useState(false);
  const [showCollaborators, setShowCollaborators] = React.useState(false);

  // Show status indicator briefly when connection status changes
  React.useEffect(() => {
    if (connectionStatus === ConnectionStatus.CONNECTING || connectionStatus === ConnectionStatus.RECONNECTING) {
      setShowStatus(true);
    } else if (connectionStatus === ConnectionStatus.CONNECTED) {
      setShowStatus(true);
      const timer = setTimeout(() => setShowStatus(false), 2000);
      return () => clearTimeout(timer);
    } else if (connectionStatus === ConnectionStatus.DISCONNECTED) {
      setShowStatus(true);
    }
  }, [connectionStatus]);

  // Show collaborators when there are active collaborators
  React.useEffect(() => {
    const hasActiveCollaborators = Array.from(collaborators.values()).some(
      collab => collab.userState === UserIdleState.ACTIVE
    );
    setShowCollaborators(hasActiveCollaborators && isCollaborating);
  }, [collaborators, isCollaborating]);

  const getStatusText = (status: ConnectionStatus): string => {
    switch (status) {
      case ConnectionStatus.CONNECTED:
        return "Connected";
      case ConnectionStatus.CONNECTING:
        return "Connecting...";
      case ConnectionStatus.RECONNECTING:
        return "Reconnecting...";
      case ConnectionStatus.DISCONNECTED:
        return "Disconnected";
      default:
        return "Unknown";
    }
  };

  const handleStatusClick = () => {
    if (connectionStatus === ConnectionStatus.DISCONNECTED && onRetryConnection) {
      onRetryConnection();
    }
  };

  const handleErrorClick = () => {
    if (onDismissError) {
      onDismissError();
    }
  };

  const collaboratorArray = Array.from(collaborators.values())
    .filter(collab => collab.userState !== UserIdleState.AWAY)
    .sort((a, b) => {
      // Sort active users first
      if (a.userState === UserIdleState.ACTIVE && b.userState !== UserIdleState.ACTIVE) {
        return -1;
      }
      if (b.userState === UserIdleState.ACTIVE && a.userState !== UserIdleState.ACTIVE) {
        return 1;
      }
      return a.name.localeCompare(b.name);
    });

  return (
    <CollabContainer>
      {/* Connection Status */}
      <StatusIndicator
        $status={connectionStatus}
        $isVisible={showStatus}
        onClick={handleStatusClick}
        style={{
          cursor: connectionStatus === ConnectionStatus.DISCONNECTED ? 'pointer' : 'default'
        }}
        title={connectionStatus === ConnectionStatus.DISCONNECTED ? 'Click to retry connection' : undefined}
      >
        <StatusDot $status={connectionStatus} />
        {getStatusText(connectionStatus)}
      </StatusIndicator>

      {/* Error Message */}
      {error && (
        <ErrorMessage
          $isVisible={!!error}
          onClick={handleErrorClick}
          style={{ cursor: onDismissError ? 'pointer' : 'default' }}
          title={onDismissError ? 'Click to dismiss' : undefined}
        >
          {error}
        </ErrorMessage>
      )}

      {/* Collaborators List */}
      <CollaboratorsList $isVisible={showCollaborators}>
        {collaboratorArray.map((collaborator) => (
          <CollaboratorItem key={collaborator.id}>
            <CollaboratorAvatar
              $color={collaborator.color}
              $userState={collaborator.userState}
            />
            <CollaboratorName>
              {collaborator.name}
              {collaborator.userState === UserIdleState.IDLE && " (idle)"}
            </CollaboratorName>
          </CollaboratorItem>
        ))}
      </CollaboratorsList>
    </CollabContainer>
  );
};

export default ExcalidrawCollabUI;