import { Component } from "react";

export default class ListingErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-line bg-surface p-8 text-center shadow-soft">
          <h3 className="text-lg font-semibold text-heading">Something went wrong loading listings.</h3>
          <p className="mt-2 text-muted">Please refresh the page or try again later.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
