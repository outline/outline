/**
 * Error Boundary for Excalidraw component
 * Provides graceful failure handling and recovery options
 */

import * as React from "react";
import styled from "styled-components";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ExcalidrawErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("Excalidraw Error Boundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });

    // Log to error reporting service if available
    if (typeof window !== "undefined" && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <ErrorContainer>
          <ErrorIcon>⚠️</ErrorIcon>
          <ErrorTitle>Failed to load Excalidraw</ErrorTitle>
          <ErrorMessage>
            An error occurred while loading the drawing editor.
          </ErrorMessage>
          {this.state.error && (
            <ErrorDetails>
              <strong>Error:</strong> {this.state.error.message}
            </ErrorDetails>
          )}
          <ErrorActions>
            <RetryButton onClick={this.handleRetry}>
              Try Again
            </RetryButton>
            <ReloadButton onClick={() => window.location.reload()}>
              Reload Page
            </ReloadButton>
          </ErrorActions>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

// Styled components for error UI
const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  min-height: 300px;
  background: ${(props) => props.theme.background};
  border: 1px solid ${(props) => props.theme.divider};
  border-radius: 8px;
  text-align: center;
`;

const ErrorIcon = styled.div`
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.8;
`;

const ErrorTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: ${(props) => props.theme.text};
`;

const ErrorMessage = styled.p`
  margin: 0 0 16px 0;
  font-size: 16px;
  color: ${(props) => props.theme.textSecondary};
  max-width: 500px;
`;

const ErrorDetails = styled.div`
  margin: 16px 0;
  padding: 12px;
  background: ${(props) => props.theme.backgroundSecondary};
  border-radius: 4px;
  font-family: monospace;
  font-size: 14px;
  color: ${(props) => props.theme.textTertiary};
  max-width: 600px;
  overflow-x: auto;
  text-align: left;
`;

const ErrorActions = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
`;

const Button = styled.button`
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus {
    outline: 2px solid #007bff;
    outline-offset: 2px;
  }
`;

const RetryButton = styled(Button)`
  background: #007bff;
  color: white;
  border: none;

  &:hover {
    background: #0056b3;
  }
`;

const ReloadButton = styled(Button)`
  background: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
  border: 1px solid ${(props) => props.theme.divider};

  &:hover {
    background: ${(props) => props.theme.backgroundSecondary};
  }
`;

export default ExcalidrawErrorBoundary;
