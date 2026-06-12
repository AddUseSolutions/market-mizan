import { Component } from "react";

export default class ListingErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("Listing render failed:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="empty-state">
          <h3>Listings could not be displayed</h3>
          <p>Please refresh the page. If the problem continues, try again in a moment.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
