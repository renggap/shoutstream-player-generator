import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

// Mock console.error to avoid cluttering test output
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

// Restore console.error after tests
afterAll(() => {
  console.error = originalConsoleError;
});

// A component that throws an error
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Helper to suppress the actual error logging in tests
const suppressErrorBoundaryOutput = () => {
  const consoleError = console.error;
  console.error = vi.fn();
  return () => {
    console.error = consoleError;
  };
};

describe('ErrorBoundary', () => {
  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test Child Component</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test Child Component')).toBeInTheDocument();
  });

  it('should catch errors and render fallback UI', () => {
    const restoreConsole = suppressErrorBoundaryOutput();
    try {
      // Create a test with an error
      const TestComponent = () => {
        throw new Error('Test error');
      };

      render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      // Check that the fallback UI is displayed
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/we encountered an unexpected error/i)).toBeInTheDocument();
    } finally {
      restoreConsole();
    }
  });

  it('should display error details when an error occurs', () => {
    const restoreConsole = suppressErrorBoundaryOutput();
    try {
      const ThrowComponent = () => {
        throw new Error('Specific test error message');
      };

      render(
        <ErrorBoundary>
          <ThrowComponent />
        </ErrorBoundary>
      );

      // Error details should be in a details element
      const detailsElement = screen.getByText(/error details/i).closest('details');
      expect(detailsElement).toBeInTheDocument();

      // After clicking the summary, the error message should be visible
      fireEvent.click(screen.getByText(/error details/i));
      expect(screen.getByText(/Specific test error message/)).toBeInTheDocument();
    } finally {
      restoreConsole();
    }
  });

  it('should have a reload button', () => {
    const restoreConsole = suppressErrorBoundaryOutput();
    try {
      const ThrowComponent = () => {
        throw new Error('Test error');
      };

      // Mock window.location.reload
      const reloadMock = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowComponent />
        </ErrorBoundary>
      );

      const reloadButton = screen.getByText('Reload Page');
      expect(reloadButton).toBeInTheDocument();

      fireEvent.click(reloadButton);
      expect(reloadMock).toHaveBeenCalledTimes(1);
    } finally {
      restoreConsole();
    }
  });

  it('should have a go home button that clears the hash', () => {
    const restoreConsole = suppressErrorBoundaryOutput();
    try {
      const ThrowComponent = () => {
        throw new Error('Test error');
      };

      // Mock window.location
      const mockLocation = { hash: '#/player/test' };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      });

      const { rerender } = render(
        <ErrorBoundary>
          <ThrowComponent />
        </ErrorBoundary>
      );

      const goHomeButton = screen.getByText('Go Home');
      expect(goHomeButton).toBeInTheDocument();

      // Click the go home button
      fireEvent.click(goHomeButton);

      // The hash should be cleared (set to empty string)
      expect(mockLocation.hash).toBe('');
    } finally {
      restoreConsole();
    }
  });

  it('should work correctly with non-throwing components after error', () => {
    const restoreConsole = suppressErrorBoundaryOutput();
    try {
      // Mock window.location
      const mockLocation = { hash: '', reload: vi.fn() };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      });

      // First, render a normal component
      const { unmount } = render(
        <ErrorBoundary>
          <div>Normal Component</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Normal Component')).toBeInTheDocument();

      // Now cleanup and render a new instance with a throwing component
      unmount();

      const ThrowComponent = () => {
        throw new Error('Test error');
      };

      render(
        <ErrorBoundary>
          <ThrowComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    } finally {
      restoreConsole();
    }
  });

  it('should log errors to console', () => {
    const restoreConsole = suppressErrorBoundaryOutput();
    try {
      const consoleSpy = vi.spyOn(console, 'error');
      const ThrowComponent = () => {
        throw new Error('Console test error');
      };

      render(
        <ErrorBoundary>
          <ThrowComponent />
        </ErrorBoundary>
      );

      // Console.error should have been called with the error
      expect(consoleSpy).toHaveBeenCalled();
    } finally {
      restoreConsole();
    }
  });

  it('should apply dark mode classes correctly', () => {
    const restoreConsole = suppressErrorBoundaryOutput();
    try {
      const ThrowComponent = () => {
        throw new Error('Test error');
      };

      render(
        <ErrorBoundary>
          <ThrowComponent />
        </ErrorBoundary>
      );

      const errorContainer = screen.getByText('Oops! Something went wrong').closest('div.min-h-screen');
      expect(errorContainer).toHaveClass('dark:bg-gray-900');
      expect(errorContainer).toHaveClass('dark:text-gray-200');
    } finally {
      restoreConsole();
    }
  });

  it('should render error icon in fallback UI', () => {
    const restoreConsole = suppressErrorBoundaryOutput();
    try {
      const ThrowComponent = () => {
        throw new Error('Test error');
      };

      render(
        <ErrorBoundary>
          <ThrowComponent />
        </ErrorBoundary>
      );

      // Check for the SVG icon
      const svgIcon = document.querySelector('svg');
      expect(svgIcon).toBeInTheDocument();
      expect(svgIcon).toHaveClass('text-red-500');
    } finally {
      restoreConsole();
    }
  });

  it('should handle multiple sequential errors', () => {
    const restoreConsole = suppressErrorBoundaryOutput();
    try {
      const ThrowComponent = () => {
        throw new Error('Sequential error');
      };

      const { rerender } = render(
        <ErrorBoundary>
          <ThrowComponent />
        </ErrorBoundary>
      );

      // First error
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();

      // Click go home to reset
      fireEvent.click(screen.getByText('Go Home'));

      // Rerender with another error
      rerender(
        <ErrorBoundary>
          <ThrowComponent />
        </ErrorBoundary>
      );

      // Should still show error UI for the new error
      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    } finally {
      restoreConsole();
    }
  });
});

// Helper function for the afterAll hook
function afterAll(fn: () => void) {
  // This will be called by vitest after all tests complete
  if (typeof global.afterAll === 'function') {
    global.afterAll(fn);
  }
}
