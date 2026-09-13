import { Component } from "react";

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("App crash:", error?.message || error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-brand-muted/30 px-6 text-center">
          <h1 className="text-xl font-semibold text-brand-deep">Something went wrong</h1>
          <p className="max-w-md text-sm text-muted">
            Please refresh the page. If the problem continues, try again in a moment.
          </p>
          <button
            type="button"
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white"
            onClick={() => window.location.assign("/")}
          >
            Back to listings
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
