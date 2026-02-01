import { isRouteErrorResponse, useRouteError } from "@react-router/react";

export function ErrorBoundary() {
  const error = useRouteError();

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
      <div className="text-center p-8">
        <h1 className="text-4xl font-bold text-red-600 dark:text-red-400 mb-4">
          {isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : "Error"}
        </h1>
        <pre className="text-left text-sm bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto">
          {error instanceof Error ? error.message : String(error)}
        </pre>
      </div>
    </div>
  );
}
