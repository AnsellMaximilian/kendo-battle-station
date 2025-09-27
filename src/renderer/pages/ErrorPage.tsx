import { Button } from "@progress/kendo-react-buttons";
import { isRouteErrorResponse, useNavigate, useRouteError } from "react-router-dom";

export const ErrorPage = () => {
  const error = useRouteError();
  const navigate = useNavigate();

  const statusMessage = (() => {
    if (isRouteErrorResponse(error)) {
      return `${error.status} ${error.statusText}`;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return "Unexpected application error.";
  })();

  return (
    <div className="placeholder-card" role="alert">
      <h2>Something went wrong</h2>
      <p>{statusMessage}</p>
      <p>
        <Button themeColor="primary" onClick={() => navigate("/dashboard")}>
          Back to dashboard
        </Button>
      </p>
    </div>
  );
};
